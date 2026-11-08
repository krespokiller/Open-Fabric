import { getProduct } from '@/lib/of/handlers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: { params: Promise<{ sku: string }> }) {
  const { sku } = await ctx.params;
  return getProduct(req, sku);
}
