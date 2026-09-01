// adapter-node, not adapter-auto: this app is deployed as a persistent Node
// server (Railway/Render), not to a serverless/edge platform like Vercel —
// api/test-runner spawns a real Playwright/Chromium subprocess, which
// serverless runtimes can't do. See src/lib/server/testRunner.ts's own
// header comment for why.
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter()
  }
};

export default config;
