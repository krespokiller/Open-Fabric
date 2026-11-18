// Slot: checkout cart shape validation (piece commerce.checkout).
export type CartLine = { sku: string; qty: number };

export function parseCart(body: unknown): CartLine[] | null {
  const items = (body as any)?.items;
  if (!Array.isArray(items) || items.length === 0) return null;
  const seen = new Set<string>();
  const lines: CartLine[] = [];
  for (const it of items) {
    if (!it || typeof it.sku !== 'string' || !Number.isInteger(it.qty) || it.qty < 1) return null;
    if (seen.has(it.sku)) return null;
    seen.add(it.sku);
    lines.push({ sku: it.sku, qty: it.qty });
  }
  return lines;
}
