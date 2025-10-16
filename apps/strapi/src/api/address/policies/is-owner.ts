/**
 * is-owner policy for addresses
 */

import { UserType } from "../../../../config/constant";

export default async (policyContext: any, config: any, { strapi }: any) => {
  policyContext.state.userType = UserType.PUBLIC;

  const { user, auth } = policyContext.state;
  const sessionId = policyContext?.request?.query?.sessionId || policyContext?.request?.body?.sessionId;
  const documentId = policyContext.params.id || policyContext.params.documentId;
  // Allow valid API token requests
  if (auth?.strategy?.name === 'api-token' && auth.credentials?.id) {
    policyContext.state.userType = UserType.API_TOKEN;
    return true;
  }
  // allow guest user
  if (sessionId) {
    policyContext.state.userType = UserType.GUEST;
    return true;
  }
  
  if (!user) {
    return false;
  } else {
    policyContext.state.userType = UserType.AUTHENTICATED;
  }

  // Admin users can manage all addresses
  if (user.role && user.role.type === 'admin') {
    policyContext.state.userType = UserType.ADMIN;
    return true;
  }

  // For specific address operations, check if user owns the address
  if (documentId) {
    const address = await strapi.documents('api::address.address').findOne({
      documentId,
      populate: ['user'],
    });

    if (!address) {
      return false;
    }

    // Check if the address belongs to the current user
    return address.user && address.user.id === user.id;
  }

  // For list operations, filter to only show user's own addresses
  if (!policyContext.query) {
    policyContext.query = {};
  }
  const { query } = policyContext;
  if (!query.filters) {
    query.filters = {};
  }
  query.filters.user = user.id;
  return true;
};
