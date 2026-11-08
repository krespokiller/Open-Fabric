import { ledgerSummary } from '@/lib/of/handlers';

export const dynamic = 'force-dynamic';

export const GET = (req: Request) => ledgerSummary(req);
