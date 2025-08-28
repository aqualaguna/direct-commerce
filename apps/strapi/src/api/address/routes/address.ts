/**
 * address router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::address.address', {
  config: {
    find: {
      policies: ['api::address.is-owner']
    },
    findOne: {
      policies: ['api::address.is-owner']
    },
    create: {
      policies: ['api::address.is-owner']
    },
    update: {
      policies: ['api::address.is-owner']
    },
    delete: {
      policies: ['api::address.is-owner']
    }
  }
});
