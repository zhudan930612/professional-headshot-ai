import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { query } from './api';

const origin = 'https://www.professionalheadshotai.ink';
const directory = '.migration/acceptance';
const statePath = path.join(directory, 'generation-state.json');
interface Run { requestId: string; taskId?: string; status?: string; submittedAt?: string; output?: Record<string, unknown> }
interface State { userId: string; subscriptionId: string; token: string; upload?: { url: string }; runs: Record<string, Run>; createdAt: string }
await mkdir(directory, { recursive: true });
let state: State;
try { state = JSON.parse(await readFile(statePath, 'utf8')); }
catch {
  state = { userId: randomUUID(), subscriptionId: randomUUID(), token: randomBytes(32).toString('hex'), runs: {}, createdAt: new Date().toISOString() };
  await writeFile(statePath, JSON.stringify(state, null, 2));
}
const persist = () => writeFile(statePath, JSON.stringify(state, null, 2));
async function api(route: string, init: RequestInit = {}) {
  const response = await fetch(origin + route, { ...init, headers: { Origin: origin, Cookie: `__Host-headshot_session=${state.token}`, ...init.headers }, signal: AbortSignal.timeout(90_000) });
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(`Site API ${route.split('?')[0]} returned ${response.status}: ${data.error || 'request failed'}`);
  }
  return response;
}
const post = async (route: string, body: unknown) => (await api(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const action = process.argv[2];
if (action === 'init') {
  const before = (await query('SELECT id,user_id,plan_type,purchased_quota,bonus_quota,used_quota FROM user_subscriptions WHERE user_id<>? ORDER BY id', [state.userId]))[0].results;
  await writeFile(path.join(directory, 'customer-balances-before.json'), JSON.stringify(before, null, 2), { flag: 'wx' }).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'EEXIST') throw error; });
  await query('INSERT INTO users(id,email,name,created_at,updated_at) VALUES (?,NULL,?,?,?) ON CONFLICT(id) DO NOTHING', [state.userId, 'Release verification 2026-11-05', state.createdAt, state.createdAt]);
  const user = (await query('SELECT name FROM users WHERE id=?', [state.userId]))[0].results[0];
  if (user?.name !== 'Release verification 2026-11-05') throw new Error('Unexpected QA account.');
  await query("INSERT INTO user_subscriptions(id,user_id,plan_type,base_plan_type,status,purchased_quota,bonus_quota,used_quota,subscribed_at,created_at,updated_at) VALUES (?,?,'professional','professional','active',4,0,0,?,?,?) ON CONFLICT(id) DO NOTHING", [state.subscriptionId,state.userId,state.createdAt,state.createdAt,state.createdAt]);
  await query('INSERT INTO auth_sessions(token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?) ON CONFLICT(token_hash) DO UPDATE SET expires_at=excluded.expires_at', [createHash('sha256').update(state.token).digest('hex'),state.userId,Date.now()+2*3600_000,Date.now()]);
  if (!state.upload) {
    const bytes = await readFile('public/reference-templates/corporate/corporate_01.jpg');
    state.upload = await (await api('/api/uploads', { method:'POST',headers:{'Content-Type':'image/jpeg'},body:bytes })).json();
    await persist();
  }
  const account = await (await api('/api/account')).json();
  console.log(JSON.stringify({ action, dedicatedTestAccount:true, sample:'public/reference-templates/corporate/corporate_01.jpg', uploaded:!!state.upload, quota:account.quota }));
} else if (action === 'submit-1k' || action === 'submit-2k') {
  if (!state.upload) throw new Error('Initialize first.');
  const quality = action === 'submit-1k' ? '1K' : '2K';
  if (state.runs[quality]) throw new Error('A request already exists. Poll it; do not create another provider task.');
  if (quality === '2K') {
    if (state.runs['1K']?.status !== 'completed' || !state.runs['1K'].output) throw new Error('Verify and save 1K before testing 2K.');
    await query("UPDATE user_subscriptions SET plan_type='executive',base_plan_type='executive' WHERE id=? AND user_id=?",[state.subscriptionId,state.userId]);
  }
  const requestId = randomUUID();
  state.runs[quality] = { requestId, submittedAt:new Date().toISOString(), status:'submitting' };
  await persist();
  // The public example goes through the same private upload and signed input URL as a customer photo.
  const result = await post('/api/nanoBanana', { action:'submitTask',requestId,referenceImageUrl:state.upload.url,templateImageUrl:origin+'/api/media/template-images/corporate/corporate_02.jpg' });
  state.runs[quality].taskId = result.taskId;
  state.runs[quality].status = 'processing';
  await persist();
  const task=(await query('SELECT id,quality,status,charged,provider_task_id FROM generation_tasks WHERE id=? AND user_id=?',[requestId,state.userId]))[0].results[0];
  if(task?.quality!==quality) throw new Error('Server selected unexpected quality.');
  console.log(JSON.stringify({action,task}));
} else if (action === 'poll') {
  for (const [quality,run] of Object.entries(state.runs)) {
    const result = await post('/api/nanoBanana', { action:'queryStatus',taskId:run.taskId || run.requestId });
    run.status=result.status;
    const task=(await query('SELECT id,quality,status,charged,provider_task_id,refunded_at FROM generation_tasks WHERE id=? AND user_id=?',[run.requestId,state.userId]))[0].results[0];
    console.log(JSON.stringify({quality,result,task}));
  }
  await persist();
} else if (action === 'save') {
  for (const [quality,run] of Object.entries(state.runs)) {
    if (run.status!=='completed') continue;
    const saved=await post('/api/save-generated-image',{taskId:run.taskId || run.requestId});
    run.output=saved;
    const response=await api(saved.url);
    const bytes=Buffer.from(await response.arrayBuffer());
    const extension=saved.mimeType==='image/jpeg'?'jpg':saved.mimeType==='image/webp'?'webp':'png';
    await writeFile(path.join(directory,`result-${quality}.${extension}`),bytes);
    const sessionId=`acceptance_${quality}_${run.requestId}`;
    await post('/api/history',{id:sessionId,date:Date.now(),style:'Corporate & Executive',useCase:'LinkedIn',images:[saved]});
    const history=await(await api('/api/history')).json();
    const found=history.items.find((s:{id:string})=>s.id===sessionId);
    if(!found?.images.some((i:{id:string})=>i.id===saved.id)) throw new Error('Saved history was not returned.');
    const again=await post('/api/save-generated-image',{taskId:run.taskId || run.requestId});
    if(again.url!==saved.url)throw new Error('Repeated save was not idempotent.');
    const anonymous=await fetch(origin+saved.url,{signal:AbortSignal.timeout(20_000)});
    if(anonymous.status!==401)throw new Error('Private output was not protected.');
    console.log(JSON.stringify({quality,persisted:true,bytes:bytes.length,mimeType:saved.mimeType,sha256:createHash('sha256').update(bytes).digest('hex'),historyVerified:true,repeatedSaveVerified:true,anonymousStatus:anonymous.status,output:path.join(directory,`result-${quality}.${extension}`)}));
  }
  await persist();
  console.log(JSON.stringify({account:await(await api('/api/account')).json()}));
} else if (action === 'verify-balances') {
  const before=JSON.parse(await readFile(path.join(directory,'customer-balances-before.json'),'utf8'));
  const after=(await query('SELECT id,user_id,plan_type,purchased_quota,bonus_quota,used_quota FROM user_subscriptions WHERE user_id<>? ORDER BY id',[state.userId]))[0].results;
  const unchanged=JSON.stringify(before)===JSON.stringify(after);
  console.log(JSON.stringify({customerBalancesUnchanged:unchanged}));
  if(!unchanged)process.exitCode=1;
} else { throw new Error('Use init, submit-1k, submit-2k, poll, save or verify-balances.'); }
