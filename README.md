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
