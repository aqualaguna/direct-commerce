export default (policyContext, config, { strapi }) => {
  const { user } = policyContext.state;
  const { id } = policyContext.params;

  if (!user) {
    return false;
  }

  // Admin can access everything
  if (user.role.type === 'admin') {
    return true;
  }

  // Check if the user owns the resource
  if (id && user.id === parseInt(id)) {
    return true;
  }

  return false;
};
