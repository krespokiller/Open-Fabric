// Slot: payment webhook signature check (piece commerce.checkout).
import { createHmac, timingSafeEqual } from 'node:crypto';

export const WEBHOOK_TOLERANCE_SECONDS = 300;

export function verifyWebhook(
  rawBody: string,
  timestamp: string,
  signature: string,
  secret: string,
  nowSeconds: number,
): boolean {
  if (!/^\d+$/.test(timestamp)) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > WEBHOOK_TOLERANCE_SECONDS) return false;
  const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`);
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
