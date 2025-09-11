# Story X.1: Strapi Integration Test Infrastructure Setup

## Status
Ready for Review

## Story
**As a** development team,
**I want** a script-based integration test infrastructure that manages the Strapi dev server separately, uses a dedicated test database, and provides simple testing utilities,
**so that** we have a reliable foundation for implementing comprehensive integration tests across all Strapi modules without interfering with development workflows.

## Acceptance Criteria
1. Script-based integration test configuration is set up with Jest
2. Test database configuration supports PostgreSQL with proper isolation using separate `strapi_ecommerce_test` database
3. Script-based Strapi server management utilities are implemented
4. Integration tests run against live server at `http://localhost:1337` using `supertest`
5. Test environment variables are properly configured with `.env.test` file
6. Integration test scripts are added to package.json with proper separation from unit tests
7. Server health checks and startup/shutdown mechanisms work correctly
8. Integration tests are excluded from regular test commands to prevent interference

## Tasks / Subtasks

### Task 1: Script-Based Jest Integration Test Configuration (AC: 1, 6, 8)
- [x] Create integration test configuration in `apps/strapi/jest.integration.config.js`
- [x] Configure test environment and database settings for script-based approach
- [x] Set up test coverage reporting for integration tests
- [x] Add integration test scripts to `package.json` with proper separation
- [x] Configure test timeouts and performance settings
- [x] Exclude integration tests from regular test commands in `jest.config.js`

### Task 2: Script-Based Test Database Infrastructure (AC: 2)
- [x] Create test database setup script in `apps/strapi/scripts/setup-test-db.js`
- [x] Implement PostgreSQL test database creation and management
- [x] Set up separate `strapi_ecommerce_test` database for isolation
- [x] Create database connection validation utilities
- [x] Add database cleanup and reset capabilities

### Task 3: Script-Based Strapi Server Management (AC: 3, 7)
- [x] Implement server management script in `apps/strapi/scripts/test-server.js`
- [x] Create server startup/shutdown utilities with proper logging
- [x] Implement server health checks accepting 200/302 status codes
- [x] Add server configuration for test environment with `.env.test`
- [x] Create server logging and debugging utilities
- [x] Handle Strapi's stderr output properly (normal behavior)

### Task 4: Integration Test Runner Script (AC: 4, 7)
- [x] Create integration test runner script in `apps/strapi/scripts/run-integration-tests.js`
- [x] Implement test execution workflow with server management
- [x] Add support for specific test patterns and coverage
- [x] Create test cleanup and server management options
- [x] Add comprehensive error handling and logging

### Task 5: Test Environment Management (AC: 5, 6)
- [x] Create test environment setup script in `apps/strapi/scripts/test-env.js`
- [x] Create `.env.test` file generation script in `apps/strapi/scripts/create-test-env.js`
- [x] Set up test-specific database credentials and Strapi settings
- [x] Add environment validation and setup utilities
- [x] Create comprehensive integration testing documentation

### Task 6: Integration Test Setup and Utilities (AC: 4, 7)
- [x] Create Jest integration setup file in `apps/strapi/jest.integration.setup.js`
- [x] Implement global test utilities for server and API interaction
- [x] Add server health checks and readiness waiting
- [x] Create test data helpers for API calls using `supertest`
- [x] Set up proper test environment variable management

## Dev Notes

### Previous Story Insights
- Builds on existing Jest configuration from `apps/strapi/jest.config.js`
- Leverages established testing standards from `docs/architecture/test-standard.md`
- Integrates with existing Strapi 5 Document Service API patterns
- Provides foundation for all subsequent integration test stories

### Script-Based Testing Architecture
**Integration Test Approach** [Source: hello.integration.test.ts]
```typescript
// Simple Integration Test Pattern
import request from 'supertest';

describe('Integration Tests', () => {
  it('should test API endpoint', async () => {
    const response = await request('http://localhost:1337')
      .get('/api/endpoint')
      .timeout(5000);
    
    expect(response.status).toBe(200);
  });
});
```

**Script-Based Server Management** [Source: scripts/test-server.js]
```javascript
// Server Management Script
const { spawn } = require('child_process');
const { setupTestDatabase } = require('./setup-test-db');
const { createTestEnvFile } = require('./create-test-env');

async function startServer() {
  await setupTestDatabase(); // Ensure test DB exists
  createTestEnvFile(); // Generate .env.test
  serverProcess = spawn('npm', ['run', 'dev'], {
    env: { ...process.env, DATABASE_NAME: 'strapi_ecommerce_test' }
  });
}
```

**Test Database Configuration** [Source: scripts/setup-test-db.js]
```javascript
// Test Database Setup
const testDbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: 'strapi_ecommerce_test', // Separate test database
  username: process.env.DATABASE_USERNAME || 'strapi',
  password: process.env.DATABASE_PASSWORD || 'strapi_password',
};
```

