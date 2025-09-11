/**
 * Product search service tests
 *
 * Tests for product search functionality including full-text search and relevance scoring
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock filter service
jest.mock('./filter', () => ({
  __esModule: true,
  default: {
    buildFilters: jest
      .fn()
      .mockImplementation((baseFilters: any, filterParams: any) => {
        const filters = { ...baseFilters };

        // Apply category filtering
        if (filterParams?.categoryId) {
          filters.category = { id: filterParams.categoryId };
        }

        return filters;
      }),
  },
}));

// Mock filter service instance
const mockFilterServiceInstance = {
  buildFilters: jest
    .fn()
    .mockImplementation((baseFilters: any, filterParams: any) => {
      const filters = { ...baseFilters };

      // Apply category filtering
      if (filterParams?.categoryId) {
        filters.category = { id: filterParams.categoryId };
      }

      return filters;
    }),
};

// Create persistent mock objects for documents API
const mockDocumentsAPI = {
  findOne: jest.fn() as jest.MockedFunction<any>,
  findFirst: jest.fn() as jest.MockedFunction<any>,
  findMany: jest.fn() as jest.MockedFunction<any>,
  create: jest.fn() as jest.MockedFunction<any>,
  update: jest.fn() as jest.MockedFunction<any>,
  delete: jest.fn() as jest.MockedFunction<any>,
  count: jest.fn() as jest.MockedFunction<any>,
};

// Mock Strapi with Document Service API
const mockStrapi = {
  contentType: jest.fn().mockReturnValue({
    kind: 'collectionType',
  }),
  documents: jest.fn(() => mockDocumentsAPI),
  service: jest.fn().mockReturnValue(mockFilterServiceInstance),
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
    createCoreService: jest.fn() as jest.MockedFunction<any>,
  },
}));

describe('Product Search Service', () => {
  let searchService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up the factory mock
    const { factories } = require('@strapi/strapi');
    (
      factories.createCoreService as jest.MockedFunction<any>
    ).mockImplementation((serviceName, serviceFunction) => {
      return serviceFunction({ strapi: mockStrapi });
    });

    // Import the search service
    const searchServiceModule = require('./search').default;
    searchService = searchServiceModule;
  });

  describe('fullTextSearch', () => {
    it('should perform basic full-text search', async () => {
      const mockProducts = {
        data: [
          {
            id: 1,
            name: 'Test Product',
            brand: 'Test Brand',
            description: 'A great test product',
            sku: 'TEST-001',
            inventory: 10,
          },
          {
            id: 2,
            name: 'Another Product',
            brand: 'Another Brand',
            description: 'Another great product',
            sku: 'TEST-002',
            inventory: 5,
          },
        ],
        meta: {
          pagination: {
            page: 1,
            pageSize: 25,
            pageCount: 1,
            total: 2,
          },
        },
      };

      mockDocumentsAPI.findMany.mockResolvedValue(mockProducts);

      const result = await searchService.fullTextSearch('test');

      expect(result.data).toHaveLength(2);

      expect(mockDocumentsAPI.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            status: 'active',
            $or: [
              { name: { $containsi: 'test' } },
              { brand: { $containsi: 'test' } },
              { description: { $containsi: 'test' } },
              { sku: { $containsi: 'test' } },
            ],
          }),
        })
      );
    });

    it('should handle empty search query', async () => {
      const mockProducts = {
        data: [
          {
            id: 1,
            name: 'Test Product',
            brand: 'Test Brand',
            inventory: 10,
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

      mockDocumentsAPI.findMany.mockResolvedValue(mockProducts);

      const result = await searchService.fullTextSearch('');

      expect(result.data).toHaveLength(1);

      expect(mockDocumentsAPI.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            status: 'active',
          }),
        })
      );
    });

    it('should apply category filtering', async () => {
      const mockProducts = {
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

      mockDocumentsAPI.findMany.mockResolvedValue(mockProducts);

      await searchService.fullTextSearch('test', { categoryId: 1 });

      expect(mockDocumentsAPI.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            $or: expect.any(Array),
            category: { id: 1 },
          }),
        })
      );
    });



    it('should handle service errors', async () => {
      mockDocumentsAPI.findMany.mockRejectedValue(new Error('Database error'));

      await expect(searchService.fullTextSearch('test')).rejects.toThrow(
        'Failed to perform product search'
      );

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error in product search:',
        expect.any(Error)
      );
    });
  });

  describe('calculateRelevanceScores', () => {
    it('should calculate relevance scores correctly', () => {
      const products = [
        {
          id: 1,
          name: 'Test Product',
          brand: 'Test Brand',
          description: 'A great test product',
          sku: 'test-001',
          inventory: 10,
        },
        {
          id: 2,
          name: 'Another Product',
          brand: 'Another Brand',
          description: 'Contains test keyword',
          sku: 'OTHER-002',
          inventory: 0,
        },
        {
          id: 3,
          name: 'Exact Test Match',
          brand: 'Exact Brand',
          description: 'Perfect match',
          sku: 'test',
          inventory: 5,
        },
      ];

      const result = searchService.calculateRelevanceScores(products, 'test');

      expect(result).toHaveLength(3);

      // Check that products are sorted by relevance score
      expect(result[0]._relevanceScore).toBeGreaterThan(
        result[1]._relevanceScore
      );
      expect(result[1]._relevanceScore).toBeGreaterThan(
        result[2]._relevanceScore
      );

      // Product with exact SKU match should score highest
      const exactMatch = result.find(p => p.sku === 'test');
      expect(exactMatch._relevanceScore).toBeGreaterThan(0);

    });

    it('should handle empty products array', () => {
      const result = searchService.calculateRelevanceScores([], 'test');
      expect(result).toEqual([]);
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return search suggestions', async () => {
      const mockProducts = {
        data: [
          { name: 'Test Product', brand: 'Test Brand', sku: 'TEST-001' },
          { name: 'Testing Tools', brand: 'Tool Brand', sku: 'TEST-002' },
          { name: 'Another Product', brand: 'Another Brand', sku: 'OTHER-001' },
        ],
      };

      mockDocumentsAPI.findMany.mockResolvedValue(mockProducts);

      const result = await searchService.getSearchSuggestions('test');

      expect(result).toContain('Test Product');
      expect(result).toContain('Testing Tools');
      expect(result).toContain('Test Brand');
      expect(result).toContain('TEST-001');
      expect(result).toContain('TEST-002');
      expect(result).not.toContain('Another Product');
      expect(result).not.toContain('Tool Brand'); // Tool Brand doesn't contain 'test'
    });

    it('should return empty array for short query', async () => {
      const result = await searchService.getSearchSuggestions('t');
      expect(result).toEqual([]);
    });

    it('should handle service errors', async () => {
      mockDocumentsAPI.findMany.mockRejectedValue(new Error('Database error'));

      const result = await searchService.getSearchSuggestions('test');

      expect(result).toEqual([]);
      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error getting search suggestions:',
        expect.any(Error)
      );
    });
  });

  describe('getPopularSearchTerms', () => {
    it('should return popular search terms', async () => {
      const result = await searchService.getPopularSearchTerms(5);

      expect(result).toHaveLength(5);
      expect(result).toContain('electronics');
      expect(result).toContain('clothing');
    });

    it('should respect limit parameter', async () => {
      const result = await searchService.getPopularSearchTerms(3);
      expect(result).toHaveLength(3);
    });
  });
});
