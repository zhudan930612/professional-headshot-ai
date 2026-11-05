import { config } from 'dotenv';
import { createHmac } from 'node:crypto';
config({path:'.env.local',quiet:true});
const secret=process.env.CREEM_WEBHOOK_SECRET;
if(!secret) throw new Error('Webhook secret is missing.');
const base='https://www.professionalheadshotai.ink';
let failures=0;
for(const path of ['/api/auth/creem/webhook','/api/creem/webhook']) {
  const payload=JSON.stringify({id:`migration_probe_${Date.now()}`,eventType:'migration.verification',object:{mode:'prod'}});
  const signature=createHmac('sha256',secret).update(payload).digest('hex');
  const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','creem-signature':signature},body:payload,signal:AbortSignal.timeout(20_000)});
  const data=await response.json();
  const ok=response.status===200&&data.received===true&&data.ignored===true;
  console.log(JSON.stringify({path,status:response.status,validSignatureAccepted:ok,noFinancialEvent:true}));
  if(!ok)failures++;
  const bad=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','creem-signature':'0'.repeat(64)},body:payload,signal:AbortSignal.timeout(20_000)});
  console.log(JSON.stringify({path,invalidSignatureRejected:bad.status===401}));
  if(bad.status!==401)failures++;
}
process.exitCode=failures?1:0;
