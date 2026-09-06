import { describe, it, expect } from 'vitest';
import {
  extractSelectorsFromCode,
  extractTestBlocks,
  formatSelectorMemoryForPrompt,
  computeSelectorMemoryImpact
} from '../src/lib/server/selectorMemory';

describe('extractSelectorsFromCode', () => {
  it('extracts getBy* locators, folding a name option into the same selector', () => {
    const code = `
      await page.getByRole('button', { name: 'Submit' }).click();
      await page.getByTestId('email-input').fill('a@b.com');
      await page.getByText('Welcome back').isVisible();
    `;
    const selectors = extractSelectorsFromCode(code);

    expect(selectors).toContainEqual({ selector: 'getByRole("button", name: "Submit")', kind: 'role' });
    expect(selectors).toContainEqual({ selector: 'getByTestId("email-input")', kind: 'testid' });
    expect(selectors).toContainEqual({ selector: 'getByText("Welcome back")', kind: 'text' });
  });

  it('extracts CSS-style locator/action calls as kind css', () => {
    const code = `
      await page.locator('#login-form input[name="email"]').fill('a@b.com');
      await page.click('.submit-btn');
    `;
    const selectors = extractSelectorsFromCode(code);

    expect(selectors).toContainEqual({ selector: 'locator("#login-form input[name=\\"email\\"]")', kind: 'css' });
    expect(selectors).toContainEqual({ selector: 'locator(".submit-btn")', kind: 'css' });
  });

  it('skips unresolved-field placeholders — they were never grounded in anything real', () => {
    const code = `await page.locator('[data-testid="TODO_shipping_address_input"]').fill('123 Main St'); // NOT SPECIFIED IN ATRD — REPLACE`;
    expect(extractSelectorsFromCode(code)).toEqual([]);
  });

  it('dedupes the same selector seen more than once in the same block', () => {
    const code = `
      await page.getByTestId('cart-icon').click();
      await expect(page.getByTestId('cart-icon')).toBeVisible();
    `;
    expect(extractSelectorsFromCode(code)).toHaveLength(1);
  });
});

describe('extractTestBlocks', () => {
  it('extracts one block per top-level test(), keyed by its title', () => {
    const code = `
      import { test, expect } from '@playwright/test';
      test('logs in', async ({ page }) => {
        await page.getByTestId('login-btn').click();
      });
      test('logs out', async ({ page }) => {
        await page.getByTestId('logout-btn').click();
      });
    `;
    const blocks = extractTestBlocks(code);

    expect(blocks.map((b) => b.title)).toEqual(['logs in', 'logs out']);
    expect(blocks[0].code).toContain('login-btn');
    expect(blocks[0].code).not.toContain('logout-btn');
  });

  it('includes nested test.step() bodies inside their parent test() block rather than as separate blocks', () => {
    const code = `
      test('checkout flow', async ({ page }) => {
        await test.step('log in', async () => {
          await page.getByTestId('login-btn').click();
        });
        await test.step('add to cart', async () => {
          await page.getByTestId('add-to-cart-btn').click();
        });
      });
    `;
    const blocks = extractTestBlocks(code);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].title).toBe('checkout flow');
    expect(blocks[0].code).toContain('login-btn');
    expect(blocks[0].code).toContain('add-to-cart-btn');
  });

  it('does not let a brace inside a string confuse block boundaries', () => {
    const code = `
      test('renders a template literal', async ({ page }) => {
        const msg = \`value: {ignored}\`;
        await page.getByText(msg).isVisible();
      });
      test('second test', async ({ page }) => {
        await page.getByTestId('marker').click();
      });
    `;
    const blocks = extractTestBlocks(code);

    expect(blocks.map((b) => b.title)).toEqual(['renders a template literal', 'second test']);
    expect(blocks[0].code).not.toContain('marker');
  });
});

describe('formatSelectorMemoryForPrompt', () => {
  it('renders nothing for a site with no history yet', () => {
    expect(formatSelectorMemoryForPrompt({ reliable: [], risky: [] })).toBe('');
  });

  it('renders both known-reliable and known-flaky sections when present', () => {
    const text = formatSelectorMemoryForPrompt({
      reliable: [{ selector: 'getByTestId("login-btn")', kind: 'testid', successCount: 5, failureCount: 0, lastError: null }],
      risky: [
        {
          selector: 'locator(".submit-btn")',
          kind: 'css',
          successCount: 1,
          failureCount: 3,
          lastError: 'Timeout waiting for locator'
        }
      ]
    });

    expect(text).toContain('getByTestId("login-btn")');
    expect(text).toContain('locator(".submit-btn")');
    expect(text).toContain('Timeout waiting for locator');
    expect(text).toContain('Known-reliable locators');
    expect(text).toContain('Known-flaky locators');
  });
});

describe('computeSelectorMemoryImpact', () => {
  const memory = {
    reliable: [
      { selector: 'getByTestId("login-btn")', kind: 'testid', successCount: 5, failureCount: 0, lastError: null },
      { selector: 'getByTestId("logout-btn")', kind: 'testid', successCount: 7, failureCount: 0, lastError: null }
    ],
    risky: [{ selector: 'locator(".submit-btn")', kind: 'css', successCount: 1, failureCount: 3, lastError: 'Timeout' }]
  };

  it('returns null when the generated code reuses no reliable selector', () => {
    const code = `test('t', async ({ page }) => { await page.getByTestId('unrelated-thing').click(); });`;
    expect(computeSelectorMemoryImpact(code, memory)).toBeNull();
  });

  it('does not claim credit for a risky selector just because the new code happens not to contain it', () => {
    // Unrelated code that never touched the flaky selector at all — not evidence it was avoided on purpose.
    const code = `test('t', async ({ page }) => { await page.getByTestId('unrelated-thing').click(); });`;
    expect(computeSelectorMemoryImpact(code, memory)).toBeNull();
  });

  it('counts only the reliable selectors actually reused, summing their real success counts', () => {
    const code = `test('t', async ({ page }) => { await page.getByTestId('login-btn').click(); });`;
    const impact = computeSelectorMemoryImpact(code, memory);
    expect(impact).toEqual({ reusedReliableCount: 1, pastRunsCovered: 5 });
  });

  it('sums past runs across multiple reused reliable selectors', () => {
    const code = `
      test('t', async ({ page }) => {
        await page.getByTestId('login-btn').click();
        await page.getByTestId('logout-btn').click();
      });
    `;
    const impact = computeSelectorMemoryImpact(code, memory);
    expect(impact).toEqual({ reusedReliableCount: 2, pastRunsCovered: 12 });
  });
});
