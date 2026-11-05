import { HttpError, type Env } from './http';

export function validateImageUrl(value: string, env: Env): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new HttpError(400, 'Invalid image URL.'); }
  const hosts = (env.GENERATED_IMAGE_HOSTS || 'evolink.ai').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') ||
      !hosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
    throw new HttpError(400, 'Image source is not allowed.');
  }
  return url;
}

export async function fetchImage(value: string, env: Env): Promise<{ bytes: Uint8Array; mime: string; extension: string }> {
  let url = validateImageUrl(value, env);
  const signal = AbortSignal.timeout(20000);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetch(url.toString(), { redirect: 'manual', signal });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get('location');
      if (!location) break;
      url = validateImageUrl(new URL(location, url).toString(), env);
      continue;
    }
    if (!response.ok || !response.body) throw new HttpError(502, 'Unable to retrieve generated image.');
    const max = 20 * 1024 * 1024;
    if (Number(response.headers.get('content-length')) > max) { await response.body.cancel(); throw new HttpError(413, 'Image is too large.'); }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > max) { await reader.cancel(); throw new HttpError(413, 'Image is too large.'); }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const png = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
    if (!png && !jpeg && !webp) throw new HttpError(415, 'Unsupported image format.');
    return { bytes, mime: png ? 'image/png' : jpeg ? 'image/jpeg' : 'image/webp', extension: png ? 'png' : jpeg ? 'jpg' : 'webp' };
  }
  throw new HttpError(502, 'Too many image redirects.');
}
