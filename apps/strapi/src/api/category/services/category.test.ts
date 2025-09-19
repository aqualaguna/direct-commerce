/**
 * Category service tests
 *
 * Tests for category service using new Document Service API and test standards
 */

// Third-party imports
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Test utilities
import {
  createMockCategory,
  createMockDocumentMethods,
  createMockStrapi,
} from '../../../utils/test-helpers';

// Create mock document service methods
const mockDocumentMethods = {
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
};

// Mock Strapi instance with Document Service API
const mockStrapi: any = {
  documents: jest.fn(() => mockDocumentMethods),
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
};

// Mock the Strapi factories
jest.mock('@strapi/strapi', () => ({
  factories: {
    createCoreService: jest.fn((serviceName: string, serviceFactory: any) => {
      return serviceFactory({ strapi: mockStrapi });
    }),
  },
}));

describe('Category Service', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all mock document methods
    Object.values(mockDocumentMethods).forEach((mockFn: any) => {
      if (jest.isMockFunction(mockFn)) {
        mockFn.mockReset();
      }
    });

    // Import and create the service with mocked strapi
    delete require.cache[require.resolve('./category')];
    const categoryServiceFactory = require('./category').default;
    service = categoryServiceFactory;
  });

  describe('findByNameAndParent', () => {
    it('should find category by name and parent', async () => {
      const mockCategory = {
        documentId: 'cat1',
        name: 'Electronics',
        parent: null,
      };
      (mockDocumentMethods.findMany as any).mockResolvedValue([mockCategory]);

      const result = await service.findByNameAndParent('Electronics', null);

      expect(mockStrapi.documents).toHaveBeenCalledWith(
        'api::category.category'
      );
      expect(mockDocumentMethods.findMany).toHaveBeenCalledWith({
        filters: {
          name: { $eqi: 'Electronics' },
          parent: { $null: true },
        },
        limit: 1,
      });
      expect(result).toEqual(mockCategory);
    });

    it('should find category by name and specific parent', async () => {
      const mockCategory = {
        documentId: 'cat2',
        name: 'Laptops',
        parent: 'cat1',
      };
      mockDocumentMethods.findMany.mockResolvedValue([mockCategory]);

      const result = await service.findByNameAndParent('Laptops', 'cat1');

      expect(mockDocumentMethods.findMany).toHaveBeenCalledWith({
        filters: {
          name: { $eqi: 'Laptops' },
          parent: {
            documentId: 'cat1',
          },
        },
        limit: 1,
      });
      expect(result).toEqual(mockCategory);
    });

    it('should return null if no category found', async () => {
      mockDocumentMethods.findMany.mockResolvedValue([]);

      const result = await service.findByNameAndParent('NonExistent', null);

      expect(result).toBeNull();
    });
  });

  describe('checkCircularReference', () => {
    beforeEach(() => {
      // Ensure fresh mocks for each test
      mockStrapi.documents('api::category.category').findOne.mockReset();
    });

    it('should return false for valid hierarchy', async () => {
      mockStrapi
        .documents('api::category.category')
        .findOne.mockResolvedValueOnce({ documentId: 'cat1', parent: null })
        .mockResolvedValueOnce(null);

      const result = await service.checkCircularReference('cat1', 'cat2');

      expect(result).toBe(false);
    });

    it('should return true for direct circular reference', async () => {
      const result = await service.checkCircularReference('cat1', 'cat1');

      expect(result).toBe(true);
    });

    it('should return true for indirect circular reference', async () => {
      // Testing: make category cat1 a child of category cat3
      // Algorithm traverses UP from parentId (cat3) looking for categoryId (cat1)
      // Hierarchy: cat3 -> cat2 -> cat1 (so we'll find cat1 in the parent chain of cat3)
      mockStrapi
        .documents('api::category.category')
        .findOne.mockResolvedValueOnce({
          documentId: 'cat3',
          parent: { documentId: 'cat2' },
        }) // cat3's parent is cat2
        .mockResolvedValueOnce({
          documentId: 'cat2',
          parent: { documentId: 'cat1' },
        }) // cat2's parent is cat1
        .mockResolvedValueOnce({ documentId: 'cat1', parent: null }); // cat1 has no parent

      const result = await service.checkCircularReference('cat3', 'cat1');

      expect(result).toBe(true);
    });

    it('should handle complex hierarchy traversal', async () => {
      mockStrapi
        .documents('api::category.category')
        .findOne.mockResolvedValueOnce({
          documentId: 'cat1',
          parent: { documentId: 'cat2' },
        })
        .mockResolvedValueOnce({
          documentId: 'cat2',
          parent: { documentId: 'cat3' },
        })
        .mockResolvedValueOnce({ documentId: 'cat3', parent: null });

      const result = await service.checkCircularReference('cat1', 'cat4');

      expect(result).toBe(false);
    });
  });

  describe('getNextSortOrder', () => {
    it('should return 0 for first category in parent', async () => {
      mockDocumentMethods.findMany.mockResolvedValue([]);

      const result = await service.getNextSortOrder(null);

      expect(result).toBe(0);
    });

    it('should return incremented sort order', async () => {
      mockDocumentMethods.findMany.mockResolvedValue([
        { documentId: '1', sortOrder: 5 },
      ]);

      const result = await service.getNextSortOrder(1);

      expect(mockDocumentMethods.findMany).toHaveBeenCalledWith({
        filters: { parent: { documentId: 1 } },
        sort: 'sortOrder:desc',
        limit: 1,
      });
      expect(result).toBe(6);
    });

    it('should handle null sortOrder', async () => {
      mockDocumentMethods.findMany.mockResolvedValue([
        { documentId: '1', sortOrder: null },
      ]);

      const result = await service.getNextSortOrder(1);

      expect(result).toBe(1);
    });
  });

  describe('getCategoryTree', () => {
    it('should build hierarchical tree structure', async () => {
      const mockCategories = [
        { documentId: '1', name: 'Electronics', parent: null, sortOrder: 0 },
        {
          documentId: '2',
          name: 'Laptops',
          parent: { documentId: '1' },
          sortOrder: 0,
        },
        {
          documentId: '3',
          name: 'Phones',
          parent: { documentId: '1' },
          sortOrder: 1,
        },
        {
          documentId: '4',
          name: 'Gaming',
          parent: { documentId: '2' },
          sortOrder: 0,
        },
      ];

      mockDocumentMethods.findMany.mockResolvedValue(mockCategories);

      const result = await service.getCategoryTree();

      expect(result).toHaveLength(1);
      expect(result[0].documentId).toBe('1');
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children[0].documentId).toBe('2');
      expect(result[0].children[0].children).toHaveLength(1);
      expect(result[0].children[0].children[0].documentId).toBe('4');
    });

    it('should handle empty categories', async () => {
      mockDocumentMethods.findMany.mockResolvedValue([]);

      const result = await service.getCategoryTree();

      expect(result).toEqual([]);
    });

    it('should sort categories correctly', async () => {
      const mockCategories = [
        { documentId: '3', name: 'Zebra', parent: null, sortOrder: 2 },
        { documentId: '1', name: 'Alpha', parent: null, sortOrder: 0 },
        { documentId: '2', name: 'Beta', parent: null, sortOrder: 1 },
      ];

      mockDocumentMethods.findMany.mockResolvedValue(mockCategories);

      const result = await service.getCategoryTree();

      expect(result[0].documentId).toBe('1'); // Alpha
      expect(result[1].documentId).toBe('2'); // Beta
      expect(result[2].documentId).toBe('3'); // Zebra
    });
  });

  describe('getBreadcrumbs', () => {
    beforeEach(() => {
      // Ensure fresh mocks for each test
      mockDocumentMethods.findOne.mockReset();
    });

    it('should generate breadcrumbs for nested category', async () => {
      mockDocumentMethods.findOne
        .mockResolvedValueOnce({
          documentId: '3',
          name: 'Gaming Laptops',
          slug: 'gaming-laptops',
          parent: { documentId: '2' },
        })
        .mockResolvedValueOnce({
          documentId: '2',
          name: 'Laptops',
          slug: 'laptops',
          parent: { documentId: '1' },
        })
        .mockResolvedValueOnce({
          documentId: '1',
          name: 'Electronics',
          slug: 'electronics',
          parent: null,
        });

      const result = await service.getBreadcrumbs('3');

      expect(result).toEqual([
        { documentId: '1', name: 'Electronics', slug: 'electronics' },
        { documentId: '2', name: 'Laptops', slug: 'laptops' },
        { documentId: '3', name: 'Gaming Laptops', slug: 'gaming-laptops' },
      ]);
    });

    it('should handle root category', async () => {
      mockDocumentMethods.findOne.mockResolvedValueOnce({
        documentId: '1',
        name: 'Electronics',
        slug: 'electronics',
        parent: null,
      });

      const result = await service.getBreadcrumbs('1');

      expect(result).toEqual([
        { documentId: '1', name: 'Electronics', slug: 'electronics' },
      ]);
    });

    it('should handle non-existent category', async () => {
      mockDocumentMethods.findOne.mockResolvedValue(null);

      const result = await service.getBreadcrumbs('999');

      expect(result).toEqual([]);
    });
  });

  describe('getCategoryPath', () => {
    beforeEach(() => {
      // Ensure fresh mocks for each test
      mockDocumentMethods.findOne.mockReset();
    });

    it('should generate slash-separated path', async () => {
      // Mock the findOne calls for getBreadcrumbs
      mockDocumentMethods.findOne
        .mockResolvedValueOnce({
          documentId: '3',
          name: 'Gaming',
          slug: 'gaming',
          parent: { documentId: '2' },
        })
        .mockResolvedValueOnce({
          documentId: '2',
          name: 'Laptops',
          slug: 'laptops',
          parent: { documentId: '1' },
        })
        .mockResolvedValueOnce({
          documentId: '1',
          name: 'Electronics',
          slug: 'electronics',
          parent: null,
        });

      const result = await service.getCategoryPath('3');

      expect(result).toBe('electronics/laptops/gaming');
    });
  });

  describe('getDescendants', () => {
    it('should get all descendant categories', async () => {
      mockStrapi
        .documents('api::category.category')
        .findMany // Call 1: getDescendants(1) - returns children of 1
        .mockResolvedValueOnce([
          { documentId: '2', name: 'Laptops', slug: 'laptops' },
          { documentId: '3', name: 'Phones', slug: 'phones' },
        ])
        // Call 2: processing id 2 - returns children of 2
        .mockResolvedValueOnce([
          { documentId: '4', name: 'Gaming', slug: 'gaming' },
        ])
        // Call 3: processing id 3 - returns children of 3 (none)
        .mockResolvedValueOnce([])
        // Call 4: processing id 4 - returns children of 4 (none)
        .mockResolvedValueOnce([]);

      const result = await service.getDescendants(1);

      expect(result).toEqual([
        { documentId: '2', name: 'Laptops', slug: 'laptops' },
        { documentId: '3', name: 'Phones', slug: 'phones' },
        { documentId: '4', name: 'Gaming', slug: 'gaming' },
      ]);
    });

    it('should handle category with no children', async () => {
      mockStrapi
        .documents('api::category.category')
        .findMany.mockResolvedValue([]);

      const result = await service.getDescendants(1);

      expect(result).toEqual([]);
    });
  });

  describe('reorderCategories', () => {
    it('should update sort orders for multiple categories', async () => {
      const categoryOrders = [
        { documentId: '1', sortOrder: 0 },
        { documentId: '2', sortOrder: 1 },
        { documentId: '3', sortOrder: 2 },
      ];

      mockStrapi
        .documents('api::category.category')
        .update.mockResolvedValue({});

      const result = await service.reorderCategories(null, categoryOrders);

      expect(
        mockStrapi.documents('api::category.category').update
      ).toHaveBeenCalledTimes(3);
      expect(
        mockStrapi.documents('api::category.category').update
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: '1',
          data: { sortOrder: 0 },
        })
      );
      expect(result).toBe(true);
    });
  });

  describe('getCategoriesByStatus', () => {
    it('should filter categories by active status', async () => {
      const mockCategories = [
        { documentId: '1', name: 'Electronics', isActive: true },
        { documentId: '2', name: 'Laptops', isActive: true },
      ];

      mockStrapi
        .documents('api::category.category')
        .findMany.mockResolvedValue(mockCategories);

      const result = await service.getCategoriesByStatus(true);

      expect(
        mockStrapi.documents('api::category.category').findMany
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            isActive: true,
          },
        })
      );
      expect(result).toEqual(mockCategories);
    });

    it('should filter categories by parent and status', async () => {
      const mockCategories = [
        { documentId: '2', name: 'Laptops', isActive: false, parent: 1 },
      ];

      mockStrapi
        .documents('api::category.category')
        .findMany.mockResolvedValue(mockCategories);

      const result = await service.getCategoriesByStatus(false, 1);

      expect(
        mockStrapi.documents('api::category.category').findMany
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            isActive: false,
            parent: 1,
          },
        })
      );
    });
  });

  describe('getCategoryStatistics', () => {
    it('should calculate category statistics', async () => {
      const mockCategory = {
        documentId: 'cat1',
        name: 'Electronics',
        products: [
          { status: 'active', inventory: 10 },
          { status: 'draft', inventory: 5 },
          { status: 'inactive', inventory: 0 },
        ],
        children: [{ name: 'Laptops' }, { name: 'Phones' }],
      };

      mockDocumentMethods.findOne.mockResolvedValue(mockCategory);

      const result = await service.getCategoryStatistics('cat1');

      expect(result.categoryName).toBe('Electronics');
      expect(result.totalProducts).toBe(3);
      expect(result.activeProducts).toBe(1);
      expect(result.draftProducts).toBe(1);
      expect(result.childCategories).toBe(2);
    });
  });

  describe('searchCategories', () => {
    it('should search categories by name and description', async () => {
      const mockResults = [
        {
          documentId: 'cat1',
          name: 'Electronics',
          slug: 'electronics',
          parent: null,
        },
      ];

      mockStrapi
        .documents('api::category.category')
        .findMany.mockResolvedValue(mockResults);

      const result = await service.searchCategories('electronics', 10);

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('/categories/electronics');
      expect(result[0].breadcrumbPath).toBe('Electronics');
    });
  });
});
