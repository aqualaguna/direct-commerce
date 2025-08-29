/**
 * Product validation service tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import productValidationService from './product-validation';

describe('Product Validation Service', () => {
  describe('validateBusinessRules', () => {
    it('should pass validation for valid product data', async () => {
      const validProduct = {
        title: 'Test Product',
        description: 'Test description',
        shortDescription: 'Short desc',
        price: 29.99,
        sku: 'TEST-001',
        inventory: 10,
        isActive: true,
        featured: false,
      };

      const result =
        await productValidationService.validateBusinessRules(validProduct);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for invalid price', async () => {
      const invalidProduct = {
        title: 'Test Product',
        description: 'Test description',
        shortDescription: 'Short desc',
        price: -10,
        sku: 'TEST-001',
        inventory: 10,
      };

      const result =
        await productValidationService.validateBusinessRules(invalidProduct);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Price must be greater than 0');
    });

    it('should fail validation for invalid inventory', async () => {
      const invalidProduct = {
        title: 'Test Product',
        description: 'Test description',
        shortDescription: 'Short desc',
        price: 29.99,
        sku: 'TEST-001',
        inventory: -5,
      };

      const result =
        await productValidationService.validateBusinessRules(invalidProduct);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Inventory cannot be negative');
    });

    it('should fail validation for invalid SKU format', async () => {
      const invalidProduct = {
        title: 'Test Product',
        description: 'Test description',
        shortDescription: 'Short desc',
        price: 29.99,
        sku: 'TEST@001',
        inventory: 10,
      };

      const result =
        await productValidationService.validateBusinessRules(invalidProduct);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'SKU can only contain letters, numbers, hyphens, and underscores'
      );
    });
  });

  describe('priceRule', () => {
    it('should pass for valid price', async () => {
      const data = { price: 29.99 };
      const result = await productValidationService.priceRule(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for negative price', async () => {
      const data = { price: -10 };
      const result = await productValidationService.priceRule(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Price must be greater than 0');
    });

    it('should fail for zero price', async () => {
      const data = { price: 0 };
      const result = await productValidationService.priceRule(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Price must be greater than 0');
    });

    it('should fail for price too high', async () => {
      const data = { price: 1000000 };
      const result = await productValidationService.priceRule(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Price cannot exceed 999,999.99');
    });
  });

  describe('inventoryRule', () => {
    it('should pass for valid inventory', async () => {
      const data = { inventory: 10 };
      const result = await productValidationService.inventoryRule(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for negative inventory', async () => {
      const data = { inventory: -5 };
      const result = await productValidationService.inventoryRule(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Inventory cannot be negative');
    });

    it('should fail for inventory too high', async () => {
      const data = { inventory: 1000000 };
      const result = await productValidationService.inventoryRule(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Inventory cannot exceed 999,999');
    });

    it('should warn for active product with zero inventory', async () => {
      const data = { inventory: 0, isActive: true };
      const result = await productValidationService.inventoryRule(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Active products should have inventory available'
      );
    });
  });

  describe('skuRule', () => {
    it('should pass for valid SKU', async () => {
      const data = { sku: 'TEST-001' };
      const result = await productValidationService.skuRule(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for SKU with underscores', async () => {
      const data = { sku: 'TEST_001' };
      const result = await productValidationService.skuRule(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for SKU with invalid characters', async () => {
      const data = { sku: 'TEST@001' };
      const result = await productValidationService.skuRule(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'SKU can only contain letters, numbers, hyphens, and underscores'
      );
    });

    it('should fail for SKU too short', async () => {
      const data = { sku: 'AB' };
      const result = await productValidationService.skuRule(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('SKU must be at least 3 characters long');
    });

    it('should fail for SKU too long', async () => {
      const data = { sku: 'A'.repeat(101) };
      const result = await productValidationService.skuRule(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('SKU must be 100 characters or less');
    });
  });

  describe('pricingRule', () => {
    it('should pass for valid pricing', async () => {
      const data = { price: 29.99, comparePrice: 39.99 };
      const result = await productValidationService.pricingRule(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when compare price equals regular price', async () => {
      const data = { price: 29.99, comparePrice: 29.99 };
      const result = await productValidationService.pricingRule(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Compare price must be greater than regular price'
      );
    });

    it('should fail when compare price is less than regular price', async () => {
      const data = { price: 39.99, comparePrice: 29.99 };
      const result = await productValidationService.pricingRule(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Compare price must be greater than regular price'
      );
    });

    it('should fail for unreasonable price difference', async () => {
      const data = { price: 10, comparePrice: 100 };
      const result = await productValidationService.pricingRule(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Compare price difference seems too large'
      );
    });
  });

  describe('validateStatusTransition', () => {
    it('should allow draft to active transition', async () => {
      const result = await productValidationService.validateStatusTransition(
        'draft',
        'active'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow draft to inactive transition', async () => {
      const result = await productValidationService.validateStatusTransition(
        'draft',
        'inactive'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow active to inactive transition', async () => {
      const result = await productValidationService.validateStatusTransition(
        'active',
        'inactive'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow inactive to active transition', async () => {
      const result = await productValidationService.validateStatusTransition(
        'inactive',
        'active'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should not allow active to draft transition', async () => {
      const result = await productValidationService.validateStatusTransition(
        'active',
        'draft'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Invalid status transition from active to draft'
      );
    });

    it('should not allow inactive to draft transition', async () => {
      const result = await productValidationService.validateStatusTransition(
        'inactive',
        'draft'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Invalid status transition from inactive to draft'
      );
    });
  });

  describe('validateSEOFields', () => {
    it('should pass for valid SEO data', async () => {
      const seoData = {
        metaTitle: 'Valid Meta Title',
        metaDescription:
          'This is a valid meta description that is long enough to be meaningful.',
        keywords: 'keyword1, keyword2, keyword3',
      };

      const result = await productValidationService.validateSEOFields(seoData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for meta title too short', async () => {
      const seoData = {
        metaTitle: 'Short',
      };

      const result = await productValidationService.validateSEOFields(seoData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Meta title should be at least 10 characters'
      );
    });

    it('should fail for meta title too long', async () => {
      const seoData = {
        metaTitle: 'A'.repeat(61),
      };

      const result = await productValidationService.validateSEOFields(seoData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Meta title should be 60 characters or less'
      );
    });

    it('should fail for meta description too short', async () => {
      const seoData = {
        metaDescription: 'Short',
      };

      const result = await productValidationService.validateSEOFields(seoData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Meta description should be at least 50 characters'
      );
    });

    it('should fail for meta description too long', async () => {
      const seoData = {
        metaDescription: 'A'.repeat(161),
      };

      const result = await productValidationService.validateSEOFields(seoData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Meta description should be 160 characters or less'
      );
    });

    it('should fail for too many keywords', async () => {
      const seoData = {
        keywords: 'k1, k2, k3, k4, k5, k6, k7, k8, k9, k10, k11',
      };

      const result = await productValidationService.validateSEOFields(seoData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Keywords should not exceed 10 items');
    });
  });

  describe('validateBulkData', () => {
    it('should pass for valid bulk data', async () => {
      const bulkData = [
        {
          title: 'Product 1',
          description: 'Description 1',
          shortDescription: 'Short 1',
          price: 29.99,
          sku: 'SKU-001',
          inventory: 10,
        },
        {
          title: 'Product 2',
          description: 'Description 2',
          shortDescription: 'Short 2',
          price: 39.99,
          sku: 'SKU-002',
          inventory: 5,
        },
      ];

      const result = await productValidationService.validateBulkData(bulkData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for non-array data', async () => {
      const bulkData = 'not an array';

      const result = await productValidationService.validateBulkData(
        bulkData as any
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Bulk data must be an array');
    });

    it('should fail for empty array', async () => {
      const bulkData: any[] = [];

      const result = await productValidationService.validateBulkData(bulkData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Bulk data cannot be empty');
    });

    it('should fail for too many products', async () => {
      const bulkData = Array(1001).fill({
        title: 'Product',
        description: 'Description',
        shortDescription: 'Short',
        price: 29.99,
        sku: 'SKU',
        inventory: 10,
      });

      const result = await productValidationService.validateBulkData(bulkData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Bulk operations are limited to 1000 products at a time'
      );
    });

    it('should fail for invalid products in bulk data', async () => {
      const bulkData = [
        {
          title: 'Product 1',
          description: 'Description 1',
          shortDescription: 'Short 1',
          price: 29.99,
          sku: 'SKU-001',
          inventory: 10,
        },
        {
          title: 'Product 2',
          description: 'Description 2',
          shortDescription: 'Short 2',
          price: -10, // Invalid price
          sku: 'SKU-002',
          inventory: 5,
        },
      ];

      const result = await productValidationService.validateBulkData(bulkData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Product 2: Price must be greater than 0'
      );
    });
  });
});
