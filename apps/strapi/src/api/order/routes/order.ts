export default {
  routes: [
    {
      method: 'GET',
      path: '/orders',
      handler: 'order.find',
      config: {
        policies: ['global::is-authenticated'],
      }
    },
    {
      method: 'GET',
      path: '/orders/:documentId',
      handler: 'order.findOne',
      config: {
        policies: ['global::is-authenticated'],
      }
    },
    {
      method: 'GET',
      path: '/orders/byStatus/:status',
      handler: 'order.findByStatus',
      config: {
        policies: ['global::is-authenticated'],
      }
    },
    {
      method: 'POST',
      path: '/orders/:documentId/cancel',
      handler: 'order.cancelOrder',
      config: {
        policies: ['global::is-authenticated'],
      }
    },
    {
      method: 'POST',
      path: '/orders/:documentId/refund',
      handler: 'order.refundOrder',
      config: {
        policies: ['global::is-authenticated'],
      }
    },
   
  ]
};
