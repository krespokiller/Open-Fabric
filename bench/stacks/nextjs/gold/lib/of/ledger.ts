// Slot: ledger entries of the balanced transaction for a paid order (piece commerce.checkout).
export type LedgerEntry = { account: string; side: 'debit' | 'credit'; amount_minor: number };

export function ledgerEntries(subtotalMinor: number, discountMinor: number, totalMinor: number): LedgerEntry[] {
  const entries: LedgerEntry[] = [{ account: 'psp_receivable', side: 'debit', amount_minor: totalMinor }];
  if (discountMinor > 0) entries.push({ account: 'discounts_given', side: 'debit', amount_minor: discountMinor });
  entries.push({ account: 'sales', side: 'credit', amount_minor: subtotalMinor });
  return entries;
}
