/**
 * Category controller tests
 *
 * Tests for category controller using new Document Service API and test standards
 */

// Third-party imports
import { beforeEach, describe, expect, it, jest } from '@jest/globals';


// Mock all dependencies
jest.mock('../services/category');

// Create mock document service methods
const mockDocumentMethods = {
  findOne: jest.fn() as jest.MockedFunction<any>,
  findFirst: jest.fn() as jest.MockedFunction<any>,
  findMany: jest.fn() as jest.MockedFunction<any>,
  create: jest.fn() as jest.MockedFunction<any>,
  update: jest.fn() as jest.MockedFunction<any>,
  delete: jest.fn() as jest.MockedFunction<any>,
  count: jest.fn() as jest.MockedFunction<any>,
};

// Mock service methods
const mockServiceMethods = {
  findByNameAndParent: jest.fn(),
  checkCircularReference: jest.fn(),
  getNextSortOrder: jest.fn(),
  getCategoryTree: jest.fn(),
  getBreadcrumbs: jest.fn(),
  getCategoryPath: jest.fn(),
  getDescendants: jest.fn(),
  getAncestors: jest.fn(),
  reorderCategories: jest.fn(),
  getCategoriesByStatus: jest.fn(),
  getCategoryStatistics: jest.fn() as jest.MockedFunction<any>,
  getNavigationMenu: jest.fn() as jest.MockedFunction<any>,
  getSiblingCategories: jest.fn() as jest.MockedFunction<any>,
  searchCategories: jest.fn() as jest.MockedFunction<any>,
};

// Mock Strapi instance with Document Service API
const mockStrapi: any = {
  documents: jest.fn((contentType: string) => {
    if (contentType === 'api::category.category') {
      return mockDocumentMethods;
    }
    if (contentType === 'api::product.product') {
      return mockDocumentMethods;
    }
    return mockDocumentMethods;
  }),
  service: jest.fn().mockReturnValue(mockServiceMethods),
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
    createCoreController: jest.fn(
      (serviceName: string, controllerFunction: any) => {
        return controllerFunction({ strapi: mockStrapi });
      }
    ),
  },
}));

const mockCtx: any = {
  params: {},
  query: {},
  request: { 
    body: {},
    params: {}
  },
  badRequest: jest.fn(),
  notFound: jest.fn(),
  throw: jest.fn(),
};

