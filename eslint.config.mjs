// @ts-check
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['**/node_modules/**', 'dist/**', 'coverage/**', 'artifacts/**']),

  // Nền tảng: JS + TypeScript (không dùng type-aware rules để lint nhanh; tsc đã lo phần kiểu)
  js.configs.recommended,
  tseslint.configs.recommended,

  // Quy tắc chung cho mọi file TS/JS
  {
    files: ['**/*.{ts,tsx,mts,mjs}'],
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'no-console': ['warn', { allow: ['debug', 'warn', 'error'] }],
      'no-debugger': 'warn',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },

  // Game chạy trên trình duyệt: React (rules of hooks + rule của React Compiler trong react-hooks v7)
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.tsx'],
    extends: [reactHooks.configs.flat['recommended-latest']],
    languageOptions: { globals: globals.browser },
    rules: {
      // App.tsx còn nợ kỹ thuật (setState trong effect, đọc ref khi render); để cảnh báo
      // cho tới khi tách luồng state của App, thay vì sửa logic chỉ để qua lint.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },

  // Code chạy bằng Node: script đo, test, công cụ QA và file cấu hình (được dùng console)
  {
    files: ['scripts/**', 'tests/**', '**/*.config.{ts,mjs,js}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-console': 'off' },
  },

  // Tắt mọi rule về định dạng: phần đó do Prettier đảm nhiệm (phải đứng cuối)
  prettierConfig,
]);
