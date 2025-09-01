/**
 * Manual Payment Order Service
 * 
 * Handles manual payment order creation, validation, and management
 * following Strapi 5+ Document Service API patterns
 */

interface ManualPaymentOrderData {
  orderId: string
  userId: string
  paymentMethodId: string
  amount: number
  currency?: string
  paymentNotes?: string
}

interface ManualPaymentOrderResult {
  success: boolean
  data?: any
  error?: string
}

interface OrderValidationResult {
  isValid: boolean
  errors: string[]
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Create a manual payment order
   */
  async createManualPaymentOrder(data: ManualPaymentOrderData): Promise<ManualPaymentOrderResult> {
    try {
      // Validate input data
      const validation = await this.validateManualPaymentOrder(data)
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        }
      }

      // Get the order
      const order = await strapi.documents('api::order.order').findOne({
        documentId: data.orderId,
        populate: ['user', 'items']
      })

      if (!order) {
        return {
          success: false,
          error: 'Order not found'
        }
      }

      // Get the payment method
      const paymentMethod = await strapi.documents('api::basic-payment-method.basic-payment-method').findOne({
        documentId: data.paymentMethodId
      })

      if (!paymentMethod) {
        return {
          success: false,
          error: 'Payment method not found'
        }
      }

      if (!paymentMethod.isActive) {
        return {
          success: false,
          error: 'Payment method is not active'
        }
      }

      // Create manual payment record
      const manualPayment = await strapi.documents('api::manual-payment.manual-payment').create({
        data: {
          order: data.orderId,
          user: data.userId,
          paymentMethod: data.paymentMethodId,
          amount: data.amount,
          currency: data.currency || 'USD',
          status: 'pending',
          paymentType: 'manual',
          paymentNotes: data.paymentNotes,
          populate: ['user', 'paymentMethod']
        }
      })

      // Update order status to pending payment
      await strapi.documents('api::order.order').update({
        documentId: data.orderId,
        data: {
          status: 'pending_payment',
          paymentStatus: 'pending'
        }
      })

      return {
        success: true,
        data: manualPayment
      }
    } catch (error) {
      strapi.log.error('Error creating manual payment order:', error)
      return {
        success: false,
        error: 'Failed to create manual payment order'
      }
    }
  },

  /**
   * Validate manual payment order data
   */
  async validateManualPaymentOrder(data: ManualPaymentOrderData): Promise<OrderValidationResult> {
    const errors: string[] = []

    // Validate required fields
    if (!data.orderId) {
      errors.push('Order ID is required')
    }

    if (!data.userId) {
      errors.push('User ID is required')
    }

    if (!data.paymentMethodId) {
      errors.push('Payment method ID is required')
    }

    if (!data.amount || data.amount <= 0) {
      errors.push('Amount must be greater than 0')
    }

    // Validate currency format
    if (data.currency && data.currency.length !== 3) {
      errors.push('Currency must be a 3-letter code')
    }

    // Validate order exists and belongs to user
    if (data.orderId && data.userId) {
      try {
        const order = await strapi.documents('api::order.order').findOne({
          documentId: data.orderId,
          populate: ['user']
        })

        if (!order) {
          errors.push('Order not found')
        } else if (order.user.documentId !== data.userId) {
          errors.push('Order does not belong to user')
        } else if (order.status !== 'pending') {
          errors.push('Order is not in pending status')
        }
      } catch (error) {
        errors.push('Failed to validate order')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Get manual payment by ID
   */
  async getManualPayment(paymentId: string) {
    try {
      const payment = await strapi.documents('api::manual-payment.manual-payment').findOne({
        documentId: paymentId,
        populate: ['user', 'paymentMethod', 'confirmedBy']
      })

      return {
        success: true,
        data: payment
      }
    } catch (error) {
      strapi.log.error('Error getting manual payment:', error)
      return {
        success: false,
        error: 'Failed to get manual payment'
      }
    }
  },

  /**
   * Get manual payments by order ID
   */
  async getManualPaymentsByOrder(orderId: string) {
    try {
      const payments = await strapi.documents('api::manual-payment.manual-payment').findMany({
        filters: {
          order: orderId
        },
        populate: ['paymentMethod', 'confirmedBy'],
        sort: { createdAt: 'desc' }
      })

      return {
        success: true,
        data: payments
      }
    } catch (error) {
      strapi.log.error('Error getting manual payments by order:', error)
      return {
        success: false,
        error: 'Failed to get manual payments'
      }
    }
  },

  /**
   * Update manual payment status
   */
  async updatePaymentStatus(paymentId: string, status: string, adminUserId?: string) {
    try {
      const updateData: any = {
        status
      }

      if (status === 'confirmed' || status === 'paid') {
        updateData.confirmedBy = adminUserId
        updateData.confirmedAt = new Date()
      }

      const payment = await strapi.documents('api::manual-payment.manual-payment').update({
        documentId: paymentId,
        data: updateData,
        populate: ['user', 'paymentMethod', 'confirmedBy']
      })

      // Update order status based on payment status
      if (payment.order) {
        let orderStatus = 'pending_payment'
        let paymentStatus = 'pending'

        switch (status) {
          case 'confirmed':
            orderStatus = 'confirmed'
            paymentStatus = 'confirmed'
            break
          case 'paid':
            orderStatus = 'paid'
            paymentStatus = 'paid'
            break
          case 'rejected':
            orderStatus = 'cancelled'
            paymentStatus = 'failed'
            break
          case 'cancelled':
            orderStatus = 'cancelled'
            paymentStatus = 'cancelled'
            break
        }

        await strapi.documents('api::order.order').update({
          documentId: payment.order.documentId,
          data: {
            status: orderStatus,
            paymentStatus
          }
        })
      }

      return {
        success: true,
        data: payment
      }
    } catch (error) {
      strapi.log.error('Error updating payment status:', error)
      return {
        success: false,
        error: 'Failed to update payment status'
      }
    }
  },

  /**
   * Get pending manual payments for admin review
   */
  async getPendingPayments(page: number = 1, pageSize: number = 25) {
    try {
      const payments = await strapi.documents('api::manual-payment.manual-payment').findMany({
        filters: {
          status: 'pending'
        },
        populate: ['user', 'paymentMethod'],
        sort: { createdAt: 'asc' },
        pagination: {
          page,
          pageSize
        }
      })

      return {
        success: true,
        data: payments
      }
    } catch (error) {
      strapi.log.error('Error getting pending payments:', error)
      return {
        success: false,
        error: 'Failed to get pending payments'
      }
    }
  },

  /**
   * Cancel manual payment
   */
  async cancelManualPayment(paymentId: string, reason?: string) {
    try {
      const payment = await strapi.documents('api::manual-payment.manual-payment').update({
        documentId: paymentId,
        data: {
          status: 'cancelled',
          adminNotes: reason ? `${reason}\n\nCancelled at: ${new Date().toISOString()}` : `Cancelled at: ${new Date().toISOString()}`
        },
        populate: ['user', 'paymentMethod']
      })

      // Update order status
      if (payment.order) {
        await strapi.documents('api::order.order').update({
          documentId: payment.order.documentId,
          data: {
            status: 'cancelled',
            paymentStatus: 'cancelled'
          }
        })
      }

      return {
        success: true,
        data: payment
      }
    } catch (error) {
      strapi.log.error('Error cancelling manual payment:', error)
      return {
        success: false,
        error: 'Failed to cancel manual payment'
      }
    }
  }
})
