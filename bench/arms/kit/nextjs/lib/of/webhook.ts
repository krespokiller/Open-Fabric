// SLOT: implement this function. Everything else in this service is installed, verified and read-only.
// Rule: task, endpoint "POST /webhooks/payments", processing steps 4 to 6.
// Called by the webhook handler after the signature was verified, the event was found to be new and the order was found.
// It receives the order's current status and total, and the event's type and amount_minor exactly as sent
// (the amount may be missing or not a number).
// Return what the handler must do:
//   'ignore'           answer 200 and change nothing
//   'amount_mismatch'  answer 422 AMOUNT_MISMATCH and change nothing
//   'mark_paid'        mark the order paid and book the ledger transaction
//   'mark_failed'      mark the order failed and give the reserved stock back
export type WebhookAction = 'ignore' | 'amount_mismatch' | 'mark_paid' | 'mark_failed';

export function decideWebhook(orderStatus: string, orderTotalMinor: number, eventType: string, eventAmountMinor: unknown): WebhookAction {
  throw new Error('slot decideWebhook is not implemented');
}
