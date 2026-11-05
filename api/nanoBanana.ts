import { onRequestPost } from '@/functions/api/nanoBanana';
import { adapt } from '@/server/vercel';
export default adapt(onRequestPost);
