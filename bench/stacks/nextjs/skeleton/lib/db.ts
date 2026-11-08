import { Pool } from 'pg';

// One shared connection pool for the whole app.
// DATABASE_URL looks like postgres://bench:bench@db:5432/bench
export const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
