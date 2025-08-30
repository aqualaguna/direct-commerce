export default {
  routes: [
    {
      method: 'POST',
      path: '/engagement-metrics/calculate',
      handler: 'engagement-metrics.calculate',
      config: {
        policies: ['global::is-admin'],
        description: 'Calculate a specific engagement metric',
        tag: {
          plugin: 'engagement-metrics',
          name: 'Engagement Metrics',
          actionType: 'create'
        }
      }
    },
    {
      method: 'POST',
      path: '/engagement-metrics/calculate-all',
      handler: 'engagement-metrics.calculateAll',
      config: {
        policies: ['global::is-admin'],
        description: 'Calculate all engagement metrics for a user',
        tag: {
          plugin: 'engagement-metrics',
          name: 'Engagement Metrics',
          actionType: 'create'
        }
      }
    },
    {
      method: 'GET',
      path: '/engagement-metrics',
      handler: 'engagement-metrics.find',
      config: {
        policies: ['global::is-admin'],
        description: 'Get engagement metrics with filtering and pagination',
        tag: {
          plugin: 'engagement-metrics',
          name: 'Engagement Metrics',
          actionType: 'find'
        }
      }
    },
    {
      method: 'GET',
      path: '/engagement-metrics/:documentId',
      handler: 'engagement-metrics.findOne',
      config: {
        policies: ['global::is-admin'],
        description: 'Get a specific engagement metric by documentId',
        tag: {
          plugin: 'engagement-metrics',
          name: 'Engagement Metrics',
          actionType: 'findOne'
        }
      }
    },
    {
      method: 'PUT',
      path: '/engagement-metrics/:documentId',
      handler: 'engagement-metrics.update',
      config: {
        policies: ['global::is-admin'],
        description: 'Update an engagement metric',
        tag: {
          plugin: 'engagement-metrics',
          name: 'Engagement Metrics',
          actionType: 'update'
        }
      }
    },
    {
      method: 'DELETE',
      path: '/engagement-metrics/:documentId',
      handler: 'engagement-metrics.delete',
      config: {
        policies: ['global::is-admin'],
        description: 'Delete an engagement metric record',
        tag: {
          plugin: 'engagement-metrics',
          name: 'Engagement Metrics',
          actionType: 'delete'
        }
      }
    },
    {
      method: 'GET',
      path: '/engagement-metrics/analytics',
      handler: 'engagement-metrics.getAnalytics',
      config: {
        policies: ['global::is-admin'],
        description: 'Get engagement metrics analytics and insights',
        tag: {
          plugin: 'engagement-metrics',
          name: 'Engagement Metrics Analytics',
          actionType: 'find'
        }
      }
    }
  ]
}
