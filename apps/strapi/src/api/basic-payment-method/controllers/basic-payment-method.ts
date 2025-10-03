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

      const paymentMethods = await strapi.documents('api::basic-payment-method.basic-payment-method').findMany({
        filters: { isActive: true },
        sort: 'name:asc'
      })

      return {
        data: paymentMethods
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

      const paymentMethod = await strapi.documents('api::basic-payment-method.basic-payment-method').findFirst({
        filters: { code, isActive: true }
      })

      if (!paymentMethod) {
        return ctx.notFound('Payment method not found')
      }

      return {
        data: paymentMethod
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

      if (!data.name || !data.code || !data.description) {
        return ctx.badRequest('Name, code, and description are required')
      }

      // Validate enum values
      if (!['cash', 'bank_transfer', 'check', 'money_order', 'other'].includes(data.code)) {
        return ctx.badRequest('Invalid payment method code')
      }

      // Check if code already exists
      const existingMethod = await strapi.documents('api::basic-payment-method.basic-payment-method').findFirst({
        filters: { code: data.code }
      })

      if (existingMethod) {
        return ctx.badRequest('Payment method code already exists')
      }

      const paymentMethod = await strapi.documents('api::basic-payment-method.basic-payment-method').create({
        data: {
          name: data.name,
          code: data.code,
          description: data.description,
          isActive: data.isActive !== undefined ? data.isActive : true,
          requiresConfirmation: data.requiresConfirmation !== undefined ? data.requiresConfirmation : true,
          isAutomated: false,
          instructions: data.instructions
        }
      })

      return ctx.created({ data: paymentMethod })
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

      // Check if payment method exists
      const existingMethod = await strapi.documents('api::basic-payment-method.basic-payment-method').findOne({
        documentId,
      })

      if (!existingMethod) {
        return ctx.notFound('Payment method not found')
      }

      // If updating code, check for duplicates
      if (data.code && data.code !== existingMethod.code) {
        const duplicateMethod = await strapi.documents('api::basic-payment-method.basic-payment-method').findFirst({
          filters: { code: data.code }
        })

        if (duplicateMethod) {
          return ctx.badRequest('Payment method code already exists')
        }
      }

      const updatedMethod = await strapi.documents('api::basic-payment-method.basic-payment-method').update({
        documentId,
        data
      })

      return { data: updatedMethod }
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

      const paymentMethod = await strapi.documents('api::basic-payment-method.basic-payment-method').update({
        documentId,
        data: { isActive: true }
      })

      return { data: paymentMethod }
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

      const paymentMethod = await strapi.documents('api::basic-payment-method.basic-payment-method').update({
        documentId,
        data: { isActive: false }
      })

      return { data: paymentMethod }
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

      const totalMethods = await strapi.documents('api::basic-payment-method.basic-payment-method').count({})
      const activeMethods = await strapi.documents('api::basic-payment-method.basic-payment-method').count({
        filters: { isActive: true }
      })

      return {
        data: {
          total: totalMethods,
          active: activeMethods,
          inactive: totalMethods - activeMethods
        }
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
      const paymentMethods = await strapi.documents('api::basic-payment-method.basic-payment-method').findMany({
        sort: 'name:asc'
      })

      return { data: paymentMethods }
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

      const paymentMethod = await strapi.documents('api::basic-payment-method.basic-payment-method').findOne({
        documentId
      })

      if (!paymentMethod) {
        return ctx.notFound('Payment method not found')
      }

      return { data: paymentMethod }
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

      // Check if payment method exists
      const existingMethod = await strapi.documents('api::basic-payment-method.basic-payment-method').findOne({
        documentId
      })

      if (!existingMethod) {
        return ctx.notFound('Payment method not found')
      }

      await strapi.documents('api::basic-payment-method.basic-payment-method').delete({
        documentId
      })

      return { data: { message: 'Payment method deleted successfully' } }
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
      const defaultMethods = [
        {
          name: 'Cash',
          code: 'cash',
          description: 'Payment in cash upon delivery or pickup',
          instructions: 'Please have exact change ready for cash payments.'
        },
        {
          name: 'Bank Transfer',
          code: 'bank_transfer',
          description: 'Direct bank transfer to our account',
          instructions: 'Transfer to Account: 1234567890, Bank: Example Bank, Reference: Your Order Number'
        },
        {
          name: 'Check',
          code: 'check',
          description: 'Payment by personal or business check',
          instructions: 'Make check payable to: Your Company Name. Include order number in memo.'
        },
        {
          name: 'Money Order',
          code: 'money_order',
          description: 'Payment by money order or cashier\'s check',
          instructions: 'Make money order payable to: Your Company Name. Include order number in memo.'
        }
      ]

      const createdMethods = []

      for (const method of defaultMethods) {
        // Check if method already exists
        const existing = await strapi.documents('api::basic-payment-method.basic-payment-method').findFirst({
          filters: { code: method.code as any }
        })

        if (!existing) {
          const created = await strapi.documents('api::basic-payment-method.basic-payment-method').create({
            data: {
              ...method,
              isActive: true,
              requiresConfirmation: true,
              isAutomated: false,
              code: method.code as any
            }
          })
          createdMethods.push(created)
        }
      }

      return {
        data: {
          message: `Initialized ${createdMethods.length} default payment methods`,
          created: createdMethods
        }
      }
    } catch (error) {
      strapi.log.error('Error in initializeDefaults:', error)
      return ctx.internalServerError('Failed to initialize default payment methods')
    }
  }
}))