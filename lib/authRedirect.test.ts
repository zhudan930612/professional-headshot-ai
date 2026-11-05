import { describe, expect, it } from 'vitest';
import { safeReturnPath } from './authRedirect';

describe('OAuth return paths', () => {
  it('retains payment confirmation parameters', () => {
    expect(safeReturnPath('/subscription?payment=success&payment_id=123')).toBe('/subscription?payment=success&payment_id=123');
  });
  it('rejects external and browser-normalized external destinations', () => {
    for (const path of ['https://outside.test', '//outside.test', '/\\outside.test', '\n//outside.test', undefined]) {
      expect(safeReturnPath(path)).toBe('/');
    }
  });
});
