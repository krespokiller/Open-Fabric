import { pool } from './db';

export class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

export const json = (body: unknown, status = 200) => Response.json(body, { status });
export const err = (status: number, code: string) => json({ error: code }, status);

export async function readJson(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

export type Caller = { role: 'admin' } | { role: 'customer'; id: number };

export async function authenticate(req: Request): Promise<Caller | null> {
  const header = req.headers.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;
  const key = match[1].trim();
  if (process.env.ADMIN_KEY && key === process.env.ADMIN_KEY) return { role: 'admin' };
  const { rows } = await pool.query('SELECT id FROM customers WHERE api_key = $1', [key]);
  return rows.length ? { role: 'customer', id: rows[0].id } : null;
}

// Wraps a handler: turns HttpError into a JSON error response and anything else into 500.
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return err(e.status, e.code);
      console.error(e);
      return err(500, 'INTERNAL');
    }
  };
}

export const isDigits = (v: unknown) => /^\d{1,18}$/.test(String(v));

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.keys(value as object)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}
