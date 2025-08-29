/**
 * Product Search Routes tests
 *
 * Tests for the product search router configuration
 */

import { describe, expect, it } from '@jest/globals';
import searchRoutes from './search';

describe('Product Search Routes', () => {
  describe('Route Configuration', () => {
    it('should export routes configuration', () => {
      expect(searchRoutes).toBeDefined();
      expect(searchRoutes.routes).toBeDefined();
      expect(Array.isArray(searchRoutes.routes)).toBe(true);
    });

    it('should have correct number of search routes', () => {
      expect(searchRoutes.routes).toHaveLength(4);
    });

    it('should configure main search route', () => {
      const searchRoute = searchRoutes.routes.find(
        route => route.method === 'GET' && route.path === '/products/search'
      );

      expect(searchRoute).toBeDefined();
      expect(searchRoute?.handler).toBe('search.search');
      expect(searchRoute?.config.policies).toContain('is-public');
    });

    it('should configure suggestions route', () => {
      const suggestionsRoute = searchRoutes.routes.find(
        route =>
          route.method === 'GET' &&
          route.path === '/products/search/suggestions'
      );

      expect(suggestionsRoute).toBeDefined();
      expect(suggestionsRoute?.handler).toBe('search.suggestions');
      expect(suggestionsRoute?.config.policies).toContain('is-public');
    });

    it('should configure popular search route', () => {
      const popularRoute = searchRoutes.routes.find(
        route =>
          route.method === 'GET' && route.path === '/products/search/popular'
      );

      expect(popularRoute).toBeDefined();
      expect(popularRoute?.handler).toBe('search.popular');
      expect(popularRoute?.config.policies).toContain('is-public');
    });

    it('should configure filter options route', () => {
      const filtersRoute = searchRoutes.routes.find(
        route =>
          route.method === 'GET' && route.path === '/products/search/filters'
      );

      expect(filtersRoute).toBeDefined();
      expect(filtersRoute?.handler).toBe('search.getFilterOptions');
      expect(filtersRoute?.config.policies).toContain('is-public');
    });
  });

  describe('Route Security', () => {
    it('should allow public access to all search routes', () => {
      searchRoutes.routes.forEach(route => {
        expect(route.config.policies).toContain('is-public');
      });
    });

    it('should use GET method for all routes', () => {
      searchRoutes.routes.forEach(route => {
        expect(route.method).toBe('GET');
      });
    });
  });

  describe('API Documentation', () => {
    it('should have proper documentation for all routes', () => {
      searchRoutes.routes.forEach(route => {
        expect(route.config.description).toBeDefined();
        expect(route.config.tags).toBeDefined();
        expect(route.config.responses).toBeDefined();
      });
    });

    it('should include proper response schemas', () => {
      searchRoutes.routes.forEach(route => {
        expect(route.config.responses['200']).toBeDefined();
        expect(route.config.responses['500']).toBeDefined();
      });
    });

    it('should have Product and Search tags', () => {
      searchRoutes.routes.forEach(route => {
        expect(route.config.tags).toContain('Product');
        expect(route.config.tags).toContain('Search');
      });
    });
  });

  describe('Handler Configuration', () => {
    it('should use search controller for all handlers', () => {
      searchRoutes.routes.forEach(route => {
        expect(route.handler).toMatch(/^search\./);
      });
    });

    it('should have descriptive handler names', () => {
      const handlers = searchRoutes.routes.map(route => route.handler);
      expect(handlers).toContain('search.search');
      expect(handlers).toContain('search.suggestions');
      expect(handlers).toContain('search.popular');
      expect(handlers).toContain('search.getFilterOptions');
    });
  });

  describe('Path Structure', () => {
    it('should have consistent path prefix', () => {
      searchRoutes.routes.forEach(route => {
        expect(route.path).toMatch(/^\/products\/search/);
      });
    });

    it('should have unique paths', () => {
      const paths = searchRoutes.routes.map(route => route.path);
      const uniquePaths = new Set(paths);
      expect(uniquePaths.size).toBe(paths.length);
    });
  });
});
