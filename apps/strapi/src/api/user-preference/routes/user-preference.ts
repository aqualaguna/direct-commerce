/**
 * User preference routes
 * Comprehensive preference management endpoints including category-specific operations
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
    },
    // Export user preferences (GDPR compliance)
    {
      method: 'GET',
      path: '/user-preferences/me/export',
      handler: 'user-preference.exportMyPreferences',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Export user preferences data (GDPR compliance)',
        tag: {
          plugin: 'user-preference',
          name: 'User Preferences',
          actionType: 'read'
        }
      }
    },
    // Get specific preference category
    {
      method: 'GET',
      path: '/user-preferences/me/:category',
      handler: 'user-preference.getMyPreferenceCategory',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Get specific preference category (communication, notifications, security, localization)',
        tag: {
          plugin: 'user-preference',
          name: 'User Preferences',
          actionType: 'read'
        }
      }
    },
    // Update specific preference category
    {
      method: 'PATCH',
      path: '/user-preferences/me/:category',
      handler: 'user-preference.updateMyPreferenceCategory',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Update specific preference category',
        tag: {
          plugin: 'user-preference',
          name: 'User Preferences',
          actionType: 'update'
        }
      }
    }
  ]
};
