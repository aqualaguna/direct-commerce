/**
 * is-admin policy
 */

export default async (
  policyContext: any,
  _config: any,
  { strapi }: any
) => {
  const { user, auth } = policyContext.state;

  // Allow valid API token requests
  if (auth?.strategy?.name === 'api-token' && auth.credentials?.id) {
    return true;
  }

  // Allow admin users
  return user?.role === 'admin' || user?.role?.type === 'admin';
};
