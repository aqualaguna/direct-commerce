export default ({ env }) => ({
  // Disable upload plugin for test environment to avoid S3 warnings
  ...(env('NODE_ENV') !== 'test' && {
    upload: {
      config: {
        provider: 'aws-s3',
        providerOptions: {
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
  }),
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
      jwt: {
        expiresIn: '7d', // Token expires in 7 days as specified in story
      },
      ratelimit: {
        max: env('NODE_ENV') === 'test' ? 1000 : 5, // Higher limit for testing, normal limit for production
        windowMs: env('NODE_ENV') === 'test' ? 60 * 1000 : 15 * 60 * 1000, // 1 minute for testing, 15 minutes for production
      },
      // Email configuration for verification and password reset
      email: {
        from: env('EMAIL_FROM', 'noreply@example.com'),
        replyTo: env('EMAIL_REPLY_TO', 'support@example.com'),
      },
      // Password requirements
      password: {
        minLength: 8,
        maxLength: 128,
        // Require at least one uppercase, one lowercase, one number, and one special character
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      },
      // Account lockout settings
      lockout: {
        maxAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
      },
      // Default permissions - make all content types public by default
      defaultPermissions: {
        public: {
          // List of content types that should be public by default
          publicContentTypes: [
            'api::category.category',
            'api::product-listing.product-listing',
            // Add more content types as needed
          ],
          // Actions that should be public for these content types
          publicActions: ['find', 'findOne']
        },
        authenticated: {
          // List of content types that should be accessible by authenticated users
          authenticatedContentTypes: [
            'api::user-activity.user-activity',
            'api::user-preference.user-preference',
            'api::privacy-setting.privacy-setting',
            // Add more content types as needed
          ],
          // Actions that should be available for authenticated users
          authenticatedActions: ['find', 'findOne', 'create', 'update', 'delete']
        }
      },
    },
  },
});
