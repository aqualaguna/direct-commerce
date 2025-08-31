export default {
  routes: [
    // Create checkout session
    {
      method: 'POST',
      path: '/checkout/session',
      handler: 'checkout.create',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: ['global::rate-limit']
      }
    },

    // Get checkout session
    {
      method: 'GET',
      path: '/checkout/session/:sessionId',
      handler: 'checkout.findOne',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: ['global::rate-limit']
      }
    },

    // Update checkout session
    {
      method: 'PUT',
      path: '/checkout/session/:sessionId',
      handler: 'checkout.update',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: ['global::rate-limit']
      }
    },

    // Add address to checkout session
    {
      method: 'POST',
      path: '/checkout/session/:sessionId/addresses',
      handler: 'checkout.addAddress',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: ['global::rate-limit']
      }
    },

    // Validate checkout session
    {
      method: 'POST',
      path: '/checkout/session/:sessionId/validate',
      handler: 'checkout.validate',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: ['global::rate-limit']
      }
    },

    // Move to next step
    {
      method: 'POST',
      path: '/checkout/session/:sessionId/next',
      handler: 'checkout.nextStep',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: ['global::rate-limit']
      }
    },

    // Move to previous step
    {
      method: 'POST',
      path: '/checkout/session/:sessionId/previous',
      handler: 'checkout.previousStep',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: ['global::rate-limit']
      }
    },

    // Jump to specific step
    {
      method: 'POST',
      path: '/checkout/session/:sessionId/jump',
      handler: 'checkout.jumpToStep',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: ['global::rate-limit']
      }
    },

    // Validate step form data
    {
      method: 'POST',
      path: '/checkout/session/:sessionId/validate-step',
      handler: 'checkout.validateStep',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: ['global::rate-limit']
      }
    },

    // Get checkout analytics
    {
      method: 'GET',
      path: '/checkout/session/:sessionId/analytics',
      handler: 'checkout.getAnalytics',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: ['global::rate-limit']
      }
    },

    // Abandon checkout session
    {
      method: 'POST',
      path: '/checkout/session/:sessionId/abandon',
      handler: 'checkout.abandon',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: ['global::rate-limit']
      }
    },

    // Guest checkout routes (no authentication required)
    {
      method: 'POST',
      path: '/checkout/guest/session',
      handler: 'checkout.create',
      config: {
        policies: ['global::is-public'],
        middlewares: ['global::rate-limit']
      }
    },

    {
      method: 'GET',
      path: '/checkout/guest/session/:sessionId',
      handler: 'checkout.findOne',
      config: {
        policies: ['global::is-public'],
        middlewares: ['global::rate-limit']
      }
    },

    {
      method: 'PUT',
      path: '/checkout/guest/session/:sessionId',
      handler: 'checkout.update',
      config: {
        policies: ['global::is-public'],
        middlewares: ['global::rate-limit']
      }
    },

    {
      method: 'POST',
      path: '/checkout/guest/session/:sessionId/addresses',
      handler: 'checkout.addAddress',
      config: {
        policies: ['global::is-public'],
        middlewares: ['global::rate-limit']
      }
    },

    {
      method: 'POST',
      path: '/checkout/guest/session/:sessionId/validate',
      handler: 'checkout.validate',
      config: {
        policies: ['global::is-public'],
        middlewares: ['global::rate-limit']
      }
    },

    {
      method: 'POST',
      path: '/checkout/guest/session/:sessionId/next',
      handler: 'checkout.nextStep',
      config: {
        policies: ['global::is-public'],
        middlewares: ['global::rate-limit']
      }
    },

    {
      method: 'POST',
      path: '/checkout/guest/session/:sessionId/previous',
      handler: 'checkout.previousStep',
      config: {
        policies: ['global::is-public'],
        middlewares: ['global::rate-limit']
      }
    },

    {
      method: 'POST',
      path: '/checkout/guest/session/:sessionId/jump',
      handler: 'checkout.jumpToStep',
      config: {
        policies: ['global::is-public'],
        middlewares: ['global::rate-limit']
      }
    },

    {
      method: 'POST',
      path: '/checkout/guest/session/:sessionId/validate-step',
      handler: 'checkout.validateStep',
      config: {
        policies: ['global::is-public'],
        middlewares: ['global::rate-limit']
      }
    },

    {
      method: 'GET',
      path: '/checkout/guest/session/:sessionId/analytics',
      handler: 'checkout.getAnalytics',
      config: {
        policies: ['global::is-public'],
        middlewares: ['global::rate-limit']
      }
    },

    {
      method: 'POST',
      path: '/checkout/guest/session/:sessionId/abandon',
      handler: 'checkout.abandon',
      config: {
        policies: ['global::is-public'],
        middlewares: ['global::rate-limit']
      }
    }
  ]
}
