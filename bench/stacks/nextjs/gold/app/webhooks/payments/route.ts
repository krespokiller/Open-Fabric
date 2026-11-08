import { paymentsWebhook } from '@/lib/of/handlers';

export const POST = (req: Request) => paymentsWebhook(req);
