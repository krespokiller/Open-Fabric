// Slot: decision for a verified payment event on an existing order (piece commerce.checkout).
export type WebhookAction = 'ignore' | 'amount_mismatch' | 'mark_paid' | 'mark_failed';

export function decideWebhook(
  orderStatus: string,
  orderTotalMinor: number,
  eventType: string,
  eventAmountMinor: unknown,
): WebhookAction {
  if (orderStatus !== 'pending') return 'ignore';
  if (eventType === 'charge.succeeded') {
    return eventAmountMinor !== orderTotalMinor ? 'amount_mismatch' : 'mark_paid';
  }
  return 'mark_failed';
}
