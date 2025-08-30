export default async (policyContext, config, { strapi }) => {
  const { user } = policyContext.state;
  const { permission } = config;

  if (!user) {
    return false;
  }

  if (!permission) {
    strapi.log.warn('has-permission policy called without permission config');
    return false;
  }

  // Use permission inheritance service instead of hardcoded arrays
  const permissionInheritanceService = strapi
    .plugin('users-permissions')
    .service('permissionInheritance');

  return await permissionInheritanceService.hasPermission(user.role, permission);
};
