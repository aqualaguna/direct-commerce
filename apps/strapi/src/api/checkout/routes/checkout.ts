export default {
  routes: [
    // Create checkout
    {
      method: 'POST',
      path: '/checkout',
      handler: 'checkout.create',
      config: {
        policies: ['global::is-public']
      }
    },
    // Validate checkout
    {
      method: 'POST',
      path: '/checkout/:documentId/validate',
      handler: 'checkout.validateCheckout',
      config: {
        policies: ['global::is-public']
      }
    },
    // Complete checkout
    {
      method: 'POST',
      path: '/checkout/:documentId/complete',
      handler: 'checkout.completeCheckout',
      config: {
        policies: ['global::is-public']
      }
    },
    // Abandon checkout
    {
      method: 'POST',
      path: '/checkout/:documentId/abandon',
      handler: 'checkout.abandonCheckout',
      config: {
        policies: ['global::is-public']
      }
    }
  ]
}
