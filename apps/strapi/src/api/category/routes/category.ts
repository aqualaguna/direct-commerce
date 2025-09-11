/**
 * category router
 */

import { factories } from '@strapi/strapi';

// Create core routes with minimal configuration to avoid conflicts
const coreRoutes = factories.createCoreRouter('api::category.category', {
  config: {
    find: {
      policies: ['global::is-public'],
    },
    findOne: {
      policies: ['global::is-public'],
    },
    create: {
      policies: ['api::category.is-admin'],
    },
    update: {
      policies: ['api::category.is-admin'],
    },
    delete: {
      policies: ['api::category.is-admin'],
    },
  },
});

// Custom routes only - core CRUD routes are handled by createCoreRouter
// IMPORTANT: Specific routes must come BEFORE parameterized routes to avoid conflicts
const extraRoutes = [
  // Custom routes for hierarchy management (specific paths first)
  {
    method: 'POST',
    path: '/categories/tree',
    handler: 'api::category.category.getTree',
    config: {
      policies: ['global::is-public'],
    },
  },
  {
    method: 'POST',
    path: '/categories/navigation',
    handler: 'api::category.category.getNavigation',
    config: {
      policies: ['global::is-public'],
    },
  },
  {
    method: 'POST',
    path: '/categories/search',
    handler: 'api::category.category.search',
    config: {
      policies: ['global::is-public'],
    },
  },

  {
    method: 'GET',
    path: '/categories/:documentId/breadcrumbs',
    handler: 'api::category.category.getBreadcrumbs',
    config: {
      policies: ['global::is-public'],
    },
  },

  // Custom routes for product relationship management
  {
    method: 'GET',
    path: '/categories/:documentId/products',
    handler: 'api::category.category.getProducts',
    config: {
      policies: ['global::is-public'],
    },
  },
  {
    method: 'POST',
    path: '/categories/:documentId/products/assign',
    handler: 'api::category.category.assignProducts',
    config: {
      policies: ['api::category.is-admin'],
    },
  },
  {
    method: 'POST',
    path: '/categories/:documentId/products/remove',
    handler: 'api::category.category.removeProducts',
    config: {
      policies: ['api::category.is-admin'],
    },
  },
  {
    method: 'POST',
    path: '/categories/:documentId/products/move',
    handler: 'api::category.category.moveProducts',
    config: {
      policies: ['api::category.is-admin'],
    },
  },
  {
    method: 'GET',
    path: '/categories/:documentId/stats',
    handler: 'api::category.category.getStats',
    config: {
      policies: ['global::is-public'],
    },
  },

  // Custom routes for navigation and search
  {
    method: 'GET',
    path: '/categories/:documentId/siblings',
    handler: 'api::category.category.getSiblings',
    config: {
      policies: ['global::is-public'],
    },
  }

];

// Create a custom router that extends the core routes
const customRouter = {
  get prefix() {
    return coreRoutes.prefix;
  },
  get routes() {
    const coreRoutesArray = Array.isArray(coreRoutes.routes) ? coreRoutes.routes : [];
    const allRoutes = [...coreRoutesArray, ...extraRoutes];
    return allRoutes;
  },
};

export default customRouter;
