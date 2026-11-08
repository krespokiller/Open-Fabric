// Smoke checks. Every arm sees these results after each attempt.
import { ok, eq } from './lib.mjs';

export const tests = [
  {
    id: 'S1',
    name: 'GET /health returns 200',
    fn: async (c) => {
      const res = await c.req('GET', '/health');
      c.expectStatus(res, 200, 'GET /health');
    },
  },
  {
    id: 'S2',
    name: 'admin can create a product and read it back',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 1000, stock: 3 });
      eq(await c.stockOf(sku), 3, `stock of ${sku}`);
    },
  },
  {
    id: 'S3',
    name: 'admin can create a customer with an api_key',
    fn: async (c) => {
      const cust = await c.createCustomer();
      ok(cust.key, 'api_key');
    },
  },
  {
    id: 'S4',
    name: 'a customer can check out a valid cart',
    fn: async (c) => {
      const sku = await c.createProduct({ price: 1000, stock: 3 });
      const cust = await c.createCustomer();
      await c.checkoutOk(cust, [{ sku, qty: 1 }], 'POST /checkout');
    },
  },
];
