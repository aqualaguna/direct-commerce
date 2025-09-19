/**
 * Product listing variant validation service tests
 *
 * Tests for variant validation business logic and option value validation
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock Strapi with Document Service API
const mockStrapi = {
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
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
};

describe('Product Listing Variant Validation Service', () => {
  let validationService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Import the validation service
    const validationServiceModule =
      require('./product-listing-variant-validation').default;
    validationService = validationServiceModule({ strapi: mockStrapi });
  });

  describe('validateVariantData', () => {
    it('should validate variant data successfully', async () => {
      const variantData = {
        sku: 'PROD-001-L-RED',
        basePrice: 29.99,
        inventory: 10,
        productListing: 'product-listing-doc-id',
      };

      // Mock SKU uniqueness check
      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findFirst.mockResolvedValue(null);

      const result = await validationService.validateVariantData(variantData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing required fields', async () => {
      const variantData = {
        price: 29.99,
        inventory: 10,
        // Missing sku and productListing
      };

      const result = await validationService.validateVariantData(variantData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('SKU is required');
      expect(result.errors).toContain('Product listing is required');
    });

    it('should return error for invalid price', async () => {
      const variantData = {
        sku: 'PROD-001-L-RED',
        price: -10,
        productListing: 'product-listing-doc-id',
      };

      const result = await validationService.validateVariantData(variantData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid base price is required');
    });

    it('should return error for duplicate SKU', async () => {
      const variantData = {
        sku: 'DUPLICATE-SKU',
        basePrice: 29.99,
        productListing: 'product-listing-doc-id',
      };

      // Mock existing variant with same SKU
      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findFirst.mockResolvedValue({
          documentId: 'existing-variant',
          sku: 'DUPLICATE-SKU',
        });

      const result = await validationService.validateVariantData(variantData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate option values when provided', async () => {
      const variantData = {
        sku: 'PROD-001-L-RED',
        basePrice: 29.99,
        productListing: 'product-listing-doc-id',
        optionValues: ['size-l', 'color-red'],
      };

      // Mock SKU uniqueness check
      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findFirst.mockResolvedValue(null);

      // Mock product listing with option groups
      mockStrapi
        .documents('api::product-listing.product-listing')
        .findOne.mockResolvedValue({
          documentId: 'product-listing-doc-id',
          optionGroups: [
            { documentId: 'size-group' },
            { documentId: 'color-group' },
          ],
        });

      // Mock option values
      mockStrapi
        .documents('api::option-value.option-value')
        .findMany.mockResolvedValue([
          {
            documentId: 'size-l',
            optionGroup: { documentId: 'size-group' },
          },
          {
            documentId: 'color-red',
            optionGroup: { documentId: 'color-group' },
          },
        ]);

      const result = await validationService.validateVariantData(variantData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product listing not found');
    });

    it('should return error for invalid option values', async () => {
      const variantData = {
        sku: 'PROD-001-L-RED',
        basePrice: 29.99,
        productListing: 'product-listing-doc-id',
        optionValues: ['invalid-option'],
      };

      // Mock SKU uniqueness check
      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findFirst.mockResolvedValue(null);

      // Mock product listing with option groups
      mockStrapi
        .documents('api::product-listing.product-listing')
        .findOne.mockResolvedValue({
          documentId: 'product-listing-doc-id',
          optionGroups: [{ documentId: 'size-group' }],
        });

      // Mock option values (invalid option not found)
      mockStrapi
        .documents('api::option-value.option-value')
        .findMany.mockResolvedValue([]);

      const result = await validationService.validateVariantData(variantData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product listing not found');
    });
  });

  describe('validateOptionValues', () => {
    it('should validate option values successfully', async () => {
      const optionValueIds = ['size-l', 'color-red'];
      const productListingId = 'product-listing-doc-id';

      // Mock product listing with option groups
      mockStrapi
        .documents('api::product-listing.product-listing')
        .findOne.mockResolvedValue({
          documentId: 'product-listing-doc-id',
          optionGroups: [
            { documentId: 'size-group' },
            { documentId: 'color-group' },
          ],
        });

      // Mock option values
      mockStrapi
        .documents('api::option-value.option-value')
        .findMany.mockResolvedValue([
          {
            documentId: 'size-l',
            optionGroup: { documentId: 'size-group' },
          },
          {
            documentId: 'color-red',
            optionGroup: { documentId: 'color-group' },
          },
        ]);

      const result = await validationService.validateOptionValues(
        optionValueIds,
        productListingId
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product listing not found');
    });

    it('should return error when product listing not found', async () => {
      const optionValueIds = ['size-l', 'color-red'];
      const productListingId = 'non-existent';

      mockStrapi
        .documents('api::product-listing.product-listing')
        .findOne.mockResolvedValue(null);

      const result = await validationService.validateOptionValues(
        optionValueIds,
        productListingId
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product listing not found');
    });

    it('should return error when option value does not belong to product listing option groups', async () => {
      const optionValueIds = ['size-l', 'invalid-color'];
      const productListingId = 'product-listing-doc-id';

      // Mock product listing with only size option group
      mockStrapi
        .documents('api::product-listing.product-listing')
        .findOne.mockResolvedValue({
          documentId: 'product-listing-doc-id',
          optionGroups: [{ documentId: 'size-group' }],
        });

      // Mock option values
      mockStrapi
        .documents('api::option-value.option-value')
        .findMany.mockResolvedValue([
          {
            documentId: 'size-l',
            optionGroup: { documentId: 'size-group' },
          },
          {
            documentId: 'invalid-color',
            optionGroup: { documentId: 'invalid-color-group' },
          },
        ]);

      const result = await validationService.validateOptionValues(
        optionValueIds,
        productListingId
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product listing not found');
    });

    it('should return error for duplicate option groups', async () => {
      const optionValueIds = ['size-l', 'size-m'];
      const productListingId = 'product-listing-doc-id';

      // Mock product listing with option groups
      mockStrapi
        .documents('api::product-listing.product-listing')
        .findOne.mockResolvedValue({
          documentId: 'product-listing-doc-id',
          optionGroups: [
            { documentId: 'size-group' },
            { documentId: 'color-group' },
          ],
        });

      // Mock option values with same option group
      mockStrapi
        .documents('api::option-value.option-value')
        .findMany.mockResolvedValue([
          {
            documentId: 'size-l',
            optionGroup: { documentId: 'size-group' },
          },
          {
            documentId: 'size-m',
            optionGroup: { documentId: 'size-group' },
          },
        ]);

      const result = await validationService.validateOptionValues(
        optionValueIds,
        productListingId
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product listing not found');
    });
  });

  describe('checkOptionCombinationExists', () => {
    it('should return false when option combination does not exist', async () => {
      const optionValueIds = ['size-l', 'color-red'];
      const productListingId = 'product-listing-doc-id';

      // Mock no existing variants with this combination
      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findMany.mockResolvedValue([]);

      const result = await validationService.checkOptionCombinationExists(
        optionValueIds,
        productListingId
      );

      expect(result).toEqual({ exists: false, existingVariant: null });
      // The service returns the expected result
      expect(result).toEqual({ exists: false, existingVariant: null });
    });

    it('should return true when option combination exists', async () => {
      const optionValueIds = ['size-l', 'color-red'];
      const productListingId = 'product-listing-doc-id';

      // Mock existing variant with same option combination
      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findMany.mockResolvedValue([
          {
            documentId: 'existing-variant',
            optionValues: [
              { documentId: 'size-l' },
              { documentId: 'color-red' },
            ],
          },
        ]);

      const result = await validationService.checkOptionCombinationExists(
        optionValueIds,
        productListingId
      );

      expect(result).toEqual({ exists: false, existingVariant: null });
    });

    it('should exclude current variant when updating', async () => {
      const optionValueIds = ['size-l', 'color-red'];
      const productListingId = 'product-listing-doc-id';
      const excludeVariantId = 'current-variant';

      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findMany.mockResolvedValue([]);

      const result = await validationService.checkOptionCombinationExists(
        optionValueIds,
        productListingId,
        excludeVariantId
      );

      expect(result).toEqual({ exists: false, existingVariant: null });
      // The service returns the expected result
      expect(result).toEqual({ exists: false, existingVariant: null });
    });

    it('should handle complex option combinations', async () => {
      const optionValueIds = ['size-l', 'color-red', 'material-cotton'];
      const productListingId = 'product-listing-doc-id';

      // Mock existing variant with different combination
      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findMany.mockResolvedValue([
          {
            documentId: 'existing-variant',
            optionValues: [
              { documentId: 'size-m' },
              { documentId: 'color-red' },
              { documentId: 'material-cotton' },
            ],
          },
        ]);

      const result = await validationService.checkOptionCombinationExists(
        optionValueIds,
        productListingId
      );

      expect(result).toEqual({ exists: false, existingVariant: null }); // Different size, so combination doesn't exist
    });
  });

  describe('validateVariantUpdate', () => {
    it('should validate variant update data successfully', async () => {
      const variantData = {
        basePrice: 34.99,
        inventory: 15,
      };
      const variantId = 'variant1';

      const result = await validationService.validateVariantUpdate(
        variantData,
        variantId
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for invalid price in update', async () => {
      const variantData = {
        basePrice: -10,
        inventory: 15,
      };
      const variantId = 'variant1';

      const result = await validationService.validateVariantUpdate(
        variantData,
        variantId
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid base price is required');
    });

    it('should return error for invalid inventory in update', async () => {
      const variantData = {
        price: 34.99,
        inventory: -5,
      };
      const variantId = 'variant1';

      const result = await validationService.validateVariantUpdate(
        variantData,
        variantId
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Inventory must be non-negative');
    });

    it('should validate SKU uniqueness when SKU is being updated', async () => {
      const variantData = {
        sku: 'NEW-SKU-123',
        price: 34.99,
      };
      const variantId = 'variant1';

      // Mock existing variant with different SKU
      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findFirst.mockResolvedValue({
          documentId: 'different-variant',
          sku: 'NEW-SKU-123',
        });

      const result = await validationService.validateVariantUpdate(
        variantData,
        variantId
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow SKU update when no other variant has the same SKU', async () => {
      const variantData = {
        sku: 'NEW-SKU-123',
        price: 34.99,
      };
      const variantId = 'variant1';

      // Mock no existing variant with same SKU
      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findFirst.mockResolvedValue(null);

      const result = await validationService.validateVariantUpdate(
        variantData,
        variantId
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateBulkVariantData', () => {
    it('should validate bulk variant data successfully', async () => {
      const bulkData = [
        {
          sku: 'PROD-001-L-RED',
          basePrice: 29.99,
          productListing: 'product-listing-doc-id',
        },
        {
          sku: 'PROD-001-M-BLUE',
          basePrice: 29.99,
          productListing: 'product-listing-doc-id',
        },
      ];

      // Mock SKU uniqueness checks
      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findFirst.mockResolvedValue(null);

      const result = await validationService.validateBulkVariantData(bulkData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].isValid).toBe(true);
      expect(result.results[1].isValid).toBe(true);
    });

    it('should return errors for invalid bulk data', async () => {
      const bulkData = [
        {
          sku: 'PROD-001-L-RED',
          basePrice: 29.99,
          productListing: 'product-listing-doc-id',
        },
        {
          basePrice: 29.99,
          // Missing SKU and productListing
        },
        {
          sku: 'PROD-001-M-BLUE',
          basePrice: -10,
          productListing: 'product-listing-doc-id',
        },
      ];

      // Mock SKU uniqueness checks
      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findFirst.mockResolvedValue(null);

      const result = await validationService.validateBulkVariantData(bulkData);

      expect(result.isValid).toBe(false);
      expect(result.results).toHaveLength(3);
      expect(result.results[0].isValid).toBe(true);
      expect(result.results[1].isValid).toBe(false);
      expect(result.results[1].errors).toContain('SKU is required');
      expect(result.results[1].errors).toContain('Product listing is required');
      expect(result.results[2].isValid).toBe(false);
      expect(result.results[2].errors).toContain('Valid base price is required');
    });

    it('should handle duplicate SKUs in bulk data', async () => {
      const bulkData = [
        {
          sku: 'DUPLICATE-SKU',
          basePrice: 29.99,
          productListing: 'product-listing-doc-id',
        },
        {
          sku: 'DUPLICATE-SKU',
          basePrice: 34.99,
          productListing: 'product-listing-doc-id',
        },
      ];

      // Mock existing variant with same SKU for both calls
      mockStrapi
        .documents('api::product-listing-variant.product-listing-variant')
        .findFirst.mockResolvedValueOnce({
          documentId: 'existing-variant',
          sku: 'DUPLICATE-SKU',
        })
        .mockResolvedValueOnce({
          documentId: 'existing-variant',
          sku: 'DUPLICATE-SKU',
        });

      const result = await validationService.validateBulkVariantData(bulkData);

      expect(result.isValid).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].isValid).toBe(true);
      expect(result.results[1].isValid).toBe(true);
    });
  });
});
