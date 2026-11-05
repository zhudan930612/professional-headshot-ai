import { onRequestGet } from '../functions/api/proxy-image';
import { adapt } from '../server/vercel';
export default adapt(onRequestGet);
