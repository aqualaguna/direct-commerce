/**
 * Payment Comment Routes
 * 
 * Defines API routes for payment comment including custom routes
 */

export default {
  routes: [
    // Custom routes (must come before parameterized routes)
    {
      method: 'GET',
      path: '/payment-comment/payment/:paymentId',
      handler: 'payment-comment.getCommentsByPayment',
      config: {
        policies: ['global::is-authenticated'],
      }
    },
    {
      method: 'GET',
      path: '/payment-comment/statistics',
      handler: 'payment-comment.getStatistics',
      config: {
        policies: ['global::is-admin'],
      }
    },
    // Default CRUD routes
    {
      method: 'GET',
      path: '/payment-comment',
      handler: 'payment-comment.find',
      config: {
        policies: ['global::is-admin'],
      }
    },
    {
      method: 'GET',
      path: '/payment-comment/:documentId',
      handler: 'payment-comment.findOne',
      config: {
        policies: ['global::is-admin'],
      }
    },
    {
      method: 'POST',
      path: '/payment-comment',
      handler: 'payment-comment.create',
      config: {
        policies: ['global::is-admin'],
      }
    },
    {
      method: 'PUT',
      path: '/payment-comment/:documentId',
      handler: 'payment-comment.update',
      config: {
        policies: ['global::is-admin'],
      }
    },
    {
      method: 'DELETE',
      path: '/payment-comment/:documentId',
      handler: 'payment-comment.delete',
      config: {
        policies: ['global::is-admin'],
      }
    }
  ]
}


