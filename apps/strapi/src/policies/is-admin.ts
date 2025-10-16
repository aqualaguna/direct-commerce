import { UserType } from "../../config/constant";

export default async (policyContext, config, { strapi }) => {
  policyContext.state.userType = UserType.PUBLIC;

  const { user, auth } = policyContext.state;
  
  // Allow valid API token requests (these are admin by default)
  if (auth?.strategy?.name === 'api-token' && auth.credentials?.id) {
    policyContext.state.userType = UserType.API_TOKEN;
    return true;
  }
  if (user) {
    policyContext.state.userType = UserType.AUTHENTICATED;
  }
  // Allow users-permissions admin users
  const isAdmin = user?.role === 'admin' || user?.role?.type === 'admin';
  
  return isAdmin;
};
