/**
 * Category controller tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock all dependencies
jest.mock('../services/category');

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
  service: jest.fn().mockReturnValue({
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
  }),
  log: {
    error: jest.fn(),
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
  request: { body: {} },
  badRequest: jest.fn(),
  notFound: jest.fn(),
  throw: jest.fn(),
};

describe('Category Controller', () => {
  let controller: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Import the actual controller
    const categoryController = require('./category').default;
    controller = categoryController;

    mockCtx.params = {};
    mockCtx.query = {};
    mockCtx.request = { body: {} };
  });

  describe('find', () => {
    it('should return categories with default pagination and sorting', async () => {
      const mockCategories = [
        { id: 1, name: 'Electronics', slug: 'electronics', sortOrder: 0 },
        { id: 2, name: 'Clothing', slug: 'clothing', sortOrder: 1 },
      ];
      const mockPagination = { page: 1, pageSize: 25, pageCount: 1, total: 2 };

      mockStrapi.entityService.findPage.mockResolvedValue({
        results: mockCategories,
        pagination: mockPagination,
      });

      const result = await controller.find(mockCtx);

      expect(mockStrapi.entityService.findPage).toHaveBeenCalledWith(
        'api::category.category',
        expect.objectContaining({
          filters: { publishedAt: { $notNull: true } },
          sort: { sortOrder: 'asc', name: 'asc' },
          pagination: { page: 1, pageSize: 25 },
        })
      );

      expect(result).toEqual({
        data: mockCategories,
        meta: { pagination: mockPagination },
      });
    });

    it('should handle query parameters correctly', async () => {
      mockCtx.query = {
        filters: { isActive: true },
        sort: { name: 'desc' },
        page: 2,
        pageSize: 10,
      };

      mockStrapi.entityService.findPage.mockResolvedValue({
        results: [],
        pagination: { page: 2, pageSize: 10, pageCount: 1, total: 0 },
      });

      await controller.find(mockCtx);

      expect(mockStrapi.entityService.findPage).toHaveBeenCalledWith(
        'api::category.category',
        expect.objectContaining({
          filters: { isActive: true, publishedAt: { $notNull: true } },
          sort: { name: 'desc' },
          pagination: { page: 2, pageSize: 10 },
        })
      );
    });

    it('should handle errors and throw 500', async () => {
      mockStrapi.entityService.findPage.mockRejectedValue(
        new Error('Database error')
      );

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
        id: 1,
        name: 'Electronics',
        slug: 'electronics',
        parent: null,
        children: [],
      };
      const mockBreadcrumbs = [
        { id: 1, name: 'Electronics', slug: 'electronics' },
      ];

      mockCtx.params.id = '1';
      mockStrapi.entityService.findOne.mockResolvedValue(mockCategory);
      mockStrapi.service().getBreadcrumbs.mockResolvedValue(mockBreadcrumbs);

      const result = await controller.findOne(mockCtx);

      expect(mockStrapi.entityService.findOne).toHaveBeenCalledWith(
        'api::category.category',
        '1',
        expect.objectContaining({
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

    it('should return bad request if no ID provided', async () => {
      mockCtx.params.id = undefined;

      await controller.findOne(mockCtx);

      expect(mockCtx.badRequest).toHaveBeenCalledWith(
        'Category ID is required'
      );
    });

    it('should return not found if category does not exist', async () => {
      mockCtx.params.id = '999';
      mockStrapi.entityService.findOne.mockResolvedValue(null);

      await controller.findOne(mockCtx);

      expect(mockCtx.notFound).toHaveBeenCalledWith('Category not found');
    });
  });

  describe('create', () => {
    it('should create category successfully', async () => {
      const categoryData = {
        name: 'Electronics',
        description: 'Electronic products',
        isActive: true,
      };
      const mockCreatedCategory = { id: 1, ...categoryData };

      mockCtx.request.body = { data: categoryData };
      mockStrapi.service().findByNameAndParent.mockResolvedValue(null);
      mockStrapi.service().getNextSortOrder.mockResolvedValue(0);
      mockStrapi.entityService.create.mockResolvedValue(mockCreatedCategory);

      const result = await controller.create(mockCtx);

      expect(mockStrapi.service().findByNameAndParent).toHaveBeenCalledWith(
        'Electronics',
        null
      );
      expect(mockStrapi.service().getNextSortOrder).toHaveBeenCalledWith(
        undefined
      );
      expect(mockStrapi.entityService.create).toHaveBeenCalledWith(
        'api::category.category',
        expect.objectContaining({
          data: expect.objectContaining({ ...categoryData, sortOrder: 0 }),
        })
      );

      expect(result).toEqual({ data: mockCreatedCategory });
    });

    it('should validate parent category exists', async () => {
      const categoryData = {
        name: 'Laptops',
        parent: 1,
      };

      mockCtx.request.body = { data: categoryData };
      mockStrapi.entityService.findOne.mockResolvedValue(null);

      await controller.create(mockCtx);

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
      mockStrapi.entityService.findOne.mockResolvedValue({
        id: 1,
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
      mockStrapi.entityService.findOne.mockResolvedValue({
        id: 1,
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

      mockCtx.params.id = '1';
      mockCtx.request.body = { data: updateData };
      mockStrapi.entityService.findOne.mockResolvedValue(existingCategory);
      mockStrapi.entityService.update.mockResolvedValue(mockUpdatedCategory);

      const result = await controller.update(mockCtx);

      expect(mockStrapi.entityService.update).toHaveBeenCalledWith(
        'api::category.category',
        '1',
        expect.objectContaining({
          data: updateData,
        })
      );

      expect(result).toEqual({ data: mockUpdatedCategory });
    });

    it('should validate parent change does not create circular reference', async () => {
      const updateData = { parent: 2 };
      const existingCategory = { id: 1, name: 'Electronics', parent: null };

      mockCtx.params.id = '1';
      mockCtx.request.body = { data: updateData };
      mockStrapi.entityService.findOne
        .mockResolvedValueOnce(existingCategory)
        .mockResolvedValueOnce({ id: 2, name: 'Computers' });
      mockStrapi.service().checkCircularReference.mockResolvedValue(true);

      await controller.update(mockCtx);

      expect(mockCtx.badRequest).toHaveBeenCalledWith(
        'Circular reference detected in category hierarchy'
      );
    });

    it('should return not found if category does not exist', async () => {
      mockCtx.params.id = '999';
      mockStrapi.entityService.findOne.mockResolvedValue(null);

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

      mockCtx.params.id = '1';
      mockStrapi.entityService.findOne.mockResolvedValue(category);
      mockStrapi.entityService.delete.mockResolvedValue(category);

      const result = await controller.delete(mockCtx);

      expect(mockStrapi.entityService.delete).toHaveBeenCalledWith(
        'api::category.category',
        '1'
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

      mockCtx.params.id = '1';
      mockStrapi.entityService.findOne.mockResolvedValue(category);

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

      mockCtx.params.id = '1';
      mockStrapi.entityService.findOne.mockResolvedValue(category);

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
      mockStrapi
        .service()
        .getCategoryTree.mockRejectedValue(new Error('Tree error'));

      await controller.getTree(mockCtx);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error getting category tree:',
        expect.any(Error)
      );
      expect(mockCtx.throw).toHaveBeenCalledWith(500, 'Internal server error');
    });
  });

  describe('getBreadcrumbs', () => {
    it('should return breadcrumbs for category', async () => {
      const mockBreadcrumbs = [
        { id: 1, name: 'Electronics', slug: 'electronics' },
        { id: 2, name: 'Laptops', slug: 'laptops' },
      ];

      mockCtx.params.id = '2';
      mockStrapi.service().getBreadcrumbs.mockResolvedValue(mockBreadcrumbs);

      const result = await controller.getBreadcrumbs(mockCtx);

      expect(mockStrapi.service().getBreadcrumbs).toHaveBeenCalledWith('2');
      expect(result).toEqual({ data: mockBreadcrumbs });
    });

    it('should require category ID', async () => {
      mockCtx.params.id = undefined;

      await controller.getBreadcrumbs(mockCtx);

      expect(mockCtx.badRequest).toHaveBeenCalledWith(
        'Category ID is required'
      );
    });
  });
});
