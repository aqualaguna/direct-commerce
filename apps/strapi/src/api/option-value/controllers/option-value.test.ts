/**
 * Option value controller tests
 *
 * Tests for option value CRUD operations and custom endpoints
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
  })),
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

describe('Option Value Controller', () => {
  let optionValueController: any;
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

    // Import the option value controller
    const optionValueControllerModule = require('./option-value').default;
    optionValueController = optionValueControllerModule;

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
    it('should return option values with default pagination and filters', async () => {
      const mockOptionValues = [
        {
          documentId: 'size-s',
          value: 'S',
          displayName: 'Small',
          sortOrder: 1,
          createdAt: '2025-01-26T10:00:00Z',
        },
        {
          documentId: 'size-m',
          value: 'M',
          displayName: 'Medium',
          sortOrder: 2,
          createdAt: '2025-01-26T11:00:00Z',
        },
      ];

      // Set up a simple mock that returns the data immediately
      mockStrapi.documents.mockReturnValue({
        findMany: jest.fn().mockResolvedValue(mockOptionValues as never),
        findOne: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      } as any);

      // Ensure context has proper structure
      mockContext.query = {};
      mockContext.params = {};

      const result = await optionValueController.find(mockContext);

      expect(result.data).toEqual(mockOptionValues);
      expect(mockStrapi.documents).toHaveBeenCalledWith(
        'api::option-value.option-value'
      );
      expect(
        mockStrapi.documents('api::option-value.option-value').findMany
      ).toHaveBeenCalledWith({
        filters: {},
        sort: [{ sortOrder: 'asc'}, { createdAt: 'desc' }],
        limit: 25,
        start: 0,
        populate: ['optionGroup', 'variants'],
      });
    });

    it('should apply custom filters and pagination', async () => {
      const mockOptionValues = [
        {
          documentId: 'size-s',
          value: 'S',
          displayName: 'Small',
          sortOrder: 1,
        },
      ];

      mockContext.query = {
        filters: { optionGroup: 'size-group' },
        sort: 'value:asc',
        pagination: { page: '2', pageSize: '10' },
      };

      // Set up a simple mock that returns the data immediately
      mockStrapi.documents.mockReturnValue({
        findMany: jest.fn().mockResolvedValue(mockOptionValues as never),
        findOne: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      } as any);

      const result = await optionValueController.find(mockContext);

      expect(result.data).toEqual(mockOptionValues);
      expect(
        mockStrapi.documents('api::option-value.option-value').findMany
      ).toHaveBeenCalledWith({
        filters: { optionGroup: 'size-group'},
        sort: 'value:asc',
        limit: 10,
        start: 10,
        populate: ['optionGroup', 'variants'],
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');

      // Set up mock to throw error
      mockStrapi.documents.mockReturnValue({
        findMany: jest.fn().mockRejectedValue(error as never),
        findOne: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      } as any);

      await optionValueController.find(mockContext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error in option-value find:',
        error
      );
      expect(mockContext.internalServerError).toHaveBeenCalledWith(
        'Internal server error'
      );
    });
  });

  describe('findOne', () => {
    it('should return an option value by documentId', async () => {
      const mockOptionValue = {
        documentId: 'size-s',
        value: 'S',
        displayName: 'Small',
        sortOrder: 1,
      };

      mockContext.params = { documentId: 'size-s' };

      // Set up mock to return the option value
      mockStrapi.documents.mockReturnValue({
        findMany: jest.fn(),
        findOne: jest.fn().mockResolvedValue(mockOptionValue as never),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      } as any);

      const result = await optionValueController.findOne(mockContext);

      expect(result.data).toEqual(mockOptionValue);
      expect(
        mockStrapi.documents('api::option-value.option-value').findOne
      ).toHaveBeenCalledWith({
        documentId: 'size-s',
        populate: ['optionGroup', 'variants'],
      });
    });

    it('should return bad request when documentId is missing', async () => {
      mockContext.params = {};

      await optionValueController.findOne(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Option value documentId is required'
      );
    });

    it('should return not found when option value does not exist', async () => {
      mockContext.params = { documentId: 'non-existent' };
      mockStrapi
        .documents('api::option-value.option-value')
        .findOne.mockResolvedValue(null);

      await optionValueController.findOne(mockContext);

      expect(mockContext.notFound).toHaveBeenCalledWith(
        'Option value not found'
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      mockContext.params = { documentId: 'size-s' };
      mockStrapi
        .documents('api::option-value.option-value')
        .findOne.mockRejectedValue(error);

      await optionValueController.findOne(mockContext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error in option-value findOne:',
        error
      );
      expect(mockContext.internalServerError).toHaveBeenCalledWith(
        'Internal server error'
      );
    });
  });

  describe('create', () => {
    it('should create a new option value', async () => {
      const mockOptionValue = {
        documentId: 'size-s',
        value: 'S',
        displayName: 'Small',
        sortOrder: 1,
      };

      const mockOptionGroup = {
        documentId: 'size-group',
        id: 1,
        optionValues: [], // Empty array means no duplicate values
      };

      mockContext.request.body = {
        data: {
          value: 'S',
          displayName: 'Small',
          optionGroup: 'size-group',
        },
      };

      // Mock the option group validation
      mockStrapi
        .documents('api::option-group.option-group')
        .findOne.mockResolvedValue(mockOptionGroup);

      // Mock the option value creation
      mockStrapi
        .documents('api::option-value.option-value')
        .create.mockResolvedValue(mockOptionValue);

      const result = await optionValueController.create(mockContext);

      expect(result).toEqual({ data: mockOptionValue });
      expect(
        mockStrapi.documents('api::option-group.option-group').findOne
      ).toHaveBeenCalledWith({
        documentId: 'size-group',
        populate: ['optionValues'],
      });
      expect(
        mockStrapi.documents('api::option-value.option-value').create
      ).toHaveBeenCalledWith({
        data: {
          value: 'S',
          displayName: 'Small',
          optionGroup: 'size-group',
        },
        populate: ['optionGroup', 'variants'],
      });
    });

    it('should return bad request when required fields are missing', async () => {
      mockContext.request.body = {
        data: {
          displayName: 'Small',
          // Missing value and optionGroup
        },
      };

      await optionValueController.create(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Value, display name, and option group are required'
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      mockContext.request.body = {
        data: {
          value: 'S',
          displayName: 'Small',
          optionGroup: 'size-group',
        },
      };

      // Mock the option group validation to succeed
      const mockOptionGroup = {
        documentId: 'size-group',
        id: 1,
        optionValues: [], // Empty array means no duplicate values
      };
      mockStrapi
        .documents('api::option-group.option-group')
        .findOne.mockResolvedValue(mockOptionGroup);

      // Mock the option value creation to fail
      mockStrapi
        .documents('api::option-value.option-value')
        .create.mockRejectedValue(error);

      const result = await optionValueController.create(mockContext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error in option-value create:',
        error
      );
      expect(mockContext.internalServerError).toHaveBeenCalledWith(
        'Internal server error'
      );
      expect(result).toBeUndefined(); // internalServerError returns undefined
    });
  });

  describe('update', () => {
    it('should update an existing option value', async () => {
      const mockUpdatedOptionValue = {
        documentId: 'size-s',
        value: 'S',
        displayName: 'Small Size',
        sortOrder: 1,
      };

      mockContext.params = { documentId: 'size-s' };
      mockContext.request.body = {
        data: {
          displayName: 'Small Size',
        },
      };

      mockStrapi
        .documents('api::option-value.option-value')
        .update.mockResolvedValue(mockUpdatedOptionValue);

      const result = await optionValueController.update(mockContext);

      expect(result.data).toEqual(mockUpdatedOptionValue);
      expect(
        mockStrapi.documents('api::option-value.option-value').update
      ).toHaveBeenCalledWith({
        documentId: 'size-s',
        data: {
          displayName: 'Small Size',
        },
        populate: ['optionGroup', 'variants'],
      });
    });

    it('should return bad request when documentId is missing', async () => {
      mockContext.params = {};

      await optionValueController.update(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Option value documentId is required'
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Update error');
      mockContext.params = { documentId: 'size-s' };
      mockContext.request.body = { data: { displayName: 'Small Size' } };
      mockStrapi
        .documents('api::option-value.option-value')
        .update.mockRejectedValue(error);

      await optionValueController.update(mockContext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error in option-value update:',
        error
      );
      expect(mockContext.internalServerError).toHaveBeenCalledWith(
        'Internal server error'
      );
    });
  });

  describe('delete', () => {
    it('should delete an option value', async () => {
      mockContext.params = { documentId: 'size-s' };

      // Set up mock to return success
      mockStrapi.documents.mockReturnValue({
        findMany: jest.fn(),
        findOne: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue(undefined as never),
        count: jest.fn(),
      } as any);

      const result = await optionValueController.delete(mockContext);

      expect(result).toEqual({ message: 'Option value deleted successfully' });
      expect(
        mockStrapi.documents('api::option-value.option-value').delete
      ).toHaveBeenCalledWith({
        documentId: 'size-s',
      });
    });

    it('should return bad request when documentId is missing', async () => {
      mockContext.params = {};

      await optionValueController.delete(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Option value documentId is required'
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Delete error');
      mockContext.params = { documentId: 'size-s' };
      mockStrapi
        .documents('api::option-value.option-value')
        .delete.mockRejectedValue(error);

      await optionValueController.delete(mockContext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error in option-value delete:',
        error
      );
      expect(mockContext.internalServerError).toHaveBeenCalledWith(
        'Internal server error'
      );
    });
  });

  describe('findByOptionGroup', () => {
    it('should return option values for a specific option group', async () => {
      const mockOptionValues = [
        {
          documentId: 'size-s',
          value: 'S',
          displayName: 'Small',
          sortOrder: 1,
          optionGroup: 'size-group',
        },
        {
          documentId: 'size-m',
          value: 'M',
          displayName: 'Medium',
          sortOrder: 2,
          optionGroup: 'size-group',
        },
      ];

      const mockOptionGroup = {
        documentId: 'size-group',
        id: 1, // The controller uses the numeric id, not documentId
      };

      mockContext.params = { optionGroupId: 'size-group' };

      // Mock the option group lookup
      mockStrapi
        .documents('api::option-group.option-group')
        .findOne.mockResolvedValue(mockOptionGroup);

      // Mock the option values lookup
      mockStrapi
        .documents('api::option-value.option-value')
        .findMany.mockResolvedValue(mockOptionValues);

      // Mock the count for pagination
      mockStrapi
        .documents('api::option-value.option-value')
        .count.mockResolvedValue(2);

      const result = await optionValueController.findByOptionGroup(mockContext);

      expect(result).toEqual({
        data: mockOptionValues,
        meta: {
          pagination: {
            page: 1,
            pageSize: 25,
            pageCount: 1,
            total: 2
          }
        }
      });
      expect(
        mockStrapi.documents('api::option-group.option-group').findOne
      ).toHaveBeenCalledWith({
        documentId: 'size-group',
      });
      expect(
        mockStrapi.documents('api::option-value.option-value').findMany
      ).toHaveBeenCalledWith({
        filters: { optionGroup: 1 }, // Uses the numeric id
        sort: [{ sortOrder: 'asc'}, { createdAt: 'desc'}],
        limit: 25,
        start: 0,
        populate: ['optionGroup'],
      });
    });

    it('should return bad request when optionGroupId is missing', async () => {
      mockContext.params = {};

      await optionValueController.findByOptionGroup(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Option group ID is required'
      );
    });
  });


  describe('findByProductListing', () => {
    it('should return option values for a specific product listing', async () => {
      const mockOptionValues = [
        {
          documentId: 'size-s',
          value: 'S',
          displayName: 'Small',
          sortOrder: 1,
        },
        {
          documentId: 'color-red',
          value: 'Red',
          displayName: 'Red',
          sortOrder: 1,
        },
      ];

      const mockProductListing = {
        documentId: 'product-listing-doc-id',
        optionGroups: [
          { id: 'size-group' },
          { id: 'color-group' },
        ],
      };

      mockContext.params = { productListingId: 'product-listing-doc-id' };

      // Set up mocks
      mockStrapi.documents.mockReturnValue({
        findMany: jest.fn().mockResolvedValue(mockOptionValues as never),
        findOne: jest.fn().mockResolvedValue(mockProductListing as never),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      } as any);

      const result =
        await optionValueController.findByProductListing(mockContext);

      expect(result.data).toEqual(mockOptionValues);
      expect(
        mockStrapi.documents('api::product-listing.product-listing').findOne
      ).toHaveBeenCalledWith({
        documentId: 'product-listing-doc-id',
        populate: ['optionGroups'],
      });
      expect(
        mockStrapi.documents('api::option-value.option-value').findMany
      ).toHaveBeenCalledWith({
        filters: {
          optionGroup: { $in: ['size-group', 'color-group'] },
        },
        sort: 'sortOrder:asc',
        populate: ['optionGroup'],
      });
    });

    it('should return bad request when productListingId is missing', async () => {
      mockContext.params = {};

      await optionValueController.findByProductListing(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Product listing ID is required'
      );
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple option values', async () => {
      const mockCreatedOptionValues = [
        {
          documentId: 'size-s',
          value: 'S',
          displayName: 'Small',
          sortOrder: 1,
        },
        {
          documentId: 'size-m',
          value: 'M',
          displayName: 'Medium',
          sortOrder: 2,
        },
        {
          documentId: 'size-l',
          value: 'L',
          displayName: 'Large',
          sortOrder: 3,
        },
      ];

      mockContext.request.body = {
        data: [
          {
            value: 'S',
            displayName: 'Small',
            optionGroup: 'size-group',
          },
          {
            value: 'M',
            displayName: 'Medium',
            optionGroup: 'size-group',
          },
          {
            value: 'L',
            displayName: 'Large',
            optionGroup: 'size-group',
          },
        ],
      };

      mockStrapi
        .documents('api::option-value.option-value')
        .create.mockResolvedValueOnce(mockCreatedOptionValues[0]);
      mockStrapi
        .documents('api::option-value.option-value')
        .create.mockResolvedValueOnce(mockCreatedOptionValues[1]);
      mockStrapi
        .documents('api::option-value.option-value')
        .create.mockResolvedValueOnce(mockCreatedOptionValues[2]);

      const result = await optionValueController.bulkCreate(mockContext);

      expect(result).toEqual({
        success: 3,
        errors: [],
        created: mockCreatedOptionValues,
      });
      expect(
        mockStrapi.documents('api::option-value.option-value').create
      ).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in bulk create', async () => {
      const mockCreatedOptionValue = {
        documentId: 'size-s',
        value: 'S',
        displayName: 'Small',
        sortOrder: 1,
      };

      mockContext.request.body = {
        data: [
          {
            value: 'S',
            displayName: 'Small',
            optionGroup: 'size-group',
          },
          {
            displayName: 'Medium',
            // Missing value and optionGroup
          },
        ],
      };

      mockStrapi
        .documents('api::option-value.option-value')
        .create.mockResolvedValueOnce(mockCreatedOptionValue);
      mockStrapi
        .documents('api::option-value.option-value')
        .create.mockRejectedValueOnce(new Error('Validation error'));

      const result = await optionValueController.bulkCreate(mockContext);

      expect(result.success).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.created).toHaveLength(1);
      expect(result.created[0]).toEqual(mockCreatedOptionValue);
    });

    it('should return bad request when data is missing', async () => {
      mockContext.request.body = {};

      await optionValueController.bulkCreate(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Option values data is required'
      );
    });

    it('should return bad request when data is not an array', async () => {
      mockContext.request.body = {
        data: 'not-an-array',
      };

      await optionValueController.bulkCreate(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Option values data must be an array'
      );
    });
  });
});
