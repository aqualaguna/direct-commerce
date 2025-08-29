/**
 * Product search service tests
 * 
 * Tests for product search functionality including full-text search and relevance scoring
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock filter service
jest.mock('./filter', () => ({
  __esModule: true,
  default: {
    buildFilters: jest.fn().mockImplementation((baseFilters: any, filterParams: any) => {
      let filters = { ...baseFilters };
      
      // Apply category filtering
      if (filterParams?.categoryId) {
        filters.category = { id: filterParams.categoryId };
      }
      
      // Apply price filtering
      if (filterParams?.priceRange) {
        const { min, max } = filterParams.priceRange;
        if (min !== undefined && max !== undefined) {
          filters.price = { $gte: min, $lte: max };
        } else if (min !== undefined) {
          filters.price = { $gte: min };
        } else if (max !== undefined) {
          filters.price = { $lte: max };
        }
      }
      
      return filters;
    }),
  },
}));

// Mock filter service instance
const mockFilterServiceInstance = {
  buildFilters: jest.fn().mockImplementation((baseFilters: any, filterParams: any) => {
    let filters = { ...baseFilters };
    
    // Apply category filtering
    if (filterParams?.categoryId) {
      filters.category = { id: filterParams.categoryId };
    }
    
    // Apply price filtering
    if (filterParams?.priceRange) {
      const { min, max } = filterParams.priceRange;
      if (min !== undefined && max !== undefined) {
        filters.price = { $gte: min, $lte: max };
      } else if (min !== undefined) {
        filters.price = { $gte: min };
      } else if (max !== undefined) {
        filters.price = { $lte: max };
      }
    }
    
    return filters;
  }),
};

// Mock Strapi
const mockStrapi = {
  contentType: jest.fn().mockReturnValue({
    kind: 'collectionType',
  }),
  entityService: {
    findMany: jest.fn() as jest.MockedFunction<any>,
  },
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
    (factories.createCoreService as jest.MockedFunction<any>).mockImplementation(
      (serviceName, serviceFunction) => {
        return serviceFunction({ strapi: mockStrapi });
      }
    );
    
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
            title: 'Test Product',
            description: 'A great test product',
            shortDescription: 'Test product short desc',
            sku: 'TEST-001',
            price: 29.99,
            featured: false,
            inventory: 10,
          },
          {
            id: 2,
            title: 'Another Product',
            description: 'Another great product',
            shortDescription: 'Another product short desc',
            sku: 'TEST-002',
            price: 39.99,
            featured: true,
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

      mockStrapi.entityService.findMany.mockResolvedValue(mockProducts);

      const result = await searchService.fullTextSearch('test');

      expect(result.data).toHaveLength(2);
      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::product.product',
        expect.objectContaining({
          filters: expect.objectContaining({
            publishedAt: { $notNull: true },
            status: 'active',
            isActive: true,
            $or: [
              { title: { $containsi: 'test' } },
              { description: { $containsi: 'test' } },
              { shortDescription: { $containsi: 'test' } },
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
            title: 'Test Product',
            price: 29.99,
            featured: false,
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

      mockStrapi.entityService.findMany.mockResolvedValue(mockProducts);

      const result = await searchService.fullTextSearch('');

      expect(result.data).toHaveLength(1);
      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::product.product',
        expect.objectContaining({
          filters: expect.objectContaining({
            publishedAt: { $notNull: true },
            status: 'active',
            isActive: true,
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

      mockStrapi.entityService.findMany.mockResolvedValue(mockProducts);

      await searchService.fullTextSearch('test', { categoryId: 1 });

      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::product.product',
        expect.objectContaining({
          filters: expect.objectContaining({
            $or: expect.any(Array),
            category: { id: 1 },
          }),
        })
      );
    });

    it('should apply price range filtering', async () => {
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

      mockStrapi.entityService.findMany.mockResolvedValue(mockProducts);

      await searchService.fullTextSearch('test', {
        priceRange: { min: 10, max: 50 },
      });

      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::product.product',
        expect.objectContaining({
          filters: expect.objectContaining({
            $or: expect.any(Array),
            price: { $gte: 10, $lte: 50 },
          }),
        })
      );
    });

    it('should apply sorting by price ascending', async () => {
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

      mockStrapi.entityService.findMany.mockResolvedValue(mockProducts);

      await searchService.fullTextSearch('test', { sortBy: 'price_asc' });

      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::product.product',
        expect.objectContaining({
          sort: { price: 'asc' },
        })
      );
    });

    it('should handle service errors', async () => {
      mockStrapi.entityService.findMany.mockRejectedValue(new Error('Database error'));

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
          title: 'Test Product',
          description: 'A great test product',
          shortDescription: 'Test product short desc',
          sku: 'test-001',
          featured: false,
          inventory: 10,
        },
        {
          id: 2,
          title: 'Another Product',
          description: 'Contains test keyword',
          shortDescription: 'No keyword here',
          sku: 'OTHER-002',
          featured: true,
          inventory: 0,
        },
        {
          id: 3,
          title: 'Exact Test Match',
          description: 'Perfect match',
          shortDescription: 'test in short desc',
          sku: 'test',
          featured: false,
          inventory: 5,
        },
      ];

      const result = searchService.calculateRelevanceScores(products, 'test');

      expect(result).toHaveLength(3);
      
      // Check that products are sorted by relevance score
      expect(result[0]._relevanceScore).toBeGreaterThan(result[1]._relevanceScore);
      expect(result[1]._relevanceScore).toBeGreaterThan(result[2]._relevanceScore);

      // Product with exact SKU match should score highest
      const exactMatch = result.find(p => p.sku === 'test');
      expect(exactMatch._relevanceScore).toBeGreaterThan(0);
      
      // Featured products should get bonus points
      const featuredProduct = result.find(p => p.featured);
      expect(featuredProduct._relevanceScore).toBeGreaterThan(0);
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
          { title: 'Test Product', sku: 'TEST-001' },
          { title: 'Testing Tools', sku: 'TEST-002' },
          { title: 'Another Product', sku: 'OTHER-001' },
        ],
      };

      mockStrapi.entityService.findMany.mockResolvedValue(mockProducts);

      const result = await searchService.getSearchSuggestions('test');

      expect(result).toContain('Test Product');
      expect(result).toContain('Testing Tools');
      expect(result).toContain('TEST-001');
      expect(result).toContain('TEST-002');
      expect(result).not.toContain('Another Product');
    });

    it('should return empty array for short query', async () => {
      const result = await searchService.getSearchSuggestions('t');
      expect(result).toEqual([]);
    });

    it('should handle service errors', async () => {
      mockStrapi.entityService.findMany.mockRejectedValue(new Error('Database error'));

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
