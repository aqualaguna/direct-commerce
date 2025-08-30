export default {
  routes: [
    {
      method: 'POST',
      path: '/user-behaviors/track',
      handler: 'user-behavior.track',
      config: {
        policies: ['global::is-public'],
        description: 'Track user behavior event',
        tag: {
          plugin: 'user-behavior',
          name: 'User Behavior',
          actionType: 'create'
        }
      }
    },
    {
      method: 'GET',
      path: '/user-behaviors',
      handler: 'user-behavior.find',
      config: {
        policies: ['global::is-admin'],
        description: 'Get user behaviors with filtering and pagination',
        tag: {
          plugin: 'user-behavior',
          name: 'User Behavior',
          actionType: 'find'
        }
      }
    },
    {
      method: 'GET',
      path: '/user-behaviors/:documentId',
      handler: 'user-behavior.findOne',
      config: {
        policies: ['global::is-admin'],
        description: 'Get a specific user behavior by documentId',
        tag: {
          plugin: 'user-behavior',
          name: 'User Behavior',
          actionType: 'findOne'
        }
      }
    },
    {
      method: 'DELETE',
      path: '/user-behaviors/:documentId',
      handler: 'user-behavior.delete',
      config: {
        policies: ['global::is-admin'],
        description: 'Delete a user behavior record',
        tag: {
          plugin: 'user-behavior',
          name: 'User Behavior',
          actionType: 'delete'
        }
      }
    },
    {
      method: 'GET',
      path: '/user-behaviors/analytics',
      handler: 'user-behavior.getAnalytics',
      config: {
        policies: ['global::is-admin'],
        description: 'Get user behavior analytics and insights',
        tag: {
          plugin: 'user-behavior',
          name: 'User Behavior Analytics',
          actionType: 'find'
        }
      }
    }
  ]
}
