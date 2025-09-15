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
  body?: any;
  send: jest.Mock;
  badRequest: jest.Mock;
  unauthorized: jest.Mock;
  forbidden: jest.Mock;
  notFound: jest.Mock;
  internalServerError: jest.Mock;
  conflict: jest.Mock;
  throw: jest.Mock;
  set: jest.Mock;
}

export interface MockDocumentMethods {
  findOne: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  count: jest.Mock;
  publish: jest.Mock;
  unpublish: jest.Mock;
  discardDraft: jest.Mock;
}

export interface MockStrapi {
  // Document Service API (Strapi v5)
  documents: jest.Mock;
  // Legacy Entity Service API (for backward compatibility)
  entityService: {
    findMany: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  plugin: jest.Mock;
  service: jest.Mock;
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
  conflict: jest.fn(),
  throw: jest.fn(),
  set: jest.fn(),
  ...overrides,
});

/**
 * Create mock document service methods
 */
export const createMockDocumentMethods = (): MockDocumentMethods => ({
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
});

/**
 * Create a mock Strapi instance for testing with Document Service API
 */
export const createMockStrapi = (
  overrides: Partial<MockStrapi> = {}
): MockStrapi => {
  const mockDocumentMethods = createMockDocumentMethods();

  return {
    // Document Service API (Strapi v5)
    documents: jest.fn(() => mockDocumentMethods),
    // Legacy Entity Service API (for backward compatibility)
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
    service: jest.fn(),
    log: {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    },
    ...overrides,
  };
};

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
 * Create a mock product for testing with Document Service API
 */
export const createMockProduct = (overrides: any = {}) => ({
  documentId: 'prod-123',
  id: 1, // Keep for backward compatibility
  title: 'Test Product',
  slug: 'test-product',
  description: 'Test product description',
  price: 29.99,
  sku: 'TEST-001',
  inventory: 10,
  featured: false,
  inStock: true,
  status: 'published', // Use status for Draft & Publish
  publishedAt: new Date(), // Keep for backward compatibility
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock category for testing with Document Service API
 */
export const createMockCategory = (overrides: any = {}) => ({
  documentId: 'cat-123',
  id: 1, // Keep for backward compatibility
  name: 'Test Category',
  slug: 'test-category',
  description: 'Test category description',
  isActive: true,
  status: 'published', // Use status for Draft & Publish
  publishedAt: new Date(), // Keep for backward compatibility
  createdAt: new Date(),
  updatedAt: new Date(),
  sortOrder: 0,
  parent: null,
  children: [],
  ...overrides,
});

/**
 * Wait for async operations to complete
 */
export const waitFor = (ms: number = 100): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock database operations for Document Service API
 */
export const mockDatabaseOperations = {
  findMany: jest.fn(),
  findOne: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  publish: jest.fn(),
  unpublish: jest.fn(),
  discardDraft: jest.fn(),
};

/**
 * Create test data factory for categories
 */
export const createTestCategoryData = (overrides: any = {}) => ({
  name: 'Test Category',
  description: 'Test category description',
  isActive: true,
  sortOrder: 0,
  ...overrides,
});

/**
 * Create test data factory for products
 */
export const createTestProductData = (overrides: any = {}) => ({
  title: 'Test Product',
  description: 'Test product description',
  price: 29.99,
  sku: 'TEST-001',
  inventory: 10,
  inStock: true,
  ...overrides,
});

/**
 * Retry mechanism for API calls with exponential backoff
 */
export const retryApiCall = async <T>(
  apiCall: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    retryCondition?: (error: any) => boolean;
  } = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 5000,
    retryCondition = (error: any) => error?.status === 429 || error?.response?.status === 429
  } = options;

  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      await waitFor(delay);
    }
  }
  
  throw lastError;
};

/**
 * Retry mechanism for API calls that return response objects
 */
export const retryApiRequest = async <T>(
  apiCall: () => Promise<{ status: number; body: any }>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    retryCondition?: (response: { status: number; body: any }) => boolean;
  } = {}
): Promise<{ status: number; body: any }> => {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 5000,
    retryCondition = (response) => response.status === 429
  } = options;

  let lastResponse: { status: number; body: any };
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await apiCall();
      lastResponse = response;
      
      // Check if we should retry
      if (attempt === maxRetries || !retryCondition(response)) {
        return response;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      await waitFor(delay);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      await waitFor(delay);
    }
  }
  
  return lastResponse!;
};

/**
 * Reset all mocks
 */
export const resetMocks = () => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
};
