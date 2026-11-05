import { readFile, writeFile } from 'node:fs/promises';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { parse } from 'dotenv';
import { cf } from './api';
import { creemTestApi } from './creem-test-api';

const databaseId='ec703699-4599-4107-bffc-168067ff2753';
const project='professional-headshot-ai-qa';
const origin=`https://${project}.pages.dev`;
const stateFile='.migration/acceptance/payment-test-state.json';
interface Order {startedAt:string;paymentId?:string;checkoutId?:string;paymentUrl?:string;status?:string;transactionId?:string;refundAttempted?:boolean}
interface State {userId:string;token:string;createdAt:string;orders:Record<string,Order>}
const config=parse(await readFile('.dev.vars.creem-test','utf8'));
if(!config.CREEM_API_KEY?.startsWith('creem_test_'))throw new Error('Test credentials are required.');
const response=await cf(`/pages/projects/${project}`);
const resource=await response.json() as {result?:{deployment_configs?:{production?:{d1_databases?:{DB?:{id?:string}};env_vars?:Record<string,{value?:string}>}}}};
const deployment=resource.result?.deployment_configs?.production;
if(!response.ok||deployment?.d1_databases?.DB?.id!==databaseId||deployment.env_vars?.CREEM_TEST_MODE?.value!=='true')throw new Error('Isolated test bindings were not verified.');
async function sql(statement:string,params:unknown[]=[]) {
  const r=await cf(`/d1/database/${databaseId}/query`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql:statement,params})});
  const data=await r.json() as {success:boolean;result:{results:Record<string,unknown>[]}[]};
  if(!r.ok||!data.success)throw new Error('QA database request failed.');
  return data.result[0].results;
}
let state:State;
try{state=JSON.parse(await readFile(stateFile,'utf8'));}
catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;state={userId:randomUUID(),token:randomBytes(32).toString('hex'),createdAt:new Date().toISOString(),orders:{}};await writeFile(stateFile,JSON.stringify(state,null,2));}
const save=()=>writeFile(stateFile,JSON.stringify(state,null,2));
async function site(route:string,body?:unknown) {
  const r=await fetch(origin+route,{method:body===undefined?'GET':'POST',headers:{Origin:origin,Cookie:`__Host-headshot_session=${state.token}`,'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(40_000)});
  const data=await r.json();if(!r.ok)throw new Error(`QA API ${route.split('?')[0]} returned ${r.status}.`);return data;
}
const action=process.argv[2];
const plan=process.argv[3]||'professional';
if(!['professional','executive'].includes(plan))throw new Error('Invalid plan.');
if(action==='init') {
  await sql('INSERT INTO users(id,email,name,created_at,updated_at) VALUES (?,NULL,?,?,?) ON CONFLICT(id) DO NOTHING',[state.userId,'Sandbox payment acceptance',state.createdAt,state.createdAt]);
  const user=(await sql('SELECT name FROM users WHERE id=?',[state.userId]))[0];
  if(user?.name!=='Sandbox payment acceptance')throw new Error('Unexpected QA account.');
  await sql('INSERT INTO auth_sessions(token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?) ON CONFLICT(token_hash) DO UPDATE SET expires_at=excluded.expires_at',[createHash('sha256').update(state.token).digest('hex'),state.userId,Date.now()+7200_000,Date.now()]);
  console.log(JSON.stringify({action,isolatedDatabase:true,quota:(await site('/api/account')).quota}));
} else if(action==='create') {
  if(state.orders[plan])throw new Error('A checkout attempt already exists; inspect it before creating another.');
  state.orders[plan]={startedAt:new Date().toISOString()};await save();
  const result=await site('/api/creem/create-payment',{planType:plan});
  const checkout=await creemTestApi(config.CREEM_API_KEY,'/v1/checkouts?checkout_id='+encodeURIComponent(result.checkoutId)) as Record<string,unknown>;
  if(!['test','sandbox'].includes(String(checkout.mode)))throw new Error('Checkout is not in test mode.');
  state.orders[plan]={...state.orders[plan],paymentId:result.paymentId,checkoutId:result.checkoutId,paymentUrl:result.paymentUrl,status:String(checkout.status)};await save();
  console.log(JSON.stringify({action,plan,mode:checkout.mode,status:checkout.status,checkoutId:result.checkoutId,paymentUrl:result.paymentUrl,realCharge:false}));
} else if(action==='inspect') {
  const order=state.orders[plan];if(!order?.paymentId||!order.checkoutId)throw new Error('No complete checkout record.');
  const provider=await creemTestApi(config.CREEM_API_KEY,'/v1/checkouts?checkout_id='+encodeURIComponent(order.checkoutId)) as Record<string,unknown>;
  const remoteOrder=(provider.order||{}) as Record<string,unknown>;
  const transaction=typeof remoteOrder.transaction==='string'?remoteOrder.transaction:(remoteOrder.transaction as {id?:string}|undefined)?.id;
  if(transaction)order.transactionId=transaction;
  const transactionState=order.transactionId?await creemTestApi(config.CREEM_API_KEY,'/v1/transactions?transaction_id='+encodeURIComponent(order.transactionId)) as Record<string,unknown>:null;
  const status=await site('/api/creem/payment-status?orderId='+encodeURIComponent(order.paymentId));
  order.status=status.status;await save();
  const ledger=(await sql('SELECT status,paid_amount_minor,refunded_amount_minor,granted_quota,granted_bonus_quota,discount_amount_minor,tax_amount_minor FROM payment_transactions WHERE id=? AND user_id=?',[order.paymentId,state.userId]))[0];
  const events=await sql('SELECT event_id,event_type,resource_id FROM payment_events WHERE payment_id=? ORDER BY created_at',[order.paymentId]);
  const report={checkedAt:new Date().toISOString(),plan,mode:provider.mode,providerStatus:provider.status,providerOrderStatus:remoteOrder.status,providerTransactionStatus:transactionState?.status,paidMinor:remoteOrder.amount_paid,siteStatus:status.status,ledger,events,quota:(await site('/api/account')).quota};
  await writeFile(`.migration/acceptance/payment-test-${plan}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
} else if(action==='refund') {
  const order=state.orders[plan];if(!order?.transactionId||order.status!=='completed')throw new Error('Inspect a completed test payment first.');
  if(order.refundAttempted)throw new Error('A refund request already exists; inspect status instead of resubmitting.');
  order.refundAttempted=true;await save();
  const refund=await creemTestApi(config.CREEM_API_KEY,'/v1/refunds',{method:'POST',body:{transaction_id:order.transactionId}}) as Record<string,unknown>;
  await writeFile(`.migration/acceptance/refund-test-${plan}.json`,JSON.stringify(refund,null,2));
  console.log(JSON.stringify({action,plan,id:refund.id,status:refund.status,mode:refund.mode,realCharge:false}));
} else {throw new Error('Use init, create, inspect or refund.');}
