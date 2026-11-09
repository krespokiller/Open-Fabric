// Independent second hidden suite for the checkout service task.
// Written only from task/task.md and suites/lib.mjs. Black-box HTTP checks only.
import { randomUUID } from 'node:crypto';
import { ok, eq, intField, sameId } from './lib.mjs';

// ---------- local helpers (built only on the ctx API) ----------

async function pay(c, o, amount = o.total) {
  const res = await c.webhook(c.event('charge.succeeded', o.order_id, amount));
  c.expectStatus(res, 200, 'webhook charge.succeeded');
  return res;
}

function errCode(c, res, status, code, what) {
  c.expectStatus(res, status, what);
  eq(res.json?.error, code, `${what}: error code`);
}

// A non-existent order id of the same shape as a real one.
function missingIdLike(id) {
  if (typeof id === 'number') return 2147480011;
  const s = String(id);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return randomUUID();
  if (/^\d+$/.test(s)) return '2147480011';
  return `${s}x9`;
}

async function discountFor(c, items) {
  const cust = await c.createCustomer();
  return c.checkoutOk(cust, items, 'checkout for discount');
}

// ---------- tests ----------

export const tests = [
  {
    id: 'X01',
    name: 'product create and read back; unknown sku is 404; customers can read products',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 73210, stock: 17, name: 'Teapot' });
      const cust = await c.createCustomer();
      const res = await c.req('GET', `/products/${encodeURIComponent(sku)}`, { key: cust.key });
      c.expectStatus(res, 200, 'GET product as customer');
      eq(res.json?.sku, sku, 'sku');
      eq(res.json?.name, 'Teapot', 'name');
      eq(intField(res.json, 'price_minor', 'product'), 73210, 'price_minor');
      eq(intField(res.json, 'stock', 'product'), 17, 'stock');
      const miss = await c.req('GET', `/products/${encodeURIComponent(sku + '-NOPE')}`, { key: c.adminKey });
      c.expectStatus(miss, 404, 'GET unknown product');
    },
  },
  {
    id: 'X02',
    name: 'missing or unknown bearer key returns 401',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 1234, stock: 4 });
      const noKey = await c.req('POST', '/checkout', { body: { items: [{ sku, qty: 1 }] }, headers: { 'Idempotency-Key': randomUUID() } });
      c.expectStatus(noKey, 401, 'checkout without key');
      const badKey = await c.req('POST', '/checkout', { key: 'not-a-real-key-' + randomUUID(), body: { items: [{ sku, qty: 1 }] }, headers: { 'Idempotency-Key': randomUUID() } });
      c.expectStatus(badKey, 401, 'checkout with unknown key');
      const prodNoKey = await c.req('GET', `/products/${encodeURIComponent(sku)}`);
      c.expectStatus(prodNoKey, 401, 'GET product without key');
      const adminNo = await c.req('POST', '/customers', { body: { email: `${c.prefix.toLowerCase()}-x@example.com`, name: 'X' } });
      c.expectStatus(adminNo, 401, 'POST /customers without key');
      eq(await c.stockOf(sku), 4, 'stock untouched');
    },
  },
  {
    id: 'X03',
    name: 'customers get distinct api keys',
    fn: async (c) => {
      const a = await c.createCustomer();
      const b = await c.createCustomer();
      ok(a.key !== b.key, 'two customers must not share an api_key');
      ok(String(a.id) !== String(b.id), 'two customers must have different ids');
    },
  },
  {
    id: 'X04',
    name: 'checkout without Idempotency-Key is 400 IDEMPOTENCY_KEY_REQUIRED and changes nothing',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 2210, stock: 6 });
      const cust = await c.createCustomer();
      const res = await c.checkout(cust, [{ sku, qty: 2 }], { withKey: false });
      errCode(c, res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'checkout without idempotency key');
      eq(await c.stockOf(sku), 6, 'stock unchanged');
    },
  },
  {
    id: 'X05',
    name: 'invalid carts are 422 INVALID_CART and change nothing',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 4410, stock: 9 });
      const cust = await c.createCustomer();
      const cases = [
        ['empty items', { items: [] }],
        ['missing items', {}],
        ['unknown sku', { items: [{ sku, qty: 1 }, { sku: `${sku}-GHOST`, qty: 1 }] }],
        ['qty zero', { items: [{ sku, qty: 0 }] }],
        ['qty negative', { items: [{ sku, qty: -2 }] }],
        ['qty fractional', { items: [{ sku, qty: 1.5 }] }],
        ['qty string', { items: [{ sku, qty: '2' }] }],
        ['duplicate sku', { items: [{ sku, qty: 1 }, { sku, qty: 2 }] }],
      ];
      for (const [label, body] of cases) {
        const res = await c.req('POST', '/checkout', { key: cust.key, body, headers: { 'Idempotency-Key': randomUUID() } });
        errCode(c, res, 422, 'INVALID_CART', `invalid cart (${label})`);
      }
      eq(await c.stockOf(sku), 9, 'stock unchanged after invalid carts');
    },
  },
  {
    id: 'X06',
    name: 'out of stock on one line is 409 and no line is reserved',
    fn: async (c) => {
      const a = await c.createProduct({ price: 3100, stock: 8 });
      const b = await c.createProduct({ price: 2700, stock: 3 });
      const cust = await c.createCustomer();
      const res = await c.checkout(cust, [{ sku: a, qty: 5 }, { sku: b, qty: 4 }]);
      errCode(c, res, 409, 'OUT_OF_STOCK', 'checkout over stock');
      eq(await c.stockOf(a), 8, 'stock of in-stock line unchanged');
      eq(await c.stockOf(b), 3, 'stock of short line unchanged');
      // Exactly all remaining units is fine.
      const okRes = await c.checkoutOk(cust, [{ sku: a, qty: 8 }, { sku: b, qty: 3 }], 'checkout exact stock');
      eq(okRes.subtotal, 8 * 3100 + 3 * 2700, 'subtotal');
      eq(await c.stockOf(a), 0, 'stock a drained');
      eq(await c.stockOf(b), 0, 'stock b drained');
    },
  },
  {
    id: 'X07',
    name: 'small cart: subtotal is sum of lines, no discount, stock reserved, order readable',
    fn: async (c) => {
      const a = await c.createProduct({ price: 18750, stock: 20 });
      const b = await c.createProduct({ price: 999, stock: 20 });
      const cust = await c.createCustomer();
      const o = await c.checkoutOk(cust, [{ sku: a, qty: 7 }, { sku: b, qty: 11 }]);
      const sub = 7 * 18750 + 11 * 999;
      eq(o.subtotal, sub, 'subtotal');
      eq(o.discount, 0, 'discount under threshold');
      eq(o.total, sub, 'total');
      eq(await c.stockOf(a), 13, 'stock a reserved');
      eq(await c.stockOf(b), 9, 'stock b reserved');
      const res = await c.order(o.order_id, cust.key);
      c.expectStatus(res, 200, 'GET own order');
      ok(sameId(res.json?.id, o.order_id), 'order id matches');
      eq(res.json?.status, 'pending', 'order status');
      eq(intField(res.json, 'subtotal_minor', 'order'), sub, 'order subtotal');
      eq(intField(res.json, 'discount_minor', 'order'), 0, 'order discount');
      eq(intField(res.json, 'total_minor', 'order'), sub, 'order total');
    },
  },
  {
    id: 'X08',
    name: 'discount threshold: 9,999,999 gets none, 10,000,000 gets 10%',
    fn: async (c) => {
      const below = await c.createProduct({ price: 3333333, stock: 5 });
      const o1 = await discountFor(c, [{ sku: below, qty: 3 }]); // 9,999,999
      eq(o1.subtotal, 9999999, 'subtotal below threshold');
      eq(o1.discount, 0, 'no discount below threshold');
      eq(o1.total, 9999999, 'total below threshold');
      const at = await c.createProduct({ price: 2500000, stock: 5 });
      const o2 = await discountFor(c, [{ sku: at, qty: 4 }]); // 10,000,000
      eq(o2.subtotal, 10000000, 'subtotal at threshold');
      eq(o2.discount, 1000000, 'discount at threshold');
      eq(o2.total, 9000000, 'total at threshold');
    },
  },
  {
    id: 'X09',
    name: 'discount uses round-half-to-even on the whole subtotal',
    fn: async (c) => {
      // 12,345,675 -> 1,234,567.5 -> 1,234,568 (odd rounds up)
      const p1 = await c.createProduct({ price: 12345675, stock: 3 });
      const o1 = await discountFor(c, [{ sku: p1, qty: 1 }]);
      eq(o1.discount, 1234568, 'half rounds to even (up)');
      eq(o1.total, 12345675 - 1234568, 'total after up-rounding');
      // 5,000,003 + 7,345,662 = 12,345,665 -> 1,234,566.5 -> 1,234,566 (even stays)
      const p2a = await c.createProduct({ price: 5000003, stock: 3 });
      const p2b = await c.createProduct({ price: 7345662, stock: 3 });
      const o2 = await discountFor(c, [{ sku: p2a, qty: 1 }, { sku: p2b, qty: 1 }]);
      eq(o2.subtotal, 12345665, 'subtotal of two lines');
      eq(o2.discount, 1234566, 'half rounds to even (down)');
      eq(o2.total, 12345665 - 1234566, 'total after down-rounding');
      // 4,115,559 x 3 = 12,346,677 -> 1,234,667.7 -> 1,234,668 (non-half rounds normally)
      const p3 = await c.createProduct({ price: 4115559, stock: 4 });
      const o3 = await discountFor(c, [{ sku: p3, qty: 3 }]);
      eq(o3.subtotal, 12346677, 'subtotal qty 3');
      eq(o3.discount, 1234668, 'non-half fraction rounds to nearest');
    },
  },
  {
    id: 'X10',
    name: 'discount cap at 3,000,000 including half-even just below the cap',
    fn: async (c) => {
      const big = await c.createProduct({ price: 15500003, stock: 4 });
      const o1 = await discountFor(c, [{ sku: big, qty: 2 }]); // 31,000,006
      eq(o1.subtotal, 31000006, 'large subtotal');
      eq(o1.discount, 3000000, 'discount capped');
      eq(o1.total, 28000006, 'total with capped discount');
      // 29,999,995 -> 2,999,999.5 -> 3,000,000
      const p2 = await c.createProduct({ price: 29999995, stock: 2 });
      const o2 = await discountFor(c, [{ sku: p2, qty: 1 }]);
      eq(o2.discount, 3000000, 'half-even reaches the cap exactly');
      // 29,999,985 -> 2,999,998.5 -> 2,999,998
      const p3 = await c.createProduct({ price: 29999985, stock: 2 });
      const o3 = await discountFor(c, [{ sku: p3, qty: 1 }]);
      eq(o3.discount, 2999998, 'half-even just below the cap');
    },
  },
  {
    id: 'X11',
    name: 'a customer with a paid order is no longer new; a failed order keeps them new',
    fn: async (c) => {
      const p = await c.createProduct({ price: 6400000, stock: 20 });
      const cust = await c.createCustomer();
      const first = await c.checkoutOk(cust, [{ sku: p, qty: 2 }], 'first checkout'); // 12,800,000
      eq(first.discount, 1280000, 'first order discounted');
      // A failed payment does not make the customer non-new.
      const fRes = await c.webhook(c.event('charge.failed', first.order_id, first.total));
      c.expectStatus(fRes, 200, 'charge.failed');
      const second = await c.checkoutOk(cust, [{ sku: p, qty: 2 }], 'second checkout');
      eq(second.discount, 1280000, 'still new after failed order');
      // A pending order does not make the customer non-new either.
      const third = await c.checkoutOk(cust, [{ sku: p, qty: 2 }], 'third checkout');
      eq(third.discount, 1280000, 'still new with only pending orders');
      await pay(c, second);
      const fourth = await c.checkoutOk(cust, [{ sku: p, qty: 2 }], 'fourth checkout');
      eq(fourth.discount, 0, 'no discount after a paid order');
      eq(fourth.total, 12800000, 'full price after a paid order');
    },
  },
  {
    id: 'X12',
    name: 'idempotent replay returns the same response without reserving again',
    fn: async (c) => {
      const p = await c.createProduct({ price: 8800000, stock: 10 });
      const cust = await c.createCustomer();
      const key = `idem-${randomUUID()}`;
      const items = [{ sku: p, qty: 2 }]; // 17,600,000 -> discount 1,760,000
      const r1 = await c.checkout(cust, items, { idemKey: key });
      c.expectStatus(r1, 201, 'first checkout');
      eq(await c.stockOf(p), 8, 'stock after first');
      const r2 = await c.checkout(cust, items, { idemKey: key });
      c.expectStatus(r2, 201, 'replayed checkout');
      ok(sameId(r2.json?.order_id, r1.json?.order_id), 'same order_id on replay');
      for (const f of ['status', 'subtotal_minor', 'discount_minor', 'total_minor']) {
        eq(r2.json?.[f], r1.json?.[f], `replay field ${f}`);
      }
      eq(r1.json?.discount_minor, 1760000, 'discount on first');
      eq(await c.stockOf(p), 8, 'stock not reserved twice');
    },
  },
  {
    id: 'X13',
    name: 'same idempotency key with a different body is 422 IDEMPOTENCY_CONFLICT',
    fn: async (c) => {
      const p = await c.createProduct({ price: 15000, stock: 12 });
      const cust = await c.createCustomer();
      const key = `idem-${randomUUID()}`;
      const r1 = await c.checkout(cust, [{ sku: p, qty: 3 }], { idemKey: key });
      c.expectStatus(r1, 201, 'first checkout');
      const r2 = await c.checkout(cust, [{ sku: p, qty: 4 }], { idemKey: key });
      errCode(c, r2, 422, 'IDEMPOTENCY_CONFLICT', 'conflicting replay');
      eq(await c.stockOf(p), 9, 'stock unchanged by conflict');
      const o = await c.order(r1.json.order_id, cust.key);
      c.expectStatus(o, 200, 'original order still readable');
      eq(o.json?.subtotal_minor, 45000, 'original order unchanged');
    },
  },
  {
    id: 'X14',
    name: 'idempotency keys are scoped per customer',
    fn: async (c) => {
      const p = await c.createProduct({ price: 7700, stock: 10 });
      const a = await c.createCustomer();
      const b = await c.createCustomer();
      const key = `shared-${randomUUID()}`;
      const ra = await c.checkout(a, [{ sku: p, qty: 1 }], { idemKey: key });
      c.expectStatus(ra, 201, 'customer A checkout');
      const rb = await c.checkout(b, [{ sku: p, qty: 2 }], { idemKey: key });
      c.expectStatus(rb, 201, 'customer B checkout with same key and different body');
      ok(!sameId(ra.json?.order_id, rb.json?.order_id), 'different customers get different orders');
      eq(await c.stockOf(p), 7, 'both reservations applied');
    },
  },
  {
    id: 'X15',
    name: 'concurrent checkouts never oversell stock',
    fn: async (c) => {
      const p = await c.createProduct({ price: 1300, stock: 5 });
      const custs = await Promise.all([c.createCustomer(), c.createCustomer(), c.createCustomer()]);
      const reqs = [];
      for (let i = 0; i < 14; i++) reqs.push(c.checkout(custs[i % 3], [{ sku: p, qty: 1 }]));
      const results = await Promise.all(reqs);
      const created = results.filter((r) => r.status === 201).length;
      const rejected = results.filter((r) => r.status === 409).length;
      eq(created, 5, 'number of successful checkouts');
      eq(rejected, 9, 'number of 409 OUT_OF_STOCK');
      eq(await c.stockOf(p), 0, 'final stock');
    },
  },
  {
    id: 'X16',
    name: 'orders are private: other customer gets 404, admin and owner get 200, unknown is 404',
    fn: async (c) => {
      const p = await c.createProduct({ price: 5600, stock: 5 });
      const owner = await c.createCustomer();
      const other = await c.createCustomer();
      const o = await c.checkoutOk(owner, [{ sku: p, qty: 1 }]);
      c.expectStatus(await c.order(o.order_id, other.key), 404, 'other customer reading order');
      c.expectStatus(await c.order(o.order_id, owner.key), 200, 'owner reading order');
      c.expectStatus(await c.order(o.order_id), 200, 'admin reading order');
      c.expectStatus(await c.order(missingIdLike(o.order_id)), 404, 'unknown order');
    },
  },
  {
    id: 'X17',
    name: 'webhook with wrong secret or tampered body is 401 INVALID_SIGNATURE and changes nothing',
    fn: async (c) => {
      const p = await c.createProduct({ price: 42000, stock: 5 });
      const cust = await c.createCustomer();
      const o = await c.checkoutOk(cust, [{ sku: p, qty: 1 }]);
      const ev = c.event('charge.succeeded', o.order_id, o.total);
      const r1 = await c.webhook(ev, { secret: c.webhookSecret + 'wrong' });
      errCode(c, r1, 401, 'INVALID_SIGNATURE', 'wrong secret');
      const goodRaw = JSON.stringify(ev);
      const headers = c.sign(goodRaw);
      const tampered = JSON.stringify({ ...ev, amount_minor: o.total + 1 });
      const r2 = await c.req('POST', '/webhooks/payments', { raw: tampered, headers });
      errCode(c, r2, 401, 'INVALID_SIGNATURE', 'tampered body');
      const r3 = await c.req('POST', '/webhooks/payments', { raw: goodRaw });
      errCode(c, r3, 401, 'INVALID_SIGNATURE', 'no signature headers');
      eq(await c.orderStatus(o.order_id), 'pending', 'order still pending');
      // The same event id, now correctly signed, still gets processed (the rejected ones did not count).
      await pay(c, o);
      eq(await c.orderStatus(o.order_id), 'paid', 'paid after valid webhook');
    },
  },
  {
    id: 'X18',
    name: 'webhook timestamps more than 300 s away are rejected',
    fn: async (c) => {
      const p = await c.createProduct({ price: 51000, stock: 5 });
      const cust = await c.createCustomer();
      const o = await c.checkoutOk(cust, [{ sku: p, qty: 1 }]);
      const now = Math.floor(Date.now() / 1000);
      const old = await c.webhook(c.event('charge.succeeded', o.order_id, o.total), { ts: now - 420 });
      errCode(c, old, 401, 'INVALID_SIGNATURE', 'old timestamp');
      const future = await c.webhook(c.event('charge.succeeded', o.order_id, o.total), { ts: now + 420 });
      errCode(c, future, 401, 'INVALID_SIGNATURE', 'future timestamp');
      eq(await c.orderStatus(o.order_id), 'pending', 'still pending');
      const recent = await c.webhook(c.event('charge.succeeded', o.order_id, o.total), { ts: now - 30 });
      c.expectStatus(recent, 200, 'slightly old timestamp within window');
      eq(await c.orderStatus(o.order_id), 'paid', 'paid');
    },
  },
  {
    id: 'X19',
    name: 'signature is verified over the raw body exactly as received',
    fn: async (c) => {
      const p = await c.createProduct({ price: 64000, stock: 5 });
      const cust = await c.createCustomer();
      const o = await c.checkoutOk(cust, [{ sku: p, qty: 1 }]);
      const ev = c.event('charge.succeeded', o.order_id, o.total);
      // Unusual but valid JSON formatting: re-serializing it would change the bytes.
      const raw = `{ "amount_minor" : ${JSON.stringify(ev.amount_minor)},\n  "order_id": ${JSON.stringify(ev.order_id)} , "type":"charge.succeeded",   "id": ${JSON.stringify(ev.id)} }`;
      const res = await c.req('POST', '/webhooks/payments', { raw, headers: c.sign(raw) });
      c.expectStatus(res, 200, 'webhook with non-canonical raw body');
      eq(await c.orderStatus(o.order_id), 'paid', 'paid');
    },
  },
  {
    id: 'X20',
    name: 'paid webhook writes one balanced ledger transaction; replay of the event changes nothing',
    fn: async (c) => {
      const p = await c.createProduct({ price: 4321000, stock: 8 });
      const cust = await c.createCustomer();
      const o = await c.checkoutOk(cust, [{ sku: p, qty: 4 }]); // 17,284,000
      eq(o.subtotal, 17284000, 'subtotal');
      eq(o.discount, 1728400, 'discount');
      eq(o.total, 15555600, 'total');
      const before = await c.ledger();
      const ev = c.event('charge.succeeded', o.order_id, o.total);
      c.expectStatus(await c.webhook(ev), 200, 'first delivery');
      const mid = await c.ledger();
      eq(mid.debits - before.debits, o.total + o.discount, 'debits delta');
      eq(mid.credits - before.credits, o.subtotal, 'credits delta');
      eq(mid.sales - before.sales, o.subtotal, 'sales delta');
      eq(mid.discounts - before.discounts, o.discount, 'discounts delta');
      eq(mid.debits, mid.credits, 'ledger balanced');
      c.expectStatus(await c.webhook(ev), 200, 'replayed delivery');
      const after = await c.ledger();
      eq(after.debits, mid.debits, 'replay adds no debits');
      eq(after.credits, mid.credits, 'replay adds no credits');
      eq(await c.orderStatus(o.order_id), 'paid', 'still paid');
    },
  },
  {
    id: 'X21',
    name: 'paid order without discount records no discount debit',
    fn: async (c) => {
      const p = await c.createProduct({ price: 345600, stock: 8 });
      const cust = await c.createCustomer();
      const o = await c.checkoutOk(cust, [{ sku: p, qty: 3 }]); // 1,036,800
      eq(o.discount, 0, 'no discount');
      const before = await c.ledger();
      await pay(c, o);
      const after = await c.ledger();
      eq(after.debits - before.debits, 1036800, 'debits delta');
      eq(after.credits - before.credits, 1036800, 'credits delta');
      eq(after.sales - before.sales, 1036800, 'sales delta');
      eq(after.discounts - before.discounts, 0, 'discounts delta');
    },
  },
  {
    id: 'X22',
    name: 'amount mismatch is 422 AMOUNT_MISMATCH and changes nothing',
    fn: async (c) => {
      const p = await c.createProduct({ price: 87500, stock: 5 });
      const cust = await c.createCustomer();
      const o = await c.checkoutOk(cust, [{ sku: p, qty: 2 }]);
      const before = await c.ledger();
      const res = await c.webhook(c.event('charge.succeeded', o.order_id, o.total - 1));
      errCode(c, res, 422, 'AMOUNT_MISMATCH', 'mismatched amount');
      eq(await c.orderStatus(o.order_id), 'pending', 'still pending');
      const after = await c.ledger();
      eq(after.debits, before.debits, 'no debits added');
      eq(after.credits, before.credits, 'no credits added');
      await pay(c, o);
      eq(await c.orderStatus(o.order_id), 'paid', 'paid with the correct amount');
    },
  },
  {
    id: 'X23',
    name: 'charge.failed marks order failed and returns stock; later events do not change it',
    fn: async (c) => {
      const p = await c.createProduct({ price: 23400, stock: 11 });
      const cust = await c.createCustomer();
      const o = await c.checkoutOk(cust, [{ sku: p, qty: 4 }]);
      eq(await c.stockOf(p), 7, 'stock reserved');
      const before = await c.ledger();
      const fRes = await c.webhook(c.event('charge.failed', o.order_id, o.total));
      c.expectStatus(fRes, 200, 'charge.failed');
      eq(await c.orderStatus(o.order_id), 'failed', 'order failed');
      eq(await c.stockOf(p), 11, 'stock returned');
      const late = await c.webhook(c.event('charge.succeeded', o.order_id, o.total));
      c.expectStatus(late, 200, 'success after failure');
      eq(await c.orderStatus(o.order_id), 'failed', 'still failed');
      const again = await c.webhook(c.event('charge.failed', o.order_id, o.total));
      c.expectStatus(again, 200, 'second failure with new event id');
      eq(await c.stockOf(p), 11, 'stock not returned twice');
      const after = await c.ledger();
      eq(after.debits, before.debits, 'no ledger debits for failed order');
      eq(after.credits, before.credits, 'no ledger credits for failed order');
    },
  },
  {
    id: 'X24',
    name: 'a second success event on a paid order is a no-op',
    fn: async (c) => {
      const p = await c.createProduct({ price: 39900, stock: 5 });
      const cust = await c.createCustomer();
      const o = await c.checkoutOk(cust, [{ sku: p, qty: 2 }]);
      await pay(c, o);
      const before = await c.ledger();
      const res = await c.webhook(c.event('charge.succeeded', o.order_id, o.total));
      c.expectStatus(res, 200, 'second success with new event id');
      const fail2 = await c.webhook(c.event('charge.failed', o.order_id, o.total));
      c.expectStatus(fail2, 200, 'failure on paid order');
      eq(await c.orderStatus(o.order_id), 'paid', 'still paid');
      eq(await c.stockOf(p), 3, 'stock not returned for paid order');
      const after = await c.ledger();
      eq(after.debits, before.debits, 'no extra debits');
      eq(after.credits, before.credits, 'no extra credits');
    },
  },
  {
    id: 'X25',
    name: 'webhook for an unknown order is 404',
    fn: async (c) => {
      const p = await c.createProduct({ price: 1900, stock: 3 });
      const cust = await c.createCustomer();
      const o = await c.checkoutOk(cust, [{ sku: p, qty: 1 }]);
      const res = await c.webhook(c.event('charge.succeeded', missingIdLike(o.order_id), 1900));
      c.expectStatus(res, 404, 'webhook unknown order');
    },
  },
  {
    id: 'X26',
    name: 'ledger summary is admin readable and balanced',
    fn: async (c) => {
      const l = await c.ledger();
      eq(l.debits, l.credits, 'total debits equal total credits');
      ok(l.sales <= l.credits, 'sales credits are part of credits');
      ok(l.discounts <= l.debits, 'discount debits are part of debits');
      const res = await c.req('GET', '/ledger/summary');
      c.expectStatus(res, 401, 'ledger without key');
    },
  },
];

