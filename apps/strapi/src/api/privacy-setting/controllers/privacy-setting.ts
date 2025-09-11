/**
 * Privacy setting controller
 * Enhanced GDPR compliance features including consent tracking and data management
 */

export default {
  /**
   * Get current user's privacy settings
   */
  async getMyPrivacySettings(ctx) {
    try {
      const { user } = ctx.state;
      
      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      const privacySettings = await strapi.documents('api::privacy-setting.privacy-setting').findFirst({
        filters: { user: user.documentId }
      });

      if (!privacySettings) {
        // Create default privacy settings if none exist
        const defaultSettings = await strapi.service('api::privacy-setting.privacy-setting').createDefaultPrivacySettings(user.documentId);
        return ctx.send({
          data: defaultSettings,
          meta: {
            message: 'Default privacy settings created successfully'
          }
        });
      }

      return ctx.send({
        data: privacySettings,
        meta: {
          message: 'Privacy settings retrieved successfully'
        }
      });
    } catch (error) {
      strapi.log.error('Error in getMyPrivacySettings:', error);
      return ctx.internalServerError('Failed to retrieve privacy settings');
    }
  },

  /**
   * Update current user's privacy settings with consent tracking
   */
  async updateMyPrivacySettings(ctx) {
    try {
      const { user } = ctx.state;
      const { data } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      if (!data) {
        return ctx.badRequest('Privacy settings data is required');
      }

      // Validate privacy settings data
      const validationResult = await this.validatePrivacySettings(data);
      if (!validationResult.isValid) {
        return ctx.badRequest(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Add consent tracking metadata
      const updatedData = {
        ...data,
        user: user.documentId,
        lastConsentUpdate: new Date(),
        consentSource: 'profile-update',
        ipAddressAtConsent: ctx.request.ip,
        userAgentAtConsent: ctx.request.header['user-agent']
      };

      // Validate GDPR consent is provided for required changes
      if (this.requiresGdprConsent(data) && !data.gdprConsent) {
        return ctx.badRequest('GDPR consent is required for these privacy changes');
      }

      // Find existing privacy settings or create new ones
      let privacySettings = await strapi.documents('api::privacy-setting.privacy-setting').findFirst({
        filters: { user: user.documentId }
      });

      if (privacySettings) {
        // Update existing privacy settings
        privacySettings = await strapi.documents('api::privacy-setting.privacy-setting').update({
          documentId: privacySettings.documentId,
          data: updatedData
        });
      } else {
        // Create new privacy settings
        privacySettings = await strapi.documents('api::privacy-setting.privacy-setting').create({
          data: updatedData
        });
      }

      // Log privacy setting changes for audit trail
      await this.logPrivacyChange(user.documentId, data, ctx.request.ip, ctx.request.header['user-agent']);

      return ctx.send({
        data: privacySettings,
        meta: {
          message: 'Privacy settings updated successfully'
        }
      });
    } catch (error) {
      strapi.log.error('Error in updateMyPrivacySettings:', error);
      return ctx.internalServerError('Failed to update privacy settings');
    }
  },

  /**
   * Update consent preferences
   */
  async updateMyConsent(ctx) {
    try {
      const { user } = ctx.state;
      const { consentData } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      if (!consentData) {
        return ctx.badRequest('Consent data is required');
      }

      // Get existing privacy settings
      let privacySettings = await strapi.documents('api::privacy-setting.privacy-setting').findFirst({
        filters: { user: user.documentId }
      });

      if (!privacySettings) {
        // Create default settings first
        privacySettings = await strapi.service('api::privacy-setting.privacy-setting').createDefaultPrivacySettings(user.documentId);
      }

      // Update consent fields
      const consentUpdate = {
        gdprConsent: consentData.gdprConsent || false,
        analyticsConsent: consentData.analyticsConsent || false,
        marketingConsent: consentData.marketingConsent || false,
        dataProcessingConsent: consentData.dataProcessingConsent || true,
        cookieConsent: consentData.cookieConsent || 'necessary',
        lastConsentUpdate: new Date(),
        consentVersion: consentData.consentVersion || '1.0',
        consentSource: 'consent-update' as const,
        ipAddressAtConsent: ctx.request.ip,
        userAgentAtConsent: ctx.request.header['user-agent']
      };

      privacySettings = await strapi.documents('api::privacy-setting.privacy-setting').update({
        documentId: privacySettings.documentId,
        data: consentUpdate
      });

      return ctx.send({
        data: {
          gdprConsent: privacySettings.gdprConsent,
          analyticsConsent: privacySettings.analyticsConsent,
          marketingConsent: privacySettings.marketingConsent,
          dataProcessingConsent: privacySettings.dataProcessingConsent,
          cookieConsent: privacySettings.cookieConsent,
          lastConsentUpdate: privacySettings.lastConsentUpdate,
          consentVersion: privacySettings.consentVersion
        },
        meta: {
          message: 'Consent preferences updated successfully'
        }
      });
    } catch (error) {
      strapi.log.error('Error in updateMyConsent:', error);
      return ctx.internalServerError('Failed to update consent preferences');
    }
  },

  /**
   * Reset privacy settings to defaults
   */
  async resetMyPrivacySettings(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      // Find existing privacy settings
      const existingSettings = await strapi.documents('api::privacy-setting.privacy-setting').findFirst({
        filters: { user: user.documentId }
      });

      if (existingSettings) {
        // Delete existing privacy settings
        await strapi.documents('api::privacy-setting.privacy-setting').delete({
          documentId: existingSettings.documentId
        });
      }

      // Create default privacy settings
      const defaultSettings = await strapi.service('api::privacy-setting.privacy-setting').createDefaultPrivacySettings(user.documentId);

      return ctx.send({
        data: defaultSettings,
        meta: {
          message: 'Privacy settings reset to defaults successfully'
        }
      });
    } catch (error) {
      strapi.log.error('Error in resetMyPrivacySettings:', error);
      return ctx.internalServerError('Failed to reset privacy settings');
    }
  },

  /**
   * Export user data (GDPR compliance)
   */
  async exportMyData(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      // Mark data export request
      await this.recordDataExportRequest(user.documentId);

      // Get comprehensive user data with all related information
      const userData = await strapi.documents('plugin::users-permissions.user').findOne({
        documentId: user.documentId,
        populate: ['profilePicture', 'preferences', 'privacySettings', 'addresses', 'wishlist']
      });

      if (!userData) {
        return ctx.notFound('User not found');
      }

      // Format data for export (remove sensitive internal fields)
      const exportData = {
        userData: {
          id: userData.documentId,
          email: userData.email,
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          dateOfBirth: userData.dateOfBirth,
          gender: userData.gender,
          bio: userData.bio,
          website: userData.website,
          location: userData.location,
          timezone: userData.timezone,
          language: userData.language,
          currency: userData.currency,
          isActive: userData.isActive,
          emailVerified: userData.emailVerified,
          // TODO: add role
          // role: userData.role,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt
        },
        preferences: userData.preferences ? {
          ...userData.preferences,
          documentId: undefined,
          id: undefined,
          user: undefined
        } : null,
        privacySettings: userData.privacySettings ? {
          ...userData.privacySettings,
          documentId: undefined,
          id: undefined,
          user: undefined
        } : null,
        addresses: userData.addresses?.map(addr => ({
          ...addr,
          documentId: undefined,
          id: undefined,
          user: undefined
        })) || [],
        wishlist: userData.wishlist?.map(item => ({
          ...item,
          documentId: undefined,
          id: undefined
        })) || [],
        exportMetadata: {
          exportDate: new Date().toISOString(),
          exportedBy: user.documentId,
          dataTypes: ['profile', 'preferences', 'privacy-settings', 'addresses', 'wishlist'],
          gdprCompliant: true
        }
      };

      ctx.set('Content-Type', 'application/json');
      ctx.set('Content-Disposition', `attachment; filename="user-data-export-${user.documentId}-${new Date().toISOString().split('T')[0]}.json"`);

      return ctx.send({
        data: exportData,
        meta: {
          message: 'User data exported successfully',
          gdprCompliant: true,
          exportDate: new Date().toISOString()
        }
      });
    } catch (error) {
      strapi.log.error('Error in exportMyData:', error);
      return ctx.internalServerError('Failed to export user data');
    }
  },

  /**
   * Request data deletion (Right to be forgotten - GDPR compliance)
   */
  async requestDataDeletion(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      // Mark right to be forgotten request
      await this.recordRightToBeForgettenRequest(user.documentId);

      return ctx.send({
        data: null,
        meta: {
          message: 'Data deletion request recorded. Your account will be processed for deletion within 30 days as required by GDPR.',
          requestDate: new Date().toISOString()
        }
      });
    } catch (error) {
      strapi.log.error('Error in requestDataDeletion:', error);
      return ctx.internalServerError('Failed to process data deletion request');
    }
  },

  /**
   * Delete user data (Administrative - GDPR compliance)
   */
  async deleteMyData(ctx) {
    try {
      const { user } = ctx.state;
      const { confirmDeletion } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      if (!confirmDeletion) {
        return ctx.badRequest('Deletion confirmation is required');
      }

      // Get user data to check for related records
      const userData = await strapi.documents('plugin::users-permissions.user').findOne({
        documentId: user.documentId,
        populate: ['preferences', 'privacySettings', 'addresses', 'wishlist']
      });

      if (!userData) {
        return ctx.notFound('User not found');
      }

      // Log data deletion for audit trail
      await this.logDataDeletion(user.documentId, ctx.request.ip, ctx.request.header['user-agent']);

      // Delete related records first (cascade deletion)
      const deletedRecords = [];

      if (userData.preferences) {
        await strapi.documents('api::user-preference.user-preference').delete({
          documentId: userData.preferences.documentId
        });
        deletedRecords.push('preferences');
      }

      if (userData.privacySettings) {
        await strapi.documents('api::privacy-setting.privacy-setting').delete({
          documentId: userData.privacySettings.documentId
        });
        deletedRecords.push('privacy-settings');
      }

      // Delete addresses
      if (userData.addresses && userData.addresses.length > 0) {
        for (const address of userData.addresses) {
          await strapi.documents('api::address.address').delete({
            documentId: address.documentId
          });
        }
        deletedRecords.push(`${userData.addresses.length} addresses`);
      }

      // Clear wishlist (remove relations)
      if (userData.wishlist && userData.wishlist.length > 0) {
        await strapi.documents('plugin::users-permissions.user').update({
          documentId: user.documentId,
          data: { wishlist: [] }
        });
        deletedRecords.push(`wishlist (${userData.wishlist.length} items)`);
      }

      // Finally, delete the user account
      await strapi.documents('plugin::users-permissions.user').delete({
        documentId: user.documentId
      });
      deletedRecords.push('user account');

      return ctx.send({
        data: null,
        meta: {
          message: 'User data deleted successfully in compliance with GDPR',
          deletedRecords,
          deletionDate: new Date().toISOString()
        }
      });
    } catch (error) {
      strapi.log.error('Error in deleteMyData:', error);
      return ctx.internalServerError('Failed to delete user data');
    }
  },

  /**
   * Get consent history (GDPR compliance)
   */
  async getMyConsentHistory(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      const privacySettings = await strapi.documents('api::privacy-setting.privacy-setting').findFirst({
        filters: { user: user.documentId }
      });

      if (!privacySettings) {
        return ctx.notFound('No privacy settings found');
      }

      const consentHistory = {
        currentConsents: {
          gdprConsent: privacySettings.gdprConsent,
          analyticsConsent: privacySettings.analyticsConsent,
          marketingConsent: privacySettings.marketingConsent,
          dataProcessingConsent: privacySettings.dataProcessingConsent,
          cookieConsent: privacySettings.cookieConsent
        },
        consentMetadata: {
          lastConsentUpdate: privacySettings.lastConsentUpdate,
          consentVersion: privacySettings.consentVersion,
          consentSource: privacySettings.consentSource,
          ipAddressAtConsent: privacySettings.ipAddressAtConsent,
          rightToBeForgetRequested: privacySettings.rightToBeForgetRequested,
          dataExportRequested: privacySettings.dataExportRequested
        }
      };

      return ctx.send({
        data: consentHistory,
        meta: {
          message: 'Consent history retrieved successfully'
        }
      });
    } catch (error) {
      strapi.log.error('Error in getMyConsentHistory:', error);
      return ctx.internalServerError('Failed to retrieve consent history');
    }
  },

  /**
   * Validate privacy settings data
   */
  async validatePrivacySettings(data) {
    const errors = [];

    // Validate profile visibility
    if (data.profileVisibility && !['public', 'private', 'friends'].includes(data.profileVisibility)) {
      errors.push('Profile visibility must be public, private, or friends');
    }

    // Validate cookie consent
    if (data.cookieConsent && !['necessary', 'analytics', 'marketing', 'all'].includes(data.cookieConsent)) {
      errors.push('Cookie consent must be necessary, analytics, marketing, or all');
    }

    // Validate consent source
    if (data.consentSource && !['registration', 'profile-update', 'admin-update', 'api'].includes(data.consentSource)) {
      errors.push('Consent source must be registration, profile-update, admin-update, or api');
    }

    // Validate boolean fields
    const booleanFields = ['dataSharing', 'analyticsConsent', 'marketingConsent', 'thirdPartySharing', 
                          'gdprConsent', 'dataRetentionConsent', 'dataProcessingConsent', 
                          'rightToBeForgetRequested', 'dataExportRequested'];
    
    booleanFields.forEach(field => {
      if (data[field] !== undefined && typeof data[field] !== 'boolean') {
        errors.push(`${field} must be a boolean`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Check if privacy changes require GDPR consent
   */
  requiresGdprConsent(data) {
    const sensitiveFields = ['analyticsConsent', 'marketingConsent', 'dataSharing', 'thirdPartySharing'];
    return sensitiveFields.some(field => data.hasOwnProperty(field));
  },

  /**
   * Record data export request for audit
   */
  async recordDataExportRequest(userId) {
    try {
      const privacySettings = await strapi.documents('api::privacy-setting.privacy-setting').findFirst({
        filters: { user: { documentId: userId } }
      });
      if (privacySettings) {
        await strapi.documents('api::privacy-setting.privacy-setting').update({
          documentId: privacySettings.documentId,
          data: { dataExportRequested: true }
        });
      }
    } catch (error) {
      strapi.log.error('Error recording data export request:', error);
    }
  },

  /**
   * Record right to be forgotten request for audit
   */
  async recordRightToBeForgettenRequest(userId) {
    try {
      const privacySettings = await strapi.documents('api::privacy-setting.privacy-setting').findFirst({
        filters: { user: { documentId: userId } }
      });
      if (privacySettings) {
        await strapi.documents('api::privacy-setting.privacy-setting').update({
          documentId: privacySettings.documentId,
          data: { rightToBeForgetRequested: true }
        });
      }
    } catch (error) {
      strapi.log.error('Error recording right to be forgotten request:', error);
    }
  },

  /**
   * Log privacy setting changes for audit trail
   */
  async logPrivacyChange(userId, changes, ipAddress, userAgent) {
    try {
      // Track in user activity system
      await strapi.documents('api::user-activity.user-activity').create({
        data: {
          user: userId,
          activityType: 'preference_change',
          activityData: {
            changes: changes,
            endpoint: '/api/privacy-settings',
            method: 'PUT',
            timestamp: new Date().toISOString(),
            changeType: 'privacy_settings'
          },
          ipAddress: this.anonymizeIP(ipAddress),
          userAgent,
          sessionId: require('crypto').randomUUID(),
          success: true,
          metadata: {
            privacyChangeLog: true,
            timestamp: new Date().toISOString(),
            changeCount: Object.keys(changes).length,
            gdprRelevant: this.requiresGdprConsent(changes)
          }
        }
      });

      const logEntry = {
        userId,
        changeType: 'privacy-settings',
        changes: JSON.stringify(changes),
        ipAddress,
        userAgent,
        timestamp: new Date()
      };

      strapi.log.info('Privacy setting change logged:', logEntry);
    } catch (error) {
      strapi.log.error('Error logging privacy change:', error);
    }
  },

  /**
   * Anonymize IP address for privacy compliance
   */
  anonymizeIP(ipAddress) {
    if (!ipAddress) return null;
    
    // IPv4 - remove last octet
    if (ipAddress.includes('.')) {
      const parts = ipAddress.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
      }
    }
    
    // IPv6 - remove last 64 bits
    if (ipAddress.includes(':')) {
      const parts = ipAddress.split(':');
      if (parts.length >= 4) {
        return `${parts.slice(0, 4).join(':')}::`;
      }
    }
    
    return ipAddress;
  },

  /**
   * Log data deletion for audit trail
   */
  async logDataDeletion(userId, ipAddress, userAgent) {
    try {
      const logEntry = {
        userId,
        action: 'data-deletion',
        ipAddress,
        userAgent,
        timestamp: new Date(),
        gdprCompliant: true
      };

      strapi.log.info('Data deletion logged:', logEntry);
      // Additional audit logging can be implemented here
    } catch (error) {
      strapi.log.error('Error logging data deletion:', error);
    }
  }
};
