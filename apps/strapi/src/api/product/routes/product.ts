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
      policies: ['api::product.is-admin'],
    },
    create: {
      policies: ['api::product.is-admin'],
    },
    update: {
      policies: ['api::product.is-admin'],
    },
    delete: {
      policies: ['api::product.is-admin'],
    },
  },
});
