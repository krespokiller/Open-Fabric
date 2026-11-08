# OpenFabric piece: `commerce.checkout` v0.1

This piece is a verified, reusable building block. It is stack-agnostic: it describes the behavior, the business rules with examples, the invariants and a reference design that is known to pass the piece's tests. Implement it in the project's stack. The public tests listed at the end will be run against your app after every attempt, and you will see their results.

## 1. Business rules with examples

### 1.1 New-customer discount

```
is_new   = customer has zero orders with status 'paid'
eligible = is_new AND subtotal_minor >= 10_000_000
discount = eligible ? min(round_half_even(subtotal_minor / 10), 3_000_000) : 0
total    = subtotal_minor - discount
```

Integer-only implementation of `round_half_even(subtotal_minor / 10)`, with no floating point:

```
q = subtotal_minor div 10      # integer division
r = subtotal_minor mod 10
if r > 5 or (r == 5 and q is odd): q = q + 1
```

| Case | is_new | subtotal_minor | discount_minor | total_minor |
| --- | --- | --- | --- | --- |
| returning customer | no | 10,000,000 | 0 | 10,000,000 |
| new, 10% | yes | 15,000,000 | 1,500,000 | 13,500,000 |
| new, capped | yes | 40,000,000 | 3,000,000 | 37,000,000 |
| new, below threshold | yes | 5,000,000 | 0 | 5,000,000 |
| half-even rounds up to even | yes | 12,345,675 | 1,234,568 | 11,111,107 |
| half-even stays on even | yes | 12,345,665 | 1,234,566 | 11,111,099 |

### 1.2 Invariants

- `0 <= discount_minor <= 3_000_000`, for any cart size.
- `total_minor = subtotal_minor - discount_minor`.
- A product's stock is never negative, also under concurrent checkouts.
- Every ledger transaction is balanced: sum of debits = sum of credits.
- One successful checkout = one order = one charge, no matter how many times the request is retried with the same idempotency key.
- A webhook event changes state at most once.

## 2. Reference design

### 2.1 Tables

```
customers(id PK, email, name, api_key UNIQUE)
products(sku PK, name, price_minor BIGINT, stock INT CHECK (stock >= 0))
orders(id PK, customer_id FK, status TEXT, subtotal_minor BIGINT, discount_minor BIGINT, total_minor BIGINT, charge_id TEXT NULL)
order_items(order_id FK, sku FK, qty INT, unit_price_minor BIGINT)
idempotency_keys(customer_id, key, request_hash TEXT, response_status INT, response_body TEXT, PRIMARY KEY(customer_id, key))
webhook_events(id PK)
ledger_entries(id PK, tx_id TEXT, account TEXT, side TEXT CHECK (side IN ('debit','credit')), amount_minor BIGINT)
```

Create them with `CREATE TABLE IF NOT EXISTS` when the app starts. Use `BIGINT` for money.

### 2.2 Checkout algorithm

```
1. key = header Idempotency-Key; if missing -> 400
2. validate cart shape (non-empty, qty integer >= 1, no duplicate sku) -> else 422
3. request_hash = canonical JSON of the parsed body (or the raw body)
4. BEGIN transaction
5.   SELECT request_hash, response_status, response_body FROM idempotency_keys
       WHERE customer_id = $c AND key = $k FOR UPDATE
     if found: COMMIT; same hash -> return stored status and body; different hash -> 422 IDEMPOTENCY_CONFLICT
6.   load products for the skus; any missing -> ROLLBACK, 422
7.   for each line:
       UPDATE products SET stock = stock - $qty WHERE sku = $sku AND stock >= $qty
       if 0 rows updated -> ROLLBACK, 409 OUT_OF_STOCK
8.   is_new = NOT EXISTS (SELECT 1 FROM orders WHERE customer_id = $c AND status = 'paid')
     compute subtotal, discount, total (section 1.1)
9.   INSERT order (status 'pending') and its items
10.  INSERT idempotency_keys row with the 201 response body
11. COMMIT
12. POST {PSP_URL}/charges with header Idempotency-Key = order id; save charge_id on the order
13. return 201 with the stored response body
```

Two concurrent requests with the same new key both try the INSERT in step 10; the primary key makes the second one fail. Handle that by rolling back and replaying, or by inserting a placeholder row in step 5 before doing any work. Either is acceptable for this piece.

The conditional `UPDATE ... WHERE stock >= $qty` is what keeps stock non-negative under concurrency. Never read the stock, compare in application code and then write it back.

### 2.3 Webhook algorithm

```
1. raw = request body exactly as received (bytes or string, before JSON parsing)
2. ts = header X-Timestamp; |now - ts| > 300 -> 401
3. expected = hex(HMAC_SHA256(WEBHOOK_SECRET, ts + "." + raw))
   compare "sha256=" + expected with header X-Signature using a constant-time comparison -> mismatch 401
4. event = JSON.parse(raw)
5. BEGIN
6.   INSERT INTO webhook_events(id) VALUES ($event.id) ON CONFLICT DO NOTHING
     0 rows inserted -> COMMIT, return 200 (duplicate)
7.   SELECT order FOR UPDATE; missing -> ROLLBACK, 404
8.   order.status != 'pending' -> COMMIT, return 200
9.   charge.succeeded:
       amount != total -> ROLLBACK (the event is not recorded), 422 AMOUNT_MISMATCH
       UPDATE orders SET status = 'paid'
       INSERT ledger entries with one tx_id:
         debit psp_receivable total; debit discounts_given discount (if > 0); credit sales subtotal
     charge.failed:
       UPDATE orders SET status = 'failed'
       for each item: UPDATE products SET stock = stock + qty
10. COMMIT, return 200
```

### 2.4 Authorization

- Admin key: compare with `ADMIN_KEY`.
- Customer key: look up `customers.api_key`.
- `GET /orders/{id}`: admin sees any order; a customer only their own; anything else is `404`, never `403`.

## 3. Public tests

These run against your app after every attempt. Their values differ from the examples above on purpose.

| Id | What it checks |
| --- | --- |
| P1 | A new customer buying 2 × 6,000,000 gets a 1,200,000 discount; total 10,800,000 |
| P2 | Repeating a checkout with the same key and body returns the same order and does not reserve stock twice |
| P3 | Reusing a key with a different body returns 422 |
| P4 | A cart with an unknown sku returns 422 and changes no stock |
| P5 | Asking for more units than in stock returns 409 and changes no stock |
| P6 | A webhook with a wrong signature returns 401 |
| P7 | A valid `charge.succeeded` webhook marks the order paid and the ledger stays balanced |
| P8 | A valid `charge.failed` webhook marks the order failed and gives the stock back |
