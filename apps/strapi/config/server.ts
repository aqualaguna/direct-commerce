export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  watchIgnoreFiles: [
    './tests/**', // Ignores all files within a 'tests' directory at the project root
    '**/__tests__/**', // Ignores all '__tests__' directories anywhere in the project
    '**/?(*.)+(spec|test).js?(x)', // Ignores files ending with .spec.js, .test.js, etc.
  ],
});
