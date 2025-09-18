/**
 * User preference controller
 * Handles comprehensive user preference management including communication, 
 * notifications, security, and localization settings
 */

export default {
  /**
   * Get current user's preferences
   */
  async getMyPreferences(ctx) {
    try {
      const { user } = ctx.state;
      
      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      const preferences = await strapi.documents('api::user-preference.user-preference').findFirst({
        filters: { user: { documentId: user.documentId } }
      });

      if (!preferences) {
        // Create default preferences if none exist
        const defaultPreferences = await strapi.service('api::user-preference.user-preference').createDefaultPreferences(user.documentId);
        return ctx.send({
          data: defaultPreferences,
          meta: {
            message: 'Default preferences created successfully'
          }
        });
      }

      return ctx.send({
        data: preferences,
        meta: {
          message: 'Preferences retrieved successfully'
        }
      });
    } catch (error) {
      strapi.log.error('Error in getMyPreferences:', error);
      return ctx.internalServerError('Failed to retrieve preferences');
    }
  },

  /**
   * Get specific preference category
   */
  async getMyPreferenceCategory(ctx) {
    try {
      const { user } = ctx.state;
      const { category } = ctx.params;
      
      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      const validCategories = ['communication', 'notifications', 'security', 'localization'];
      if (!validCategories.includes(category)) {
        return ctx.badRequest('Invalid preference category');
      }

      const preferences = await strapi.documents('api::user-preference.user-preference').findFirst({
        filters: { user: { documentId: user.documentId } }
      });

      if (!preferences) {
        return ctx.notFound('User preferences not found');
      }

      const categoryData = this.extractCategoryData(preferences, category);

      return ctx.send({
        data: categoryData,
        meta: {
          message: `${category} preferences retrieved successfully`,
          category
        }
      });
    } catch (error) {
      strapi.log.error(`Error in getMyPreferenceCategory (${ctx.params.category}):`, error);
      return ctx.internalServerError('Failed to retrieve preference category');
    }
  },

  /**
   * Update current user's preferences
   */
  async updateMyPreferences(ctx) {
    try {
      const { user } = ctx.state;
      const { data } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      if (!data) {
        return ctx.badRequest('Preferences data is required');
      }

      // Validate preference data
      const validationResult = await this.validatePreferences(data);
      if (!validationResult.isValid) {
        return ctx.badRequest(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Add metadata for consent tracking
      const updatedData = {
        ...data,
        user: user.documentId
      };

      // Update consent date for communication preferences
      if (this.hasCommunicationUpdates(data)) {
        updatedData.communicationConsentDate = new Date();
      }

      // Update password change date for security settings
      if (data.lastPasswordChange) {
        updatedData.lastPasswordChange = new Date();
      }

      // Find existing preferences or create new ones
      let preferences = await strapi.documents('api::user-preference.user-preference').findFirst({
        filters: { user: { documentId: user.documentId } }
      });

      if (preferences) {
        // Update existing preferences
        preferences = await strapi.documents('api::user-preference.user-preference').update({
          documentId: preferences.documentId,
          data: updatedData
        });
      } else {
        // Create new preferences
        preferences = await strapi.documents('api::user-preference.user-preference').create({
          data: updatedData
        });
      }

      // Log preference changes for audit trail
      await this.logPreferenceChange(user.documentId, data, ctx.request.ip, ctx.request.header['user-agent']);

      return ctx.send({
        data: preferences,
        meta: {
          message: 'Preferences updated successfully'
        }
      });
    } catch (error) {
      strapi.log.error('Error in updateMyPreferences:', error);
      return ctx.internalServerError('Failed to update preferences');
    }
  },

  /**
   * Update specific preference category
   */
  async updateMyPreferenceCategory(ctx) {
    try {
      const { user } = ctx.state;
      const { category } = ctx.params;
      const { data } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      const validCategories = ['communication', 'notifications', 'security', 'localization'];
      if (!validCategories.includes(category)) {
        return ctx.badRequest('Invalid preference category');
      }

      if (!data) {
        return ctx.badRequest('Category data is required');
      }

      // Validate category-specific data
      const validationResult = await this.validateCategoryData(data, category);
      if (!validationResult.isValid) {
        return ctx.badRequest(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Get existing preferences
      let preferences = await strapi.documents('api::user-preference.user-preference').findFirst({
        filters: { user: { documentId: user.documentId } }
      });

      if (!preferences) {
        // Create default preferences first
        preferences = await strapi.service('api::user-preference.user-preference').createDefaultPreferences(user.documentId);
      }

      // Update only the specific category
      const updatedData = this.mergeCategoryData(preferences, data, category);
      
      preferences = await strapi.documents('api::user-preference.user-preference').update({
        documentId: preferences.documentId,
        data: updatedData
      });

      const categoryData = this.extractCategoryData(preferences, category);

      return ctx.send({
        data: categoryData,
        meta: {
          message: `${category} preferences updated successfully`,
          category
        }
      });
    } catch (error) {
      strapi.log.error(`Error in updateMyPreferenceCategory (${ctx.params.category}):`, error);
      return ctx.internalServerError('Failed to update preference category');
    }
  },

  /**
   * Reset preferences to defaults
   */
  async resetMyPreferences(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      // Find existing preferences
      const existingPreferences = await strapi.documents('api::user-preference.user-preference').findFirst({
        filters: { user: { documentId: user.documentId } }
      });

      if (existingPreferences) {
        // Delete existing preferences
        await strapi.documents('api::user-preference.user-preference').delete({
          documentId: existingPreferences.documentId
        });
      }

      // Create default preferences
      const defaultPreferences = await strapi.service('api::user-preference.user-preference').createDefaultPreferences(user.documentId);

      return ctx.send({
        data: defaultPreferences,
        meta: {
          message: 'Preferences reset to defaults successfully'
        }
      });
    } catch (error) {
      strapi.log.error('Error in resetMyPreferences:', error);
      return ctx.internalServerError('Failed to reset preferences');
    }
  },

  /**
   * Export user preferences data (GDPR compliance)
   */
  async exportMyPreferences(ctx) {
    try {
      const { user } = ctx.state;
      
      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      const preferences = await strapi.documents('api::user-preference.user-preference').findFirst({
        filters: { user: { documentId: user.documentId } }
      });

      if (!preferences) {
        return ctx.notFound('User preferences not found');
      }

      // Remove internal fields for export
      const exportData: any = { ...preferences };
      delete exportData.documentId;
      delete exportData.id;
      delete exportData.user;

      ctx.set('Content-Type', 'application/json');
      ctx.set('Content-Disposition', `attachment; filename="user-preferences-${user.documentId}.json"`);

      return ctx.send({
        data: exportData,
        meta: {
          message: 'User preferences exported successfully',
          exportDate: new Date(),
          userId: user.documentId
        }
      });
    } catch (error) {
      strapi.log.error('Error in exportMyPreferences:', error);
      return ctx.internalServerError('Failed to export preferences');
    }
  },

  /**
   * Validate comprehensive preferences data
   */
  async validatePreferences(data) {
    const errors = [];

    // Validate theme
    if (data.theme && !['light', 'dark', 'auto'].includes(data.theme)) {
      errors.push('Theme must be light, dark, or auto');
    }

    // Validate notification frequency
    if (data.notificationFrequency && !['immediate', 'daily', 'weekly', 'disabled'].includes(data.notificationFrequency)) {
      errors.push('Notification frequency must be immediate, daily, weekly, or disabled');
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

    // Validate session timeout
    if (data.sessionTimeout !== undefined && data.sessionTimeout !== null && (typeof data.sessionTimeout !== 'number' || data.sessionTimeout < 300 || data.sessionTimeout > 86400)) {
      errors.push('Session timeout must be between 300 and 86400 seconds');
    }

    // Validate date format
    if (data.dateFormat && !['MM_DD_YYYY', 'DD_MM_YYYY', 'YYYY_MM_DD', 'DD_DOT_MM_DOT_YYYY'].includes(data.dateFormat)) {
      errors.push('Date format must be MM_DD_YYYY, DD_MM_YYYY, YYYY_MM_DD, or DD_DOT_MM_DOT_YYYY');
    }

    // Validate number format
    if (data.numberFormat && !['COMMA_DOT', 'DOT_COMMA', 'SPACE_COMMA', 'SPACE_DOT'].includes(data.numberFormat)) {
      errors.push('Number format must be COMMA_DOT, DOT_COMMA, SPACE_COMMA, or SPACE_DOT');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate category-specific data
   */
  async validateCategoryData(data, category) {
    const errors = [];

    switch (category) {
      case 'communication':
        // Validate boolean fields
        const commBooleans = ['emailMarketing', 'smsNotifications', 'orderUpdates', 'promotionalEmails'];
        commBooleans.forEach(field => {
          if (data[field] !== undefined && typeof data[field] !== 'boolean') {
            errors.push(`${field} must be a boolean`);
          }
        });
        break;

      case 'notifications':
        // Validate notification preferences
        const notifBooleans = ['orderStatusNotifications', 'promotionalNotifications', 'securityNotifications', 'emailNotifications', 'smsNotificationEnabled'];
        notifBooleans.forEach(field => {
          if (data[field] !== undefined && typeof data[field] !== 'boolean') {
            errors.push(`${field} must be a boolean`);
          }
        });
        break;

      case 'security':
        // Validate security settings
        if (data.sessionTimeout && (data.sessionTimeout < 300 || data.sessionTimeout > 86400)) {
          errors.push('Session timeout must be between 5 minutes and 24 hours');
        }
        break;

      case 'localization':
        // Validate localization settings
        if (data.language && data.language.length > 10) {
          errors.push('Language code must be less than 10 characters');
        }
        if (data.currency && data.currency.length !== 3) {
          errors.push('Currency code must be exactly 3 characters');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Extract category data from full preferences
   */
  extractCategoryData(preferences, category) {
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
  },

  /**
   * Merge category data into existing preferences
   */
  mergeCategoryData(existingPreferences, newData, category) {
    const updatedPreferences = { ...existingPreferences };
    
    // Remove internal fields
    delete updatedPreferences.documentId;
    delete updatedPreferences.id;
    delete updatedPreferences.createdAt;
    delete updatedPreferences.updatedAt;

    // Merge new data
    Object.keys(newData).forEach(key => {
      updatedPreferences[key] = newData[key];
    });

    // Add consent tracking for communication category
    if (category === 'communication') {
      updatedPreferences.communicationConsentDate = new Date();
    }

    return updatedPreferences;
  },

  /**
   * Check if data contains communication preference updates
   */
  hasCommunicationUpdates(data) {
    const commFields = ['emailMarketing', 'smsNotifications', 'orderUpdates', 'promotionalEmails'];
    return commFields.some(field => data.hasOwnProperty(field));
  },

  /**
   * Log preference changes for audit trail
   */
  async logPreferenceChange(userId, changes, ipAddress, userAgent) {
    try {
      // Track in user activity system
      await strapi.documents('api::user-activity.user-activity').create({
        data: {
          user: userId,
          activityType: 'preference_change',
          activityData: {
            changes: changes,
            endpoint: '/api/user-preferences',
            method: 'PUT',
            timestamp: new Date().toISOString(),
            changeType: 'user_preferences'
          },
          ipAddress: this.anonymizeIP(ipAddress),
          userAgent,
          sessionId: require('crypto').randomUUID(),
          success: true,
          metadata: {
            preferenceChangeLog: true,
            timestamp: new Date().toISOString(),
            changeCount: Object.keys(changes).length
          }
        }
      });

      const logEntry = {
        userId,
        changes: JSON.stringify(changes),
        ipAddress,
        userAgent,
        timestamp: new Date()
      };

      strapi.log.info('Preference change logged:', logEntry);
    } catch (error) {
      strapi.log.error('Error logging preference change:', error);
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
  }
};
