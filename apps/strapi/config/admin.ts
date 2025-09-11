export default ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
    secrets: {
      encryptionKey: env('ENCRYPTION_KEY'),
    }
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY'),
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
  watchIgnoreFiles: [
    './tests/**', // Ignores all files within a 'tests' directory at the project root
    '**/__tests__/**', // Ignores all '__tests__' directories anywhere in the project
    '**/?(*.)+(spec|test).js?(x)', // Ignores files ending with .spec.js, .test.js, etc.
  ],
});
