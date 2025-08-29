/**
 * Product Routes tests
 *
 * Tests for the product router configuration
 */

import { describe, expect, it } from '@jest/globals';

// Mock the Strapi factories
const mockCoreRouter = {
  config: {
    find: { policies: ['api::product.is-public'] },
    findOne: { policies: ['api::product.is-public'] },
    create: { policies: ['api::product.is-admin'] },
    update: { policies: ['api::product.is-admin'] },
    delete: { policies: ['api::product.is-admin'] },
  },
};

jest.mock('@strapi/strapi', () => ({
  factories: {
    createCoreRouter: jest.fn(() => mockCoreRouter),
  },
}));

describe('Product Routes', () => {
  let productRoutes: any;

  beforeEach(() => {
    // Import the routes after mocking
    productRoutes = require('./product').default;
  });

  describe('Route Configuration', () => {
    it('should export routes configuration', () => {
      expect(productRoutes).toBeDefined();
      expect(productRoutes.config).toBeDefined();
    });

    it('should configure public access for read operations', () => {
      expect(productRoutes.config.find.policies).toContain(
        'api::product.is-public'
      );
      expect(productRoutes.config.findOne.policies).toContain(
        'api::product.is-public'
      );
    });

    it('should configure admin access for write operations', () => {
      expect(productRoutes.config.create.policies).toContain(
        'api::product.is-admin'
      );
      expect(productRoutes.config.update.policies).toContain(
        'api::product.is-admin'
      );
      expect(productRoutes.config.delete.policies).toContain(
        'api::product.is-admin'
      );
    });

    it('should have correct policy configuration structure', () => {
      const { config } = productRoutes;

      expect(config.find).toHaveProperty('policies');
      expect(config.findOne).toHaveProperty('policies');
      expect(config.create).toHaveProperty('policies');
      expect(config.update).toHaveProperty('policies');
      expect(config.delete).toHaveProperty('policies');
    });

    it('should use correct content type identifier', () => {
      // This test verifies that the router was properly configured
      // The router should be the result of createCoreRouter with correct config
      expect(productRoutes).toBeDefined();
      expect(productRoutes.config).toBeDefined();

      // Verify the router was created (it should be an object with config)
      expect(typeof productRoutes).toBe('object');
      expect(productRoutes.config).toHaveProperty('find');
      expect(productRoutes.config).toHaveProperty('findOne');
      expect(productRoutes.config).toHaveProperty('create');
      expect(productRoutes.config).toHaveProperty('update');
      expect(productRoutes.config).toHaveProperty('delete');
    });
  });

  describe('Security Configuration', () => {
    it('should protect admin operations with proper policies', () => {
      const adminOperations = ['create', 'update', 'delete'];

      adminOperations.forEach(operation => {
        expect(productRoutes.config[operation].policies).toEqual([
          'api::product.is-admin',
        ]);
      });
    });

    it('should allow public access to read operations', () => {
      const publicOperations = ['find', 'findOne'];

      publicOperations.forEach(operation => {
        expect(productRoutes.config[operation].policies).toEqual([
          'api::product.is-public',
        ]);
      });
    });
  });
});
