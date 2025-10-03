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
      handler: 'basic-payment-method.getActive',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Get basic payment methods',
        tag: {
          plugin: 'basic-payment-method',
          name: 'Basic Payment Method',
          actionType: 'find'
        }
      }
    },
    // Get payment method statistics (admin only)
    {
      method: 'GET',
      path: '/payment-methods/basic/stats',
      handler: 'basic-payment-method.getStats',
      config: {
        policies: ['global::is-admin'],
        description: 'Get payment method statistics',
        tag: {
          plugin: 'basic-payment-method',
          name: 'Basic Payment Method',
          actionType: 'find'
        }
      }
    },

    // Get payment method by code
    {
      method: 'GET',
      path: '/payment-methods/basic/:code',
      handler: 'basic-payment-method.getByCode',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Get payment method by code',
        tag: {
          plugin: 'basic-payment-method',
          name: 'Basic Payment Method',
          actionType: 'find'
        }
      }
    },

    // Initialize default payment methods (admin only)
    {
      method: 'POST',
      path: '/payment-methods/basic/initialize',
      handler: 'basic-payment-method.initializeDefaults',
      config: {
        policies: ['global::is-admin'],
        description: 'Initialize default payment methods',
        tag: {
          plugin: 'basic-payment-method',
          name: 'Basic Payment Method',
          actionType: 'create'
        }
      }
    },



    // Activate payment method (admin only)
    {
      method: 'POST',
      path: '/payment-methods/basic/:documentId/activate',
      handler: 'basic-payment-method.activate',
      config: {
        policies: ['global::is-admin'],
        description: 'Activate payment method',
        tag: {
          plugin: 'basic-payment-method',
          name: 'Basic Payment Method',
          actionType: 'update'
        }
      }
    },

    // Deactivate payment method (admin only)
    {
      method: 'POST',
      path: '/payment-methods/basic/:documentId/deactivate',
      handler: 'basic-payment-method.deactivate',
      config: {
        policies: ['global::is-admin'],
        description: 'Deactivate payment method',
        tag: {
          plugin: 'basic-payment-method',
          name: 'Basic Payment Method',
          actionType: 'update'
        }
      }
    },

    // Standard CRUD routes (admin only)
    {
      method: 'GET',
      path: '/basic-payment-methods',
      handler: 'basic-payment-method.find',
      config: {
        policies: ['global::is-admin'],
        description: 'Get all basic payment methods (admin only)',
        tag: {
          plugin: 'basic-payment-method',
          name: 'Basic Payment Method',
          actionType: 'find'
        }
      }
    },

    {
      method: 'GET',
      path: '/basic-payment-methods/:documentId',
      handler: 'basic-payment-method.findOne',
      config: {
        policies: ['global::is-admin'],
        description: 'Get basic payment method by ID (admin only)',
        tag: {
          plugin: 'basic-payment-method',
          name: 'Basic Payment Method',
          actionType: 'find'
        }
      }
    },

    {
      method: 'POST',
      path: '/basic-payment-methods',
      handler: 'basic-payment-method.create',
      config: {
        policies: ['global::is-admin'],
        description: 'Create basic payment method (admin only)',
        tag: {
          plugin: 'basic-payment-method',
          name: 'Basic Payment Method',
          actionType: 'create'
        }
      }
    },

    {
      method: 'PUT',
      path: '/basic-payment-methods/:documentId',
      handler: 'basic-payment-method.update',
      config: {
        policies: ['global::is-admin'],
        description: 'Update basic payment method (admin only)',
        tag: {
          plugin: 'basic-payment-method',
          name: 'Basic Payment Method',
          actionType: 'update'
        }
      }
    },

    {
      method: 'DELETE',
      path: '/basic-payment-methods/:documentId',
      handler: 'basic-payment-method.delete',
      config: {
        policies: ['global::is-admin'],
        description: 'Delete basic payment method (admin only)',
        tag: {
          plugin: 'basic-payment-method',
          name: 'Basic Payment Method',
          actionType: 'delete'
        }
      }
    }
  ]
}
