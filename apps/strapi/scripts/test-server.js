#!/usr/bin/env node

/**
 * Test Server Management Script
 * 
 * This script manages the Strapi development server for integration tests.
 * It ensures the server runs with the correct test database configuration
 * and provides utilities to start, stop, and check server status.
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Client } = require('pg');

// Server management state
let serverProcess = null;
let serverPid = null;
const SERVER_URL = 'http://localhost:1337';
const SERVER_STARTUP_TIMEOUT = 30000; // 30 seconds
const SERVER_CHECK_INTERVAL = 1000; // 1 second

/**
 * Create test database if it doesn't exist
 */
async function ensureTestDatabase() {
  const testDbConfig = {
    host: 'localhost',
    port: 5432,
    user: 'strapi',
    password: 'strapi_password',
    database: 'postgres' // Connect to default postgres database to create test db
  };

  const client = new Client(testDbConfig);
  
  try {
    await client.connect();
    console.log('🔗 Connected to PostgreSQL server');
    
    // Check if test database exists
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'strapi_ecommerce_test'"
    );
    
    if (result.rows.length === 0) {
      console.log('📦 Creating test database: strapi_ecommerce_test');
      await client.query('CREATE DATABASE strapi_ecommerce_test');
      console.log('✅ Test database created successfully');
    } else {
      console.log('✅ Test database already exists');
    }
  } catch (error) {
    console.error('❌ Failed to create test database:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Check if server is running and responding
 */
function checkServerHealth() {
  return new Promise((resolve) => {
    const req = http.get(SERVER_URL, (res) => {
      // Accept 200 (OK) or 302 (Redirect) as healthy responses
      resolve(res.statusCode === 200 || res.statusCode === 302);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Wait for server to be ready
 */
async function waitForServer(timeout = SERVER_STARTUP_TIMEOUT) {
  console.log('⏳ Waiting for server to be ready...');
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await checkServerHealth()) {
      console.log('✅ Server is ready and responding');
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, SERVER_CHECK_INTERVAL));
  }
  
  console.error('❌ Server failed to start within timeout period');
  return false;
}

/**
 * Start the Strapi development server with test environment
 */
async function startServer() {
  console.log('🚀 Starting Strapi development server for tests...');
  
  // Ensure test database exists
  try {
    await ensureTestDatabase();
  } catch (error) {
    console.error('❌ Failed to setup test database:', error.message);
    throw error;
  }
  
  // Note: Database schema will be created automatically when Strapi starts
  console.log('💡 Database schema will be created when Strapi server starts');
  
  // Check if server is already running
  if (await checkServerHealth()) {
    console.log('✅ Server is already running');
    return true;
  }
  
  // Kill any existing server processes
  await killExistingServer();
  
  // Start new server process
  return new Promise((resolve, reject) => {
    console.log('🔧 Starting server with test database configuration...');
    
    // Set up test environment variables
    let envVars = { 
      ...process.env,
      // Test database configuration
      DATABASE_CLIENT: 'postgres',
      DATABASE_HOST: 'localhost',
      DATABASE_PORT: '5432',
      DATABASE_NAME: 'strapi_ecommerce_test',
      DATABASE_USERNAME: 'strapi',
      DATABASE_PASSWORD: 'strapi_password',
      DATABASE_SSL: 'false',
      DATABASE_SSL_REJECT_UNAUTHORIZED: 'false',
      // Test environment
      NODE_ENV: 'test',
      // Test application keys (using simple test values)
      APP_KEYS: 'test-app-key-1,test-app-key-2',
      API_TOKEN_SALT: 'test-api-token-salt',
      ADMIN_JWT_SECRET: 'test-admin-jwt-secret',
      JWT_SECRET: 'test-jwt-secret',
      TRANSFER_TOKEN_SALT: 'test-transfer-token-salt',
      // Disable rate limiting for tests
      RATE_LIMIT_ENABLED: 'false',
      // Disable auto-reload for tests
      AUTO_RELOAD: 'false'
    };
    
    console.log('📄 Configured test environment variables');
    
    serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, '..'),
      env: envVars,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    serverPid = serverProcess.pid;
    
    // Log server output (Strapi writes most output to stderr, which is normal)
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.trim()) {
        console.log(`📡 Server stdout: ${output.trim()}`);
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      // Most Strapi output goes to stderr, which is normal
      if (output.includes('Server started') || output.includes('ready') || output.includes('Local: http://localhost:1337') || output.includes('Strapi started successfully')) {
        console.log('✅ Server startup detected');
      } else if (output.includes('EADDRINUSE')) {
        console.log('⚠️  Port 1337 is already in use, attempting to use existing server...');
      } else if (output.includes('error') || output.includes('Error') || output.includes('ERROR')) {
        console.error(`❌ Server error detected: ${output.trim()}`);
      } else {
        // Normal Strapi development output - just show without error prefix
        console.log(`📡 ${output.trim()}`);
      }
    });
    
    serverProcess.on('error', (error) => {
      console.error(`❌ Failed to start server: ${error.message}`);
      reject(error);
    });
    
    serverProcess.on('exit', (code, signal) => {
      if (code !== 0) {
        console.error(`❌ Server exited with code ${code} and signal ${signal}`);
        reject(new Error(`Server exited with code ${code} and signal ${signal}`));
      }
    });
    
    // Wait for server to be ready
    setTimeout(async () => {
      const isReady = await waitForServer();
      if (isReady) {
        console.log('✅ Test server started successfully');
        resolve(true);
      } else {
        reject(new Error('Server failed to start'));
      }
    }, 2000); // Give server 2 seconds to start
  });
}

/**
 * Stop the Strapi development server
 */
async function stopServer() {
  console.log('🛑 Stopping test server...');
  
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
    serverPid = null;
    console.log('✅ Test server stopped');
  } else {
    // Try to kill any existing server on port 1337
    await killExistingServer();
  }
}

