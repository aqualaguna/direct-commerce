/**
 * product router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::product.product', {
  config: {
    find: {
      policies: ['global::is-admin'],
    },
    findOne: {
      policies: ['global::is-admin'],
    },
    create: {
      policies: ['global::is-admin'],
    },
    update: {
      policies: ['global::is-admin'],
    },
    delete: {
      policies: ['global::is-admin'],
    },
  },
  only: ['find', 'findOne', 'create', 'update', 'delete'],
});

// Custom inventory management routes
export const customRoutes = {
  routes: [
    // Initialize inventory for a product
    {
      method: 'POST',
      path: '/products/:documentId/inventory/initialize',
      handler: 'product.initializeInventory',
      config: {
        policies: ['global::is-admin'],
      },
    },
    // Update inventory for a product
    {
      method: 'PUT',
      path: '/products/:documentId/inventory',
      handler: 'product.updateInventory',
      config: {
        policies: ['global::is-admin'],
      },
    },
    // Get inventory for a product
    {
      method: 'GET',
      path: '/products/:documentId/inventory',
      handler: 'product.getInventory',
      config: {
        policies: ['global::is-admin'],
      },
    },
    // Get inventory history for a product
    {
      method: 'GET',
      path: '/products/:documentId/inventory/history',
      handler: 'product.getInventoryHistory',
      config: {
        policies: ['global::is-admin'],
      },
    },
    // Reserve stock for a product
    {
      method: 'POST',
      path: '/products/:documentId/inventory/reserve',
      handler: 'product.reserveStock',
      config: {
        policies: ['global::is-admin'],
      },
    },
    // Get inventory analytics
    {
      method: 'GET',
      path: '/products/inventory/analytics',
      handler: 'product.getInventoryAnalytics',
      config: {
        policies: ['global::is-admin'],
      },
    },
  ],
};
