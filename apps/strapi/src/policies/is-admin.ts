export default (policyContext, config, { strapi }) => {
  if (
    policyContext.state.user &&
    policyContext.state.user.role.type === 'admin'
  ) {
    return true;
  }

  return false;
};
