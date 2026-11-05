import { adapt } from '@/server/vercel';
import { onRequestPost } from '@/functions/api/creem/create-payment';

export default adapt(onRequestPost);
