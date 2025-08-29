/**
 * is-admin policy
 */

export default async (
  policyContext: any,
  _config: any,
  { strapi: _strapi }: any
) => {
  const { user } = policyContext.state;

  if (!user) {
    return false;
  }

  // Check if user has admin role
  return !!(user.role && user.role.type === 'admin');
};
