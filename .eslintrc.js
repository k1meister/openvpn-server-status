module.exports = {
    env: {
      node: true,
      es2021: true,
      jest: true
    },
    extends: [
      'eslint:recommended',
      'plugin:jest/recommended',
      'prettier'
    ],
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    plugins: ['jest'],
    rules: {
      'no-console': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  };