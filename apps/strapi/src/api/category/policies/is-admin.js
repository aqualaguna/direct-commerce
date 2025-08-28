/**
 * is-admin policy for categories
 */

module.exports = async (policyContext, _config, { strapi: _strapi }) => {
  const { user } = policyContext.state;

  if (!user) {
    return false;
  }

  // Check if user has admin role
  return user.role && user.role.type === 'admin';
};
