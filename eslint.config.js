module.exports = [
  {
    files: ['src/**/*.js', 'api/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
    },
    rules: {
      'no-console': 'error',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
    },
    rules: {
      'no-console': 'error',
    },
  },
];
