import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { localDependencyResolution } from './vite.dependencies.js';

export default defineConfig({
  plugins: [tailwindcss()],
  server: { port: 5173, strictPort: true },
  optimizeDeps: { esbuildOptions: { plugins: [localDependencyResolution()], tsconfigRaw: { compilerOptions: { jsx: 'react' } } } }
});
