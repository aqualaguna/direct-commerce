/**
 * Product controller tests - Updated to new test standards
 *
 * Tests following Jest 30+ configuration and Document Service API patterns
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock all dependencies following new patterns
const mockValidationService = {
  validateBusinessRules: jest.fn() as jest.MockedFunction<any>,
  validateStatusTransition: jest.fn() as jest.MockedFunction<any>,
  validateBulkData: jest.fn() as jest.MockedFunction<any>,
};

jest.mock('../services/product-validation', () => mockValidationService);
jest.mock('../services/product');
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
    reactivateProduct: jest.fn(),
    getProductsReadyForPublication: jest.fn(),
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
    mockDocumentService.count.mockClear();

    // Reset validation service mocks
    mockValidationService.validateBusinessRules.mockClear();
    mockValidationService.validateStatusTransition.mockClear();
    mockValidationService.validateBulkData.mockClear();

    // Import the actual controller
    const productController = require('./product').default;
    controller = productController;
  });

  describe('find', () => {
    it('should return products with pagination', async () => {
      const mockProducts = [
        {
          documentId: 'doc1',
          name: 'Product 1',
          brand: 'Brand A',
          status: 'active',
        },
        {
          documentId: 'doc2',
          name: 'Product 2',
          brand: 'Brand B',
          status: 'active',
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
            status: 'active',
          }),
        })
      );
    });

    it('should allow admin to see draft products', async () => {
      const mockProducts = [
        { documentId: 'doc1', name: 'active Product', status: 'active' },
        { documentId: 'doc2', name: 'Draft Product', status: 'draft' },
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
        name: 'Test Product',
        brand: 'Brand A',
        status: 'active',
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
            category: {
              fields: ['id', 'name', 'slug'],
            },
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
        name: 'Test Product',
        brand: 'Brand A',
        status: 'active',
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
        name: 'New Product',
        brand: 'Brand A',
        description: 'New product description',
        sku: 'NEW-001',
        inventory: 10,
        status: 'active',
      };

      const mockCreatedProduct = { documentId: 'doc123', ...productData };

      // Mock validation service to return valid
      mockValidationService.validateBusinessRules.mockResolvedValue({
        isValid: true,
        errors: []
      });

      mockDocumentService.create.mockResolvedValue(mockCreatedProduct);
      mockDocumentService.findMany.mockResolvedValue([]); // No existing SKU

      const ctx = {
        request: { body: { data: productData } },
        badRequest: jest.fn(),
        throw: jest.fn(),
      };
      const result = await controller.create(ctx);
      expect(result.data).toEqual(mockCreatedProduct);
      expect(mockValidationService.validateBusinessRules).toHaveBeenCalledWith(productData);
      expect(mockDocumentService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: productData,
          populate: expect.any(Object),
        })
      );
    });

    it('should create a product with dimension attributes', async () => {
      const productData = {
        name: 'Product with Dimensions',
        brand: 'Brand A',
        description: 'Product with physical dimensions',
        sku: 'DIM-001',
        inventory: 5,
        status: 'active',
        weight: 2.5,
        length: 10.0,
        width: 8.0,
        height: 3.0,
      };

      const mockCreatedProduct = { documentId: 'doc123', ...productData };

      // Mock validation service to return valid
      mockValidationService.validateBusinessRules.mockResolvedValue({
        isValid: true,
        errors: []
      });

      mockDocumentService.create.mockResolvedValue(mockCreatedProduct);
      mockDocumentService.findMany.mockResolvedValue([]); // No existing SKU

      const ctx = {
        request: { body: { data: productData } },
        badRequest: jest.fn(),
        throw: jest.fn(),
      };

      const result = await controller.create(ctx);
      expect(result.data).toEqual(mockCreatedProduct);
      expect(mockValidationService.validateBusinessRules).toHaveBeenCalledWith(productData);
      expect(mockDocumentService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: productData,
          populate: expect.any(Object),
        })
      );
    });

    it('should reject product with negative dimension values', async () => {
      const productData = {
        name: 'Invalid Product',
        brand: 'Brand A',
        description: 'Product with negative dimensions',
        sku: 'INVALID-001',
        inventory: 5,
        status: 'active',
        weight: -1.0, // Invalid negative weight
        length: 10.0,
        width: 8.0,
        height: 3.0,
      };

      // Mock validation service to return invalid
      mockValidationService.validateBusinessRules.mockResolvedValue({
        isValid: false,
        errors: ['weight must be a non-negative number']
      });

      const ctx = {
        request: { body: { data: productData } },
        badRequest: jest.fn(),
        throw: jest.fn(),
      };

      await controller.create(ctx);
      expect(mockValidationService.validateBusinessRules).toHaveBeenCalledWith(productData);
      expect(ctx.badRequest).toHaveBeenCalledWith('weight must be a non-negative number');
    });

    it('should reject product with non-numeric dimension values', async () => {
      const productData = {
        name: 'Invalid Product',
        brand: 'Brand A',
        description: 'Product with non-numeric dimensions',
        sku: 'INVALID-002',
        inventory: 5,
        status: 'active',
        weight: 'invalid', // Invalid non-numeric weight
        length: 10.0,
        width: 8.0,
        height: 3.0,
      };

      // Mock validation service to return invalid
      mockValidationService.validateBusinessRules.mockResolvedValue({
        isValid: false,
        errors: ['weight must be a number']
      });

      const ctx = {
        request: { body: { data: productData } },
        badRequest: jest.fn(),
        throw: jest.fn(),
      };

      await controller.create(ctx);
      expect(mockValidationService.validateBusinessRules).toHaveBeenCalledWith(productData);
      expect(ctx.badRequest).toHaveBeenCalledWith('weight must be a number');
    });


    it('should check SKU uniqueness', async () => {
      const productData = {
        name: 'New Product',
        brand: 'Brand A',
        description: 'New product description',
        sku: 'EXISTING-SKU',
        inventory: 10,
        status: 'active',
      };

      // Mock validation service to return valid
      mockValidationService.validateBusinessRules.mockResolvedValue({
        isValid: true,
        errors: []
      });

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

      expect(mockValidationService.validateBusinessRules).toHaveBeenCalledWith(productData);
      expect(ctx.badRequest).toHaveBeenCalledWith('SKU must be unique');
    });
  });

  describe('update', () => {
    it('should update an existing product', async () => {
      const existingProduct = {
        documentId: 'doc123',
        name: 'Original Product',
        brand: 'Brand A',
        sku: 'ORIG-001',
      };

      const updateData = {
        title: 'Updated Product',
      };

      const mockUpdatedProduct = { ...existingProduct, ...updateData };

      // Mock validation service to return valid
      mockValidationService.validateBusinessRules.mockResolvedValue({
        isValid: true,
        errors: []
      });

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
      expect(mockValidationService.validateBusinessRules).toHaveBeenCalledWith(updateData);
      expect(mockDocumentService.update).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'doc123',
          data: updateData,
          populate: expect.any(Object),
        })
      );
    });

    it('should update product dimensions', async () => {
      const existingProduct = {
        documentId: 'doc123',
        name: 'Original Product',
        brand: 'Brand A',
        sku: 'ORIG-001',
        weight: 1.0,
        length: 5.0,
        width: 4.0,
        height: 2.0,
      };

      const updateData = {
        weight: 2.5,
        length: 10.0,
        width: 8.0,
        height: 3.0,
      };

      const mockUpdatedProduct = { ...existingProduct, ...updateData };

      // Mock validation service to return valid
      mockValidationService.validateBusinessRules.mockResolvedValue({
        isValid: true,
        errors: []
      });

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
      expect(mockValidationService.validateBusinessRules).toHaveBeenCalledWith(updateData);
      expect(mockDocumentService.update).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'doc123',
          data: updateData,
          populate: expect.any(Object),
        })
      );
    });

    it('should reject update with negative dimension values', async () => {
      const existingProduct = {
        documentId: 'doc123',
        name: 'Original Product',
        brand: 'Brand A',
        sku: 'ORIG-001',
      };

      const updateData = {
        weight: -1.0, // Invalid negative weight
        length: 10.0,
      };

      // Mock validation service to return invalid
      mockValidationService.validateBusinessRules.mockResolvedValue({
        isValid: false,
        errors: ['weight must be a non-negative number']
      });

      mockDocumentService.findOne.mockResolvedValue(existingProduct);

      const ctx = {
        params: { documentId: 'doc123' },
        request: { body: { data: updateData } },
        badRequest: jest.fn(),
        notFound: jest.fn(),
        throw: jest.fn(),
      };

      await controller.update(ctx);
      expect(mockValidationService.validateBusinessRules).toHaveBeenCalledWith(updateData);
      expect(ctx.badRequest).toHaveBeenCalledWith('weight must be a non-negative number');
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
          name: 'Apple iPhone',
          brand: 'Apple',
          status: 'active',
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
            status: 'active',
            $or: expect.arrayContaining([
              expect.objectContaining({ name: { $containsi: 'iPhone' } }),
              expect.objectContaining({ brand: { $containsi: 'iPhone' } }),
            ]),
          }),
        })
      );
    });

    it('should search products with dimension filters', async () => {
      const mockProducts = [
        {
          documentId: 'doc1',
          name: 'Light Product',
          brand: 'Brand A',
          status: 'active',
          weight: 1.5,
          length: 10.0,
          width: 8.0,
          height: 3.0,
        },
      ];

      mockDocumentService.findMany.mockResolvedValue(mockProducts);

      const ctx = {
        query: { 
          q: 'Product',
          weight_max: 2.0,
          length_min: 5.0,
          length_max: 15.0
        },
        throw: jest.fn(),
      };

      const result = await controller.search(ctx);

      expect(result.data).toEqual(mockProducts);
      expect(mockDocumentService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            status: 'active',
            weight: { $lte: 2.0 },
            length: { $gte: 5.0, $lte: 15.0 },
          }),
        })
      );
    });
  });

  describe('filterByDimensions', () => {
    it('should filter products by exact dimension values', async () => {
      const mockProducts = [
        {
          documentId: 'doc1',
          name: 'Exact Match Product',
          weight: 2.5,
          length: 10.0,
          width: 8.0,
          height: 3.0,
        },
      ];

      mockDocumentService.findMany.mockResolvedValue(mockProducts);

      const ctx = {
        query: { 
          weight: 2.5,
          length: 10.0
        },
        throw: jest.fn(),
      };

      const result = await controller.filterByDimensions(ctx);

      expect(result.data).toEqual(mockProducts);
      expect(mockDocumentService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            status: 'active',
            weight: { $lte: 2.5 },
            length: { $lte: 10.0 },
          }),
        })
      );
    });

    it('should filter products by dimension ranges', async () => {
      const mockProducts = [
        {
          documentId: 'doc1',
          name: 'Range Match Product',
          weight: 1.5,
          length: 8.0,
          width: 6.0,
          height: 2.5,
        },
      ];

      mockDocumentService.findMany.mockResolvedValue(mockProducts);

      const ctx = {
        query: { 
          weight_min: 1.0,
          weight_max: 2.0,
          length_min: 5.0,
          length_max: 10.0
        },
        throw: jest.fn(),
      };

      const result = await controller.filterByDimensions(ctx);

      expect(result.data).toEqual(mockProducts);
      expect(mockDocumentService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            status: 'active',
            weight: { $gte: 1.0, $lte: 2.0 },
            length: { $gte: 5.0, $lte: 10.0 },
          }),
        })
      );
    });
  });

  describe('getDimensionStatistics', () => {
    it('should return dimension statistics for weight', async () => {
      const mockProducts = [
        { weight: 1.0 },
        { weight: 2.0 },
        { weight: 3.0 },
        { weight: 4.0 },
        { weight: 5.0 },
      ];

      mockDocumentService.findMany.mockResolvedValue(mockProducts);

      const ctx = {
        query: { dimension: 'weight' },
        badRequest: jest.fn(),
        throw: jest.fn(),
      };

      const result = await controller.getDimensionStatistics(ctx);

      expect(result.data).toEqual({
        dimension: 'weight',
        count: 5,
        min: 1.0,
        max: 5.0,
        average: 3.0,
        median: 3.0,
      });
    });

    it('should return empty statistics for dimension with no data', async () => {
      mockDocumentService.findMany.mockResolvedValue([]);

      const ctx = {
        query: { dimension: 'weight' },
        badRequest: jest.fn(),
        throw: jest.fn(),
      };

      const result = await controller.getDimensionStatistics(ctx);

      expect(result.data).toEqual({
        dimension: 'weight',
        count: 0,
        min: null,
        max: null,
        average: null,
        median: null,
      });
    });

    it('should reject invalid dimension parameter', async () => {
      const ctx = {
        query: { dimension: 'invalid' },
        badRequest: jest.fn(),
        throw: jest.fn(),
      };

      await controller.getDimensionStatistics(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith('Valid dimension is required (weight, length, width, height)');
    });
  });


});
