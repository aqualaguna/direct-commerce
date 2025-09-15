export default {
  routes: [
    {
      method: 'GET',
      path: '/user-activities',
      handler: 'user-activity.find',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: []
      },
    },
    {
      method: 'GET',
      path: '/user-activities/analytics',
      handler: 'user-activity.getAnalytics',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: []
      },
    },
    {
      method: 'GET',
      path: '/user-activities/:id',
      handler: 'user-activity.findOne',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: []
      },
    },
    {
      method: 'POST',
      path: '/user-activities',
      handler: 'user-activity.create',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: []
      },
    },
    {
      method: 'PUT',
      path: '/user-activities/:id',
      handler: 'user-activity.update',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: []
      },
    },
    {
      method: 'DELETE',
      path: '/user-activities/:id',
      handler: 'user-activity.delete',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: []
      },
    },
  ],
};
