// Slot: new-customer discount (piece commerce.checkout, section 1.1).
export const DISCOUNT_THRESHOLD_MINOR = 10_000_000;
export const DISCOUNT_CAP_MINOR = 3_000_000;

export function computeDiscount(subtotalMinor: number, isNewCustomer: boolean): number {
  if (!isNewCustomer || subtotalMinor < DISCOUNT_THRESHOLD_MINOR) return 0;
  let q = Math.floor(subtotalMinor / 10);
  const r = subtotalMinor % 10;
  if (r > 5 || (r === 5 && q % 2 === 1)) q += 1;
  return Math.min(q, DISCOUNT_CAP_MINOR);
}
