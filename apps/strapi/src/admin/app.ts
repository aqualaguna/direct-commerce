export default {
  register(app: any) {
    // Register custom admin panel components and pages
    app.createSettingSection(
      {
        id: 'user-management',
        intlLabel: {
          id: 'user-management.settings.title',
          defaultMessage: 'User Management',
        },
      },
      [
        {
          intlLabel: {
            id: 'user-management.settings.roles.title',
            defaultMessage: 'Role Management',
          },
          id: 'role-management',
          to: 'user-management/roles',
          Component: () => import('./pages/RoleManagement'),
        },
        {
          intlLabel: {
            id: 'user-management.settings.users.title',
            defaultMessage: 'User Management',
          },
          id: 'user-management',
          to: 'user-management/users',
          Component: () => import('./pages/UserManagement'),
        },
      ]
    );
  },

  bootstrap(app: any) {
    // Bootstrap admin panel functionality
    // Note: injectContentManagerComponent is not available in current Strapi version
    // Using alternative approach for component injection
  },
};
