export default {
  async assignRole(ctx) {
    try {
      const { userId, role } = ctx.request.body;
      const assignedBy = ctx.state.user.id;

      if (!userId || !role) {
        return ctx.badRequest('User ID and role are required');
      }

      // Validate role
      const validRoles = ['customer', 'admin', 'manager', 'support', 'moderator'];
      if (!validRoles.includes(role)) {
        return ctx.badRequest('Invalid role');
      }

      // Use the role assignment service
      const roleAssignmentService = strapi
        .plugin('users-permissions')
        .service('roleAssignment');

      const updatedUser = await roleAssignmentService.assignRole(
        userId,
        role,
        assignedBy
      );

      return {
        success: true,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
          roleAssignedAt: updatedUser.roleAssignedAt,
        },
      };
    } catch (error) {
      strapi.log.error('Error assigning role:', error);
      return ctx.internalServerError('Failed to assign role');
    }
  },

  async revokeRole(ctx) {
    try {
      const { userId } = ctx.request.body;
      const revokedBy = ctx.state.user.id;

      if (!userId) {
        return ctx.badRequest('User ID is required');
      }

      // Use the role assignment service
      const roleAssignmentService = strapi
        .plugin('users-permissions')
        .service('roleAssignment');

      const updatedUser = await roleAssignmentService.revokeRole(
        userId,
        revokedBy
      );

      return {
        success: true,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
          roleAssignedAt: updatedUser.roleAssignedAt,
        },
      };
    } catch (error) {
      strapi.log.error('Error revoking role:', error);
      return ctx.internalServerError('Failed to revoke role');
    }
  },

  async getRoleHierarchy(ctx) {
    try {
      const roleAssignmentService = strapi
        .plugin('users-permissions')
        .service('roleAssignment');

      const hierarchy = await roleAssignmentService.getRoleHierarchy();

      return {
        success: true,
        hierarchy,
      };
    } catch (error) {
      strapi.log.error('Error getting role hierarchy:', error);
      return ctx.internalServerError('Failed to get role hierarchy');
    }
  },

  async checkPermission(ctx) {
    try {
      const { permission } = ctx.request.body;
      const userRole = ctx.state.user.role;

      if (!permission) {
        return ctx.badRequest('Permission is required');
      }

      const roleAssignmentService = strapi
        .plugin('users-permissions')
        .service('roleAssignment');

      const hasPermission = await roleAssignmentService.checkPermission(
        userRole,
        permission
      );

      return {
        success: true,
        hasPermission,
        userRole,
        permission,
      };
    } catch (error) {
      strapi.log.error('Error checking permission:', error);
      return ctx.internalServerError('Failed to check permission');
    }
  },

  async getUserPermissions(ctx) {
    try {
      const userRole = ctx.state.user.role;

      // Use permission inheritance service instead of hardcoded arrays
      const permissionInheritanceService = strapi
        .plugin('users-permissions')
        .service('permissionInheritance');

      const permissions = await permissionInheritanceService.getRolePermissions(userRole);

      return {
        success: true,
        userRole,
        permissions,
      };
    } catch (error) {
      strapi.log.error('Error getting user permissions:', error);
      return ctx.internalServerError('Failed to get user permissions');
    }
  },
};
