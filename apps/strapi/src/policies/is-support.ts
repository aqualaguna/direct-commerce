export default async (policyContext, config, { strapi }) => {
  const { user } = policyContext.state;

  if (!user) {
    return false;
  }

  // Check if user has support, manager, or admin role
  return ['admin', 'manager', 'support'].includes(user.role);
};
