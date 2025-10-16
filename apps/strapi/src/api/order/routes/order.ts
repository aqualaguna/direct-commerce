export default {
  routes: [
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
      method: 'POST',
      path: '/orders/:documentId/cancel',
      handler: 'order.cancelOrder',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: []
      }
    },
    {
      method: 'POST',
      path: '/orders/:documentId/refund',
      handler: 'order.refundOrder',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/orders/stats',
      handler: 'order.getStats',
      config: {
        policies: ['global::is-admin'],
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
