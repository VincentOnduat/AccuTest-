# Base image matters here: @playwright/test needs a real Chromium binary and
# its OS-level dependencies on disk (api/test-runner spawns it as a real
# subprocess — see src/lib/server/testRunner.ts). Microsoft's own Playwright
# image ships both pre-installed, which is far more reliable across hosting
# platforms than hoping a generic Node buildpack's `apt-get` succeeds during
# `npx playwright install --with-deps`. Keep this tag in sync with the
# @playwright/test version in package.json.
FROM mcr.microsoft.com/playwright:v1.62.1-noble

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# SvelteKit's $env/static/public AND $env/static/private (used throughout
# this app, e.g. src/lib/supabase.ts, api/ai/*) are inlined by Vite at BUILD
# time, not read at container runtime — so all three of this app's env vars,
# including the private OPENAI_API_KEY, must be available here as build
# arguments, not just as runtime environment variables on the deployed
# service. Check your platform's docs for how it exposes configured env vars
# as Docker build args (Railway and Render both support this, but the exact
# dashboard step differs) — set these three there.
ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_ANON_KEY
ARG OPENAI_API_KEY
ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL
ENV PUBLIC_SUPABASE_ANON_KEY=$PUBLIC_SUPABASE_ANON_KEY
ENV OPENAI_API_KEY=$OPENAI_API_KEY

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "build"]
