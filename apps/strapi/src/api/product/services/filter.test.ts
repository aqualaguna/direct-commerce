/**
 * Product filter service tests
 *
 * Tests for product filtering functionality including category, and attribute filtering
 */

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

const mockStrapi = {
  contentType: jest.fn().mockReturnValue({
    kind: 'collectionType',
  }),
  documents: jest.fn(() => mockDocumentsAPI),
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
    createCoreService: jest.fn() as jest.MockedFunction<any>,
  },
}));

describe('Product Filter Service', () => {
  let filterService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up the factory mock
    const { factories } = require('@strapi/strapi');
    (
      factories.createCoreService as jest.MockedFunction<any>
    ).mockImplementation((serviceName, serviceFunction) => {
      return serviceFunction({ strapi: mockStrapi });
    });

    // Import the filter service
    const filterServiceModule = require('./filter').default;
    filterService = filterServiceModule;
  });

  describe('applyCategoryFilter', () => {
    it('should return original filters when no category ID provided', async () => {
      const originalFilters = { status: 'active' };

      const result = await filterService.applyCategoryFilter(originalFilters);

      expect(result).toEqual(originalFilters);
    }, 5000); // 5 second timeout

    it('should apply simple category filter', async () => {
      const originalFilters = { status: 'active' };
      mockDocumentsAPI.findMany.mockResolvedValue([]);

      const result = await filterService.applyCategoryFilter(
        originalFilters,
        1,
        false
      );

      expect(result).toEqual({
        status: 'active',
        category: { documentId: '1' },
      });
    }, 5000); // 5 second timeout

    it('should apply category filter with subcategories', async () => {
      const originalFilters = { status: 'active' };
      const mockSubcategories = [
        { documentId: '2', name: 'Electronics > Phones' },
        { documentId: '3', name: 'Electronics > Laptops' },
      ];

      // Mock getSubcategories to prevent recursive calls
      jest
        .spyOn(filterService, 'getSubcategories')
        .mockResolvedValue(mockSubcategories);

      const result = await filterService.applyCategoryFilter(
        originalFilters,
        1,
        true
      );

      expect(result).toEqual({
        status: 'active',
        category: { documentId: { $in: ['1', '2', '3'] } },
      });
    }, 5000); // 5 second timeout

    it('should handle errors gracefully', async () => {
      const originalFilters = { status: 'active' };

      // Mock getSubcategories to throw an error
      jest
        .spyOn(filterService, 'getSubcategories')
        .mockRejectedValue(new Error('Database error'));

      const result = await filterService.applyCategoryFilter(
        originalFilters,
        1
      );

      expect(result).toEqual(originalFilters);
      expect(mockStrapi.log.error).toHaveBeenCalled();
    }, 5000); // 5 second timeout
  });

  describe('getSubcategories', () => {
    it('should return empty array when no subcategories exist', async () => {
      mockDocumentsAPI.findMany.mockResolvedValue([]);

      const result = await filterService.getSubcategories(1);

      expect(result).toEqual([]);
    });

    it('should return direct subcategories', async () => {
      const mockSubcategories = [
        { documentId: '2', name: 'Electronics > Phones' },
        { documentId: '3', name: 'Electronics > Laptops' },
      ];

      // Mock the first call to return direct children
      mockDocumentsAPI.findMany.mockResolvedValueOnce(mockSubcategories);
      // Mock subsequent recursive calls to return empty arrays
      mockDocumentsAPI.findMany.mockResolvedValue([]);

      const result = await filterService.getSubcategories(1);

      expect(result).toEqual(mockSubcategories);
    });

    it('should handle service errors', async () => {
      mockDocumentsAPI.findMany.mockRejectedValue(new Error('Database error'));

      const result = await filterService.getSubcategories(1);

      expect(result).toEqual([]);
      expect(mockStrapi.log.error).toHaveBeenCalled();
    });
  });


  describe('applyAttributeFilters', () => {
    it('should return original filters when no attributes provided', () => {
      const originalFilters = { status: 'active' };

      const result = filterService.applyAttributeFilters(originalFilters);

      expect(result).toEqual(originalFilters);
    });

    it('should apply string attribute filters', () => {
      const originalFilters = { status: 'active' };
      const attributes = { color: 'red', brand: 'Apple' };

      const result = filterService.applyAttributeFilters(
        originalFilters,
        attributes
      );

      expect(result).toEqual({
        status: 'active',
        color: { $containsi: 'red' },
        brand: { $containsi: 'Apple' },
      });
    });

    it('should apply array attribute filters', () => {
      const originalFilters = { status: 'active' };
      const attributes = { colors: ['red', 'blue'], sizes: ['M', 'L'] };

      const result = filterService.applyAttributeFilters(
        originalFilters,
        attributes
      );

      expect(result).toEqual({
        status: 'active',
        colors: { $in: ['red', 'blue'] },
        sizes: { $in: ['M', 'L'] },
      });
    });

    it('should apply boolean attribute filters', () => {
      const originalFilters = { status: 'active' };
      const attributes = { onSale: false };

      const result = filterService.applyAttributeFilters(
        originalFilters,
        attributes
      );

      expect(result).toEqual({
        status: 'active',
        onSale: false,
      });
    });
  });

  describe('applyInventoryFilter', () => {
    it('should return original filters when no inventory filters applied', () => {
      const originalFilters = { status: 'active' };

      const result = filterService.applyInventoryFilter(originalFilters);

      expect(result).toEqual(originalFilters);
    });

    it('should apply in-stock filter', () => {
      const originalFilters = { status: 'active' };

      const result = filterService.applyInventoryFilter(originalFilters, true);

      expect(result).toEqual({
        status: 'active',
        inventory: { $gt: 0 },
      });
    });

    it('should apply minimum stock filter', () => {
      const originalFilters = { status: 'active' };

      const result = filterService.applyInventoryFilter(
        originalFilters,
        false,
        5
      );

      expect(result).toEqual({
        status: 'active',
        inventory: { $gte: 5 },
      });
    });

    it('should combine in-stock and minimum stock filters', () => {
      const originalFilters = { status: 'active' };

      const result = filterService.applyInventoryFilter(
        originalFilters,
        true,
        5
      );

      expect(result).toEqual({
        status: 'active',
        inventory: { $gt: 0, $gte: 5 },
      });
    });
  });

  describe('validateFilterParams', () => {
    it('should validate and sanitize category ID', () => {
      const params = { categoryId: '123' };

      const result = filterService.validateFilterParams(params);

      expect(result).toEqual({ categoryId: 123 });
    });

    it('should reject invalid category ID', () => {
      const params = { categoryId: 'invalid' };

      const result = filterService.validateFilterParams(params);

      expect(result).toEqual({});
    });

    it('should validate inventory filters', () => {
      const params = { inStockOnly: 'true', minStock: '5' };

      const result = filterService.validateFilterParams(params);

      expect(result).toEqual({
        inStockOnly: true,
        minStock: 5,
      });
    });

    it('should extract custom attributes', () => {
      const params = {
        categoryId: '1',
        color: 'red',
        brand: 'Apple',
        size: 'M',
      };

      const result = filterService.validateFilterParams(params);

      expect(result).toEqual({
        categoryId: 1,
        attributes: {
          color: 'red',
          brand: 'Apple',
          size: 'M',
        },
      });
    });
  });

  describe('buildFilters', () => {
    it('should build complete filter object', async () => {
      const baseFilters = { status: 'active' };
      const filterParams = {
        categoryId: 1,
        attributes: { color: 'red' },
        inStockOnly: true,
      };

      mockDocumentsAPI.findMany.mockResolvedValue([]);

      const result = await filterService.buildFilters(
        baseFilters,
        filterParams
      );

      expect(result).toEqual({
        status: 'active',
        category: { documentId: { $in: ['1'] } },
        color: { $containsi: 'red' },
        inventory: { $gt: 0 },
      });
    });
  });

  describe('buildCategoryHierarchy', () => {
    it('should build hierarchical structure from flat categories', () => {
      const flatCategories = [
        { documentId: '1', name: 'Electronics', parent: null },
        { documentId: '2', name: 'Phones', parent: { documentId: '1' } },
        { documentId: '3', name: 'Laptops', parent: { documentId: '1' } },
        { documentId: '4', name: 'Smartphones', parent: { documentId: '2' } },
      ];

      const result = filterService.buildCategoryHierarchy(flatCategories);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Electronics');
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children[0].name).toBe('Phones');
      expect(result[0].children[0].children).toHaveLength(1);
      expect(result[0].children[0].children[0].name).toBe('Smartphones');
    });

    it('should handle orphaned categories', () => {
      const flatCategories = [
        { documentId: '1', name: 'Electronics', parent: null },
        {
          documentId: '2',
          name: 'Orphan Category',
          parent: { documentId: '999' },
        }, // Parent doesn't exist
      ];

      const result = filterService.buildCategoryHierarchy(flatCategories);

      expect(result).toHaveLength(2);
      expect(result.map(cat => cat.name)).toContain('Orphan Category');
    });
  });
});
