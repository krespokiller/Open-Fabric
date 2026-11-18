// SLOT: implement this function. Everything else in this service is installed, verified and read-only.
// Rule: task, endpoint "POST /webhooks/payments", the headers and processing step 1.
// Called by the webhook handler with the raw request body exactly as received, the values of the X-Timestamp and
// X-Signature headers ('' when a header is missing), the webhook secret and the current time in unix seconds.
// Return true only when the request is authentic and fresh. When it returns false the handler answers 401 INVALID_SIGNATURE.
export function verifyWebhook(rawBody: string, timestamp: string, signature: string, secret: string, nowSeconds: number): boolean {
  throw new Error('slot verifyWebhook is not implemented');
}
