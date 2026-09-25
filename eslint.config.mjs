import js from '@eslint/js';
import obsidian from 'eslint-plugin-obsidianmd';

// Enforce Obsidian's blocking source rules; optional UI recommendations stay advisory.
const obsidianRules = Object.fromEntries(obsidian.configs.recommended.flatMap(config =>
  Object.entries(config.rules ?? {}).filter(([name, value]) =>
    name.startsWith('obsidianmd/') && name !== 'obsidianmd/rule-custom-message'
    && (Array.isArray(value) ? value[0] : value) === 'error')));

import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  { ignores: ['node_modules/**', '.context/**', 'main.js', 'styles.css'] },
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: { parser: tsParser, ecmaVersion: 'latest', sourceType: 'module' },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...js.configs.recommended.rules,
      // TypeScript checks declarations; ESLint's JavaScript versions misread overloads.
      'no-undef': 'off',
      'no-redeclare': 'off',
      'no-dupe-class-members': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        args: 'none', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', ignoreRestSiblings: true,
      }],
      'prefer-promise-reject-errors': 'error',
    },
  },
  {
    files: ['src/**/*.ts'],
    plugins: { obsidianmd: obsidian },
    languageOptions: { parserOptions: { project: './tsconfig.json' } },
    rules: {
      ...obsidianRules,
      '@typescript-eslint/no-require-imports': 'error',
      'obsidianmd/commands/no-plugin-id-in-command-id': 'error',
      'obsidianmd/hardcoded-config-path': 'error',
      'obsidianmd/prefer-get-language': 'error',
    },
  },
];
