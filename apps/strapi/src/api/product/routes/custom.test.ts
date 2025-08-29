/**
 * Custom Product Routes tests
 *
 * Tests for the custom product router configuration (wishlist management)
 */

import { describe, expect, it } from '@jest/globals';
import customRoutes from './custom';

describe('Custom Product Routes', () => {
  describe('Route Configuration', () => {
    it('should export routes configuration', () => {
      expect(customRoutes).toBeDefined();
      expect(customRoutes.routes).toBeDefined();
      expect(Array.isArray(customRoutes.routes)).toBe(true);
    });

    it('should have correct number of wishlist routes', () => {
      expect(customRoutes.routes).toHaveLength(3);
    });

    it('should configure add to wishlist route', () => {
      const addRoute = customRoutes.routes.find(
        route =>
          route.method === 'POST' &&
          route.path === '/products/:productId/wishlist'
      );

      expect(addRoute).toBeDefined();
      expect(addRoute?.handler).toBe('product.addToWishlist');
      expect(addRoute?.config.policies).toContain(
        'api::product.can-manage-wishlist'
      );
    });

    it('should configure remove from wishlist route', () => {
      const removeRoute = customRoutes.routes.find(
        route =>
          route.method === 'DELETE' &&
          route.path === '/products/:productId/wishlist'
      );

      expect(removeRoute).toBeDefined();
      expect(removeRoute?.handler).toBe('product.removeFromWishlist');
      expect(removeRoute?.config.policies).toContain(
        'api::product.can-manage-wishlist'
      );
    });

    it('should configure get wishlist route', () => {
      const getRoute = customRoutes.routes.find(
        route => route.method === 'GET' && route.path === '/products/wishlist'
      );

      expect(getRoute).toBeDefined();
      expect(getRoute?.handler).toBe('product.getWishlist');
      expect(getRoute?.config.policies).toContain(
        'api::product.can-manage-wishlist'
      );
    });
  });

  describe('Route Security', () => {
    it('should protect all wishlist routes with can-manage-wishlist policy', () => {
      customRoutes.routes.forEach(route => {
        expect(route.config.policies).toContain(
          'api::product.can-manage-wishlist'
        );
      });
    });

    it('should use appropriate HTTP methods', () => {
      const methods = customRoutes.routes.map(route => route.method);
      expect(methods).toContain('POST');
      expect(methods).toContain('DELETE');
      expect(methods).toContain('GET');
    });

    it('should use parameterized paths for product-specific operations', () => {
      const productSpecificRoutes = customRoutes.routes.filter(route =>
        route.path.includes(':productId')
      );

      expect(productSpecificRoutes).toHaveLength(2);
      productSpecificRoutes.forEach(route => {
        expect(route.path).toMatch(/\/products\/:productId\/wishlist/);
      });
    });
  });

  describe('Handler Configuration', () => {
    it('should use product controller for all handlers', () => {
      customRoutes.routes.forEach(route => {
        expect(route.handler).toMatch(/^product\./);
      });
    });

    it('should have descriptive handler names', () => {
      const handlers = customRoutes.routes.map(route => route.handler);
      expect(handlers).toContain('product.addToWishlist');
      expect(handlers).toContain('product.removeFromWishlist');
      expect(handlers).toContain('product.getWishlist');
    });
  });
});
