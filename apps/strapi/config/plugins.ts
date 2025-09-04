export default ({ env }) => ({
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
  'schema-visualizer': {
    enabled: true,
  },
  'users-permissions': {
    config: {
      jwt: {
        expiresIn: '7d', // Token expires in 7 days as specified in story
      },
      ratelimit: {
        max: 5, // Maximum 5 requests per window
        windowMs: 15 * 60 * 1000, // 15 minutes window
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
    },
  },
});
