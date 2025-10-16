/**
 * Basic Payment Method Controller
 * 
 * Handles basic payment method API endpoints following Strapi 5+ Document Service API patterns
 * Refactored to use service layer for business logic
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::payment-method.payment-method', ({ strapi }) => ({
  /**
   * Get active payment methods
   */
  async getActive(ctx) {
    try {
      const result = await strapi.service('api::payment-method.payment-method').getActivePaymentMethods()
      
      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return {
        data: result.data
      }
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
      if (!code) {
        return ctx.badRequest('Payment method code is required')
      }

      const result = await strapi.service('api::payment-method.payment-method').getPaymentMethodByCode(code)
      
      if (!result.success) {
        if (result.error === 'Payment method not found') {
          return ctx.notFound(result.error)
        }
        return ctx.badRequest(result.error)
      }

      return {
        data: result.data
      }
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

      const result = await strapi.service('api::payment-method.payment-method').createPaymentMethod(data)
      
      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return ctx.created({ data: result.data })
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

      if (!documentId) {
        return ctx.badRequest('Payment method ID is required')
      }

      const result = await strapi.service('api::payment-method.payment-method').updatePaymentMethod(documentId, data)
      
      if (!result.success) {
        if (result.error === 'Payment method not found') {
          return ctx.notFound(result.error)
        }
        return ctx.badRequest(result.error)
      }

      return { data: result.data }
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

      if (!documentId) {
        return ctx.badRequest('Payment method ID is required')
      }

      const result = await strapi.service('api::payment-method.payment-method').activatePaymentMethod(documentId)
      
      if (!result.success) {
        if (result.error === 'Payment method not found') {
          return ctx.notFound(result.error)
        }
        return ctx.badRequest(result.error)
      }

      return { data: result.data }
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

      if (!documentId) {
        return ctx.badRequest('Payment method ID is required')
      }

      const result = await strapi.service('api::payment-method.payment-method').deactivatePaymentMethod(documentId)
      
      if (!result.success) {
        if (result.error === 'Payment method not found') {
          return ctx.notFound(result.error)
        }
        return ctx.badRequest(result.error)
      }

      return { data: result.data }
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
      const result = await strapi.service('api::payment-method.payment-method').getPaymentMethodStats()
      
      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return {
        data: result.data
      }
    } catch (error) {
      strapi.log.error('Error in getStats:', error)
      return ctx.internalServerError('Failed to get payment method statistics')
    }
  },

  /**
   * Get all payment methods (admin only)
   */
  async find(ctx) {
    try {
      const result = await strapi.service('api::payment-method.payment-method').getAllPaymentMethods()
      
      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return { data: result.data }
    } catch (error) {
      strapi.log.error('Error in find:', error)
      return ctx.internalServerError('Failed to get payment methods')
    }
  },

  /**
   * Get payment method by ID (admin only)
   */
  async findOne(ctx) {
    try {
      const { documentId } = ctx.params

      if (!documentId) {
        return ctx.badRequest('Payment method ID is required')
      }

      const result = await strapi.service('api::payment-method.payment-method').getPaymentMethodById(documentId)
      
      if (!result.success) {
        if (result.error === 'Payment method not found') {
          return ctx.notFound(result.error)
        }
        return ctx.badRequest(result.error)
      }

      return { data: result.data }
    } catch (error) {
      strapi.log.error('Error in findOne:', error)
      return ctx.internalServerError('Failed to get payment method')
    }
  },

  /**
   * Delete payment method (admin only)
   */
  async delete(ctx) {
    try {
      const { documentId } = ctx.params

      if (!documentId) {
        return ctx.badRequest('Payment method ID is required')
      }

      const result = await strapi.service('api::payment-method.payment-method').deletePaymentMethod(documentId)
      
      if (!result.success) {
        if (result.error === 'Payment method not found') {
          return ctx.notFound(result.error)
        }
        return ctx.badRequest(result.error)
      }

      return { data: result.data }
    } catch (error) {
      strapi.log.error('Error in delete:', error)
      return ctx.internalServerError('Failed to delete payment method')
    }
  },

  /**
   * Initialize default payment methods (admin only)
   */
  async initializeDefaults(ctx) {
    try {
      const result = await strapi.service('api::payment-method.payment-method').initializeDefaultPaymentMethods()
      
      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return {
        data: result.data
      }
    } catch (error) {
      strapi.log.error('Error in initializeDefaults:', error)
      return ctx.internalServerError('Failed to initialize default payment methods')
    }
  }
}))