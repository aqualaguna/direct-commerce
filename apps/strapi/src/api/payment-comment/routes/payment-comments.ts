/**
 * Payment Notes Routes
 * 
 * Defines API routes for payment notes and comments
 */

export default {
  routes: [
    // Default CRUD routes
    {
      method: 'GET',
      path: '/payment-comments',
      handler: 'payment-comments.find',
      config: {
        policies: ['global::is-authenticated'],
        auth: {
          scope: ['payment-comments.find']
        }
      }
    },
    {
      method: 'GET',
      path: '/payment-comments/:documentId',
      handler: 'payment-comments.findOne',
      config: {
        policies: ['global::is-authenticated'],
        auth: {
          scope: ['payment-comments.findOne']
        }
      }
    },
    {
      method: 'POST',
      path: '/payment-comments',
      handler: 'payment-comments.create',
      config: {
        policies: ['global::is-authenticated'],
        auth: {
          scope: ['payment-comments.create']
        }
      }
    },
    {
      method: 'PUT',
      path: '/payment-comments/:documentId',
      handler: 'payment-comments.update',
      config: {
        policies: ['global::is-authenticated'],
        auth: {
          scope: ['payment-comments.update']
        }
      }
    },
    {
      method: 'DELETE',
      path: '/payment-comments/:documentId',
      handler: 'payment-comments.delete',
      config: {
        policies: ['global::is-authenticated'],
        auth: {
          scope: ['payment-comments.delete']
        }
      }
    },

    // Custom routes
    {
      method: 'GET',
      path: '/payment-comments/payment/:paymentId',
      handler: 'payment-comments.getNotesByPayment',
      config: {
        policies: ['global::is-authenticated'],
        auth: {
          scope: ['payment-comments.find']
        }
      }
    },
    {
      method: 'GET',
      path: '/payment-comments/search',
      handler: 'payment-comments.search',
      config: {
        policies: ['global::is-authenticated'],
        auth: {
          scope: ['payment-comments.find']
        }
      }
    },
    {
      method: 'GET',
      path: '/payment-comments/statistics',
      handler: 'payment-comments.getStatistics',
      config: {
        policies: ['global::is-admin'],
        auth: {
          scope: ['payment-comments.find']
        }
      }
    }
  ]
}
