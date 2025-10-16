/**
 * Payment Controller
 * 
 * Handles payment API endpoints following Strapi 5+ Document Service API patterns
 */

import { Core } from '@strapi/strapi'
import { Context } from 'koa'

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async confirmPayment(ctx: Context) {
    try {
      const { paymentId } = ctx.params;
      const { data } = ctx.request.body;

      if (!paymentId) {
        return ctx.badRequest('Payment ID is required')
      }

      if (!data) {
        return ctx.badRequest('Data is required')
      }

      const paymentService = strapi.service('api::payment.payment');
      const result = await paymentService.confirmManualPayment(paymentId, data);

      return { data: result, meta: { message: 'Payment confirmed successfully' } }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return ctx.notFound(error.message)
      }
      if (error instanceof Error && error.message.includes('not pending')) {
        return ctx.badRequest(error.message)
      }
      strapi.log.error('Error in confirmPayment:', error)
      return ctx.internalServerError('Failed to confirm payment')
    }
  },
  async createPayment(ctx: Context) {
    try {
      const { user } = ctx.state;
      const { orderId } = ctx.params;
      const sessionId = ctx?.query?.sessionId || ctx?.request?.body?.sessionId;
      const { data } = ctx.request.body;

      if (!orderId) {
        return ctx.badRequest('Order ID is required')
      }

      if (!user && !sessionId) {
        return ctx.badRequest('User or session ID is required')
      }

      if (user && sessionId) {
        return ctx.badRequest('User and session ID cannot be provided together')
      }

      if (!data) {
        return ctx.badRequest('Data is required')
      }

      const isGuest = !user && (sessionId);

      const validationService = strapi.service('api::payment.validation');
      const {isValid, errors, data: validatedData} = await validationService.validateCreatePayment(orderId, user?.id || sessionId, data, isGuest);

      if (!isValid) {
        return ctx.badRequest('Validation failed', errors)
      }

      const paymentService = strapi.service('api::payment.payment');
      const payment = await paymentService.createPayment(orderId, user?.id || sessionId, validatedData, isGuest);

      return { data: payment, meta: { message: 'Payment created successfully' } }
    } catch (error) {
      console.log('error', error)
      strapi.log.error('Error in createPayment:', error)
      return ctx.internalServerError('Failed to create payment')
    }
  },
})