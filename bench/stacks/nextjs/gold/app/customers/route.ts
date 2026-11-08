import { createCustomer } from '@/lib/of/handlers';

export const POST = (req: Request) => createCustomer(req);
