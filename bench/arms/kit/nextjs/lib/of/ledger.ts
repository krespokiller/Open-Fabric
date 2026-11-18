// SLOT: implement this function. Everything else in this service is installed, verified and read-only.
// Rule: task, endpoint "POST /webhooks/payments", processing step 5 (the ledger transaction).
// Called by the webhook handler when an order is marked paid, with the order's subtotal, discount and total
// in integer minor units. The handler stores the entries you return as one transaction.
// Return the entries of that transaction.
export type LedgerEntry = { account: string; side: 'debit' | 'credit'; amount_minor: number };

export function ledgerEntries(subtotalMinor: number, discountMinor: number, totalMinor: number): LedgerEntry[] {
  throw new Error('slot ledgerEntries is not implemented');
}
