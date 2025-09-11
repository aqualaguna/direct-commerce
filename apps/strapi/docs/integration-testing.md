# Integration Testing Guide

This document describes the script-based integration testing approach for the Strapi ecommerce platform.

## Overview

The integration testing system uses a script-based approach where:
- The Strapi development server runs separately with a dedicated test database
- Tests run against the running server at `http://localhost:1337`
- The test database (`strapi_ecommerce_test`) is separate from development/production databases
- Scripts manage server startup, test execution, and cleanup

## Quick Start

### 1. Setup Test Environment

```bash
# Ensure test server is running with test database
npm run test:integration:setup

# Or manually start the test server
npm run test:integration:start
```

### 2. Run Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test file
node scripts/run-integration-tests.js test product

# Run with coverage
npm run test:integration:coverage

# Run in watch mode
npm run test:integration:watch
```

### 3. Check Server Status

```bash
# Check if test server is running
npm run test:integration:status

# Check server health
npm run test:integration:health
```

### 4. Stop Test Server

```bash
# Stop the test server
npm run test:integration:stop
```

## Architecture

### Test Database Configuration

The test environment uses a separate PostgreSQL database:
- **Database Name**: `strapi_ecommerce_test`
- **Host**: `localhost:5432`
- **User**: `strapi`
- **Password**: `strapi_password`

### Server Management

The test server management is handled by `scripts/test-server.js`:
- Starts Strapi dev server with test environment variables
- Monitors server health and readiness
- Handles server startup/shutdown
- Manages process cleanup

### Test Execution

Tests are executed by `scripts/run-integration-tests.js`:
- Sets up test environment variables
- Ensures test server is running
- Runs Jest integration tests
- Handles cleanup (optional)

## Scripts Reference

### Test Server Management

```bash
# Start test server
node scripts/test-server.js start

# Stop test server
node scripts/test-server.js stop

# Restart test server
node scripts/test-server.js restart

# Check server status
node scripts/test-server.js status

# Ensure server is running (start if not)
node scripts/test-server.js ensure

# Check server health
node scripts/test-server.js health
```

### Test Execution

```bash
# Run all integration tests
node scripts/run-integration-tests.js run

# Run specific test pattern
node scripts/run-integration-tests.js test product

# Run with coverage
node scripts/run-integration-tests.js coverage

# Run in watch mode
node scripts/run-integration-tests.js watch

# Show help
node scripts/run-integration-tests.js help
```

### Environment Management

```bash
# Set test environment variables
node scripts/test-env.js set

# Create .env.test file
node scripts/test-env.js create

# Validate test environment
node scripts/test-env.js validate

# Run all setup commands
node scripts/test-env.js setup
```

## Writing Integration Tests

### Basic Test Structure

```typescript
import request from 'supertest';

describe('Module Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  
  it('should test API endpoint', async () => {
    const response = await request(SERVER_URL)
      .get('/api/endpoint')
      .timeout(10000);
    
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
  });
});
```

### Test Data Management

```typescript
// Create test data
const testData = {
  name: 'Test Item',
  description: 'Test description'
};

const response = await request(SERVER_URL)
  .post('/api/items')
  .send({ data: testData })
  .timeout(10000);

const itemId = response.body.data.documentId;

// Clean up test data
await request(SERVER_URL)
  .delete(`/api/items/${itemId}`)
  .timeout(10000);
```

### Using Global Test Utilities

```typescript
// Check server health
const isHealthy = await global.testUtils.testServer.healthCheck();

// Create data via API helpers
const data = await global.testUtils.testData.createViaAPI('/items', testData);

// Get data via API helpers
const items = await global.testUtils.testData.getViaAPI('/items');
```

## Configuration Files

### Jest Integration Configuration

- **File**: `jest.integration.config.js`
- **Purpose**: Configures Jest for integration tests
- **Key Settings**: Test timeouts, server URL, coverage settings

### Jest Integration Setup

- **File**: `jest.integration.setup.js`
- **Purpose**: Sets up test environment and global utilities
- **Key Features**: Server health checks, test data helpers

### Test Environment Configuration

- **File**: `scripts/test-env.js`
- **Purpose**: Manages test environment variables
- **Key Features**: Database configuration, server settings

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Clean up test data after each test
- Use unique identifiers for test data
- Don't rely on data from other tests

### 2. Error Handling

- Always set appropriate timeouts (10 seconds minimum)
- Handle server unavailability gracefully
- Provide clear error messages
- Test both success and failure scenarios

### 3. Data Management

- Use descriptive test data names
- Include cleanup in test teardown
- Avoid hardcoded IDs
- Use factories for complex test data

### 4. Performance

- Keep tests focused and fast
- Use appropriate timeouts
- Avoid unnecessary API calls
- Clean up resources promptly

## Troubleshooting

### Server Not Running

```bash
# Check server status
npm run test:integration:status

# Start server if not running
npm run test:integration:start

# Check server health
npm run test:integration:health
```

### Database Connection Issues

```bash
# Validate test environment
node scripts/test-env.js validate

# Check database configuration
node scripts/test-env.js setup
```

### Test Failures

1. Check if server is running and healthy
2. Verify test database is accessible
3. Check test data cleanup
4. Review test timeouts
5. Check for port conflicts

### Port Conflicts

If port 1337 is already in use:

```bash
# Kill existing processes on port 1337
lsof -ti:1337 | xargs kill -9

# Or use the test server script
node scripts/test-server.js stop
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Setup Test Environment
  run: npm run test:integration:setup

- name: Run Integration Tests
  run: npm run test:integration:ci

- name: Cleanup
  run: npm run test:integration:stop
```

### Docker Integration

```dockerfile
# Test database setup
RUN createdb strapi_ecommerce_test

# Run integration tests
CMD ["npm", "run", "test:integration:ci"]
```

## Migration from Previous Approach

If migrating from the previous integration test infrastructure:

1. **Remove old test utilities**: Delete files like `test-db.ts`, `test-server.ts`, etc.
2. **Update test files**: Change from direct Strapi API calls to HTTP requests
3. **Update test scripts**: Use new npm scripts instead of direct Jest commands
4. **Update CI/CD**: Use new script-based approach in pipelines

## Support

For issues or questions about integration testing:

1. Check this documentation
2. Review test logs and error messages
3. Verify server and database status
4. Check environment configuration
5. Contact the development team
