/**
 * is-public policy
 */

module.exports = async (policyContext, config, { strapi }) => {
  // Allow public access to published products
  const { user } = policyContext.state;
  
  // If user is authenticated, allow access
  if (user) {
    return true;
  }
  
  // For unauthenticated users, only allow access to published products
  const { query } = policyContext;
  
  // Add filter to only show published products for public access
  if (!query.filters) {
    query.filters = {};
  }
  
  // Only show published products to public users
  query.filters.publishedAt = { $notNull: true };
  
  return true;
};
