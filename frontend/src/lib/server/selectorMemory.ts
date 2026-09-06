import type { SupabaseClient } from '@supabase/supabase-js';
import type { TestCaseResult } from './testRunner';

/**
 * Selector memory: the feedback loop from real execution history back into
 * AI generation (see migrations/20260906000001_create_selector_memory.sql
 * for the schema and the reasoning behind keying on the site's hostname
 * rather than the individual package).
 *
 * Two halves:
 *   - recordSelectorOutcomes (called from api/test-runner after a real run)
 *     extracts the locators a package's generated code actually used and
 *     scores each one against that run's real pass/fail result.
 *   - getSelectorMemoryForHost + formatSelectorMemoryForPrompt (called from
 *     api/ai/generate-test-package before generation) feed that history back
 *     into the next generation for the same site, so the AI can prefer
 *     locators that have actually held up and flag ones that haven't.
 *
 * This only ever reasons about locator *strings* pulled from generated
 * source — it never inspects the live page. It's a memory of what this
 * account's own runs have seen work or break, nothing more.
 */

export interface SelectorRecord {
  selector: string;
  kind: string;
  successCount: number;
  failureCount: number;
  lastError: string | null;
}

export interface SelectorMemory {
  reliable: SelectorRecord[];
  risky: SelectorRecord[];
}

