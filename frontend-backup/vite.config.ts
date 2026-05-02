import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    alias: {
      $styles: path.resolve(__dirname, './src/styles')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        //additionalData: `@use '$styles/global.scss' as *;` // Optional: auto-import for all SCSS files
      }
    }
  }
});

