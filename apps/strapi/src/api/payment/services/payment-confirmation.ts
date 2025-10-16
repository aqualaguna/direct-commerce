/**
 * Payment Confirmation Service
 * 
 * Comprehensive business logic for payment confirmation workflows
 * Handles manual and automated payment confirmations
 */

import { Core } from '@strapi/strapi'

export interface PaymentConfirmationData {
  payment: string
  confirmationType: 'manual' | 'automated'
  confirmationNotes?: string
  confirmationMethod?: 'admin_dashboard' | 'api_call' | 'webhook' | 'email_confirmation' | 'phone_confirmation'
  confirmationEvidence?: any
  automationRules?: any
  attachments?: string[]
}

export interface ConfirmationResult {
  success: boolean
  data?: any
  error?: string
}

export interface AutomationRule {
  id: string
  name: string
  conditions: any[]
  actions: any[]
  enabled: boolean
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Create payment confirmation
   */
  async createPaymentConfirmation(data: PaymentConfirmationData): Promise<ConfirmationResult> {
    try {
      // Validate payment exists and is pending
      const payment = await strapi.documents('api::payment.payment').findOne({
        documentId: data.payment,
        populate: {
          order: true,
          paymentMethod: true,
          user: true
        }
      })

      if (!payment) {
        return {
          success: false,
          error: 'Payment not found'
        }
      }

      if (payment.status !== 'pending') {
        return {
          success: false,
          error: 'Payment is not in pending status'
        }
      }

      // Check if confirmation already exists
      const existingConfirmation = await strapi.documents('api::payment.payment-confirmation').findFirst({
        filters: { payment: { documentId: data.payment } }
      })

      if (existingConfirmation) {
        return {
          success: false,
          error: 'Payment confirmation already exists'
        }
      }

      // Create confirmation record
      const confirmation = await strapi.documents('api::payment.payment-confirmation').create({
        data: {
          payment: data.payment,
          confirmationType: data.confirmationType,
          confirmationMethod: data.confirmationMethod || 'admin_dashboard',
          confirmationNotes: data.confirmationNotes || '',
          confirmationEvidence: data.confirmationEvidence || {},
          automationRules: data.automationRules || {},
          confirmationStatus: 'pending',
          retryCount: 0,
          confirmationHistory: {
            history: [{
              status: 'pending',
              timestamp: new Date().toISOString(),
              notes: 'Payment confirmation created',
              action: 'created'
            }]
          },
          attachments: data.attachments || []
        }
      })

      return {
        success: true,
        data: confirmation
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
   * Confirm payment manually
   */
  async confirmPaymentManually(
    confirmationId: string, 
    confirmedBy: string, 
    confirmationNotes?: string,
    confirmationEvidence?: any,
    attachments?: string[]
  ): Promise<ConfirmationResult> {
    try {
      const confirmation = await strapi.documents('api::payment.payment-confirmation').findOne({
        documentId: confirmationId,
        populate: {
          payment: {
            populate: {
              order: true,
              paymentMethod: true
            }
          }
        }
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

      if (confirmation.payment.status !== 'pending') {
        return {
          success: false,
          error: 'Payment is not in pending status'
        }
      }

      // Update confirmation
      const updatedConfirmation = await strapi.documents('api::payment.payment-confirmation').update({
        documentId: confirmationId,
        data: {
          confirmationStatus: 'confirmed',
          confirmationNotes: confirmationNotes || '',
          confirmationEvidence: confirmationEvidence || {},
          confirmationHistory: {
            history: [
              ...((confirmation.confirmationHistory as any)?.history || []),
              {
                status: 'confirmed',
                timestamp: new Date().toISOString(),
                notes: confirmationNotes || 'Payment confirmed manually',
                action: 'manual_confirmation',
                confirmedBy
              }
            ]
          },
          attachments: attachments || []
        }
      })

      // Update payment status
      await strapi.documents('api::payment.payment').update({
        documentId: confirmation.payment.documentId,
        data: {
          status: 'confirmed',
        }
      })

      // Update order payment status
      await strapi.documents('api::order.order').update({
        documentId: confirmation.payment.order.documentId,
        data: {
          paymentStatus: 'paid'
        }
      })

      return {
        success: true,
        data: updatedConfirmation
      }
    } catch (error) {
      strapi.log.error('Error confirming payment manually:', error)
      return {
        success: false,
        error: 'Failed to confirm payment manually'
      }
    }
  },

  /**
   * Reject payment confirmation
   */
  async rejectPaymentConfirmation(
    confirmationId: string,
    rejectedBy: string,
    rejectionReason: string,
    rejectionEvidence?: any
  ): Promise<ConfirmationResult> {
    try {
      const confirmation = await strapi.documents('api::payment.payment-confirmation').findOne({
        documentId: confirmationId,
        populate: {
          payment: {
            populate: {
              order: true
            }
          }
        }
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

      // Update confirmation
      const updatedConfirmation = await strapi.documents('api::payment.payment-confirmation').update({
        documentId: confirmationId,
        data: {
          confirmationStatus: 'failed',
          confirmationNotes: `Rejected: ${rejectionReason}`,
          confirmationEvidence: rejectionEvidence || {},
          confirmationHistory: {
            history: [
              ...((confirmation.confirmationHistory as any)?.history || []),
              {
                status: 'failed',
                timestamp: new Date().toISOString(),
                notes: `Rejected: ${rejectionReason}`,
                action: 'rejection',
                rejectedBy
              }
            ]
          }
        }
      })

      // Update payment status
      await strapi.documents('api::payment.payment').update({
        documentId: confirmation.payment.documentId,
        data: {
          status: 'rejected',
          adminNotes: `Payment rejected: ${rejectionReason}`
        }
      })

      // Update order payment status
      await strapi.documents('api::order.order').update({
        documentId: confirmation.payment.order.documentId,
        data: {
          paymentStatus: 'failed'
        }
      })

      return {
        success: true,
        data: updatedConfirmation
      }
    } catch (error) {
      strapi.log.error('Error rejecting payment confirmation:', error)
      return {
        success: false,
        error: 'Failed to reject payment confirmation'
      }
    }
  },

  /**
   * Cancel payment confirmation
   */
  async cancelPaymentConfirmation(
    confirmationId: string,
    cancelledBy: string,
    cancellationReason: string
  ): Promise<ConfirmationResult> {
    try {
      const confirmation = await strapi.documents('api::payment.payment-confirmation').findOne({
        documentId: confirmationId,
        populate: {
          payment: {
            populate: {
              order: true
            }
          }
        }
      })

      if (!confirmation) {
        return {
          success: false,
          error: 'Payment confirmation not found'
        }
      }

      if (confirmation.confirmationStatus === 'confirmed') {
        return {
          success: false,
          error: 'Cannot cancel already confirmed payment'
        }
      }

      // Update confirmation
      const updatedConfirmation = await strapi.documents('api::payment.payment-confirmation').update({
        documentId: confirmationId,
        data: {
          confirmationStatus: 'cancelled',
          confirmationNotes: `Cancelled: ${cancellationReason}`,
          confirmationHistory: {
            history: [
              ...((confirmation.confirmationHistory as any)?.history || []),
              {
                status: 'cancelled',
                timestamp: new Date().toISOString(),
                notes: `Cancelled: ${cancellationReason}`,
                action: 'cancellation',
                cancelledBy
              }
            ]
          }
        }
      })

      // Update payment status
      await strapi.documents('api::payment.payment').update({
        documentId: confirmation.payment.documentId,
        data: {
          status: 'cancelled',
          adminNotes: `Payment cancelled: ${cancellationReason}`
        }
      })

      // Update order payment status
      await strapi.documents('api::order.order').update({
        documentId: confirmation.payment.order.documentId,
        data: {
          paymentStatus: 'failed'
        }
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
   * Get payment confirmation by ID
   */
  async getPaymentConfirmation(confirmationId: string): Promise<ConfirmationResult> {
    try {
      const confirmation = await strapi.documents('api::payment.payment-confirmation').findOne({
        documentId: confirmationId,
        populate: {
          payment: {
            populate: {
              order: true,
              paymentMethod: true,
              user: true
            }
          },
        }
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
   * Get payment confirmations by status
   */
  async getPaymentConfirmationsByStatus(status: string): Promise<ConfirmationResult> {
    try {
      const confirmations = await strapi.documents('api::payment.payment-confirmation').findMany({
        filters: {
          confirmationStatus: status as any
        },
        populate: {
          payment: {
            populate: {
              order: true,
              paymentMethod: true,
              user: true
            }
          },
        },
        sort: 'createdAt:desc'
      })

      return {
        success: true,
        data: confirmations
      }
    } catch (error) {
      strapi.log.error('Error getting payment confirmations by status:', error)
      return {
        success: false,
        error: 'Failed to get payment confirmations'
      }
    }
  },

  /**
   * Get pending payment confirmations
   */
  async getPendingConfirmations(): Promise<ConfirmationResult> {
    return this.getPaymentConfirmationsByStatus('pending')
  },

  /**
   * Get confirmed payment confirmations
   */
  async getConfirmedConfirmations(): Promise<ConfirmationResult> {
    return this.getPaymentConfirmationsByStatus('confirmed')
  },

  /**
   * Get failed payment confirmations
   */
  async getFailedConfirmations(): Promise<ConfirmationResult> {
    return this.getPaymentConfirmationsByStatus('failed')
  },

  /**
   * Get cancelled payment confirmations
   */
  async getCancelledConfirmations(): Promise<ConfirmationResult> {
    return this.getPaymentConfirmationsByStatus('cancelled')
  },

  /**
   * Get payment confirmation statistics
   */
  async getConfirmationStats(): Promise<ConfirmationResult> {
    try {
      const total = await strapi.documents('api::payment.payment-confirmation').count({})
      const pending = await strapi.documents('api::payment.payment-confirmation').count({
        filters: { confirmationStatus: 'pending' }
      })
      const confirmed = await strapi.documents('api::payment.payment-confirmation').count({
        filters: { confirmationStatus: 'confirmed' }
      })
      const failed = await strapi.documents('api::payment.payment-confirmation').count({
        filters: { confirmationStatus: 'failed' }
      })
      const cancelled = await strapi.documents('api::payment.payment-confirmation').count({
        filters: { confirmationStatus: 'cancelled' }
      })

      return {
        success: true,
        data: {
          total,
          pending,
          confirmed,
          failed,
          cancelled
        }
      }
    } catch (error) {
      strapi.log.error('Error getting confirmation statistics:', error)
      return {
        success: false,
        error: 'Failed to get confirmation statistics'
      }
    }
  },

  /**
   * Update confirmation evidence
   */
  async updateConfirmationEvidence(
    confirmationId: string,
    evidence: any,
    updatedBy: string
  ): Promise<ConfirmationResult> {
    try {
      const confirmation = await strapi.documents('api::payment.payment-confirmation').findOne({
        documentId: confirmationId
      })

      if (!confirmation) {
        return {
          success: false,
          error: 'Payment confirmation not found'
        }
      }

      const updatedConfirmation = await strapi.documents('api::payment.payment-confirmation').update({
        documentId: confirmationId,
        data: {
          confirmationEvidence: evidence,
          confirmationHistory: {
            history: [
              ...((confirmation.confirmationHistory as any)?.history || []),
              {
                status: confirmation.confirmationStatus,
                timestamp: new Date().toISOString(),
                notes: 'Evidence updated',
                action: 'evidence_update',
                updatedBy
              }
            ]
          }
        }
      })

      return {
        success: true,
        data: updatedConfirmation
      }
    } catch (error) {
      strapi.log.error('Error updating confirmation evidence:', error)
      return {
        success: false,
        error: 'Failed to update confirmation evidence'
      }
    }
  },


  /**
   * Process automated confirmation
   */
  async processAutomatedConfirmation(
    confirmationId: string,
    automationRules: AutomationRule[]
  ): Promise<ConfirmationResult> {
    try {
      const confirmation = await strapi.documents('api::payment.payment-confirmation').findOne({
        documentId: confirmationId,
        populate: {
          payment: {
            populate: {
              order: true,
              paymentMethod: true,
              user: true
            }
          }
        }
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

      // Process automation rules
      let shouldConfirm = false
      let automationNotes = ''

      for (const rule of automationRules) {
        if (!rule.enabled) continue

        // Check if rule conditions are met
        const conditionsMet = await this.evaluateAutomationConditions(rule.conditions, confirmation)
        
        if (conditionsMet) {
          shouldConfirm = true
          automationNotes += `Rule ${rule.name} triggered; `
          
          // Execute rule actions
          await this.executeAutomationActions(rule.actions, confirmation)
        }
      }

      if (shouldConfirm) {
        // Auto-confirm the payment
        const result = await this.confirmPaymentManually(
          confirmationId,
          'system',
          `Automated confirmation: ${automationNotes}`,
          { automationRules, triggeredAt: new Date().toISOString() }
        )

        return {
          success: true,
          data: {
            ...result.data,
            automated: true,
            automationNotes
          }
        }
      } else {
        // Update retry count and schedule next retry
        const nextRetryAt = new Date()
        nextRetryAt.setHours(nextRetryAt.getHours() + 1) // Retry in 1 hour

        await strapi.documents('api::payment.payment-confirmation').update({
          documentId: confirmationId,
          data: {
            retryCount: (confirmation.retryCount || 0) + 1,
            nextRetryAt: nextRetryAt.toISOString(),
            confirmationHistory: {
              history: [
                ...((confirmation.confirmationHistory as any)?.history || []),
                {
                  status: 'pending',
                  timestamp: new Date().toISOString(),
                  notes: 'Automated processing - no rules triggered',
                  action: 'automation_check'
                }
              ]
            }
          }
        })

        return {
          success: true,
          data: {
            message: 'Automation processed, no confirmation triggered',
            nextRetryAt: nextRetryAt.toISOString()
          }
        }
      }
    } catch (error) {
      strapi.log.error('Error processing automated confirmation:', error)
      return {
        success: false,
        error: 'Failed to process automated confirmation'
      }
    }
  },

  /**
   * Evaluate automation conditions
   */
  async evaluateAutomationConditions(conditions: any[], confirmation: any): Promise<boolean> {
    try {
      for (const condition of conditions) {
        switch (condition.type) {
          case 'payment_amount':
            if (confirmation.payment.amount < condition.minAmount || 
                confirmation.payment.amount > condition.maxAmount) {
              return false
            }
            break
          
          case 'payment_method':
            if (confirmation.payment.paymentMethod.code !== condition.methodCode) {
              return false
            }
            break
          
          case 'user_type':
            if (condition.requireRegistered && !confirmation.payment.user) {
              return false
            }
            break
          
          case 'order_value':
            if (confirmation.payment.order.totalAmount < condition.minOrderValue) {
              return false
            }
            break
          
          case 'time_of_day':
            const hour = new Date().getHours()
            if (hour < condition.startHour || hour > condition.endHour) {
              return false
            }
            break
          
          default:
            strapi.log.warn(`Unknown automation condition type: ${condition.type}`)
        }
      }
      
      return true
    } catch (error) {
      strapi.log.error('Error evaluating automation conditions:', error)
      return false
    }
  },

  /**
   * Execute automation actions
   */
  async executeAutomationActions(actions: any[], confirmation: any): Promise<void> {
    try {
      for (const action of actions) {
        switch (action.type) {
          case 'send_notification':
            // Send notification to admin
            await strapi.plugins['email'].services.email.send({
              to: action.email,
              subject: 'Payment Auto-Confirmed',
              text: `Payment ${confirmation.payment.documentId} has been auto-confirmed`
            })
            break
          
          case 'update_order_status':
            await strapi.documents('api::order.order').update({
              documentId: confirmation.payment.order.documentId,
              data: {
                status: action.status
              }
            })
            break
          
          case 'add_order_note':
            // Add note to order
            break
          
          default:
            strapi.log.warn(`Unknown automation action type: ${action.type}`)
        }
      }
    } catch (error) {
      strapi.log.error('Error executing automation actions:', error)
    }
  },

  /**
   * Get confirmations requiring retry
   */
  async getConfirmationsRequiringRetry(): Promise<ConfirmationResult> {
    try {
      const now = new Date().toISOString()
      
      const confirmations = await strapi.documents('api::payment.payment-confirmation').findMany({
        filters: {
          confirmationStatus: 'pending',
          nextRetryAt: {
            $lte: now
          }
        },
        populate: {
          payment: {
            populate: {
              order: true,
              paymentMethod: true
            }
          }
        },
        sort: 'nextRetryAt:asc'
      })

      return {
        success: true,
        data: confirmations
      }
    } catch (error) {
      strapi.log.error('Error getting confirmations requiring retry:', error)
      return {
        success: false,
        error: 'Failed to get confirmations requiring retry'
      }
    }
  },

  /**
   * Bulk confirm payments
   */
  async bulkConfirmPayments(
    confirmationIds: string[],
    confirmedBy: string,
    confirmationNotes?: string
  ): Promise<ConfirmationResult> {
    try {
      const results = []
      const errors = []

      for (const confirmationId of confirmationIds) {
        const result = await this.confirmPaymentManually(
          confirmationId,
          confirmedBy,
          confirmationNotes
        )

        if (result.success) {
          results.push(result.data)
        } else {
          errors.push({
            confirmationId,
            error: result.error
          })
        }
      }

      return {
        success: errors.length === 0,
        data: {
          confirmed: results,
          errors
        }
      }
    } catch (error) {
      strapi.log.error('Error bulk confirming payments:', error)
      return {
        success: false,
        error: 'Failed to bulk confirm payments'
      }
    }
  },

  /**
   * Get confirmation history
   */
  async getConfirmationHistory(confirmationId: string): Promise<ConfirmationResult> {
    try {
      const confirmation = await strapi.documents('api::payment.payment-confirmation').findOne({
        documentId: confirmationId
      })

      if (!confirmation) {
        return {
          success: false,
          error: 'Payment confirmation not found'
        }
      }

      return {
        success: true,
        data: (confirmation.confirmationHistory as any)?.history || []
      }
    } catch (error) {
      strapi.log.error('Error getting confirmation history:', error)
      return {
        success: false,
        error: 'Failed to get confirmation history'
      }
    }
  }
})
