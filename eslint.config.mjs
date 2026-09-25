import js from '@eslint/js';
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
  { files: ['src/**/*.ts'], rules: { '@typescript-eslint/no-require-imports': 'error' } },
];
