from django.db import models


class Customer(models.Model):
    email = models.TextField()
    name = models.TextField()
    api_key = models.TextField(unique=True)


class Product(models.Model):
    sku = models.TextField(primary_key=True)
    name = models.TextField()
    price_minor = models.BigIntegerField()
    stock = models.IntegerField()

    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(stock__gte=0), name="stock_not_negative")]


class Order(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT)
    status = models.TextField(default="pending")
    subtotal_minor = models.BigIntegerField()
    discount_minor = models.BigIntegerField()
    total_minor = models.BigIntegerField()
    charge_id = models.TextField(null=True)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, to_field="sku")
    qty = models.IntegerField()
    unit_price_minor = models.BigIntegerField()


class IdempotencyKey(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT)
    key = models.TextField()
    request_hash = models.TextField()
    response_status = models.IntegerField(null=True)
    response_body = models.TextField(null=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["customer", "key"], name="idempotency_customer_key")]


class WebhookEvent(models.Model):
    id = models.TextField(primary_key=True)


class LedgerEntry(models.Model):
    tx_id = models.TextField()
    account = models.TextField()
    side = models.TextField()
    amount_minor = models.BigIntegerField()
