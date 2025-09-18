/**
 * option-value router
 */

import { factories } from '@strapi/strapi';

// Create core routes with minimal configuration to avoid conflicts
const coreRoutes = factories.createCoreRouter('api::option-value.option-value', {
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
  // Custom routes for option value management (specific paths first)
  {
    method: 'POST',
    path: '/option-values/bulk-create',
    handler: 'api::option-value.option-value.bulkCreate',
    config: {
      policies: ['global::is-authenticated'],
    },
  },
  {
    method: 'GET',
    path: '/option-values/option-group/:optionGroupId',
    handler: 'api::option-value.option-value.findByOptionGroup',
    config: {
      policies: ['global::is-authenticated'],
    },
  },
  {
    method: 'GET',
    path: '/option-values/product-listing/:productListingId',
    handler: 'api::option-value.option-value.findByProductListing',
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
