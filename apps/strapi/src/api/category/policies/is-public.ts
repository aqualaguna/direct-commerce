/**
 * is-public policy for categories
 */

export default async (policyContext: any, _config: any, { strapi: _strapi }: any) => {
  const { user } = policyContext.state;

  // If user is authenticated, allow access
  if (user) {
    return true;
  }

  // For unauthenticated users, only allow access to active categories
  const { query } = policyContext;

  // Add filter to only show active categories for public access
  if (!query.filters) {
    query.filters = {};
  }

  // Only show active categories to public users
  query.filters.isActive = true;
  query.filters.publishedAt = { $notNull: true };

  return true;
};
