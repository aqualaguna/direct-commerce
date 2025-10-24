/**
 * Payment Controller
 * 
 * Handles payment API endpoints following Strapi 5+ Document Service API patterns
 */

import { Core } from '@strapi/strapi'
import { Context } from 'koa'
import { UserType } from '../../../../config/constant';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async confirmPayment(ctx: Context) {
    try {
      const { paymentId } = ctx.params;
      const { data } = ctx.request.body;
      const { user, userType } = ctx.state;

      if (!paymentId) {
        return ctx.badRequest('Payment ID is required')
      }

      if (!data) {
        return ctx.badRequest('Data is required')
      }

      const paymentService = strapi.service('api::payment.payment');
      const result = await paymentService.confirmManualPayment(paymentId, data, userType, user?.id || 'api_token');

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
      const { user, userType } = ctx.state;
      const { orderId } = ctx.params;
      const sessionId = ctx?.query?.sessionId || ctx?.request?.body?.sessionId;
      const { data } = ctx.request.body;

      if (!orderId) {
        return ctx.badRequest('Order ID is required')
      }

      if (!data) {
        return ctx.badRequest('Data is required')
      }

      const validationService = strapi.service('api::payment.validation');
      const userId = userType === UserType.AUTHENTICATED ? user.id : sessionId;
      const {isValid, errors, data: validatedData} = await validationService.validateCreatePayment(orderId, userId, data, userType === UserType.GUEST);

      if (!isValid) {
        return ctx.badRequest('Validation failed', errors)
      }

      const paymentService = strapi.service('api::payment.payment');
      const payment = await paymentService.createPayment(orderId, userId, validatedData, userType === UserType.GUEST);

      return { data: payment, meta: { message: 'Payment created successfully' } }
    } catch (error) {
      strapi.log.error('Error in createPayment:', error)
      return ctx.internalServerError('Failed to create payment')
    }
  },
})