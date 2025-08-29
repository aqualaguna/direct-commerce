/**
 * Inventory router
 *
 * Defines custom routes for inventory management operations including
 * stock tracking, reservations, analytics, and low stock monitoring.
 */

// Node.js and external library imports
import { factories } from '@strapi/strapi';

const defaultRouter = factories.createCoreRouter(
  'api::inventory.inventory' as any
); // Strapi content type identifier

const customRouter = (innerRouter, extraRoutes = []) => {
  let routes;
  return {
    get prefix() {
      return innerRouter.prefix;
    },
    get routes() {
      if (!routes) {
        routes = innerRouter.routes.concat(extraRoutes);
      }
      return routes;
    },
  };
};

const customRoutes = [
  // Default CRUD routes

  // Custom inventory management routes
  {
    method: 'POST',
    path: '/inventories/initialize',
    handler: 'inventory.initializeInventory',
    config: {
      policies: [
        'api::inventory.is-authenticated',
        'api::inventory.is-admin',
      ],
    },
  },
  {
    method: 'PUT',
    path: '/inventories/:id/quantity',
    handler: 'inventory.updateQuantity',
    config: {
      policies: [
        'api::inventory.is-authenticated',
        'api::inventory.is-admin',
      ],
    },
  },
  {
    method: 'POST',
    path: '/inventories/reserve',
    handler: 'inventory.reserveStock',
    config: {
      policies: ['api::inventory.is-authenticated'],
    },
  },
  {
    method: 'PUT',
    path: '/inventories/reservations/:id/release',
    handler: 'inventory.releaseReservation',
    config: {
      policies: ['api::inventory.is-authenticated'],
    },
  },
  {
    method: 'GET',
    path: '/inventories/product/:productId',
    handler: 'inventory.findByProduct',
    config: {
      policies: ['api::inventory.is-authenticated'],
    },
  },
  {
    method: 'GET',
    path: '/inventories/low-stock',
    handler: 'inventory.getLowStock',
    config: {
      policies: ['api::inventory.is-authenticated'],
    },
  },
  {
    method: 'GET',
    path: '/inventories/product/:productId/history',
    handler: 'inventory.getHistory',
    config: {
      policies: ['api::inventory.is-authenticated'],
    },
  },
  {
    method: 'GET',
    path: '/inventories/analytics',
    handler: 'inventory.getAnalytics',
    config: {
      policies: [
        'api::inventory.is-authenticated',
        'api::inventory.is-admin',
      ],
    },
  },
  {
    method: 'PUT',
    path: '/inventories/thresholds/bulk-update',
    handler: 'inventory.updateLowStockThresholds',
    config: {
      policies: [
        'api::inventory.is-authenticated',
        'api::inventory.is-admin',
      ],
    },
  },
];

export default customRouter(defaultRouter, customRoutes);

