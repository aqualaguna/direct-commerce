/**
 * Payment Routes
 * 
 * API routes for payment processing following the story specifications
 */

export default {
  routes: [
    // Create payment
    {
      method: 'POST',
      path: '/payment/:orderId',
      handler: 'payment.createPayment',
      config: {
        policies: ['global::is-public'],
        description: 'Create payment',
      }
    },
    // Confirm payment
    {
      method: 'POST',
      path: '/payment/:paymentId/confirm',
      handler: 'payment.confirmPayment',
      config: {
        policies: ['global::is-admin'],
        description: 'Confirm payment',
      }
    },
  ]
}
