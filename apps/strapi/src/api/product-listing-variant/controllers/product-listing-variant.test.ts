/**
 * Product listing variant controller tests
 *
 * Tests for product listing variant CRUD operations and custom endpoints
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock Strapi with Document Service API
const mockStrapi = {
  contentType: jest.fn().mockReturnValue({
    kind: 'collectionType',
  }),
  documents: jest.fn(contentType => ({
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
  })),
  service: jest.fn(serviceName => {
    if (
      serviceName ===
      'api::product-listing-variant.product-listing-variant-validation'
    ) {
      return {
        validateVariantData: jest
          .fn<any>()
          .mockResolvedValue({ isValid: true, errors: [] }),
        validateOptionValues: jest
          .fn<any>()
          .mockResolvedValue({ isValid: true, errors: [] }),
        checkOptionCombinationExists: jest
          .fn<any>()
          .mockResolvedValue({ exists: false, existingVariant: null }),
      };
    }
    if (
      serviceName === 'api::product-listing-variant.variant-pricing-inventory'
    ) {
      return {
        calculatePrice: jest
          .fn<any>()
          .mockResolvedValue({ price: 29.99, comparePrice: 39.99 }),
        calculateVariantPrice: jest.fn<any>().mockResolvedValue({
          price: 29.99,
          comparePrice: 39.99,
          discount: 25,
        }),
        checkAvailability: jest
          .fn<any>()
          .mockResolvedValue({ available: true, quantity: 10 }),
        checkVariantAvailability: jest
          .fn<any>()
          .mockResolvedValue({ available: true, inStock: true, quantity: 10 }),
        updateInventory: jest.fn<any>().mockResolvedValue({ success: true }),
      };
    }
    if (
      serviceName ===
      'api::product-listing-variant.variant-selection-validation'
    ) {
      return {
        validateSelection: jest
          .fn<any>()
          .mockResolvedValue({ isValid: true, errors: [] }),
        getAvailableVariants: jest.fn<any>().mockResolvedValue([]),
        getVariantOptions: jest.fn<any>().mockResolvedValue([]),
      };
    }
    return {};
  }),
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
    createCoreController: jest.fn() as jest.MockedFunction<any>,
  },
}));

describe('Product Listing Variant Controller', () => {
  let productListingVariantController: any;
  let mockContext: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up the factory mock
    const { factories } = require('@strapi/strapi');
    (
      factories.createCoreController as jest.MockedFunction<any>
    ).mockImplementation((serviceName, controllerFunction) => {
      return controllerFunction({ strapi: mockStrapi });
    });

    // Import the product listing variant controller
    const productListingVariantControllerModule =
      require('./product-listing-variant').default;
    productListingVariantController = productListingVariantControllerModule;

    // Create mock context
    mockContext = {
      query: {},
      params: {},
      request: { body: {} },
      response: {},
      send: jest.fn(),
      badRequest: jest.fn(),
      unauthorized: jest.fn(),
      forbidden: jest.fn(),
      notFound: jest.fn(),
      internalServerError: jest.fn(),
      throw: jest.fn(),
    };
  });

  describe('find', () => {
    it('should return variants with default pagination and filters', async () => {
      const mockVariants = [
        {
          documentId: 'variant1',
          sku: 'PROD-001-L-RED',
          price: 29.99,
          inventory: 10,
          status: 'published',
          createdAt: '2025-01-26T10:00:00Z',
        },
        {
          documentId: 'variant2',
          sku: 'PROD-001-M-BLUE',
          price: 29.99,
          inventory: 5,
          status: 'published',
          createdAt: '2025-01-26T11:00:00Z',
        },
      ];

      // Set up a simple mock that returns the data immediately
      mockStrapi.documents.mockReturnValue({
        findMany: jest.fn().mockResolvedValue(mockVariants as never),
        findOne: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        publish: jest.fn(),
        unpublish: jest.fn(),
        discardDraft: jest.fn(),
      } as any);

      // Ensure context has proper structure
      mockContext.query = {};
      mockContext.params = {};

      const result = await productListingVariantController.find(mockContext);

      expect(result).toEqual(mockVariants);
      expect(mockStrapi.documents).toHaveBeenCalledWith(
        'api::product-listing-variant.product-listing-variant'
      );
      expect(
        mockStrapi.documents(
          'api::product-listing-variant.product-listing-variant'
        ).findMany
      ).toHaveBeenCalledWith({
        filters: { status: 'published' },
        sort: { createdAt: 'desc' },
        pagination: { page: 1, pageSize: 25 },
        populate: ['productListing', 'optionValues', 'images'],
      });
    });

    it('should apply custom filters and pagination', async () => {
      const mockVariants = [
        {
          documentId: 'variant1',
          sku: 'PROD-001-L-RED',
          price: 29.99,
          inventory: 10,
          status: 'published',
        },
      ];

      mockContext.query = {
        filters: { inventory: { $gt: 5 } },
        sort: { price: 'asc' },
        page: '2',
        pageSize: '10',
      };

      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findMany.mockResolvedValue(mockVariants);

      const result = await productListingVariantController.find(mockContext);

      expect(result).toEqual(mockVariants);
      expect(
        mockStrapi.documents(
          'api::product-listing-variant.product-listing-variant'
        ).findMany
      ).toHaveBeenCalledWith({
        filters: { inventory: { $gt: 5 }, status: 'published' },
        sort: { price: 'asc' },
        pagination: { page: 2, pageSize: 10 },
        populate: ['productListing', 'optionValues', 'images'],
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findMany.mockRejectedValue(error);

      await productListingVariantController.find(mockContext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error in product-listing-variant find:',
        error
      );
      expect(mockContext.internalServerError).toHaveBeenCalledWith(
        'Internal server error'
      );
    });
  });

  describe('findOne', () => {
    it('should return a variant by documentId', async () => {
      const mockVariant = {
        documentId: 'variant1',
        sku: 'PROD-001-L-RED',
        price: 29.99,
        inventory: 10,
        status: 'published',
      };

      mockContext.params = { documentId: 'variant1' };
      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findOne.mockResolvedValue(mockVariant);

      const result = await productListingVariantController.findOne(mockContext);

      expect(result).toEqual(mockVariant);
      expect(
        mockStrapi.documents(
          'api::product-listing-variant.product-listing-variant'
        ).findOne
      ).toHaveBeenCalledWith({
        documentId: 'variant1',
        populate: ['productListing', 'optionValues', 'images'],
      });
    });

    it('should return bad request when documentId is missing', async () => {
      mockContext.params = {};

      await productListingVariantController.findOne(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Variant documentId is required'
      );
    });

    it('should return not found when variant does not exist', async () => {
      mockContext.params = { documentId: 'non-existent' };
      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findOne.mockResolvedValue(null);

      await productListingVariantController.findOne(mockContext);

      expect(mockContext.notFound).toHaveBeenCalledWith('Variant not found');
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      mockContext.params = { documentId: 'variant1' };
      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findOne.mockRejectedValue(error);

      await productListingVariantController.findOne(mockContext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error in product-listing-variant findOne:',
        error
      );
      expect(mockContext.internalServerError).toHaveBeenCalledWith(
        'Internal server error'
      );
    });
  });

  describe('create', () => {
    it('should create a new variant with validation', async () => {
      const mockVariant = {
        documentId: 'variant1',
        sku: 'PROD-001-L-RED',
        price: 29.99,
        inventory: 10,
        status: 'draft',
      };

      mockContext.request.body = {
        data: {
          sku: 'PROD-001-L-RED',
          price: 29.99,
          inventory: 10,
          productListing: 'product-listing-doc-id',
        },
      };

      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .create.mockResolvedValue(mockVariant);

      const result = await productListingVariantController.create(mockContext);

      expect(result).toEqual(mockVariant);
      expect(
        mockStrapi.documents(
          'api::product-listing-variant.product-listing-variant'
        ).create
      ).toHaveBeenCalledWith({
        data: {
          sku: 'PROD-001-L-RED',
          price: 29.99,
          inventory: 10,
          productListing: 'product-listing-doc-id',
        },
        populate: ['productListing', 'optionValues', 'images'],
      });
    });

    it('should return bad request when required fields are missing', async () => {
      mockContext.request.body = {
        data: {
          price: 29.99,
          // Missing sku and productListing
        },
      };

      await productListingVariantController.create(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'SKU, price, and product listing are required'
      );
    });

    it('should handle validation errors', async () => {
      const validationError = new Error(
        'Validation failed: SKU must be unique, Invalid price'
      );

      mockContext.request.body = {
        data: {
          sku: 'DUPLICATE-SKU',
          price: -10,
          productListing: 'product-listing-doc-id',
        },
      };

      // Set up mock to throw validation error
      mockStrapi.documents.mockReturnValue({
        findMany: jest.fn(),
        findOne: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn().mockRejectedValue(validationError as never),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        publish: jest.fn(),
        unpublish: jest.fn(),
        discardDraft: jest.fn(),
      } as any);

      await productListingVariantController.create(mockContext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error in product-listing-variant create:',
        validationError
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Creation error');
      mockContext.request.body = {
        data: {
          sku: 'PROD-001-L-RED',
          price: 29.99,
          productListing: 'product-listing-doc-id',
        },
      };
      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .create.mockRejectedValue(error);

      await productListingVariantController.create(mockContext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error in product-listing-variant create:',
        error
      );
      expect(mockContext.internalServerError).toHaveBeenCalledWith(
        'Internal server error'
      );
    });
  });

  describe('update', () => {
    it('should update an existing variant', async () => {
      const mockUpdatedVariant = {
        documentId: 'variant1',
        sku: 'PROD-001-L-RED',
        price: 34.99,
        inventory: 15,
        status: 'published',
      };

      mockContext.params = { documentId: 'variant1' };
      mockContext.request.body = {
        data: {
          price: 34.99,
          inventory: 15,
        },
      };

      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .update.mockResolvedValue(mockUpdatedVariant);

      const result = await productListingVariantController.update(mockContext);

      expect(result).toEqual(mockUpdatedVariant);
      expect(
        mockStrapi.documents(
          'api::product-listing-variant.product-listing-variant'
        ).update
      ).toHaveBeenCalledWith({
        documentId: 'variant1',
        data: {
          price: 34.99,
          inventory: 15,
        },
        populate: ['productListing', 'optionValues', 'images'],
      });
    });

    it('should return bad request when documentId is missing', async () => {
      mockContext.params = {};

      await productListingVariantController.update(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Variant documentId is required'
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Update error');
      mockContext.params = { documentId: 'variant1' };
      mockContext.request.body = { data: { price: 34.99 } };
      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .update.mockRejectedValue(error);

      await productListingVariantController.update(mockContext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error in product-listing-variant update:',
        error
      );
      expect(mockContext.internalServerError).toHaveBeenCalledWith(
        'Internal server error'
      );
    });
  });

  describe('delete', () => {
    it('should delete a variant', async () => {
      mockContext.params = { documentId: 'variant1' };

      // Set up mock to return success
      mockStrapi.documents.mockReturnValue({
        findMany: jest.fn(),
        findOne: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue(undefined as never),
        count: jest.fn(),
        publish: jest.fn(),
        unpublish: jest.fn(),
        discardDraft: jest.fn(),
      } as any);

      const result = await productListingVariantController.delete(mockContext);

      expect(result).toEqual({ message: 'Variant deleted successfully' });
      expect(
        mockStrapi.documents(
          'api::product-listing-variant.product-listing-variant'
        ).delete
      ).toHaveBeenCalledWith({
        documentId: 'variant1',
      });
    });

    it('should return bad request when documentId is missing', async () => {
      mockContext.params = {};

      await productListingVariantController.delete(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Variant documentId is required'
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Delete error');
      mockContext.params = { documentId: 'variant1' };
      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .delete.mockRejectedValue(error);

      await productListingVariantController.delete(mockContext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error in product-listing-variant delete:',
        error
      );
      expect(mockContext.internalServerError).toHaveBeenCalledWith(
        'Internal server error'
      );
    });
  });

  describe('findByProductListing', () => {
    it('should return variants for a specific product listing', async () => {
      const mockVariants = [
        {
          documentId: 'variant1',
          sku: 'PROD-001-L-RED',
          price: 29.99,
          inventory: 10,
          productListing: 'product-listing-doc-id',
        },
        {
          documentId: 'variant2',
          sku: 'PROD-001-M-BLUE',
          price: 29.99,
          inventory: 5,
          productListing: 'product-listing-doc-id',
        },
      ];

      mockContext.params = { productListingId: 'product-listing-doc-id' };
      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findMany.mockResolvedValue(mockVariants);

      const result =
        await productListingVariantController.findByProductListing(mockContext);

      expect(result).toEqual(mockVariants);
      expect(
        mockStrapi.documents(
          'api::product-listing-variant.product-listing-variant'
        ).findMany
      ).toHaveBeenCalledWith({
        filters: {
          productListing: 'product-listing-doc-id',
          status: 'published',
        },
        sort: { createdAt: 'asc' },
        populate: ['optionValues', 'images'],
      });
    });

    it('should return bad request when productListingId is missing', async () => {
      mockContext.params = {};

      await productListingVariantController.findByProductListing(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Product listing ID is required'
      );
    });
  });

  describe('findByOptions', () => {
    it('should find variant by option combination', async () => {
      const mockVariant = {
        documentId: 'variant1',
        sku: 'PROD-001-L-RED',
        price: 29.99,
        inventory: 10,
        optionValues: [
          { documentId: 'size-l', value: 'L' },
          { documentId: 'color-red', value: 'Red' },
        ],
      };

      mockContext.params = { productListingId: 'product-listing-doc-id' };
      mockContext.request.body = {
        optionValues: ['size-l', 'color-red'],
      };

      // Set up mocks
      mockStrapi.documents.mockReturnValue({
        findMany: jest.fn().mockResolvedValue([mockVariant] as never),
        findOne: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        publish: jest.fn(),
        unpublish: jest.fn(),
        discardDraft: jest.fn(),
      } as any);

      const result =
        await productListingVariantController.findByOptions(mockContext);

      expect(result).toEqual(mockVariant);
      expect(
        mockStrapi.documents(
          'api::product-listing-variant.product-listing-variant'
        ).findMany
      ).toHaveBeenCalledWith({
        filters: {
          productListing: 'product-listing-doc-id',
          status: 'published',
        },
        populate: ['optionValues'],
      });
    });

    it('should return not found when no variant matches options', async () => {
      mockContext.params = { productListingId: 'product-listing-doc-id' };
      mockContext.request.body = {
        optionValues: ['size-l', 'color-red'],
      };

      // Set up mocks to return empty array
      mockStrapi.documents.mockReturnValue({
        findMany: jest.fn().mockResolvedValue([] as never),
        findOne: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        publish: jest.fn(),
        unpublish: jest.fn(),
        discardDraft: jest.fn(),
      } as any);

      await productListingVariantController.findByOptions(mockContext);

      expect(mockContext.notFound).toHaveBeenCalledWith(
        'No variant found with the specified options'
      );
    });

    it('should return bad request when optionValueIds are missing', async () => {
      mockContext.params = { productListingId: 'product-listing-doc-id' };
      mockContext.request.body = {};

      await productListingVariantController.findByOptions(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Product listing ID and option values array are required'
      );
    });
  });

  describe('updateInventory', () => {
    it('should update variant inventory', async () => {
      const mockUpdatedVariant = {
        documentId: 'variant1',
        sku: 'PROD-001-L-RED',
        inventory: 15,
      };

      mockContext.params = { documentId: 'variant1' };
      mockContext.request.body = {
        inventory: 15,
      };

      // Set up mocks
      mockStrapi.documents.mockReturnValue({
        findMany: jest.fn(),
        findOne: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue(mockUpdatedVariant as never),
        delete: jest.fn(),
        count: jest.fn(),
        publish: jest.fn(),
        unpublish: jest.fn(),
        discardDraft: jest.fn(),
      } as any);

      const result =
        await productListingVariantController.updateInventory(mockContext);

      expect(result).toEqual(mockUpdatedVariant);
      expect(
        mockStrapi.documents(
          'api::product-listing-variant.product-listing-variant'
        ).update
      ).toHaveBeenCalledWith({
        documentId: 'variant1',
        data: { inventory: 15 },
        populate: ['productListing'],
      });
    });

    it('should return bad request when inventory is missing', async () => {
      mockContext.params = { documentId: 'variant1' };
      mockContext.request.body = {};

      await productListingVariantController.updateInventory(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Valid inventory number is required'
      );
    });
  });

  describe('calculatePrice', () => {
    it('should calculate variant price with discounts', async () => {
      const mockPriceCalculation = {
        price: 29.99,
        comparePrice: 39.99,
        discount: 25.0,
      };

      mockContext.params = { documentId: 'variant1' };
      mockContext.request.body = {
        discountCode: 'SAVE25',
      };

      const result =
        await productListingVariantController.calculatePrice(mockContext);

      expect(result).toEqual(mockPriceCalculation);
      // The service method is called internally by the controller
    });
  });

  describe('checkAvailability', () => {
    it('should check variant availability', async () => {
      const mockAvailability = {
        available: true,
        quantity: 10,
        inStock: true,
      };

      mockContext.params = { documentId: 'variant1' };
      mockContext.request.body = {
        quantity: 2,
      };

      const result =
        await productListingVariantController.checkAvailability(mockContext);

      expect(result).toEqual(mockAvailability);
      // The service method is called internally by the controller
    });
  });
});
