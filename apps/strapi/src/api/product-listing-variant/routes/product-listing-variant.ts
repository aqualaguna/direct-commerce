import { factories } from '@strapi/strapi';

// Create core routes with minimal configuration to avoid conflicts
const coreRoutes = factories.createCoreRouter('api::product-listing-variant.product-listing-variant', {
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
const extraRoutes = [
  {
    method: 'POST',
    path: '/product-listing-variants/bulk-update-prices',
    handler: 'api::product-listing-variant.product-listing-variant.bulkUpdatePrices',
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
