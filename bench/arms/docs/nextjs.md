## Next.js 16 App Router: Route Handlers

Route Handlers let you build HTTP endpoints with the Web `Request` and `Response` APIs. Create a `route.ts` file inside the `app` directory; the folder path is the URL path.

```ts
// app/items/route.ts  ->  POST /items
export async function POST(request: Request) {
  const body = await request.json();
  return Response.json({ received: body }, { status: 201 });
}
```

Supported exports: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`. An unsupported method returns `405`.

**Dynamic segments.** A folder named `[slug]` captures that path segment. In Next.js 15 and later, `params` is a Promise and must be awaited:

```ts
// app/items/[id]/route.ts  ->  GET /items/123
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return Response.json({ id });
}
```

**Caching.** In Next.js 15 and later, `GET` handlers are not cached by default. To force dynamic rendering explicitly: `export const dynamic = 'force-dynamic';`.

**Headers.** `request.headers.get('x-name')` returns the header value or `null`. Header names are case-insensitive.

**Body.** `await request.json()` parses JSON and throws on invalid JSON. `await request.text()` returns the raw body as a string, exactly as sent. The body can be read only once: read it as text first if you need both the raw text and the parsed value, then `JSON.parse(text)`.

**Responses.** `Response.json(data, { status, headers })` serializes `data` with `JSON.stringify`. `new Response(text, { status, headers })` returns a raw body.

**Runtime.** Route handlers run in the Node.js runtime by default, so Node APIs such as `node:crypto` are available.

**instrumentation.ts.** A file `instrumentation.ts` at the project root may export `register()`, which runs once when a new server instance starts. Code that only works in Node.js should be guarded:

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { setup } = await import('./lib/setup');
    await setup();
  }
}
```

**Path alias.** The project's `tsconfig.json` maps `@/*` to the project root, so `import { pool } from '@/lib/db'` works anywhere.

## node-postgres (`pg`) 8

```ts
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const { rows, rowCount } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
```

Parameters use `$1`, `$2`, ... placeholders. `rowCount` is the number of rows returned or affected (for `UPDATE`, the number of updated rows). Passing an array parameter works with `= ANY($1)` or `= ANY($1::text[])`.

```ts
const r = await client.query('UPDATE items SET stock = stock - $1 WHERE sku = $2 AND stock >= $1', [qty, sku]);
if (r.rowCount === 0) { /* no row matched the condition */ }
```

**Transactions must use a single client.** `pool.query` may run each statement on a different connection, so `BEGIN`/`COMMIT` through `pool.query` does not create a transaction. Check out a client:

```ts
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ... client.query(...) ...
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

**Type parsing.** By default `pg` returns PostgreSQL `BIGINT` (int8, OID 20) and `NUMERIC` values as JavaScript **strings**, because they can exceed `Number.MAX_SAFE_INTEGER`. `COUNT(*)` and `SUM(bigint)` are int8/numeric too. To get numbers, cast in SQL (`::int`) or register a parser:

```ts
import { types } from 'pg';
types.setTypeParser(20, (value) => parseInt(value, 10));
```

`INTEGER` (int4) values are returned as numbers.

## Node.js 22 built-ins

**HMAC.**

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';
const hex = createHmac('sha256', secret).update(message).digest('hex');
```

`timingSafeEqual(a, b)` compares two `Buffer`s in constant time and throws if their lengths differ, so compare lengths first.

**Random secrets.** `randomBytes(24).toString('hex')` from `node:crypto`; `crypto.randomUUID()` for UUIDs.

**fetch.** The global `fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })` returns a `Response`; `res.ok` is true for 2xx; `await res.json()` parses the body.

**Numbers.** JavaScript numbers are IEEE-754 doubles: integers are exact up to 2^53 - 1. `Math.round(x)` rounds .5 up (toward +Infinity); there is no built-in half-to-even rounding. `Math.floor(a / b)` and `a % b` give integer division and remainder for non-negative integers. `Number.isInteger(v)` is false for `1.5`, `'1'` and `NaN`.
