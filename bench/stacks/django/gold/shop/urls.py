from django.urls import path

from core import views

urlpatterns = [
    path("health", views.health),
    path("products", views.products),
    path("products/<str:sku>", views.product_detail),
    path("customers", views.customers),
    path("checkout", views.checkout),
    path("orders/<str:order_id>", views.order_detail),
    path("webhooks/payments", views.payments_webhook),
    path("ledger/summary", views.ledger_summary),
]
