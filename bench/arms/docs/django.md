## Django 5.2: views, URLs and requests

**URLs.** `shop/urls.py` maps paths to view functions:

```python
from django.urls import path
from core import views

urlpatterns = [
    path("items", views.items),
    path("items/<str:item_id>", views.item_detail),   # passes item_id as a keyword argument
]
```

With `APPEND_SLASH = False`, `/items` and `/items/` are different URLs; define exactly the paths you need.

**Function views.**

```python
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

@require_http_methods(["POST"])
def items(request):
    return JsonResponse({"ok": True}, status=201)
```

`require_http_methods` returns `405` for other methods. `JsonResponse(data, status=...)` serializes with `json`; pass `safe=False` to return a list.

**Request data.** `request.body` is the raw body as `bytes`, exactly as received. Parse JSON with `json.loads(request.body)`. `request.headers` is a case-insensitive mapping: `request.headers.get("Idempotency-Key")`. `request.method` is the HTTP method.

**CSRF.** This project does not install `CsrfViewMiddleware`, so POST views need no `csrf_exempt`.

## Django models and migrations

```python
from django.db import models

class Item(models.Model):
    sku = models.TextField(primary_key=True)
    price_minor = models.BigIntegerField()
    stock = models.IntegerField()

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(stock__gte=0), name="stock_gte_0"),
            # models.UniqueConstraint(fields=["a", "b"], name="a_b_unique"),
        ]
```

Without an explicit primary key, a model gets `id = BigAutoField(primary_key=True)` (`DEFAULT_AUTO_FIELD`). `ForeignKey(Other, on_delete=models.PROTECT)` adds an `other_id` column; `related_name` names the reverse accessor.

Migrations are Python files in `core/migrations/` (for example `0001_initial.py`) that describe schema changes; `python manage.py migrate` applies them. A migration file contains a `Migration(migrations.Migration)` class with `dependencies` and `operations` such as `migrations.CreateModel(name=..., fields=[...], options={...})`. The container runs `migrate` on every start, so new migration files are applied automatically. Every model needs a migration that creates its table.

## Querying

```python
Item.objects.create(sku="A", price_minor=100, stock=5)
Item.objects.filter(sku__in=["A", "B"])          # lookups: __in, __gte, __lte, ...
Item.objects.filter(sku="A").first()              # None if missing
Item.objects.filter(...).exists()
Item.objects.filter(sku="A").values_list("sku", "price_minor")
```

**F expressions** refer to a column inside the database, avoiding read-modify-write races:

```python
from django.db.models import F
updated = Item.objects.filter(sku="A", stock__gte=3).update(stock=F("stock") - 3)  # returns number of rows updated
```

**Aggregation.** `Model.objects.aggregate(total=Sum("x", filter=Q(kind="a")))` returns a dict; `Sum` returns `None` when there are no rows.

**Transactions.**

```python
from django.db import IntegrityError, transaction

with transaction.atomic():
    ...  # all queries in one transaction; an exception rolls everything back and propagates
```

Nested `transaction.atomic()` blocks create savepoints: catching an `IntegrityError` raised inside a nested block keeps the outer transaction usable. `select_for_update()` locks the selected rows until the transaction ends and must be used inside `atomic()`. `get_or_create(**kwargs)` returns `(obj, created)`.

**Raw SQL.** `from django.db import connection`; `with connection.cursor() as c: c.execute("UPDATE t SET x = %s WHERE id = %s", [x, id]); c.rowcount`.

## Python 3.12 standard library

**HMAC.** `hmac.new(key_bytes, msg_bytes, hashlib.sha256).hexdigest()`; `hmac.compare_digest(a, b)` compares in constant time.

**Secrets.** `secrets.token_hex(24)`.

**HTTP client.** `urllib.request.Request(url, data=json.dumps(d).encode(), headers={...}, method="POST")` and `urllib.request.urlopen(req, timeout=10)`; read with `json.loads(res.read())`. The `requests` package is not installed unless added to `requirements.txt`.

**Integers and rounding.** Python integers are arbitrary precision. `divmod(a, b)` returns `(a // b, a % b)`. The built-in `round(x)` on a float rounds halves to even, but float arithmetic is inexact (`0.1` cannot be represented exactly). `decimal.Decimal` with `quantize(Decimal("1"), rounding=decimal.ROUND_HALF_EVEN)` rounds exactly. `isinstance(True, int)` is `True`, so check `type(v) is int` or exclude `bool` when validating integers.
