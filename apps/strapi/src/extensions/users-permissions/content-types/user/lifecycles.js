'use strict';

/**
 * Lifecycle hooks for user content type to enforce ownership restrictions
 */
module.exports = {
  async beforeUpdate(event) {
    const { params, state } = event;
    const { where } = params;
    const { user } = state;


    // If no user is authenticated, deny the update
    if (!user) {
      throw new Error('You must be logged in to perform this action.');
    }

    // Admin users can update any user
    const isAdmin = user.role?.type === 'admin' || 
                    user.role?.name === 'admin' || 
                    user.role?.code === 'strapi-super-admin';
    
    if (isAdmin) {
      return;
    }

    // Check if user is trying to update their own profile
    const userId = user.id?.toString();
    const resourceId = where?.id?.toString() || where?.documentId?.toString();


    if (!resourceId) {
      throw new Error('Resource ID is required.');
    }

    if (userId !== resourceId) {
      throw new Error('You can only update your own profile.');
    }
  }
};
