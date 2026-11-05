import { onRequestPost } from '../functions/api/save-generated-image';
import { adapt } from '../server/vercel';
export default adapt(onRequestPost);
