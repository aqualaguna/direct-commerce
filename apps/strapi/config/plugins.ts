import {
  RATE_LIMIT_CONFIG,
  PASSWORD_CONFIG,
  LOCKOUT_CONFIG,
  JWT_CONFIG,
  CONTENT_TYPES,
  ACTIONS,
  PUBLIC_CUSTOM_PERMISSIONS,
  AUTHENTICATED_CUSTOM_PERMISSIONS,
  ADMIN_CUSTOM_PERMISSIONS,
} from './constant';

export default ({ env }) => ({
  upload: {
    config: {
      // Use local provider for test environment, S3 for production
      provider: env('NODE_ENV') === 'test' ? 'local' : 'aws-s3',
      providerOptions: env('NODE_ENV') === 'test' ? {
        // Local file system configuration for testing
        sizeLimit: 100000000, // 100MB
      } : {
        // S3 configuration for production
        s3Options: {
          accessKeyId: env('R2_ACCESS_KEY_ID'),
          secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
          region: env('R2_REGION', 'auto'),
          endpoint: env('R2_ENDPOINT'),
          forcePathStyle: true,
        },
        params: {
          Bucket: env('R2_BUCKET'),
        },
      },
    },
  },
  // Disable email plugin for test environment to avoid SendGrid warnings
  ...(env('NODE_ENV') !== 'test' && {
    email: {
      config: {
        provider: '@strapi/provider-email-sendgrid',
        providerOptions: {
          apiKey: env('SENDGRID_API_KEY'),
          defaultFrom: env('EMAIL_FROM', 'noreply@example.com'),
          defaultReplyTo: env('EMAIL_REPLY_TO', 'support@example.com'),
        },
      },
    },
  }),
  'schema-visualizer': {
    enabled: true,
  },
  'users-permissions': {
    config: {
      jwt: JWT_CONFIG,
      ratelimit: env('NODE_ENV') === 'test' ? RATE_LIMIT_CONFIG.test : RATE_LIMIT_CONFIG.production,
      // Email configuration for verification and password reset
      email: {
        from: env('EMAIL_FROM', 'noreply@example.com'),
        replyTo: env('EMAIL_REPLY_TO', 'support@example.com'),
      },
      // Password requirements
      password: PASSWORD_CONFIG,
      // Account lockout settings
      lockout: LOCKOUT_CONFIG,
      // Default permissions - make all content types public by default
      defaultPermissions: {
        public: {
          // List of content types that should be public by default
          publicContentTypes: CONTENT_TYPES.public,
          // Actions that should be public for these content types
          publicActions: ACTIONS.public,
          customPermissions: PUBLIC_CUSTOM_PERMISSIONS,
        },
        authenticated: {
          // List of content types that should be accessible by authenticated users
          authenticatedContentTypes: CONTENT_TYPES.authenticated,
          // Actions that should be available for authenticated users
          authenticatedActions: ACTIONS.authenticated,
          customPermissions: AUTHENTICATED_CUSTOM_PERMISSIONS,
        },
        admin: {
          // List of content types that should be accessible by admin users
          adminContentTypes: CONTENT_TYPES.admin,
          adminActions: ACTIONS.admin,
          customPermissions: ADMIN_CUSTOM_PERMISSIONS,
        }
      },
    },
  },
});
