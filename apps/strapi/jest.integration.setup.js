/**
 * Jest integration test setup
 * 
 * Configures test environment for script-based integration tests.
 * Tests run against a running Strapi dev server with test database.
 */

const http = require('http');


// Test timeout configuration
jest.setTimeout(30000); // 30 seconds

/**
 * Check if test server is running and healthy
 */
async function checkServerHealth() {
  return new Promise((resolve) => {
    const req = http.get(process.env.TEST_SERVER_URL, (res) => {
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
async function waitForServer(timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await checkServerHealth()) {
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return false;
}

// Global test utilities
global.testUtils = {
  // Test server utilities
  testServer: {
    url: process.env.TEST_SERVER_URL,
    host: process.env.TEST_SERVER_HOST,
    port: process.env.TEST_SERVER_PORT,
    
    async healthCheck() {
      return await checkServerHealth();
    },
    
    async waitForReady(timeout = 30000) {
      return await waitForServer(timeout);
    },
    
    async ensureRunning() {
      const isHealthy = await this.healthCheck();
      if (!isHealthy) {
        throw new Error(`Test server is not running at ${this.url}. Please run 'npm run test:integration:setup' first.`);
      }
      return true;
    }
  },
};

// Global setup - ensure server is running before tests
beforeAll(async () => {
  
  const isHealthy = await global.testUtils.testServer.healthCheck();
  
  if (!isHealthy) {
    console.error('❌ Test server is not running!');
    console.error('Please run one of the following commands:');
    console.error('  npm run test:integration:setup');
    console.error('  node scripts/run-integration-tests.js run');
    console.error('  node scripts/test-server.js ensure');
    throw new Error('Test server is not running. Please start it before running integration tests.');
  }
  
});

// Cleanup after each test (optional - for data cleanup)
afterEach(async () => {
  // Note: In script-based approach, we don't automatically clean up data
  // Tests should clean up their own data or use separate test data
  // This is by design to avoid interfering with the running server
});

// Cleanup after all tests (optional)
afterAll(async () => {
  // Note: In script-based approach, we don't automatically stop the server
  // The server can continue running for debugging or subsequent test runs
  // Use --keep-server flag in test runner to control this behavior
});