describe('Category Controller', () => {
  let controller: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all mock document methods
    Object.values(mockDocumentMethods).forEach((mockFn: any) => {
      if (jest.isMockFunction(mockFn)) {
        mockFn.mockReset();
      }
    });

    // Reset all mock service methods
    Object.values(mockServiceMethods).forEach((mockFn: any) => {
      if (jest.isMockFunction(mockFn)) {
        mockFn.mockReset();
      }
    });

    // Import the actual controller
    delete require.cache[require.resolve('./category')];
    const categoryController = require('./category').default;
    controller = categoryController;

    mockCtx.params = {};
    mockCtx.query = {};
    mockCtx.request = { body: {}, params: {} };
  });

  describe('find', () => {
    it('should return categories with default pagination and sorting', async () => {
      const mockCategories = [
        {
          documentId: 'cat1',
          name: 'Electronics',
          slug: 'electronics',
          sortOrder: 0,
        },
        {
          documentId: 'cat2',
          name: 'Clothing',
          slug: 'clothing',
          sortOrder: 1,
        },
      ];

      (mockDocumentMethods.findMany as any).mockResolvedValue(mockCategories);

      const result = await controller.find(mockCtx);

      expect(mockStrapi.documents).toHaveBeenCalledWith(
        'api::category.category'
      );
      expect(mockDocumentMethods.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {}, 
          sort: [{sortOrder: 'asc'}, {name: 'asc'}],
          limit: 25,
          start: 0,
        })
      );

      expect(result).toEqual({
        data: mockCategories,
        meta: {
          "pagination": {
            "page": 1,
            "pageCount": 1,
            "pageSize": 25,
            "total": 2,
          },
        },
      });
    });

    it('should handle query parameters correctly', async () => {
      mockCtx.query = {
        filters: { isActive: true },
        sort: 'name:desc',
        page: 2,
        pageSize: 10,
      };

      (mockDocumentMethods.findMany as any).mockResolvedValue([]);

      await controller.find(mockCtx);

      expect(mockDocumentMethods.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: { isActive: true }, // Use publishedAt for Draft & Publish
          sort: 'name:desc',
          limit: 10,
          start: 10,
        })
      );
    });

    it('should handle errors and throw 500', async () => {
      mockStrapi
        .documents('api::category.category')
        .findMany.mockRejectedValue(new Error('Database error'));

      await controller.find(mockCtx);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error in category find:',
        expect.any(Error)
      );
      expect(mockCtx.throw).toHaveBeenCalledWith(500, 'Internal server error');
    });
  });

  describe('findOne', () => {
    it('should return category with breadcrumbs', async () => {
      const mockCategory = {
        documentId: 'cat1',
        name: 'Electronics',
        slug: 'electronics',
        parent: null,
        children: [],
      };
      const mockBreadcrumbs = [
        { documentId: 'cat1', name: 'Electronics', slug: 'electronics' },
      ];

      mockCtx.request.params.id = 'cat1';
      mockStrapi
        .documents('api::category.category')
        .findOne.mockResolvedValue(mockCategory);
      mockStrapi.service().getBreadcrumbs.mockResolvedValue(mockBreadcrumbs);

      const result = await controller.findOne(mockCtx);

      expect(mockStrapi.documents).toHaveBeenCalledWith(
        'api::category.category'
      );
      expect(
        mockStrapi.documents('api::category.category').findOne
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'cat1',
          populate: expect.objectContaining({
            parent: true,
            children: true,
            seo: true,
          }),
        })
      );

      expect(result).toEqual({
        data: { ...mockCategory, breadcrumbs: mockBreadcrumbs },
      });
    });

    it('should return bad request if no documentId provided', async () => {
      mockCtx.request.params.id = undefined;

      await controller.findOne(mockCtx);

      expect(mockCtx.badRequest).toHaveBeenCalledWith(
        'Category docudmentId is required'
      );
    });

    it('should return not found if category does not exist', async () => {
      mockCtx.request.params.id = 'nonexistent';
      mockStrapi
        .documents('api::category.category')
        .findOne.mockResolvedValue(null);

      await controller.findOne(mockCtx);

      expect(mockCtx.notFound).toHaveBeenCalledWith('FindOne: Category not found');
    });
  });

  describe('create', () => {
    it('should create category successfully', async () => {
      const categoryData = {
        name: 'Electronics',
        description: 'Electronic products',
        isActive: true,
      };
      const mockCreatedCategory = { documentId: 'cat1', ...categoryData };

      mockCtx.request.body = { data: categoryData };
      mockStrapi.service().findByNameAndParent.mockResolvedValue(null);
      mockStrapi.service().getNextSortOrder.mockResolvedValue(0);
      mockStrapi
        .documents('api::category.category')
        .create.mockResolvedValue(mockCreatedCategory);

      const result = await controller.create(mockCtx);

      expect(mockStrapi.service().findByNameAndParent).toHaveBeenCalledWith(
        'Electronics',
        null
      );
      expect(mockStrapi.service().getNextSortOrder).toHaveBeenCalledWith(
        undefined
      );
      expect(mockStrapi.documents).toHaveBeenCalledWith(
        'api::category.category'
      );
      expect(
        mockStrapi.documents('api::category.category').create
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ...categoryData, sortOrder: 0 }),
        })
      );

      expect(result).toEqual({ data: mockCreatedCategory });
    });

    it('should validate parent category exists', async () => {
      const categoryData = {
        name: 'Laptops',
        parent: 'parent-cat-id',
      };

      mockCtx.request.body = { data: categoryData };
      mockStrapi
        .documents('api::category.category')
        .findOne.mockResolvedValue(null);

      await controller.create(mockCtx);

      expect(
        mockStrapi.documents('api::category.category').findOne
      ).toHaveBeenCalledWith({
        documentId: 'parent-cat-id',
      });
      expect(mockCtx.badRequest).toHaveBeenCalledWith(
        'Parent category not found'
      );
    });

    it('should prevent circular references', async () => {
      const categoryData = {
        name: 'Laptops',
        parent: 1,
      };

      mockCtx.request.body = { data: categoryData };
      mockStrapi.documents('api::category.category').findOne.mockResolvedValue({
        documentId: 'parent-1',
        name: 'Electronics',
      });
      mockStrapi.service().checkCircularReference.mockResolvedValue(true);

      await controller.create(mockCtx);

      expect(mockCtx.badRequest).toHaveBeenCalledWith(
        'Circular reference detected in category hierarchy'
      );
    });

    it('should validate name uniqueness within parent', async () => {
      const categoryData = {
        name: 'Laptops',
        parent: 1,
      };

      mockCtx.request.body = { data: categoryData };
      mockStrapi.documents('api::category.category').findOne.mockResolvedValue({
        documentId: 'parent-1',
        name: 'Electronics',
      });
      mockStrapi.service().checkCircularReference.mockResolvedValue(false);
      mockStrapi
        .service()
        .findByNameAndParent.mockResolvedValue({ id: 2, name: 'Laptops' });

      await controller.create(mockCtx);

      expect(mockCtx.badRequest).toHaveBeenCalledWith(
        'Category name must be unique within the same parent category'
      );
    });

    it('should require category name', async () => {
      mockCtx.request.body = { data: {} };

      await controller.create(mockCtx);

      expect(mockCtx.badRequest).toHaveBeenCalledWith(
        'Category name is required'
      );
    });
  });

  describe('update', () => {
    it('should update category successfully', async () => {
      const updateData = {
        name: 'Updated Electronics',
        description: 'Updated description',
      };
      const existingCategory = {
        id: 1,
        name: 'Electronics',
        parent: null,
      };
      const mockUpdatedCategory = { ...existingCategory, ...updateData };

      mockCtx.request.params.id = '1';
      mockCtx.request.body = { data: updateData };
      (mockDocumentMethods.findOne as any).mockResolvedValue(existingCategory);
      (mockDocumentMethods.update as any).mockResolvedValue(
        mockUpdatedCategory
      );

      const result = await controller.update(mockCtx);

      expect(mockDocumentMethods.update).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: '1',
          data: updateData,
        })
      );

      expect(result).toEqual({ data: mockUpdatedCategory });
    });

    it('should validate parent change does not create circular reference', async () => {
      const updateData = { parent: 2 };
      const existingCategory = { id: 1, name: 'Electronics', parent: null };

      mockCtx.request.params.id = '1';
      mockCtx.request.body = { data: updateData };
      (mockDocumentMethods.findOne as any)
        .mockResolvedValueOnce(existingCategory)
        .mockResolvedValueOnce({ documentId: '2', name: 'Computers' });
      (mockServiceMethods.checkCircularReference as any).mockResolvedValue(
        true
      );

      await controller.update(mockCtx);

      expect(mockCtx.badRequest).toHaveBeenCalledWith(
        'Circular reference detected in category hierarchy'
      );
    });

    it('should return not found if category does not exist', async () => {
      mockCtx.request.params.id = '999';
      (mockDocumentMethods.findOne as any).mockResolvedValue(null);

      await controller.update(mockCtx);

      expect(mockCtx.notFound).toHaveBeenCalledWith('Category not found');
    });
  });

  describe('delete', () => {
    it('should delete category successfully', async () => {
      const category = {
        id: 1,
        name: 'Electronics',
        children: [],
        products: [],
      };

      mockCtx.request.params.id = '1';
      (mockDocumentMethods.findOne as any).mockResolvedValue(category);
      (mockDocumentMethods.delete as any).mockResolvedValue(category);

      const result = await controller.delete(mockCtx);

      expect(mockDocumentMethods.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: '1',
        })
      );
      expect(result).toEqual({ data: category });
    });

    it('should prevent deletion of category with children', async () => {
      const category = {
        id: 1,
        name: 'Electronics',
        children: [{ id: 2, name: 'Laptops' }],
        products: { count: 0 },
      };

      mockCtx.request.params.id = '1';
      (mockDocumentMethods.findOne as any).mockResolvedValue(category);

      await controller.delete(mockCtx);

      expect(mockCtx.badRequest).toHaveBeenCalledWith(
        'Cannot delete category with child categories. Please reassign or delete child categories first.'
      );
    });

    it('should prevent deletion of category with products', async () => {
      const category = {
        id: 1,
        name: 'Electronics',
        children: [],
        products: [
          { id: 1, title: 'Product 1' },
          { id: 2, title: 'Product 2' },
        ],
      };

      mockCtx.request.params.id = '1';
      (mockDocumentMethods.findOne as any).mockResolvedValue(category);

      await controller.delete(mockCtx);

      expect(mockCtx.badRequest).toHaveBeenCalledWith(
        'Cannot delete category with assigned products. Please reassign products to another category first.'
      );
    });
  });

  describe('getTree', () => {
    it('should return category tree structure', async () => {
      const mockTree = [
        {
          id: 1,
          name: 'Electronics',
          children: [
            { id: 2, name: 'Laptops', children: [] },
            { id: 3, name: 'Phones', children: [] },
          ],
        },
      ];

      mockStrapi.service().getCategoryTree.mockResolvedValue(mockTree);

      const result = await controller.getTree(mockCtx);

      expect(mockStrapi.service().getCategoryTree).toHaveBeenCalled();
      expect(result).toEqual({ data: mockTree });
    });

    it('should handle errors in tree generation', async () => {
      // Mock console.error to prevent error output in test
      const originalConsoleError = console.error;
      console.error = jest.fn();

      mockStrapi
        .service()
        .getCategoryTree.mockRejectedValue(new Error('Tree error'));

      await controller.getTree(mockCtx);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error getting category tree:',
        expect.any(Error)
      );
      expect(mockCtx.throw).toHaveBeenCalledWith(500, 'Internal server error');

      // Restore console.error
      console.error = originalConsoleError;
    });
  });

  describe('getBreadcrumbs', () => {
    it('should return breadcrumbs for category', async () => {
      const mockBreadcrumbs = [
        { id: 1, name: 'Electronics', slug: 'electronics' },
        { id: 2, name: 'Laptops', slug: 'laptops' },
      ];

      mockCtx.params.documentId = '2';
      (mockServiceMethods.getBreadcrumbs as any).mockResolvedValue(
        mockBreadcrumbs
      );

      const result = await controller.getBreadcrumbs(mockCtx);

      expect(mockServiceMethods.getBreadcrumbs).toHaveBeenCalledWith('2');
      expect(result).toEqual({ data: mockBreadcrumbs });
    });

    it('should require category ID', async () => {
      mockCtx.params.documentId = undefined;

      await controller.getBreadcrumbs(mockCtx);

      expect(mockCtx.badRequest).toHaveBeenCalledWith(
        'Category documentId is required'
      );
    });
  });

  describe('getProducts', () => {
    it('should return products for a category', async () => {
      const mockProducts = [
        { documentId: 'prod1', title: 'Product 1', price: 29.99 },
        { documentId: 'prod2', title: 'Product 2', price: 39.99 },
      ];

      mockCtx.params.documentId = 'cat1';
      mockCtx.query = { page: 1, pageSize: 10 };
      mockDocumentMethods.findOne.mockResolvedValueOnce({
        documentId: 'cat1',
        name: 'Electronics',
      });
      mockDocumentMethods.findMany.mockResolvedValueOnce(mockProducts);

      const result = await controller.getProducts(mockCtx);

      expect(mockStrapi.documents).toHaveBeenCalledWith(
        'api::category.category'
      );
      expect(mockStrapi.documents).toHaveBeenCalledWith('api::product.product');
      expect(result).toEqual({
        data: mockProducts,
        meta: {},
      });
    });

    it('should return 404 if category not found', async () => {
      mockCtx.params.documentId = 'nonexistent';
      mockDocumentMethods.findOne.mockResolvedValueOnce(null);

      await controller.getProducts(mockCtx);

      expect(mockCtx.notFound).toHaveBeenCalledWith('Category not found');
    });

    it('should require category documentId', async () => {
      mockCtx.params.documentId = undefined;

      await controller.getProducts(mockCtx);

      expect(mockCtx.badRequest).toHaveBeenCalledWith(
        'Category documentId is required'
      );
    });
  });

  describe('assignProducts', () => {
    it('should assign products to category', async () => {
      const productIds = ['prod1', 'prod2'];
      mockCtx.params.documentId = 'cat1';
      mockCtx.request.body = { productIds };
      mockDocumentMethods.findOne.mockResolvedValueOnce({
        documentId: 'cat1',
        name: 'Electronics',
      });
      mockDocumentMethods.update.mockResolvedValue({});

      const result = await controller.assignProducts(mockCtx);

      expect(result.data.message).toBe('Products assigned successfully');
      expect(result.data.productCount).toBe(2);
    });

    it('should return 404 if category not found', async () => {
      mockCtx.params.documentId = 'nonexistent';
      mockCtx.request.body = { productIds: ['prod1'] };
      mockDocumentMethods.findOne.mockResolvedValueOnce(null);

      await controller.assignProducts(mockCtx);

      expect(mockCtx.notFound).toHaveBeenCalledWith('Category not found');
    });

    it('should validate product IDs array', async () => {
      mockCtx.params.documentId = 'cat1';
      mockCtx.request.body = { productIds: 'invalid' };

      await controller.assignProducts(mockCtx);

      expect(mockCtx.badRequest).toHaveBeenCalledWith(
        'Product IDs array is required'
      );
    });
  });

  describe('removeProducts', () => {
    it('should remove products from category', async () => {
      const productIds = ['prod1', 'prod2'];
      mockCtx.params.documentId = 'cat1';
      mockCtx.request.body = { productIds };
      mockDocumentMethods.findOne.mockResolvedValueOnce({
        documentId: 'cat1',
        name: 'Electronics',
      });
      mockDocumentMethods.update.mockResolvedValue({});

      const result = await controller.removeProducts(mockCtx);

      expect(result.data.message).toBe('Products removed successfully');
      expect(result.data.productCount).toBe(2);
    });
  });

  describe('moveProducts', () => {
    it('should move products between categories', async () => {
      const productIds = ['prod1', 'prod2'];
      const targetCategoryId = 'cat2';
      mockCtx.params.documentId = 'cat1';
      mockCtx.request.body = { productIds, targetCategoryId };
      mockDocumentMethods.findOne
        .mockResolvedValueOnce({ documentId: 'cat1', name: 'Electronics' })
        .mockResolvedValueOnce({ documentId: 'cat2', name: 'Computers' });
      mockDocumentMethods.update.mockResolvedValue({});

      const result = await controller.moveProducts(mockCtx);

      expect(result.data.message).toBe('Products moved successfully');
      expect(result.data.productCount).toBe(2);
    });

    it('should validate target category exists', async () => {
      mockCtx.params.documentId = 'cat1';
      mockCtx.request.body = {
        productIds: ['prod1'],
        targetCategoryId: 'nonexistent',
      };
      mockDocumentMethods.findOne
        .mockResolvedValueOnce({ documentId: 'cat1', name: 'Electronics' })
        .mockResolvedValueOnce(null);

      await controller.moveProducts(mockCtx);

      expect(mockCtx.badRequest).toHaveBeenCalledWith(
        'Target category not found'
      );
    });
  });

  describe('getStats', () => {
    it('should return category statistics', async () => {
      const mockStats = {
        categoryId: 'cat1',
        totalProducts: 10,
        activeProducts: 8,
      };

      mockCtx.params.documentId = 'cat1';
      mockDocumentMethods.findOne.mockResolvedValueOnce({
        documentId: 'cat1',
        name: 'Electronics',
      });
      mockServiceMethods.getCategoryStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockCtx);

      expect(result.data).toEqual(mockStats);
    });
  });

  describe('getNavigation', () => {
    it('should return navigation menu', async () => {
      const mockNavigation = [
        { id: 'cat1', name: 'Electronics', children: [] },
      ];

      mockServiceMethods.getNavigationMenu.mockResolvedValue(mockNavigation);

      const result = await controller.getNavigation(mockCtx);

      expect(result.data).toEqual(mockNavigation);
    });

    it('should handle maxDepth parameter', async () => {
      mockCtx.query = { maxDepth: '2' };
      mockServiceMethods.getNavigationMenu.mockResolvedValue([]);

      await controller.getNavigation(mockCtx);

      expect(mockServiceMethods.getNavigationMenu).toHaveBeenCalledWith(2);
    });
  });

  describe('getSiblings', () => {
    it('should return sibling categories', async () => {
      const mockSiblings = [
        { documentId: 'cat2', name: 'Computers' },
        { documentId: 'cat3', name: 'Phones' },
      ];

      mockCtx.params.documentId = 'cat1';
      mockServiceMethods.getSiblingCategories.mockResolvedValue(mockSiblings);

      const result = await controller.getSiblings(mockCtx);

      expect(result.data).toEqual(mockSiblings);
    });
  });

  describe('search', () => {
    it('should search categories', async () => {
      const mockResults = [{ documentId: 'cat1', name: 'Electronics' }];

      mockCtx.query = { q: 'electronics', limit: '10' };
      mockServiceMethods.searchCategories.mockResolvedValue(mockResults);

      const result = await controller.search(mockCtx);

      expect(mockServiceMethods.searchCategories).toHaveBeenCalledWith(
        'electronics',
        10
      );
      expect(result.data).toEqual(mockResults);
    });

    it('should require search term', async () => {
      mockCtx.query = {};

      await controller.search(mockCtx);

      expect(mockCtx.badRequest).toHaveBeenCalledWith(
        'Search term is required'
      );
    });
  });
});
