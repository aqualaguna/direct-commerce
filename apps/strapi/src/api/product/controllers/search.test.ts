/**
 * Product search controller tests
 *
 * Tests for search controller endpoints and request handling
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock search service
const mockSearchService = {
  fullTextSearch: jest.fn() as jest.MockedFunction<any>,
  getSearchSuggestions: jest.fn() as jest.MockedFunction<any>,
  getPopularSearchTerms: jest.fn() as jest.MockedFunction<any>,
};

// Mock filter service
const mockFilterService = {
  validateFilterParams: jest.fn() as jest.MockedFunction<any>,
  getAvailableFilters: jest.fn() as jest.MockedFunction<any>,
};

// Mock Strapi with Document Service API
const mockStrapi = {
  contentType: jest.fn().mockReturnValue({
    kind: 'collectionType',
  }),
  documents: jest.fn(contentType => ({
    findOne: jest.fn() as jest.MockedFunction<any>,
    findFirst: jest.fn() as jest.MockedFunction<any>,
    findMany: jest.fn() as jest.MockedFunction<any>,
    create: jest.fn() as jest.MockedFunction<any>,
    update: jest.fn() as jest.MockedFunction<any>,
    delete: jest.fn() as jest.MockedFunction<any>,
    count: jest.fn() as jest.MockedFunction<any>,
    publish: jest.fn() as jest.MockedFunction<any>,
    unpublish: jest.fn() as jest.MockedFunction<any>,
    discardDraft: jest.fn() as jest.MockedFunction<any>,
  })),
  service: jest.fn(serviceName => {
    if (serviceName === 'api::product.search') {
      return mockSearchService;
    }
    if (serviceName === 'api::product.filter') {
      return mockFilterService;
    }
    return {};
  }),
  db: {
    query: jest.fn(() => ({
      findMany: jest.fn() as jest.MockedFunction<any>,
    })),
  },
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
    createCoreController: jest.fn() as jest.MockedFunction<any>,
  },
}));

describe('Product Search Controller', () => {
  let searchController: any;
  let mockContext: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mock return values (will be overridden in specific tests)
    mockFilterService.validateFilterParams.mockReturnValue({});
    mockFilterService.getAvailableFilters.mockResolvedValue({
      categories: [
        { id: 1, name: 'Electronics', slug: 'electronics' },
        { id: 2, name: 'Clothing', slug: 'clothing' },
      ],
      priceRange: { min: 10.99, max: 49.99 },
      inventoryOptions: [],
    });

    // Set up the factory mock
    const { factories } = require('@strapi/strapi');
    (
      factories.createCoreController as jest.MockedFunction<any>
    ).mockImplementation((serviceName, controllerFunction) => {
      return controllerFunction({ strapi: mockStrapi });
    });

    // Import the search controller
    const searchControllerModule = require('./search').default;
    searchController = searchControllerModule;

    // Create mock context
    mockContext = {
      query: {},
      send: jest.fn(),
      badRequest: jest.fn(),
      internalServerError: jest.fn(),
    };
  });

  describe('search', () => {
    it('should handle basic search request', async () => {
      const mockResults = {
        data: [
          {
            id: 1,
            title: 'Test Product',
            price: 29.99,
          },
        ],
        meta: {
          pagination: {
            page: 1,
            pageSize: 25,
            pageCount: 1,
            total: 1,
          },
        },
      };

      mockSearchService.fullTextSearch.mockResolvedValue(mockResults);
      mockContext.query = { q: 'test' };

      await searchController.search(mockContext);

      expect(mockSearchService.fullTextSearch).toHaveBeenCalledWith('test', {
        page: 1,
        pageSize: 25,
        categoryId: undefined,
        priceRange: undefined,
        attributes: undefined,
        sortBy: 'relevance',
        sortOrder: 'desc',
        includeInactive: false,
        inStockOnly: undefined,
        minStock: undefined,
      });

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockResults.data,
          meta: expect.objectContaining({
            pagination: mockResults.meta.pagination,
            search: expect.objectContaining({
              query: 'test',
              totalResults: 1,
              sortBy: 'relevance',
              sortOrder: 'desc',
            }),
          }),
        })
      );
    });

    it('should handle search with filters', async () => {
      const mockResults = {
        data: [],
        meta: {
          pagination: {
            page: 1,
            pageSize: 25,
            pageCount: 0,
            total: 0,
          },
        },
      };

      // Set specific mock values for this test
      mockFilterService.validateFilterParams.mockReturnValue({
        categoryId: 1,
        priceRange: { min: 10.99, max: 49.99 },
        attributes: {},
        inStockOnly: false,
        minStock: undefined,
      });

      mockSearchService.fullTextSearch.mockResolvedValue(mockResults);
      mockContext.query = {
        q: 'test',
        categoryId: '1',
        minPrice: '10.99',
        maxPrice: '49.99',
        sortBy: 'price_asc',
        page: '2',
        pageSize: '10',
      };

      await searchController.search(mockContext);

      expect(mockSearchService.fullTextSearch).toHaveBeenCalledWith('test', {
        page: 2,
        pageSize: 10,
        categoryId: 1,
        priceRange: { min: 10.99, max: 49.99 },
        attributes: {},
        sortBy: 'price_asc',
        sortOrder: 'desc',
        includeInactive: false,
        inStockOnly: false,
        minStock: undefined,
      });
    });

    it('should validate pagination parameters', async () => {
      mockContext.query = {
        q: 'test',
        page: '0',
        pageSize: '200',
      };

      const mockResults = {
        data: [],
        meta: {
          pagination: {
            page: 1,
            pageSize: 100,
            pageCount: 0,
            total: 0,
          },
        },
      };

      mockSearchService.fullTextSearch.mockResolvedValue(mockResults);

      await searchController.search(mockContext);

      expect(mockSearchService.fullTextSearch).toHaveBeenCalledWith('test', {
        page: 1, // Corrected from 0 to 1
        pageSize: 100, // Capped at 100
        categoryId: undefined,
        priceRange: undefined,
        attributes: undefined,
        sortBy: 'relevance',
        sortOrder: 'desc',
        includeInactive: false,
        inStockOnly: undefined,
        minStock: undefined,
      });
    });

    it('should validate price range parameters', async () => {
      mockContext.query = {
        q: 'test',
        minPrice: 'invalid',
        maxPrice: '50',
      };

      await searchController.search(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Invalid price range values'
      );
    });

    it('should validate price range logic', async () => {
      mockContext.query = {
        q: 'test',
        minPrice: '100',
        maxPrice: '50',
      };

      await searchController.search(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Minimum price cannot be greater than maximum price'
      );
    });

    it('should validate category ID', async () => {
      mockContext.query = {
        q: 'test',
        categoryId: 'invalid',
      };

      await searchController.search(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Invalid category ID'
      );
    });

    it('should validate sort options', async () => {
      mockContext.query = {
        q: 'test',
        sortBy: 'invalid_sort',
      };

      await searchController.search(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Invalid sort option'
      );
    });

    it('should handle service errors', async () => {
      mockContext.query = { q: 'test' };
      mockSearchService.fullTextSearch.mockRejectedValue(
        new Error('Service error')
      );

      await searchController.search(mockContext);

      expect(mockContext.internalServerError).toHaveBeenCalledWith(
        'Failed to perform product search'
      );
      expect(mockStrapi.log.error).toHaveBeenCalled();
    });
  });

  describe('suggestions', () => {
    it('should return search suggestions', async () => {
      const mockSuggestions = ['Test Product', 'Testing Tools'];
      mockSearchService.getSearchSuggestions.mockResolvedValue(mockSuggestions);
      mockContext.query = { q: 'test', limit: '5' };

      await searchController.suggestions(mockContext);

      expect(mockSearchService.getSearchSuggestions).toHaveBeenCalledWith(
        'test',
        5
      );
      expect(mockContext.send).toHaveBeenCalledWith({
        suggestions: mockSuggestions,
      });
    });

    it('should handle short query', async () => {
      mockContext.query = { q: 't' };

      await searchController.suggestions(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith({ suggestions: [] });
    });

    it('should validate limit parameter', async () => {
      const mockSuggestions = ['Test Product'];
      mockSearchService.getSearchSuggestions.mockResolvedValue(mockSuggestions);
      mockContext.query = { q: 'test', limit: '50' };

      await searchController.suggestions(mockContext);

      expect(mockSearchService.getSearchSuggestions).toHaveBeenCalledWith(
        'test',
        20
      ); // Capped at 20
    });

    it('should handle service errors', async () => {
      mockContext.query = { q: 'test' };
      mockSearchService.getSearchSuggestions.mockRejectedValue(
        new Error('Service error')
      );

      await searchController.suggestions(mockContext);

      expect(mockContext.internalServerError).toHaveBeenCalledWith(
        'Failed to get search suggestions'
      );
    });
  });

  describe('popular', () => {
    it('should return popular search terms', async () => {
      const mockTerms = ['electronics', 'clothing', 'books'];
      mockSearchService.getPopularSearchTerms.mockResolvedValue(mockTerms);
      mockContext.query = { limit: '3' };

      await searchController.popular(mockContext);

      expect(mockSearchService.getPopularSearchTerms).toHaveBeenCalledWith(3);
      expect(mockContext.send).toHaveBeenCalledWith({
        popularTerms: mockTerms,
      });
    });

    it('should validate limit parameter', async () => {
      const mockTerms = ['electronics'];
      mockSearchService.getPopularSearchTerms.mockResolvedValue(mockTerms);
      mockContext.query = { limit: '50' };

      await searchController.popular(mockContext);

      expect(mockSearchService.getPopularSearchTerms).toHaveBeenCalledWith(20); // Capped at 20
    });

    it('should handle service errors', async () => {
      mockContext.query = {};
      mockSearchService.getPopularSearchTerms.mockRejectedValue(
        new Error('Service error')
      );

      await searchController.popular(mockContext);

      expect(mockContext.internalServerError).toHaveBeenCalledWith(
        'Failed to get popular search terms'
      );
    });
  });

  describe('getFilterOptions', () => {
    it('should return filter options', async () => {
      // Set specific mock for this test
      mockFilterService.getAvailableFilters.mockResolvedValue({
        categories: [
          { id: 1, name: 'Electronics', slug: 'electronics' },
          { id: 2, name: 'Clothing', slug: 'clothing' },
        ],
        priceRange: { min: 10.99, max: 49.99 },
        inventoryOptions: [],
      });

      await searchController.getFilterOptions(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith({
        categories: [
          { id: 1, name: 'Electronics', slug: 'electronics' },
          { id: 2, name: 'Clothing', slug: 'clothing' },
        ],
        priceRange: { min: 10.99, max: 49.99 },
        inventoryOptions: [],
        sortOptions: expect.arrayContaining([
          { value: 'relevance', label: 'Most Relevant' },
          { value: 'price_asc', label: 'Price: Low to High' },
          { value: 'price_desc', label: 'Price: High to Low' },
        ]),
      });
    });

    it('should handle empty price stats', async () => {
      // Set specific mock for this test
      mockFilterService.getAvailableFilters.mockResolvedValue({
        categories: [],
        priceRange: { min: 0, max: 1000 },
        inventoryOptions: [],
      });

      await searchController.getFilterOptions(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith({
        categories: [],
        priceRange: { min: 0, max: 1000 },
        inventoryOptions: [],
        sortOptions: expect.any(Array),
      });
    });

    it('should handle service errors', async () => {
      // Set specific mock to throw error for this test
      mockFilterService.getAvailableFilters.mockRejectedValue(
        new Error('Database error')
      );

      await searchController.getFilterOptions(mockContext);

      expect(mockContext.internalServerError).toHaveBeenCalledWith(
        'Failed to get filter options'
      );
    });
  });
});
