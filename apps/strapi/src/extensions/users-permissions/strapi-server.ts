import { trackLoginAttempt, trackGeneralActivity } from '../../utils/activity-tracking';

export default (plugin) => {
  // Add custom rate limit middleware for testing environment
  if (process.env.NODE_ENV === 'test') {
    plugin.middlewares['testRateLimit'] = require('../../middlewares/test-rate-limit').default;
  }

  // Store the original update method
  const originalUpdate = plugin.controllers.user.update;

  // Override the user update controller to enforce ownership and password security
  plugin.controllers.user.update = async (ctx) => {
    const { id } = ctx.params;
    const { user } = ctx.state;
    const { password } = ctx.request.body;

    // If no user is authenticated, deny the update
    if (!user) {
      return ctx.unauthorized('You must be logged in to perform this action.');
    }

    // SECURITY: Reject password updates through profile update route
    if (password !== undefined) {
      return ctx.badRequest({
        error: {
          message: 'Password updates are not allowed through profile update. Please use the dedicated change-password endpoint: POST /api/auth/change-password',
          details: {
            allowedEndpoint: '/api/auth/change-password',
            method: 'POST',
            requiredFields: ['currentPassword', 'password', 'passwordConfirmation']
          }
        }
      });
    }

    // Admin users can update any user (except passwords)
    const isAdmin = user.role?.type === 'admin' || 
                    user.role?.name === 'admin' || 
                    user.role?.code === 'strapi-super-admin';
    
    if (isAdmin) {
      // Call the original update method
      return await originalUpdate(ctx);
    }

    // Check if user is trying to update their own profile
    const userId = user.id?.toString();
    const resourceId = id?.toString();

    if (userId !== resourceId) {
      return ctx.forbidden('You can only update your own profile.');
    }

    // Call the original update method
    return await originalUpdate(ctx);
  };

  // Configure built-in RBAC system
  plugin.controllers.auth.callback = async (ctx) => {
    const { identifier } = ctx.request.body;
    const startTime = Date.now();

    try {
      const user = await strapi
        .query('plugin::users-permissions.user')
        .findOne({
          where: {
            provider: 'local',
            $or: [
              { email: identifier.toLowerCase() },
              { username: identifier },
            ],
          },
        });

      if (!user) {
        // Track failed login attempt
        await trackLoginAttempt(strapi, ctx, null, false, 'Invalid identifier or password', 0);
        throw new Error('Invalid identifier or password');
      }

      const validPassword = await strapi
        .plugin('users-permissions')
        .service('user')
        .validatePassword(ctx.request.body.password, user.password);

      if (!validPassword) {
        // Track failed login attempt
        await trackLoginAttempt(strapi, ctx, user, false, 'Invalid password', 0);
        throw new Error('Invalid identifier or password');
      }

      // Add role-based permissions to the user object using permission inheritance service
      const permissionInheritanceService = strapi
        .plugin('users-permissions')
        .service('permissionInheritance');
      
      const userRole = user.role || 'customer';
      const permissions = await permissionInheritanceService.getRolePermissions(userRole);
      user.permissions = permissions;

      const jwt = strapi.plugin('users-permissions').service('jwt').issue({
        id: user.id,
        role: userRole,
        permissions: permissions,
      });

      // Track successful login
      const sessionDuration = Date.now() - startTime;
      await trackLoginAttempt(strapi, ctx, user, true, null, sessionDuration);

      ctx.send({
        jwt,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: userRole,
          permissions: permissions,
        },
      });
    } catch (error) {
      // Ensure failed attempts are tracked even if not handled above
      if (!error.message.includes('Invalid identifier')) {
        await trackLoginAttempt(strapi, ctx, null, false, error.message, 0);
      }
      throw error;
    }
  };



  // Add custom role assignment service
  plugin.services.roleAssignment = {
    async assignRole(userId, newRole, assignedBy) {
      const user = await strapi
        .query('plugin::users-permissions.user')
        .findOne({
          where: { documentId: userId },
        });

      if (!user) {
        throw new Error('User not found');
      }

      // Validate role assignment permissions
      const assigner = await strapi
        .query('plugin::users-permissions.user')
        .findOne({
          where: { documentId: assignedBy },
        });

      if (!assigner) {
        throw new Error('Assigner not found');
      }

      // Use permission inheritance service for validation
      const permissionInheritanceService = strapi
        .plugin('users-permissions')
        .service('permissionInheritance');

      const validation = permissionInheritanceService.validateRoleAssignment(
        assigner.role,
        newRole,
        user.role
      );

      if (!validation.isValid) {
        throw new Error(`Role assignment validation failed: ${validation.errors.join(', ')}`);
      }

      // Update user role
      const updatedUser = await strapi
        .query('plugin::users-permissions.user')
        .update({
          where: { documentId: userId },
          data: {
            role: newRole,
            roleAssignedAt: new Date(),
          },
        });

      // Log role assignment
      strapi.log.info(`Role ${newRole} assigned to user ${userId} by ${assignedBy}`);

      return updatedUser;
    },

    async revokeRole(userId, revokedBy) {
      const user = await strapi
        .query('plugin::users-permissions.user')
        .findOne({
          where: { documentId: userId },
        });

      if (!user) {
        throw new Error('User not found');
      }

      // Validate role revocation permissions
      const revoker = await strapi
        .query('plugin::users-permissions.user')
        .findOne({
          where: { documentId: revokedBy },
        });

      if (!revoker) {
        throw new Error('Revoker not found');
      }

      // Use permission inheritance service for validation
      const permissionInheritanceService = strapi
        .plugin('users-permissions')
        .service('permissionInheritance');

      if (!permissionInheritanceService.canRevokeRole(revoker.role, user.role)) {
        throw new Error('Insufficient permissions to revoke roles');
      }

      // Update user role to customer (default)
      const updatedUser = await strapi
        .query('plugin::users-permissions.user')
        .update({
          where: { documentId: userId },
          data: {
            role: 'customer',
            roleAssignedAt: new Date(),
          },
        });

      // Log role revocation
      strapi.log.info(`Role revoked from user ${userId} by ${revokedBy}`);

      return updatedUser;
    },

    async getRoleHierarchy() {
      const permissionInheritanceService = strapi
        .plugin('users-permissions')
        .service('permissionInheritance');
      
      return permissionInheritanceService.roleHierarchy;
    },

    async checkPermission(userRole, requiredPermission) {
      const permissionInheritanceService = strapi
        .plugin('users-permissions')
        .service('permissionInheritance');
      
      return await permissionInheritanceService.hasPermission(userRole, requiredPermission);
    },
  };

  return plugin;
};

// Helper functions are now imported from utils/activity-tracking
