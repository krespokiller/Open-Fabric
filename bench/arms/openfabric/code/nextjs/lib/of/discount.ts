// SLOT: implement this function. It is the only business rule left open in the installed piece.
// Rule and examples: piece commerce.checkout, section 1.1 (new-customer discount).
// Must use integer arithmetic only. Called by lib/of/handlers.ts during checkout.
export function computeDiscount(subtotalMinor: number, isNewCustomer: boolean): number {
  throw new Error('slot computeDiscount is not implemented');
}
