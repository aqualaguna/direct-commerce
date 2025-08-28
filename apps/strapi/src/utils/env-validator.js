/**
 * Environment Variable Validator
 *
 * This utility validates that all required environment variables are set
 * and provides helpful error messages for missing or invalid values.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const requiredEnvVars = {
  // Core Strapi Configuration
  APP_KEYS: {
    required: true,
    description: 'Application keys for encryption',
    generate:
      "node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
  },
  API_TOKEN_SALT: {
    required: true,
    description: 'Salt for API token generation',
    generate:
      "node -e \"console.log(require('crypto').randomBytes(16).toString('base64'))\"",
  },
  ADMIN_JWT_SECRET: {
    required: true,
    description: 'JWT secret for admin authentication',
    generate:
      "node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
  },
  JWT_SECRET: {
    required: true,
    description: 'JWT secret for user authentication',
    generate:
      "node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
  },
  TRANSFER_TOKEN_SALT: {
    required: true,
    description: 'Salt for transfer token generation',
    generate:
      "node -e \"console.log(require('crypto').randomBytes(16).toString('base64'))\"",
  },
};

const databaseEnvVars = {
  postgres: {
    DATABASE_HOST: {
      required: true,
      description: 'PostgreSQL database host',
    },
    DATABASE_PORT: {
      required: true,
      description: 'PostgreSQL database port',
      default: '5432',
    },
    DATABASE_NAME: {
      required: true,
      description: 'PostgreSQL database name',
    },
    DATABASE_USERNAME: {
      required: true,
      description: 'PostgreSQL database username',
    },
    DATABASE_PASSWORD: {
      required: true,
      description: 'PostgreSQL database password',
    },
  },
  sqlite: {
    DATABASE_FILENAME: {
      required: false,
      description: 'SQLite database filename',
      default: '.tmp/data.db',
    },
  },
};

const optionalEnvVars = {
  // Security
  CORS_ORIGIN: {
    description: 'CORS allowed origins',
    default: 'http://localhost:3000,http://localhost:4321',
  },
  RATE_LIMIT_ENABLED: {
    description: 'Enable rate limiting',
    default: 'true',
  },
  RATE_LIMIT_WINDOW_MS: {
    description: 'Rate limit window in milliseconds',
    default: '900000',
  },
  RATE_LIMIT_MAX_REQUESTS: {
    description: 'Maximum requests per window',
    default: '100',
  },

  // Server Configuration
  HOST: {
    description: 'Server host',
    default: '0.0.0.0',
  },
  PORT: {
    description: 'Server port',
    default: '1337',
  },

  // File Upload
  UPLOAD_PROVIDER: {
    description: 'File upload provider',
    default: 'local',
  },

  // Email
  SMTP_HOST: {
    description: 'SMTP host for email',
    default: 'localhost',
  },
  SMTP_PORT: {
    description: 'SMTP port',
    default: '1025',
  },

  // Ecommerce
  ECOMMERCE_CURRENCY: {
    description: 'Default currency',
    default: 'USD',
  },
  ECOMMERCE_TAX_RATE: {
    description: 'Default tax rate',
    default: '0.08',
  },
  ECOMMERCE_SHIPPING_FREE_THRESHOLD: {
    description: 'Free shipping threshold',
    default: '50.00',
  },

  // Feature Flags
  FEATURE_WISHLIST_ENABLED: {
    description: 'Enable wishlist feature',
    default: 'true',
  },
  FEATURE_REVIEWS_ENABLED: {
    description: 'Enable reviews feature',
    default: 'true',
  },
  FEATURE_NOTIFICATIONS_ENABLED: {
    description: 'Enable notifications feature',
    default: 'true',
  },
};

/**
 * Validate environment variables
 */
function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // Validate required environment variables
  for (const [key, config] of Object.entries(requiredEnvVars)) {
    if (!process.env[key]) {
      errors.push({
        key,
        message: `Missing required environment variable: ${key}`,
        description: config.description,
        generate: config.generate,
      });
    }
  }

  // Validate database-specific environment variables
  const databaseClient = process.env.DATABASE_CLIENT || 'sqlite';
  const databaseVars = databaseEnvVars[databaseClient] || {};

  for (const [key, config] of Object.entries(databaseVars)) {
    if (config.required && !process.env[key]) {
      errors.push({
        key,
        message: `Missing required database environment variable: ${key}`,
        description: config.description,
      });
    }
  }

  // Check optional environment variables and provide warnings
  for (const [key, config] of Object.entries(optionalEnvVars)) {
    if (!process.env[key] && config.default) {
      warnings.push({
        key,
        message: `Optional environment variable not set: ${key}`,
        description: config.description,
        default: config.default,
      });
    }
  }

  return { errors, warnings };
}

/**
 * Generate secure random values for required environment variables
 */
async function generateSecureValues() {
  const crypto = await import('crypto');

  return {
    APP_KEYS: crypto.randomBytes(32).toString('base64'),
    API_TOKEN_SALT: crypto.randomBytes(16).toString('base64'),
    ADMIN_JWT_SECRET: crypto.randomBytes(32).toString('base64'),
    JWT_SECRET: crypto.randomBytes(32).toString('base64'),
    TRANSFER_TOKEN_SALT: crypto.randomBytes(16).toString('base64'),
  };
}

/**
 * Display validation results
 */
function displayValidationResults(results) {
  const { errors, warnings } = results;

  if (errors.length > 0) {
    console.error('\n❌ Environment Validation Errors:');
    console.error('=====================================');

    errors.forEach((error, index) => {
      console.error(`\n${index + 1}. ${error.message}`);
      console.error(`   Description: ${error.description}`);
      if (error.generate) {
        console.error(`   Generate with: ${error.generate}`);
      }
    });

    console.error('\n💡 To generate secure values, run:');
    console.error(
      "   node -e \"const crypto = require('crypto'); console.log('APP_KEYS=' + crypto.randomBytes(32).toString('base64'));\""
    );

    return false;
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment Validation Warnings:');
    console.warn('=====================================');

    warnings.forEach((warning, index) => {
      console.warn(`\n${index + 1}. ${warning.message}`);
      console.warn(`   Description: ${warning.description}`);
      console.warn(`   Default: ${warning.default}`);
    });
  }

  if (errors.length === 0) {
    console.log('\n✅ Environment validation passed!');
    return true;
  }

  return false;
}

/**
 * Create .env file from template
 */
function createEnvFile() {
  const envExamplePath = path.join(process.cwd(), 'config', 'env.example');
  const envPath = path.join(process.cwd(), '.env');

  if (fs.existsSync(envPath)) {
    console.warn('⚠️  .env file already exists. Skipping creation.');
    return;
  }

  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env file from template');
    console.log('📝 Please update the values in .env file');
  } else {
    console.error('❌ env.example file not found');
  }
}

/**
 * Main validation function
 */
function validate() {
  console.log('🔍 Validating environment variables...');

  const results = validateEnvironment();
  const isValid = displayValidationResults(results);

  if (!isValid) {
    console.error('\n🚨 Environment validation failed!');
    console.error(
      'Please fix the errors above before starting the application.'
    );
    process.exit(1);
  }

  return results;
}

export {
  validate,
  validateEnvironment,
  generateSecureValues,
  displayValidationResults,
  createEnvFile,
  requiredEnvVars,
  databaseEnvVars,
  optionalEnvVars,
};
