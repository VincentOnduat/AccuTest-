

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
- [Database Schema](#-database-schema)
- [License](#-license)

## 🎯 About

**AccuTest** is a comprehensive test automation platform that transforms requirements into actionable test cases with surgical precision. Leveraging OpenAI's GPT models, it parses Automation Test Requirement Documents (ATRDs), generates executable test code, tracks execution metrics, and provides deep analytics with business insights.

## ✨ Features

### ✅ Working Features

| Feature | Status | Description |
|---------|--------|-------------|
| 🔐 User Authentication | ✅ | Supabase auth with email/password, self-serve sign up |
| 📋 ATRD Management | ✅ | Create, view, parse, and delete ATRD documents |
| 🤖 AI Test Generation | ✅ | Generate tests for 6 domains (Functional, Performance, Security, Accessibility, Visual, Data/ETL) |
| 🧪 Test Packages | ✅ | Create and manage test packages with automated code |
| ▶️ Test Execution | ✅ | Real execution of generated Playwright test code against a configurable target URL, with real pass/fail results |
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
- **Hosting**: Vercel / Supabase
- **Version Control**: Git / GitHub
- **CI/CD**: GitHub Actions

## 📁 Project Structure

```
AccuTest-/
├── frontend/                  # SvelteKit app (frontend + backend API routes)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── (marketing)/  # Public landing page and pricing
│   │   │   ├── login/        # Sign in
│   │   │   ├── signup/       # Self-serve sign up
│   │   │   ├── dashboard/    # UI: atrd, packages, tasks, sessions,
│   │   │   │                 #     tests, analytics, test-execution,
│   │   │   │                 #     profile, settings
│   │   │   └── api/          # SvelteKit API routes: ai, atrd, auth,
│   │   │                     #     packages, reports, business-reports,
│   │   │                     #     test-executions, test-runner,
│   │   │                     #     notifications, health
│   │   ├── lib/               # components, stores, server (auth, testRunner), supabase.ts
│   │   └── hooks.server.ts
│   ├── tests/                 # Vitest unit tests
│   └── migrations/            # Supabase SQL migrations
└── package.json                # Root workspace scripts (proxies to frontend)
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

The SvelteKit app serves its own server routes under `/api/*` (e.g. `ai/generate-test-package`, `ai/parse-atrd`, `atrd/*`, `packages/*`, `reports/*`, `business-reports/*`, `test-executions/*`, `test-runner`, `notifications`, `health`) that talk to Supabase and OpenAI directly from the server — see `frontend/src/routes/api/`.

## 🗄️ Database Schema

Data is stored in Supabase PostgreSQL. Core tables referenced by the app include:

| Table | Description |
|-------|--------------|
| `profiles` | User profile data |
| `tasks` | Automation tasks (linked to ATRDs and test packages) |
| `atrd_results` | Parsed ATRD documents and metadata |
| `test_packages` | Generated test packages and their code |
| `tests` | Individual test cases |
| `sessions` | Test execution sessions |
| `test_executions` | Execution history and results |
| `business_reports` | Generated analytics/business reports |
| `notifications` | User notifications |

SQL migrations live in `frontend/migrations/`. Row-level security policies and full column definitions are managed in the Supabase project directly.

## 📄 License

Proprietary. All rights reserved. See [`LICENSE`](LICENSE) for details.
