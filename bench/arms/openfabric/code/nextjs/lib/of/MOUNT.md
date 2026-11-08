# Installed piece: commerce.checkout v0.1 for Next.js (App Router)

The piece's verified code is installed in `lib/of/`. Do not rewrite or copy it. Two things are left to you:

1. **Implement the slot** `computeDiscount(subtotalMinor, isNewCustomer)` in `lib/of/discount.ts`.
2. **Mount the handlers as routes.** Each handler already does authentication, validation, the database work and the JSON response. It also creates the tables on first use.

## Handlers exported by `lib/of/handlers.ts`

| Export | Signature | Mount at |
| --- | --- | --- |
| `createProduct` | `(req: Request) => Promise<Response>` | `POST /products` |
| `getProduct` | `(req: Request, sku: string) => Promise<Response>` | `GET /products/{sku}` |
| `createCustomer` | `(req: Request) => Promise<Response>` | `POST /customers` |
| `checkout` | `(req: Request) => Promise<Response>` | `POST /checkout` |
| `getOrder` | `(req: Request, id: string) => Promise<Response>` | `GET /orders/{id}` |
| `paymentsWebhook` | `(req: Request) => Promise<Response>` | `POST /webhooks/payments` |
| `ledgerSummary` | `(req: Request) => Promise<Response>` | `GET /ledger/summary` |

`lib/of/db.ts` also exports `ready(): Promise<void>`, which creates the tables. Calling it at server start from `instrumentation.ts` is optional.

## Example mount (this stack)

`app/products/[sku]/route.ts`:

```ts
import { getProduct } from '@/lib/of/handlers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: { params: Promise<{ sku: string }> }) {
  const { sku } = await ctx.params;
  return getProduct(req, sku);
}
```

`app/checkout/route.ts`:

```ts
import { checkout } from '@/lib/of/handlers';

export const POST = (req: Request) => checkout(req);
```
