import { checkout } from '@/lib/of/handlers';

export const POST = (req: Request) => checkout(req);
