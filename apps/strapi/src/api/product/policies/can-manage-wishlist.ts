/**
 * can-manage-wishlist policy
 */

export default async (
  policyContext: any,
  _config: any,
  { strapi: _strapi }: any
) => {
  const { user } = policyContext.state;
  const { id: _id } = policyContext.params;

  if (!user) {
    return false;
  }

  // Users can only manage their own wishlist
  // This policy is used for wishlist-related operations
  return true;
};
