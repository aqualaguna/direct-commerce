#!/usr/bin/env node

/**
 * Integration Test Runner Script
 * 
 * This script manages the complete integration test workflow:
 * 1. Sets up test environment
 * 2. Ensures test server is running with correct database
 * 3. Runs integration tests
 * 4. Cleans up after tests
 */

const { spawn } = require('child_process');
const path = require('path');
const { ensureServerRunning, stopServer, cleanTestDatabase } = require('./test-server');

/**
 * Run integration tests
 */
async function runIntegrationTests(testPattern = null) {
  console.log('🧪 Starting integration test run...');
  
  try {
    
    // Step 2: Ensure test server is running
    console.log('📋 Step 2: Ensuring test server is running...');
    const serverStatus = await ensureServerRunning();
    
    if (!serverStatus.running) {
      throw new Error('Failed to start test server');
    }
    
    // Step 2.5: Clean test database before running tests
    console.log('📋 Step 2.5: Cleaning test database...');
    try {
      await cleanTestDatabase();
    } catch (error) {
      console.warn('⚠️  Failed to clean test database, continuing with tests:', error.message);
    }
    
    // Step 3: Run integration tests
    console.log('📋 Step 3: Running integration tests...');
    const testResult = await runJestTests(testPattern);
    
    // Step 4: Clean up (optional - keep server running for debugging)
    const keepServer = true;
    if (!keepServer) {
      console.log('📋 Step 4: Cleaning up...');
      await stopServer();
    } else {
      console.log('📋 Step 4: Keeping server running (--keep-server flag)');
    }
    
    console.log('✅ Integration test run completed');
    return testResult;
    
  } catch (error) {
    console.error(`❌ Integration test run failed: ${error.message}`);
    
    // Clean up on error
    try {
      await stopServer();
    } catch (cleanupError) {
      console.error(`❌ Cleanup failed: ${cleanupError.message}`);
    }
    
    process.exit(1);
  }
}

/**
 * Run Jest integration tests
 */
function runJestTests(testPattern = null) {
  return new Promise((resolve, reject) => {
    const jestArgs = [
      '--config', 'jest.integration.config.js',
      '--forceExit',
      '--detectOpenHandles',
      '--verbose',
      '--runInBand',
    ];
    // Add test pattern if specified
    if (testPattern) {
      jestArgs.push('--testPathPatterns', testPattern);
    }
    
    // Add coverage if requested
    if (process.argv.includes('--coverage')) {
      jestArgs.push('--coverage');
    }
    
    // Add watch mode if requested
    if (process.argv.includes('--watch')) {
      jestArgs.push('--watch');
    }
    
    console.log(`🔬 Running Jest with args: ${jestArgs.join(' ')}`);
    
    const jestProcess = spawn('npx', ['jest', ...jestArgs], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env },
      stdio: 'inherit'
    });
    
    jestProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ All integration tests passed');
        resolve({ success: true, code });
      } else {
        console.log(`❌ Integration tests failed with code ${code}`);
        resolve({ success: false, code });
      }
    });
    
    jestProcess.on('error', (error) => {
      console.error(`❌ Failed to run Jest: ${error.message}`);
      reject(error);
    });
  });
}

/**
 * Run specific test file
 */
async function runSpecificTest(testFile) {
  console.log(`🎯 Running specific test: ${testFile}`);
  return await runIntegrationTests(testFile);
}

/**
 * Run tests with coverage
 */
async function runTestsWithCoverage() {
  console.log('📊 Running integration tests with coverage...');
  process.argv.push('--coverage');
  return await runIntegrationTests();
}

/**
 * Run tests in watch mode
 */
async function runTestsInWatchMode() {
  console.log('👀 Running integration tests in watch mode...');
  process.argv.push('--watch');
  return await runIntegrationTests();
}

/**
 * Main function
 */
async function main() {
  const command = process.argv[2];
  const testFile = process.argv[3];
  
  try {
    switch (command) {
      case 'run':
        await runIntegrationTests();
        break;
      case 'test':
        if (testFile) {
          await runSpecificTest(testFile);
        } else {
          await runIntegrationTests();
        }
        break;
      case 'coverage':
        await runTestsWithCoverage();
        break;
      case 'watch':
        await runTestsInWatchMode();
        break;
      case 'help':
        showHelp();
        break;
      default:
        // If no command is provided, treat the first argument as a test pattern
        if (command && !command.startsWith('--')) {
          console.log(`🎯 Running tests matching pattern: ${command}`);
          await runIntegrationTests(command);
        } else {
          if (command && !command.startsWith('--')) {
            console.log(`❌ Unknown command: ${command}`);
          }
          showHelp();
          process.exit(1);
        }
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log('Integration Test Runner');
  console.log('');
  console.log('Usage: node run-integration-tests.js [command|pattern] [options]');
  console.log('');
  console.log('Commands:');
  console.log('  run                    - Run all integration tests');
  console.log('  test [pattern]         - Run tests matching pattern');
  console.log('  coverage               - Run tests with coverage report');
  console.log('  watch                  - Run tests in watch mode');
  console.log('  help                   - Show this help message');
  console.log('');
  console.log('Direct Pattern Usage:');
  console.log('  [pattern]              - Run tests matching pattern directly');
  console.log('');
  console.log('Options:');
  console.log('  --keep-server          - Keep server running after tests');
  console.log('  --coverage             - Generate coverage report');
  console.log('  --watch                - Run in watch mode');
  console.log('');
  console.log('Examples:');
  console.log('  node run-integration-tests.js run');
  console.log('  node run-integration-tests.js test product');
  console.log('  node run-integration-tests.js category.test.ts');
  console.log('  node run-integration-tests.js coverage');
  console.log('  node run-integration-tests.js run --keep-server');
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, stopping server...');
  await stopServer();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, stopping server...');
  await stopServer();
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = {
  runIntegrationTests,
  runSpecificTest,
  runTestsWithCoverage,
  runTestsInWatchMode
};
