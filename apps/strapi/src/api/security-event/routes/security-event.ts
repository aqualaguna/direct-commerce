export default {
  routes: [
    {
      method: 'POST',
      path: '/security-events',
      handler: 'security-event.create',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Create a new security event',
        tag: {
          plugin: 'security-event',
          name: 'Security Event',
          actionType: 'create'
        }
      }
    },
    {
      method: 'GET',
      path: '/security-events',
      handler: 'security-event.find',
      config: {
        policies: ['global::is-admin'],
        description: 'Get security events with filtering and pagination',
        tag: {
          plugin: 'security-event',
          name: 'Security Event',
          actionType: 'find'
        }
      }
    },
    {
      method: 'GET',
      path: '/security-events/:documentId',
      handler: 'security-event.findOne',
      config: {
        policies: ['global::is-admin'],
        description: 'Get a specific security event by documentId',
        tag: {
          plugin: 'security-event',
          name: 'Security Event',
          actionType: 'findOne'
        }
      }
    },
    {
      method: 'PUT',
      path: '/security-events/:documentId',
      handler: 'security-event.update',
      config: {
        policies: ['global::is-admin'],
        description: 'Update a security event',
        tag: {
          plugin: 'security-event',
          name: 'Security Event',
          actionType: 'update'
        }
      }
    },
    {
      method: 'DELETE',
      path: '/security-events/:documentId',
      handler: 'security-event.delete',
      config: {
        policies: ['global::is-admin'],
        description: 'Delete a security event record',
        tag: {
          plugin: 'security-event',
          name: 'Security Event',
          actionType: 'delete'
        }
      }
    },
    {
      method: 'GET',
      path: '/security-events/analytics',
      handler: 'security-event.getAnalytics',
      config: {
        policies: ['global::is-admin'],
        description: 'Get security event analytics and insights',
        tag: {
          plugin: 'security-event',
          name: 'Security Event Analytics',
          actionType: 'find'
        }
      }
    }
  ]
}
