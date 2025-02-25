// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'tsup';

export default defineConfig({
  name: 'funkcia',
  tsconfig: 'tsconfig.build.json',
  entry: [
    'src/index.ts',
    'src/exceptions.ts',
    'src/functions.ts',
    'src/json.ts',
    'src/predicate.ts',
    'src/uri.ts',
    'src/url.ts',
  ],
  // splitting: false,
  format: ['cjs', 'esm'],
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  minify: true,
});
