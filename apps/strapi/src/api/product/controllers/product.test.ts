/**
 * Product controller tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock all dependencies
jest.mock('../services/product-validation');
jest.mock('../services/product');
jest.mock('../services/seo');
jest.mock('../services/bulk-operations');

const mockStrapi: any = {
  entityService: {
    findOne: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  service: jest.fn().mockReturnValue({
    updateStatus: jest.fn(),
    findByStatus: jest.fn(),
    findWithStatusFilter: jest.fn(),
    bulkUpdateStatus: jest.fn(),
    getStatusStatistics: jest.fn(),
    publishProduct: jest.fn(),
    unpublishProduct: jest.fn(),
    reactivateProduct: jest.fn(),
    getProductsReadyForPublication: jest.fn(),
    generateSEOData: jest.fn(),
    validateSEOData: jest.fn(),
    optimizeSEOData: jest.fn(),
    generateSitemapData: jest.fn(),
    importFromCSV: jest.fn(),
    importFromJSON: jest.fn(),
    exportToCSV: jest.fn(),
    exportToJSON: jest.fn(),
    bulkUpdateFields: jest.fn(),
    bulkDelete: jest.fn(),
    generateCSVTemplate: jest.fn(),
  }),
  log: {
    error: jest.fn(),
  },
};

// Mock the Strapi factories
jest.mock('@strapi/strapi', () => ({
  factories: {
    createCoreController: jest.fn((serviceName: string, controllerFunction: any) => {
      return controllerFunction({ strapi: mockStrapi });
    }),
  },
}));

describe('Product Controller', () => {
  let controller: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Import the actual controller
    const productController = require('./product').default;
    controller = productController;
  });

  describe('find', () => {
    it('should return products with pagination', async () => {
      const mockProducts = [
        { id: 1, title: 'Product 1', price: 29.99 },
        { id: 2, title: 'Product 2', price: 39.99 },
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockProducts);

      const ctx = {
        query: { page: 1, pageSize: 10 },
        state: { user: null },
        set: jest.fn(),
      };

      const result = await controller.find(ctx);

      expect(result.data).toEqual(mockProducts);
      expect(mockStrapi.entityService.findMany).toHaveBeenCalled();
    });

    it('should allow admin to see unpublished products', async () => {
      const mockProducts = [
        { id: 1, title: 'Published Product', publishedAt: new Date() },
        { id: 2, title: 'Unpublished Product', publishedAt: null },
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockProducts);

      const ctx = {
        query: { page: 1, pageSize: 10 },
        state: { user: { role: { type: 'admin' } } },
        set: jest.fn(),
      };

      const result = await controller.find(ctx);

      expect(result.data).toEqual(mockProducts);
      expect(mockStrapi.entityService.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single product by ID', async () => {
      const mockProduct = { id: 1, title: 'Test Product', price: 29.99, publishedAt: new Date() };

      mockStrapi.entityService.findOne.mockResolvedValue(mockProduct);

      const ctx = {
        params: { id: 1 },
        state: { user: null },
        badRequest: jest.fn(),
        notFound: jest.fn(),
        set: jest.fn(),
        throw: jest.fn(),
      };

      const result = await controller.findOne(ctx);

      expect(result).toEqual({ data: mockProduct });
      expect(mockStrapi.entityService.findOne).toHaveBeenCalledWith(
        'api::product.product',
        1,
        {
          populate: {
            images: {
              fields: ['url', 'width', 'height', 'formats'],
            },
            category: {
              fields: ['id', 'name', 'slug'],
            },
            seo: true,
          },
        }
      );
    });

    it('should return 404 for non-existent product', async () => {
      mockStrapi.entityService.findOne.mockResolvedValue(null);

      const ctx = {
        params: { id: 99999 },
        state: { user: null },
        badRequest: jest.fn(),
        notFound: jest.fn(),
        set: jest.fn(),
      };

      await controller.findOne(ctx);

      expect(ctx.notFound).toHaveBeenCalledWith('Product not found');
    });
  });

  describe('create', () => {
    it('should create a new product with valid data', async () => {
      const productData = {
        title: 'New Product',
        description: 'New product description',
        shortDescription: 'New short desc',
        price: 29.99,
        sku: 'NEW-001',
        inventory: 10,
      };

      const mockCreatedProduct = { id: 1, ...productData };

      mockStrapi.entityService.create.mockResolvedValue(mockCreatedProduct);
      mockStrapi.entityService.findMany.mockResolvedValue([]); // No existing SKU

      const ctx = {
        request: { body: { data: productData } },
        badRequest: jest.fn(),
        set: jest.fn(),
      };

      const result = await controller.create(ctx);

      expect(result.data).toEqual(mockCreatedProduct);
      expect(mockStrapi.entityService.create).toHaveBeenCalledWith(
        'api::product.product',
        expect.objectContaining({
          data: productData,
          populate: expect.any(Object),
        })
      );
    });

    it('should return 400 for invalid product data', async () => {
      const invalidData = {
        title: '', // Invalid: empty title
        price: -10, // Invalid: negative price
      };

      const ctx = {
        request: { body: { data: invalidData } },
        badRequest: jest.fn(),
        set: jest.fn(),
      };

      await controller.create(ctx);

      expect(ctx.badRequest).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an existing product', async () => {
      const existingProduct = {
        id: 1,
        title: 'Original Product',
        sku: 'ORIG-001',
        price: 29.99,
      };

      const updateData = {
        title: 'Updated Product',
        price: 39.99,
      };

      const mockUpdatedProduct = { ...existingProduct, ...updateData };

      mockStrapi.entityService.findOne.mockResolvedValue(existingProduct);
      mockStrapi.entityService.update.mockResolvedValue(mockUpdatedProduct);

      const ctx = {
        params: { id: 1 },
        request: { body: { data: updateData } },
        badRequest: jest.fn(),
        notFound: jest.fn(),
        set: jest.fn(),
      };

      const result = await controller.update(ctx);

      expect(result.data).toEqual(mockUpdatedProduct);
      expect(mockStrapi.entityService.update).toHaveBeenCalledWith(
        'api::product.product',
        1,
        expect.objectContaining({
          data: updateData,
          populate: expect.any(Object),
        })
      );
    });
  });

  describe('delete', () => {
    it('should delete an existing product', async () => {
      const existingProduct = {
        id: 1,
        title: 'Product to Delete',
      };

      mockStrapi.entityService.findOne.mockResolvedValue(existingProduct);
      mockStrapi.entityService.delete.mockResolvedValue(true);

      const ctx = {
        params: { id: 1 },
        badRequest: jest.fn(),
        notFound: jest.fn(),
        set: jest.fn(),
      };

      const result = await controller.delete(ctx);

      expect(result.message).toBe('Product deleted successfully');
      expect(mockStrapi.entityService.delete).toHaveBeenCalledWith(
        'api::product.product',
        1
      );
    });
  });

  describe('search', () => {
    it('should search products by text', async () => {
      const mockProducts = [
        { id: 1, title: 'Apple iPhone', price: 999.99 },
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockProducts);

      const ctx = {
        query: { q: 'iPhone' },
        set: jest.fn(),
      };

      const result = await controller.search(ctx);

      expect(result.data).toEqual(mockProducts);
      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::product.product',
        expect.objectContaining({
          filters: expect.objectContaining({
            $or: expect.any(Array),
          }),
        })
      );
    });
  });
});
