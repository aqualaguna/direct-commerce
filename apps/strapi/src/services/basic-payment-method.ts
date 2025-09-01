/**
 * Basic Payment Method Service
 * 
 * Handles basic payment method management for manual payments
 * following Strapi 5+ Document Service API patterns
 */

interface PaymentMethodData {
  name: string
  code: 'cash' | 'bank_transfer' | 'check' | 'money_order' | 'other'
  description: string
  isActive?: boolean
  requiresConfirmation?: boolean
  instructions?: string
}

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
      const paymentMethods = await strapi.documents('api::basic-payment-method.basic-payment-method').findMany({
        filters: {
          isActive: true
        },
        sort: { name: 'asc' }
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
   * Get payment method by code
   */
  async getPaymentMethodByCode(code: string): Promise<PaymentMethodResult> {
    try {
      const paymentMethod = await strapi.documents('api::basic-payment-method.basic-payment-method').findFirst({
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
      // Validate required fields
      if (!data.name || !data.code || !data.description) {
        return {
          success: false,
          error: 'Name, code, and description are required'
        }
      }

      // Check if code already exists
      const existingMethod = await strapi.documents('api::basic-payment-method.basic-payment-method').findFirst({
        filters: {
          code: data.code
        }
      })

      if (existingMethod) {
        return {
          success: false,
          error: 'Payment method code already exists'
        }
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
      // Check if payment method exists
      const existingMethod = await strapi.documents('api::basic-payment-method.basic-payment-method').findOne({
        documentId
      })

      if (!existingMethod) {
        return {
          success: false,
          error: 'Payment method not found'
        }
      }

      // Check if code is being changed and if it already exists
      if (data.code && data.code !== existingMethod.code) {
        const codeExists = await strapi.documents('api::basic-payment-method.basic-payment-method').findFirst({
          filters: {
            code: data.code
          }
        })

        if (codeExists) {
          return {
            success: false,
            error: 'Payment method code already exists'
          }
        }
      }

      const paymentMethod = await strapi.documents('api::basic-payment-method.basic-payment-method').update({
        documentId,
        data
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
      const paymentMethod = await strapi.documents('api::basic-payment-method.basic-payment-method').update({
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
      const paymentMethod = await strapi.documents('api::basic-payment-method.basic-payment-method').update({
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
   * Get payment method statistics
   */
  async getPaymentMethodStats(): Promise<PaymentMethodResult> {
    try {
      const stats = await strapi.documents('api::basic-payment-method.basic-payment-method').count()
      const activeCount = await strapi.documents('api::basic-payment-method.basic-payment-method').count({
        isActive: true
      })

      return {
        success: true,
        data: {
          total: stats,
          active: activeCount,
          inactive: stats - activeCount
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
          filters: {
            code: method.code
          }
        })

        if (!existing) {
          const created = await strapi.documents('api::basic-payment-method.basic-payment-method').create({
            data: {
              ...method,
              isActive: true,
              requiresConfirmation: true,
              isAutomated: false
            }
          })
          createdMethods.push(created)
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
