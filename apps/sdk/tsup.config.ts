import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['cjs'],
  dts: true,
  minify: true,
  clean: true,
  outDir: 'dist',
});