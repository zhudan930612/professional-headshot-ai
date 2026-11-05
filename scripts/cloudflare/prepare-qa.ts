import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { parse } from 'dotenv';
import { cf } from './api';

const project='professional-headshot-ai-qa';
const dbId='ec703699-4599-4107-bffc-168067ff2753';
const directory='.migration/qa-project';
await mkdir(directory,{recursive:true});
await cp('dist',directory+'/dist',{recursive:true});
const source=parse(await readFile('.env.local','utf8'));
const test=parse(await readFile('.dev.vars.creem-test','utf8'));
const vars:Record<string,string>={
  APP_URL:`https://${project}.pages.dev`,GOOGLE_CLIENT_ID:source.VITE_GOOGLE_CLIENT_ID||'',
  CREEM_TEST_MODE:'true',ALLOW_NEW_ACCOUNTS:'false',
  CREEM_PROFESSIONAL_PRODUCT_ID:test.CREEM_PROFESSIONAL_PRODUCT_ID||'',
  CREEM_EXECUTIVE_PRODUCT_ID:test.CREEM_EXECUTIVE_PRODUCT_ID||'',
};
const config=[`name = ${JSON.stringify(project)}`,'compatibility_date = "2026-11-05"','compatibility_flags = ["nodejs_compat"]','pages_build_output_dir = "dist"','[vars]',
  ...Object.entries(vars).map(([key,value])=>`${key} = ${JSON.stringify(value)}`),
  '[[d1_databases]]','binding = "DB"',`database_name = ${JSON.stringify(project)}`,`database_id = ${JSON.stringify(dbId)}`,'migrations_dir = "../../database/d1"',
  '[[r2_buckets]]','binding = "PHOTOS"',`bucket_name = ${JSON.stringify(project)}`,
].join('\n')+'\n';
await writeFile(directory+'/wrangler.toml',config);
await writeFile(directory+'/dist/robots.txt','User-agent: *\nDisallow: /\n');
const headers=await readFile(directory+'/dist/_headers','utf8');
await writeFile(directory+'/dist/_headers',headers+'\n/*\n  X-Robots-Tag: noindex, nofollow\n');
const envVars:Record<string,{type:string;value:string}>={};
for(const [name,value]of Object.entries(vars))envVars[name]={type:'plain_text',value};
for(const name of ['CREEM_API_KEY','CREEM_WEBHOOK_SECRET'])if(test[name])envVars[name]={type:'secret_text',value:test[name]};
const response=await cf(`/pages/projects/${project}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({deployment_configs:{production:{
  env_vars:envVars,d1_databases:{DB:{id:dbId}},r2_buckets:{PHOTOS:{name:project}},compatibility_date:'2026-11-05',compatibility_flags:['nodejs_compat'],
}}})});
if(!response.ok)throw new Error(`QA configuration failed: ${response.status}`);
console.log(JSON.stringify({project,dbId,containsCustomerData:false,testApiKeyConfigured:!!test.CREEM_API_KEY,webhook:`https://${project}.pages.dev/api/auth/creem/webhook`}));
