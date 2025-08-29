/**
 * Product controller tests - Updated to new test standards
 *
 * Tests following Jest 30+ configuration and Document Service API patterns
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock all dependencies following new patterns
jest.mock('../services/product-validation');
jest.mock('../services/product');
jest.mock('../services/seo');
jest.mock('../services/bulk-operations');

// Create mock functions for Document Service API
const mockDocumentService = {
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

// Mock Strapi with Document Service API following new test standards
const mockStrapi: any = {
  documents: jest.fn(() => mockDocumentService),
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

describe('Product Controller', () => {
  let controller: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all Document Service API mocks
    mockDocumentService.findOne.mockClear();
    mockDocumentService.findMany.mockClear();
    mockDocumentService.create.mockClear();
    mockDocumentService.update.mockClear();
    mockDocumentService.delete.mockClear();
    mockDocumentService.publish.mockClear();
    mockDocumentService.unpublish.mockClear();
    mockDocumentService.count.mockClear();

    // Import the actual controller
    const productController = require('./product').default;
    controller = productController;
  });

  describe('find', () => {
    it('should return products with pagination', async () => {
      const mockProducts = [
        {
          documentId: 'doc1',
          title: 'Product 1',
          price: 29.99,
          status: 'published',
        },
        {
          documentId: 'doc2',
          title: 'Product 2',
          price: 39.99,
          status: 'published',
        },
      ];

      mockDocumentService.findMany.mockResolvedValue(mockProducts);

      const ctx = {
        query: { page: 1, pageSize: 10 },
        state: { user: null },
        throw: jest.fn(),
      };

      const result = await controller.find(ctx);

      expect(result.data).toEqual(mockProducts);
      expect(mockStrapi.documents).toHaveBeenCalledWith('api::product.product');
      expect(mockDocumentService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            status: 'published',
          }),
        })
      );
    });

    it('should allow admin to see unpublished products', async () => {
      const mockProducts = [
        { documentId: 'doc1', title: 'Published Product', status: 'published' },
        { documentId: 'doc2', title: 'Draft Product', status: 'draft' },
      ];

      mockDocumentService.findMany.mockResolvedValue(mockProducts);

      const ctx = {
        query: { page: 1, pageSize: 10 },
        state: { user: { role: { type: 'admin' } } },
        throw: jest.fn(),
      };

      const result = await controller.find(ctx);

      expect(result.data).toEqual(mockProducts);
      expect(mockDocumentService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.not.objectContaining({
            status: expect.anything(),
          }),
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return a single product by documentId', async () => {
      const mockProduct = {
        documentId: 'doc123',
        title: 'Test Product',
        price: 29.99,
        status: 'published',
      };

      mockDocumentService.findOne.mockResolvedValue(mockProduct);

      const ctx = {
        params: { documentId: 'doc123' },
        state: { user: null },
        badRequest: jest.fn(),
        notFound: jest.fn(),
        throw: jest.fn(),
      };

      const result = await controller.findOne(ctx);

      expect(result).toEqual({ data: mockProduct });
      expect(mockDocumentService.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'doc123',
          populate: expect.objectContaining({
            images: {
              fields: ['url', 'width', 'height', 'formats'],
            },
            category: {
              fields: ['id', 'name', 'slug'],
            },
            seo: true,
          }),
        })
      );
    });

    it('should return 404 for non-existent product', async () => {
      mockDocumentService.findOne.mockResolvedValue(null);

      const ctx = {
        params: { documentId: 'non-existent' },
        state: { user: null },
        badRequest: jest.fn(),
        notFound: jest.fn(),
        throw: jest.fn(),
      };

      await controller.findOne(ctx);

      expect(ctx.notFound).toHaveBeenCalledWith('Product not found');
    });

    it('should support legacy id parameter', async () => {
      const mockProduct = {
        documentId: 'doc123',
        title: 'Test Product',
        status: 'published',
      };

      mockDocumentService.findOne.mockResolvedValue(mockProduct);

      const ctx = {
        params: { id: 'doc123' }, // Legacy id parameter
        state: { user: null },
        badRequest: jest.fn(),
        notFound: jest.fn(),
        throw: jest.fn(),
      };

      const result = await controller.findOne(ctx);

      expect(result).toEqual({ data: mockProduct });
      expect(mockDocumentService.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'doc123',
        })
      );
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

      const mockCreatedProduct = { documentId: 'doc123', ...productData };

      mockDocumentService.create.mockResolvedValue(mockCreatedProduct);
      mockDocumentService.findMany.mockResolvedValue([]); // No existing SKU

      const ctx = {
        request: { body: { data: productData } },
        badRequest: jest.fn(),
        throw: jest.fn(),
      };

      const result = await controller.create(ctx);

      expect(result.data).toEqual(mockCreatedProduct);
      expect(mockDocumentService.create).toHaveBeenCalledWith(
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
        throw: jest.fn(),
      };

      await controller.create(ctx);

      expect(ctx.badRequest).toHaveBeenCalled();
    });

    it('should check SKU uniqueness', async () => {
      const productData = {
        title: 'New Product',
        description: 'New product description',
        shortDescription: 'New short desc',
        price: 29.99,
        sku: 'EXISTING-SKU',
        inventory: 10,
      };

      // Mock existing product with same SKU
      mockDocumentService.findMany.mockResolvedValue([
        { documentId: 'existing-doc', sku: 'EXISTING-SKU' },
      ]);

      const ctx = {
        request: { body: { data: productData } },
        badRequest: jest.fn(),
        throw: jest.fn(),
      };

      await controller.create(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith('SKU must be unique');
    });
  });

  describe('update', () => {
    it('should update an existing product', async () => {
      const existingProduct = {
        documentId: 'doc123',
        title: 'Original Product',
        sku: 'ORIG-001',
        price: 29.99,
      };

      const updateData = {
        title: 'Updated Product',
        price: 39.99,
      };

      const mockUpdatedProduct = { ...existingProduct, ...updateData };

      mockDocumentService.findOne.mockResolvedValue(existingProduct);
      mockDocumentService.update.mockResolvedValue(mockUpdatedProduct);

      const ctx = {
        params: { documentId: 'doc123' },
        request: { body: { data: updateData } },
        badRequest: jest.fn(),
        notFound: jest.fn(),
        throw: jest.fn(),
      };

      const result = await controller.update(ctx);

      expect(result.data).toEqual(mockUpdatedProduct);
      expect(mockDocumentService.update).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'doc123',
          data: updateData,
          populate: expect.any(Object),
        })
      );
    });

    it('should validate price updates', async () => {
      const existingProduct = {
        documentId: 'doc123',
        title: 'Test Product',
        sku: 'TEST-001',
        price: 29.99,
      };

      const invalidUpdateData = {
        price: -10, // Invalid negative price
      };

      mockDocumentService.findOne.mockResolvedValue(existingProduct);

      const ctx = {
        params: { documentId: 'doc123' },
        request: { body: { data: invalidUpdateData } },
        badRequest: jest.fn(),
        notFound: jest.fn(),
        throw: jest.fn(),
      };

      await controller.update(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith(
        'Price must be greater than 0'
      );
    });
  });

  describe('delete', () => {
    it('should delete an existing product', async () => {
      const existingProduct = {
        documentId: 'doc123',
        title: 'Product to Delete',
      };

      mockDocumentService.findOne.mockResolvedValue(existingProduct);
      mockDocumentService.delete.mockResolvedValue(true);

      const ctx = {
        params: { documentId: 'doc123' },
        badRequest: jest.fn(),
        notFound: jest.fn(),
        throw: jest.fn(),
      };

      const result = await controller.delete(ctx);

      expect(result.message).toBe('Product deleted successfully');
      expect(mockDocumentService.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'doc123',
        })
      );
    });

    it('should return 404 for non-existent product', async () => {
      mockDocumentService.findOne.mockResolvedValue(null);

      const ctx = {
        params: { documentId: 'non-existent' },
        badRequest: jest.fn(),
        notFound: jest.fn(),
        throw: jest.fn(),
      };

      await controller.delete(ctx);

      expect(ctx.notFound).toHaveBeenCalledWith('Product not found');
    });
  });

  describe('search', () => {
    it('should search products by text', async () => {
      const mockProducts = [
        {
          documentId: 'doc1',
          title: 'Apple iPhone',
          price: 999.99,
          status: 'published',
        },
      ];

      mockDocumentService.findMany.mockResolvedValue(mockProducts);

      const ctx = {
        query: { q: 'iPhone' },
        throw: jest.fn(),
      };

      const result = await controller.search(ctx);

      expect(result.data).toEqual(mockProducts);
      expect(mockDocumentService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            status: 'published',
            $or: expect.arrayContaining([
              expect.objectContaining({ title: { $containsi: 'iPhone' } }),
            ]),
          }),
        })
      );
    });

    it('should search with price range filters', async () => {
      const mockProducts = [
        {
          documentId: 'doc1',
          title: 'Product',
          price: 50.0,
          status: 'published',
        },
      ];

      mockDocumentService.findMany.mockResolvedValue(mockProducts);

      const ctx = {
        query: { minPrice: '25', maxPrice: '75' },
        throw: jest.fn(),
      };

      const result = await controller.search(ctx);

      expect(result.data).toEqual(mockProducts);
      expect(mockDocumentService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            status: 'published',
            price: {
              $gte: 25,
              $lte: 75,
            },
          }),
        })
      );
    });
  });

  describe('Draft & Publish Operations', () => {
    it('should publish a product', async () => {
      const mockResult = {
        documentId: 'doc123',
        entries: [{ documentId: 'doc123', status: 'published' }],
      };

      mockDocumentService.publish.mockResolvedValue(mockResult);

      const ctx = {
        params: { documentId: 'doc123' },
        badRequest: jest.fn(),
        throw: jest.fn(),
      };

      const result = await controller.publishProduct(ctx);

      expect(result.data).toEqual(mockResult);
      expect(mockDocumentService.publish).toHaveBeenCalledWith({
        documentId: 'doc123',
      });
    });

    it('should unpublish a product', async () => {
      const mockResult = {
        documentId: 'doc123',
        entries: [{ documentId: 'doc123', status: 'draft' }],
      };

      mockDocumentService.unpublish.mockResolvedValue(mockResult);

      const ctx = {
        params: { documentId: 'doc123' },
        badRequest: jest.fn(),
        throw: jest.fn(),
      };

      const result = await controller.unpublishProduct(ctx);

      expect(result.data).toEqual(mockResult);
      expect(mockDocumentService.unpublish).toHaveBeenCalledWith({
        documentId: 'doc123',
      });
    });
  });
});
