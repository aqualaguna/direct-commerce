import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Permission Inheritance Service', () => {
  let permissionInheritanceService: any;

  beforeEach(() => {
    // Import the service
    const serviceModule = require('./permission-inheritance').default;
    permissionInheritanceService = serviceModule;
  });

  describe('getRolePermissions', () => {
    it('should return admin permissions with wildcard', async () => {
      const permissions = await permissionInheritanceService.getRolePermissions('admin');
      expect(permissions).toContain('*');
    });

    it('should return customer base permissions', async () => {
      const permissions = await permissionInheritanceService.getRolePermissions('customer');
      expect(permissions).toContain('product.read');
      expect(permissions).toContain('order.create');
      expect(permissions).toContain('address.create');
      expect(permissions).not.toContain('product.create');
      expect(permissions).not.toContain('user.delete');
    });

    it('should return manager permissions with inheritance', async () => {
      const permissions = await permissionInheritanceService.getRolePermissions('manager');
      expect(permissions).toContain('product.create');
      expect(permissions).toContain('product.update');
      expect(permissions).toContain('order.read'); // Inherited from support
      expect(permissions).toContain('user.read'); // Inherited from support
      expect(permissions).toContain('product.read'); // Inherited from moderator
    });

    it('should return support permissions with customer inheritance', async () => {
      const permissions = await permissionInheritanceService.getRolePermissions('support');
      expect(permissions).toContain('product.read'); // Own permission
      expect(permissions).toContain('order.create'); // Inherited from customer
      expect(permissions).toContain('address.create'); // Inherited from customer
      expect(permissions).not.toContain('product.create');
    });

    it('should return moderator permissions with customer inheritance', async () => {
      const permissions = await permissionInheritanceService.getRolePermissions('moderator');
      expect(permissions).toContain('product.update'); // Own permission
      expect(permissions).toContain('user.update'); // Own permission
      expect(permissions).toContain('order.create'); // Inherited from customer
      expect(permissions).toContain('address.create'); // Inherited from customer
    });
  });

  describe('canAssignRole', () => {
    it('should allow admin to assign any role', () => {
      expect(permissionInheritanceService.canAssignRole('admin', 'customer')).toBe(true);
      expect(permissionInheritanceService.canAssignRole('admin', 'manager')).toBe(true);
      expect(permissionInheritanceService.canAssignRole('admin', 'support')).toBe(true);
      expect(permissionInheritanceService.canAssignRole('admin', 'moderator')).toBe(true);
      expect(permissionInheritanceService.canAssignRole('admin', 'admin')).toBe(true);
    });

    it('should allow manager to assign support and moderator roles', () => {
      expect(permissionInheritanceService.canAssignRole('manager', 'support')).toBe(true);
      expect(permissionInheritanceService.canAssignRole('manager', 'moderator')).toBe(true);
      expect(permissionInheritanceService.canAssignRole('manager', 'customer')).toBe(true);
      expect(permissionInheritanceService.canAssignRole('manager', 'admin')).toBe(false);
    });

    it('should not allow support to assign roles', () => {
      expect(permissionInheritanceService.canAssignRole('support', 'customer')).toBe(false);
      expect(permissionInheritanceService.canAssignRole('support', 'moderator')).toBe(false);
    });

    it('should not allow customer to assign roles', () => {
      expect(permissionInheritanceService.canAssignRole('customer', 'support')).toBe(false);
    });
  });

  describe('canRevokeRole', () => {
    it('should only allow admin to revoke roles', () => {
      expect(permissionInheritanceService.canRevokeRole('admin', 'customer')).toBe(true);
      expect(permissionInheritanceService.canRevokeRole('admin', 'manager')).toBe(true);
      expect(permissionInheritanceService.canRevokeRole('manager', 'support')).toBe(false);
      expect(permissionInheritanceService.canRevokeRole('support', 'customer')).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should return true for admin with any permission', async () => {
      expect(await permissionInheritanceService.hasPermission('admin', 'product.create')).toBe(true);
      expect(await permissionInheritanceService.hasPermission('admin', 'user.delete')).toBe(true);
      expect(await permissionInheritanceService.hasPermission('admin', 'any.permission')).toBe(true);
    });

    it('should return true for customer with customer permissions', async () => {
      expect(await permissionInheritanceService.hasPermission('customer', 'product.read')).toBe(true);
      expect(await permissionInheritanceService.hasPermission('customer', 'order.create')).toBe(true);
      expect(await permissionInheritanceService.hasPermission('customer', 'product.create')).toBe(false);
    });

    it('should return true for manager with inherited permissions', async () => {
      expect(await permissionInheritanceService.hasPermission('manager', 'product.create')).toBe(true);
      expect(await permissionInheritanceService.hasPermission('manager', 'order.read')).toBe(true); // From support
      expect(await permissionInheritanceService.hasPermission('manager', 'user.update')).toBe(true); // From moderator
      expect(await permissionInheritanceService.hasPermission('manager', 'order.create')).toBe(true); // From customer
    });
  });

  describe('validateRoleAssignment', () => {
    it('should validate successful role assignment', () => {
      const result = permissionInheritanceService.validateRoleAssignment('admin', 'manager', 'customer');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid role assignment', () => {
      const result = permissionInheritanceService.validateRoleAssignment('manager', 'admin', 'customer');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Role manager cannot assign role admin');
    });

    it('should reject admin role assignment by non-admin', () => {
      const result = permissionInheritanceService.validateRoleAssignment('manager', 'admin', 'customer');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Only admin users can assign admin role');
    });
  });

  describe('resolvePermissionConflict', () => {
    it('should resolve permission conflicts correctly', () => {
      const permissions = ['product.read', 'product.create', '!product.create', 'order.read'];
      const resolved = permissionInheritanceService.resolvePermissionConflict(permissions);
      expect(resolved).toContain('product.read');
      expect(resolved).toContain('order.read');
      expect(resolved).not.toContain('product.create');
    });

    it('should handle deny permissions', () => {
      const permissions = ['product.*', '!product.delete'];
      const resolved = permissionInheritanceService.resolvePermissionConflict(permissions);
      expect(resolved).toContain('product.*');
      expect(resolved).not.toContain('product.delete');
    });
  });

  describe('getEffectivePermissions', () => {
    it('should return effective permissions for manager', async () => {
      const result = await permissionInheritanceService.getEffectivePermissions('manager');
      expect(result.permissions).toContain('product.create');
      expect(result.permissions).toContain('order.read'); // Inherited
      expect(result.inheritedFrom).toContain('support');
      expect(result.inheritedFrom).toContain('moderator');
    });

    it('should return effective permissions for support', async () => {
      const result = await permissionInheritanceService.getEffectivePermissions('support');
      expect(result.permissions).toContain('product.read');
      expect(result.permissions).toContain('order.create'); // Inherited from customer
      expect(result.inheritedFrom).toContain('customer');
    });
  });
});
