/**
 * Product service tests
 */

// Mock the product validation service
jest.mock('./product-validation', () => ({
  __esModule: true,
  default: {
    validateStatusTransition: jest.fn().mockResolvedValue({ isValid: true }),
  },
}));

const mockStrapi = {
  contentType: jest.fn().mockReturnValue({
    kind: 'collectionType',
  }),
  entityService: {
    findOne: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  service: jest.fn().mockReturnValue({
    validateBusinessRules: jest.fn().mockResolvedValue({ isValid: true }),
    validateStatusTransition: jest.fn().mockReturnValue({ isValid: true }),
  }),
  log: {
    error: jest.fn(),
  },
};

// Mock the Strapi factories
jest.mock('@strapi/strapi', () => ({
  factories: {
    createCoreService: jest.fn((serviceName, serviceFunction) => {
      // Return the service function with our mocked strapi instance
      return serviceFunction({ strapi: mockStrapi });
    }),
  },
}));

describe('Product Service', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the validation service mock to default valid state
    const productValidationService = require('./product-validation').default;
    productValidationService.validateStatusTransition.mockResolvedValue({
      isValid: true,
      errors: []
    });
    
    // Import the actual service - it's already instantiated by our mock
    const productService = require('./product').default;
    service = productService;
  });

  describe('updateStatus', () => {
    it('should update product status successfully', async () => {
      const mockProduct = {
        id: 1,
        title: 'Test Product',
        status: 'draft',
      };

      const mockUpdatedProduct = {
        ...mockProduct,
        status: 'active',
      };

      mockStrapi.entityService.findOne.mockResolvedValue(mockProduct);
      mockStrapi.entityService.update.mockResolvedValue(mockUpdatedProduct);

      const result = await service.updateStatus(1, 'active');

      expect(result).toEqual(mockUpdatedProduct);
      expect(mockStrapi.entityService.findOne).toHaveBeenCalledWith(
        'api::product.product',
        1
      );
      expect(mockStrapi.entityService.update).toHaveBeenCalledWith(
        'api::product.product',
        1,
        {
          data: { status: 'active' },
          populate: ['images', 'category', 'seo'],
        }
      );
    });

    it('should throw error for non-existent product', async () => {
      mockStrapi.entityService.findOne.mockResolvedValue(null);

      await expect(service.updateStatus(999, 'active')).rejects.toThrow(
        'Product not found'
      );
    });

    it('should throw error for invalid status transition', async () => {
      const mockProduct = {
        id: 1,
        title: 'Test Product',
        status: 'active',
      };

      mockStrapi.entityService.findOne.mockResolvedValue(mockProduct);
      
      // Mock the validation service to return invalid for this specific test
      const productValidationService = require('./product-validation').default;
      productValidationService.validateStatusTransition.mockResolvedValue({
        isValid: false,
        errors: ['Invalid status transition from active to draft']
      });

      await expect(service.updateStatus(1, 'draft')).rejects.toThrow(
        'Invalid status transition from active to draft'
      );
    });
  });

  describe('findByStatus', () => {
    it('should find products by status', async () => {
      const mockProducts = [
        { id: 1, title: 'Product 1', status: 'active' },
        { id: 2, title: 'Product 2', status: 'active' },
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockProducts);

      const result = await service.findByStatus('active');

      expect(result).toEqual(mockProducts);
      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::product.product',
        {
          filters: { status: 'active' },
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
        }
      );
    });

    it('should apply custom options', async () => {
      const mockProducts = [{ id: 1, title: 'Product 1', status: 'draft' }];

      mockStrapi.entityService.findMany.mockResolvedValue(mockProducts);

      const options = {
        filters: { category: 1 },
        sort: { title: 'asc' },
        populate: { fields: ['title'] },
      };
      const result = await service.findByStatus('active', options);

      expect(result).toEqual(mockProducts);
      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::product.product',
        {
          filters: { status: 'active', category: 1 },
          sort: { title: 'asc' },
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
        }
      );
    });
  });

  describe('findWithStatusFilter', () => {
    it('should find products with multiple status filters', async () => {
      const mockProducts = [
        { id: 1, title: 'Product 1', status: 'active' },
        { id: 2, title: 'Product 2', status: 'draft' },
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockProducts);

      const result = await service.findWithStatusFilter(['active', 'draft']);

      expect(result).toEqual(mockProducts);
      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::product.product',
        {
          filters: { status: { $in: ['active', 'draft'] } },
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
        }
      );
    });
  });

  describe('bulkUpdateStatus', () => {
    it('should update multiple products successfully', async () => {
      const mockProduct1 = { id: 1, title: 'Product 1', status: 'draft' };
      const mockProduct2 = { id: 2, title: 'Product 2', status: 'draft' };
      const mockUpdatedProduct1 = { ...mockProduct1, status: 'active' };
      const mockUpdatedProduct2 = { ...mockProduct2, status: 'active' };
      
      mockStrapi.entityService.findOne
        .mockResolvedValueOnce(mockProduct1)
        .mockResolvedValueOnce(mockProduct2);
      mockStrapi.entityService.update
        .mockResolvedValueOnce(mockUpdatedProduct1)
        .mockResolvedValueOnce(mockUpdatedProduct2);

      const result = await service.bulkUpdateStatus([1, 2], 'active');

      expect(result.success).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial failures', async () => {
      mockStrapi.entityService.findOne
        .mockResolvedValueOnce({ id: 1, status: 'draft' })
        .mockResolvedValueOnce(null);
      mockStrapi.entityService.update.mockResolvedValueOnce({
        id: 1,
        title: 'Product 1',
        status: 'active',
      });

      const result = await service.bulkUpdateStatus([1, 2], 'active');

      expect(result.success).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].productId).toBe(2);
    });
  });

  describe('getStatusStatistics', () => {
    it('should return status statistics', async () => {
      mockStrapi.entityService.count
        .mockResolvedValueOnce(5) // draft
        .mockResolvedValueOnce(10) // active
        .mockResolvedValueOnce(3); // inactive

      const result = await service.getStatusStatistics();

      expect(result).toEqual({
        total: 18,
        draft: 5,
        active: 10,
        inactive: 3,
        percentages: {
          draft: 28,
          active: 56,
          inactive: 17,
        },
      });
    });

    it('should handle zero products', async () => {
      mockStrapi.entityService.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getStatusStatistics();

      expect(result).toEqual({
        total: 0,
        draft: 0,
        active: 0,
        inactive: 0,
        percentages: {
          draft: 0,
          active: 0,
          inactive: 0,
        },
      });
    });
  });

  describe('publishProduct', () => {
    it('should publish product successfully', async () => {
      const mockProduct = { id: 1, title: 'Product 1', status: 'draft' };
      const mockPublishedProduct = { ...mockProduct, status: 'active' };
      mockStrapi.entityService.findOne.mockResolvedValue(mockProduct);
      mockStrapi.entityService.update.mockResolvedValue(mockPublishedProduct);

      const result = await service.publishProduct(1);

      expect(result).toEqual(mockPublishedProduct);
      expect(mockStrapi.entityService.update).toHaveBeenCalledWith(
        'api::product.product',
        1,
        {
          data: { status: 'active' },
          populate: ['images', 'category', 'seo'],
        }
      );
    });
  });

  describe('unpublishProduct', () => {
    it('should unpublish product successfully', async () => {
      const mockProduct = { id: 1, title: 'Product 1', status: 'active' };
      const mockUnpublishedProduct = { ...mockProduct, status: 'inactive' };
      mockStrapi.entityService.findOne.mockResolvedValue(mockProduct);
      mockStrapi.entityService.update.mockResolvedValue(mockUnpublishedProduct);

      const result = await service.unpublishProduct(1);

      expect(result).toEqual(mockUnpublishedProduct);
      expect(mockStrapi.entityService.update).toHaveBeenCalledWith(
        'api::product.product',
        1,
        {
          data: { status: 'inactive' },
          populate: ['images', 'category', 'seo'],
        }
      );
    });
  });

  describe('reactivateProduct', () => {
    it('should reactivate product successfully', async () => {
      const mockProduct = { id: 1, title: 'Product 1', status: 'inactive' };
      const mockReactivatedProduct = { ...mockProduct, status: 'active' };
      mockStrapi.entityService.findOne.mockResolvedValue(mockProduct);
      mockStrapi.entityService.update.mockResolvedValue(mockReactivatedProduct);

      const result = await service.reactivateProduct(1);

      expect(result).toEqual(mockReactivatedProduct);
      expect(mockStrapi.entityService.update).toHaveBeenCalledWith(
        'api::product.product',
        1,
        {
          data: { status: 'active' },
          populate: ['images', 'category', 'seo'],
        }
      );
    });
  });

  describe('getProductsReadyForPublication', () => {
    it('should find draft products ready for publication', async () => {
      const mockProducts = [
        {
          id: 1,
          title: 'Product 1',
          status: 'draft',
          price: 10,
          sku: 'SKU1',
          inventory: 5,
        },
      ];
      mockStrapi.entityService.findMany.mockResolvedValue(mockProducts);

      const result = await service.getProductsReadyForPublication();

      expect(result).toEqual(mockProducts);
      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::product.product',
        {
          filters: {
            status: 'draft',
            title: { $notNull: true },
            description: { $notNull: true },
            price: { $gt: 0 },
            sku: { $notNull: true },
            inventory: { $gte: 0 },
          },
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
        }
      );
    });
  });
});
