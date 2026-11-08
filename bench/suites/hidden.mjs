// HIDDEN SUITE. Never shown to any model, never used as feedback.
// It is the single judge for every arm and every stack. Its SHA-256 is printed in every report.
// Values intentionally differ from task.md, piece.md and the public suite.
import { eq, ok, sameId, intField } from './lib.mjs';

const NEW_PRICE = 4200000; // 3 x 4,200,000 = 12,600,000 -> 1,260,000 off

export const tests = [
  {
    id: 'H01',
    name: 'missing or unknown API key returns 401',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 1000, stock: 5 });
      const body = { items: [{ sku, qty: 1 }] };
      const noAuth = await c.req('POST', '/checkout', { body, headers: { 'Idempotency-Key': 'h01-a' } });
      c.expectStatus(noAuth, 401, 'checkout without Authorization');
      const bogus = await c.req('POST', '/checkout', { key: 'not-a-real-key', body, headers: { 'Idempotency-Key': 'h01-b' } });
      c.expectStatus(bogus, 401, 'checkout with an unknown key');
      eq(await c.stockOf(sku), 5, 'stock unchanged');
    },
  },
  {
    id: 'H02',
    name: 'new customer above the threshold gets 10% and the provider is charged the total',
    fn: async (c) => {
      const sku = await c.createProduct({ price: NEW_PRICE, stock: 10 });
      const cust = await c.createCustomer();
      const o = await c.checkoutOk(cust, [{ sku, qty: 3 }]);
      eq(o.subtotal, 12600000, 'subtotal_minor');
      eq(o.discount, 1260000, 'discount_minor');
      eq(o.total, 11340000, 'total_minor');
      eq(await c.stockOf(sku), 7, 'stock after checkout');
      const charges = await c.psp.chargesFor(o.order_id);
      eq(charges.length, 1, 'number of charges created at the payment provider for the order');
      eq(charges[0].amount_minor, 11340000, 'amount charged');
    },
  },
  {
    id: 'H03',
    name: 'new customer one cent below the threshold gets no discount',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 3333333, stock: 10 });
      const cust = await c.createCustomer();
      const o = await c.checkoutOk(cust, [{ sku, qty: 3 }]);
      eq(o.subtotal, 9999999, 'subtotal_minor');
      eq(o.discount, 0, 'discount_minor');
      eq(o.total, 9999999, 'total_minor');
    },
  },
  {
    id: 'H04',
    name: 'new customer exactly at the threshold gets the discount',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 10000000, stock: 10 });
      const cust = await c.createCustomer();
      const o = await c.checkoutOk(cust, [{ sku, qty: 1 }]);
      eq(o.discount, 1000000, 'discount_minor');
      eq(o.total, 9000000, 'total_minor');
    },
  },
  {
    id: 'H05',
    name: 'discount is capped at 3,000,000 across several lines',
    fn: async (c) => {
      const a = await c.createProduct({ price: 7000000, stock: 10 });
      const b = await c.createProduct({ price: 1500000, stock: 10 });
      const cust = await c.createCustomer();
      const o = await c.checkoutOk(cust, [{ sku: a, qty: 4 }, { sku: b, qty: 2 }]);
      eq(o.subtotal, 31000000, 'subtotal_minor');
      eq(o.discount, 3000000, 'discount_minor');
      eq(o.total, 28000000, 'total_minor');
    },
  },
  {
    id: 'H06',
    name: 'cap still applies to a very large cart',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 250000000, stock: 10 });
      const cust = await c.createCustomer();
      const o = await c.checkoutOk(cust, [{ sku, qty: 4 }]);
      eq(o.subtotal, 1000000000, 'subtotal_minor');
      eq(o.discount, 3000000, 'discount_minor');
      eq(o.total, 997000000, 'total_minor');
    },
  },
  {
    id: 'H07',
    name: 'half-to-even rounding of the discount',
    fn: async (c) => {
      const even = await c.createProduct({ price: 10000005, stock: 5 });
      const odd = await c.createProduct({ price: 10000015, stock: 5 });
      const o1 = await c.checkoutOk(await c.createCustomer(), [{ sku: even, qty: 1 }], 'checkout of 10,000,005');
      eq(o1.discount, 1000000, 'discount for subtotal 10,000,005 (1,000,000.5 rounds to even)');
      const o2 = await c.checkoutOk(await c.createCustomer(), [{ sku: odd, qty: 1 }], 'checkout of 10,000,015');
      eq(o2.discount, 1000002, 'discount for subtotal 10,000,015 (1,000,001.5 rounds to even)');
    },
  },
  {
    id: 'H08',
    name: 'customer with a paid order is no longer new',
    fn: async (c) => {
      const sku = await c.createProduct({ price: NEW_PRICE, stock: 10 });
      const cust = await c.createCustomer();
      const first = await c.checkoutOk(cust, [{ sku, qty: 3 }], 'first checkout');
      eq(first.discount, 1260000, 'first checkout discount');
      const pending = await c.checkoutOk(cust, [{ sku, qty: 3 }], 'second checkout while the first is pending');
      eq(pending.discount, 1260000, 'a pending order does not count as paid');
      c.expectStatus(await c.webhook(c.event('charge.succeeded', first.order_id, first.total)), 200, 'payment webhook');
      const third = await c.checkoutOk(cust, [{ sku, qty: 3 }], 'checkout after a paid order');
      eq(third.discount, 0, 'discount after a paid order');
      eq(third.total, 12600000, 'total after a paid order');
    },
  },
  {
    id: 'H09',
    name: 'retry with the same key and body: same response, one order, one reservation, one charge',
    fn: async (c) => {
      const sku = await c.createProduct({ price: NEW_PRICE, stock: 9 });
      const cust = await c.createCustomer();
      const items = [{ sku, qty: 3 }];
      const key = `h09-${c.prefix}`;
      const a = await c.checkout(cust, items, { idemKey: key });
      c.expectStatus(a, 201, 'first request');
      const b = await c.checkout(cust, items, { idemKey: key });
      c.expectStatus(b, 201, 'second request');
      const r3 = await c.checkout(cust, items, { idemKey: key });
      c.expectStatus(r3, 201, 'third request');
      ok(sameId(a.json?.order_id, b.json?.order_id) && sameId(a.json?.order_id, r3.json?.order_id), 'all retries return the same order_id');
      eq(intField(b.json, 'total_minor', 'retry'), intField(a.json, 'total_minor', 'first'), 'retry total_minor');
      eq(await c.stockOf(sku), 6, 'stock reserved only once');
      eq((await c.psp.chargesFor(a.json.order_id)).length, 1, 'distinct charges created at the payment provider for the order (a retry must not create a new charge)');
    },
  },
  {
    id: 'H10',
    name: 'same key with a different body returns 422 and changes nothing',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 1000, stock: 9 });
      const cust = await c.createCustomer();
      const key = `h10-${c.prefix}`;
      c.expectStatus(await c.checkout(cust, [{ sku, qty: 2 }], { idemKey: key }), 201, 'first request');
      c.expectStatus(await c.checkout(cust, [{ sku, qty: 5 }], { idemKey: key }), 422, 'same key, different body');
      eq(await c.stockOf(sku), 7, 'stock after the conflicting request');
    },
  },
  {
    id: 'H11',
    name: 'idempotency keys are scoped to the customer',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 1000, stock: 9 });
      const ana = await c.createCustomer();
      const ben = await c.createCustomer();
      const key = `h11-${c.prefix}`;
      const a = await c.checkout(ana, [{ sku, qty: 1 }], { idemKey: key });
      c.expectStatus(a, 201, 'first customer');
      const b = await c.checkout(ben, [{ sku, qty: 1 }], { idemKey: key });
      c.expectStatus(b, 201, 'second customer, same key');
      ok(!sameId(a.json?.order_id, b.json?.order_id), 'different customers get different orders');
      eq(await c.stockOf(sku), 7, 'both reservations applied');
    },
  },
  {
    id: 'H12',
    name: 'missing Idempotency-Key returns 400',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 1000, stock: 4 });
      const cust = await c.createCustomer();
      c.expectStatus(await c.checkout(cust, [{ sku, qty: 1 }], { withKey: false }), 400, 'checkout without Idempotency-Key');
      eq(await c.stockOf(sku), 4, 'stock unchanged');
    },
  },
  {
    id: 'H13',
    name: 'invalid carts return 422 and change nothing',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 1000, stock: 4 });
      const cust = await c.createCustomer();
      const cases = [
        ['empty items', []],
        ['quantity zero', [{ sku, qty: 0 }]],
        ['negative quantity', [{ sku, qty: -2 }]],
        ['fractional quantity', [{ sku, qty: 1.5 }]],
        ['duplicate sku', [{ sku, qty: 1 }, { sku, qty: 1 }]],
        ['unknown sku next to a valid one', [{ sku, qty: 1 }, { sku: `${c.prefix}-MISSING`, qty: 1 }]],
      ];
      for (const [label, items] of cases) {
        c.expectStatus(await c.checkout(cust, items), 422, `cart with ${label}`);
      }
      eq(await c.stockOf(sku), 4, 'stock unchanged after invalid carts');
    },
  },
  {
    id: 'H14',
    name: 'out of stock on one line rejects the whole cart',
    fn: async (c) => {
      const plenty = await c.createProduct({ price: 1000, stock: 10 });
      const scarce = await c.createProduct({ price: 1000, stock: 2 });
      const cust = await c.createCustomer();
      c.expectStatus(await c.checkout(cust, [{ sku: plenty, qty: 3 }, { sku: scarce, qty: 3 }]), 409, 'checkout over stock');
      eq(await c.stockOf(plenty), 10, 'first line stock unchanged');
      eq(await c.stockOf(scarce), 2, 'second line stock unchanged');
    },
  },
  {
    id: 'H15',
    name: 'eight concurrent buyers for the last unit: exactly one wins',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 1000, stock: 1 });
      const buyers = [];
      for (let i = 0; i < 8; i++) buyers.push(await c.createCustomer());
      const results = await Promise.all(buyers.map((b) => c.checkout(b, [{ sku, qty: 1 }])));
      const statuses = results.map((r) => r.status).sort();
      const wins = statuses.filter((s) => s === 201).length;
      const outOfStock = statuses.filter((s) => s === 409).length;
      eq(wins, 1, `successful checkouts (statuses: ${statuses.join(',')})`);
      eq(outOfStock, 7, `409 responses (statuses: ${statuses.join(',')})`);
      eq(await c.stockOf(sku), 0, 'final stock');
    },
  },
  {
    id: 'H16',
    name: 'bad signature or stale timestamp returns 401 and changes nothing',
    fn: async (c) => {
      const sku = await c.createProduct({ price: NEW_PRICE, stock: 5 });
      const o = await c.checkoutOk(await c.createCustomer(), [{ sku, qty: 3 }]);
      const ev = c.event('charge.succeeded', o.order_id, o.total);
      c.expectStatus(await c.webhook(ev, { secret: 'wrong-secret' }), 401, 'webhook with the wrong secret');
      const raw = JSON.stringify(ev);
      const tampered = c.sign(raw);
      c.expectStatus(await c.req('POST', '/webhooks/payments', { raw: raw.replace(`"${ev.id}"`, `"${ev.id}x"`), headers: tampered }), 401, 'webhook whose body was altered after signing');
      c.expectStatus(await c.webhook(ev, { ts: Math.floor(Date.now() / 1000) - 1000 }), 401, 'webhook signed 1000 seconds ago');
      eq(await c.orderStatus(o.order_id), 'pending', 'order status');
    },
  },
  {
    id: 'H17',
    name: 'charge.succeeded marks paid and books a balanced ledger transaction',
    fn: async (c) => {
      const sku = await c.createProduct({ price: NEW_PRICE, stock: 5 });
      const o = await c.checkoutOk(await c.createCustomer(), [{ sku, qty: 3 }]);
      const before = await c.ledger();
      c.expectStatus(await c.webhook(c.event('charge.succeeded', o.order_id, o.total)), 200, 'payment webhook');
      eq(await c.orderStatus(o.order_id), 'paid', 'order status');
      const after = await c.ledger();
      eq(after.debits - before.debits, 12600000, 'new debits (total + discount)');
      eq(after.credits - before.credits, 12600000, 'new credits (subtotal)');
      eq(after.sales - before.sales, 12600000, 'new sales');
      eq(after.discounts - before.discounts, 1260000, 'new discounts');
      eq(after.debits, after.credits, 'whole ledger balanced');
    },
  },
  {
    id: 'H18',
    name: 'a repeated webhook event changes nothing the second time',
    fn: async (c) => {
      const sku = await c.createProduct({ price: NEW_PRICE, stock: 5 });
      const o = await c.checkoutOk(await c.createCustomer(), [{ sku, qty: 3 }]);
      const ev = c.event('charge.succeeded', o.order_id, o.total);
      c.expectStatus(await c.webhook(ev), 200, 'first delivery');
      const mid = await c.ledger();
      c.expectStatus(await c.webhook(ev), 200, 'second delivery of the same event');
      const after = await c.ledger();
      eq(after.debits, mid.debits, 'debits after duplicate');
      eq(after.credits, mid.credits, 'credits after duplicate');
      eq(await c.orderStatus(o.order_id), 'paid', 'order status');
    },
  },
  {
    id: 'H19',
    name: 'charge.failed marks the order failed and releases stock',
    fn: async (c) => {
      const a = await c.createProduct({ price: 1000, stock: 6 });
      const b = await c.createProduct({ price: 2000, stock: 6 });
      const o = await c.checkoutOk(await c.createCustomer(), [{ sku: a, qty: 4 }, { sku: b, qty: 1 }]);
      eq(await c.stockOf(a), 2, 'stock a after checkout');
      const before = await c.ledger();
      c.expectStatus(await c.webhook(c.event('charge.failed', o.order_id, o.total)), 200, 'failure webhook');
      eq(await c.orderStatus(o.order_id), 'failed', 'order status');
      eq(await c.stockOf(a), 6, 'stock a released');
      eq(await c.stockOf(b), 6, 'stock b released');
      const after = await c.ledger();
      eq(after.debits, before.debits, 'no ledger entries for a failed charge');
      c.expectStatus(await c.webhook(c.event('charge.succeeded', o.order_id, o.total)), 200, 'late success for a failed order');
      eq(await c.orderStatus(o.order_id), 'failed', 'late event does not change a failed order');
    },
  },
  {
    id: 'H20',
    name: 'amount mismatch returns 422 and changes nothing',
    fn: async (c) => {
      const sku = await c.createProduct({ price: NEW_PRICE, stock: 5 });
      const o = await c.checkoutOk(await c.createCustomer(), [{ sku, qty: 3 }]);
      const before = await c.ledger();
      c.expectStatus(await c.webhook(c.event('charge.succeeded', o.order_id, o.total - 1)), 422, 'webhook with a different amount');
      eq(await c.orderStatus(o.order_id), 'pending', 'order status');
      const after = await c.ledger();
      eq(after.debits, before.debits, 'ledger unchanged');
    },
  },
  {
    id: 'H21',
    name: 'customers only see their own orders',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 1000, stock: 5 });
      const owner = await c.createCustomer();
      const other = await c.createCustomer();
      const o = await c.checkoutOk(owner, [{ sku, qty: 1 }]);
      const mine = await c.order(o.order_id, owner.key);
      c.expectStatus(mine, 200, 'owner reads the order');
      eq(intField(mine.json, 'total_minor', 'GET /orders/{id}'), o.total, 'total_minor');
      c.expectStatus(await c.order(o.order_id, other.key), 404, 'another customer reads the order');
      c.expectStatus(await c.order(o.order_id, null), 401, 'anonymous read');
      c.expectStatus(await c.order(o.order_id), 200, 'admin reads the order');
    },
  },
];
