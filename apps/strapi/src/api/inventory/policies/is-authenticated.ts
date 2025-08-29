/**
 * is-authenticated policy
 */

export default (policyContext, config, { strapi }) => {
  const { user } = policyContext.state;

  if (!user) {
    return false;
  }

  return true;
};
