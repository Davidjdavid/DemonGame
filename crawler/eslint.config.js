// Minimal lint: undefined names and unused vars (no style rules).
import globals from 'globals';

export default [
  {
    files: ['src/**/*.js', 'scripts/**/*.mjs', 'tests/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser, ...globals.node } },
    rules: { 'no-undef': 'error', 'no-unused-vars': ['warn', { args: 'none' }] },
  },
];
