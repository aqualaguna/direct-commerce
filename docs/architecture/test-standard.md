# Test Standards

## Overview

This document defines the testing standards and best practices for the Strapi-based e-commerce platform. These standards ensure consistent, reliable, and maintainable test coverage across all components of the system.

## Table of Contents

1. [Test Configuration](#test-configuration)
2. [Test Structure](#test-structure)
3. [Naming Conventions](#naming-conventions)
4. [Test Categories](#test-categories)
5. [Mocking Standards](#mocking-standards)
6. [Assertion Patterns](#assertion-patterns)
7. [Coverage Requirements](#coverage-requirements)
8. [Test Data Management](#test-data-management)
9. [Performance Testing](#performance-testing)
10. [CI/CD Integration](#cicd-integration)

## Test Configuration

### Jest Configuration

The project uses Jest as the primary testing framework with the following configuration:

```javascript
// jest.config.js
export default {
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.test.{ts,js}',
    '!src/**/*.spec.{ts,js}',
    '!src/types/**',
    '!src/**/index.ts',
    '!src/**/index.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testTimeout: 10000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  testPathIgnorePatterns: [
    '/node_modules/',
    '.tmp',
    '.cache',
    '/dist/',
    '/build/',
    '/.strapi/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
  preset: 'ts-jest/presets/default-esm',
};
```

### Jest Setup

```javascript
// jest.setup.js
// Global Jest setup
global.jest = jest;

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
```

## Test Structure

### File Organization

```
src/
├── api/
│   └── product/
│       ├── controllers/
│       │   ├── product.ts
│       │   └── product.test.ts
│       ├── services/
│       │   ├── product.ts
│       │   ├── product.test.ts
│       │   ├── product-validation.ts
│       │   └── product-validation.test.ts
│       └── routes/
│           ├── product.ts
│           └── product.test.ts
├── policies/
│   ├── is-admin.ts
│   ├── is-admin.test.ts
│   ├── is-authenticated.ts
│   └── is-authenticated.test.ts
└── middlewares/
    ├── security.ts
    └── security.test.ts
```

### Test File Structure

Each test file should follow this structure:

```typescript
/**
 * [Component Name] tests
 * 
 * Tests for [brief description of what this component does]
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
jest.mock('../path/to/dependency');

// Mock Strapi instance
const mockStrapi = {
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
  service: jest.fn().mockReturnValue({
    // Mock service methods
  }),
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
};

// Mock Strapi factories
jest.mock('@strapi/strapi', () => ({
  factories: {
    createCoreController: jest.fn((serviceName, controllerFunction) => {
      return controllerFunction({ strapi: mockStrapi });
    }),
    createCoreService: jest.fn((serviceName, serviceFunction) => {
      return serviceFunction({ strapi: mockStrapi });
    }),
  },
}));

describe('[Component Name]', () => {
  let component: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Import the actual component
    const componentModule = require('./component').default;
    component = componentModule;
  });

  describe('[Method/Function Name]', () => {
    it('should [expected behavior]', async () => {
      // Arrange
      const mockData = { /* test data */ };
      mockStrapi.entityService.findOne.mockResolvedValue(mockData);

      // Act
      const result = await component.methodName(params);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockStrapi.entityService.findOne).toHaveBeenCalledWith(
        expectedParams
      );
    });

    it('should handle [error condition]', async () => {
      // Arrange
      mockStrapi.entityService.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(component.methodName(params)).rejects.toThrow(
        'Expected error message'
      );
    });
  });
});
```

## Naming Conventions

### File Names
- Test files: `[component-name].test.ts` or `[component-name].spec.ts`
- Use kebab-case for file names
- Place test files in the same directory as the source file

### Test Descriptions
- Use descriptive, behavior-focused test names
- Follow the pattern: `should [expected behavior]`
- Use present tense
- Be specific about the scenario being tested

```typescript
// Good
it('should return products with pagination', async () => {});
it('should allow admin to see unpublished products', async () => {});
it('should return 404 for non-existent product', async () => {});

// Bad
it('works', async () => {});
it('returns data', async () => {});
it('handles error', async () => {});
```

### Variable Names
- Use descriptive names for test data
- Prefix mock data with `mock`
- Use clear, intention-revealing names

```typescript
// Good
const mockProduct = { id: 1, title: 'Test Product', price: 29.99 };
const mockUpdatedProduct = { ...mockProduct, status: 'active' };
const ctx = { params: { id: 1 }, state: { user: null } };

// Bad
const data = { id: 1 };
const result = { ...data };
const context = { params: { id: 1 } };
```

## Test Categories

### Unit Tests
- Test individual functions and methods in isolation
- Mock all external dependencies
- Focus on business logic and edge cases
- Fast execution (< 100ms per test)

### Integration Tests
- Test interactions between components
- Use real database connections (test database)
- Test API endpoints with actual HTTP requests
- May take longer to execute

### End-to-End Tests
- Test complete user workflows
- Use real browser automation
- Test the entire application stack
- Slowest execution time

## Mocking Standards

### Strapi Document Service Mocking

```typescript
const mockStrapi = {
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
  service: jest.fn().mockReturnValue({
    // Mock service methods as needed
  }),
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
};
```

### Context Mocking

```typescript
const mockContext = {
  state: { user: { id: 1, role: { type: 'admin' } } },
  params: { id: '1' },
  query: { page: 1, pageSize: 10 },
  request: { body: { data: productData } },
  response: {},
  send: jest.fn(),
  badRequest: jest.fn(),
  unauthorized: jest.fn(),
  forbidden: jest.fn(),
  notFound: jest.fn(),
  internalServerError: jest.fn(),
  set: jest.fn(),
  throw: jest.fn(),
};
```

### Service Mocking

```typescript
// Mock service dependencies
jest.mock('./product-validation', () => ({
  __esModule: true,
  default: {
    validateStatusTransition: jest.fn().mockResolvedValue({ isValid: true }),
  },
}));

// Reset mocks in beforeEach
beforeEach(() => {
  jest.clearAllMocks();
  
  const productValidationService = require('./product-validation').default;
  productValidationService.validateStatusTransition.mockResolvedValue({
    isValid: true,
    errors: [],
  });
});
```

## Assertion Patterns

### Success Cases
```typescript
it('should return products with pagination', async () => {
  const mockProducts = [
    { documentId: 'doc1', title: 'Product 1', price: 29.99 },
    { documentId: 'doc2', title: 'Product 2', price: 39.99 },
  ];

  mockStrapi.documents('api::product.product').findMany.mockResolvedValue(mockProducts);

  const result = await service.findByStatus('published');

  expect(result).toEqual(mockProducts);
  expect(mockStrapi.documents).toHaveBeenCalledWith('api::product.product');
  expect(mockStrapi.documents('api::product.product').findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      filters: { status: 'published' },
      sort: { createdAt: 'desc' },
      pagination: { page: 1, pageSize: 25 },
    })
  );
});
```

### Error Cases
```typescript
it('should throw error for non-existent product', async () => {
  mockStrapi.documents('api::product.product').findOne.mockResolvedValue(null);

  await expect(service.updateStatus('non-existent-doc-id', 'published')).rejects.toThrow(
    'Product not found'
  );
});
```

### Partial Success Cases
```typescript
it('should handle partial failures', async () => {
  mockStrapi.documents('api::product.product').findOne
    .mockResolvedValueOnce({ documentId: 'doc1', status: 'draft' })
    .mockResolvedValueOnce(null);
  mockStrapi.documents('api::product.product').update.mockResolvedValueOnce({
    documentId: 'doc1',
    title: 'Product 1',
    status: 'published',
  });

  const result = await service.bulkUpdateStatus(['doc1', 'doc2'], 'published');

  expect(result.success).toBe(1);
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0].documentId).toBe('doc2');
});
```

## Coverage Requirements

### Minimum Coverage Thresholds
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Coverage Exclusions
- Test files themselves
- Type definition files
- Index files (barrel exports)
- Generated files

### Coverage Reporting
- HTML report for detailed analysis
- LCOV format for CI/CD integration
- Console output for quick feedback

## Test Data Management

### Test Data Creation
```typescript
const createTestProduct = (overrides = {}) => ({
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
});
```

const createTestUser = (overrides = {}) => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: { type: 'authenticated' },
  ...overrides,
});
```

### Test Data Cleanup
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  // Reset database state if needed
});

afterEach(() => {
  jest.restoreAllMocks();
  // Clean up any test data
});

afterAll(async () => {
  // Clean up any persistent test data
});
```

## Performance Testing

### Test Performance Guidelines
- Unit tests should complete in < 100ms
- Integration tests should complete in < 5s
- E2E tests should complete in < 30s
- Total test suite should complete in < 10 minutes

### Performance Test Examples
```typescript
describe('Performance Tests', () => {
  it('should handle large datasets efficiently', async () => {
    const startTime = Date.now();
    
    const result = await service.bulkUpdateStatus(
      Array.from({ length: 1000 }, (_, i) => i + 1),
      'active'
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(5000); // 5 seconds
    expect(result.success).toBe(1000);
  });
});
```

## CI/CD Integration

### Test Scripts
```json
{
  "scripts": {
    "test": "jest --forceExit --detectOpenHandles",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand --no-cache",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e"
  }
}
```

### CI Pipeline Integration
```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    npm run test:ci
    npm run lint
    npm run format:check

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
    flags: unittests
    name: codecov-umbrella
```

## Best Practices

### Test Organization
1. **Arrange**: Set up test data and mocks
2. **Act**: Execute the code being tested
3. **Assert**: Verify the expected outcomes

### Test Isolation
- Each test should be independent
- Use `beforeEach` to reset state
- Avoid shared state between tests
- Mock external dependencies consistently

### Test Maintainability
- Keep tests simple and focused
- Use descriptive test names
- Extract common test utilities
- Document complex test scenarios

### Error Testing
- Test both success and failure paths
- Verify error messages are meaningful
- Test edge cases and boundary conditions
- Ensure proper error handling

### Mock Management
- Mock at the right level (unit vs integration)
- Keep mocks simple and focused
- Reset mocks between tests
- Use realistic mock data

## Common Patterns

### Controller Testing Pattern
```typescript
describe('Controller Method', () => {
  it('should handle successful request', async () => {
    const mockData = createTestData();
    mockStrapi.documents('api::entity.entity').findOne.mockResolvedValue(mockData);

    const ctx = createMockContext({ params: { documentId: 'doc123' } });
    const result = await controller.methodName(ctx);

    expect(result.data).toEqual(mockData);
    expect(mockStrapi.documents).toHaveBeenCalledWith('api::entity.entity');
    expect(mockStrapi.documents('api::entity.entity').findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'doc123'
      })
    );
  });

  it('should handle not found', async () => {
    mockStrapi.documents('api::entity.entity').findOne.mockResolvedValue(null);

    const ctx = createMockContext({ params: { documentId: 'non-existent' } });
    await controller.methodName(ctx);

    expect(ctx.notFound).toHaveBeenCalledWith('Entity not found');
  });
});
```

### Service Testing Pattern
```typescript
describe('Service Method', () => {
  it('should perform business logic correctly', async () => {
    const input = createTestInput();
    const expectedOutput = createExpectedOutput();
    
    mockStrapi.documents('api::entity.entity').create.mockResolvedValue(expectedOutput);

    const result = await service.methodName(input);

    expect(result).toEqual(expectedOutput);
    expect(mockStrapi.documents).toHaveBeenCalledWith('api::entity.entity');
    expect(mockStrapi.documents('api::entity.entity').create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: input,
        populate: expect.any(Object),
      })
    );
  });
});
```

### Policy Testing Pattern
```typescript
describe('Policy', () => {
  it('should allow access for authorized users', () => {
    const ctx = createMockContext({
      state: { user: createTestUser({ role: { type: 'admin' } }) },
    });

    const result = policy(ctx, {}, {});

    expect(result).toBe(true);
  });

  it('should deny access for unauthorized users', () => {
    const ctx = createMockContext({ state: { user: null } });

    const result = policy(ctx, {}, {});

    expect(result).toBe(false);
  });
});
```

## Document Service API Migration

### Key Changes for Strapi 5

When migrating from Entity Service API to Document Service API, update your tests accordingly:

```typescript
// ❌ DEPRECATED - Entity Service API (Strapi v4)
const mockStrapi = {
  entityService: {
    findOne: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }
};

// ✅ NEW - Document Service API (Strapi v5)
const mockStrapi = {
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
  }))
};

// ❌ DEPRECATED - Using numeric IDs
const product = await strapi.entityService.findOne('api::product.product', 1);

// ✅ NEW - Using documentId
const product = await strapi.documents('api::product.product').findOne({
  documentId: 'a1b2c3d4e5f6g7h8i9j0klm'
});

// ❌ DEPRECATED - publishedAt checks
const products = await strapi.entityService.findMany('api::product.product', {
  filters: { publishedAt: { $notNull: true } }
});

// ✅ NEW - status filters
const products = await strapi.documents('api::product.product').findMany({
  filters: { status: 'published' }
});
```

### Testing Draft & Publish Operations

```typescript
describe('Draft & Publish Operations', () => {
  it('should publish a draft product', async () => {
    const mockProduct = { documentId: 'doc123', status: 'draft' };
    const mockPublishedProduct = { ...mockProduct, status: 'published' };
    
    mockStrapi.documents('api::product.product').publish.mockResolvedValue({
      documentId: 'doc123',
      entries: [mockPublishedProduct]
    });

    const result = await service.publishProduct('doc123');

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].status).toBe('published');
    expect(mockStrapi.documents('api::product.product').publish).toHaveBeenCalledWith({
      documentId: 'doc123'
    });
  });

  it('should unpublish a published product', async () => {
    const mockProduct = { documentId: 'doc123', status: 'published' };
    const mockUnpublishedProduct = { ...mockProduct, status: 'draft' };
    
    mockStrapi.documents('api::product.product').unpublish.mockResolvedValue({
      documentId: 'doc123',
      entries: [mockUnpublishedProduct]
    });

    const result = await service.unpublishProduct('doc123');

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].status).toBe('draft');
    expect(mockStrapi.documents('api::product.product').unpublish).toHaveBeenCalledWith({
      documentId: 'doc123'
    });
  });
});
```

## Conclusion

Following these testing standards ensures:
- **Consistency**: All tests follow the same patterns and conventions
- **Reliability**: Tests are robust and provide accurate feedback
- **Maintainability**: Tests are easy to understand and modify
- **Coverage**: Comprehensive testing of all critical functionality
- **Performance**: Tests run efficiently in CI/CD pipelines
- **Future-Proof**: Tests use the latest Strapi 5 Document Service API

Regular review and updates of these standards help maintain high-quality test coverage as the codebase evolves.
