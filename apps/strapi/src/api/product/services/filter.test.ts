/**
 * Product filter service tests
 * 
 * Tests for product filtering functionality including category, price, and attribute filtering
 */

const mockStrapi = {
  contentType: jest.fn().mockReturnValue({
    kind: 'collectionType',
  }),
  entityService: {
    findMany: jest.fn() as jest.MockedFunction<any>,
  },
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
    (factories.createCoreService as jest.MockedFunction<any>).mockImplementation(
      (serviceName, serviceFunction) => {
        return serviceFunction({ strapi: mockStrapi });
      }
    );
    
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
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const result = await filterService.applyCategoryFilter(originalFilters, 1, false);
      
      expect(result).toEqual({
        status: 'active',
        category: { id: 1 },
      });
    }, 5000); // 5 second timeout

    it('should apply category filter with subcategories', async () => {
      const originalFilters = { status: 'active' };
      const mockSubcategories = [
        { id: 2, name: 'Electronics > Phones' },
        { id: 3, name: 'Electronics > Laptops' },
      ];
      
      // Mock getSubcategories to prevent recursive calls
      jest.spyOn(filterService, 'getSubcategories').mockResolvedValue(mockSubcategories);

      const result = await filterService.applyCategoryFilter(originalFilters, 1, true);
      
      expect(result).toEqual({
        status: 'active',
        category: { id: { $in: [1, 2, 3] } },
      });
    }, 5000); // 5 second timeout

    it('should handle errors gracefully', async () => {
      const originalFilters = { status: 'active' };
      
      // Mock getSubcategories to throw an error
      jest.spyOn(filterService, 'getSubcategories').mockRejectedValue(new Error('Database error'));

      const result = await filterService.applyCategoryFilter(originalFilters, 1);
      
      expect(result).toEqual(originalFilters);
      expect(mockStrapi.log.error).toHaveBeenCalled();
    }, 5000); // 5 second timeout
  });

  describe('getSubcategories', () => {
    it('should return empty array when no subcategories exist', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const result = await filterService.getSubcategories(1);
      
      expect(result).toEqual([]);
    });

    it('should return direct subcategories', async () => {
      const mockSubcategories = [
        { id: 2, name: 'Electronics > Phones' },
        { id: 3, name: 'Electronics > Laptops' },
      ];
      
      // First call returns the direct children, subsequent calls return empty arrays to prevent recursion
      mockStrapi.entityService.findMany
        .mockResolvedValueOnce(mockSubcategories)
        .mockResolvedValue([]);

      const result = await filterService.getSubcategories(1);
      
      expect(result).toEqual(mockSubcategories);
    });

    it('should handle service errors', async () => {
      mockStrapi.entityService.findMany.mockRejectedValue(new Error('Database error'));

      const result = await filterService.getSubcategories(1);
      
      expect(result).toEqual([]);
      expect(mockStrapi.log.error).toHaveBeenCalled();
    });
  });

  describe('applyPriceFilter', () => {
    it('should return original filters when no price range provided', () => {
      const originalFilters = { status: 'active' };
      
      const result = filterService.applyPriceFilter(originalFilters);
      
      expect(result).toEqual(originalFilters);
    });

    it('should apply minimum price filter', () => {
      const originalFilters = { status: 'active' };
      
      const result = filterService.applyPriceFilter(originalFilters, { min: 10 });
      
      expect(result).toEqual({
        status: 'active',
        price: { $gte: 10 },
      });
    });

    it('should apply maximum price filter', () => {
      const originalFilters = { status: 'active' };
      
      const result = filterService.applyPriceFilter(originalFilters, { max: 100 });
      
      expect(result).toEqual({
        status: 'active',
        price: { $lte: 100 },
      });
    });

    it('should apply price range filter', () => {
      const originalFilters = { status: 'active' };
      
      const result = filterService.applyPriceFilter(originalFilters, { min: 10, max: 100 });
      
      expect(result).toEqual({
        status: 'active',
        price: { $gte: 10, $lte: 100 },
      });
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
      
      const result = filterService.applyAttributeFilters(originalFilters, attributes);
      
      expect(result).toEqual({
        status: 'active',
        color: { $containsi: 'red' },
        brand: { $containsi: 'Apple' },
      });
    });

    it('should apply array attribute filters', () => {
      const originalFilters = { status: 'active' };
      const attributes = { colors: ['red', 'blue'], sizes: ['M', 'L'] };
      
      const result = filterService.applyAttributeFilters(originalFilters, attributes);
      
      expect(result).toEqual({
        status: 'active',
        colors: { $in: ['red', 'blue'] },
        sizes: { $in: ['M', 'L'] },
      });
    });

    it('should apply boolean attribute filters', () => {
      const originalFilters = { status: 'active' };
      const attributes = { featured: true, onSale: false };
      
      const result = filterService.applyAttributeFilters(originalFilters, attributes);
      
      expect(result).toEqual({
        status: 'active',
        featured: true,
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
      
      const result = filterService.applyInventoryFilter(originalFilters, false, 5);
      
      expect(result).toEqual({
        status: 'active',
        inventory: { $gte: 5 },
      });
    });

    it('should combine in-stock and minimum stock filters', () => {
      const originalFilters = { status: 'active' };
      
      const result = filterService.applyInventoryFilter(originalFilters, true, 5);
      
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

    it('should validate price range', () => {
      const params = { minPrice: '10.99', maxPrice: '99.99' };
      
      const result = filterService.validateFilterParams(params);
      
      expect(result).toEqual({
        priceRange: { min: 10.99, max: 99.99 },
      });
    });

    it('should throw error for invalid price range', () => {
      const params = { minPrice: '100', maxPrice: '50' };
      
      expect(() => filterService.validateFilterParams(params)).toThrow(
        'Minimum price cannot be greater than maximum price'
      );
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
      const baseFilters = { status: 'active', publishedAt: { $notNull: true } };
      const filterParams = {
        categoryId: 1,
        priceRange: { min: 10, max: 100 },
        attributes: { color: 'red' },
        inStockOnly: true,
      };

      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const result = await filterService.buildFilters(baseFilters, filterParams);
      
      expect(result).toEqual({
        status: 'active',
        publishedAt: { $notNull: true },
        category: { id: { $in: [1] } },
        price: { $gte: 10, $lte: 100 },
        color: { $containsi: 'red' },
        inventory: { $gt: 0 },
      });
    });
  });

  describe('buildCategoryHierarchy', () => {
    it('should build hierarchical structure from flat categories', () => {
      const flatCategories = [
        { id: 1, name: 'Electronics', parent: null },
        { id: 2, name: 'Phones', parent: { id: 1 } },
        { id: 3, name: 'Laptops', parent: { id: 1 } },
        { id: 4, name: 'Smartphones', parent: { id: 2 } },
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
        { id: 1, name: 'Electronics', parent: null },
        { id: 2, name: 'Orphan Category', parent: { id: 999 } }, // Parent doesn't exist
      ];

      const result = filterService.buildCategoryHierarchy(flatCategories);
      
      expect(result).toHaveLength(2);
      expect(result.map(cat => cat.name)).toContain('Orphan Category');
    });
  });
});
