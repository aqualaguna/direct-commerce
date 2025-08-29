/**
 * Product Validation Middleware tests
 *
 * Tests for the product validation middleware
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import productValidationMiddleware from './product-validation';

// Mock Strapi
const mockStrapi = {
  log: {
    error: jest.fn(),
  },
  entityService: {
    findOne: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('Product Validation Middleware', () => {
  let middleware: any;
  let mockContext: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    middleware = productValidationMiddleware({}, { strapi: mockStrapi });

    mockContext = {
      request: {
        body: {},
        method: 'POST',
      },
      params: {},
      badRequest: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe('Data Validation', () => {
    it('should pass validation for valid product data', async () => {
      mockContext.request.body = {
        data: {
          title: 'Test Product',
          description: 'Test description',
          shortDescription: 'Short desc',
          price: 99.99,
          sku: 'TEST-001',
          inventory: 10,
          isActive: true,
          featured: false,
        },
      };

      await middleware(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockContext.badRequest).not.toHaveBeenCalled();
    });

    it('should reject request with missing data', async () => {
      mockContext.request.body = {};

      await middleware(mockContext, mockNext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Product data is required'
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      mockContext.request.body = {
        data: {
          title: 'Test Product',
          // Missing required fields
        },
      };

      await middleware(mockContext, mockNext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'description',
              message: 'description is required',
            }),
            expect.objectContaining({
              field: 'shortDescription',
              message: 'shortDescription is required',
            }),
            expect.objectContaining({
              field: 'price',
              message: 'price is required',
            }),
            expect.objectContaining({
              field: 'sku',
              message: 'sku is required',
            }),
            expect.objectContaining({
              field: 'inventory',
              message: 'inventory is required',
            }),
          ]),
        })
      );
    });
  });

  describe('Title Validation', () => {
    it('should validate title is a string', async () => {
      mockContext.request.body = {
        data: {
          title: 123,
          description: 'Test description',
          shortDescription: 'Short desc',
          price: 99.99,
          sku: 'TEST-001',
          inventory: 10,
        },
      };

      await middleware(mockContext, mockNext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'title',
              message: 'Title must be a string',
            }),
          ]),
        })
      );
    });

    it('should validate title is not empty', async () => {
      mockContext.request.body = {
        data: {
          title: '   ',
          description: 'Test description',
          shortDescription: 'Short desc',
          price: 99.99,
          sku: 'TEST-001',
          inventory: 10,
        },
      };

      await middleware(mockContext, mockNext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'title',
              message: 'Title cannot be empty',
            }),
          ]),
        })
      );
    });

    it('should validate title length', async () => {
      mockContext.request.body = {
        data: {
          title: 'a'.repeat(256),
          description: 'Test description',
          shortDescription: 'Short desc',
          price: 99.99,
          sku: 'TEST-001',
          inventory: 10,
        },
      };

      await middleware(mockContext, mockNext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'title',
              message: 'Title must be 255 characters or less',
            }),
          ]),
        })
      );
    });
  });

  describe('Price Validation', () => {
    it('should validate price is a number', async () => {
      mockContext.request.body = {
        data: {
          title: 'Test Product',
          description: 'Test description',
          shortDescription: 'Short desc',
          price: 'invalid',
          sku: 'TEST-001',
          inventory: 10,
        },
      };

      await middleware(mockContext, mockNext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'price',
              message: 'Price must be a number',
            }),
          ]),
        })
      );
    });

    it('should validate price is positive', async () => {
      mockContext.request.body = {
        data: {
          title: 'Test Product',
          description: 'Test description',
          shortDescription: 'Short desc',
          price: -10,
          sku: 'TEST-001',
          inventory: 10,
        },
      };

      await middleware(mockContext, mockNext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'price',
              message: 'Price must be greater than 0',
            }),
          ]),
        })
      );
    });

    it('should validate price maximum', async () => {
      mockContext.request.body = {
        data: {
          title: 'Test Product',
          description: 'Test description',
          shortDescription: 'Short desc',
          price: 1000000,
          sku: 'TEST-001',
          inventory: 10,
        },
      };

      await middleware(mockContext, mockNext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'price',
              message: 'Price cannot exceed 999,999.99',
            }),
          ]),
        })
      );
    });
  });

  describe('SKU Validation', () => {
    it('should validate SKU format', async () => {
      mockContext.request.body = {
        data: {
          title: 'Test Product',
          description: 'Test description',
          shortDescription: 'Short desc',
          price: 99.99,
          sku: 'invalid sku!',
          inventory: 10,
        },
      };

      await middleware(mockContext, mockNext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'sku',
              message:
                'SKU can only contain letters, numbers, hyphens, and underscores',
            }),
          ]),
        })
      );
    });

    it('should validate SKU uniqueness for new products', async () => {
      (mockStrapi.entityService.findMany as any).mockResolvedValue([
        { id: 1, sku: 'EXISTING-SKU' },
      ]);

      mockContext.request.body = {
        data: {
          title: 'Test Product',
          description: 'Test description',
          shortDescription: 'Short desc',
          price: 99.99,
          sku: 'EXISTING-SKU',
          inventory: 10,
        },
      };
      mockContext.request.method = 'POST';

      await middleware(mockContext, mockNext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'sku',
              message: 'SKU must be unique',
            }),
          ]),
        })
      );
    });

    it('should validate SKU uniqueness for product updates', async () => {
      (mockStrapi.entityService.findOne as any).mockResolvedValue({
        id: 1,
        sku: 'OLD-SKU',
      });
      (mockStrapi.entityService.findMany as any).mockResolvedValue([
        { id: 2, sku: 'EXISTING-SKU' },
      ]);

      mockContext.request.body = {
        data: {
          title: 'Test Product',
          description: 'Test description',
          shortDescription: 'Short desc',
          price: 99.99,
          sku: 'EXISTING-SKU',
          inventory: 10,
        },
      };
      mockContext.request.method = 'PUT';
      mockContext.params.id = '1';

      await middleware(mockContext, mockNext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'sku',
              message: 'SKU must be unique',
            }),
          ]),
        })
      );
    });
  });

  describe('Inventory Validation', () => {
    it('should validate inventory is an integer', async () => {
      mockContext.request.body = {
        data: {
          title: 'Test Product',
          description: 'Test description',
          shortDescription: 'Short desc',
          price: 99.99,
          sku: 'TEST-001',
          inventory: 10.5,
        },
      };

      await middleware(mockContext, mockNext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'inventory',
              message: 'Inventory must be an integer',
            }),
          ]),
        })
      );
    });

    it('should validate inventory is not negative', async () => {
      mockContext.request.body = {
        data: {
          title: 'Test Product',
          description: 'Test description',
          shortDescription: 'Short desc',
          price: 99.99,
          sku: 'TEST-001',
          inventory: -5,
        },
      };

      await middleware(mockContext, mockNext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'inventory',
              message: 'Inventory cannot be negative',
            }),
          ]),
        })
      );
    });
  });

  describe('Category Validation', () => {
    it('should validate category exists', async () => {
      (mockStrapi.entityService.findOne as any).mockResolvedValue(null);

      mockContext.request.body = {
        data: {
          title: 'Test Product',
          description: 'Test description',
          shortDescription: 'Short desc',
          price: 99.99,
          sku: 'TEST-001',
          inventory: 10,
          category: 999,
        },
      };

      await middleware(mockContext, mockNext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'category',
              message: 'Category does not exist',
            }),
          ]),
        })
      );
    });

    it('should handle category lookup errors', async () => {
      (mockStrapi.entityService.findOne as any).mockRejectedValue(
        new Error('Database error')
      );

      mockContext.request.body = {
        data: {
          title: 'Test Product',
          description: 'Test description',
          shortDescription: 'Short desc',
          price: 99.99,
          sku: 'TEST-001',
          inventory: 10,
          category: 999,
        },
      };

      await middleware(mockContext, mockNext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'category',
              message: 'Invalid category ID',
            }),
          ]),
        })
      );
    });
  });

  describe('Boolean Field Validation', () => {
    it('should validate isActive is boolean', async () => {
      mockContext.request.body = {
        data: {
          title: 'Test Product',
          description: 'Test description',
          shortDescription: 'Short desc',
          price: 99.99,
          sku: 'TEST-001',
          inventory: 10,
          isActive: 'true',
        },
      };

      await middleware(mockContext, mockNext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'isActive',
              message: 'isActive must be a boolean',
            }),
          ]),
        })
      );
    });

    it('should validate featured is boolean', async () => {
      mockContext.request.body = {
        data: {
          title: 'Test Product',
          description: 'Test description',
          shortDescription: 'Short desc',
          price: 99.99,
          sku: 'TEST-001',
          inventory: 10,
          featured: 1,
        },
      };

      await middleware(mockContext, mockNext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'featured',
              message: 'featured must be a boolean',
            }),
          ]),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle middleware errors gracefully', async () => {
      // Clear any existing mocks
      jest.clearAllMocks();

      // Create data that will trigger SKU check
      mockContext.request.body = {
        data: {
          title: 'Test Product',
          description: 'Test description',
          shortDescription: 'Short desc',
          price: 99.99,
          sku: 'TEST-001',
          inventory: 10,
        },
      };
      mockContext.request.method = 'POST';

      // Mock the SKU check to throw an error that gets caught
      (mockStrapi.entityService.findMany as any).mockImplementation(() => {
        throw new TypeError('Cannot read properties of undefined');
      });

      await middleware(mockContext, mockNext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error checking SKU uniqueness:',
        expect.any(Error)
      );
      // SKU errors are handled gracefully, so it should continue to next()
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle SKU uniqueness check errors gracefully', async () => {
      (mockStrapi.entityService.findMany as any).mockRejectedValue(
        new Error('Database error')
      );

      mockContext.request.body = {
        data: {
          title: 'Test Product',
          description: 'Test description',
          shortDescription: 'Short desc',
          price: 99.99,
          sku: 'TEST-001',
          inventory: 10,
        },
      };
      mockContext.request.method = 'POST';

      await middleware(mockContext, mockNext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error checking SKU uniqueness:',
        expect.any(Error)
      );
      expect(mockNext).toHaveBeenCalled(); // Should continue despite SKU check error
    });
  });

  describe('Compare Price Validation', () => {
    it('should validate compare price is greater than regular price', async () => {
      mockContext.request.body = {
        data: {
          title: 'Test Product',
          description: 'Test description',
          shortDescription: 'Short desc',
          price: 100,
          comparePrice: 90,
          sku: 'TEST-001',
          inventory: 10,
        },
      };

      await middleware(mockContext, mockNext);

      expect(mockContext.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'comparePrice',
              message: 'Compare price must be greater than regular price',
            }),
          ]),
        })
      );
    });
  });
});
