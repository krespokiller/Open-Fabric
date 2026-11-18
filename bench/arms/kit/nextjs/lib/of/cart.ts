// SLOT: implement this function. Everything else in this service is installed, verified and read-only.
// Rule: task, endpoint "POST /checkout", the sentence about invalid carts.
// Called by the checkout handler with the parsed JSON body of the request: any JSON value, or undefined when the body is not JSON.
// Return the cart lines in the order they were sent, or null when the cart is invalid.
// Whether each sku exists is checked afterwards against the database, not here.
export type CartLine = { sku: string; qty: number };

export function parseCart(body: unknown): CartLine[] | null {
  throw new Error('slot parseCart is not implemented');
}
