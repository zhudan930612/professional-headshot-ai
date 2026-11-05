import { adapt } from '@/server/vercel';
import { onRequestGet } from '@/functions/api/creem/payment-status';

export default adapt(onRequestGet);
