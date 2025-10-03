export default {
  routes: [
    // Create checkout session
    {
      method: 'POST',
      path: '/checkout/session',
      handler: 'checkout.create',
      config: {
        policies: ['global::is-authenticated']
      }
    },

    // Get checkout session
    // {
    //   method: 'GET',
    //   path: '/checkout/session/:sessionId',
    //   handler: 'checkout.findOne',
    //   config: {
    //     policies: ['global::is-authenticated']
    //   }
    // },

    // // Update checkout session
    // {
    //   method: 'PUT',
    //   path: '/checkout/session/:sessionId',
    //   handler: 'checkout.update',
    //   config: {
    //     policies: ['global::is-authenticated']
    //   }
    // },


    // // Validate checkout session
    // {
    //   method: 'POST',
    //   path: '/checkout/session/:sessionId/validate',
    //   handler: 'checkout.validate',
    //   config: {
    //     policies: ['global::is-authenticated']
    //   }
    // },
  ]
}
