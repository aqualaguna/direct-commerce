export default {
    routes: [
      // Custom routes
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
        path: '/payment-comment/search',
        handler: 'payment-comment.search',
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
      }
    ]
  }
  