/**
 * product-listing router
 */

import { factories } from '@strapi/strapi';

// Create core routes with minimal configuration to avoid conflicts
const coreRoutes = factories.createCoreRouter('api::product-listing.product-listing', {
  config: {
    find: {
      policies: ['global::is-public'],
    },
    findOne: {
      policies: ['global::is-public'],
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
  // Custom routes for type filtering (specific paths first)
  {
    method: 'GET',
    path: '/product-listings/type/:type',
    handler: 'api::product-listing.product-listing.findByType',
    config: {
      policies: ['global::is-public'],
    },
  },
  
  // Custom routes for variants and publish operations (parameterized paths)
  {
    method: 'GET',
    path: '/product-listings/:documentId/with-variants',
    handler: 'api::product-listing.product-listing.findWithVariants',
    config: {
      policies: ['global::is-public'],
    },
  },
  {
    method: 'POST',
    path: '/product-listings/:documentId/publish',
    handler: 'api::product-listing.product-listing.publish',
    config: {
      policies: ['global::is-authenticated'],
    },
  },
  {
    method: 'POST',
    path: '/product-listings/:documentId/unpublish',
    handler: 'api::product-listing.product-listing.unpublish',
    config: {
      policies: ['global::is-authenticated'],
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
    const allRoutes = [...coreRoutesArray, ...extraRoutes];
    return allRoutes;
  },
};

export default customRouter;
