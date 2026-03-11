import { defineConfig, globalIgnores } from 'eslint/config';
import next from 'eslint-config-next';
import nextTypeScript from 'eslint-config-next/typescript';

export default defineConfig([
  ...next,
  ...nextTypeScript,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts'
  ])
]);
