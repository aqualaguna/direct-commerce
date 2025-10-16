/**
 * Payment Comment Routes
 * 
 * Defines API routes for payment comment
 */

export default {
  routes: [
    // Default CRUD routes
    {
      method: 'GET',
      path: '/payment-comment',
      handler: 'payment-comment.find',
      config: {
        policies: ['global::is-public'],
      }
    },
    {
      method: 'GET',
      path: '/payment-comment/:documentId',
      handler: 'payment-comment.findOne',
      config: {
        policies: ['global::is-public'],
      }
    },
    {
      method: 'POST',
      path: '/payment-comment',
      handler: 'payment-comment.create',
      config: {
        policies: ['global::is-public'],
      }
    },
    {
      method: 'PUT',
      path: '/payment-comment/:documentId',
      handler: 'payment-comment.update',
      config: {
        policies: ['global::is-public'],
      }
    },
    {
      method: 'DELETE',
      path: '/payment-comment/:documentId',
      handler: 'payment-comment.delete',
      config: {
        policies: ['global::is-public'],
      }
    },
  ]
}


