export default {
  routes: [
    {
      method: 'POST',
      path: '/role-management/assign',
      handler: 'role-management.assignRole',
      config: {
        policies: ['global::is-admin'],
        description: 'Assign a role to a user',
        tag: {
          plugin: 'users-permissions',
          name: 'Role Management',
          actionType: 'create',
        },
      },
    },
    {
      method: 'POST',
      path: '/role-management/revoke',
      handler: 'role-management.revokeRole',
      config: {
        policies: ['global::is-admin'],
        description: 'Revoke a role from a user',
        tag: {
          plugin: 'users-permissions',
          name: 'Role Management',
          actionType: 'delete',
        },
      },
    },
    {
      method: 'GET',
      path: '/role-management/hierarchy',
      handler: 'role-management.getRoleHierarchy',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Get role hierarchy',
        tag: {
          plugin: 'users-permissions',
          name: 'Role Management',
          actionType: 'read',
        },
      },
    },
    {
      method: 'POST',
      path: '/role-management/check-permission',
      handler: 'role-management.checkPermission',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Check if user has a specific permission',
        tag: {
          plugin: 'users-permissions',
          name: 'Role Management',
          actionType: 'read',
        },
      },
    },
    {
      method: 'GET',
      path: '/role-management/permissions',
      handler: 'role-management.getUserPermissions',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Get current user permissions',
        tag: {
          plugin: 'users-permissions',
          name: 'Role Management',
          actionType: 'read',
        },
      },
    },
  ],
};
