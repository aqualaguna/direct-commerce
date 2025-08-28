// Jest setup file for Strapi testing

// Global Jest setup
global.jest = jest;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock process.env for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_CLIENT = 'sqlite';
process.env.DATABASE_FILENAME = ':memory:';

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

  // Helper to create mock Strapi instance
  createMockStrapi: (overrides = {}) => ({
    entityService: {
      findMany: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
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
};

// Setup test database cleanup
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});