// Matches the Playwright locator-producing calls the AI is instructed to
// generate (see the GROUNDING RULE in generate-test-package's prompt).
// getBy* calls capture their own kind; page.locator(...) is bucketed as
// 'css'. Action verbs (click/fill/etc.) are deliberately NOT matched when
// chained onto a locator — `page.locator('#foo').fill('some value')` — since
// the argument there is the value being typed, not a selector; the selector
// itself was already captured by the .locator(...) match earlier in the same
// chain. They're matched only in Playwright's older selector-as-first-arg
// form, `page.fill('#foo', 'value')`, where the literal `page.` (or
// `context.`) immediately precedes the verb — see PAGE_ACTION_PATTERN below.
const GET_BY_PATTERN =
  /\.(getByRole|getByText|getByLabel|getByPlaceholder|getByTestId|getByAltText|getByTitle)\(\s*(['"`])((?:\\.|(?!\2).)*)\2(?:\s*,\s*\{[^}]*?\bname:\s*(['"`])((?:\\.|(?!\4).)*)\4[^}]*?\})?/g;
const LOCATOR_PATTERN = /\.locator\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g;
const PAGE_ACTION_PATTERN =
  /\b(?:page|context)\.(click|dblclick|fill|check|uncheck|hover|press|selectOption|type|tap)\(\s*(['"`])((?:\\.|(?!\2).)*)\2/g;

// Generated code uses this pattern for anything the ATRD didn't explicitly
// name (see generate-test-package's GROUNDING RULE) — an obvious placeholder
// flagged for human review, not a real selector. Recording these would just
// fill selector memory with noise that was never grounded in anything.
function isPlaceholder(selector: string): boolean {
  return selector.includes('TODO_');
}

export function extractSelectorsFromCode(code: string): { selector: string; kind: string }[] {
  const found = new Map<string, string>(); // selector -> kind, deduped within this slice

  for (const match of code.matchAll(GET_BY_PATTERN)) {
    const [, method, , arg, , name] = match;
    const kind = method.replace(/^getBy/, '').toLowerCase();
    const selector = name ? `${method}(${JSON.stringify(arg)}, name: ${JSON.stringify(name)})` : `${method}(${JSON.stringify(arg)})`;
    if (!isPlaceholder(selector)) found.set(selector, kind);
  }

  for (const match of code.matchAll(LOCATOR_PATTERN)) {
    const arg = match[2];
    if (!arg) continue;
    const selector = `locator(${JSON.stringify(arg)})`;
    if (!isPlaceholder(selector) && !found.has(selector)) found.set(selector, 'css');
  }

  for (const match of code.matchAll(PAGE_ACTION_PATTERN)) {
    const arg = match[3];
    if (!arg) continue;
    const selector = `locator(${JSON.stringify(arg)})`;
    if (!isPlaceholder(selector) && !found.has(selector)) found.set(selector, 'css');
  }

  return Array.from(found, ([selector, kind]) => ({ selector, kind }));
}

/** Scans forward from `openIndex` (which must point at a '{') for its matching close brace, string-literal-aware. */
function findMatchingBrace(code: string, openIndex: number): number {
  let depth = 0;
  let inString: string | null = null;
  for (let i = openIndex; i < code.length; i++) {
    const ch = code[i];
    if (inString) {
      if (ch === '\\') i++; // skip the escaped character, including an escaped quote
      else if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') inString = ch;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Splits generated code into one block per top-level `test(...)` call (its
 * title plus its full body, including any nested `test.step()` calls, whose
 * selectors are naturally included since they're inside the same braces).
 * Deliberately does not match `test.step(`, `test.only(`, or
 * `test.describe(` individually — Playwright's JSON reporter (see
 * testRunner.ts's flattenResults) only ever produces one spec entry per
 * top-level test() anyway, so that's the only granularity worth attributing
 * a pass/fail to.
 */
export function extractTestBlocks(code: string): { title: string; code: string }[] {
  const blocks: { title: string; code: string }[] = [];
  const callPattern = /\btest\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g;
  for (const match of code.matchAll(callPattern)) {
    const title = match[2];
    // The callback is always `(args) => { ... }` (an arrow function — every
    // generated test uses one), and its parameter list itself may contain a
    // brace (`async ({ page }) => { ... }`, Playwright's fixture
    // destructuring) that isn't the function body. Anchor on the arrow
    // itself and take the first '{' after it, not the first '{' after the
    // whole test(...) call, so that destructuring brace is never mistaken
    // for the body's opening brace.
    const searchFrom = match.index! + match[0].length;
    const arrowIndex = code.indexOf('=>', searchFrom);
    const braceStart = code.indexOf('{', arrowIndex === -1 ? searchFrom : arrowIndex);
    if (braceStart === -1) continue;
    const braceEnd = findMatchingBrace(code, braceStart);
    if (braceEnd === -1) continue;
    blocks.push({ title, code: code.slice(braceStart, braceEnd + 1) });
  }
  return blocks;
}

/**
 * Records this run's real outcome against every selector its code used,
 * upserted per (user, site hostname, selector) — see the migration for why
 * memory is scoped to the site rather than the package. Best-effort by
 * design: a test result with no matching `test()` block (name mismatch, a
 * describe-nested title, non-Playwright code) is silently skipped rather
 * than guessed at, since attributing selectors to the wrong test would be
 * worse than recording nothing for it.
 *
 * Known limitation: counts are updated with a read-then-write per selector,
 * not a single atomic increment, so two runs of the same package finishing
 * at nearly the same instant could race and undercount one of them. Treat
 * this as directional history for prompting, not an exact audit log.
 */
export async function recordSelectorOutcomes(
  supabase: SupabaseClient,
  userId: string,
  targetUrl: string | null | undefined,
  code: string,
  testResults: TestCaseResult[]
): Promise<void> {
  if (!targetUrl) return; // nothing to key memory on without a site

  let host: string;
  try {
    host = new URL(targetUrl).hostname;
  } catch {
    return;
  }

  const blocks = extractTestBlocks(code);
  const relevant = testResults.filter((r) => r.status === 'passed' || r.status === 'failed' || r.status === 'timedOut');

  for (const result of relevant) {
    // A generated test's reported name can be "test title" (no describe) or
    // "... > test title" (nested under a describe) — either way it ends
    // with the leaf title a test() block was extracted under.
    const block =
      blocks.find((b) => b.title === result.name || result.name.endsWith(` > ${b.title}`)) ??
      (blocks.length === 1 && relevant.length === 1 ? blocks[0] : undefined);
    if (!block) continue;

    const selectors = extractSelectorsFromCode(block.code);
    if (selectors.length === 0) continue;

    const status: 'passed' | 'failed' = result.status === 'passed' ? 'passed' : 'failed';

    for (const { selector, kind } of selectors) {
      const { data: existing } = await supabase
        .from('selector_memory')
        .select('id, success_count, failure_count')
        .eq('user_id', userId)
        .eq('target_host', host)
        .eq('selector', selector)
        .maybeSingle();

      const successCount = (existing?.success_count ?? 0) + (status === 'passed' ? 1 : 0);
      const failureCount = (existing?.failure_count ?? 0) + (status === 'failed' ? 1 : 0);

      await supabase.from('selector_memory').upsert(
        {
          user_id: userId,
          target_host: host,
          selector,
          selector_kind: kind,
          success_count: successCount,
          failure_count: failureCount,
          last_status: status,
          last_error: status === 'failed' ? result.error_message?.slice(0, 500) || null : null,
          last_seen_at: new Date().toISOString()
        },
        { onConflict: 'user_id,target_host,selector' }
      );
    }
  }
}

const RELIABLE_MIN_SUCCESSES = 2;
const RISKY_MIN_FAILURES = 2;
const MAX_PER_LIST = 8;

/** Reads back this account's selector history for a site, split into what's worth trusting and what's worth flagging. */
export async function getSelectorMemoryForHost(
  supabase: SupabaseClient,
  userId: string,
  targetUrl: string | null | undefined
): Promise<SelectorMemory> {
  if (!targetUrl) return { reliable: [], risky: [] };

  let host: string;
  try {
    host = new URL(targetUrl).hostname;
  } catch {
    return { reliable: [], risky: [] };
  }

  const { data, error } = await supabase
    .from('selector_memory')
    .select('selector, selector_kind, success_count, failure_count, last_error')
    .eq('user_id', userId)
    .eq('target_host', host);

  if (error || !data) return { reliable: [], risky: [] };

  const records: SelectorRecord[] = data.map((row) => ({
    selector: row.selector,
    kind: row.selector_kind || 'css',
    successCount: row.success_count ?? 0,
    failureCount: row.failure_count ?? 0,
    lastError: row.last_error ?? null
  }));

  const reliable = records
    .filter((r) => r.failureCount === 0 && r.successCount >= RELIABLE_MIN_SUCCESSES)
    .sort((a, b) => b.successCount - a.successCount)
    .slice(0, MAX_PER_LIST);

  // "Risky" means it fails at least as often as it passes, with enough
  // failures that it's a pattern rather than one bad run.
  const risky = records
    .filter((r) => r.failureCount >= RISKY_MIN_FAILURES && r.failureCount >= r.successCount)
    .sort((a, b) => b.failureCount - a.failureCount)
    .slice(0, MAX_PER_LIST);

  return { reliable, risky };
}

/** Renders selector memory as a prompt section, or '' when there's nothing worth saying yet (e.g. a brand-new site). */
export function formatSelectorMemoryForPrompt(memory: SelectorMemory): string {
  if (memory.reliable.length === 0 && memory.risky.length === 0) return '';

  const lines: string[] = [
    '',
    'SELECTOR MEMORY — from this account\'s own past runs against this exact site. This is real execution history, not a guess:'
  ];

  if (memory.reliable.length > 0) {
    lines.push(
      "Known-reliable locators (have passed repeatedly, never failed) — prefer one of these over writing a new locator when it targets the same element the ATRD describes:",
      ...memory.reliable.map((r) => `  - ${r.selector}`)
    );
  }

  if (memory.risky.length > 0) {
    lines.push(
      'Known-flaky locators (fail at least as often as they pass on this site) — avoid reusing these; if the ATRD points at the same element, prefer a different, more specific locator instead:',
      ...memory.risky.map((r) => `  - ${r.selector}${r.lastError ? ` (last failure: ${r.lastError.slice(0, 150)})` : ''}`)
    );
  }

  lines.push(
    'This history only covers locators already grounded in the ATRD by the GROUNDING RULE above — it never justifies inventing a selector the document doesn\'t name.'
  );

  return lines.join('\n');
}

export interface SelectorMemoryImpact {
  reusedReliableCount: number;
  /** Sum of successCount across just the reliable selectors this generation actually reused — not a global run count for the site. */
  pastRunsCovered: number;
}

/**
 * How much this specific generation actually drew on selector memory — not just
 * "memory existed for this site," but "the code just written reused a specific
 * locator this account has seen hold up before." Returns null when there's
 * nothing worth reporting (brand-new site, or a generation that happened not to
 * reuse any selector with a track record).
 *
 * Deliberately doesn't try to claim credit for "avoiding" a known-flaky selector:
 * a generated file simply not containing that selector string is true of almost
 * any code, including code that has nothing to do with that part of the page —
 * absence isn't evidence the model steered around it on purpose, and reporting it
 * as if it were would be the same kind of overclaim this loop is supposed to be
 * an honest alternative to.
 */
export function computeSelectorMemoryImpact(generatedCode: string, memory: SelectorMemory): SelectorMemoryImpact | null {
  const generatedSelectors = new Set(extractSelectorsFromCode(generatedCode).map((s) => s.selector));
  const reusedReliable = memory.reliable.filter((r) => generatedSelectors.has(r.selector));

  if (reusedReliable.length === 0) return null;

  return {
    reusedReliableCount: reusedReliable.length,
    pastRunsCovered: reusedReliable.reduce((sum, r) => sum + r.successCount, 0)
  };
}
