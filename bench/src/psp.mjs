// Mock payment service provider (PSP). The app under test calls POST /charges.
// Like real providers, a repeated Idempotency-Key returns the original charge.
// The harness reads its state through /_charges, /_stats and /_reset, so the same code runs
// in-process (native runtime) or as a container next to the app (docker runtime).
import http from 'node:http';
import { randomUUID } from 'node:crypto';

export function createPspServer() {
  const byKey = new Map();
  const charges = [];
  const requestsByOrder = new Map();
  let requests = 0;

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', () => {
      const send = (status, obj) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(obj));
      };
      const url = new URL(req.url, 'http://psp');
      const route = url.pathname.replace(/\/+$/, '');
      if (req.method === 'POST' && route === '/charges') {
        requests++;
        let parsed;
        try { parsed = JSON.parse(body); } catch { return send(400, { error: 'INVALID_JSON' }); }
        const orderKey = String(parsed?.order_id);
        requestsByOrder.set(orderKey, (requestsByOrder.get(orderKey) || 0) + 1);
        const key = req.headers['idempotency-key'];
        if (key && byKey.has(key)) return send(200, byKey.get(key).response);
        const charge = {
          charge_id: `ch_${randomUUID()}`,
          order_id: parsed?.order_id,
          amount_minor: parsed?.amount_minor,
          idempotency_key: key ?? null,
        };
        charges.push(charge);
        const response = { charge_id: charge.charge_id, status: 'pending' };
        if (key) byKey.set(key, { charge, response });
        return send(200, response);
      }
      if (req.method === 'GET' && route === '/_charges') {
        const orderId = url.searchParams.get('order_id');
        return send(200, {
          charges: charges.filter((c) => String(c.order_id) === orderId),
          requests: requestsByOrder.get(orderId) || 0,
        });
      }
      if (req.method === 'GET' && route === '/_stats') return send(200, { requests, charges: charges.length, now: Math.floor(Date.now() / 1000) });
      if (req.method === 'POST' && route === '/_reset') {
        byKey.clear();
        charges.length = 0;
        requestsByOrder.clear();
        requests = 0;
        return send(200, { ok: true });
      }
      if (req.method === 'GET' && route === '/health') return send(200, { ok: true });
      send(404, { error: 'NOT_FOUND' });
    });
  });
  return server;
}

// HTTP client the judge uses, wherever the PSP runs.
export function pspClient(baseUrl) {
  const get = async (p) => (await fetch(baseUrl + p, { signal: AbortSignal.timeout(10000) })).json();
  return {
    baseUrl,
    chargesFor: async (orderId) => (await get(`/_charges?order_id=${encodeURIComponent(String(orderId))}`)).charges,
    requestsFor: async (orderId) => (await get(`/_charges?order_id=${encodeURIComponent(String(orderId))}`)).requests,
    stats: async () => get('/_stats'),
    reset: async () => { await fetch(baseUrl + '/_reset', { method: 'POST', signal: AbortSignal.timeout(10000) }); },
  };
}

// In-process PSP for the native runtime.
export async function startPsp({ port = 0, host = '127.0.0.1' } = {}) {
  const server = createPspServer();
  await new Promise((resolve) => server.listen(port, host, resolve));
  const actualPort = server.address().port;
  return {
    port: actualPort,
    client: pspClient(`http://127.0.0.1:${actualPort}`),
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
