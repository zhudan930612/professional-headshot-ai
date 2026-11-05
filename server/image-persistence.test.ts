import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost } from '@/functions/api/save-generated-image';

const userId = '11111111-1111-4111-8111-111111111111';
const taskId = '22222222-2222-4222-8222-222222222222';
const env = { VITE_SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-service-key' };
const request = (extra: Record<string, unknown> = {}) => new Request('https://app.test/api/save-generated-image', {
  method:'POST', headers:{ authorization:'Bearer user-token', 'content-type':'application/json' },
  body:JSON.stringify({ taskId, sessionId:'session-1', index:0, ...extra }),
});

describe('saved images use authenticated task ownership', () => {
  let savedImage: Record<string,unknown> | null;
  let owned: boolean;
  const calls: { url:URL; method:string; headers:Headers }[] = [];
  beforeEach(() => {
    savedImage=null; owned=true; calls.length=0;
    vi.stubGlobal('fetch',vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
      const method=init?.method ?? 'GET';
      calls.push({url,method,headers:new Headers(init?.headers)});
      if(url.pathname==='/auth/v1/user') return Response.json({id:userId});
      if(url.pathname==='/rest/v1/generation_tasks' && method==='GET') {
        expect(url.searchParams.get('user_id')).toBe('eq.'+userId);
        expect(url.searchParams.get('id')).toBe('eq.'+taskId);
        return Response.json(owned?[{ id:taskId,user_id:userId,status:'completed',result_url:'https://cdn.evolink.ai/result.jpg',
          saved_image:savedImage,updated_at:'2026-11-02T00:00:00Z' }]:[]);
      }
      if(url.hostname==='cdn.evolink.ai') return new Response(new Uint8Array([255,216,255,0,1]),{headers:{'content-type':'image/jpeg'}});
      if(url.pathname.startsWith('/storage/v1/object/generated-headshots/')) return Response.json({Key:'saved'});
      if(url.pathname==='/rest/v1/generation_tasks' && method==='PATCH') {
        savedImage=JSON.parse(String(init?.body)).saved_image;
        return new Response(null,{status:204});
      }
      throw new Error('Unexpected network request: '+url.pathname);
    }));
  });
  afterEach(()=>vi.unstubAllGlobals());

  it('ignores caller-provided source URLs and user IDs and preserves the actual MIME type', async () => {
    const response=await onRequestPost({request:request({userId:'other',imageUrl:'https://evil.test/private'}),env});
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({id:taskId,storagePath:`${userId}/${taskId}.jpg`,mimeType:'image/jpeg'});
    expect(calls.some(call=>call.url.hostname==='evil.test')).toBe(false);
    const upload=calls.find(call=>call.url.pathname.startsWith('/storage/v1/object/'));
    expect(upload?.headers.get('content-type')).toBe('image/jpeg');
  });

  it('returns the same saved image without re-downloading or re-uploading', async () => {
    const first=await onRequestPost({request:request(),env});
    const initial=await first.json();
    calls.length=0;
    const again=await onRequestPost({request:request({sessionId:'different-session'}),env});
    expect(await again.json()).toEqual(initial);
    expect(calls.some(call=>call.url.hostname==='cdn.evolink.ai'||call.url.pathname.startsWith('/storage/'))).toBe(false);
  });

  it('rejects a task not owned by the signed-in user before retrieving an image', async () => {
    owned=false;
    const response=await onRequestPost({request:request(),env});
    expect(response.status).toBe(404);
    expect(calls).toHaveLength(2);
  });
});
