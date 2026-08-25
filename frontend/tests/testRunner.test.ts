import { describe, it, expect } from 'vitest';
import { runPlaywrightCode } from '../src/lib/server/testRunner';

// These tests actually spawn the Playwright CLI and a real headless Chromium
// instance (no mocking, no simulated pass/fail) — they're the regression
// guard for AccuTest's real test execution feature. Run
// `npx playwright install chromium` once locally before running `npm test`.

describe('runPlaywrightCode', () => {
  it('reports a real pass for code with a true assertion', async () => {
    const code = `
      import { test, expect } from '@playwright/test';
      test('math works', async () => {
        expect(1 + 1).toBe(2);
      });
    `;
    const result = await runPlaywrightCode(code);

    expect(result.status).toBe('passed');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].status).toBe('passed');
  }, 30_000);

  it('reports a real failure for code with a false assertion, with the assertion error surfaced', async () => {
    const code = `
      import { test, expect } from '@playwright/test';
      test('math is broken on purpose', async () => {
        expect(1 + 1).toBe(3);
      });
    `;
    const result = await runPlaywrightCode(code);

    expect(result.status).toBe('failed');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].status).toBe('failed');
    expect(result.results[0].error_message).toContain('toBe');
  }, 30_000);

  it('reports mixed results independently per test', async () => {
    const code = `
      import { test, expect } from '@playwright/test';
      test('passes', async () => { expect(true).toBe(true); });
      test('fails', async () => { expect(true).toBe(false); });
    `;
    const result = await runPlaywrightCode(code);

    expect(result.status).toBe('failed'); // any failure fails the overall run
    const statuses = result.results.map((r) => r.status).sort();
    expect(statuses).toEqual(['failed', 'passed']);
  }, 30_000);

  it('returns an error result (not a fabricated pass/fail) for invalid code', async () => {
    const code = `this is not valid javascript {{{`;
    const result = await runPlaywrightCode(code);

    expect(result.status).toBe('error');
    expect(result.results).toHaveLength(0);
    expect(result.rawError).toBeTruthy();
  }, 30_000);
});
