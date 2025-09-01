/**
 * Basic Payment Method Controller
 * 
 * Handles basic payment method API endpoints following Strapi 5+ Document Service API patterns
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::basic-payment-method.basic-payment-method', ({ strapi }) => ({
  /**
   * Get active payment methods
   */
  async getActive(ctx) {
    try {
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      const paymentMethodService = strapi.service('api::basic-payment-method.basic-payment-method')
      const result = await paymentMethodService.getActivePaymentMethods()

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return ctx.ok(result.data)
    } catch (error) {
      strapi.log.error('Error in getActive:', error)
      return ctx.internalServerError('Failed to get active payment methods')
    }
  },

  /**
   * Get payment method by code
   */
  async getByCode(ctx) {
    try {
      const { code } = ctx.params
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      if (!code) {
        return ctx.badRequest('Payment method code is required')
      }

      const paymentMethodService = strapi.service('api::basic-payment-method.basic-payment-method')
      const result = await paymentMethodService.getPaymentMethodByCode(code)

      if (!result.success) {
        return ctx.notFound(result.error)
      }

      return ctx.ok(result.data)
    } catch (error) {
      strapi.log.error('Error in getByCode:', error)
      return ctx.internalServerError('Failed to get payment method')
    }
  },

  /**
   * Create payment method (admin only)
   */
  async create(ctx) {
    try {
      const { data } = ctx.request.body
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      // Check if user is admin
      if (user.role.type !== 'admin') {
        return ctx.forbidden('Admin access required')
      }

      if (!data.name || !data.code || !data.description) {
        return ctx.badRequest('Name, code, and description are required')
      }

      const paymentMethodService = strapi.service('api::basic-payment-method.basic-payment-method')
      const result = await paymentMethodService.createPaymentMethod(data)

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return ctx.created(result.data)
    } catch (error) {
      strapi.log.error('Error in create:', error)
      return ctx.internalServerError('Failed to create payment method')
    }
  },

  /**
   * Update payment method (admin only)
   */
  async update(ctx) {
    try {
      const { documentId } = ctx.params
      const { data } = ctx.request.body
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      // Check if user is admin
      if (user.role.type !== 'admin') {
        return ctx.forbidden('Admin access required')
      }

      if (!documentId) {
        return ctx.badRequest('Payment method ID is required')
      }

      const paymentMethodService = strapi.service('api::basic-payment-method.basic-payment-method')
      const result = await paymentMethodService.updatePaymentMethod(documentId, data)

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return ctx.ok(result.data)
    } catch (error) {
      strapi.log.error('Error in update:', error)
      return ctx.internalServerError('Failed to update payment method')
    }
  },

  /**
   * Activate payment method (admin only)
   */
  async activate(ctx) {
    try {
      const { documentId } = ctx.params
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      // Check if user is admin
      if (user.role.type !== 'admin') {
        return ctx.forbidden('Admin access required')
      }

      if (!documentId) {
        return ctx.badRequest('Payment method ID is required')
      }

      const paymentMethodService = strapi.service('api::basic-payment-method.basic-payment-method')
      const result = await paymentMethodService.activatePaymentMethod(documentId)

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return ctx.ok(result.data)
    } catch (error) {
      strapi.log.error('Error in activate:', error)
      return ctx.internalServerError('Failed to activate payment method')
    }
  },

  /**
   * Deactivate payment method (admin only)
   */
  async deactivate(ctx) {
    try {
      const { documentId } = ctx.params
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      // Check if user is admin
      if (user.role.type !== 'admin') {
        return ctx.forbidden('Admin access required')
      }

      if (!documentId) {
        return ctx.badRequest('Payment method ID is required')
      }

      const paymentMethodService = strapi.service('api::basic-payment-method.basic-payment-method')
      const result = await paymentMethodService.deactivatePaymentMethod(documentId)

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return ctx.ok(result.data)
    } catch (error) {
      strapi.log.error('Error in deactivate:', error)
      return ctx.internalServerError('Failed to deactivate payment method')
    }
  },

  /**
   * Get payment method statistics (admin only)
   */
  async getStats(ctx) {
    try {
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      // Check if user is admin
      if (user.role.type !== 'admin') {
        return ctx.forbidden('Admin access required')
      }

      const paymentMethodService = strapi.service('api::basic-payment-method.basic-payment-method')
      const result = await paymentMethodService.getPaymentMethodStats()

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return ctx.ok(result.data)
    } catch (error) {
      strapi.log.error('Error in getStats:', error)
      return ctx.internalServerError('Failed to get payment method statistics')
    }
  },

  /**
   * Initialize default payment methods (admin only)
   */
  async initializeDefaults(ctx) {
    try {
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      // Check if user is admin
      if (user.role.type !== 'admin') {
        return ctx.forbidden('Admin access required')
      }

      const paymentMethodService = strapi.service('api::basic-payment-method.basic-payment-method')
      const result = await paymentMethodService.initializeDefaultPaymentMethods()

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return ctx.ok(result.data)
    } catch (error) {
      strapi.log.error('Error in initializeDefaults:', error)
      return ctx.internalServerError('Failed to initialize default payment methods')
    }
  }
}))
