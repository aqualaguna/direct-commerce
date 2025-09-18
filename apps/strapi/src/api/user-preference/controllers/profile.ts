/**
 * Profile controller for user profile management
 */

export default {
  /**
   * Get current user's profile
   */
  async getMyProfile(ctx) {
    try {
      const { user } = ctx.state;
      
      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      const profile = await strapi.service('api::user-preference.profile').getProfile(
        user.documentId,
        user.documentId
      );

      return ctx.send({
        data: profile,
        meta: {
          message: 'Profile retrieved successfully'
        }
      });
    } catch (error) {
      strapi.log.error('Error in getMyProfile:', error);
      return ctx.internalServerError('Failed to retrieve profile');
    }
  },

  /**
   * Get profile by user ID (with privacy filtering)
   */
  async getProfile(ctx) {
    try {
      const { documentId } = ctx.params;
      const { user } = ctx.state;

      if (!documentId) {
        return ctx.badRequest('User ID is required');
      }

      const profile = await strapi.service('api::user-preference.profile').getProfile(
        documentId,
        user?.documentId
      );

      return ctx.send({
        data: profile,
        meta: {
          message: 'Profile retrieved successfully'
        }
      });
    } catch (error) {
      strapi.log.error('Error in getProfile:', error);
      if (error.message === 'User not found') {
        return ctx.notFound('User not found');
      }
      return ctx.internalServerError('Failed to retrieve profile');
    }
  },

  /**
   * Update current user's profile
   */
  async updateMyProfile(ctx) {
    try {
      const { user } = ctx.state;
      const { data } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      if (!data) {
        return ctx.badRequest('Profile data is required');
      }

      const updatedProfile = await strapi.service('api::user-preference.profile').updateProfile(
        user.documentId,
        data
      );

      return ctx.send({
        data: updatedProfile,
        meta: {
          message: 'Profile updated successfully'
        }
      });
    } catch (error) {
      strapi.log.error('Error in updateMyProfile:', error);
      if (error.message.includes('Validation failed')) {
        return ctx.badRequest(error.message);
      }
      return ctx.internalServerError('Failed to update profile');
    }
  },

  /**
   * Get profile completion status
   */
  async getProfileCompletion(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      const completion = await strapi.service('api::user-preference.profile').getProfileCompletion(
        user.documentId
      );

      return ctx.send({
        data: completion,
        meta: {
          message: 'Profile completion retrieved successfully'
        }
      });
    } catch (error) {
      strapi.log.error('Error in getProfileCompletion:', error);
      return ctx.internalServerError('Failed to get profile completion');
    }
  },

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(ctx) {
    try {
      const { user } = ctx.state;
      const { files } = ctx.request;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      if (!files || !files.profilePicture) {
        return ctx.badRequest('Profile picture file is required');
      }

      const file = files.profilePicture;
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        return ctx.badRequest('Profile picture must be less than 5MB');
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        return ctx.badRequest('Profile picture must be JPEG, PNG, or WebP format');
      }

      // Upload file using Strapi's upload service
      const uploadedFile = await strapi.plugins.upload.services.upload.upload({
        data: {},
        files: file
      });

      // Update user's profile picture
      const updatedUser = await strapi.documents('plugin::users-permissions.user').update({
        documentId: user.documentId,
        data: {
          profilePicture: uploadedFile[0].id
        },
        populate: ['profilePicture']
      });

      return ctx.send({
        data: updatedUser.profilePicture,
        meta: {
          message: 'Profile picture uploaded successfully'
        }
      });
    } catch (error) {
      strapi.log.error('Error in uploadProfilePicture:', error);
      return ctx.internalServerError('Failed to upload profile picture');
    }
  },

  /**
   * Delete profile picture
   */
  async deleteProfilePicture(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      // Get current user to check if they have a profile picture
      const currentUser = await strapi.documents('plugin::users-permissions.user').findOne({
        documentId: user.documentId,
        populate: ['profilePicture']
      });

      if (!currentUser.profilePicture) {
        return ctx.badRequest('No profile picture to delete');
      }

      // Delete the media file
      await strapi.plugins.upload.services.upload.destroy(currentUser.profilePicture.id);

      // Update user to remove profile picture reference
      const updatedUser = await strapi.documents('plugin::users-permissions.user').update({
        documentId: user.documentId,
        data: {
          profilePicture: null
        }
      });

      return ctx.send({
        data: null,
        meta: {
          message: 'Profile picture deleted successfully'
        }
      });
    } catch (error) {
      strapi.log.error('Error in deleteProfilePicture:', error);
      return ctx.internalServerError('Failed to delete profile picture');
    }
  }
};
