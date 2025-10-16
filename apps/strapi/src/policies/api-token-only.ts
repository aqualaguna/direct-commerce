
import { UserType } from "../../config/constant";

export default async (policyContext, config, { strapi }) => {
  policyContext.state.userType = UserType.API_TOKEN;

  const { auth } = policyContext.state;
  
  // Allow valid API token requests (these are admin by default)
  if (auth?.strategy?.name === 'api-token' && auth.credentials?.id) {
    return true;
  }
  return false;
};
