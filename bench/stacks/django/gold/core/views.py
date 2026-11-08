import hashlib
import hmac
import json
import logging
import os
import secrets
import time
import urllib.request

from django.db import IntegrityError, connection, transaction
from django.db.models import F, Q, Sum
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from .discount import compute_discount
from .models import Customer, IdempotencyKey, LedgerEntry, Order, OrderItem, Product, WebhookEvent

log = logging.getLogger(__name__)


class ApiError(Exception):
    def __init__(self, status, code):
        super().__init__(code)
        self.status = status
        self.code = code


def error(status, code):
    return JsonResponse({"error": code}, status=status)


def api(fn):
    def wrapper(request, *args, **kwargs):
        try:
            return fn(request, *args, **kwargs)
        except ApiError as e:
            return error(e.status, e.code)
    wrapper.__name__ = fn.__name__
    return wrapper


def caller(request):
    header = request.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        return None
    key = header[7:].strip()
    admin = os.environ.get("ADMIN_KEY")
    if admin and hmac.compare_digest(key, admin):
        return ("admin", None)
    customer = Customer.objects.filter(api_key=key).first()
    return ("customer", customer) if customer else None


def require_admin(request):
    c = caller(request)
    if not c:
        raise ApiError(401, "UNAUTHORIZED")
    if c[0] != "admin":
        raise ApiError(403, "FORBIDDEN")


def read_json(request):
    try:
        return json.loads(request.body or b"null")
    except ValueError:
        return None


def is_int(v):
    return isinstance(v, int) and not isinstance(v, bool)


def product_view(p):
    return {"sku": p.sku, "name": p.name, "price_minor": p.price_minor, "stock": p.stock}


def health(request):
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
    return JsonResponse({"ok": True})


@require_http_methods(["POST"])
@api
def products(request):
    require_admin(request)
    b = read_json(request)
    if not (isinstance(b, dict) and isinstance(b.get("sku"), str) and b["sku"] and isinstance(b.get("name"), str)
            and is_int(b.get("price_minor")) and b["price_minor"] >= 0 and is_int(b.get("stock")) and b["stock"] >= 0):
        raise ApiError(422, "INVALID_PRODUCT")
    try:
        with transaction.atomic():
            p = Product.objects.create(sku=b["sku"], name=b["name"], price_minor=b["price_minor"], stock=b["stock"])
    except IntegrityError:
        raise ApiError(409, "SKU_EXISTS")
    return JsonResponse(product_view(p), status=201)


@require_http_methods(["GET"])
@api
def product_detail(request, sku):
    if not caller(request):
        raise ApiError(401, "UNAUTHORIZED")
    p = Product.objects.filter(sku=sku).first()
    if not p:
        raise ApiError(404, "NOT_FOUND")
    return JsonResponse(product_view(p))


@require_http_methods(["POST"])
@api
def customers(request):
    require_admin(request)
    b = read_json(request)
    if not (isinstance(b, dict) and isinstance(b.get("email"), str) and isinstance(b.get("name"), str)):
        raise ApiError(422, "INVALID_CUSTOMER")
    c = Customer.objects.create(email=b["email"], name=b["name"], api_key=secrets.token_hex(24))
    return JsonResponse({"id": c.id, "email": c.email, "name": c.name, "api_key": c.api_key}, status=201)


def parse_cart(body):
    items = body.get("items") if isinstance(body, dict) else None
    if not isinstance(items, list) or not items:
        return None
    seen, lines = set(), []
    for it in items:
        if not isinstance(it, dict) or not isinstance(it.get("sku"), str) or not is_int(it.get("qty")) or it["qty"] < 1:
            return None
        if it["sku"] in seen:
            return None
        seen.add(it["sku"])
        lines.append((it["sku"], it["qty"]))
    return lines


