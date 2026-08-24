import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173,
    strictPort: false,
    // GitHub Codespaces forwards the dev server behind HTTPS on port 443,
    // proxying to the container's real port internally — the browser's HMR
    // socket needs to dial back through that forwarded port, not the
    // container's localhost:5173. Outside Codespaces, leave hmr unset so
    // protocol/host auto-detect from window.location as usual.
    hmr: process.env.CODESPACES ? { clientPort: 443 } : undefined
  }
});
