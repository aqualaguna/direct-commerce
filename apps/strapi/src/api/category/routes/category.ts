/**
 * category router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::category.category', {
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
