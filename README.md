

# 🎯 AccuTest

## AI-Powered Precision Test Automation

<!-- BADGES -->
<p align="center">
  <a href="https://github.com/VincentOnduat/AccuTest-/actions/workflows/main.yml">
    <img src="https://github.com/VincentOnduat/AccuTest-/actions/workflows/main.yml/badge.svg" alt="CI/CD">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-Proprietary-blue.svg" alt="License">
  </a>
  <a href="https://kit.svelte.dev/">
    <img src="https://img.shields.io/badge/SvelteKit-2.0-FF3E00.svg?logo=svelte" alt="SvelteKit">
  </a>
  <a href="https://www.typescriptlang.org/">
    <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6.svg?logo=typescript" alt="TypeScript">
  </a>
  <a href="https://supabase.com/">
    <img src="https://img.shields.io/badge/Supabase-3ECF8E.svg?logo=supabase" alt="Supabase">
  </a>
  <a href="https://playwright.dev/">
    <img src="https://img.shields.io/badge/Playwright-2EAD33.svg?logo=playwright" alt="Playwright">
  </a>
</p>

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [API Endpoints](#-api-endpoints)
- [Scheduled Execution](#-scheduled-execution)
- [Database Schema](#-database-schema)
- [License](#-license)

## 🎯 About

**AccuTest** generates real Playwright tests from your requirements, runs them for real, and remembers what it learns. Every run is scored — which tests are flaky, which selectors actually hold up on your site — and that history feeds back into the next generation for the same site, so the output compounds instead of starting from a blank guess each time. Leveraging OpenAI's GPT models, it parses Automation Test Requirement Documents (ATRDs), generates executable test code across 6 domains, executes it for real, and tracks the results.

## ✨ Features

### ✅ Working Features

| Feature | Status | Description |
|---------|--------|-------------|
| 🔐 User Authentication | ✅ | Supabase auth with email/password, self-serve sign up |
| 📋 ATRD Management | ✅ | Create, view, parse, and delete ATRD documents |
| 🤖 AI Test Generation | ✅ | Real GPT-4o calls generate tests for 6 domains (Functional, Performance, Security, Accessibility, Visual, Data/ETL), grounded in the ATRD's own wording — a selector or route the document doesn't specify gets flagged as a placeholder for review rather than guessed. Capped at 5 free generations per user per month |
| 🧪 Test Packages | ✅ | Create and manage test packages with automated code |
| ▶️ Test Execution | ✅ | Real execution of generated Playwright test code against a configurable target URL, with real pass/fail results |
| ⏰ Scheduled Execution | ✅\* | Opt in per package ("Run automatically every night") and it reruns on its own roughly every 24 hours with no one clicking Run — same real execution path, just triggered by a schedule instead of a person. \*Needs two env vars set to actually run; see [Scheduled Execution](#-scheduled-execution) below — without them the toggle still saves but nothing executes |
| 🔁 Flaky Test Detection | ✅ | Per-test pass/fail history across runs, with a rolling flaky flag (mixed pass/fail in the last 10 runs) surfaced on both the package list and package detail views |
| 🧠 Selector Memory | ✅ | Locators used by generated code are scored per-site from real run outcomes; the next AI generation for that site is given its known-reliable and known-flaky selectors so it can build on what's actually held up rather than guessing fresh each time |
| 🌐 Shared Selector Memory | ✅ | Opt-in, off by default (Settings → Testing): aggregates selector reliability across accounts testing the same site. Requires 3+ distinct opted-in contributors before any aggregate is readable by anyone (enforced in the RLS policy itself), never reveals which accounts contributed or how many, and is refreshed by a scheduled database job — never a live cross-account query |
| 📊 Dashboard Analytics | ✅ | Real-time stats, recent sessions, tasks, and packages |
| 🔄 Test Sessions | ✅ | Create and manage test execution sessions |
| ✅ Task Management | ✅ | Create and track tasks with priority levels |
| 👤 User Profile | ✅ | Manage user profile and account settings |
| 🎯 Domain Categories | ✅ | 6 test categories with visual indicators |
| 💾 ATRD Database | ✅ | Persistent storage with Supabase (6+ records working) |

### 🚧 In Development

| Feature | Status | Description |
|---------|--------|-------------|
| 🧪 Cypress/Jest Execution | 🚧 | Real execution currently covers Playwright-family generated code only; Cypress/Jest packages generate code but report as "execution not yet supported" rather than a fabricated result |
| 📈 Business Reports | 🚧 | Basic pass/fail rollups (totals, pass rate, critical-issue count, an auto-generated summary) are generated from real execution data and persisted — advanced analytics, export, and scheduling are not yet built |
| 🔔 Notifications | 🚧 | Execution notifications are logged to the database, but email/webhook delivery is simulated — no real send provider is wired up yet |

## 🛠️ Tech Stack

### Frontend
- **Framework**: SvelteKit 2.0
- **Language**: TypeScript 5.0
- **Styling**: CSS with Svelte scoped styles
- **State Management**: Svelte stores
- **API Client**: Supabase JS SDK

### Backend
- **API Framework**: SvelteKit server routes (`src/routes/api/*`) — no separate backend service
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth (JWT)
- **AI Integration**: OpenAI GPT Models
- **Test Frameworks**: Playwright (code generation + real execution), Cypress, Jest, k6 (code generation only)

### Infrastructure
- **Hosting**: Railway or Render, deployed via Docker (see `frontend/Dockerfile`) — **not** Vercel or
  another serverless/edge platform: `api/test-runner` spawns a real Playwright/Chromium subprocess
  (see `src/lib/server/testRunner.ts`), which needs a persistent Node server, not a serverless
  function
- **Database**: Supabase (see above)
- **Version Control**: Git / GitHub
- **CI/CD**: GitHub Actions

## 📁 Project Structure

```
AccuTest-/
├── frontend/                  # SvelteKit app (frontend + backend API routes)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── +page.svelte  # Public landing page (root route, no route group)
│   │   │   ├── login/        # Sign in
│   │   │   ├── signup/       # Self-serve sign up
│   │   │   ├── dashboard/    # UI: atrd, packages, tasks, sessions,
│   │   │   │                 #     tests, analytics, test-execution,
│   │   │   │                 #     profile, settings
│   │   │   └── api/          # SvelteKit API routes: ai, atrd, auth,
│   │   │                     #     packages, reports, business-reports,
│   │   │                     #     test-executions, test-runner, run-session,
│   │   │                     #     notifications, health
│   │   ├── lib/               # components, stores, server (auth, testRunner), supabase.ts
│   │   └── hooks.server.ts
│   ├── tests/                 # Vitest unit tests
│   └── migrations/            # Supabase SQL migrations
└── package.json                # Stale duplicate from before the SvelteKit app
                                 # moved into frontend/ — not used to run the
                                 # app; see frontend/package.json instead
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com/) project (URL + anon/service keys)
- An [OpenAI](https://platform.openai.com/) API key

### 1. Clone the repo

```bash
git clone https://github.com/VincentOnduat/AccuTest-.git
cd AccuTest-
```

### 2. Install and run

```bash
cd frontend
npm install
npx playwright install --with-deps chromium   # needed for real test execution
cp .env.example .env   # then fill in your Supabase + OpenAI keys
npm run dev
```

The app runs at `http://localhost:5173`. There is no separate backend service — all
server-side logic (auth, AI generation, and real test execution) runs inside
SvelteKit's own server routes.

> ⚠️ Never commit `.env` files or paste real API keys into chat/commits — set them directly in your local `.env`.

## 🔌 API Endpoints

The SvelteKit app serves its own server routes under `/api/*` (e.g. `ai/generate-test-package`, `ai/parse-atrd`, `ai/usage`, `atrd/*`, `packages/*`, `reports/*`, `business-reports/*`, `test-executions/*`, `test-runner`, `notifications`, `health`) that talk to Supabase and OpenAI directly from the server — see `frontend/src/routes/api/`. `api/internal/scheduled-runs` is a separate, non-user-facing route — see Scheduled Execution below.

## ⏰ Scheduled Execution

Flaky detection and selector memory only learn anything when a package actually runs — without this, that meant only when a person remembered to click Run. Opting a package in ("Run automatically every night" on its detail page) has it rerun on its own roughly every 24 hours through the exact same real-execution path (`lib/server/packageRunner.ts`) a manual click uses — no separate implementation, no simulated results.

**How it's triggered:** `pg_cron` + `pg_net`, both running inside the Supabase project itself, call `POST /api/internal/scheduled-runs` once an hour (staggering execution naturally, rather than every opted-in package firing at once). That route uses a service-role Supabase client to find every account's due packages and run them — inherently cross-account, so it can't go through a normal per-user RLS-scoped client, and it's why this route has its own secret-based auth instead of a user session.

**Two env vars gate all of this, and it's inert without both:**

| Variable | What it's for | Where to get it |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Lets the route read/write across every account's packages | Supabase dashboard → Project Settings → API → `service_role` key (secret — never the anon key, never sent to the client) |
| `CRON_SECRET` | Authenticates the scheduled trigger — the only thing gating this route, since there's no user session | Any random value you generate (e.g. `openssl rand -hex 32`) — must match what's stored in Supabase Vault as `cron_secret` (see `migrations/20260907000100_schedule_package_reruns.sql`, which stores it via Vault rather than as plaintext in a committed file) |

Without either one set, `api/internal/scheduled-runs` returns a 503 explaining which is missing — it does not silently do nothing in a way that could be mistaken for "working, just idle." The per-package toggle always saves regardless; it just has no effect until both variables are set on the deployment.

## 🗄️ Database Schema

Data is stored in Supabase PostgreSQL. Core tables referenced by the app include:

| Table | Description |
|-------|--------------|
| `profiles` | User profile data |
| `tasks` | Automation tasks (linked to ATRDs and test packages) |
| `atrd_results` | Parsed ATRD documents and metadata |
| `test_packages` | Generated test packages and their code, plus `auto_rerun_enabled` / `next_scheduled_run_at` for Scheduled Execution above |
| `tests` | Individual test cases |
| `sessions` | Test execution sessions |
| `test_executions` | Execution history and results |
| `business_reports` | Generated analytics/business reports |
| `notifications` | User notifications |
| `ai_generation_usage` | One row per successful AI generation, per user — an immutable log backing the 5/month free-tier cap and never derived from `test_packages` (which can be deleted) |
| `selector_memory` | One row per (user, site hostname, locator) — real success/failure counts from execution, read back into the next AI generation for that site (see Selector Memory above) |
| `selector_memory_shared` | Cross-account aggregate per (site hostname, locator) — populated by a `pg_cron`-scheduled rollup of opted-in accounts' own `selector_memory` rows, never written to directly by the app (see Shared Selector Memory above) |

SQL migrations live in `frontend/migrations/`. Row-level security policies and full column definitions are managed in the Supabase project directly.

## 📄 License

Proprietary. All rights reserved. See [`LICENSE`](LICENSE) for details.
