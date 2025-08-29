#!/usr/bin/env node

/**
 * Database Migration Script for Strapi Ecommerce Platform
 *
 * This script handles database migrations for different environments:
 * - Development: Uses SQLite in-memory database
 * - Production: Uses PostgreSQL database
 * - Testing: Uses SQLite in-memory database
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  development: {
    database: 'sqlite',
    filename: ':memory:',
    description: 'Development database (SQLite in-memory)',
  },
  test: {
    database: 'sqlite',
    filename: ':memory:',
    description: 'Test database (SQLite in-memory)',
  },
  production: {
    database: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || 5432,
    name: process.env.DATABASE_NAME || 'strapi_ecommerce',
    username: process.env.DATABASE_USERNAME || 'strapi',
    password: process.env.DATABASE_PASSWORD || 'strapi_password',
    description: 'Production database (PostgreSQL)',
  },
};

/**
 * Get environment from command line arguments or default to development
 */
function getEnvironment() {
  const args = process.argv.slice(2);
  const envIndex = args.findIndex(arg => arg === '--env' || arg === '-e');

  if (envIndex !== -1 && args[envIndex + 1]) {
    const env = args[envIndex + 1];
    if (config[env]) {
      return env;
    } else {
      console.error(`❌ Invalid environment: ${env}`);
      console.log('Available environments:', Object.keys(config).join(', '));
      process.exit(1);
    }
  }

  return 'development';
}

/**
 * Set environment variables for the specified environment
 */
function setEnvironmentVariables(env) {
  const envConfig = config[env];

  if (envConfig.database === 'sqlite') {
    process.env.DATABASE_CLIENT = 'sqlite';
    process.env.DATABASE_FILENAME = envConfig.filename;
  } else if (envConfig.database === 'postgres') {
    process.env.DATABASE_CLIENT = 'postgres';
    process.env.DATABASE_HOST = envConfig.host;
    process.env.DATABASE_PORT = envConfig.port;
    process.env.DATABASE_NAME = envConfig.name;
    process.env.DATABASE_USERNAME = envConfig.username;
    process.env.DATABASE_PASSWORD = envConfig.password;
  }

  process.env.NODE_ENV = env;
}

/**
 * Run Strapi database operations
 */
function runStrapiCommand(command, env) {
  try {
    console.log(`🔄 Running: ${command}`);
    execSync(command, {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: env },
    });
    console.log(`✅ ${command} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${command} failed:`, error.message);
    return false;
  }
}

/**
 * Display migration status
 */
function showStatus(env) {
  console.log('\n📊 Migration Status:');
  console.log(`Environment: ${env}`);
  console.log(`Database: ${config[env].description}`);

  if (env === 'production') {
    console.log(`Host: ${config[env].host}:${config[env].port}`);
    console.log(`Database: ${config[env].name}`);
  }
}

/**
 * Main migration function
 */
function migrate() {
  const env = getEnvironment();
  const action = process.argv[2];

  console.log('🚀 Strapi Database Migration Tool');
  console.log('================================');

  setEnvironmentVariables(env);
  showStatus(env);

  switch (action) {
    case 'migrate':
      console.log('\n🔄 Running database migrations...');
      if (runStrapiCommand('npx strapi database:migrate', env)) {
        console.log('✅ Database migrations completed successfully');
      } else {
        process.exit(1);
      }
      break;

    case 'seed':
      console.log('\n🌱 Running database seeding...');
      if (runStrapiCommand('npx strapi database:seed', env)) {
        console.log('✅ Database seeding completed successfully');
      } else {
        process.exit(1);
      }
      break;

    case 'reset':
      console.log('\n🔄 Resetting database...');
      if (runStrapiCommand('npx strapi database:reset', env)) {
        console.log('✅ Database reset completed successfully');
      } else {
        process.exit(1);
      }
      break;

    case 'bootstrap':
      console.log('\n🚀 Bootstrapping database (migrate + seed)...');
      if (
        runStrapiCommand('npx strapi database:migrate', env) &&
        runStrapiCommand('npx strapi database:seed', env)
      ) {
        console.log('✅ Database bootstrap completed successfully');
      } else {
        process.exit(1);
      }
      break;

    default:
      console.log('\n📖 Usage:');
      console.log('  node scripts/migrate.js <action> [--env <environment>]');
      console.log('\nActions:');
      console.log('  migrate   - Run database migrations');
      console.log('  seed      - Run database seeding');
      console.log(
        '  reset     - Reset database (WARNING: This will delete all data)'
      );
      console.log('  bootstrap - Run migrations and seeding');
      console.log('\nEnvironments:');
      console.log('  development (default)');
      console.log('  test');
      console.log('  production');
      console.log('\nExamples:');
      console.log('  node scripts/migrate.js migrate');
      console.log('  node scripts/migrate.js seed --env test');
      console.log('  node scripts/migrate.js bootstrap --env production');
      break;
  }
}

// Run the migration script
if (require.main === module) {
  migrate();
}

module.exports = { migrate, getEnvironment, setEnvironmentVariables };
