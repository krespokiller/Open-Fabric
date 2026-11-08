import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { pool, ready, tx } from './db';
import { computeDiscount } from './discount';
import { HttpError, authenticate, canonical, err, handle, isDigits, json, readJson } from './http';

type Line = { sku: string; qty: number };

async function requireAdmin(req: Request) {
  const caller = await authenticate(req);
  if (!caller) throw new HttpError(401, 'UNAUTHORIZED');
  if (caller.role !== 'admin') throw new HttpError(403, 'FORBIDDEN');
}

async function requireCustomer(req: Request): Promise<number> {
  const caller = await authenticate(req);
  if (!caller) throw new HttpError(401, 'UNAUTHORIZED');
  if (caller.role !== 'customer') throw new HttpError(403, 'FORBIDDEN');
  return caller.id;
}

const productView = (p: any) => ({ sku: p.sku, name: p.name, price_minor: p.price_minor, stock: p.stock });

export const createProduct = handle(async (req: Request) => {
  await ready();
  await requireAdmin(req);
  const b = await readJson(req);
  const valid =
    b && typeof b.sku === 'string' && b.sku && typeof b.name === 'string' &&
    Number.isInteger(b.price_minor) && b.price_minor >= 0 && Number.isInteger(b.stock) && b.stock >= 0;
  if (!valid) return err(422, 'INVALID_PRODUCT');
  const { rows } = await pool.query(
    'INSERT INTO products (sku, name, price_minor, stock) VALUES ($1, $2, $3, $4) ON CONFLICT (sku) DO NOTHING RETURNING *',
    [b.sku, b.name, b.price_minor, b.stock],
  );
  if (!rows.length) return err(409, 'SKU_EXISTS');
  return json(productView(rows[0]), 201);
});

export const getProduct = handle(async (req: Request, sku: string) => {
  await ready();
  if (!(await authenticate(req))) return err(401, 'UNAUTHORIZED');
  const { rows } = await pool.query('SELECT * FROM products WHERE sku = $1', [sku]);
  return rows.length ? json(productView(rows[0])) : err(404, 'NOT_FOUND');
});

export const createCustomer = handle(async (req: Request) => {
  await ready();
  await requireAdmin(req);
  const b = await readJson(req);
  if (!b || typeof b.email !== 'string' || typeof b.name !== 'string') return err(422, 'INVALID_CUSTOMER');
  const apiKey = randomBytes(24).toString('hex');
  const { rows } = await pool.query(
    'INSERT INTO customers (email, name, api_key) VALUES ($1, $2, $3) RETURNING id, email, name, api_key',
    [b.email, b.name, apiKey],
  );
  return json(rows[0], 201);
});

function parseCart(body: any): Line[] | null {
  const items = body?.items;
  if (!Array.isArray(items) || items.length === 0) return null;
  const seen = new Set<string>();
  const lines: Line[] = [];
  for (const it of items) {
    if (!it || typeof it.sku !== 'string' || !Number.isInteger(it.qty) || it.qty < 1) return null;
    if (seen.has(it.sku)) return null;
    seen.add(it.sku);
    lines.push({ sku: it.sku, qty: it.qty });
  }
  return lines;
}

