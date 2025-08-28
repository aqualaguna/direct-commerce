/**
 * is-owner policy
 */

module.exports = async (policyContext, config, { strapi }) => {
  const { user } = policyContext.state;
  const { id } = policyContext.params;
  
  if (!user) {
    return false;
  }
  
  // Admin users can manage all products
  if (user.role && user.role.type === 'admin') {
    return true;
  }
  
  // For now, only allow admin users to manage products
  // In the future, this could be extended to allow sellers to manage their own products
  return user.role && user.role.type === 'admin';
};
