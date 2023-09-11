// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'tsup';

export default defineConfig({
  name: 'funkcia',
  tsconfig: 'tsconfig.build.json',
  entry: ['src/*.ts', '!src/*.spec.ts'],
  splitting: true,
  bundle: false,
  format: ['cjs', 'esm'],
  outDir: 'dist',
  clean: true,
  sourcemap: true,
});
