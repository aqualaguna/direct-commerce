/**
 * Payment Confirmation Workflow Service
 * 
 * Handles payment confirmation workflow and automation
 * following Strapi 5+ Document Service API patterns
 */

interface PaymentConfirmationData {
  manualPaymentId: string
  confirmedById: string
  confirmationType: 'manual' | 'automated'
  confirmationNotes?: string
  confirmationMethod?: 'admin_dashboard' | 'api_call' | 'webhook' | 'email_confirmation' | 'phone_confirmation'
  confirmationEvidence?: any
  automationRules?: any
}

interface PaymentConfirmationResult {
  success: boolean
  data?: any
  error?: string
}

interface StatusTransitionValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Create payment confirmation
   */
  async createPaymentConfirmation(data: PaymentConfirmationData): Promise<PaymentConfirmationResult> {
    try {
      // Validate required fields
      if (!data.manualPaymentId || !data.confirmedById) {
        return {
          success: false,
          error: 'Manual payment ID and confirmed by ID are required'
        }
      }

      // Check if manual payment exists and is in correct status
      const manualPayment = await strapi.documents('api::manual-payment.manual-payment').findOne({
        documentId: data.manualPaymentId,
        populate: ['user', 'paymentMethod']
      })

      if (!manualPayment) {
        return {
          success: false,
          error: 'Manual payment not found'
        }
      }

      // Validate status transition
      const validation = await this.validateStatusTransition(manualPayment.status, 'confirmed')
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid status transition: ${validation.errors.join(', ')}`
        }
      }

      // Check if confirmation already exists
      const existingConfirmation = await strapi.documents('api::payment-confirmation.payment-confirmation').findFirst({
        filters: {
          manualPayment: data.manualPaymentId,
          confirmationStatus: 'confirmed'
        }
      })

      if (existingConfirmation) {
        return {
          success: false,
          error: 'Payment confirmation already exists'
        }
      }

      // Create confirmation history
      const confirmationHistory = [
        {
          action: 'created',
          timestamp: new Date().toISOString(),
          confirmedBy: data.confirmedById,
          status: 'pending',
          notes: 'Payment confirmation created'
        }
      ]

      const paymentConfirmation = await strapi.documents('api::payment-confirmation.payment-confirmation').create({
        data: {
          manualPayment: data.manualPaymentId,
          confirmedBy: data.confirmedById,
          confirmationType: data.confirmationType || 'manual',
          confirmationNotes: data.confirmationNotes,
          confirmationMethod: data.confirmationMethod || 'admin_dashboard',
          confirmationEvidence: data.confirmationEvidence,
          automationRules: data.automationRules,
          confirmedAt: new Date(),
          confirmationStatus: 'pending',
          confirmationHistory,
          populate: ['manualPayment', 'confirmedBy']
        }
      })

      return {
        success: true,
        data: paymentConfirmation
      }
    } catch (error) {
      strapi.log.error('Error creating payment confirmation:', error)
      return {
        success: false,
        error: 'Failed to create payment confirmation'
      }
    }
  },

  /**
   * Confirm payment
   */
  async confirmPayment(confirmationId: string, confirmedById: string, notes?: string): Promise<PaymentConfirmationResult> {
    try {
      // Get payment confirmation
      const confirmation = await strapi.documents('api::payment-confirmation.payment-confirmation').findOne({
        documentId: confirmationId,
        populate: ['manualPayment', 'confirmedBy']
      })

      if (!confirmation) {
        return {
          success: false,
          error: 'Payment confirmation not found'
        }
      }

      if (confirmation.confirmationStatus !== 'pending') {
        return {
          success: false,
          error: 'Payment confirmation is not in pending status'
        }
      }

      // Update confirmation status
      const confirmationHistory = confirmation.confirmationHistory || []
      confirmationHistory.push({
        action: 'confirmed',
        timestamp: new Date().toISOString(),
        confirmedBy: confirmedById,
        status: 'confirmed',
        notes: notes || 'Payment confirmed'
      })

      const updatedConfirmation = await strapi.documents('api::payment-confirmation.payment-confirmation').update({
        documentId: confirmationId,
        data: {
          confirmationStatus: 'confirmed',
          confirmationNotes: notes,
          confirmedAt: new Date(),
          confirmationHistory
        },
        populate: ['manualPayment', 'confirmedBy']
      })

      // Update manual payment status
      try {
        const manualPaymentService = strapi.service('api::manual-payment.manual-payment')
        await manualPaymentService.updatePaymentStatus(
          confirmation.manualPayment.documentId,
          'confirmed',
          confirmedById
        )
      } catch (serviceError) {
        // Log but don't fail if payment service update fails
        strapi.log.warn('Manual payment service update failed:', serviceError)
      }

      // Create order status update
      try {
        await this.createOrderStatusUpdate(confirmation.manualPayment.documentId, 'confirmed', confirmedById)
      } catch (orderError) {
        // Log but don't fail if order status update fails
        strapi.log.warn('Order status update failed:', orderError)
      }

      return {
        success: true,
        data: updatedConfirmation
      }
    } catch (error) {
      strapi.log.error('Error confirming payment:', error)
      return {
        success: false,
        error: 'Failed to confirm payment'
      }
    }
  },

  /**
   * Validate status transition
   */
  async validateStatusTransition(currentStatus: string, newStatus: string): Promise<StatusTransitionValidation> {
    const errors: string[] = []
    const warnings: string[] = []

    // Define valid status transitions
    const validTransitions: { [key: string]: string[] } = {
      'pending': ['confirmed', 'rejected', 'cancelled'],
      'confirmed': ['paid', 'cancelled'],
      'paid': ['refunded'],
      'rejected': ['pending'], // Allow retry
      'cancelled': [] // No further transitions
    }

    // Check if transition is valid
    if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(newStatus)) {
      errors.push(`Invalid transition from ${currentStatus} to ${newStatus}`)
    }

    // Add warnings for specific transitions
    if (currentStatus === 'confirmed' && newStatus === 'cancelled') {
      warnings.push('Cancelling a confirmed payment may require refund processing')
    }

    if (currentStatus === 'paid' && newStatus === 'refunded') {
      warnings.push('Refunding a paid order requires additional verification')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  },

  /**
   * Create order status update
   */
  async createOrderStatusUpdate(paymentId: string, newStatus: string, updatedById: string): Promise<PaymentConfirmationResult> {
    try {
      // Get manual payment to find the order
      const manualPayment = await strapi.documents('api::manual-payment.manual-payment').findOne({
        documentId: paymentId,
        populate: []
      })

      if (!manualPayment || !manualPayment.orderId) {
        return {
          success: false,
          error: 'Order ID not found for payment'
        }
      }

      const orderStatusUpdate = await strapi.documents('api::order-status-update.order-status-update').create({
        data: {
          orderId: manualPayment.orderId,
          previousStatus: 'pending', // TODO: Get actual order status when order API is implemented
          newStatus,
          triggeredBy: 'payment_confirmation',
          updatedBy: updatedById,
          updateNotes: `Status updated due to payment confirmation`
        },
        populate: ['updatedBy']
      })

      return {
        success: true,
        data: orderStatusUpdate
      }
    } catch (error) {
      strapi.log.error('Error creating order status update:', error)
      return {
        success: false,
        error: 'Failed to create order status update'
      }
    }
  },

  /**
   * Get payment confirmation by ID
   */
  async getPaymentConfirmation(confirmationId: string): Promise<PaymentConfirmationResult> {
    try {
      const confirmation = await strapi.documents('api::payment-confirmation.payment-confirmation').findOne({
        documentId: confirmationId,
        populate: ['manualPayment', 'confirmedBy', 'orderStatusUpdate']
      })

      if (!confirmation) {
        return {
          success: false,
          error: 'Payment confirmation not found'
        }
      }

      return {
        success: true,
        data: confirmation
      }
    } catch (error) {
      strapi.log.error('Error getting payment confirmation:', error)
      return {
        success: false,
        error: 'Failed to get payment confirmation'
      }
    }
  },

  /**
   * Get payment confirmations by manual payment
   */
  async getConfirmationsByPayment(manualPaymentId: string): Promise<PaymentConfirmationResult> {
    try {
      const confirmations = await strapi.documents('api::payment-confirmation.payment-confirmation').findMany({
        filters: {
          manualPayment: manualPaymentId
        },
        populate: ['confirmedBy', 'orderStatusUpdate'],
        sort: 'confirmedAt:desc'
      })

      return {
        success: true,
        data: confirmations
      }
    } catch (error) {
      strapi.log.error('Error getting confirmations by payment:', error)
      return {
        success: false,
        error: 'Failed to get payment confirmations'
      }
    }
  },

  /**
   * Cancel payment confirmation
   */
  async cancelPaymentConfirmation(confirmationId: string, cancelledById: string, reason?: string): Promise<PaymentConfirmationResult> {
    try {
      const confirmation = await strapi.documents('api::payment-confirmation.payment-confirmation').findOne({
        documentId: confirmationId,
        populate: ['manualPayment', 'confirmedBy']
      })

      if (!confirmation) {
        return {
          success: false,
          error: 'Payment confirmation not found'
        }
      }

      if (confirmation.confirmationStatus === 'cancelled') {
        return {
          success: false,
          error: 'Payment confirmation is already cancelled'
        }
      }

      // Update confirmation status
      const confirmationHistory = confirmation.confirmationHistory || []
      confirmationHistory.push({
        action: 'cancelled',
        timestamp: new Date().toISOString(),
        confirmedBy: cancelledById,
        status: 'cancelled',
        notes: reason || 'Payment confirmation cancelled'
      })

      const updatedConfirmation = await strapi.documents('api::payment-confirmation.payment-confirmation').update({
        documentId: confirmationId,
        data: {
          confirmationStatus: 'cancelled',
          confirmationNotes: reason,
          confirmationHistory
        },
        populate: ['manualPayment', 'confirmedBy']
      })

      return {
        success: true,
        data: updatedConfirmation
      }
    } catch (error) {
      strapi.log.error('Error cancelling payment confirmation:', error)
      return {
        success: false,
        error: 'Failed to cancel payment confirmation'
      }
    }
  },

  /**
   * Get confirmation statistics
   */
  async getConfirmationStats(): Promise<PaymentConfirmationResult> {
    try {
      const totalConfirmations = await strapi.documents('api::payment-confirmation.payment-confirmation').count()
      const pendingConfirmations = await strapi.documents('api::payment-confirmation.payment-confirmation').count({
        confirmationStatus: 'pending'
      })
      const confirmedConfirmations = await strapi.documents('api::payment-confirmation.payment-confirmation').count({
        confirmationStatus: 'confirmed'
      })
      const failedConfirmations = await strapi.documents('api::payment-confirmation.payment-confirmation').count({
        confirmationStatus: 'failed'
      })
      const cancelledConfirmations = await strapi.documents('api::payment-confirmation.payment-confirmation').count({
        confirmationStatus: 'cancelled'
      })

      // Get average confirmation time
      const confirmedRecords = await strapi.documents('api::payment-confirmation.payment-confirmation').findMany({
        filters: {
          confirmationStatus: 'confirmed',
          confirmedAt: { $notNull: true }
        },
        fields: ['createdAt', 'confirmedAt']
      })

      let totalConfirmationTime = 0
      let validRecords = 0

      for (const record of confirmedRecords) {
        if (record.createdAt && record.confirmedAt) {
          const creationTime = new Date(record.createdAt).getTime()
          const confirmationTime = new Date(record.confirmedAt).getTime()
          totalConfirmationTime += (confirmationTime - creationTime)
          validRecords++
        }
      }

      const averageConfirmationTimeMinutes = validRecords > 0 
        ? Math.round(totalConfirmationTime / (validRecords * 1000 * 60))
        : 0

      return {
        success: true,
        data: {
          total: totalConfirmations,
          pending: pendingConfirmations,
          confirmed: confirmedConfirmations,
          failed: failedConfirmations,
          cancelled: cancelledConfirmations,
          averageConfirmationTimeMinutes
        }
      }
    } catch (error) {
      strapi.log.error('Error getting confirmation stats:', error)
      return {
        success: false,
        error: 'Failed to get confirmation statistics'
      }
    }
  },

  /**
   * Process automated confirmation rules
   */
  async processAutomatedConfirmationRules(manualPaymentId: string): Promise<PaymentConfirmationResult> {
    try {
      const manualPayment = await strapi.documents('api::manual-payment.manual-payment').findOne({
        documentId: manualPaymentId,
        populate: ['user', 'paymentMethod']
      })

      if (!manualPayment) {
        return {
          success: false,
          error: 'Manual payment not found'
        }
      }

      // Define automation rules
      const automationRules = [
        {
          name: 'low_amount_auto_confirm',
          condition: (payment: any) => payment.amount <= 5000, // $50.00
          action: 'auto_confirm',
          priority: 1
        },
        {
          name: 'trusted_user_auto_confirm',
          condition: (payment: any) => payment.user.trustScore >= 8,
          action: 'auto_confirm',
          priority: 2
        },
        {
          name: 'cash_payment_manual_review',
          condition: (payment: any) => payment.paymentMethod.code === 'cash',
          action: 'manual_review',
          priority: 3
        }
      ]

      // Evaluate rules
      const applicableRules = automationRules.filter(rule => rule.condition(manualPayment))
      const highestPriorityRule = applicableRules.sort((a, b) => a.priority - b.priority)[0]

      if (highestPriorityRule && highestPriorityRule.action === 'auto_confirm') {
        // Create automated confirmation
        const confirmation = await this.createPaymentConfirmation({
          manualPaymentId,
          confirmedById: 'system', // System user ID
          confirmationType: 'automated',
          confirmationMethod: 'api_call',
          automationRules: [highestPriorityRule.name],
          confirmationNotes: `Automatically confirmed by rule: ${highestPriorityRule.name}`
        })

        if (confirmation.success) {
          // Auto-confirm the payment
          await this.confirmPayment(confirmation.data.documentId, 'system')
        }

        return confirmation
      }

      return {
        success: true,
        data: {
          message: 'No automated confirmation rules applied',
          applicableRules: applicableRules.map(rule => rule.name)
        }
      }
    } catch (error) {
      strapi.log.error('Error processing automated confirmation rules:', error)
      return {
        success: false,
        error: 'Failed to process automated confirmation rules'
      }
    }
  }
})