export const checkout = handle(async (req: Request) => {
  await ready();
  const customerId = await requireCustomer(req);
  const key = req.headers.get('idempotency-key');
  if (!key) return err(400, 'IDEMPOTENCY_KEY_REQUIRED');
  const body = await readJson(req);
  const lines = parseCart(body);
  if (!lines) return err(422, 'INVALID_CART');
  const requestHash = canonical(body);

  const outcome = await tx(async (c) => {
    const claimed = await c.query(
      `INSERT INTO idempotency_keys (customer_id, key, request_hash) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING RETURNING key`,
      [customerId, key, requestHash],
    );
    if (!claimed.rowCount) {
      const { rows } = await c.query(
        'SELECT request_hash, response_status, response_body FROM idempotency_keys WHERE customer_id = $1 AND key = $2 FOR UPDATE',
        [customerId, key],
      );
      const prior = rows[0];
      if (!prior) throw new HttpError(409, 'IDEMPOTENCY_RETRY');
      if (prior.request_hash !== requestHash) throw new HttpError(422, 'IDEMPOTENCY_CONFLICT');
      if (prior.response_status == null) throw new HttpError(409, 'IDEMPOTENCY_IN_PROGRESS');
      return { replay: true as const, status: prior.response_status as number, body: JSON.parse(prior.response_body) };
    }

    const skus = lines.map((l) => l.sku);
    const { rows: products } = await c.query('SELECT sku, price_minor FROM products WHERE sku = ANY($1::text[])', [skus]);
    if (products.length !== lines.length) throw new HttpError(422, 'INVALID_CART');
    const price = new Map<string, number>(products.map((p: any) => [p.sku, p.price_minor]));

    for (const line of [...lines].sort((a, b) => a.sku.localeCompare(b.sku))) {
      const r = await c.query('UPDATE products SET stock = stock - $1 WHERE sku = $2 AND stock >= $1', [line.qty, line.sku]);
      if (r.rowCount !== 1) throw new HttpError(409, 'OUT_OF_STOCK');
    }

    const subtotal = lines.reduce((sum, l) => sum + price.get(l.sku)! * l.qty, 0);
    const paid = await c.query("SELECT 1 FROM orders WHERE customer_id = $1 AND status = 'paid' LIMIT 1", [customerId]);
    const discount = computeDiscount(subtotal, paid.rowCount === 0);
    const total = subtotal - discount;

    const { rows: orderRows } = await c.query(
      `INSERT INTO orders (customer_id, status, subtotal_minor, discount_minor, total_minor)
       VALUES ($1, 'pending', $2, $3, $4) RETURNING id`,
      [customerId, subtotal, discount, total],
    );
    const orderId = orderRows[0].id;
    for (const l of lines) {
      await c.query('INSERT INTO order_items (order_id, sku, qty, unit_price_minor) VALUES ($1, $2, $3, $4)', [
        orderId, l.sku, l.qty, price.get(l.sku),
      ]);
    }
    const response = { order_id: orderId, status: 'pending', subtotal_minor: subtotal, discount_minor: discount, total_minor: total };
    await c.query(
      'UPDATE idempotency_keys SET response_status = 201, response_body = $3 WHERE customer_id = $1 AND key = $2',
      [customerId, key, JSON.stringify(response)],
    );
    return { replay: false as const, status: 201, body: response };
  });

  if (!outcome.replay) {
    const orderId = outcome.body.order_id;
    try {
      const res = await fetch(`${process.env.PSP_URL}/charges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': String(orderId) },
        body: JSON.stringify({ order_id: orderId, amount_minor: outcome.body.total_minor }),
      });
      if (res.ok) {
        const charge = await res.json();
        await pool.query('UPDATE orders SET charge_id = $1 WHERE id = $2', [charge.charge_id, orderId]);
      }
    } catch (e) {
      console.error('charge request failed', e);
    }
  }
  return json(outcome.body, outcome.status);
});

export const getOrder = handle(async (req: Request, id: string) => {
  await ready();
  const caller = await authenticate(req);
  if (!caller) return err(401, 'UNAUTHORIZED');
  if (!isDigits(id)) return err(404, 'NOT_FOUND');
  const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
  const o = rows[0];
  if (!o || (caller.role === 'customer' && o.customer_id !== caller.id)) return err(404, 'NOT_FOUND');
  return json({ id: o.id, status: o.status, subtotal_minor: o.subtotal_minor, discount_minor: o.discount_minor, total_minor: o.total_minor });
});

function validSignature(raw: string, ts: string, signature: string): boolean {
  const secret = process.env.WEBHOOK_SECRET || '';
  const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex')}`);
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export const paymentsWebhook = handle(async (req: Request) => {
  await ready();
  const raw = await req.text();
  const ts = req.headers.get('x-timestamp') || '';
  const signature = req.headers.get('x-signature') || '';
  const tsNum = Number(ts);
  if (!/^\d+$/.test(ts) || Math.abs(Date.now() / 1000 - tsNum) > 300 || !validSignature(raw, ts, signature)) {
    return err(401, 'INVALID_SIGNATURE');
  }
  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return err(400, 'INVALID_JSON');
  }
  if (!event || typeof event.id !== 'string' || !['charge.succeeded', 'charge.failed'].includes(event.type)) {
    return err(400, 'INVALID_EVENT');
  }

  return tx(async (c) => {
    const fresh = await c.query('INSERT INTO webhook_events (id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id', [event.id]);
    if (!fresh.rowCount) return json({ ok: true, duplicate: true });
    if (!isDigits(event.order_id)) throw new HttpError(404, 'NOT_FOUND');
    const { rows } = await c.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [String(event.order_id)]);
    const order = rows[0];
    if (!order) throw new HttpError(404, 'NOT_FOUND');
    if (order.status !== 'pending') return json({ ok: true, ignored: true });

    if (event.type === 'charge.succeeded') {
      if (event.amount_minor !== order.total_minor) throw new HttpError(422, 'AMOUNT_MISMATCH');
      await c.query("UPDATE orders SET status = 'paid' WHERE id = $1", [order.id]);
      const txId = `order-${order.id}-paid`;
      const entries: [string, string, number][] = [['psp_receivable', 'debit', order.total_minor]];
      if (order.discount_minor > 0) entries.push(['discounts_given', 'debit', order.discount_minor]);
      entries.push(['sales', 'credit', order.subtotal_minor]);
      for (const [account, side, amount] of entries) {
        await c.query('INSERT INTO ledger_entries (tx_id, account, side, amount_minor) VALUES ($1, $2, $3, $4)', [txId, account, side, amount]);
      }
    } else {
      await c.query("UPDATE orders SET status = 'failed' WHERE id = $1", [order.id]);
      await c.query(
        `UPDATE products p SET stock = p.stock + i.qty FROM order_items i WHERE i.order_id = $1 AND i.sku = p.sku`,
        [order.id],
      );
    }
    return json({ ok: true });
  });
});

export const ledgerSummary = handle(async (req: Request) => {
  await ready();
  await requireAdmin(req);
  const { rows } = await pool.query(`
    SELECT
      COALESCE(SUM(amount_minor) FILTER (WHERE side = 'debit'), 0)::bigint AS debits_minor,
      COALESCE(SUM(amount_minor) FILTER (WHERE side = 'credit'), 0)::bigint AS credits_minor,
      COALESCE(SUM(amount_minor) FILTER (WHERE side = 'credit' AND account = 'sales'), 0)::bigint AS sales_minor,
      COALESCE(SUM(amount_minor) FILTER (WHERE side = 'debit' AND account = 'discounts_given'), 0)::bigint AS discounts_minor
    FROM ledger_entries`);
  return json(rows[0]);
});
