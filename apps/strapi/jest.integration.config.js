/**
 * Jest configuration for integration tests
 * 
 * This configuration is designed for script-based integration testing
 * where the Strapi dev server runs separately with test database.
 * Tests run against the running server at http://localhost:1337
 */

import baseConfig from './jest.config.js';

export default {
  ...baseConfig,
  
  // Integration test specific settings
  testMatch: [
    '**/*.integration.test.ts',
    '**/*.integration.test.js'
  ],
  
  // Longer timeout for integration tests (server communication)
  testTimeout: 30000, // 30 seconds
  
  // Setup files for integration tests
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/jest.integration.setup.js'
  ],
  
  // Coverage settings for integration tests
  collectCoverageFrom: [
    ...baseConfig.collectCoverageFrom,
    '!src/utils/test-*.ts', // Exclude test utilities from coverage
    '!src/utils/integration-test-base.ts',
    '!scripts/**', // Exclude test scripts
    '!**/__tests__/**' // Exclude test files themselves
  ],
  
  // Coverage thresholds for integration tests
  coverageThreshold: {
    global: {
      branches: 60, // Lower threshold for integration tests
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  
  // Test environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test',
    STRAPI_ENV: 'test',
    TEST_SERVER_URL: 'http://localhost:1337',
    TEST_DATABASE_NAME: 'strapi_ecommerce_test'
  },
  
  // Performance settings
  maxWorkers: 1, // Run integration tests sequentially to avoid conflicts
  forceExit: true,
  detectOpenHandles: true,
  
  // Verbose output for debugging
  verbose: true,
  
  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '.tmp',
    '.cache',
    '/dist/',
    '/build/',
    '/.strapi/',
    'unit',
    'e2e',
    'scripts' // Exclude test scripts
  ],
  
  // Module name mapping
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@/test-utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  
  // Global test configuration
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: {
        types: ['jest', 'node']
      }
    }
  },
  
  // Integration test specific globals
  testEnvironment: 'node',
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: false,
  
  // Test result processor
  testResultsProcessor: undefined,
  
  // Custom test environment
  testEnvironment: 'node'
};
