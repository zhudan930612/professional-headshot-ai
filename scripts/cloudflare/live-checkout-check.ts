import { readFile, writeFile } from 'node:fs/promises';
import { query } from './api';

const state = JSON.parse(await readFile('.migration/acceptance/generation-state.json','utf8')) as { userId:string;token:string };
const target = '.migration/acceptance/checkout-attempt.json';
try {
  const previous = JSON.parse(await readFile(target,'utf8')) as { paymentId?:string;checkoutId?:string;paymentUrl?:string };
  console.log(JSON.stringify({alreadyAttempted:true,hasCheckout:!!previous.checkoutId}));
  process.exit(0);
} catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
await writeFile(target,JSON.stringify({startedAt:new Date().toISOString(),status:'submitting',userId:state.userId}),{flag:'wx'});
const origin='https://www.professionalheadshotai.ink';
// Creates one checkout for review, never submits a payment method or charges a card.
const response=await fetch(origin+'/api/creem/create-payment',{method:'POST',headers:{Origin:origin,Cookie:`__Host-headshot_session=${state.token}`,'Content-Type':'application/json'},body:JSON.stringify({planType:'professional'}),signal:AbortSignal.timeout(30_000)});
const result=await response.json() as {paymentId?:string;checkoutId?:string;paymentUrl?:string;error?:string};
if(!response.ok||!result.paymentId||!result.checkoutId||!result.paymentUrl) throw new Error(`Checkout failed: ${response.status}; ${result.error||'invalid response'}`);
await writeFile(target,JSON.stringify({...result,createdAt:new Date().toISOString(),userId:state.userId,mode:'prod',paid:false},null,2));
await query('UPDATE payment_transactions SET metadata=? WHERE id=? AND user_id=? AND status=?',[JSON.stringify({purpose:'release-acceptance',paid:false}),result.paymentId,state.userId,'pending']);
const record=(await query('SELECT status,amount,currency,granted_quota,granted_bonus_quota,creem_checkout_id FROM payment_transactions WHERE id=? AND user_id=?',[result.paymentId,state.userId]))[0].results[0];
if(record?.status!=='pending'||record.amount!==25||record.granted_quota!==30||record.creem_checkout_id!==result.checkoutId)throw new Error('Payment snapshot mismatch.');
console.log(JSON.stringify({status:response.status,checkoutCreated:true,amount:record.amount,currency:record.currency,creditsOnPayment:record.granted_quota,charged:false,orderStatus:record.status,evidence:target}));
