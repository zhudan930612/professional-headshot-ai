import { adapt } from '@/server/vercel';
import { onRequestPost } from '@/functions/api/creem/webhook';

export const config = { api: { bodyParser: false } };
export default adapt(onRequestPost);
