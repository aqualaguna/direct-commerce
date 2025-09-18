/**
 * option-group router
 */

import { factories } from '@strapi/strapi';

// Create core routes with minimal configuration to avoid conflicts
const coreRoutes = factories.createCoreRouter('api::option-group.option-group', {
  config: {
    find: {
      auth: false,
    },
    findOne: {
      auth: false,
    },
    create: {
      auth: false,
    },
    update: {
      auth: false,
    },
    delete: {
      auth: false,
    },
  },
});

// Custom routes only - core CRUD routes are handled by createCoreRouter
// IMPORTANT: Specific routes must come BEFORE parameterized routes to avoid conflicts
const extraRoutes = [
  // Custom routes for active option groups (specific paths first)
  {
    method: 'GET',
    path: '/option-groups/product-listing/:productListingId',
    handler: 'api::option-group.option-group.findByProductListing',
    config: {
      auth: false,
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
