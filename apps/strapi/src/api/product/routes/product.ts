/**
 * product router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::product.product', {
  config: {
    find: {
      policies: ['api::product.is-public']
    },
    findOne: {
      policies: ['api::product.is-public']
    },
    create: {
      policies: ['api::product.is-admin']
    },
    update: {
      policies: ['api::product.is-admin']
    },
    delete: {
      policies: ['api::product.is-admin']
    }
  }
});
