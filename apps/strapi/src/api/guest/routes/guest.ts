export default {
  routes: [
    {
      method: 'POST',
      path: '/guests',
      handler: 'guest.create',
      config: {
        policies: ['global::is-public'],
        description: 'Create a new guest checkout session',
      }
    },
    {
      method: 'GET',
      path: '/guests/:sessionId',
      handler: 'guest.findOne',
      config: {
        policies: ['global::is-public'],
        description: 'Get guest by session ID',
      }
    },
    {
      method: 'PUT',
      path: '/guests/:sessionId',
      handler: 'guest.update',
      config: {
        policies: ['global::is-public'],
        description: 'Update guest data',
      }
    },
    {
      method: 'POST',
      path: '/guests/:sessionId/convert',
      handler: 'guest.convertToUser',
      config: {
        policies: ['global::is-public'],
        description: 'Convert guest to registered user',
      }
    },
    {
      method: 'POST',
      path: '/guests/analytics',
      handler: 'guest.getAnalytics',
      config: {
        policies: ['global::is-admin'],
        description: 'Get guest analytics',
      }
    }
  ]
}
