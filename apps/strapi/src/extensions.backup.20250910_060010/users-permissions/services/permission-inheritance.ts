export default {
  // Role hierarchy definition
  roleHierarchy: {
    admin: ['admin', 'manager', 'support', 'moderator', 'customer'],
    manager: ['manager', 'support', 'moderator', 'customer'],
    support: ['support', 'customer'],
    moderator: ['moderator', 'customer'],
    customer: ['customer'],
  },

  // Permission inheritance rules
  permissionInheritance: {
    // Admin inherits all permissions
    admin: {
      inherits: [],
      grants: ['*'],
    },
    // Manager inherits from support and moderator
    manager: {
      inherits: ['support', 'moderator'],
      grants: [
        'product.create',
        'product.update',
        'category.create',
        'category.update',
        'order.update',
        'user.read',
        'user.update',
        'inventory.create',
        'inventory.update',
        'stock-reservation.create',
        'stock-reservation.update',
      ],
    },
    // Support inherits from customer
    support: {
      inherits: ['customer'],
      grants: [
        'product.read',
        'category.read',
        'order.read',
        'order.update',
        'user.read',
        'address.read',
        'inventory.read',
        'stock-reservation.read',
        'user-preference.read',
        'privacy-setting.read',
      ],
    },
    // Moderator inherits from customer
    moderator: {
      inherits: ['customer'],
      grants: [
        'product.read',
        'product.update',
        'category.read',
        'order.read',
        'order.update',
        'user.read',
        'user.update',
        'address.read',
        'inventory.read',
        'stock-reservation.read',
        'user-preference.read',
        'privacy-setting.read',
      ],
    },
    // Customer has base permissions
    customer: {
      inherits: [],
      grants: [
        'product.read',
        'category.read',
        'order.create',
        'order.read',
        'address.create',
        'address.read',
        'address.update',
        'address.delete',
        'user-preference.create',
        'user-preference.read',
        'user-preference.update',
        'privacy-setting.create',
        'privacy-setting.read',
        'privacy-setting.update',
      ],
    },
  },

  // Get all permissions for a role including inherited ones
  async getRolePermissions(role: string): Promise<string[]> {
    const roleConfig = this.permissionInheritance[role];
    if (!roleConfig) {
      return this.permissionInheritance.customer.grants;
    }

    const permissions = new Set(roleConfig.grants);

    // Add inherited permissions
    for (const inheritedRole of roleConfig.inherits) {
      const inheritedPermissions = await this.getRolePermissions(inheritedRole);
      inheritedPermissions.forEach(permission => permissions.add(permission));
    }

    return Array.from(permissions) as string[];
  },

  // Check if a role can assign another role
  canAssignRole(assignerRole: string, targetRole: string): boolean {
    const hierarchy = this.roleHierarchy[assignerRole];
    if (!hierarchy) return false;

    // Only admin and manager can assign roles
    if (!['admin', 'manager'].includes(assignerRole)) {
      return false;
    }

    return hierarchy.includes(targetRole);
  },

  // Check if a role can revoke another role
  canRevokeRole(revokerRole: string, targetRole: string): boolean {
    // Only admins can revoke roles
    return revokerRole === 'admin';
  },

  // Resolve permission conflicts (most restrictive wins)
  resolvePermissionConflict(permissions: string[]): string[] {
    const resolvedPermissions = new Set<string>();
    const deniedPermissions = new Set<string>();

    for (const permission of permissions) {
      if (permission.startsWith('!')) {
        // Deny permission
        const cleanPermission = permission.substring(1);
        deniedPermissions.add(cleanPermission);
        resolvedPermissions.delete(cleanPermission);
      } else {
        // Allow permission (unless explicitly denied)
        if (!deniedPermissions.has(permission)) {
          resolvedPermissions.add(permission);
        }
      }
    }

    return Array.from(resolvedPermissions);
  },

  // Get role hierarchy for a specific role
  getRoleHierarchyForRole(role: string): string[] {
    return this.roleHierarchy[role] || [role];
  },

  // Check if user has permission considering inheritance
  async hasPermission(userRole: string, requiredPermission: string): Promise<boolean> {
    const userPermissions = await this.getRolePermissions(userRole);
    
    // Check for wildcard permission
    if (userPermissions.includes('*')) {
      return true;
    }

    // Check for exact permission match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check for resource-level permissions (e.g., 'product.*' for 'product.create')
    const resourcePermission = requiredPermission.split('.')[0] + '.*';
    if (userPermissions.includes(resourcePermission)) {
      return true;
    }

    return false;
  },

  // Get effective permissions for a user
  async getEffectivePermissions(userRole: string): Promise<{
    permissions: string[];
    inheritedFrom: string[];
    conflicts: string[];
  }> {
    const permissions = await this.getRolePermissions(userRole);
    const roleConfig = this.permissionInheritance[userRole];
    
    return {
      permissions,
      inheritedFrom: roleConfig?.inherits || [],
      conflicts: [], // Conflicts would be detected during permission resolution
    };
  },

  // Validate role assignment considering hierarchy
  validateRoleAssignment(assignerRole: string, targetRole: string, currentUserRole: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check if assigner can assign the target role
    if (!this.canAssignRole(assignerRole, targetRole)) {
      errors.push(`Role ${assignerRole} cannot assign role ${targetRole}`);
    }

    // Check if target role is not higher in hierarchy than assigner
    const assignerHierarchy = this.getRoleHierarchyForRole(assignerRole);
    const targetHierarchy = this.getRoleHierarchyForRole(targetRole);
    
    if (targetHierarchy.length > assignerHierarchy.length) {
      errors.push(`Cannot assign role ${targetRole} as it is higher in hierarchy than ${assignerRole}`);
    }

    // Check if trying to assign admin role (only super admin can do this)
    if (targetRole === 'admin' && assignerRole !== 'admin') {
      errors.push('Only admin users can assign admin role');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Get permission matrix for all roles
  async getPermissionMatrix(): Promise<{
    [role: string]: {
      permissions: string[];
      inheritedFrom: string[];
      canAssign: string[];
      canRevoke: string[];
    };
  }> {
    const matrix: any = {};

    for (const role of Object.keys(this.permissionInheritance)) {
      const permissions = await this.getRolePermissions(role);
      const roleConfig = this.permissionInheritance[role];
      const canAssign = Object.keys(this.roleHierarchy).filter(targetRole => 
        this.canAssignRole(role, targetRole)
      );
      const canRevoke = Object.keys(this.roleHierarchy).filter(targetRole => 
        this.canRevokeRole(role, targetRole)
      );

      matrix[role] = {
        permissions,
        inheritedFrom: roleConfig?.inherits || [],
        canAssign,
        canRevoke,
      };
    }

    return matrix;
  },
};
