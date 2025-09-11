/**
 * is-public policy
 */

export default async (
  policyContext: any,
  _config: any,
  { strapi: _strapi }: any
) => {
  // Allow public access to active products
  const { user } = policyContext.state;

  // If user is authenticated, allow access
  if (user) {
    return true;
  }

  // For unauthenticated users, only allow access to active products
  const { query } = policyContext;

  // Add filter to only show active products for public access
  if (query && !query.filters) {
    query.filters = {};
  }

  // Only show active products to public users
  if (query) {
    query.filters.status = 'active';
  }

  return true;
};
