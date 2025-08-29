/**
 * Inventory routes tests
 *
 * Tests for inventory management route definitions including
 * custom routes for stock tracking, reservations, and analytics.
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock the Strapi factories
const mockCreateCoreRouter = jest.fn();
jest.mock('@strapi/strapi', () => ({
  factories: {
    createCoreRouter: mockCreateCoreRouter,
  },
}));

describe('Inventory Routes', () => {
  let inventoryRoutes: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the default router response
    mockCreateCoreRouter.mockReturnValue({
      routes: [
        {
          method: 'GET',
          path: '/inventories',
          handler: 'inventory.find',
        },
        {
          method: 'GET',
          path: '/inventories/:id',
          handler: 'inventory.findOne',
        },
      ],
    });

    // Import the actual routes module
    const routesModule = require('./inventory');
    inventoryRoutes = routesModule.default;
  });

  describe('Route Configuration', () => {
    it('should export routes configuration object', () => {
      expect(inventoryRoutes).toBeDefined();
      expect(inventoryRoutes).toHaveProperty('routes');
      expect(Array.isArray(inventoryRoutes.routes)).toBe(true);
    });

    it('should include default CRUD routes from core router', () => {
      // The createCoreRouter is called during module import, so we verify the mock was set up correctly
      const { routes } = inventoryRoutes;

      // Check that routes array exists and has content (includes both default and custom routes)
      expect(routes).toBeDefined();
      expect(Array.isArray(routes)).toBe(true);
      expect(routes.length).toBeGreaterThan(8); // Should have multiple custom routes

      // Verify that we have routes that would come from the default router
      const hasBaseRoutes = routes.some(
        (route: any) =>
          route.method === 'GET' &&
          (route.path === '/inventories' || route.path === '/inventories/:id')
      );
      expect(hasBaseRoutes).toBe(true);
    });

    it('should include custom inventory management routes', () => {
      const { routes } = inventoryRoutes;

      // Check for initialize route
      const initializeRoute = routes.find(
        (route: any) =>
          route.path === '/inventories/initialize' && route.method === 'POST'
      );
      expect(initializeRoute).toBeDefined();
      expect(initializeRoute.handler).toBe('inventory.initializeInventory');
      expect(initializeRoute.config.policies).toEqual([
        'api::inventory.is-authenticated',
        'api::inventory.is-admin',
      ]);

      // Check for update quantity route
      const updateQuantityRoute = routes.find(
        (route: any) =>
          route.path === '/inventories/:id/quantity' && route.method === 'PUT'
      );
      expect(updateQuantityRoute).toBeDefined();
      expect(updateQuantityRoute.handler).toBe('inventory.updateQuantity');
      expect(updateQuantityRoute.config.policies).toEqual([
        'api::inventory.is-authenticated',
        'api::inventory.is-admin',
      ]);

      // Check for reserve stock route
      const reserveRoute = routes.find(
        (route: any) =>
          route.path === '/inventories/reserve' && route.method === 'POST'
      );
      expect(reserveRoute).toBeDefined();
      expect(reserveRoute.handler).toBe('inventory.reserveStock');
      expect(reserveRoute.config.policies).toEqual([
        'api::inventory.is-authenticated',
      ]);
    });

    it('should configure analytics route with admin access', () => {
      const { routes } = inventoryRoutes;
      const analyticsRoute = routes.find(
        (route: any) =>
          route.path === '/inventories/analytics' && route.method === 'GET'
      );

      expect(analyticsRoute).toBeDefined();
      expect(analyticsRoute.handler).toBe('inventory.getAnalytics');
      expect(analyticsRoute.config.policies).toEqual([
        'api::inventory.is-authenticated',
        'api::inventory.is-admin',
      ]);
    });

    it('should configure low stock monitoring route', () => {
      const { routes } = inventoryRoutes;
      const lowStockRoute = routes.find(
        (route: any) =>
          route.path === '/inventories/low-stock' && route.method === 'GET'
      );

      expect(lowStockRoute).toBeDefined();
      expect(lowStockRoute.handler).toBe('inventory.getLowStock');
      expect(lowStockRoute.config.policies).toEqual([
        'api::inventory.is-authenticated',
      ]);
    });

    it('should configure product-specific inventory route', () => {
      const { routes } = inventoryRoutes;
      const productRoute = routes.find(
        (route: any) =>
          route.path === '/inventories/product/:productId' &&
          route.method === 'GET'
      );

      expect(productRoute).toBeDefined();
      expect(productRoute.handler).toBe('inventory.findByProduct');
      expect(productRoute.config.policies).toEqual([
        'api::inventory.is-authenticated',
      ]);
    });

    it('should configure inventory history route', () => {
      const { routes } = inventoryRoutes;
      const historyRoute = routes.find(
        (route: any) =>
          route.path === '/inventories/product/:productId/history' &&
          route.method === 'GET'
      );

      expect(historyRoute).toBeDefined();
      expect(historyRoute.handler).toBe('inventory.getHistory');
      expect(historyRoute.config.policies).toEqual([
        'api::inventory.is-authenticated',
      ]);
    });

    it('should configure reservation management routes', () => {
      const { routes } = inventoryRoutes;

      // Release reservation route
      const releaseRoute = routes.find(
        (route: any) =>
          route.path === '/inventories/reservations/:id/release' &&
          route.method === 'PUT'
      );
      expect(releaseRoute).toBeDefined();
      expect(releaseRoute.handler).toBe('inventory.releaseReservation');
      expect(releaseRoute.config.policies).toEqual([
        'api::inventory.is-authenticated',
      ]);
    });

    it('should configure bulk operations route', () => {
      const { routes } = inventoryRoutes;
      const bulkUpdateRoute = routes.find(
        (route: any) =>
          route.path === '/inventories/thresholds/bulk-update' &&
          route.method === 'PUT'
      );

      expect(bulkUpdateRoute).toBeDefined();
      expect(bulkUpdateRoute.handler).toBe(
        'inventory.updateLowStockThresholds'
      );
      expect(bulkUpdateRoute.config.policies).toEqual([
        'api::inventory.is-authenticated',
        'api::inventory.is-admin',
      ]);
    });
  });

  describe('Route Security', () => {
    it('should require authentication for all custom routes', () => {
      const { routes } = inventoryRoutes;
      const customRoutes = routes.filter(
        (route: any) =>
          route.path.startsWith('/inventories/') && route.config?.policies
      );

      customRoutes.forEach((route: any) => {
        expect(route.config.policies).toContain(
          'api::inventory.is-authenticated'
        );
      });
    });

    it('should require admin access for administrative operations', () => {
      const { routes } = inventoryRoutes;
      const adminRoutes = [
        '/inventories/initialize',
        '/inventories/:id/quantity',
        '/inventories/analytics',
        '/inventories/thresholds/bulk-update',
      ];

      adminRoutes.forEach(path => {
        const route = routes.find((r: any) => r.path === path);
        expect(route).toBeDefined();
        expect(route.config.policies).toContain('api::inventory.is-admin');
      });
    });

    it('should allow authenticated users for read operations', () => {
      const { routes } = inventoryRoutes;
      const readRoutes = [
        '/inventories/low-stock',
        '/inventories/product/:productId',
        '/inventories/product/:productId/history',
      ];

      readRoutes.forEach(path => {
        const route = routes.find((r: any) => r.path === path);
        expect(route).toBeDefined();
        expect(route.config.policies).toEqual([
          'api::inventory.is-authenticated',
        ]);
      });
    });
  });

  describe('HTTP Methods', () => {
    it('should use appropriate HTTP methods for operations', () => {
      const { routes } = inventoryRoutes;

      // POST for creation operations
      const postRoutes = routes.filter((route: any) => route.method === 'POST');
      expect(
        postRoutes.some((r: any) => r.path === '/inventories/initialize')
      ).toBe(true);
      expect(
        postRoutes.some((r: any) => r.path === '/inventories/reserve')
      ).toBe(true);

      // PUT for update operations
      const putRoutes = routes.filter((route: any) => route.method === 'PUT');
      expect(
        putRoutes.some((r: any) => r.path === '/inventories/:id/quantity')
      ).toBe(true);
      expect(
        putRoutes.some(
          (r: any) => r.path === '/inventories/reservations/:id/release'
        )
      ).toBe(true);
      expect(
        putRoutes.some(
          (r: any) => r.path === '/inventories/thresholds/bulk-update'
        )
      ).toBe(true);

      // GET for read operations
      const getRoutes = routes.filter((route: any) => route.method === 'GET');
      expect(
        getRoutes.some((r: any) => r.path === '/inventories/low-stock')
      ).toBe(true);
      expect(
        getRoutes.some((r: any) => r.path === '/inventories/analytics')
      ).toBe(true);
    });
  });
});
