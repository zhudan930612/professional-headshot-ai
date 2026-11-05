import { describe, expect, it } from 'vitest';
import { handleError, HttpError, requireUser, readJson } from './http';

describe('API boundary', () => {
  it('rejects anonymous calls before accessing any configured backend', async () => {
    await expect(requireUser(new Request('https://local.test'), {})).rejects.toMatchObject({ status: 401 });
  });
  it('does not leak provider or database errors', async () => {
    const response = handleError(new Error('secret upstream detail'));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('secret');
    expect(handleError(new HttpError(403, 'Forbidden')).status).toBe(403);
  });
  it('rejects malformed JSON and arrays', async () => {
    for (const body of ['[1,2]', '{broken']) {
      const request = new Request('https://local.test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      await expect(readJson(request)).rejects.toMatchObject({ status: 400 });
    }
  });
});
