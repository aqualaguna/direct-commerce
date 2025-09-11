/**
 * is-public policy for categories
 */

export default async (
  policyContext: any,
  _config: any,
  { strapi: _strapi }: any
) => {
  const { user } = policyContext.state;

  // If user is authenticated, allow access
  if (user) {
    return true;
  }

  // For unauthenticated users, only allow access to active categories
  const { query } = policyContext;

  // Ensure query object exists and has filters
  if (!query) {
    policyContext.query = { filters: {} };
  } else if (!query.filters) {
    query.filters = {};
  }

  // Only show active categories to public users
  policyContext.query.filters.isActive = true;

  return true;
};
 