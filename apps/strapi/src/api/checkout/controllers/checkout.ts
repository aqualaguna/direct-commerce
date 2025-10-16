import { Core } from "@strapi/strapi"
import type { Context } from "koa"


export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async create(ctx:Context) {
    try {
      const { user } = ctx.state;
      const sessionId = ctx?.query?.sessionId || ctx?.request?.body?.sessionId;
      
      const checkoutService = strapi.service('api::checkout.checkout');
      const auth = await checkoutService.validateAuthentication(user, sessionId);
      
      const checkout = await checkoutService.createCheckout(
        ctx.request.body, 
        auth.userId, 
        auth.isGuest
      );
      
      return {
        data: checkout,
        meta: {
          message: 'Checkout created successfully'
        }
      }
    } catch (error) {
      strapi.log.error('Error creating checkout:', error)
      if (error.message.includes('Authentication required') || error.message.includes('Ambiguous request')) {
        return ctx.unauthorized(error.message);
      }
      if (error.message.includes('validation failed')) {
        return ctx.badRequest(error.message);
      }
      return ctx.internalServerError('Failed to create checkout')
    }
  },
  async validateCheckout(ctx:Context) {
    try {
      const { user } = ctx.state;
      const sessionId = ctx?.query?.sessionId || ctx?.request?.body?.sessionId;
      const documentId = ctx.params?.documentId || ctx.params?.id;
      
      if (!documentId) {
        return ctx.badRequest('Checkout documentId is required');
      }
      
      const checkoutService = strapi.service('api::checkout.checkout');
      const auth = await checkoutService.validateAuthentication(user, sessionId);
      
      const checkout = await checkoutService.getCheckout(documentId, {}, auth);
      await checkoutService.validateCheckoutStatus(checkout, ['active']);
      
      const checkoutUpdated = await checkoutService.updateCheckout(
        documentId,
        ctx.request.body,
        auth.userId,
        auth.isGuest
      );
      
      return {
        data: checkoutUpdated,
        meta: {
          message: 'Checkout validated successfully'
        }
      }
    } catch (error) {
      strapi.log.error('Error validating checkout:', error)
      if (error.message.includes('Authentication required') || error.message.includes('Ambiguous request')) {
        return ctx.unauthorized(error.message);
      }
      if (error.message.includes('not found')) {
        return ctx.notFound(error.message);
      }
      if (error.message.includes('not active') || error.message.includes('validation failed')) {
        return ctx.badRequest(error.message);
      }
      return ctx.internalServerError('Failed to validate checkout')
    }
  },
  async completeCheckout(ctx:Context) {
    try {
      const { user } = ctx.state;
      const sessionId = ctx?.query?.sessionId || ctx?.request?.body?.sessionId;
      const documentId = ctx.params?.documentId || ctx.params?.id;
      
      if (!documentId) {
        return ctx.badRequest('Checkout documentId is required');
      }
      
      const checkoutService = strapi.service('api::checkout.checkout');
      const auth = await checkoutService.validateAuthentication(user, sessionId);
      
      const checkout = await checkoutService.getCheckout(documentId, {
        shippingAddress: true,
        billingAddress: true,
      }, auth);
      
      await checkoutService.validateCheckoutStatus(checkout, ['active'], true);
      
      const order = await checkoutService.completeCheckoutProcess(
        checkout, 
        auth.isUser ? auth.userId : null
      );
      
      return {
        data: order,
        meta: { message: 'Checkout completed successfully' }
      }
    } catch (error) {
      console.log('Error completing checkout:', error)
      strapi.log.error('Error completing checkout:', error)
      if (error.message.includes('Authentication required') || error.message.includes('Ambiguous request')) {
        return ctx.unauthorized(error.message);
      }
      if (error.message.includes('not found')) {
        return ctx.notFound(error.message);
      }
      if (error.message.includes('not active') || error.message.includes('expired')) {
        return ctx.badRequest(error.message);
      }
      return ctx.internalServerError('Failed to proceed to payment')
    }
  },
  async abandonCheckout(ctx:Context) {
    try {
      const { user } = ctx.state;
      const sessionId = ctx?.query?.sessionId || ctx?.request?.body?.sessionId;
      const documentId = ctx.params?.documentId || ctx.params?.id;
      
      if (!documentId) {
        return ctx.badRequest('Checkout documentId is required');
      }
      
      const checkoutService = strapi.service('api::checkout.checkout');
      const auth = await checkoutService.validateAuthentication(user, sessionId);
      
      const checkout = await checkoutService.getCheckout(documentId, {}, auth);
      await checkoutService.validateCheckoutStatus(checkout, ['active', 'locked']);
      
      const abandonedCheckout = await checkoutService.updateCheckoutStatus(
        documentId, 
        'abandoned'
      );
      
      return {
        data: abandonedCheckout,
        meta: { message: 'Checkout abandoned successfully' }
      }
    } catch (error) {
      strapi.log.error('Error abandoning checkout:', error)
      if (error.message.includes('Authentication required') || error.message.includes('Ambiguous request')) {
        return ctx.unauthorized(error.message);
      }
      if (error.message.includes('not found')) {
        return ctx.notFound(error.message);
      }
      if (error.message.includes('is not active or locked')) {
        return ctx.badRequest(error.message);
      }
      return ctx.internalServerError('Failed to abandon checkout')
    }
  }
})
