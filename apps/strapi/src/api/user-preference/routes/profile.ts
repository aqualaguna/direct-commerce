/**
 * Profile routes for user profile management
 */

export default {
  routes: [
    // Get current user's profile
    {
      method: 'GET',
      path: '/profile/me',
      handler: 'profile.getMyProfile',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Get current user profile',
        tag: {
          plugin: 'user-preference',
          name: 'Profile',
          actionType: 'read'
        }
      }
    },
    // Get profile by user ID (with privacy filtering)
    {
      method: 'GET',
      path: '/profile/:documentId',
      handler: 'profile.getProfile',
      config: {
        policies: ['global::is-public'],
        description: 'Get user profile by ID (with privacy filtering)',
        tag: {
          plugin: 'user-preference',
          name: 'Profile',
          actionType: 'read'
        }
      }
    },
    // Update current user's profile
    {
      method: 'PUT',
      path: '/profile/me',
      handler: 'profile.updateMyProfile',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Update current user profile',
        tag: {
          plugin: 'user-preference',
          name: 'Profile',
          actionType: 'update'
        }
      }
    },
    // Get profile completion status
    {
      method: 'GET',
      path: '/profile/me/completion',
      handler: 'profile.getProfileCompletion',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Get current user profile completion status',
        tag: {
          plugin: 'user-preference',
          name: 'Profile',
          actionType: 'read'
        }
      }
    },
    // Upload profile picture
    {
      method: 'POST',
      path: '/profile/me/picture',
      handler: 'profile.uploadProfilePicture',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Upload profile picture',
        tag: {
          plugin: 'user-preference',
          name: 'Profile',
          actionType: 'create'
        }
      }
    },
    // Delete profile picture
    {
      method: 'DELETE',
      path: '/profile/me/picture',
      handler: 'profile.deleteProfilePicture',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Delete profile picture',
        tag: {
          plugin: 'user-preference',
          name: 'Profile',
          actionType: 'delete'
        }
      }
    }
  ]
};
