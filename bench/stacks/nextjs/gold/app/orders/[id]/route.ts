import { getOrder } from '@/lib/of/handlers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return getOrder(req, id);
}