// Ambiguities not tested:
// - Status for a valid customer key on an admin-only endpoint (POST /products, POST /customers, GET /ledger/summary): 401 vs 403 is not specified.
// - Validation order when several errors apply at once (e.g. missing Idempotency-Key together with an invalid cart, or invalid cart plus out of stock).
// - Whether an idempotent replay after the order was paid/failed returns the original "pending" response or the current status.
// - Whether "same body" for idempotency compares raw bytes or parsed JSON (key order, whitespace, item order).
// - Whether a rejected checkout (422/409) "consumes" an idempotency key, and how a retry with the same key and a different body behaves then.
// - The exact 300-second boundary (exactly 300 s vs 301 s) and how a non-numeric X-Timestamp is handled beyond being rejected.
// - Webhook body validation (unknown type, missing fields, malformed JSON) has no specified status.
// - Whether a replayed event id that previously failed with 404/422 counts as "already processed".
// - Validation of POST /products and POST /customers bodies (duplicate sku, negative price/stock, duplicate email) is unspecified.
// - Whether the PSP charge call is observable through the provided ctx (c.psp shape is not defined in lib.mjs), so charge creation and its single-charge-on-replay guarantee are not asserted.
// - Behavior when the PSP call fails during checkout (atomic rollback vs. error code) is not specified.
