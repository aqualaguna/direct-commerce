/**
 * Privacy setting controller
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
        const defaultSettings = await strapi.service('api::user-preference.profile').createDefaultPrivacySettings(user.documentId);
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
   * Update current user's privacy settings
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

      // Find existing privacy settings or create new ones
      let privacySettings = await strapi.documents('api::privacy-setting.privacy-setting').findFirst({
        filters: { user: user.documentId }
      });

      if (privacySettings) {
        // Update existing privacy settings
        privacySettings = await strapi.documents('api::privacy-setting.privacy-setting').update({
          documentId: privacySettings.documentId,
          data: { ...data, user: user.documentId }
        });
      } else {
        // Create new privacy settings
        privacySettings = await strapi.documents('api::privacy-setting.privacy-setting').create({
          data: { ...data, user: user.documentId }
        });
      }

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
      const defaultSettings = await strapi.service('api::user-preference.profile').createDefaultPrivacySettings(user.documentId);

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

      // Get user data with all related information
      const userData = await strapi.documents('plugin::users-permissions.user').findOne({
        documentId: user.documentId,
        populate: ['profilePicture', 'preferences', 'privacySettings', 'addresses', 'wishlist']
      });

      if (!userData) {
        return ctx.notFound('User not found');
      }

      // Format data for export
      const exportData = {
        user: {
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
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt
        },
        preferences: userData.preferences,
        privacySettings: userData.privacySettings,
        addresses: userData.addresses,
        wishlist: userData.wishlist,
        exportDate: new Date().toISOString()
      };

      return ctx.send({
        data: exportData,
        meta: {
          message: 'User data exported successfully'
        }
      });
    } catch (error) {
      strapi.log.error('Error in exportMyData:', error);
      return ctx.internalServerError('Failed to export user data');
    }
  },

  /**
   * Delete user data (Right to be forgotten - GDPR compliance)
   */
  async deleteMyData(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      // Get user data to check for related records
      const userData = await strapi.documents('plugin::users-permissions.user').findOne({
        documentId: user.documentId,
        populate: ['preferences', 'privacySettings', 'addresses', 'wishlist']
      });

      if (!userData) {
        return ctx.notFound('User not found');
      }

      // Delete related records first
      if (userData.preferences) {
        await strapi.documents('api::user-preference.user-preference').delete({
          documentId: userData.preferences.documentId
        });
      }

      if (userData.privacySettings) {
        await strapi.documents('api::privacy-setting.privacy-setting').delete({
          documentId: userData.privacySettings.documentId
        });
      }

      // Delete addresses
      if (userData.addresses && userData.addresses.length > 0) {
        for (const address of userData.addresses) {
          await strapi.documents('api::address.address').delete({
            documentId: address.documentId
          });
        }
      }

      // Clear wishlist (remove relations)
      if (userData.wishlist && userData.wishlist.length > 0) {
        await strapi.documents('plugin::users-permissions.user').update({
          documentId: user.documentId,
          data: {
            wishlist: []
          }
        });
      }

      // Finally, delete the user
      await strapi.documents('plugin::users-permissions.user').delete({
        documentId: user.documentId
      });

      return ctx.send({
        data: null,
        meta: {
          message: 'User data deleted successfully'
        }
      });
    } catch (error) {
      strapi.log.error('Error in deleteMyData:', error);
      return ctx.internalServerError('Failed to delete user data');
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

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};
