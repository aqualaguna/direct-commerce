#!/usr/bin/env node

/**
 * Development Automation Script for Strapi Ecommerce Platform
 *
 * This script provides comprehensive development automation including
 * environment setup, database management, code quality checks, and testing.
 */

import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Execute a command and return the result
 */
function executeCommand(command, options = {}) {
  const { silent = false, cwd = process.cwd() } = options;

  if (!silent) {
    console.log(`🚀 Executing: ${command}`);
  }

  try {
    const result = execSync(command, {
      cwd,
      stdio: silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
    });
    return { success: true, output: result };
  } catch (error) {
    if (!silent) {
      console.error(`❌ Command failed: ${command}`);
      console.error(`Error: ${error.message}`);
    }
    return { success: false, error: error.message };
  }
}

/**
 * Check if a command is available
 */
function isCommandAvailable(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Full development setup
 */
async function fullDevelopmentSetup() {
  console.log('🚀 Starting full development setup...');
  console.log('=====================================');

  // Step 1: Environment validation
  console.log('\n📋 Step 1: Validating environment...');
  const envResult = executeCommand('npm run validate:env');
  if (!envResult.success) {
    console.error(
      '❌ Environment validation failed. Please fix the issues above.'
    );
    return false;
  }

  // Step 2: Database setup
  console.log('\n📋 Step 2: Setting up database...');
  const dbResult = executeCommand('npm run db:setup');
  if (!dbResult.success) {
    console.error(
      '❌ Database setup failed. Please check your database configuration.'
    );
    return false;
  }

  // Step 3: Code quality check
  console.log('\n📋 Step 3: Running code quality checks...');
  const qualityResult = executeCommand('npm run quality:auto');
  if (!qualityResult.success) {
    console.warn('⚠️  Code quality issues found. Please review and fix.');
  }

  // Step 4: Run tests
  console.log('\n📋 Step 4: Running tests...');
  const testResult = executeCommand('npm run test:auto');
  if (!testResult.success) {
    console.error('❌ Tests failed. Please fix the failing tests.');
    return false;
  }

  console.log('\n✅ Full development setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Run "npm run dev" to start the development server');
  console.log('2. Open http://localhost:1337/admin to access the admin panel');
  console.log('3. Run "npm run dev:quick" for quick development iterations');

  return true;
}

/**
 * Development workflow with hot reload
 */
function developmentWorkflow() {
  console.log('🔄 Starting development workflow with hot reload...');
  console.log('==================================================');

  // Start the development server
  const devProcess = spawn('npm', ['run', 'develop'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  // Set up file watching for additional automation
  const watcher = chokidar.watch(
    [
      'src/**/*.{js,ts,json}',
      'config/**/*.{js,ts,json}',
      '!src/**/*.test.{js,ts}',
      '!src/**/*.spec.{js,ts}',
    ],
    {
      ignored: /(node_modules|\.git|dist|build)/,
      persistent: true,
    }
  );

  let isRunningTests = false;

  watcher.on('change', async filepath => {
    console.log(`📝 File changed: ${filepath}`);

    // Debounce test execution
    if (isRunningTests) return;
    isRunningTests = true;

    setTimeout(async () => {
      console.log('🧪 Running tests after file change...');
      const testResult = executeCommand('npm run test:unit', { silent: true });

      if (testResult.success) {
        console.log('✅ Tests passed');
      } else {
        console.log('❌ Tests failed - check the output above');
      }

      isRunningTests = false;
    }, 1000);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping development workflow...');
    devProcess.kill();
    watcher.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Stopping development workflow...');
    devProcess.kill();
    watcher.close();
    process.exit(0);
  });
}

/**
 * Quick development start
 */
function quickDevelopmentStart() {
  console.log('⚡ Quick development start...');
  console.log('=============================');

  // Check if environment is set up
  if (!fs.existsSync(path.join(process.cwd(), '.env'))) {
    console.log('📝 Setting up environment...');
    const envResult = executeCommand('npm run setup:env');
    if (!envResult.success) {
      console.error('❌ Environment setup failed');
      return false;
    }
  }

  // Start development server
  console.log('🚀 Starting development server...');
  const devProcess = spawn('npm', ['run', 'develop'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping development server...');
    devProcess.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Stopping development server...');
    devProcess.kill();
    process.exit(0);
  });
}

/**
 * Database automation
 */
function databaseAutomation() {
  const command = process.argv[3];

  console.log('🗄️  Database Automation');
  console.log('======================');

  switch (command) {
    case 'setup':
      console.log('📋 Setting up database...');
      executeCommand('npm run db:setup');
      break;

    case 'reset':
      console.log('🔄 Resetting database...');
      executeCommand('npm run db:reset');
      break;

    case 'seed':
      console.log('🌱 Seeding database...');
      executeCommand('npm run db:seed');
      break;

    case 'migrate':
      console.log('📦 Running migrations...');
      executeCommand('npm run db:migrate');
      break;

    case 'status':
      console.log('📊 Database status...');
      executeCommand('npm run db:status');
      break;

    default:
      console.log('\n📖 Database commands:');
      console.log('  setup   - Set up database and run migrations');
      console.log('  reset   - Reset database (WARNING: destroys all data)');
      console.log('  seed    - Seed database with sample data');
      console.log('  migrate - Run pending migrations');
      console.log('  status  - Show database status');
      console.log('\nExample: node scripts/dev-automation.js db setup');
      break;
  }
}

/**
 * Code quality automation
 */
function codeQualityAutomation() {
  const command = process.argv[3];

  console.log('🔍 Code Quality Automation');
  console.log('==========================');

  switch (command) {
    case 'check':
      console.log('🔍 Running code quality checks...');
      executeCommand('npm run lint');
      executeCommand('npm run format:check');
      break;

    case 'fix':
      console.log('🔧 Fixing code quality issues...');
      executeCommand('npm run lint:fix');
      executeCommand('npm run format');
      break;

    case 'auto':
      console.log('🤖 Running automated code quality...');
      executeCommand('npm run quality:auto');
      break;

    default:
      console.log('\n📖 Code quality commands:');
      console.log('  check - Run linting and formatting checks');
      console.log('  fix   - Fix linting and formatting issues');
      console.log('  auto  - Run automated code quality workflow');
      console.log('\nExample: node scripts/dev-automation.js quality fix');
      break;
  }
}

/**
 * Testing automation
 */
function testingAutomation() {
  const command = process.argv[3];

  console.log('🧪 Testing Automation');
  console.log('=====================');

  switch (command) {
    case 'unit':
      console.log('🧪 Running unit tests...');
      executeCommand('npm run test:unit');
      break;

    case 'integration':
      console.log('🔗 Running integration tests...');
      executeCommand('npm run test:integration');
      break;

    case 'e2e':
      console.log('🌐 Running end-to-end tests...');
      executeCommand('npm run test:e2e');
      break;

    case 'coverage':
      console.log('📊 Running tests with coverage...');
      executeCommand('npm run test:coverage');
      break;

    case 'watch':
      console.log('👀 Running tests in watch mode...');
      executeCommand('npm run test:watch');
      break;

    case 'auto':
      console.log('🤖 Running automated testing...');
      executeCommand('npm run test:auto');
      break;

    default:
      console.log('\n📖 Testing commands:');
      console.log('  unit        - Run unit tests');
      console.log('  integration - Run integration tests');
      console.log('  e2e         - Run end-to-end tests');
      console.log('  coverage    - Run tests with coverage');
      console.log('  watch       - Run tests in watch mode');
      console.log('  auto        - Run automated testing workflow');
      console.log('\nExample: node scripts/dev-automation.js test unit');
      break;
  }
}

/**
 * Show development status
 */
function showDevelopmentStatus() {
  console.log('📊 Development Environment Status');
  console.log('==================================');

  // Check environment files
  const envFiles = ['.env', '.env.local', '.env.development'];
  console.log('\n📁 Environment files:');
  envFiles.forEach(file => {
    const exists = fs.existsSync(path.join(process.cwd(), file));
    console.log(`  ${file}: ${exists ? '✅' : '❌'}`);
  });

  // Check if database is accessible
  console.log('\n🗄️  Database status:');
  try {
    const dbResult = executeCommand('npm run db:status', { silent: true });
    if (dbResult.success) {
      console.log('  Database: ✅ Connected');
    } else {
      console.log('  Database: ❌ Not connected');
    }
  } catch {
    console.log('  Database: ❌ Status check failed');
  }

  // Check if tests pass
  console.log('\n🧪 Test status:');
  try {
    const testResult = executeCommand('npm run test:unit', { silent: true });
    if (testResult.success) {
      console.log('  Tests: ✅ Passing');
    } else {
      console.log('  Tests: ❌ Failing');
    }
  } catch {
    console.log('  Tests: ❌ Status check failed');
  }

  // Check code quality
  console.log('\n🔍 Code quality:');
  try {
    const lintResult = executeCommand('npm run lint', { silent: true });
    if (lintResult.success) {
      console.log('  Linting: ✅ Clean');
    } else {
      console.log('  Linting: ❌ Issues found');
    }
  } catch {
    console.log('  Linting: ❌ Status check failed');
  }
}

/**
 * Main automation function
 */
function automation() {
  const command = process.argv[2];

  console.log('🤖 Strapi Development Automation');
  console.log('================================');

  switch (command) {
    case 'setup':
      return fullDevelopmentSetup();

    case 'dev':
    case 'development':
      developmentWorkflow();
      break;

    case 'quick':
      quickDevelopmentStart();
      break;

    case 'db':
      databaseAutomation();
      break;

    case 'quality':
      codeQualityAutomation();
      break;

    case 'test':
      testingAutomation();
      break;

    case 'status':
      showDevelopmentStatus();
      break;

    default:
      console.log('\n📖 Usage:');
      console.log('  node scripts/dev-automation.js <command> [subcommand]');
      console.log('\nCommands:');
      console.log('  setup              - Full development setup');
      console.log(
        '  dev, development   - Development workflow with hot reload'
      );
      console.log('  quick              - Quick development start');
      console.log('  db                 - Database automation');
      console.log('  quality            - Code quality automation');
      console.log('  test               - Testing automation');
      console.log('  status             - Show development status');
      console.log('\nExamples:');
      console.log('  node scripts/dev-automation.js setup');
      console.log('  node scripts/dev-automation.js dev');
      console.log('  node scripts/dev-automation.js db setup');
      console.log('  node scripts/dev-automation.js quality fix');
      console.log('  node scripts/dev-automation.js test unit');
      break;
  }
}

// Run the automation script
if (import.meta.url === `file://${process.argv[1]}`) {
  automation();
}

export {
  automation,
  fullDevelopmentSetup,
  developmentWorkflow,
  quickDevelopmentStart,
  databaseAutomation,
  codeQualityAutomation,
  testingAutomation,
};