/**
 * Kill any existing server processes
 */
async function killExistingServer() {
  return new Promise((resolve) => {
    exec('lsof -ti:1337', (error, stdout) => {
      if (stdout.trim()) {
        const pids = stdout.trim().split('\n');
        console.log(`🔪 Killing existing server processes: ${pids.join(', ')}`);
        
        pids.forEach(pid => {
          try {
            process.kill(pid, 'SIGTERM');
          } catch (err) {
            // Process might already be dead
          }
        });
        
        // Wait a bit for processes to die
        setTimeout(resolve, 2000);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Check server status
 */
async function getServerStatus() {
  const isRunning = await checkServerHealth();
  return {
    running: isRunning,
    url: SERVER_URL,
    pid: serverPid
  };
}

/**
 * Ensure server is running (start if not)
 */
async function ensureServerRunning() {
  const status = await getServerStatus();
  
  if (!status.running) {
    console.log('🔄 Server not running, starting...');
    await startServer();
  } else {
    console.log('✅ Server is already running');
  }
  
  return await getServerStatus();
}

/**
 * Main function
 */
async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'start':
        await startServer();
        break;
      case 'stop':
        await stopServer();
        break;
      case 'restart':
        await stopServer();
        await startServer();
        break;
      case 'status':
        const status = await getServerStatus();
        console.log(`Server status: ${status.running ? 'Running' : 'Stopped'}`);
        console.log(`URL: ${status.url}`);
        if (status.pid) {
          console.log(`PID: ${status.pid}`);
        }
        break;
      case 'ensure':
        await ensureServerRunning();
        break;
      case 'health':
        const isHealthy = await checkServerHealth();
        console.log(`Server health: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);
        process.exit(isHealthy ? 0 : 1);
        break;
      default:
        console.log('Usage: node test-server.js [start|stop|restart|status|ensure|health]');
        console.log('');
        console.log('Commands:');
        console.log('  start   - Start the test server');
        console.log('  stop    - Stop the test server');
        console.log('  restart - Restart the test server');
        console.log('  status  - Check server status');
        console.log('  ensure  - Ensure server is running (start if not)');
        console.log('  health  - Check server health (exit code 0 if healthy)');
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
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
  startServer,
  stopServer,
  getServerStatus,
  ensureServerRunning,
  checkServerHealth,
  killExistingServer,
  ensureTestDatabase
};
