import { createProduct } from '@/lib/of/handlers';

export const POST = (req: Request) => createProduct(req);
