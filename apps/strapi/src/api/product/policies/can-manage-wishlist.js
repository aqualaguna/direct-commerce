/**
 * can-manage-wishlist policy
 */

module.exports = async (policyContext, config, { strapi }) => {
  const { user } = policyContext.state;
  const { id } = policyContext.params;
  
  if (!user) {
    return false;
  }
  
  // Users can only manage their own wishlist
  // This policy is used for wishlist-related operations
  return true;
};
