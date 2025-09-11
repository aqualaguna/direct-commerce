export default (plugin) => {
  // Configure built-in RBAC system
  plugin.controllers.auth.callback = async (ctx) => {
    const { identifier } = ctx.request.body;
    const startTime = Date.now();

    try {
      const user = await strapi
        .query('plugin::users-permissions.user')
        .findOne({
          where: {
            $or: [
              { email: identifier.toLowerCase() },
              { username: identifier },
            ],
          },
        });

      if (!user) {
        // Track failed login attempt
        await trackLoginAttempt(ctx, null, false, 'Invalid identifier or password', 0);
        throw new Error('Invalid identifier or password');
      }

      const validPassword = await strapi
        .plugin('users-permissions')
        .service('user')
        .validatePassword(ctx.request.body.password, user.password);

      if (!validPassword) {
        // Track failed login attempt
        await trackLoginAttempt(ctx, user, false, 'Invalid password', 0);
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
      await trackLoginAttempt(ctx, user, true, null, sessionDuration);

      return {
        jwt,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: userRole,
          permissions: permissions,
        },
      };
    } catch (error) {
      // Ensure failed attempts are tracked even if not handled above
      if (!error.message.includes('Invalid identifier')) {
        await trackLoginAttempt(ctx, null, false, error.message, 0);
      }
      throw error;
    }
  };

  // Add logout tracking
  plugin.controllers.auth.logout = async (ctx) => {
    const user = ctx.state.user;
    
    if (user) {
      await trackActivity({
        user,
        activityType: 'logout',
        ctx,
        success: true,
        errorMessage: null
      });
    }

    ctx.send({ message: 'Logged out successfully' });
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

// Helper functions for activity tracking
async function trackLoginAttempt(ctx, user, success, errorMessage, sessionDuration) {
  try {
    const ipAddress = ctx.request.ip || 
                     ctx.request.headers['x-forwarded-for'] || 
                     ctx.request.headers['x-real-ip'] || 
                     ctx.request.connection.remoteAddress;
    
    const userAgent = ctx.request.headers['user-agent'];
    const sessionId = ctx.request.headers['x-session-id'] || generateSessionId();
    
    await strapi.documents('api::user-activity.user-activity').create({
      data: {
        user: user ? user.documentId : null,
        activityType: 'login',
        activityData: {
          endpoint: '/api/auth/local',
          method: 'POST',
          identifier: ctx.request.body.identifier,
          timestamp: new Date().toISOString()
        },
        ipAddress: anonymizeIP(ipAddress),
        userAgent,
        sessionId,
        sessionDuration,
        success,
        errorMessage,
        metadata: {
          loginAttempt: true,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    strapi.log.error('Failed to track login attempt:', error);
  }
}

async function trackActivity({ user, activityType, ctx, success, errorMessage }) {
  try {
    const ipAddress = ctx.request.ip || 
                     ctx.request.headers['x-forwarded-for'] || 
                     ctx.request.headers['x-real-ip'] || 
                     ctx.request.connection.remoteAddress;
    
    const userAgent = ctx.request.headers['user-agent'];
    const sessionId = ctx.request.headers['x-session-id'] || generateSessionId();
    
    await strapi.documents('api::user-activity.user-activity').create({
      data: {
        user: user.documentId,
        activityType,
        activityData: {
          endpoint: ctx.request.url,
          method: ctx.request.method,
          timestamp: new Date().toISOString()
        },
        ipAddress: anonymizeIP(ipAddress),
        userAgent,
        sessionId,
        success,
        errorMessage,
        metadata: {
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    strapi.log.error('Failed to track activity:', error);
  }
}

function generateSessionId() {
  return require('crypto').randomUUID();
}

function anonymizeIP(ipAddress) {
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
