import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Real test execution for AI-generated Playwright code.
 *
 * This actually spawns the Playwright CLI and runs the generated spec as a
 * real browser test — it does not simulate or randomize results. That means:
 *
 *   - It requires a persistent Node.js host with `@playwright/test` installed
 *     and its browser binaries downloaded (`npx playwright install chromium`).
 *     It will NOT work on typical edge/serverless runtimes (e.g. Vercel Edge
 *     Functions) because they can't spawn OS processes or ship a headless
 *     browser. Deploy the SvelteKit app to a Node server target instead.
 *   - Generated tests that reference relative URLs (e.g. `page.goto('/')`)
 *     need a `baseUrl` — the user's configured "Target Application URL" in
 *     Settings — or they will legitimately fail with a navigation error.
 *     That's an honest failure, not a bug in the runner.
 *
 * Only Playwright-family code is executed for real right now. Cypress/Jest
 * generation is still code-only (see the framework check in the callers of
 * this module) — we deliberately don't fabricate pass/fail for those.
 */

export interface TestCaseResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  duration: number;
  error_message?: string;
}

export interface RunResult {
  /** Overall run status. 'error' means the run itself couldn't complete (crash, timeout, bad code) — distinct from a test legitimately failing its assertions. */
  status: 'passed' | 'failed' | 'error';
  duration: number;
  results: TestCaseResult[];
  rawError?: string;
}

const RUN_TIMEOUT_MS = 90_000;
const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

function stripAnsi(input: string): string {
  return input.replace(ANSI_PATTERN, '');
}

/**
 * Runs generated Playwright test source code for real and returns the actual
 * per-test results. `baseUrl`, if given, becomes Playwright's `use.baseURL`
 * so relative `page.goto()`/`request.get()` calls in generated code resolve
 * against the user's target application.
 */
export async function runPlaywrightCode(code: string, opts: { baseUrl?: string } = {}): Promise<RunResult> {
  const projectRoot = process.cwd();
  const runsRoot = path.join(projectRoot, '.accutest-runs');
  await mkdir(runsRoot, { recursive: true });
  const dir = await mkdtemp(path.join(runsRoot, `${randomUUID()}-`));

  const specPath = path.join(dir, 'generated.spec.ts');
  const configPath = path.join(dir, 'playwright.config.ts');
  const resultsPath = path.join(dir, 'results.json');

  try {
    await writeFile(specPath, code, 'utf-8');
    await writeFile(
      configPath,
      `import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  timeout: 20000,
  reporter: [['json', { outputFile: 'results.json' }]],
  use: {
    baseURL: ${opts.baseUrl ? JSON.stringify(opts.baseUrl) : 'undefined'},
    ignoreHTTPSErrors: true,
    trace: 'off',
    screenshot: 'off',
    video: 'off'
  }
});
`,
      'utf-8'
    );

    const started = Date.now();
    const { code: exitCode, stderr } = await execPlaywrightCli(configPath, dir, projectRoot);
    const duration = Date.now() - started;

    let rawJson: any;
    try {
      rawJson = JSON.parse(await readFile(resultsPath, 'utf-8'));
    } catch {
      // No JSON report at all — the run crashed before any test executed
      // (e.g. a syntax error in the generated code, or a missing import).
      return {
        status: 'error',
        duration,
        results: [],
        rawError: stripAnsi(stderr).slice(0, 4000) || `Playwright exited with code ${exitCode} and produced no report.`
      };
    }

    const results = flattenResults(rawJson);
    if (results.length === 0) {
      return { status: 'error', duration, results: [], rawError: 'No tests were found in the generated code.' };
    }

    const anyFailed = results.some((r) => r.status === 'failed' || r.status === 'timedOut');
    return { status: anyFailed ? 'failed' : 'passed', duration, results };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function execPlaywrightCli(
  configPath: string,
  cwd: string,
  projectRoot: string
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const bin = path.join(projectRoot, 'node_modules', '.bin', 'playwright');
    const child = spawn(bin, ['test', '--config', configPath], {
      cwd,
      env: { ...process.env, CI: '1' },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));

    const killTimer = setTimeout(() => {
      child.kill('SIGKILL');
    }, RUN_TIMEOUT_MS);

    child.on('close', (code) => {
      clearTimeout(killTimer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.on('error', (err) => {
      clearTimeout(killTimer);
      resolve({ code: 1, stdout, stderr: String(err) });
    });
  });
}

/** Walks the Playwright JSON reporter's suite tree into a flat list of per-test results. */
function flattenResults(report: any): TestCaseResult[] {
  const out: TestCaseResult[] = [];

  function walkSuite(suite: any, titlePrefix: string) {
    const prefix = titlePrefix ? (suite.title ? `${titlePrefix} > ${suite.title}` : titlePrefix) : suite.title || '';

    for (const spec of suite.specs || []) {
      const fullTitle = prefix ? `${prefix} > ${spec.title}` : spec.title;
      for (const test of spec.tests || []) {
        const lastResult = test.results?.[test.results.length - 1];
        out.push({
          name: fullTitle,
          status: mapStatus(lastResult?.status),
          duration: lastResult?.duration ?? 0,
          error_message: lastResult?.errors?.[0]?.message ? stripAnsi(lastResult.errors[0].message).slice(0, 2000) : undefined
        });
      }
    }

    for (const child of suite.suites || []) {
      walkSuite(child, prefix);
    }
  }

  for (const suite of report.suites || []) {
    walkSuite(suite, '');
  }

  return out;
}

function mapStatus(status: string | undefined): TestCaseResult['status'] {
  switch (status) {
    case 'passed':
      return 'passed';
    case 'timedOut':
      return 'timedOut';
    case 'skipped':
      return 'skipped';
    default:
      return 'failed';
  }
}

/** Frameworks whose generated code is real Playwright/@playwright-test-compatible source we can actually execute. */
export const REAL_EXECUTION_FRAMEWORKS = new Set([
  'playwright',
  'k6',
  'owasp-zap',
  'axe-core',
  'percy',
  'chromatic',
  'dbt',
  'great-expectations'
]);
