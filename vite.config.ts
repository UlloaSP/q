import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  root: path('./site/'),
  // Relative, so the built site works under any path.
  base: './',
  resolve: {
    alias: [
      { find: '@ziran/q/styles.css', replacement: path('./src/styles.css') },
      { find: '@ziran/q', replacement: path('./src/index.ts') },
    ],
  },
  server: { port: 5173, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
  pack: {
    entry: { index: 'src/index.ts', headless: 'src/controller.ts' },
    outDir: 'dist',
    format: 'esm',
    fixedExtension: false,
    target: 'es2022',
    dts: true,
    sourcemap: true,
    clean: true,
    tsconfig: 'tsconfig.build.json',
    copy: [{ from: 'src/styles.css', to: 'dist' }],
  },
  test: {
    root: path('./'),
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    restoreMocks: true,
    clearMocks: true,
  },
  lint: {
    ignorePatterns: ['dist/**', 'site/dist/**'],
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {
    singleQuote: true,
    ignorePatterns: ['dist/**', 'site/dist/**', 'package-lock.json', 'LICENSE'],
  },
});
