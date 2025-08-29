#!/usr/bin/env node

/**
 * Environment Setup Script for Strapi Ecommerce Platform
 *
 * This script helps developers set up their environment variables
 * by creating a .env file from the template and generating secure values.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  createEnvFile,
  generateSecureValues,
} from '../src/utils/env-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate secure random values for environment variables
 */
function generateSecureEnvValues() {
  return {
    APP_KEYS: `${crypto.randomBytes(32).toString('base64')},${crypto.randomBytes(32).toString('base64')}`,
    API_TOKEN_SALT: crypto.randomBytes(16).toString('base64'),
    ADMIN_JWT_SECRET: crypto.randomBytes(32).toString('base64'),
    JWT_SECRET: crypto.randomBytes(32).toString('base64'),
    TRANSFER_TOKEN_SALT: crypto.randomBytes(16).toString('base64'),
  };
}

/**
 * Update .env file with secure values
 */
function updateEnvFile(envPath, secureValues) {
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found. Run setup first.');
    return false;
  }

  let envContent = fs.readFileSync(envPath, 'utf8');

  // Replace placeholder values with secure values
  Object.entries(secureValues).forEach(([key, value]) => {
    const placeholder = `${key}=your-${key.toLowerCase().replace(/_/g, '-')}-here`;
    const newValue = `${key}=${value}`;

    if (envContent.includes(placeholder)) {
      envContent = envContent.replace(placeholder, newValue);
      console.log(`✅ Updated ${key}`);
    } else {
      // If placeholder not found, add the value
      envContent += `\n${newValue}`;
      console.log(`✅ Added ${key}`);
    }
  });

  fs.writeFileSync(envPath, envContent);
  return true;
}

/**
 * Create development environment configuration
 */
function createDevelopmentConfig() {
  const envPath = path.join(process.cwd(), '.env');

  if (fs.existsSync(envPath)) {
    console.log('📝 .env file already exists. Updating with secure values...');
  } else {
    console.log('📝 Creating .env file from template...');
    createEnvFile();
  }

  console.log('🔐 Generating secure values...');
  const secureValues = generateSecureEnvValues();

  if (updateEnvFile(envPath, secureValues)) {
    console.log('\n✅ Environment setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Review the .env file and update any specific values');
    console.log('2. For production, use a secure secrets management system');
    console.log('3. Run "npm run dev" to start the development server');
    console.log('\n⚠️  Important: Never commit .env files to version control!');
  } else {
    console.error('❌ Failed to update .env file');
    return false;
  }

  return true;
}

/**
 * Create production environment configuration
 */
function createProductionConfig() {
  console.log('🚀 Setting up production environment configuration...');

  const envPath = path.join(process.cwd(), '.env.production');

  if (fs.existsSync(envPath)) {
    console.log('📝 .env.production file already exists.');
    return true;
  }

  // Copy template and update with production-specific values
  const templatePath = path.join(process.cwd(), 'config', 'env.example');

  if (!fs.existsSync(templatePath)) {
    console.error('❌ env.example template not found');
    return false;
  }

  let envContent = fs.readFileSync(templatePath, 'utf8');

  // Update with production-specific defaults
  const productionUpdates = {
    'NODE_ENV=development': 'NODE_ENV=production',
    'HOST=0.0.0.0': 'HOST=0.0.0.0',
    'PORT=1337': 'PORT=1337',
    'DEBUG=false': 'DEBUG=false',
    'AUTO_RELOAD=true': 'AUTO_RELOAD=false',
    'LOG_LEVEL=info': 'LOG_LEVEL=warn',
    'LOG_FORMAT=simple': 'LOG_FORMAT=json',
  };

  Object.entries(productionUpdates).forEach(([oldValue, newValue]) => {
    envContent = envContent.replace(oldValue, newValue);
  });

  // Add production-specific comments
  envContent = `# =============================================================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# =============================================================================
#
# IMPORTANT: Update these values for your production environment
# Use a secure secrets management system for sensitive values
# =============================================================================

${envContent}`;

  fs.writeFileSync(envPath, envContent);

  console.log('✅ Created .env.production file');
  console.log('\n📋 Production setup instructions:');
  console.log('1. Update database configuration for your production database');
  console.log('2. Set up proper CORS origins for your domain');
  console.log('3. Configure file upload provider (S3, Cloudinary, etc.)');
  console.log('4. Set up email provider for notifications');
  console.log('5. Configure payment providers (Stripe, PayPal, etc.)');
  console.log('6. Set up monitoring and analytics');
  console.log('7. Generate secure values for all secrets');
  console.log('\n⚠️  Security checklist:');
  console.log('- Use strong, unique passwords');
  console.log('- Enable SSL/TLS for database connections');
  console.log('- Configure proper firewall rules');
  console.log('- Set up regular backups');
  console.log('- Monitor logs and access');

  return true;
}

/**
 * Validate current environment
 */
async function validateCurrentEnvironment() {
  console.log('🔍 Validating current environment...');

  const { validate } = await import('../src/utils/env-validator.js');
  return validate();
}

/**
 * Show environment information
 */
function showEnvironmentInfo() {
  console.log('📊 Environment Information:');
  console.log('============================');
  console.log(`Node.js version: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Architecture: ${process.arch}`);
  console.log(`Current directory: ${process.cwd()}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);

  const envFiles = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
  ];
  console.log('\n📁 Environment files:');
  envFiles.forEach(file => {
    const exists = fs.existsSync(path.join(process.cwd(), file));
    console.log(`  ${file}: ${exists ? '✅' : '❌'}`);
  });
}

/**
 * Main setup function
 */
async function setup() {
  const command = process.argv[2];

  console.log('🚀 Strapi Environment Setup Tool');
  console.log('================================');

  switch (command) {
    case 'dev':
    case 'development':
      return createDevelopmentConfig();

    case 'prod':
    case 'production':
      return createProductionConfig();

    case 'validate':
      return await validateCurrentEnvironment();

    case 'info':
      showEnvironmentInfo();
      return true;

    default:
      console.log('\n📖 Usage:');
      console.log('  node scripts/setup-env.js <command>');
      console.log('\nCommands:');
      console.log('  dev, development  - Set up development environment');
      console.log(
        '  prod, production  - Set up production environment template'
      );
      console.log('  validate          - Validate current environment');
      console.log('  info              - Show environment information');
      console.log('\nExamples:');
      console.log('  node scripts/setup-env.js dev');
      console.log('  node scripts/setup-env.js production');
      console.log('  node scripts/setup-env.js validate');
      break;
  }
}

// Run the setup script
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = await setup();
  process.exit(success ? 0 : 1);
}

export {
  setup,
  createDevelopmentConfig,
  createProductionConfig,
  validateCurrentEnvironment,
  showEnvironmentInfo,
};
