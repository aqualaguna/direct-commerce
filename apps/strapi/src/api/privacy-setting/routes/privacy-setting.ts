/**
 * Privacy setting routes
 * Enhanced GDPR compliance routes including consent management and data rights
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
        description: 'Update current user privacy settings with consent tracking',
        tag: {
          plugin: 'privacy-setting',
          name: 'Privacy Settings',
          actionType: 'update'
        }
      }
    },
    // Update consent preferences
    {
      method: 'PATCH',
      path: '/privacy-settings/me/consent',
      handler: 'privacy-setting.updateMyConsent',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Update GDPR consent preferences',
        tag: {
          plugin: 'privacy-setting',
          name: 'Privacy Settings',
          actionType: 'update'
        }
      }
    },
    // Get consent history
    {
      method: 'GET',
      path: '/privacy-settings/me/consent-history',
      handler: 'privacy-setting.getMyConsentHistory',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Get consent history and metadata (GDPR compliance)',
        tag: {
          plugin: 'privacy-setting',
          name: 'Privacy Settings',
          actionType: 'read'
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
        description: 'Export comprehensive user data for GDPR compliance',
        tag: {
          plugin: 'privacy-setting',
          name: 'Privacy Settings',
          actionType: 'read'
        }
      }
    },
    // Request data deletion (Right to be forgotten)
    {
      method: 'POST',
      path: '/privacy-settings/me/request-deletion',
      handler: 'privacy-setting.requestDataDeletion',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Request data deletion under GDPR right to be forgotten',
        tag: {
          plugin: 'privacy-setting',
          name: 'Privacy Settings',
          actionType: 'update'
        }
      }
    },
    // Delete user data (Administrative - GDPR compliance)
    {
      method: 'DELETE',
      path: '/privacy-settings/me/data',
      handler: 'privacy-setting.deleteMyData',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Delete user data (Right to be forgotten implementation)',
        tag: {
          plugin: 'privacy-setting',
          name: 'Privacy Settings',
          actionType: 'delete'
        }
      }
    }
  ]
};