### File Locations and Project Structure
**Script-Based Integration Test Infrastructure Structure**
```
apps/strapi/
├── jest.integration.config.js          # Jest config for integration tests
├── jest.integration.setup.js           # Jest setup for integration tests
├── jest.config.js                      # Main Jest config (excludes integration tests)
├── scripts/
│   ├── test-server.js                  # Server management script
│   ├── run-integration-tests.js        # Integration test runner
│   ├── setup-test-db.js                # Test database setup
│   ├── create-test-env.js              # .env.test file generation
│   └── test-env.js                     # Test environment setup
├── src/
│   └── api/
│       └── */__tests__/
│           └── *.integration.test.ts   # Integration test files
├── .env.test                           # Test environment variables
└── docs/
    └── integration-testing.md          # Integration testing documentation
```

### Testing Requirements
**Script-Based Integration Test Standards**
- Use real PostgreSQL database connection with separate `strapi_ecommerce_test` database
- Start Strapi dev server separately using `npm run dev` with test configuration
- Run tests against live server at `http://localhost:1337` using `supertest`
- Implement proper error handling and timeout management in scripts
- Use simple test data creation within tests (no complex factories)
- Implement test isolation through separate test database

**Performance Requirements**
- Server startup should complete in < 30 seconds
- Database setup should complete in < 5 seconds
- Test execution should run against live server without additional overhead
- Integration tests should be excluded from regular test runs

### Technical Constraints
**Strapi 5 Document Service API** [Source: architecture/test-standard.md#document-service-api-migration]
- Use Document Service API instead of deprecated Entity Service API
- Use `documentId` instead of numeric IDs
- Use `status` filters instead of `publishedAt` checks
- Handle content type relationships correctly

**Script-Based Database Management**
- Use separate `strapi_ecommerce_test` database for complete isolation
- Implement database creation and setup through scripts
- Handle database migrations through Strapi's built-in system
- Manage database connections through Strapi's configuration
- Use separate test database to prevent data corruption

**Server Management**
- Use `npm run dev` to start Strapi server with test configuration
- Handle Strapi's stderr output properly (normal behavior)
- Accept both 200 and 302 status codes for server health checks
- Manage server lifecycle through Node.js child processes

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2024-01-XX | 1.0 | Initial story creation | Scrum Master |

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4

### Debug Log References
- Integration test infrastructure design and implementation
- Database connection and transaction management
- Strapi server startup/shutdown optimization
- Test data factory implementation

### Completion Notes List
- Script-based integration testing infrastructure foundation
- Real PostgreSQL database integration with separate `strapi_ecommerce_test` database
- Automated server management using `npm run dev` with test configuration
- Simple test execution against live server at `http://localhost:1337`
- Comprehensive test environment configuration with `.env.test` file
- Jest integration test configuration with proper separation from unit tests
- Test database setup script with PostgreSQL database creation
- Strapi server management script with health checks (200/302 status codes)
- Integration test runner script with comprehensive workflow management
- Test environment setup scripts with proper variable management
- Server health checks and startup/shutdown mechanisms
- Proper handling of Strapi's stderr output (normal behavior)
- Integration tests excluded from regular test commands
- Complete integration testing documentation with usage examples
- Script-based approach prevents interference with development workflows

### File List
**New Files Created:**
- `apps/strapi/jest.integration.config.js` - Jest configuration for integration tests
- `apps/strapi/jest.integration.setup.js` - Jest setup file for integration tests
- `apps/strapi/scripts/test-server.js` - Server management script
- `apps/strapi/scripts/run-integration-tests.js` - Integration test runner script
- `apps/strapi/scripts/setup-test-db.js` - Test database setup script
- `apps/strapi/scripts/create-test-env.js` - .env.test file generation script
- `apps/strapi/scripts/test-env.js` - Test environment setup script
- `apps/strapi/docs/integration-testing.md` - Integration testing documentation
- `apps/strapi/.env.test` - Test environment variables file

**Modified Files:**
- `apps/strapi/package.json` - Added integration test scripts with proper separation
- `apps/strapi/jest.config.js` - Excluded integration tests from regular test commands

## Key Implementation Changes

### Script-Based Approach vs. In-Code Initialization
**Previous Approach (Removed):**
- Strapi server initialization within test files
- Complex test base classes and utilities
- In-memory database transactions
- Complex test data factories

**New Script-Based Approach:**
- Separate server management through scripts
- Simple `supertest` calls against live server
- Separate `strapi_ecommerce_test` database
- Simple test data creation within tests

### Benefits of Script-Based Approach
1. **Separation of Concerns**: Server management is separate from test logic
2. **Real Environment Testing**: Tests run against actual Strapi server
3. **Database Isolation**: Complete isolation through separate test database
4. **Development Workflow**: No interference with regular development
5. **Simplicity**: Easier to understand and maintain
6. **Debugging**: Can inspect live server state during test failures

### Available Commands
```bash
# Server Management
npm run test:integration:setup    # Ensure server is running
npm run test:integration:start    # Start test server
npm run test:integration:stop     # Stop test server
npm run test:integration:status   # Check server status
npm run test:integration:health   # Check server health

# Test Execution
npm run test:integration          # Run all integration tests
npm run test:integration:watch    # Run in watch mode
npm run test:integration:coverage # Run with coverage

# Database Management
npm run test:integration:db-setup # Setup test database
npm run test:integration:env-setup # Setup test environment
```

## QA Results
*To be populated by QA Agent after implementation review*
