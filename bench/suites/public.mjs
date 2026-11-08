// Public tests of the OpenFabric piece commerce.checkout (piece.md section 3).
// Only the OpenFabric arms see these results. Values differ from the hidden suite.
import { eq, sameId } from './lib.mjs';

export const tests = [
  {
    id: 'P1',
    name: 'new customer buying 2 x 6,000,000 gets 1,200,000 off',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 6000000, stock: 5 });
      const cust = await c.createCustomer();
      const o = await c.checkoutOk(cust, [{ sku, qty: 2 }]);
      eq(o.subtotal, 12000000, 'subtotal_minor');
      eq(o.discount, 1200000, 'discount_minor');
      eq(o.total, 10800000, 'total_minor');
    },
  },
  {
    id: 'P2',
    name: 'same key and body returns the same order without reserving stock twice',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 2500000, stock: 6 });
      const cust = await c.createCustomer();
      const key = `pub-${c.prefix}`;
      const items = [{ sku, qty: 2 }];
      const a = await c.checkout(cust, items, { idemKey: key });
      c.expectStatus(a, 201, 'first checkout');
      const b = await c.checkout(cust, items, { idemKey: key });
      c.expectStatus(b, 201, 'repeated checkout');
      eq(sameId(b.json?.order_id, a.json?.order_id), true, 'repeated checkout returns the same order_id');
      eq(await c.stockOf(sku), 4, 'stock after two identical requests');
    },
  },
  {
    id: 'P3',
    name: 'same key with a different body returns 422',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 2500000, stock: 6 });
      const cust = await c.createCustomer();
      const key = `pub-${c.prefix}`;
      c.expectStatus(await c.checkout(cust, [{ sku, qty: 1 }], { idemKey: key }), 201, 'first checkout');
      c.expectStatus(await c.checkout(cust, [{ sku, qty: 2 }], { idemKey: key }), 422, 'same key, different body');
    },
  },
  {
    id: 'P4',
    name: 'unknown sku returns 422 and changes no stock',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 1000, stock: 4 });
      const cust = await c.createCustomer();
      const res = await c.checkout(cust, [{ sku, qty: 1 }, { sku: `${c.prefix}-NOPE`, qty: 1 }]);
      c.expectStatus(res, 422, 'cart with unknown sku');
      eq(await c.stockOf(sku), 4, 'stock unchanged');
    },
  },
  {
    id: 'P5',
    name: 'more units than in stock returns 409 and changes no stock',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 1000, stock: 2 });
      const cust = await c.createCustomer();
      c.expectStatus(await c.checkout(cust, [{ sku, qty: 3 }]), 409, 'over-stock checkout');
      eq(await c.stockOf(sku), 2, 'stock unchanged');
    },
  },
  {
    id: 'P6',
    name: 'webhook with a wrong signature returns 401',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 1000, stock: 2 });
      const cust = await c.createCustomer();
      const o = await c.checkoutOk(cust, [{ sku, qty: 1 }]);
      const res = await c.webhook(c.event('charge.succeeded', o.order_id, o.total), { secret: 'not-the-secret' });
      c.expectStatus(res, 401, 'webhook signed with the wrong secret');
      eq(await c.orderStatus(o.order_id), 'pending', 'order status');
    },
  },
  {
    id: 'P7',
    name: 'valid charge.succeeded marks the order paid and keeps the ledger balanced',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 6000000, stock: 2 });
      const cust = await c.createCustomer();
      const o = await c.checkoutOk(cust, [{ sku, qty: 2 }]);
      c.expectStatus(await c.webhook(c.event('charge.succeeded', o.order_id, o.total)), 200, 'valid webhook');
      eq(await c.orderStatus(o.order_id), 'paid', 'order status');
      const l = await c.ledger();
      eq(l.debits, l.credits, 'ledger debits equal credits');
    },
  },
  {
    id: 'P8',
    name: 'valid charge.failed marks the order failed and gives the stock back',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 1000, stock: 5 });
      const cust = await c.createCustomer();
      const o = await c.checkoutOk(cust, [{ sku, qty: 3 }]);
      eq(await c.stockOf(sku), 2, 'stock after checkout');
      c.expectStatus(await c.webhook(c.event('charge.failed', o.order_id, o.total)), 200, 'failed webhook');
      eq(await c.orderStatus(o.order_id), 'failed', 'order status');
      eq(await c.stockOf(sku), 5, 'stock after failure');
    },
  },
];
