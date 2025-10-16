/**
 * Custom address routes for enhanced functionality
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/addresses/type/:type',
      handler: 'address.findByType',
      config: {
        policies: ['api::address.is-owner'],
        description: 'Get addresses by type (shipping, billing, both)',
      },
    },
    {
      method: 'GET',
      path: '/addresses/default/:type',
      handler: 'address.getDefault',
      config: {
        policies: ['api::address.is-owner'],
        description: 'Get default address by type',
      },
    },
    {
      method: 'POST',
      path: '/addresses/:documentId/set-default',
      handler: 'address.setAsDefault',
      config: {
        policies: ['api::address.is-owner'],
        description: 'Set address as default for its type',
      },
    },
    {
      method: 'POST',
      path: '/addresses/search',
      handler: 'address.search',
      config: {
        policies: ['api::address.is-owner'],
        description: 'Search addresses with filters',
      },
    },
    {
      method: 'POST',
      path: '/addresses/stats',
      handler: 'address.getStats',
      config: {
        policies: ['api::address.is-owner'],
        description: 'Get address statistics for user',
      },
    },
    {
      method: 'POST',
      path: '/addresses/validate',
      handler: 'address.validate',
      config: {
        policies: ['api::address.is-owner'],
        description: 'Validate address data',
      },
    },
    {
      method: 'POST',
      path: '/addresses/validate/:country',
      handler: 'address.validateForCountry',
      config: {
        policies: ['api::address.is-owner'],
        description: 'Validate address for specific country',
      },
    },
    {
      method: 'POST',
      path: '/addresses/book',
      handler: 'address.getAddressBook',
      config: {
        policies: ['api::address.is-owner'],
        description: 'Get address book with organization features',
      },
    },
    {
      method: 'POST',
      path: '/addresses/export',
      handler: 'address.exportAddresses',
      config: {
        policies: ['api::address.is-owner'],
        description: 'Export addresses in JSON or CSV format',
      },
    },
    {
      method: 'POST',
      path: '/addresses/import',
      handler: 'address.importAddresses',
      config: {
        policies: ['api::address.is-owner'],
        description: 'Import addresses from JSON array',
      },
    },
    {
      method: 'POST',
      path: '/addresses/analytics',
      handler: 'address.getAnalytics',
      config: {
        policies: ['global::api-token-only'],
        description: 'Get address analytics and statistics',
      },
    },
  ],
};
