import { Core } from "@strapi/strapi"
import type { Context } from "koa"

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async create(ctx:Context) {
    try {
      const { user } = ctx.state;
      const sessionId = ctx?.query?.sessionId || ctx?.request?.body?.sessionId;
      
      // Check that we have at least one authentication method but not both
      const isUser = !!user;
      const isGuest = !!sessionId;
      
      if (!isUser && !isGuest) {
        return ctx.unauthorized('Authentication required - provide either user authentication or session ID');
      }
      
      if (isUser && isGuest) {
        return ctx.unauthorized('Ambiguous request - provide either user authentication or session ID, not both');
      }
      const validationService = strapi.service('api::checkout.validation');
      const result = validationService.validateCheckoutData(ctx.request.body, isGuest ? sessionId : user.id, isGuest);
      if (!result.isValid) {
        return ctx.badRequest('Checkout data validation failed', result.errors);
      }
      const checkoutSession = await strapi.documents('api::checkout.checkout-session').create({
        data: result.data
      })
      return {
        data: checkoutSession,
        meta: {
          message: 'Checkout session created successfully'
        }
      }
    } catch (error) {
      strapi.log.error('Error creating checkout session:', error)
      return ctx.internalServerError('Failed to create checkout session')
    }
  }
})
