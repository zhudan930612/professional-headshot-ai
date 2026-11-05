import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const execute=promisify(execFile);
const quote=(value:string)=>JSON.stringify(value);
export async function creemTestApi(apiKey:string, route:string, options:{method?:'GET'|'POST'|'PATCH';body?:unknown;idempotencyKey?:string}={}) {
  if(!/^creem_test_[A-Za-z0-9_-]+$/.test(apiKey))throw new Error('A Creem Test Mode key is required.');
  if(!route.startsWith('/v1/')||/[\r\n]/.test(route))throw new Error('Invalid test API route.');
  const directory=path.resolve('.migration/acceptance/http');await mkdir(directory,{recursive:true});
  const stem=path.join(directory,randomUUID());
  const configuration=stem+'.curl';const output=stem+'.json';const bodyFile=stem+'.body';
  const lines=['silent','show-error','connect-timeout = 15','max-time = 60',
    `url = ${quote('https://test-api.creem.io'+route)}`,
    `request = ${quote(options.method||'GET')}`,
    `header = ${quote('x-api-key: '+apiKey)}`,
    `output = ${quote(output)}`,
    'write-out = "%{http_code}"',
  ];
  if(options.idempotencyKey)lines.push(`header = ${quote('Idempotency-Key: '+options.idempotencyKey)}`);
  if(options.body!==undefined){await writeFile(bodyFile,JSON.stringify(options.body));lines.push('header = "Content-Type: application/json"',`data-binary = ${quote('@'+bodyFile)}`);}
  await writeFile(configuration,lines.join('\n'));
  try {
    // The key stays out of command arguments and output. Curl is used because
    // this Windows host's Node TLS connection to the test API can be reset.
    const {stdout}=await execute(process.platform==='win32'?'curl.exe':'curl',['-q','--config',configuration,'--no-location','--proto','=https'],{windowsHide:true,timeout:70_000,maxBuffer:1024*1024});
    const status=Number(stdout.trim());
    const data:unknown=JSON.parse(await readFile(output,'utf8'));
    if(status<200||status>=300)throw new Error(`Creem Test API ${options.method||'GET'} ${route.split('?')[0]} returned ${status}.`);
    return data;
  } catch(error) {
    if(error instanceof Error && error.message.startsWith('Creem Test API'))throw error;
    throw new Error('Creem test request did not complete. Inspect existing test resources before retrying a write.');
  } finally {
    await Promise.all([configuration,bodyFile,output].map(file=>unlink(file).catch(()=>{})));
  }
}
