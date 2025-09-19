export default async (policyContext, config, { strapi }) => {
  const { user, auth } = policyContext.state;
  
  // Allow valid API token requests
  if (auth?.strategy?.name === 'api-token' && auth.credentials?.id) {
    return true;
  }

  // Allow users-permissions admin users
  const isAdmin = user?.role === 'admin' || user?.role?.type === 'admin';
  return isAdmin;
};
