# shop-api

Next.js (App Router) API with PostgreSQL through `pg`.

- Route handlers live in `app/**/route.ts`.
- `lib/db.ts` exports a shared `pg` pool built from `DATABASE_URL`.
- The Docker image runs the standalone server on port 8080.
