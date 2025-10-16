/**
 * Basic Payment Method Routes
 * 
 * API routes for basic payment method management following the story specifications
 */

export default {
  routes: [
    // Get active payment methods
    {
      method: 'GET',
      path: '/payment-methods/basic',
      handler: 'payment-method.getActive',
      config: {
        policies: ['global::is-public'],
        description: 'Get basic payment methods',
      }
    },
    // Get payment method statistics (admin only)
    {
      method: 'GET',
      path: '/payment-methods/basic/stats',
      handler: 'payment-method.getStats',
      config: {
        policies: ['global::is-admin'],
        description: 'Get payment method statistics',
      }
    },

    // Get payment method by code
    {
      method: 'GET',
      path: '/payment-methods/basic/:code',
      handler: 'payment-method.getByCode',
      config: {
        policies: ['global::is-public'],
        description: 'Get payment method by code',
      }
    },

    // Initialize default payment methods (admin only)
    {
      method: 'POST',
      path: '/payment-methods/basic/initialize',
      handler: 'payment-method.initializeDefaults',
      config: {
        policies: ['global::is-admin'],
        description: 'Initialize default payment methods',
      }
    },



    // Activate payment method (admin only)
    {
      method: 'POST',
      path: '/payment-methods/basic/:documentId/activate',
      handler: 'payment-method.activate',
      config: {
        policies: ['global::is-admin'],
        description: 'Activate payment method',
      }
    },

    // Deactivate payment method (admin only)
    {
      method: 'POST',
      path: '/payment-methods/basic/:documentId/deactivate',
      handler: 'payment-method.deactivate',
      config: {
        policies: ['global::is-admin'],
        description: 'Deactivate payment method',
      }
    },

    // Standard CRUD routes (admin only)
    {
      method: 'GET',
      path: '/payment-methods',
      handler: 'payment-method.find',
      config: {
        policies: ['global::is-admin'],
        description: 'Get all basic payment methods (admin only)',
      }
    },

    {
      method: 'GET',
      path: '/payment-methods/:documentId',
      handler: 'payment-method.findOne',
      config: {
        policies: ['global::is-admin'],
        description: 'Get basic payment method by ID (admin only)',
      }
    },

    {
      method: 'POST',
      path: '/payment-methods',
      handler: 'payment-method.create',
      config: {
        policies: ['global::is-admin'],
        description: 'Create basic payment method (admin only)',
      }
    },

    {
      method: 'PUT',
      path: '/payment-methods/:documentId',
      handler: 'payment-method.update',
      config: {
        policies: ['global::is-admin'],
        description: 'Update basic payment method (admin only)',
      }
    },

    {
      method: 'DELETE',
      path: '/payment-methods/:documentId',
      handler: 'payment-method.delete',
      config: {
        policies: ['global::is-admin'],
        description: 'Delete basic payment method (admin only)',
      }
    }
  ]
}
