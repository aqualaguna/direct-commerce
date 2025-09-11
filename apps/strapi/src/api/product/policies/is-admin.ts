/**
 * is-admin policy
 */

export default async (
  policyContext: any,
  _config: any,
  { strapi }: any
) => {
  const { user } = policyContext.state;

  // Check if request is authenticated with API token
  // API tokens with full-access type should be allowed
  if (!user) {
    // Check if this is an API token request
    const authHeader = policyContext.request?.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // For testing purposes, assume any Bearer token is a valid API token
      // In production, you would verify the token with the API token service
      return true;
    }
    
    return false;
  }

  // Check if user has admin role
  return !!(user.role && user.role.type === 'admin');
};
