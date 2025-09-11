/**
 * Product validation service tests
 */

import { beforeEach, describe, expect, it } from '@jest/globals';
import productValidationService from './product-validation';

describe('Product Validation Service', () => {
  describe('validateBusinessRules', () => {
    it('should pass validation for valid product data', async () => {
      const validProduct = {
        name: 'Test Product',
        brand: 'Test Brand',
        description: 'Test description',
        sku: 'TEST-001',
        inventory: 10,
      };

      const result =
        await productValidationService.validateBusinessRules(validProduct);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for invalid inventory', async () => {
      const invalidProduct = {
        name: 'Test Product',
        brand: 'Test Brand',
        description: 'Test description',
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
        name: 'Test Product',
        brand: 'Test Brand',
        description: 'Test description',
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
      const data = { inventory: 0 };
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

  describe('nameRule', () => {
    it('should pass validation for valid name', async () => {
      const validProduct = {
        name: 'Valid Product Name',
        brand: 'Test Brand',
        description: 'Test description',
        sku: 'TEST-001',
        inventory: 10,
      };

      const result = await productValidationService.nameRule(validProduct);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for empty name', async () => {
      const invalidProduct = {
        name: '',
        brand: 'Test Brand',
        description: 'Test description',
        sku: 'TEST-001',
        inventory: 10,
      };

      const result = await productValidationService.nameRule(invalidProduct);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name is required and must be a string');
    });

    it('should fail validation for name too short', async () => {
      const invalidProduct = {
        name: 'A',
        brand: 'Test Brand',
        description: 'Test description',
        sku: 'TEST-001',
        inventory: 10,
      };

      const result = await productValidationService.nameRule(invalidProduct);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name must be at least 2 characters long');
    });

    it('should fail validation for name too long', async () => {
      const invalidProduct = {
        name: 'A'.repeat(256),
        brand: 'Test Brand',
        description: 'Test description',
        sku: 'TEST-001',
        inventory: 10,
      };

      const result = await productValidationService.nameRule(invalidProduct);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name must be 255 characters or less');
    });

    it('should fail validation for invalid characters in name', async () => {
      const invalidProduct = {
        name: 'Invalid@Product#Name',
        brand: 'Test Brand',
        description: 'Test description',
        sku: 'TEST-001',
        inventory: 10,
      };

      const result = await productValidationService.nameRule(invalidProduct);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name can only contain letters, numbers, spaces, hyphens, apostrophes, ampersands, and periods');
    });
  });

  describe('brandRule', () => {
    it('should pass validation for valid brand', async () => {
      const validProduct = {
        name: 'Test Product',
        brand: 'Valid Brand Name',
        description: 'Test description',
        sku: 'TEST-001',
        inventory: 10,
      };

      const result = await productValidationService.brandRule(validProduct);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation for null brand', async () => {
      const validProduct = {
        name: 'Test Product',
        brand: null,
        description: 'Test description',
        sku: 'TEST-001',
        inventory: 10,
      };

      const result = await productValidationService.brandRule(validProduct);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation for undefined brand', async () => {
      const validProduct = {
        name: 'Test Product',
        description: 'Test description',
        sku: 'TEST-001',
        inventory: 10,
      };

      const result = await productValidationService.brandRule(validProduct);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for brand too long', async () => {
      const invalidProduct = {
        name: 'Test Product',
        brand: 'A'.repeat(101),
        description: 'Test description',
        sku: 'TEST-001',
        inventory: 10,
      };

      const result = await productValidationService.brandRule(invalidProduct);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Brand must be 100 characters or less');
    });

    it('should fail validation for brand too short', async () => {
      const invalidProduct = {
        name: 'Test Product',
        brand: 'A',
        description: 'Test description',
        sku: 'TEST-001',
        inventory: 10,
      };

      const result = await productValidationService.brandRule(invalidProduct);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Brand must be at least 2 characters long if provided');
    });

    it('should fail validation for invalid characters in brand', async () => {
      const invalidProduct = {
        name: 'Test Product',
        brand: 'Invalid@Brand#Name',
        description: 'Test description',
        sku: 'TEST-001',
        inventory: 10,
      };

      const result = await productValidationService.brandRule(invalidProduct);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Brand can only contain letters, numbers, spaces, hyphens, apostrophes, ampersands, and periods');
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


  describe('validateBulkData', () => {
    it('should pass for valid bulk data', async () => {
      const bulkData = [
        {
          name: 'Product 1',
          brand: 'Brand A',
          description: 'Description 1',
          sku: 'SKU-001',
          inventory: 10,
        },
        {
          name: 'Product 2',
          brand: 'Brand B',
          description: 'Description 2',
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
        name: 'Product',
        brand: 'Brand',
        description: 'Description',
        sku: 'SKU',
        inventory: 10,
      });

      const result = await productValidationService.validateBulkData(bulkData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Bulk operations are limited to 1000 products at a time'
      );
    });

  });
});
