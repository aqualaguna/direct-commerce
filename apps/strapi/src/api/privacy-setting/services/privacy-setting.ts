/**
 * privacy-setting service
 * Enhanced GDPR compliance service with consent tracking and validation
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::privacy-setting.privacy-setting', ({ strapi }) => ({
  /**
   * Create default privacy settings for a new user
   */
  async createDefaultPrivacySettings(userId: string) {
    try {
      const defaultSettings = {
        user: userId,
        // Profile visibility settings
        profileVisibility: 'private' as const,
        showEmail: false,
        showPhone: false,
        showLocation: false,
        
        // Data sharing preferences
        dataSharing: false,
        analyticsConsent: true,
        marketingConsent: false,
        thirdPartySharing: false,
        
        // GDPR compliance
        gdprConsent: false,
        lastConsentUpdate: new Date(),
        consentVersion: '1.0',
        consentSource: 'registration' as const,
        
        // Data retention and processing
        dataRetentionConsent: false,
        dataProcessingConsent: true, // Required for basic functionality
        cookieConsent: 'necessary' as const,
        
        // Data rights
        rightToBeForgetRequested: false,
        dataExportRequested: false
      };

      const privacySettings = await strapi.documents('api::privacy-setting.privacy-setting').create({
        data: defaultSettings,
        populate: {
          user: true,
        }
      });

      return privacySettings;
    } catch (error) {
      strapi.log.error('Error creating default privacy settings:', error);
      throw error;
    }
  },

  /**
   * Get user privacy settings with fallback to defaults
   */
  async getUserPrivacySettings(userId: string) {
    try {
      let privacySettings = await strapi.documents('api::privacy-setting.privacy-setting').findFirst({
        filters: { user: { documentId: userId } }
      });

      if (!privacySettings) {
        privacySettings = await this.createDefaultPrivacySettings(userId);
      }

      return privacySettings;
    } catch (error) {
      strapi.log.error('Error getting user privacy settings:', error);
      throw error;
    }
  },

  /**
   * Update privacy settings with consent tracking
   */
  async updateUserPrivacySettings(userId: string, data: any, metadata: any = {}) {
    try {
      // Validate data
      const validationResult = await this.validatePrivacyData(data);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Get existing settings
      let privacySettings = await strapi.documents('api::privacy-setting.privacy-setting').findFirst({
        filters: { user: { documentId: userId } }
      });

      // Add consent tracking metadata
      const updatedData = {
        ...data,
        lastConsentUpdate: new Date(),
        consentSource: (metadata.source || 'api') as 'registration' | 'profile-update' | 'admin-update' | 'api' | 'consent-update',
        ipAddressAtConsent: metadata.ipAddress,
        userAgentAtConsent: metadata.userAgent
      };

      if (privacySettings) {
        // Update existing
        privacySettings = await strapi.documents('api::privacy-setting.privacy-setting').update({
          documentId: privacySettings.documentId,
          data: updatedData
        });
      } else {
        // Create new
        privacySettings = await strapi.documents('api::privacy-setting.privacy-setting').create({
          data: { ...updatedData, user: userId }
        });
      }

      return privacySettings;
    } catch (error) {
      strapi.log.error('Error updating user privacy settings:', error);
      throw error;
    }
  },

  /**
   * Update consent preferences specifically
   */
  async updateConsentPreferences(userId: string, consentData: any, metadata: any = {}) {
    try {
      const privacySettings = await this.getUserPrivacySettings(userId);

      const consentUpdate = {
        gdprConsent: consentData.gdprConsent || false,
        analyticsConsent: consentData.analyticsConsent || false,
        marketingConsent: consentData.marketingConsent || false,
        dataProcessingConsent: consentData.dataProcessingConsent ?? true,
        cookieConsent: consentData.cookieConsent || 'necessary',
        lastConsentUpdate: new Date(),
        consentVersion: consentData.consentVersion || '1.0',
        consentSource: (metadata.source || 'consent-update') as 'registration' | 'profile-update' | 'admin-update' | 'api' | 'consent-update',
        ipAddressAtConsent: metadata.ipAddress,
        userAgentAtConsent: metadata.userAgent
      };

      const updatedSettings = await strapi.documents('api::privacy-setting.privacy-setting').update({
        documentId: privacySettings.documentId,
        data: consentUpdate
      });

      return updatedSettings;
    } catch (error) {
      strapi.log.error('Error updating consent preferences:', error);
      throw error;
    }
  },

  /**
   * Mark data export request
   */
  async recordDataExportRequest(userId: string) {
    try {
      const privacySettings = await this.getUserPrivacySettings(userId);

      await strapi.documents('api::privacy-setting.privacy-setting').update({
        documentId: privacySettings.documentId,
        data: { 
          dataExportRequested: true,
          lastConsentUpdate: new Date()
        }
      });

      return true;
    } catch (error) {
      strapi.log.error('Error recording data export request:', error);
      throw error;
    }
  },

  /**
   * Mark right to be forgotten request
   */
  async recordRightToBeForgettenRequest(userId: string) {
    try {
      const privacySettings = await this.getUserPrivacySettings(userId);

      await strapi.documents('api::privacy-setting.privacy-setting').update({
        documentId: privacySettings.documentId,
        data: { 
          rightToBeForgetRequested: true,
          lastConsentUpdate: new Date()
        }
      });

      return true;
    } catch (error) {
      strapi.log.error('Error recording right to be forgotten request:', error);
      throw error;
    }
  },

  /**
   * Get comprehensive user data for GDPR export
   */
  async exportUserData(userId: string) {
    try {
      // Get user data with all related information
      const userData = await strapi.documents('plugin::users-permissions.user').findOne({
        documentId: userId,
        populate: ['profilePicture', 'preferences', 'privacySettings', 'addresses', 'wishlist']
      });

      if (!userData) {
        throw new Error('User not found');
      }

      // Mark export request
      await this.recordDataExportRequest(userId);

      // Format data for export
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
        preferences: userData.preferences ? this.sanitizeForExport(userData.preferences) : null,
        privacySettings: userData.privacySettings ? this.sanitizeForExport(userData.privacySettings) : null,
        addresses: userData.addresses?.map(addr => this.sanitizeForExport(addr)) || [],
        wishlist: userData.wishlist?.map(item => this.sanitizeForExport(item)) || [],
        exportMetadata: {
          exportDate: new Date().toISOString(),
          exportedBy: userId,
          dataTypes: ['profile', 'preferences', 'privacy-settings', 'addresses', 'wishlist'],
          gdprCompliant: true
        }
      };

      return exportData;
    } catch (error) {
      strapi.log.error('Error exporting user data:', error);
      throw error;
    }
  },

  /**
   * Delete user privacy settings (for user deletion)
   */
  async deleteUserPrivacySettings(userId: string) {
    try {
      const privacySettings = await strapi.documents('api::privacy-setting.privacy-setting').findFirst({
        filters: { user: { documentId: userId } }
      });

      if (privacySettings) {
        await strapi.documents('api::privacy-setting.privacy-setting').delete({
          documentId: privacySettings.documentId
        });
      }

      return true;
    } catch (error) {
      strapi.log.error('Error deleting user privacy settings:', error);
      throw error;
    }
  },

  /**
   * Validate privacy settings data
   */
  async validatePrivacyData(data: any) {
    const errors: string[] = [];

    // Validate profile visibility
    if (data.profileVisibility && !['public', 'private', 'friends'].includes(data.profileVisibility)) {
      errors.push('Profile visibility must be public, private, or friends');
    }

    // Validate cookie consent
    if (data.cookieConsent && !['necessary', 'analytics', 'marketing', 'all'].includes(data.cookieConsent)) {
      errors.push('Cookie consent must be necessary, analytics, marketing, or all');
    }

    // Validate consent source
    if (data.consentSource && !['registration', 'profile-update', 'admin-update', 'api', 'consent-update'].includes(data.consentSource)) {
      errors.push('Consent source must be registration, profile-update, admin-update, api, or consent-update');
    }

    // Validate boolean fields
    const booleanFields = [
      'showEmail', 'showPhone', 'showLocation', 'dataSharing', 'analyticsConsent', 
      'marketingConsent', 'thirdPartySharing', 'gdprConsent', 'dataRetentionConsent', 
      'dataProcessingConsent', 'rightToBeForgetRequested', 'dataExportRequested'
    ];
    
    booleanFields.forEach(field => {
      if (data[field] !== undefined && typeof data[field] !== 'boolean') {
        errors.push(`${field} must be a boolean`);
      }
    });

    // GDPR consent validation
    if (data.gdprConsent === false && this.requiresGdprConsent(data)) {
      errors.push('GDPR consent is required for these privacy changes');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Check if changes require GDPR consent
   */
  requiresGdprConsent(data: any) {
    const sensitiveFields = ['analyticsConsent', 'marketingConsent', 'dataSharing', 'thirdPartySharing'];
    return sensitiveFields.some(field => data.hasOwnProperty(field) && data[field] === true);
  },

  /**
   * Sanitize data for export (remove internal fields)
   */
  sanitizeForExport(data: any) {
    if (!data) return null;
    
    const sanitized = { ...data };
    delete sanitized.documentId;
    delete sanitized.id;
    delete sanitized.user;
    
    return sanitized;
  },

  /**
   * Get consent history
   */
  async getConsentHistory(userId: string) {
    try {
      const privacySettings = await this.getUserPrivacySettings(userId);

      return {
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
    } catch (error) {
      strapi.log.error('Error getting consent history:', error);
      throw error;
    }
  }
}));
