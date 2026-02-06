import { defineConfig } from 'tsdown';

export default defineConfig({
  name: 'funkcia',
  tsconfig: 'tsconfig.build.json',
  entry: [
    'src/index.ts',
    'src/brand.ts',
    'src/exceptions.ts',
    'src/functions.ts',
    'src/result-async.ts',
    'src/result.ts',
    'src/option-async.ts',
    'src/option.ts',
    'src/json.ts',
    'src/predicate.ts',
    'src/runes.ts',
    'src/uri.ts',
    'src/url.ts',
  ],
  format: 'esm',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  minify: true,
  dts: true,
  target: false,
});
