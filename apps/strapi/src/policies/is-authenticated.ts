export default (policyContext, config, { strapi }) => {
  const { user, auth } = policyContext.state;
  
  // Allow valid API token requests
  if (auth?.strategy?.name === 'api-token' && auth.credentials?.id) {
    return true;
  }

  if (user) {
    return true;
  }

  return false;
};
