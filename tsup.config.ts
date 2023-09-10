// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'tsup';

export default defineConfig({
  name: 'funkcia',
  entry: [
    'src/index.ts',
    'src/array.ts',
    'src/either.ts',
    'src/functions.ts',
    'src/number.ts',
    'src/option.ts',
    'src/predicate.ts',
    'src/string.ts',
  ],
  format: ['cjs', 'esm'],
  outDir: 'dist',
  clean: true,
  sourcemap: true,
});
