import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'dotenv';
import { creemTestApi } from './creem-test-api';

type Row=Record<string,unknown>;
const object=(v:unknown):Row=>v&&typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const list=(v:unknown):Row[]=>Array.isArray(v)?v.map(object):Array.isArray(object(v).items)?(object(v).items as unknown[]).map(object):Array.isArray(object(v).data)?(object(v).data as unknown[]).map(object):[];
const filename='.dev.vars.creem-test';
const initial=parse(await readFile(filename,'utf8'));
const key=initial.CREEM_API_KEY;
if(!key)throw new Error('Creem test API key is missing.');
const products:Row[]=[];
for(let page=1;;page++){
  const values=list(await creemTestApi(key,`/v1/products/search?page_number=${page}&page_size=50`));products.push(...values);
  if(values.length<50)break;
}
if(products.some(p=>p.mode!=='test'&&p.mode!=='sandbox'))throw new Error('The key returned a non-test product.');
const configured:Record<string,string>={CREEM_TEST_MODE:'true'};
for(const [plan,price,variable]of [['Professional',2500,'CREEM_PROFESSIONAL_PRODUCT_ID'],['Executive',4500,'CREEM_EXECUTIVE_PRODUCT_ID']] as const){
  let product=initial[variable]?object(await creemTestApi(key,'/v1/products/'+encodeURIComponent(initial[variable]))):products.find(p=>p.name===`Headshot QA ${plan}`);
  if(!product){product=object(await creemTestApi(key,'/v1/products',{method:'POST',idempotencyKey:`headshot-cloudflare-qa-${plan.toLowerCase()}-20261105`,body:{name:`Headshot QA ${plan}`,description:'Isolated Cloudflare checkout and refund acceptance testing.',price,currency:'USD',billing_type:'onetime',tax_mode:'exclusive',tax_category:'digital-goods-service',abandoned_cart_recovery_enabled:false}}));}
  if(typeof product.id!=='string'||!['test','sandbox'].includes(String(product.mode))||product.status!=='active'||product.price!==price||product.currency!=='USD'||product.billing_type!=='onetime')throw new Error('Test product configuration mismatch.');
  configured[variable]=product.id;
}
const url='https://professional-headshot-ai-qa.pages.dev/api/auth/creem/webhook';
const hooks:Row[]=[];
for(let page=1;;page++){
  const values=list(await creemTestApi(key,`/v1/webhooks?page_number=${page}&page_size=50`));hooks.push(...values);if(values.length<50)break;
}
const matches=hooks.filter(h=>h.url===url);
if(matches.length>1)throw new Error('Duplicate test webhook URLs must be reconciled before proceeding.');
const requiredEvents=['checkout.completed','refund.created'];
let hook=matches[0];
if(!hook)hook=object(await creemTestApi(key,'/v1/webhooks',{method:'POST',body:{url,name:'Headshot Cloudflare QA',delivery_mode:'http',events:requiredEvents}}));
const events=hook.events;
// Require explicit subscriptions; do not infer all-events coverage from an empty response.
if(typeof hook.id!=='string'||!['test','sandbox'].includes(String(hook.mode))||hook.status!=='enabled'||hook.delivery_mode!=='http'||hook.url!==url
  ||!Array.isArray(events)||!requiredEvents.every(event=>events.includes(event)))throw new Error('Test webhook configuration mismatch.');
const secret=object(await creemTestApi(key,`/v1/webhooks/${encodeURIComponent(hook.id)}/secret`));
if(typeof secret.secret!=='string'||secret.secret.length<16)throw new Error('Test webhook secret was not returned.');
configured.CREEM_WEBHOOK_SECRET=secret.secret;
const currentText=await readFile(filename,'utf8');const current=parse(currentText);
if(current.CREEM_API_KEY!==key)throw new Error('The local test key changed during setup; configuration was not overwritten.');
let next=currentText;
for(const [name,value]of Object.entries(configured)){
  const line=`${name}=${JSON.stringify(value)}`;
  const pattern=new RegExp(`^${name}=.*$`,'m');next=pattern.test(next)?next.replace(pattern,()=>line):next.trimEnd()+'\n'+line+'\n';
}
await writeFile(filename,next);
const report={configuredAt:new Date().toISOString(),mode:'test',professional:configured.CREEM_PROFESSIONAL_PRODUCT_ID,executive:configured.CREEM_EXECUTIVE_PRODUCT_ID,webhookId:hook.id,url,webhookSecretStored:true};
await writeFile('.migration/acceptance/creem-test-setup.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
