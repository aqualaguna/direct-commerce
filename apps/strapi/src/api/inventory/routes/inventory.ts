/**
 * Inventory router
 *
 * Defines custom routes for inventory management operations including
 * stock tracking, reservations, analytics, and low stock monitoring.
 */

// Node.js and external library imports
import { factories } from '@strapi/strapi';

// Create core routes with minimal configuration to avoid conflicts
const coreRoutes = factories.createCoreRouter('api::inventory.inventory', {
  config: {
    find: {
      policies: ['global::is-authenticated'],
    },
    findOne: {
      policies: ['global::is-authenticated'],
    },
    create: {
      policies: ['global::is-authenticated'],
    },
    update: {
      policies: ['global::is-authenticated'],
    },
    delete: {
      policies: ['global::is-authenticated'],
    },
  },
});

// Custom routes only - core CRUD routes are handled by createCoreRouter
// IMPORTANT: Specific routes must come BEFORE parameterized routes to avoid conflicts
const extraRoutes = [
  // Default CRUD routes

  // Custom inventory management routes
  {
    method: 'POST',
    path: '/inventories/initialize',
    handler: 'inventory.initializeInventory',
    config: {
      policies: [
        'global::is-authenticated',
      ],
    },
  },
  {
    method: 'POST',
    path: '/inventories/:id/update-quantity',
    handler: 'inventory.updateQuantity',
    config: {
      policies: [
        'global::is-authenticated',
      ],
    },
  },
  {
    method: 'POST',
    path: '/inventories/reserve',
    handler: 'inventory.reserveStock',
    config: {
      policies: ['global::is-authenticated'],
    },
  },
  {
    method: 'PUT',
    path: '/inventories/reservations/:id/release',
    handler: 'inventory.releaseReservation',
    config: {
      policies: ['global::is-authenticated'],
    },
  },
  {
    method: 'GET',
    path: '/inventories/product/:productId',
    handler: 'inventory.findByProduct',
    config: {
      policies: ['global::is-authenticated'],
    },
  },
  {
    method: 'GET',
    path: '/inventories/low-stock',
    handler: 'inventory.getLowStock',
    config: {
      policies: ['global::is-authenticated'],
    },
  },
  {
    method: 'GET',
    path: '/inventories/product/:productId/history',
    handler: 'inventory.getHistory',
    config: {
      policies: ['global::is-authenticated'],
    },
  },
  {
    method: 'GET',
    path: '/inventories/analytics',
    handler: 'inventory.getAnalytics',
    config: {
      policies: [
        'global::is-authenticated',
      ],
    },
  },
  {
    method: 'PUT',
    path: '/inventories/thresholds/bulk-update',
    handler: 'inventory.updateLowStockThresholds',
    config: {
      policies: [
        'global::is-authenticated',
      ],
    },
  },
];

// Create a custom router that extends the core routes
const customRouter = {
  get prefix() {
    return coreRoutes.prefix;
  },
  get routes() {
    const coreRoutesArray = Array.isArray(coreRoutes.routes) ? coreRoutes.routes : [];
    const allRoutes = [...extraRoutes, ...coreRoutesArray];
    return allRoutes;
  },
};

export default customRouter;

