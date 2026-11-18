// SLOT: implement this function. Everything else in this service is installed, verified and read-only.
// Rule: task, paragraph "New-customer discount".
// Called by the checkout handler with the cart subtotal in integer minor units and whether the customer is new.
// Return the discount in integer minor units, 0 when no discount applies.
export function computeDiscount(subtotalMinor: number, isNewCustomer: boolean): number {
  throw new Error('slot computeDiscount is not implemented');
}
