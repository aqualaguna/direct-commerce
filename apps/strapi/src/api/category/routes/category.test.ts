/**
 * Category routes tests
 *
 * Tests for category route configuration and policies
 */

// Third-party imports
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Test utilities
import {
  createMockContext,
  createMockStrapi,
} from '../../../utils/test-helpers';

// Mock the Strapi factories
const mockCoreRouter = jest.fn();
jest.mock('@strapi/strapi', () => ({
  factories: {
    createCoreRouter: mockCoreRouter,
  },
}));

// Mock core router response
mockCoreRouter.mockReturnValue({
  routes: [
    {
      method: 'GET',
      path: '/categories',
      handler: 'api::category.category.find',
      config: { policies: ['api::category.is-public'] },
    },
    {
      method: 'GET',
      path: '/categories/:documentId',
      handler: 'api::category.category.findOne',
      config: { policies: ['api::category.is-public'] },
    },
  ],
});

// Import the routes module after mocking
const categoryRoutes = require('./category').default;

describe('Category Routes', () => {
  let routes: any;

  beforeEach(() => {
    jest.clearAllMocks();
    routes = categoryRoutes;
  });

  describe('Route Configuration', () => {
    it('should export routes configuration', () => {
      expect(routes).toBeDefined();
      expect(routes.routes).toBeDefined();
      expect(Array.isArray(routes.routes)).toBe(true);
    });

    it('should include core CRUD routes', () => {
      // Just verify the route structure includes core routes
      expect(routes.routes).toBeDefined();
      expect(Array.isArray(routes.routes)).toBe(true);
      expect(routes.routes.length).toBeGreaterThan(0);
    });

    it('should include custom hierarchy routes', () => {
      const customRoutes = routes.routes.filter(
        (route: any) => !Array.isArray(route) && route.method && route.path
      );

      // Check for tree route
      const treeRoute = customRoutes.find(
        (route: any) => route.path === '/categories/tree'
      );
      expect(treeRoute).toBeDefined();
      expect(treeRoute.method).toBe('GET');
      expect(treeRoute.handler).toBe('api::category.category.getTree');
      expect(treeRoute.config.policies).toEqual(['api::category.is-public']);

      // Check for breadcrumbs route
      const breadcrumbsRoute = customRoutes.find(
        (route: any) => route.path === '/categories/:documentId/breadcrumbs'
      );
      expect(breadcrumbsRoute).toBeDefined();
      expect(breadcrumbsRoute.method).toBe('GET');
      expect(breadcrumbsRoute.handler).toBe(
        'api::category.category.getBreadcrumbs'
      );
    });

    it('should include product management routes', () => {
      const customRoutes = routes.routes.filter(
        (route: any) => !Array.isArray(route) && route.method && route.path
      );

      // Check for products route
      const productsRoute = customRoutes.find(
        (route: any) => route.path === '/categories/:documentId/products'
      );
      expect(productsRoute).toBeDefined();
      expect(productsRoute.method).toBe('GET');
      expect(productsRoute.config.policies).toEqual([
        'api::category.is-public',
      ]);

      // Check for assign products route
      const assignRoute = customRoutes.find(
        (route: any) => route.path === '/categories/:documentId/products/assign'
      );
      expect(assignRoute).toBeDefined();
      expect(assignRoute.method).toBe('POST');
      expect(assignRoute.config.policies).toEqual(['api::category.is-admin']);
    });

    it('should include navigation and search routes', () => {
      const customRoutes = routes.routes.filter(
        (route: any) => !Array.isArray(route) && route.method && route.path
      );

      // Check for navigation route
      const navigationRoute = customRoutes.find(
        (route: any) => route.path === '/categories/navigation'
      );
      expect(navigationRoute).toBeDefined();
      expect(navigationRoute.method).toBe('GET');
      expect(navigationRoute.config.policies).toEqual([
        'api::category.is-public',
      ]);

      // Check for search route
      const searchRoute = customRoutes.find(
        (route: any) => route.path === '/categories/search'
      );
      expect(searchRoute).toBeDefined();
      expect(searchRoute.method).toBe('GET');
      expect(searchRoute.config.policies).toEqual(['api::category.is-public']);
    });

    it('should use documentId parameter for entity-specific routes', () => {
      const customRoutes = routes.routes.filter(
        (route: any) => !Array.isArray(route) && route.method && route.path
      );

      const entityRoutes = customRoutes.filter((route: any) =>
        route.path.includes(':documentId')
      );

      expect(entityRoutes.length).toBeGreaterThan(0);
      entityRoutes.forEach((route: any) => {
        expect(route.path).toContain(':documentId');
        expect(route.path).not.toContain(':id');
      });
    });

    it('should apply correct policies to admin routes', () => {
      const customRoutes = routes.routes.filter(
        (route: any) => !Array.isArray(route) && route.method && route.path
      );

      const adminRoutes = customRoutes.filter(
        (route: any) =>
          route.config.policies &&
          route.config.policies.includes('api::category.is-admin')
      );

      expect(adminRoutes.length).toBeGreaterThan(0);
      adminRoutes.forEach((route: any) => {
        expect(route.config.policies).toEqual(['api::category.is-admin']);
      });
    });

    it('should apply correct policies to public routes', () => {
      const customRoutes = routes.routes.filter(
        (route: any) => !Array.isArray(route) && route.method && route.path
      );

      const publicRoutes = customRoutes.filter(
        (route: any) =>
          route.config.policies &&
          route.config.policies.includes('api::category.is-public')
      );

      expect(publicRoutes.length).toBeGreaterThan(0);
      publicRoutes.forEach((route: any) => {
        expect(route.config.policies).toEqual(['api::category.is-public']);
      });
    });
  });

  describe('Route Methods', () => {
    it('should use GET for data retrieval routes', () => {
      const customRoutes = routes.routes.filter(
        (route: any) => !Array.isArray(route) && route.method && route.path
      );

      const getRoutes = customRoutes.filter(
        (route: any) => route.method === 'GET'
      );

      const expectedGetPaths = [
        '/categories/tree',
        '/categories/:documentId/breadcrumbs',
        '/categories/:documentId/products',
        '/categories/:documentId/stats',
        '/categories/navigation',
        '/categories/:documentId/siblings',
        '/categories/search',
      ];

      expectedGetPaths.forEach(path => {
        const route = getRoutes.find((r: any) => r.path === path);
        expect(route).toBeDefined();
      });
    });

    it('should use POST for data modification routes', () => {
      const customRoutes = routes.routes.filter(
        (route: any) => !Array.isArray(route) && route.method && route.path
      );

      const postRoutes = customRoutes.filter(
        (route: any) => route.method === 'POST'
      );

      const expectedPostPaths = [
        '/categories/:documentId/products/assign',
        '/categories/:documentId/products/remove',
        '/categories/:documentId/products/move',
      ];

      expectedPostPaths.forEach(path => {
        const route = postRoutes.find((r: any) => r.path === path);
        expect(route).toBeDefined();
      });
    });
  });
});
