/**
 * Basic Payment Method Service
 * 
 * Handles basic payment method management for manual payments
 * following Strapi 5+ Document Service API patterns
 */

import { PaymentMethodData } from './validation'

interface PaymentMethodResult {
  success: boolean
  data?: any
  error?: string
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Get all active payment methods
   */
  async getActivePaymentMethods(): Promise<PaymentMethodResult> {
    try {
      const paymentMethods = await strapi.documents('api::payment-method.payment-method').findMany({
        filters: {
          isActive: true
        },
        sort: 'name:asc'
      })

      return {
        success: true,
        data: paymentMethods
      }
    } catch (error) {
      strapi.log.error('Error getting active payment methods:', error)
      return {
        success: false,
        error: 'Failed to get payment methods'
      }
    }
  },

  /**
   * Get all payment methods (admin only)
   */
  async getAllPaymentMethods(): Promise<PaymentMethodResult> {
    try {
      const paymentMethods = await strapi.documents('api::payment-method.payment-method').findMany({
        sort: 'name:asc'
      })

      return {
        success: true,
        data: paymentMethods
      }
    } catch (error) {
      strapi.log.error('Error getting all payment methods:', error)
      return {
        success: false,
        error: 'Failed to get payment methods'
      }
    }
  },

  /**
   * Get payment method by ID
   */
  async getPaymentMethodById(documentId: string): Promise<PaymentMethodResult> {
    try {
      if (!documentId) {
        return {
          success: false,
          error: 'Payment method ID is required'
        }
      }

      const paymentMethod = await strapi.documents('api::payment-method.payment-method').findOne({
        documentId
      })

      if (!paymentMethod) {
        return {
          success: false,
          error: 'Payment method not found'
        }
      }

      return {
        success: true,
        data: paymentMethod
      }
    } catch (error) {
      strapi.log.error('Error getting payment method by ID:', error)
      return {
        success: false,
        error: 'Failed to get payment method'
      }
    }
  },

  /**
   * Get payment method by code
   */
  async getPaymentMethodByCode(code: string): Promise<PaymentMethodResult> {
    try {
      const paymentMethod = await strapi.documents('api::payment-method.payment-method').findFirst({
        filters: {
          code,
          isActive: true
        }
      })

      if (!paymentMethod) {
        return {
          success: false,
          error: 'Payment method not found'
        }
      }

      return {
        success: true,
        data: paymentMethod
      }
    } catch (error) {
      strapi.log.error('Error getting payment method by code:', error)
      return {
        success: false,
        error: 'Failed to get payment method'
      }
    }
  },

  /**
   * Create payment method
   */
  async createPaymentMethod(data: PaymentMethodData): Promise<PaymentMethodResult> {
    try {
      // Get validation service
      const validationService = strapi.service('api::payment-method.validation')

      // Sanitize data
      const sanitizedData = validationService.sanitizePaymentMethodData(data)

      // Validate data
      const validation = await validationService.validatePaymentMethodData(sanitizedData)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        }
      }

      const paymentMethod = await strapi.documents('api::payment-method.payment-method').create({
        data: {
          name: sanitizedData.name,
          code: sanitizedData.code,
          paymentType: sanitizedData.paymentType,
          description: sanitizedData.description,
          isActive: sanitizedData.isActive !== undefined ? sanitizedData.isActive : true,
          instructions: sanitizedData.instructions
        }
      })

