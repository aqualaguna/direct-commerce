/**
 * Product service tests - Updated to new test standards
 *
 * Tests following Jest 30+ configuration and Document Service API patterns
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock the product validation service following new patterns
jest.mock('./product-validation', () => ({
  __esModule: true,
  default: {
    validateStatusTransition: jest.fn(),
  },
}));

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
    validateBusinessRules: jest.fn(),
    validateStatusTransition: jest.fn(),
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
    createCoreService: jest.fn((serviceName: string, serviceFunction: any) => {
      // Return the service function with our mocked strapi instance
      return serviceFunction({ strapi: mockStrapi });
    }),
  },
}));

describe('Product Service', () => {
  let service: any;

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

    // Reset the validation service mock to default valid state
    const productValidationService = require('./product-validation').default;
    productValidationService.validateStatusTransition.mockResolvedValue({
      isValid: true,
      errors: [],
    });

    // Import the actual service - it's already instantiated by our mock
    const productService = require('./product').default as any;
    service = productService;
  });

  describe('updateStatus', () => {
    it('should update product status successfully', async () => {
      const mockProduct = {
        documentId: 'doc123',
        title: 'Test Product',
        status: 'draft',
      };

      const mockUpdatedProduct = {
        ...mockProduct,
        status: 'published',
      };

      mockDocumentService.findOne.mockResolvedValue(mockProduct);
      mockDocumentService.update.mockResolvedValue(mockUpdatedProduct);

      const result = await service.updateStatus('doc123', 'published');

      expect(result).toEqual(mockUpdatedProduct);
      expect(mockDocumentService.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'doc123',
          fields: ['id', 'status'],
        })
      );
      expect(mockDocumentService.update).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'doc123',
          data: { status: 'published' },
          populate: ['images', 'category', 'seo'],
        })
      );
    });

    it('should throw error for non-existent product', async () => {
      mockDocumentService.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus('non-existent-doc', 'published')
      ).rejects.toThrow('Product not found');
    });

    it('should throw error for invalid status transition', async () => {
      const mockProduct = {
        documentId: 'doc123',
        title: 'Test Product',
        status: 'published',
      };

      mockDocumentService.findOne.mockResolvedValue(mockProduct);

      // Mock the validation service to return invalid for this specific test
      const productValidationService = require('./product-validation').default;
      productValidationService.validateStatusTransition.mockResolvedValue({
        isValid: false,
        errors: ['Invalid status transition from published to draft'],
      });

      await expect(service.updateStatus('doc123', 'draft')).rejects.toThrow(
        'Invalid status transition from published to draft'
      );
    });
  });

  describe('findByStatus', () => {
    it('should find products by status', async () => {
      const mockProducts = [
        { documentId: 'doc1', title: 'Product 1', status: 'published' },
        { documentId: 'doc2', title: 'Product 2', status: 'published' },
      ];

      mockDocumentService.findMany.mockResolvedValue(mockProducts);

      const result = await service.findByStatus('published');

      expect(result).toEqual(mockProducts);
      expect(mockDocumentService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: { status: 'published' },
          sort: { createdAt: 'desc' },
          pagination: { page: 1, pageSize: 25 },
          populate: {
            images: {
              fields: ['url', 'width', 'height', 'formats'],
            },
            category: {
              fields: ['id', 'name', 'slug'],
            },
            seo: true,
          },
        })
      );
    });

    it('should apply custom options', async () => {
      const mockProducts = [
        { documentId: 'doc1', title: 'Product 1', status: 'draft' },
      ];

      mockDocumentService.findMany.mockResolvedValue(mockProducts);

      const options = {
        filters: { category: 'cat123' },
        sort: { title: 'asc' },
      };
      const result = await service.findByStatus('published', options);

      expect(result).toEqual(mockProducts);
      expect(mockDocumentService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: { status: 'published', category: 'cat123' },
          sort: { title: 'asc' },
          pagination: { page: 1, pageSize: 25 },
        })
      );
    });
  });

  describe('findWithStatusFilter', () => {
    it('should find products with multiple status filters', async () => {
      const mockProducts = [
        { documentId: 'doc1', title: 'Product 1', status: 'published' },
        { documentId: 'doc2', title: 'Product 2', status: 'draft' },
      ];

      mockDocumentService.findMany.mockResolvedValue(mockProducts);

      const result = await service.findWithStatusFilter(['published', 'draft']);

      expect(result).toEqual(mockProducts);
      expect(mockDocumentService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: { status: { $in: ['published', 'draft'] } },
          sort: { createdAt: 'desc' },
          pagination: { page: 1, pageSize: 25 },
          populate: {
            images: {
              fields: ['url', 'width', 'height', 'formats'],
            },
            category: {
              fields: ['id', 'name', 'slug'],
            },
            seo: true,
          },
        })
      );
    });
  });

  describe('bulkUpdateStatus', () => {
    it('should update multiple products successfully', async () => {
      const mockProduct1 = {
        documentId: 'doc1',
        title: 'Product 1',
        status: 'draft',
      };
      const mockProduct2 = {
        documentId: 'doc2',
        title: 'Product 2',
        status: 'draft',
      };
      const mockUpdatedProduct1 = { ...mockProduct1, status: 'published' };
      const mockUpdatedProduct2 = { ...mockProduct2, status: 'published' };

      mockDocumentService.findOne
        .mockResolvedValueOnce(mockProduct1)
        .mockResolvedValueOnce(mockProduct2);
      mockDocumentService.update
        .mockResolvedValueOnce(mockUpdatedProduct1)
        .mockResolvedValueOnce(mockUpdatedProduct2);

      const result = await service.bulkUpdateStatus(
        ['doc1', 'doc2'],
        'published'
      );

      expect(result.success).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial failures', async () => {
      mockDocumentService.findOne
        .mockResolvedValueOnce({ documentId: 'doc1', status: 'draft' })
        .mockResolvedValueOnce(null);
      mockDocumentService.update.mockResolvedValueOnce({
        documentId: 'doc1',
        title: 'Product 1',
        status: 'published',
      });

      const result = await service.bulkUpdateStatus(
        ['doc1', 'doc2'],
        'published'
      );

      expect(result.success).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].documentId).toBe('doc2');
    });
  });

  describe('getStatusStatistics', () => {
    it('should return status statistics', async () => {
      mockDocumentService.count
        .mockResolvedValueOnce(5) // draft
        .mockResolvedValueOnce(10); // published

      const result = await service.getStatusStatistics();

      expect(result).toEqual({
        total: 15,
        draft: 5,
        published: 10,
        percentages: {
          draft: 33,
          published: 67,
        },
      });
    });

    it('should handle zero products', async () => {
      mockDocumentService.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getStatusStatistics();

      expect(result).toEqual({
        total: 0,
        draft: 0,
        published: 0,
        percentages: {
          draft: 0,
          published: 0,
        },
      });
    });
  });

  describe('publishProduct', () => {
    it('should publish product successfully using Document Service API', async () => {
      const mockResult = {
        documentId: 'doc123',
        entries: [{ documentId: 'doc123', status: 'published' }],
      };

      mockDocumentService.publish.mockResolvedValue(mockResult);

      const result = await service.publishProduct('doc123');

      expect(result).toEqual(mockResult);
      expect(mockDocumentService.publish).toHaveBeenCalledWith({
        documentId: 'doc123',
      });
    });
  });

  describe('unpublishProduct', () => {
    it('should unpublish product successfully using Document Service API', async () => {
      const mockResult = {
        documentId: 'doc123',
        entries: [{ documentId: 'doc123', status: 'draft' }],
      };

      mockDocumentService.unpublish.mockResolvedValue(mockResult);

      const result = await service.unpublishProduct('doc123');

      expect(result).toEqual(mockResult);
      expect(mockDocumentService.unpublish).toHaveBeenCalledWith({
        documentId: 'doc123',
      });
    });
  });

  describe('reactivateProduct', () => {
    it('should reactivate product successfully using publish', async () => {
      const mockResult = {
        documentId: 'doc123',
        entries: [{ documentId: 'doc123', status: 'published' }],
      };

      mockDocumentService.publish.mockResolvedValue(mockResult);

      const result = await service.reactivateProduct('doc123');

      expect(result).toEqual(mockResult);
      expect(mockDocumentService.publish).toHaveBeenCalledWith({
        documentId: 'doc123',
      });
    });
  });

  describe('getProductsReadyForPublication', () => {
    it('should find draft products ready for publication', async () => {
      const mockProducts = [
        {
          documentId: 'doc1',
          title: 'Product 1',
          status: 'draft',
          price: 10,
          sku: 'SKU1',
          inventory: 5,
        },
      ];
      mockDocumentService.findMany.mockResolvedValue(mockProducts);

      const result = await service.getProductsReadyForPublication();

      expect(result).toEqual(mockProducts);
      expect(mockDocumentService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            status: 'draft',
            title: { $notNull: true },
            description: { $notNull: true },
            price: { $gt: 0 },
            sku: { $notNull: true },
            inventory: { $gte: 0 },
          }),
          sort: { createdAt: 'desc' },
          pagination: { page: 1, pageSize: 25 },
          populate: {
            images: {
              fields: ['url', 'width', 'height', 'formats'],
            },
            category: {
              fields: ['id', 'name', 'slug'],
            },
            seo: true,
          },
        })
      );
    });
  });
});
