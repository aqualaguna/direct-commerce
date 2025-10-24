/**
 * Checkout Activity Routes
 * API routes for checkout activity tracking and analytics
 */

export default {
  routes: [
    // Standard CRUD routes
    {
      method: 'GET',
      path: '/checkout-activities',
      handler: 'checkout-activity.find',
      config: {
        policies: ['global::is-authenticated'],
      }
    },
    {
      method: 'GET',
      path: '/checkout-activities/:documentId',
      handler: 'checkout-activity.findOne',
      config: {
        policies: ['global::is-authenticated'],
      }
    },
    {
      method: 'POST',
      path: '/checkout-activities',
      handler: 'checkout-activity.create',
      config: {
        policies: ['global::is-authenticated'],
      }
    },
    {
      method: 'PUT',
      path: '/checkout-activities/:documentId',
      handler: 'checkout-activity.update',
      config: {
        policies: ['global::is-authenticated'],
      }
    },
    {
      method: 'DELETE',
      path: '/checkout-activities/:documentId',
      handler: 'checkout-activity.delete',
      config: {
        policies: ['global::is-admin'],
      }
    },
    
    // Specialized routes
    {
      method: 'POST',
      path: '/checkout-activities/bulk',
      handler: 'checkout-activity.bulkCreate',
      config: {
        policies: ['global::is-authenticated'],
      }
    },
    {
      method: 'GET',
      path: '/checkout-activities/session/:checkoutId/summary',
      handler: 'checkout-activity.getSessionSummary',
      config: {
        policies: ['global::is-authenticated'],
      }
    },
    {
      method: 'POST',
      path: '/checkout-activities/cleanup',
      handler: 'checkout-activity.cleanup',
      config: {
        policies: ['global::is-admin'],
      }
    }
  ]
};