      return {
        success: true,
        data: paymentMethod
      }
    } catch (error) {
      strapi.log.error('Error creating payment method:', error)
      return {
        success: false,
        error: 'Failed to create payment method'
      }
    }
  },

  /**
   * Update payment method
   */
  async updatePaymentMethod(documentId: string, data: Partial<PaymentMethodData>): Promise<PaymentMethodResult> {
    try {
      // Get validation service
      const validationService = strapi.service('api::payment-method.validation')

      // Sanitize data
      const sanitizedData = validationService.sanitizePaymentMethodData(data)

      // Validate update data
      const validation = await validationService.validateUpdateData(documentId, sanitizedData)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        }
      }

      const paymentMethod = await strapi.documents('api::payment-method.payment-method').update({
        documentId,
        data: sanitizedData
      })

      return {
        success: true,
        data: paymentMethod
      }
    } catch (error) {
      strapi.log.error('Error updating payment method:', error)
      return {
        success: false,
        error: 'Failed to update payment method'
      }
    }
  },

  /**
   * Deactivate payment method
   */
  async deactivatePaymentMethod(documentId: string): Promise<PaymentMethodResult> {
    try {
      // Get validation service
      const validationService = strapi.service('api::payment-method.validation')

      // Validate payment method exists
      const existsValidation = await validationService.validatePaymentMethodExists(documentId)
      if (!existsValidation.isValid) {
        return {
          success: false,
          error: existsValidation.errors.join(', ')
        }
      }

      const paymentMethod = await strapi.documents('api::payment-method.payment-method').update({
        documentId,
        data: {
          isActive: false
        }
      })

      return {
        success: true,
        data: paymentMethod
      }
    } catch (error) {
      strapi.log.error('Error deactivating payment method:', error)
      return {
        success: false,
        error: 'Failed to deactivate payment method'
      }
    }
  },

  /**
   * Activate payment method
   */
  async activatePaymentMethod(documentId: string): Promise<PaymentMethodResult> {
    try {
      // Get validation service
      const validationService = strapi.service('api::payment-method.validation')

      // Validate payment method exists
      const existsValidation = await validationService.validatePaymentMethodExists(documentId)
      if (!existsValidation.isValid) {
        return {
          success: false,
          error: existsValidation.errors.join(', ')
        }
      }

      const paymentMethod = await strapi.documents('api::payment-method.payment-method').update({
        documentId,
        data: {
          isActive: true
        }
      })

      return {
        success: true,
        data: paymentMethod
      }
    } catch (error) {
      strapi.log.error('Error activating payment method:', error)
      return {
        success: false,
        error: 'Failed to activate payment method'
      }
    }
  },

  /**
   * Delete payment method
   */
  async deletePaymentMethod(documentId: string): Promise<PaymentMethodResult> {
    try {
      // Get validation service
      const validationService = strapi.service('api::payment-method.validation')

      // Validate payment method exists
      const existsValidation = await validationService.validatePaymentMethodExists(documentId)
      if (!existsValidation.isValid) {
        return {
          success: false,
          error: existsValidation.errors.join(', ')
        }
      }

      await strapi.documents('api::payment-method.payment-method').delete({
        documentId
      })

      return {
        success: true,
        data: { message: 'Payment method deleted successfully' }
      }
    } catch (error) {
      strapi.log.error('Error deleting payment method:', error)
      return {
        success: false,
        error: 'Failed to delete payment method'
      }
    }
  },

  /**
   * Get payment method statistics
   */
  async getPaymentMethodStats(): Promise<PaymentMethodResult> {
    try {
      const totalMethods = await strapi.documents('api::payment-method.payment-method').count({})
      const activeMethods = await strapi.documents('api::payment-method.payment-method').count({
        filters: { isActive: true }
      })

      return {
        success: true,
        data: {
          total: totalMethods,
          active: activeMethods,
          inactive: totalMethods - activeMethods
        }
      }
    } catch (error) {
      strapi.log.error('Error getting payment method stats:', error)
      return {
        success: false,
        error: 'Failed to get payment method statistics'
      }
    }
  },

  /**
   * Initialize default payment methods
   */
  async initializeDefaultPaymentMethods(): Promise<PaymentMethodResult> {
    try {
      const defaultMethods = [
        {
          name: 'Cash',
          code: 'cash',
          paymentType: 'manual' as const,
          description: 'Payment in cash upon delivery or pickup',
          instructions: 'Please have exact change ready for cash payments.',
          isActive: true
        },
        {
          name: 'Bank Transfer',
          code: 'bank_transfer',
          paymentType: 'manual' as const,
          description: 'Direct bank transfer to our account',
          instructions: 'Transfer to Account: 1234567890, Bank: Example Bank, Reference: Your Order Number',
          isActive: true
        },
        {
          name: 'Check',
          code: 'check',
          paymentType: 'manual' as const,
          description: 'Payment by personal or business check',
          instructions: 'Make check payable to: Your Company Name. Include order number in memo.',
          isActive: true
        },
        {
          name: 'Money Order',
          code: 'money_order',
          paymentType: 'manual' as const,
          description: 'Payment by money order or cashier\'s check',
          instructions: 'Make money order payable to: Your Company Name. Include order number in memo.',
          isActive: true
        }
      ]

      const createdMethods = []

      for (const method of defaultMethods) {
        // Check if method already exists
        const existing = await strapi.documents('api::payment-method.payment-method').findFirst({
          filters: {
            code: method.code
          }
        })

        if (!existing) {
          const created = await strapi.documents('api::payment-method.payment-method').create({
            data: method
          })
          createdMethods.push(created)
        } else {
          createdMethods.push(existing)
        }
      }

      return {
        success: true,
        data: {
          message: `Initialized ${createdMethods.length} default payment methods`,
          created: createdMethods
        }
      }
    } catch (error) {
      strapi.log.error('Error initializing default payment methods:', error)
      return {
        success: false,
        error: 'Failed to initialize default payment methods'
      }
    }
  }
})
