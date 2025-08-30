/**
 * User preference routes
 */

export default {
  routes: [
    // Get current user's preferences
    {
      method: 'GET',
      path: '/user-preferences/me',
      handler: 'user-preference.getMyPreferences',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Get current user preferences',
        tag: {
          plugin: 'user-preference',
          name: 'User Preferences',
          actionType: 'read'
        }
      }
    },
    // Update current user's preferences
    {
      method: 'PUT',
      path: '/user-preferences/me',
      handler: 'user-preference.updateMyPreferences',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Update current user preferences',
        tag: {
          plugin: 'user-preference',
          name: 'User Preferences',
          actionType: 'update'
        }
      }
    },
    // Reset preferences to defaults
    {
      method: 'POST',
      path: '/user-preferences/me/reset',
      handler: 'user-preference.resetMyPreferences',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Reset current user preferences to defaults',
        tag: {
          plugin: 'user-preference',
          name: 'User Preferences',
          actionType: 'update'
        }
      }
    }
  ]
};
