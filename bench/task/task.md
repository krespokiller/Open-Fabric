# Task: checkout service

Add a checkout feature to this project. It is an HTTP JSON API backed by the PostgreSQL database the project is already connected to. Implement everything below; nothing else is required.

## Runtime

The app listens on port `8080` and reads these environment variables:

| Variable | Meaning |
| --- | --- |
| `DATABASE_URL` | PostgreSQL URL, e.g. `postgres://bench:bench@db:5432/bench` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | the same database, split into parts |
| `ADMIN_KEY` | API key of the administrator |
| `WEBHOOK_SECRET` | secret used to sign payment webhooks |
| `PSP_URL` | base URL of the payment provider, e.g. `http://host.docker.internal:7070` |

The database starts empty on every start. The app must create the tables it needs by itself when it starts. `GET /health` must keep returning `200`.

## Conventions

- Request and response bodies are JSON. Money is always an integer number of minor units (cents of Colombian pesos), in fields ending in `_minor`. There is a single currency, so no currency field is needed.
- Authentication: `Authorization: Bearer <key>`. The admin uses `ADMIN_KEY`. Customers use the `api_key` returned when they are created. A missing or unknown key returns `401`.
- Ids may be strings or integers. Clients send them back exactly as you returned them.
- Errors return the status code below and a body `{"error": "<CODE>"}`.

## Endpoints

### `POST /products` (admin)

Body `{"sku": "MUG", "name": "Coffee mug", "price_minor": 5000000, "stock": 10}`. Returns `201` with the product as `{"sku", "name", "price_minor", "stock"}`.

### `GET /products/{sku}` (admin or any customer)

Returns `200` with `{"sku", "name", "price_minor", "stock"}`, or `404`.

### `POST /customers` (admin)

Body `{"email": "ana@example.com", "name": "Ana"}`. Returns `201` with `{"id", "email", "name", "api_key"}`. The `api_key` is a new random secret for that customer.

### `POST /checkout` (customer)

Header `Idempotency-Key: <string>` is required; without it return `400` `IDEMPOTENCY_KEY_REQUIRED`.

Body `{"items": [{"sku": "MUG", "qty": 3}]}`.

The cart is invalid, and the response is `422` `INVALID_CART`, when: `items` is missing or empty, a `sku` does not exist, a `qty` is not an integer of at least 1, or the same `sku` appears twice.

If any line asks for more units than are in stock, the response is `409` `OUT_OF_STOCK` and nothing changes.

Otherwise:

1. Price the cart: `subtotal_minor` is the sum of `price_minor × qty`.
2. Apply the new-customer discount (rule below).
3. Reserve stock: subtract each `qty` from the product's stock. Stock can never go below zero, even when many checkouts run at the same time.
4. Create the order with status `pending`.
5. Ask the payment provider for a charge (below).
6. Return `201` with `{"order_id", "status": "pending", "subtotal_minor", "discount_minor", "total_minor"}`.

All of this succeeds or fails as a whole: a rejected checkout changes nothing.

**New-customer discount.** A customer is new when they have no orders with status `paid`. A new customer whose `subtotal_minor` is at least `10000000` (100,000.00 COP) gets 10% off, rounded to an integer number of minor units with round-half-to-even (banker's rounding), and never more than `3000000` (30,000.00 COP). Everyone else gets no discount. `total_minor = subtotal_minor - discount_minor`.

**Idempotency.** The idempotency key is scoped to the customer. If a checkout succeeded with a key, a new request from the same customer with the same key and the same body returns exactly the same response (same `order_id`, same amounts, `201`) without creating another order, reserving stock again or charging again. The same key with a different body returns `422` `IDEMPOTENCY_CONFLICT` and changes nothing.

**Payment provider.** Create a charge with `POST {PSP_URL}/charges`, header `Idempotency-Key: <order_id>`, body `{"order_id": <order_id>, "amount_minor": <total_minor>}`. It answers `200` with `{"charge_id", "status": "pending"}`. The real result arrives later by webhook.

### `GET /orders/{id}` (the customer who owns it, or admin)

Returns `200` with `{"id", "status", "subtotal_minor", "discount_minor", "total_minor"}`. Status is `pending`, `paid` or `failed`. If the order does not exist or belongs to another customer, return `404`.

### `POST /webhooks/payments` (no API key; signed)

Headers:

- `X-Timestamp: <unix seconds>`
- `X-Signature: sha256=<hex>` where `<hex>` is the lowercase hex HMAC-SHA256 of the string `<timestamp>.<raw request body>`, keyed with `WEBHOOK_SECRET`.

Body `{"id": "evt_123", "type": "charge.succeeded", "order_id": <order_id>, "amount_minor": 13500000}`. `type` is `charge.succeeded` or `charge.failed`.

Processing:

1. If the signature is wrong, or the timestamp is more than 300 seconds away from now, return `401` `INVALID_SIGNATURE` and change nothing. Verify the signature over the raw body exactly as received.
2. If an event with the same `id` was already processed, return `200` and change nothing.
3. If the order does not exist, return `404`.
4. If the order is not `pending`, return `200` and change nothing.
5. `charge.succeeded`: if `amount_minor` differs from the order's `total_minor`, return `422` `AMOUNT_MISMATCH` and change nothing. Otherwise mark the order `paid` and record in the ledger, as one balanced transaction: debit `psp_receivable` with `total_minor`, debit `discounts_given` with `discount_minor` (skip if zero), credit `sales` with `subtotal_minor`. Return `200`.
6. `charge.failed`: mark the order `failed` and give the reserved stock back. Return `200`.

### `GET /ledger/summary` (admin)

Returns `200` with `{"debits_minor", "credits_minor", "sales_minor", "discounts_minor"}`: the sum of all debit entries, of all credit entries, of credits to `sales`, and of debits to `discounts_given`. Ledger entries are never modified or deleted.
