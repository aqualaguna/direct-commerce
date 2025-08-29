/**
 * is-admin policy
 */

export default (policyContext, config, { strapi }) => {
  const { user } = policyContext.state;

  if (!user) {
    return false;
  }

  // Check if user has admin role
  const adminRole = user.role?.type === 'admin' || user.role?.name === 'Admin';

  if (!adminRole) {
    return false;
  }

  return true;
};
