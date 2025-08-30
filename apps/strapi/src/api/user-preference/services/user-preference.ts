/**
 * user-preference service
 * Enhanced service with default preferences creation and validation
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::user-preference.user-preference', ({ strapi }) => ({
  /**
   * Create default preferences for a new user
   */
  async createDefaultPreferences(userId: string) {
    try {
      const defaultPreferences = {
        user: userId,
        // Communication preferences
        emailMarketing: false,
        smsNotifications: false,
        orderUpdates: true,
        promotionalEmails: false,
        communicationConsentDate: new Date(),
        
        // Notification preferences
        orderStatusNotifications: true,
        promotionalNotifications: false,
        securityNotifications: true,
        emailNotifications: true,
        smsNotificationEnabled: false,
        notificationFrequency: 'immediate' as const,
        
        // Security preferences
        twoFactorEnabled: false,
        sessionTimeout: 3600, // 1 hour
        deviceTracking: true,
        lastPasswordChange: new Date(),
        loginNotifications: true,
        
        // Localization preferences
        language: 'en',
        currency: 'USD',
        timezone: 'UTC',
        dateFormat: 'MM_DD_YYYY' as const,
        numberFormat: 'COMMA_DOT' as const,
        theme: 'auto' as const
      };

      const preferences = await strapi.documents('api::user-preference.user-preference').create({
        data: defaultPreferences
      });

      return preferences;
    } catch (error) {
      strapi.log.error('Error creating default preferences:', error);
      throw error;
    }
  },

  /**
   * Get user preferences with fallback to defaults
   */
  async getUserPreferences(userId: string) {
    try {
      let preferences = await strapi.documents('api::user-preference.user-preference').findFirst({
        filters: { user: { documentId: userId } }
      });

      if (!preferences) {
        preferences = await this.createDefaultPreferences(userId);
      }

      return preferences;
    } catch (error) {
      strapi.log.error('Error getting user preferences:', error);
      throw error;
    }
  },

  /**
   * Update user preferences with validation
   */
  async updateUserPreferences(userId: string, data: any) {
    try {
      // Validate data
      const validationResult = await this.validatePreferencesData(data);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Get existing preferences
      let preferences = await strapi.documents('api::user-preference.user-preference').findFirst({
        filters: { user: { documentId: userId } }
      });

      // Add consent tracking for communication preferences
      const updatedData = { ...data };
      if (this.hasCommunicationUpdates(data)) {
        updatedData.communicationConsentDate = new Date();
      }

      if (preferences) {
        // Update existing
        preferences = await strapi.documents('api::user-preference.user-preference').update({
          documentId: preferences.documentId,
          data: updatedData
        });
      } else {
        // Create new
        preferences = await strapi.documents('api::user-preference.user-preference').create({
          data: { ...updatedData, user: userId }
        });
      }

      return preferences;
    } catch (error) {
      strapi.log.error('Error updating user preferences:', error);
      throw error;
    }
  },

  /**
   * Validate preferences data
   */
  async validatePreferencesData(data: any) {
    const errors: string[] = [];

    // Validate session timeout
    if (data.sessionTimeout && (data.sessionTimeout < 300 || data.sessionTimeout > 86400)) {
      errors.push('Session timeout must be between 5 minutes and 24 hours');
    }

    // Validate language code
    if (data.language && (typeof data.language !== 'string' || data.language.length > 10)) {
      errors.push('Language code must be a string with less than 10 characters');
    }

    // Validate currency code
    if (data.currency && (typeof data.currency !== 'string' || data.currency.length !== 3)) {
      errors.push('Currency code must be exactly 3 characters');
    }

    // Validate timezone
    if (data.timezone && (typeof data.timezone !== 'string' || data.timezone.length > 100)) {
      errors.push('Timezone must be a string with less than 100 characters');
    }

    // Validate enum fields
    if (data.theme && !['light', 'dark', 'auto'].includes(data.theme)) {
      errors.push('Theme must be light, dark, or auto');
    }

    if (data.notificationFrequency && !['immediate', 'daily', 'weekly', 'disabled'].includes(data.notificationFrequency)) {
      errors.push('Notification frequency must be immediate, daily, weekly, or disabled');
    }

    if (data.dateFormat && !['MM_DD_YYYY', 'DD_MM_YYYY', 'YYYY_MM_DD', 'DD_DOT_MM_DOT_YYYY'].includes(data.dateFormat)) {
      errors.push('Date format must be MM_DD_YYYY, DD_MM_YYYY, YYYY_MM_DD, or DD_DOT_MM_DOT_YYYY');
    }

    if (data.numberFormat && !['COMMA_DOT', 'DOT_COMMA', 'SPACE_COMMA', 'SPACE_DOT'].includes(data.numberFormat)) {
      errors.push('Number format must be COMMA_DOT, DOT_COMMA, SPACE_COMMA, or SPACE_DOT');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Check if data contains communication preference updates
   */
  hasCommunicationUpdates(data: any) {
    const commFields = ['emailMarketing', 'smsNotifications', 'orderUpdates', 'promotionalEmails'];
    return commFields.some(field => data.hasOwnProperty(field));
  },

  /**
   * Get preferences by category
   */
  async getPreferencesByCategory(userId: string, category: string) {
    try {
      const preferences = await this.getUserPreferences(userId);
      
      const categoryFields = {
        communication: ['emailMarketing', 'smsNotifications', 'orderUpdates', 'promotionalEmails', 'communicationConsentDate'],
        notifications: ['orderStatusNotifications', 'promotionalNotifications', 'securityNotifications', 'emailNotifications', 'smsNotificationEnabled', 'notificationFrequency'],
        security: ['twoFactorEnabled', 'sessionTimeout', 'deviceTracking', 'lastPasswordChange', 'loginNotifications'],
        localization: ['language', 'currency', 'timezone', 'dateFormat', 'numberFormat', 'theme']
      };

      const fields = categoryFields[category] || [];
      const categoryData = {};

      fields.forEach(field => {
        if (preferences[field] !== undefined) {
          categoryData[field] = preferences[field];
        }
      });

      return categoryData;
    } catch (error) {
      strapi.log.error(`Error getting preferences by category (${category}):`, error);
      throw error;
    }
  },

  /**
   * Update preferences by category
   */
  async updatePreferencesByCategory(userId: string, category: string, data: any) {
    try {
      // Validate category
      const validCategories = ['communication', 'notifications', 'security', 'localization'];
      if (!validCategories.includes(category)) {
        throw new Error('Invalid preference category');
      }

      // Get existing preferences
      const existingPreferences = await this.getUserPreferences(userId);
      
      // Merge category data
      const updatedData = { ...existingPreferences };
      Object.keys(data).forEach(key => {
        updatedData[key] = data[key];
      });

      // Remove internal fields
      delete updatedData.documentId;
      delete updatedData.id;
      delete updatedData.createdAt;
      delete updatedData.updatedAt;

      // Add consent tracking for communication category
      if (category === 'communication') {
        updatedData.communicationConsentDate = new Date();
      }

      // Update preferences
      const result = await strapi.documents('api::user-preference.user-preference').update({
        documentId: existingPreferences.documentId,
        data: updatedData
      });

      return result;
    } catch (error) {
      strapi.log.error(`Error updating preferences by category (${category}):`, error);
      throw error;
    }
  },

  /**
   * Delete user preferences (for user deletion)
   */
  async deleteUserPreferences(userId: string) {
    try {
      const preferences = await strapi.documents('api::user-preference.user-preference').findFirst({
        filters: { user: { documentId: userId } }
      });

      if (preferences) {
        await strapi.documents('api::user-preference.user-preference').delete({
          documentId: preferences.documentId
        });
      }

      return true;
    } catch (error) {
      strapi.log.error('Error deleting user preferences:', error);
      throw error;
    }
  }
}));
