/* eslint-disable import/no-extraneous-dependencies */
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import globals from 'globals';

const compat = new FlatCompat();

export default [
  // Core ESLint recommended rules
  js.configs.recommended,

  // Airbnb base rules (using compatibility layer)
  ...compat.extends('airbnb-base'),

  // Backend-specific settings and overrides
  {
    files: ['**/*.js'],
    ignores: ['node_modules/**', 'dist/**', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module', // ES Modules
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      // --- Style rules ---
      indent: ['error', 2],
      'linebreak-style': ['error', 'unix'],
      quotes: ['error', 'single'],
      semi: ['error', 'never'],
      eqeqeq: 'error',
      'no-trailing-spaces': 'error',
      'object-curly-spacing': ['error', 'always'],
      'arrow-spacing': ['error', { before: true, after: true }],
      'max-len': ['error', { code: 120, ignoreStrings: true, ignoreTemplateLiterals: true }],

      // --- Backend flexibility ---
      'no-console': 'off', // allow console.log in backend
      'no-underscore-dangle': 'off', // often used for private vars (_id)
      'consistent-return': 'off',
      'no-param-reassign': ['error', { props: false }],
      'import/prefer-default-export': 'off',
      'import/extensions': ['error', 'ignorePackages'],
      camelcase: 'off', // allow snake_case for database fields
    },
  },
];
