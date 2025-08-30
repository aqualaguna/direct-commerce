/**
 * Privacy setting routes
 */

export default {
  routes: [
    // Get current user's privacy settings
    {
      method: 'GET',
      path: '/privacy-settings/me',
      handler: 'privacy-setting.getMyPrivacySettings',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Get current user privacy settings',
        tag: {
          plugin: 'privacy-setting',
          name: 'Privacy Settings',
          actionType: 'read'
        }
      }
    },
    // Update current user's privacy settings
    {
      method: 'PUT',
      path: '/privacy-settings/me',
      handler: 'privacy-setting.updateMyPrivacySettings',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Update current user privacy settings',
        tag: {
          plugin: 'privacy-setting',
          name: 'Privacy Settings',
          actionType: 'update'
        }
      }
    },
    // Reset privacy settings to defaults
    {
      method: 'POST',
      path: '/privacy-settings/me/reset',
      handler: 'privacy-setting.resetMyPrivacySettings',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Reset current user privacy settings to defaults',
        tag: {
          plugin: 'privacy-setting',
          name: 'Privacy Settings',
          actionType: 'update'
        }
      }
    },
    // Export user data (GDPR compliance)
    {
      method: 'GET',
      path: '/privacy-settings/me/export',
      handler: 'privacy-setting.exportMyData',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Export user data for GDPR compliance',
        tag: {
          plugin: 'privacy-setting',
          name: 'Privacy Settings',
          actionType: 'read'
        }
      }
    },
    // Delete user data (Right to be forgotten - GDPR compliance)
    {
      method: 'DELETE',
      path: '/privacy-settings/me/data',
      handler: 'privacy-setting.deleteMyData',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Delete user data (Right to be forgotten)',
        tag: {
          plugin: 'privacy-setting',
          name: 'Privacy Settings',
          actionType: 'delete'
        }
      }
    }
  ]
};
