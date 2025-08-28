/**
 * is-owner policy for addresses
 */

module.exports = async (policyContext, config, { strapi }) => {
  const { user } = policyContext.state;
  const { id } = policyContext.params;
  
  if (!user) {
    return false;
  }
  
  // Admin users can manage all addresses
  if (user.role && user.role.type === 'admin') {
    return true;
  }
  
  // For specific address operations, check if user owns the address
  if (id) {
    const address = await strapi.entityService.findOne('api::address.address', id, {
      populate: ['user']
    });
    
    if (!address) {
      return false;
    }
    
    // Check if the address belongs to the current user
    return address.user && address.user.id === user.id;
  }
  
  // For list operations, filter to only show user's own addresses
  const { query } = policyContext;
  if (!query.filters) {
    query.filters = {};
  }
  query.filters.user = user.id;
  
  return true;
};