def request_charge(order_id, amount):
    req = urllib.request.Request(
        f"{os.environ.get('PSP_URL', '').rstrip('/')}/charges",
        data=json.dumps({"order_id": order_id, "amount_minor": amount}).encode(),
        headers={"Content-Type": "application/json", "Idempotency-Key": str(order_id)},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            charge = json.loads(res.read())
        Order.objects.filter(id=order_id).update(charge_id=charge.get("charge_id"))
    except Exception:  # the order stays pending; the provider can be retried later
        log.exception("charge request failed")


@require_http_methods(["POST"])
@api
def checkout(request):
    c = caller(request)
    if not c:
        raise ApiError(401, "UNAUTHORIZED")
    if c[0] != "customer":
        raise ApiError(403, "FORBIDDEN")
    customer = c[1]
    key = request.headers.get("Idempotency-Key")
    if not key:
        raise ApiError(400, "IDEMPOTENCY_KEY_REQUIRED")
    body = read_json(request)
    lines = parse_cart(body)
    if lines is None:
        raise ApiError(422, "INVALID_CART")
    request_hash = json.dumps(body, sort_keys=True, separators=(",", ":"))

    with transaction.atomic():
        try:
            with transaction.atomic():
                record = IdempotencyKey.objects.create(customer=customer, key=key, request_hash=request_hash)
        except IntegrityError:
            prior = IdempotencyKey.objects.select_for_update().filter(customer=customer, key=key).first()
            if not prior:
                raise ApiError(409, "IDEMPOTENCY_RETRY")
            if prior.request_hash != request_hash:
                raise ApiError(422, "IDEMPOTENCY_CONFLICT")
            if prior.response_status is None:
                raise ApiError(409, "IDEMPOTENCY_IN_PROGRESS")
            return JsonResponse(json.loads(prior.response_body), status=prior.response_status)

        skus = [sku for sku, _ in lines]
        prices = dict(Product.objects.filter(sku__in=skus).values_list("sku", "price_minor"))
        if len(prices) != len(lines):
            raise ApiError(422, "INVALID_CART")
        for sku, qty in sorted(lines):
            if Product.objects.filter(sku=sku, stock__gte=qty).update(stock=F("stock") - qty) != 1:
                raise ApiError(409, "OUT_OF_STOCK")

        subtotal = sum(prices[sku] * qty for sku, qty in lines)
        is_new = not Order.objects.filter(customer=customer, status="paid").exists()
        discount = compute_discount(subtotal, is_new)
        order = Order.objects.create(customer=customer, status="pending", subtotal_minor=subtotal,
                                     discount_minor=discount, total_minor=subtotal - discount)
        OrderItem.objects.bulk_create(
            [OrderItem(order=order, product_id=sku, qty=qty, unit_price_minor=prices[sku]) for sku, qty in lines]
        )
        response = {"order_id": order.id, "status": "pending", "subtotal_minor": subtotal,
                    "discount_minor": discount, "total_minor": subtotal - discount}
        record.response_status = 201
        record.response_body = json.dumps(response)
        record.save(update_fields=["response_status", "response_body"])

    request_charge(order.id, order.total_minor)
    return JsonResponse(response, status=201)


@require_http_methods(["GET"])
@api
def order_detail(request, order_id):
    c = caller(request)
    if not c:
        raise ApiError(401, "UNAUTHORIZED")
    if not order_id.isdigit():
        raise ApiError(404, "NOT_FOUND")
    qs = Order.objects.filter(id=int(order_id))
    if c[0] == "customer":
        qs = qs.filter(customer=c[1])
    o = qs.first()
    if not o:
        raise ApiError(404, "NOT_FOUND")
    return JsonResponse({"id": o.id, "status": o.status, "subtotal_minor": o.subtotal_minor,
                         "discount_minor": o.discount_minor, "total_minor": o.total_minor})


def valid_signature(raw, ts, signature):
    secret = os.environ.get("WEBHOOK_SECRET", "").encode()
    expected = "sha256=" + hmac.new(secret, ts.encode() + b"." + raw, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@require_http_methods(["POST"])
@api
def payments_webhook(request):
    raw = request.body
    ts = request.headers.get("X-Timestamp", "")
    signature = request.headers.get("X-Signature", "")
    if not ts.isdigit() or abs(time.time() - int(ts)) > 300 or not valid_signature(raw, ts, signature):
        raise ApiError(401, "INVALID_SIGNATURE")
    try:
        event = json.loads(raw)
    except ValueError:
        raise ApiError(400, "INVALID_JSON")
    if not isinstance(event, dict) or not isinstance(event.get("id"), str) \
            or event.get("type") not in ("charge.succeeded", "charge.failed"):
        raise ApiError(400, "INVALID_EVENT")

    with transaction.atomic():
        _, created = WebhookEvent.objects.get_or_create(id=event["id"])
        if not created:
            return JsonResponse({"ok": True, "duplicate": True})
        if not str(event.get("order_id", "")).isdigit():
            raise ApiError(404, "NOT_FOUND")
        order = Order.objects.select_for_update().filter(id=int(event["order_id"])).first()
        if not order:
            raise ApiError(404, "NOT_FOUND")
        if order.status != "pending":
            return JsonResponse({"ok": True, "ignored": True})
        if event["type"] == "charge.succeeded":
            if event.get("amount_minor") != order.total_minor:
                raise ApiError(422, "AMOUNT_MISMATCH")
            order.status = "paid"
            order.save(update_fields=["status"])
            tx_id = f"order-{order.id}-paid"
            entries = [LedgerEntry(tx_id=tx_id, account="psp_receivable", side="debit", amount_minor=order.total_minor)]
            if order.discount_minor > 0:
                entries.append(LedgerEntry(tx_id=tx_id, account="discounts_given", side="debit", amount_minor=order.discount_minor))
            entries.append(LedgerEntry(tx_id=tx_id, account="sales", side="credit", amount_minor=order.subtotal_minor))
            LedgerEntry.objects.bulk_create(entries)
        else:
            order.status = "failed"
            order.save(update_fields=["status"])
            for item in order.items.all():
                Product.objects.filter(sku=item.product_id).update(stock=F("stock") + item.qty)
    return JsonResponse({"ok": True})


@require_http_methods(["GET"])
@api
def ledger_summary(request):
    require_admin(request)
    totals = LedgerEntry.objects.aggregate(
        debits=Sum("amount_minor", filter=Q(side="debit")),
        credits=Sum("amount_minor", filter=Q(side="credit")),
        sales=Sum("amount_minor", filter=Q(side="credit", account="sales")),
        discounts=Sum("amount_minor", filter=Q(side="debit", account="discounts_given")),
    )
    return JsonResponse({
        "debits_minor": totals["debits"] or 0,
        "credits_minor": totals["credits"] or 0,
        "sales_minor": totals["sales"] or 0,
        "discounts_minor": totals["discounts"] or 0,
    })
