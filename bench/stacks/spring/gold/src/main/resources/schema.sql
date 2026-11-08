CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    api_key TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS products (
    sku TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_minor BIGINT NOT NULL CHECK (price_minor >= 0),
    stock INTEGER NOT NULL CHECK (stock >= 0)
);
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    status TEXT NOT NULL,
    subtotal_minor BIGINT NOT NULL,
    discount_minor BIGINT NOT NULL,
    total_minor BIGINT NOT NULL,
    charge_id TEXT
);
CREATE TABLE IF NOT EXISTS order_items (
    order_id BIGINT NOT NULL REFERENCES orders(id),
    sku TEXT NOT NULL REFERENCES products(sku),
    qty INTEGER NOT NULL,
    unit_price_minor BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS idempotency_keys (
    customer_id BIGINT NOT NULL,
    key TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    PRIMARY KEY (customer_id, key)
);
CREATE TABLE IF NOT EXISTS webhook_events (id TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    tx_id TEXT NOT NULL,
    account TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('debit', 'credit')),
    amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0)
);
