/**
 * is-admin policy for categories
 */

import { Core } from "@strapi/strapi";

export default async (
  policyContext: any,
  _config: any,
  { strapi }: { strapi: Core.Strapi }
) => {
  const { user, auth } = policyContext.state;

  // Allow valid API token requests
  if (auth?.strategy?.name === 'api-token' && auth.credentials?.id) {
    return true;
  }

  // Allow admin users
  return user?.role?.type === 'admin';
};
