// Jest setup file for Strapi testing
require('dotenv').config({ path: './.env.test', quiet: true }); // Adjust path if your .env file is named differently or located elsewhere
// Global Jest setup
global.jest = jest;

// Mock console methods to reduce noise in tests
// global.console = {
//   ...console,
// //   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Mock process.env for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_CLIENT = 'postgres';
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_PORT = '5432';
process.env.DATABASE_NAME = 'strapi_test';
process.env.DATABASE_USERNAME = 'strapi';
process.env.DATABASE_PASSWORD = 'strapi_password';
process.env.DATABASE_SSL = 'false';

// Global test utilities
global.testUtils = {
  // Helper to create mock Strapi context
  createMockContext: (overrides = {}) => ({
    state: { user: null },
    params: {},
    query: {},
    request: { body: {} },
    response: {},
    send: jest.fn(),
    badRequest: jest.fn(),
    unauthorized: jest.fn(),
    forbidden: jest.fn(),
    notFound: jest.fn(),
    internalServerError: jest.fn(),
    ...overrides,
  }),

  // Helper to create mock Strapi instance with Document Service API
  createMockStrapi: (overrides = {}) => ({
    // New Document Service API (Strapi 5+)
    documents: jest.fn((contentType) => ({
      findOne: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      publish: jest.fn(),
      unpublish: jest.fn(),
      discardDraft: jest.fn(),
    })),
    // Legacy Entity Service API (for backward compatibility during migration)
    entityService: {
      findMany: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    service: jest.fn().mockReturnValue({
      // Mock service methods
    }),
    plugin: jest.fn(() => ({
      service: jest.fn(),
    })),
    log: {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    },
    ...overrides,
  }),

  // Helper to create test product data
  createTestProduct: (overrides = {}) => ({
    documentId: 'test-doc-123',
    title: 'Test Product',
    description: 'Test description',
    shortDescription: 'Test short desc',
    price: 29.99,
    sku: 'TEST-001',
    inventory: 10,
    status: 'draft',
    publishedAt: null,
    ...overrides,
  }),

  // Helper to create test user data
  createTestUser: (overrides = {}) => ({
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: { type: 'authenticated' },
    ...overrides,
  }),

  // Helper to create test category data
  createTestCategory: (overrides = {}) => ({
    documentId: 'test-cat-123',
    name: 'Test Category',
    slug: 'test-category',
    description: 'Test category description',
    status: 'published',
    ...overrides,
  }),
};

// Setup test database cleanup
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});
