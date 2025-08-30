export default async (policyContext, config, { strapi }) => {
  const { user } = policyContext.state;

  if (!user) {
    return false;
  }

  // Check if user has moderator, manager, or admin role
  return ['admin', 'manager', 'moderator'].includes(user.role);
};
