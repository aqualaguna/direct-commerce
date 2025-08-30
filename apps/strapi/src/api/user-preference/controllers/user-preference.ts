/**
 * User preference controller
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
        filters: { user: user.documentId }
      });

      if (!preferences) {
        // Create default preferences if none exist
        const defaultPreferences = await strapi.service('api::user-preference.profile').createDefaultPreferences(user.documentId);
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

      // Find existing preferences or create new ones
      let preferences = await strapi.documents('api::user-preference.user-preference').findFirst({
        filters: { user: user.documentId }
      });

      if (preferences) {
        // Update existing preferences
        preferences = await strapi.documents('api::user-preference.user-preference').update({
          documentId: preferences.documentId,
          data: { ...data, user: user.documentId }
        });
      } else {
        // Create new preferences
        preferences = await strapi.documents('api::user-preference.user-preference').create({
          data: { ...data, user: user.documentId }
        });
      }

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
        filters: { user: user.documentId }
      });

      if (existingPreferences) {
        // Delete existing preferences
        await strapi.documents('api::user-preference.user-preference').delete({
          documentId: existingPreferences.documentId
        });
      }

      // Create default preferences
      const defaultPreferences = await strapi.service('api::user-preference.profile').createDefaultPreferences(user.documentId);

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
   * Validate preferences data
   */
  async validatePreferences(data) {
    const errors = [];

    // Validate theme
    if (data.theme && !['light', 'dark', 'auto'].includes(data.theme)) {
      errors.push('Theme must be light, dark, or auto');
    }

    // Validate notification frequency
    if (data.notificationFrequency && !['immediate', 'daily', 'weekly'].includes(data.notificationFrequency)) {
      errors.push('Notification frequency must be immediate, daily, or weekly');
    }

    // Validate language code
    if (data.language && data.language.length > 10) {
      errors.push('Language code must be less than 10 characters');
    }

    // Validate currency code
    if (data.currency && data.currency.length !== 3) {
      errors.push('Currency code must be exactly 3 characters');
    }

    // Validate timezone
    if (data.timezone && data.timezone.length > 50) {
      errors.push('Timezone must be less than 50 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};
