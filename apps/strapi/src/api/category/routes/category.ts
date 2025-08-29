/**
 * Category router
 *
 * Defines API routes for category management with proper policies
 */

// Third-party imports
import { factories } from '@strapi/strapi';

const coreRoutes = factories.createCoreRouter('api::category.category', {
  config: {
    find: {
      policies: ['api::category.is-public'],
    },
    findOne: {
      policies: ['api::category.is-public'],
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

export default {
  routes: [
    // Core CRUD routes with policies
    ...(Array.isArray(coreRoutes.routes) ? coreRoutes.routes : []),

    // Custom routes for hierarchy management
    {
      method: 'GET',
      path: '/categories/tree',
      handler: 'api::category.category.getTree',
      config: {
        policies: ['api::category.is-public'],
      },
    },
    {
      method: 'GET',
      path: '/categories/:documentId/breadcrumbs',
      handler: 'api::category.category.getBreadcrumbs',
      config: {
        policies: ['api::category.is-public'],
      },
    },

    // Custom routes for product relationship management
    {
      method: 'GET',
      path: '/categories/:documentId/products',
      handler: 'api::category.category.getProducts',
      config: {
        policies: ['api::category.is-public'],
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
        policies: ['api::category.is-public'],
      },
    },

    // Custom routes for navigation and search
    {
      method: 'GET',
      path: '/categories/navigation',
      handler: 'api::category.category.getNavigation',
      config: {
        policies: ['api::category.is-public'],
      },
    },
    {
      method: 'GET',
      path: '/categories/:documentId/siblings',
      handler: 'api::category.category.getSiblings',
      config: {
        policies: ['api::category.is-public'],
      },
    },
    {
      method: 'GET',
      path: '/categories/search',
      handler: 'api::category.category.search',
      config: {
        policies: ['api::category.is-public'],
      },
    },
  ],
};
