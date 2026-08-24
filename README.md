# 🎯 AccuTest

## AI-Powered Precision Test Automation

<!-- BADGES -->
<p align="center">
  <a href="https://github.com/VincentOnduat/AccuTest/actions/workflows/main.yml">
    <img src="https://github.com/VincentOnduat/AccuTest/actions/workflows/main.yml/badge.svg" alt="CI/CD">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-AGPL%20v3-blue.svg" alt="License">
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
  <a href="https://fastapi.tiangolo.com/">
    <img src="https://img.shields.io/badge/FastAPI-0.104-009688.svg?logo=fastapi" alt="FastAPI">
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
| 🔐 User Authentication | ✅ | Supabase auth with email/password |
| 📋 ATRD Management | ✅ | Create, view, parse, and delete ATRD documents |
| 🤖 AI Test Generation | ✅ | Generate tests for 6 domains (Functional, Performance, Security, Accessibility, Visual, Data/ETL) |
| 🧪 Test Packages | ✅ | Create and manage test packages with automated code |
| 📊 Dashboard Analytics | ✅ | Real-time stats, recent sessions, tasks, and packages |
| 🔄 Test Sessions | ✅ | Create and manage test execution sessions |
| ✅ Task Management | ✅ | Create and track tasks with priority levels |
| 👤 User Profile | ✅ | Manage user profile and account settings |
| 🎯 Domain Categories | ✅ | 6 test categories with visual indicators |
| 💾 ATRD Database | ✅ | Persistent storage with Supabase (6+ records working) |

### 🚧 In Development

| Feature | Status | Description |
|---------|--------|-------------|
| 🧪 Test Execution | 🚧 | Running actual test suites |
| 📈 Business Reports | 🚧 | Advanced analytics and reporting |
| 🔔 Notifications | 🚧 | Email and webhook notifications |
| 🚀 CI/CD Pipeline | 🚧 | Automated testing and deployment |

## 🛠️ Tech Stack

### Frontend
- **Framework**: SvelteKit 2.0
- **Language**: TypeScript 5.0
- **Styling**: CSS with Svelte scoped styles
- **State Management**: Svelte stores
- **API Client**: Supabase JS SDK

### Backend
- **API Framework**: FastAPI (Python 3.14)
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth (JWT)
- **AI Integration**: OpenAI GPT Models
- **Test Frameworks**: Playwright, Cypress, Jest, k6

### Infrastructure
- **Hosting**: Vercel / Supabase
- **Version Control**: Git / GitHub
- **CI/CD**: GitHub Actions

## 📁 Project Structure

```
AccuTest-/
├── backend/                  # FastAPI service
│   └── app/
│       ├── main.py           # App entrypoint, CORS, router registration
│       ├── config.py         # Settings (Supabase, OpenAI, etc.)
│       ├── dependencies.py   # Shared FastAPI dependencies (auth, client)
│       ├── routers/          # auth, tasks, atrd, packages
│       ├── services/         # Business logic (e.g. automator)
│       └── utils/
├── frontend/                  # SvelteKit app
│   ├── src/
│   │   ├── routes/
│   │   │   ├── dashboard/    # UI: atrd, packages, tasks, sessions,
│   │   │   │                 #     tests, analytics, business-tests,
│   │   │   │                 #     test-execution, profile, settings
│   │   │   └── api/          # SvelteKit API routes: ai, atrd, auth,
│   │   │                     #     packages, reports, business-reports,
│   │   │                     #     test-executions, test-runner,
│   │   │                     #     notifications, health
│   │   ├── lib/               # components, stores, server, supabase.ts
│   │   └── hooks.server.ts
│   └── migrations/            # Supabase SQL migrations
└── package.json                # Root workspace scripts (proxies to frontend)
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+ (backend targets 3.14)
- A [Supabase](https://supabase.com/) project (URL + anon/service keys)
- An [OpenAI](https://platform.openai.com/) API key

### 1. Clone the repo

```bash
git clone https://github.com/VincentOnduat/AccuTest-.git
cd AccuTest-
```

### 2. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env   # then fill in your Supabase URL/keys
npm run dev
```

The app runs at `http://localhost:5173`.

### 3. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # then fill in Supabase + OpenAI credentials
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000` (interactive docs at `/docs`).

> ⚠️ Never commit `.env` files or paste real API keys into chat/commits — set them directly in your local `.env`.

## 🔌 API Endpoints

The FastAPI backend exposes routers under the following prefixes (see `/docs` for the full interactive spec):

| Prefix | Router | Purpose |
|--------|--------|---------|
| `/auth` | `auth.py` | Authentication (Supabase-backed) |
| `/tasks` | `tasks.py` | Create, list, and update automation tasks |
| `/api/atrd` | `atrd.py` | Upload/parse ATRD documents, link generated tasks |
| `/api/packages` | `packages.py` | Manage generated test packages |

The SvelteKit frontend also serves its own internal API routes under `/api/*` (e.g. `ai/generate-test-package`, `ai/parse-atrd`, `atrd/*`, `packages/*`, `reports/*`, `business-reports/*`, `test-executions/*`, `test-runner`, `notifications`, `health`) that proxy to Supabase and OpenAI directly from the server.

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

Licensed under **AGPL v3**. See [`LICENSE`](LICENSE) for details.
