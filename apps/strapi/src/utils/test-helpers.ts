/**
 * Test utilities for Strapi testing
 * Following Strapi official testing documentation
 */

export interface MockContext {
  state: { user?: any };
  params: Record<string, any>;
  query: Record<string, any>;
  request: { body: any };
  response: Record<string, any>;
  send: jest.Mock;
  badRequest: jest.Mock;
  unauthorized: jest.Mock;
  forbidden: jest.Mock;
  notFound: jest.Mock;
  internalServerError: jest.Mock;
}

export interface MockStrapi {
  entityService: {
    findMany: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  plugin: jest.Mock;
  log: {
    error: jest.Mock;
    warn: jest.Mock;
    info: jest.Mock;
    debug: jest.Mock;
  };
}

/**
 * Create a mock Strapi context for testing
 */
export const createMockContext = (
  overrides: Partial<MockContext> = {}
): MockContext => ({
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
});

/**
 * Create a mock Strapi instance for testing
 */
export const createMockStrapi = (
  overrides: Partial<MockStrapi> = {}
): MockStrapi => ({
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
});

/**
 * Create a mock user for testing
 */
export const createMockUser = (overrides: any = {}) => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: {
    id: 1,
    name: 'Authenticated',
    type: 'authenticated',
  },
  ...overrides,
});

/**
 * Create a mock product for testing
 */
export const createMockProduct = (overrides: any = {}) => ({
  id: 1,
  title: 'Test Product',
  slug: 'test-product',
  description: 'Test product description',
  price: 29.99,
  sku: 'TEST-001',
  inventory: 10,
  featured: false,
  inStock: true,
  publishedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock category for testing
 */
export const createMockCategory = (overrides: any = {}) => ({
  id: 1,
  name: 'Test Category',
  slug: 'test-category',
  description: 'Test category description',
  isActive: true,
  publishedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Wait for async operations to complete
 */
export const waitFor = (ms: number = 100): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock database operations
 */
export const mockDatabaseOperations = {
  findMany: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

/**
 * Reset all mocks
 */
export const resetMocks = () => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
};
