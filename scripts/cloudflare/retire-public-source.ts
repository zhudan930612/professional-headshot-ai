import {config} from 'dotenv';
import {readFile,writeFile} from 'node:fs/promises';
config({path:'.env.local',quiet:true});
const verification=JSON.parse(await readFile('.migration/baseline-20261105/final-verification.json','utf8'));
if(!verification.ok||verification.objects.count!==245||!verification.objects.hashesMatch||verification.history.missing) throw new Error('Migration verification is incomplete.');
const health=await fetch('https://www.professionalheadshotai.ink/api/health',{signal:AbortSignal.timeout(15_000)});
if(!health.ok||(await health.json()).backend!=='cloudflare') throw new Error('The production domain has not switched.');
const root=process.env.VITE_SUPABASE_URL!;
const headers={apikey:process.env.SUPABASE_SERVICE_ROLE_KEY!,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json'};
const before=[];const after: {bucket:string;public:boolean;anonymousStatus?:number}[]=[];
for(const bucket of ['user-uploads','generated-headshots','template-images']){
  const previous=await fetch(`${root}/storage/v1/bucket/${bucket}`,{headers,signal:AbortSignal.timeout(20_000)});
  if(!previous.ok)throw new Error(`Cannot inspect source bucket: ${previous.status}`);
  before.push(await previous.json());
}
await writeFile('.migration/source-buckets-before-retirement.json',JSON.stringify(before,null,2));
for(const bucket of ['user-uploads','generated-headshots','template-images']){
  const update=await fetch(`${root}/storage/v1/bucket/${bucket}`,{method:'PUT',headers,body:JSON.stringify({id:bucket,name:bucket,public:false}),signal:AbortSignal.timeout(20_000)});
  if(!update.ok)throw new Error(`Cannot protect source bucket: ${update.status}`);
  const inspected=await fetch(`${root}/storage/v1/bucket/${bucket}`,{headers,signal:AbortSignal.timeout(20_000)});
  const data=await inspected.json();
  if(!inspected.ok||data.public!==false)throw new Error('Source bucket privacy was not verified.');
  after.push({bucket,public:data.public});
}
const objects=JSON.parse(await readFile('.migration/baseline-20261105/storage_objects.json','utf8'));
for(const bucket of ['user-uploads','generated-headshots','template-images']){
  const item=objects.find((o:{bucket:string})=>o.bucket===bucket);
  const response=await fetch(`${root}/storage/v1/object/public/${bucket}/${item.key.split('/').map(encodeURIComponent).join('/')}`,{method:'HEAD',signal:AbortSignal.timeout(20_000)});
  if(response.ok)throw new Error('A source object is still publicly accessible.');
  after.find(r=>r.bucket===bucket)!.anonymousStatus=response.status;
}
await writeFile('.migration/source-retirement.json',JSON.stringify({at:new Date().toISOString(),after,sourceDataDeleted:false},null,2));
console.log(JSON.stringify({after,sourceDataDeleted:false}));
