// Shared helpers for the black-box HTTP suites. Suites only talk HTTP to the app
// and read the mock payment provider's state; they never look inside the app.
import { createHmac, randomUUID } from 'node:crypto';

export class AssertionError extends Error {}

export function fail(message) {
  throw new AssertionError(message);
}

export function eq(actual, expected, what) {
  if (actual !== expected) {
    fail(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export function ok(cond, what) {
  if (!cond) fail(what);
}

export function isInt(v) {
  return typeof v === 'number' && Number.isInteger(v);
}

export function intField(obj, field, what) {
  const v = obj?.[field];
  if (!isInt(v)) fail(`${what}: field "${field}" must be a JSON integer, got ${JSON.stringify(v)}`);
  return v;
}

const sameId = (a, b) => String(a) === String(b);
export { sameId };

export function makeCtx({ base, adminKey, webhookSecret, psp, prefix, signal }) {
  let counter = 0;
  const next = () => ++counter;

  async function req(method, path, { key, body, raw, headers = {}, timeoutMs = 20000 } = {}) {
    const h = { ...headers };
    if (key !== undefined && key !== null) h['Authorization'] = `Bearer ${key}`;
    let payload;
    if (raw !== undefined) {
      payload = raw;
      h['Content-Type'] = h['Content-Type'] || 'application/json';
    } else if (body !== undefined) {
      payload = JSON.stringify(body);
      h['Content-Type'] = 'application/json';
    }
    let res;
    try {
      const sig = signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);
      res = await fetch(base + path, { method, headers: h, body: payload, signal: sig });
    } catch (e) {
      fail(`${method} ${path}: request failed (${e.name}: ${e.message})`);
    }
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    return { status: res.status, json, text };
  }

  function expectStatus(res, status, what) {
    if (res.status !== status) {
      fail(`${what}: expected HTTP ${status}, got ${res.status} with body ${res.text.slice(0, 300)}`);
    }
  }

  async function createProduct({ price, stock, name = 'Item' }) {
    const sku = `${prefix}-P${next()}`;
    const res = await req('POST', '/products', { key: adminKey, body: { sku, name, price_minor: price, stock } });
    expectStatus(res, 201, `POST /products (${sku})`);
    return sku;
  }

  async function createCustomer() {
    const n = next();
    const res = await req('POST', '/customers', { key: adminKey, body: { email: `${prefix.toLowerCase()}-c${n}@example.com`, name: `Customer ${n}` } });
    expectStatus(res, 201, 'POST /customers');
    const id = res.json?.id;
    const apiKey = res.json?.api_key;
    ok(id !== undefined && id !== null, 'POST /customers: response must include "id"');
    ok(typeof apiKey === 'string' && apiKey.length > 0, 'POST /customers: response must include a non-empty "api_key"');
    return { id, key: apiKey };
  }

  async function checkout(customer, items, { idemKey = randomUUID(), withKey = true } = {}) {
    const headers = withKey ? { 'Idempotency-Key': idemKey } : {};
    return req('POST', '/checkout', { key: customer.key, body: { items }, headers });
  }

  async function checkoutOk(customer, items, what = 'checkout') {
    const res = await checkout(customer, items);
    expectStatus(res, 201, what);
    const j = res.json || {};
    ok(j.order_id !== undefined && j.order_id !== null, `${what}: response must include "order_id"`);
    eq(j.status, 'pending', `${what}: status`);
    return {
      order_id: j.order_id,
      subtotal: intField(j, 'subtotal_minor', what),
      discount: intField(j, 'discount_minor', what),
      total: intField(j, 'total_minor', what),
      res,
    };
  }

  async function stockOf(sku) {
    const res = await req('GET', `/products/${encodeURIComponent(sku)}`, { key: adminKey });
    expectStatus(res, 200, `GET /products/${sku}`);
    return intField(res.json, 'stock', `GET /products/${sku}`);
  }

  async function order(id, key = adminKey) {
    return req('GET', `/orders/${encodeURIComponent(String(id))}`, { key });
  }

  async function orderStatus(id) {
    const res = await order(id);
    expectStatus(res, 200, `GET /orders/${id} as admin`);
    return res.json?.status;
  }

  function sign(rawBody, { secret = webhookSecret, ts = Math.floor(Date.now() / 1000) } = {}) {
    const hex = createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');
    return { 'X-Timestamp': String(ts), 'X-Signature': `sha256=${hex}` };
  }

  async function webhook(event, opts = {}) {
    const raw = JSON.stringify(event);
    const headers = opts.headers || sign(raw, opts);
    return req('POST', '/webhooks/payments', { raw, headers });
  }

  function event(type, orderId, amount, id = `evt_${prefix}_${next()}`) {
    return { id, type, order_id: orderId, amount_minor: amount };
  }

  async function ledger() {
    const res = await req('GET', '/ledger/summary', { key: adminKey });
    expectStatus(res, 200, 'GET /ledger/summary');
    const what = 'GET /ledger/summary';
    return {
      debits: intField(res.json, 'debits_minor', what),
      credits: intField(res.json, 'credits_minor', what),
      sales: intField(res.json, 'sales_minor', what),
      discounts: intField(res.json, 'discounts_minor', what),
    };
  }

  return {
    base, adminKey, webhookSecret, psp, prefix,
    req, expectStatus, createProduct, createCustomer, checkout, checkoutOk,
    stockOf, order, orderStatus, sign, webhook, event, ledger,
  };
}

// Runs tests sequentially. Each test gets a fresh ctx prefix so data never collides.
// A test that times out is aborted (its in-flight requests are cancelled) so it cannot
// interfere with the next test.
export async function runSuite(name, tests, makeTestCtx, { perTestTimeoutMs = 60000 } = {}) {
  const results = [];
  for (const t of tests) {
    const started = Date.now();
    const controller = new AbortController();
    let timer;
    let pass = false;
    let error = null;
    try {
      const ctx = makeTestCtx(t.id, controller.signal);
      await Promise.race([
        t.fn(ctx),
        new Promise((_, rej) => {
          timer = setTimeout(() => rej(new AssertionError(`timed out after ${perTestTimeoutMs} ms`)), perTestTimeoutMs);
        }),
      ]);
      pass = true;
    } catch (e) {
      error = e instanceof AssertionError ? e.message : `${e.name}: ${e.message}`;
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
    if (!pass && error?.startsWith('timed out')) await new Promise((r) => setTimeout(r, 2000));
    results.push({ suite: name, id: t.id, name: t.name, pass, error, ms: Date.now() - started });
  }
  return results;
}
