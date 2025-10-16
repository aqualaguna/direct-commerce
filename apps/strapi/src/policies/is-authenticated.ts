import { UserType } from "../../config/constant";

export default (policyContext, config, { strapi }) => {
  // inject user type to policy context
  policyContext.state.userType = UserType.PUBLIC;
  const { user, auth } = policyContext.state;
  const sessionId = policyContext?.request?.query?.sessionId || policyContext?.request?.body?.sessionId;
  
  if (sessionId) {
    policyContext.state.userType = UserType.GUEST;
    return true;
  }

  // Allow valid API token requests
  if (auth?.strategy?.name === 'api-token' && auth.credentials?.id) {
    policyContext.state.userType = UserType.API_TOKEN;
    return true;
  }

  if (user) {
    policyContext.state.userType = UserType.AUTHENTICATED;
    return true;
  }

  return false;
};
