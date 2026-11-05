import { onRequestPost } from '@/functions/api/gemini';
import { adapt } from '@/server/vercel';
export default adapt(onRequestPost);
