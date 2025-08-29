/**
 * Category service tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const mockStrapi: any = {
  entityService: {
    findOne: jest.fn(),
    findMany: jest.fn(),
    findPage: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  log: {
    error: jest.fn(),
  },
};

// Mock the Strapi factories
jest.mock('@strapi/strapi', () => ({
  factories: {
    createCoreService: jest.fn((serviceName: string, serviceFunction: any) => {
      return serviceFunction({ strapi: mockStrapi });
    }),
  },
}));

describe('Category Service', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Import the actual service
    const categoryService = require('./category').default;
    service = categoryService;
  });

  describe('findByNameAndParent', () => {
    it('should find category by name and parent', async () => {
      const mockCategory = { id: 1, name: 'Electronics', parent: null };
      mockStrapi.entityService.findMany.mockResolvedValue([mockCategory]);

      const result = await service.findByNameAndParent('Electronics', null);

      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::category.category',
        {
          filters: {
            name: { $eqi: 'Electronics' },
            parent: { $null: true },
          },
          limit: 1,
        }
      );
      expect(result).toEqual(mockCategory);
    });

    it('should find category by name and specific parent', async () => {
      const mockCategory = { id: 2, name: 'Laptops', parent: 1 };
      mockStrapi.entityService.findMany.mockResolvedValue([mockCategory]);

      const result = await service.findByNameAndParent('Laptops', 1);

      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::category.category',
        {
          filters: {
            name: { $eqi: 'Laptops' },
            parent: 1,
          },
          limit: 1,
        }
      );
      expect(result).toEqual(mockCategory);
    });

    it('should return null if no category found', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const result = await service.findByNameAndParent('NonExistent', null);

      expect(result).toBeNull();
    });
  });

  describe('checkCircularReference', () => {
    beforeEach(() => {
      // Ensure fresh mocks for each test
      mockStrapi.entityService.findOne.mockReset();
    });
    it('should return false for valid hierarchy', async () => {
      mockStrapi.entityService.findOne
        .mockResolvedValueOnce({ id: 1, parent: null })
        .mockResolvedValueOnce(null);

      const result = await service.checkCircularReference(1, 2);

      expect(result).toBe(false);
    });

    it('should return true for direct circular reference', async () => {
      const result = await service.checkCircularReference(1, 1);

      expect(result).toBe(true);
    });

    it('should return true for indirect circular reference', async () => {
      // Testing: make category 1 a child of category 3
      // Algorithm traverses UP from parentId (3) looking for categoryId (1)
      // Hierarchy: 3 -> 2 -> 1 (so we'll find 1 in the parent chain of 3)
      mockStrapi.entityService.findOne
        .mockResolvedValueOnce({ id: 3, parent: { id: 2 } }) // 3's parent is 2
        .mockResolvedValueOnce({ id: 2, parent: { id: 1 } }) // 2's parent is 1
        .mockResolvedValueOnce({ id: 1, parent: null }); // 1 has no parent

      const result = await service.checkCircularReference(3, 1);

      expect(result).toBe(true);
    });

    it('should handle complex hierarchy traversal', async () => {
      mockStrapi.entityService.findOne
        .mockResolvedValueOnce({ id: 1, parent: { id: 2 } })
        .mockResolvedValueOnce({ id: 2, parent: { id: 3 } })
        .mockResolvedValueOnce({ id: 3, parent: null });

      const result = await service.checkCircularReference(1, 4);

      expect(result).toBe(false);
    });
  });

  describe('getNextSortOrder', () => {
    it('should return 0 for first category in parent', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const result = await service.getNextSortOrder(null);

      expect(result).toBe(0);
    });

    it('should return incremented sort order', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([
        { id: 1, sortOrder: 5 },
      ]);

      const result = await service.getNextSortOrder(1);

      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::category.category',
        {
          filters: { parent: 1 },
          sort: { sortOrder: 'desc' },
          limit: 1,
        }
      );
      expect(result).toBe(6);
    });

    it('should handle null sortOrder', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([
        { id: 1, sortOrder: null },
      ]);

      const result = await service.getNextSortOrder(1);

      expect(result).toBe(1);
    });
  });

  describe('getCategoryTree', () => {
    it('should build hierarchical tree structure', async () => {
      const mockCategories = [
        { id: 1, name: 'Electronics', parent: null, sortOrder: 0 },
        { id: 2, name: 'Laptops', parent: { id: 1 }, sortOrder: 0 },
        { id: 3, name: 'Phones', parent: { id: 1 }, sortOrder: 1 },
        { id: 4, name: 'Gaming', parent: { id: 2 }, sortOrder: 0 },
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockCategories);

      const result = await service.getCategoryTree();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children[0].id).toBe(2);
      expect(result[0].children[0].children).toHaveLength(1);
      expect(result[0].children[0].children[0].id).toBe(4);
    });

    it('should handle empty categories', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const result = await service.getCategoryTree();

      expect(result).toEqual([]);
    });

    it('should sort categories correctly', async () => {
      const mockCategories = [
        { id: 3, name: 'Zebra', parent: null, sortOrder: 2 },
        { id: 1, name: 'Alpha', parent: null, sortOrder: 0 },
        { id: 2, name: 'Beta', parent: null, sortOrder: 1 },
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockCategories);

      const result = await service.getCategoryTree();

      expect(result[0].id).toBe(1); // Alpha
      expect(result[1].id).toBe(2); // Beta
      expect(result[2].id).toBe(3); // Zebra
    });
  });

  describe('getBreadcrumbs', () => {
    beforeEach(() => {
      // Ensure fresh mocks for each test
      mockStrapi.entityService.findOne.mockReset();
    });

    it('should generate breadcrumbs for nested category', async () => {
      mockStrapi.entityService.findOne
        .mockResolvedValueOnce({
          id: 3,
          name: 'Gaming Laptops',
          slug: 'gaming-laptops',
          parent: { id: 2 },
        })
        .mockResolvedValueOnce({
          id: 2,
          name: 'Laptops',
          slug: 'laptops',
          parent: { id: 1 },
        })
        .mockResolvedValueOnce({
          id: 1,
          name: 'Electronics',
          slug: 'electronics',
          parent: null,
        });

      const result = await service.getBreadcrumbs(3);

      expect(result).toEqual([
        { id: 1, name: 'Electronics', slug: 'electronics' },
        { id: 2, name: 'Laptops', slug: 'laptops' },
        { id: 3, name: 'Gaming Laptops', slug: 'gaming-laptops' },
      ]);
    });

    it('should handle root category', async () => {
      mockStrapi.entityService.findOne.mockResolvedValueOnce({
        id: 1,
        name: 'Electronics',
        slug: 'electronics',
        parent: null,
      });

      const result = await service.getBreadcrumbs(1);

      expect(result).toEqual([
        { id: 1, name: 'Electronics', slug: 'electronics' },
      ]);
    });

    it('should handle non-existent category', async () => {
      mockStrapi.entityService.findOne.mockResolvedValue(null);

      const result = await service.getBreadcrumbs(999);

      expect(result).toEqual([]);
    });
  });

  describe('getCategoryPath', () => {
    beforeEach(() => {
      // Ensure fresh mocks for each test
      mockStrapi.entityService.findOne.mockReset();
    });

    it('should generate slash-separated path', async () => {
      // Mock the findOne calls for getBreadcrumbs
      mockStrapi.entityService.findOne
        .mockResolvedValueOnce({
          id: 3,
          name: 'Gaming',
          slug: 'gaming',
          parent: { id: 2 },
        })
        .mockResolvedValueOnce({
          id: 2,
          name: 'Laptops',
          slug: 'laptops',
          parent: { id: 1 },
        })
        .mockResolvedValueOnce({
          id: 1,
          name: 'Electronics',
          slug: 'electronics',
          parent: null,
        });

      const result = await service.getCategoryPath(3);

      expect(result).toBe('electronics/laptops/gaming');
    });
  });

  describe('getDescendants', () => {
    it('should get all descendant categories', async () => {
      mockStrapi.entityService.findMany
        // Call 1: getDescendants(1) - returns children of 1
        .mockResolvedValueOnce([
          { id: 2, name: 'Laptops', slug: 'laptops' },
          { id: 3, name: 'Phones', slug: 'phones' },
        ])
        // Call 2: processing id 2 - returns children of 2
        .mockResolvedValueOnce([{ id: 4, name: 'Gaming', slug: 'gaming' }])
        // Call 3: processing id 3 - returns children of 3 (none)
        .mockResolvedValueOnce([])
        // Call 4: processing id 4 - returns children of 4 (none)
        .mockResolvedValueOnce([]);

      const result = await service.getDescendants(1);

      expect(result).toEqual([
        { id: 2, name: 'Laptops', slug: 'laptops' },
        { id: 3, name: 'Phones', slug: 'phones' },
        { id: 4, name: 'Gaming', slug: 'gaming' },
      ]);
    });

    it('should handle category with no children', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const result = await service.getDescendants(1);

      expect(result).toEqual([]);
    });
  });

  describe('reorderCategories', () => {
    it('should update sort orders for multiple categories', async () => {
      const categoryOrders = [
        { id: 1, sortOrder: 0 },
        { id: 2, sortOrder: 1 },
        { id: 3, sortOrder: 2 },
      ];

      mockStrapi.entityService.update.mockResolvedValue({});

      const result = await service.reorderCategories(null, categoryOrders);

      expect(mockStrapi.entityService.update).toHaveBeenCalledTimes(3);
      expect(mockStrapi.entityService.update).toHaveBeenCalledWith(
        'api::category.category',
        1,
        { data: { sortOrder: 0 } }
      );
      expect(result).toBe(true);
    });
  });

  describe('getCategoriesByStatus', () => {
    it('should filter categories by active status', async () => {
      const mockCategories = [
        { id: 1, name: 'Electronics', isActive: true },
        { id: 2, name: 'Laptops', isActive: true },
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockCategories);

      const result = await service.getCategoriesByStatus(true);

      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::category.category',
        expect.objectContaining({
          filters: {
            isActive: true,
            publishedAt: { $notNull: true },
          },
        })
      );
      expect(result).toEqual(mockCategories);
    });

    it('should filter categories by parent and status', async () => {
      const mockCategories = [
        { id: 2, name: 'Laptops', isActive: false, parent: 1 },
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockCategories);

      const result = await service.getCategoriesByStatus(false, 1);

      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::category.category',
        expect.objectContaining({
          filters: {
            isActive: false,
            publishedAt: { $notNull: true },
            parent: 1,
          },
        })
      );
    });
  });
});
