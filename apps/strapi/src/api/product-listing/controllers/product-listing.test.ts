/**
 * Product listing controller tests
 *
 * Tests for product listing CRUD operations and custom endpoints
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock Strapi with Document Service API
const mockStrapi = {
  contentType: jest.fn().mockReturnValue({
    kind: 'collectionType',
  }),
  documents: jest.fn(contentType => ({
    findOne: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    publish: jest.fn(),
    unpublish: jest.fn(),
    discardDraft: jest.fn(),
  })) as jest.MockedFunction<any>,
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

describe('Product Listing Controller', () => {
  let productListingController: any;
  let mockContext: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up the factory mock
    const { factories } = require('@strapi/strapi');
    // Mock the factories.createCoreController to return the controller directly
    (
      factories.createCoreController as jest.MockedFunction<any>
    ).mockImplementation((serviceName, controllerFunction) => {
      return controllerFunction({ strapi: mockStrapi });
    });

    // Import the controller - it should now be the actual controller instance
    productListingController = require('./product-listing').default;

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
    it('should return product listings with default pagination and filters', async () => {
      const mockProductListings = [
        {
          documentId: 'doc1',
          title: 'Product 1',
          type: 'single',
          status: 'published',
          createdAt: '2025-01-26T10:00:00Z',
        },
        {
          documentId: 'doc2',
          title: 'Product 2',
          type: 'variant',
          status: 'published',
          createdAt: '2025-01-26T11:00:00Z',
        },
      ];

      // Set up a simple mock that returns the data immediately
      mockStrapi.documents.mockReturnValue({
        findMany: jest.fn().mockResolvedValue(mockProductListings as never),
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

      const result = await productListingController.find(mockContext);

      expect(result).toEqual(mockProductListings);
      expect(mockStrapi.documents).toHaveBeenCalledWith(
        'api::product-listing.product-listing'
      );
      expect(
        mockStrapi.documents('api::product-listing.product-listing').findMany
      ).toHaveBeenCalledWith({
        filters: { status: 'published' },
        sort: { createdAt: 'desc' },
        pagination: { page: 1, pageSize: 25 },
        populate: ['images', 'category', 'product', 'variants', 'optionGroups'],
      });
    });

    it('should apply custom filters and pagination', async () => {
      const mockProductListings = [
        {
          documentId: 'doc1',
          title: 'Product 1',
          type: 'variant',
          status: 'published',
        },
      ];

      mockContext.query = {
        filters: { type: 'variant' },
        sort: { title: 'asc' },
        page: '2',
        pageSize: '10',
      };

      mockStrapi
        .documents('api::product-listing.product-listing')
        .findMany.mockResolvedValue(mockProductListings);

      const result = await productListingController.find(mockContext);

      expect(result).toEqual(mockProductListings);
      expect(
        mockStrapi.documents('api::product-listing.product-listing').findMany
      ).toHaveBeenCalledWith({
        filters: { type: 'variant', status: 'published' },
        sort: { title: 'asc' },
        pagination: { page: 2, pageSize: 10 },
        populate: ['images', 'category', 'product', 'variants', 'optionGroups'],
      });
    });

    it('should handle pagination limits correctly', async () => {
      mockContext.query = {
        page: '0',
        pageSize: '200',
      };

      mockStrapi
        .documents('api::product-listing.product-listing')
        .findMany.mockResolvedValue([]);

      await productListingController.find(mockContext);

      expect(
        mockStrapi.documents('api::product-listing.product-listing').findMany
      ).toHaveBeenCalledWith({
        filters: { status: 'published' },
        sort: { createdAt: 'desc' },
        pagination: { page: 1, pageSize: 100 }, // Should be clamped to limits
        populate: ['images', 'category', 'product', 'variants', 'optionGroups'],
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      mockStrapi
        .documents('api::product-listing.product-listing')
        .findMany.mockRejectedValue(error);

      await productListingController.find(mockContext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error in product-listing find:',
        error.message,
        error
      );
      expect(mockContext.internalServerError).toHaveBeenCalledWith(
        'Internal server error'
      );
    });
  });

  describe('findOne', () => {
    it('should return a product listing by documentId', async () => {
      const mockProductListing = {
        documentId: 'doc1',
        title: 'Product 1',
        type: 'variant',
        status: 'published',
      };

      mockContext.params = { documentId: 'doc1' };
      mockStrapi
        .documents('api::product-listing.product-listing')
        .findOne.mockResolvedValue(mockProductListing);

      const result = await productListingController.findOne(mockContext);

      expect(result).toEqual(mockProductListing);
      expect(
        mockStrapi.documents('api::product-listing.product-listing').findOne
      ).toHaveBeenCalledWith({
        documentId: 'doc1',
        populate: ['images', 'category', 'product', 'variants', 'optionGroups'],
      });
    });

    it('should return bad request when documentId is missing', async () => {
      mockContext.params = {};

      await productListingController.findOne(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Product listing documentId is required'
      );
    });

    it('should return not found when product listing does not exist', async () => {
      mockContext.params = { documentId: 'non-existent' };
      mockStrapi
        .documents('api::product-listing.product-listing')
        .findOne.mockResolvedValue(null);

      await productListingController.findOne(mockContext);

      expect(mockContext.notFound).toHaveBeenCalledWith(
        'Product listing not found'
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      mockContext.params = { documentId: 'doc1' };
      mockStrapi
        .documents('api::product-listing.product-listing')
        .findOne.mockRejectedValue(error);

      await productListingController.findOne(mockContext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error in product-listing findOne:',
        error.message,
        error
      );
      expect(mockContext.internalServerError).toHaveBeenCalledWith(
        'Internal server error'
      );
    });
  });

  describe('create', () => {
    it('should create a new product listing', async () => {
      const mockProductListing = {
        documentId: 'doc1',
        title: 'New Product',
        type: 'single',
        status: 'draft',
      };

      mockContext.request.body = {
        data: {
          title: 'New Product',
          type: 'single',
          product: 'product-doc-id',
        },
      };

      mockStrapi
        .documents('api::product-listing.product-listing')
        .create.mockResolvedValue(mockProductListing);

      const result = await productListingController.create(mockContext);

      expect(result).toEqual(mockProductListing);
      expect(
        mockStrapi.documents('api::product-listing.product-listing').create
      ).toHaveBeenCalledWith({
        data: {
          title: 'New Product',
          type: 'single',
          product: 'product-doc-id',
        },
        populate: ['images', 'category', 'product', 'variants', 'optionGroups'],
      });
    });

    it('should return bad request when required fields are missing', async () => {
      mockContext.request.body = {
        data: {
          type: 'single',
          // Missing title and product
        },
      };

      await productListingController.create(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Title and product are required'
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Validation error');
      mockContext.request.body = {
        data: {
          title: 'New Product',
          product: 'product-doc-id',
        },
      };
      mockStrapi
        .documents('api::product-listing.product-listing')
        .create.mockRejectedValue(error);

      await productListingController.create(mockContext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error in product-listing create:',
        error.message,
        error
      );
      expect(mockContext.internalServerError).toHaveBeenCalledWith(
        'Internal server error'
      );
    });
  });

  describe('update', () => {
    it('should update an existing product listing', async () => {
      const mockUpdatedProductListing = {
        documentId: 'doc1',
        title: 'Updated Product',
        type: 'variant',
        status: 'published',
      };

      mockContext.params = { documentId: 'doc1' };
      mockContext.request.body = {
        data: {
          title: 'Updated Product',
          type: 'variant',
        },
      };

      mockStrapi
        .documents('api::product-listing.product-listing')
        .update.mockResolvedValue(mockUpdatedProductListing);

      const result = await productListingController.update(mockContext);

      expect(result).toEqual(mockUpdatedProductListing);
      expect(
        mockStrapi.documents('api::product-listing.product-listing').update
      ).toHaveBeenCalledWith({
        documentId: 'doc1',
        data: {
          title: 'Updated Product',
          type: 'variant',
        },
        populate: ['images', 'category', 'product', 'variants', 'optionGroups'],
      });
    });

    it('should return bad request when documentId is missing', async () => {
      mockContext.params = {};

      await productListingController.update(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Product listing documentId is required'
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Update error');
      mockContext.params = { documentId: 'doc1' };
      mockContext.request.body = { data: { title: 'Updated Product' } };
      mockStrapi
        .documents('api::product-listing.product-listing')
        .update.mockRejectedValue(error);

      await productListingController.update(mockContext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error in product-listing update:',
        error.message,
        error
      );
      expect(mockContext.internalServerError).toHaveBeenCalledWith(
        'Internal server error'
      );
    });
  });

  describe('delete', () => {
    it('should delete a product listing', async () => {
      mockContext.params = { documentId: 'doc1' };
      mockStrapi
        .documents('api::product-listing.product-listing')
        .delete.mockResolvedValue(undefined);

      const result = await productListingController.delete(mockContext);

      expect(result).toEqual({
        message: 'Product listing deleted successfully',
      });
      expect(
        mockStrapi.documents('api::product-listing.product-listing').delete
      ).toHaveBeenCalledWith({
        documentId: 'doc1',
      });
    });

    it('should return bad request when documentId is missing', async () => {
      mockContext.params = {};

      await productListingController.delete(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Product listing documentId is required'
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Delete error');
      mockContext.params = { documentId: 'doc1' };
      mockStrapi
        .documents('api::product-listing.product-listing')
        .delete.mockRejectedValue(error);

      await productListingController.delete(mockContext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error in product-listing delete:',
        error.message,
        error
      );
      expect(mockContext.internalServerError).toHaveBeenCalledWith(
        'Internal server error'
      );
    });
  });
});
