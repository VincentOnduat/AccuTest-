import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '../src/lib/server/rateLimit';

describe('checkRateLimit', () => {
  it('allows requests up to the configured max', () => {
    const key = `test-allow-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, { max: 5, windowMs: 60_000 }).allowed).toBe(true);
    }
  });

  it('rejects the request once the max is exceeded, within the same window', () => {
    const key = `test-reject-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, { max: 3, windowMs: 60_000 });
    }
    const result = checkRateLimit(key, { max: 3, windowMs: 60_000 });
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('allows requests again once the window has passed', async () => {
    const key = `test-window-${Math.random()}`;
    const windowMs = 50; // short window so the test doesn't need to sleep long
    expect(checkRateLimit(key, { max: 1, windowMs }).allowed).toBe(true);
    expect(checkRateLimit(key, { max: 1, windowMs }).allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, windowMs + 10));

    expect(checkRateLimit(key, { max: 1, windowMs }).allowed).toBe(true);
  });

  it('tracks separate keys independently', () => {
    const keyA = `test-independent-a-${Math.random()}`;
    const keyB = `test-independent-b-${Math.random()}`;
    checkRateLimit(keyA, { max: 1, windowMs: 60_000 });
    // keyA is now at its limit — keyB should be unaffected.
    expect(checkRateLimit(keyB, { max: 1, windowMs: 60_000 }).allowed).toBe(true);
  });
});
