export default {
  routes: [
    {
      method: 'POST',
      path: '/orders',
      handler: 'order.create',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/orders',
      handler: 'order.find',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/orders/:documentId',
      handler: 'order.findOne',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: []
      }
    },
    {
      method: 'PUT',
      path: '/orders/:documentId',
      handler: 'order.update',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: []
      }
    },
    {
      method: 'DELETE',
      path: '/orders/:documentId',
      handler: 'order.delete',
      config: {
        policies: ['global::is-admin'],
        middlewares: []
      }
    },
    {
      method: 'POST',
      path: '/orders/:documentId/status',
      handler: 'order.updateStatus',
      config: {
        policies: ['global::is-admin'],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/orders/stats',
      handler: 'order.getStats',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/orders/search',
      handler: 'order.search',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: []
      }
    }
  ]
};
