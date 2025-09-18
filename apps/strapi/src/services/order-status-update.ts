/**
 * Order Status Update Service
 * 
 * Handles order status updates and synchronization with payment confirmation
 * following Strapi 5+ Document Service API patterns
 */

interface OrderStatusUpdateData {
  orderId: string
  previousStatus: string
  newStatus: string
  triggeredBy: 'payment_confirmation' | 'manual_update' | 'system' | 'customer_request' | 'admin_action' | 'automated_rule'
  updatedById: string
  updateNotes?: string
  updateReason?: string
  automationRule?: string
  metadata?: any
  paymentConfirmationId?: string
}

interface OrderStatusUpdateResult {
  success: boolean
  data?: any
  error?: string
}

interface StatusUpdateValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Create order status update
   */
  async createOrderStatusUpdate(data: OrderStatusUpdateData): Promise<OrderStatusUpdateResult> {
    try {
      // Validate required fields
      if (!data.orderId || !data.previousStatus || !data.newStatus || !data.updatedById) {
        return {
          success: false,
          error: 'Order ID, previous status, new status, and updated by ID are required'
        }
      }

      // Check if order exists
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

      // Validate status transition
      const validation = await this.validateStatusUpdate(data.previousStatus, data.newStatus)
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid status update: ${validation.errors.join(', ')}`
        }
      }

      // Create status update history
      const statusUpdateHistory = [
        {
          action: 'status_updated',
          timestamp: new Date().toISOString(),
          updatedBy: data.updatedById,
          previousStatus: data.previousStatus,
          newStatus: data.newStatus,
          reason: data.updateReason,
          notes: data.updateNotes
        }
      ]

      const orderStatusUpdate = await strapi.documents('api::order-status-update.order-status-update').create({
        data: {
          order: data.orderId,
          previousStatus: data.previousStatus,
          newStatus: data.newStatus,
          triggeredBy: data.triggeredBy,
          updatedBy: data.updatedById,
          updateNotes: data.updateNotes,
          updateReason: data.updateReason,
          automationRule: data.automationRule,
          metadata: data.metadata,
          paymentConfirmation: data.paymentConfirmationId,
          statusUpdateHistory,
          populate: ['updatedBy', 'paymentConfirmation']
        }
      })

      // TODO: Update order status when order API is implemented in Story 4.4
      // await strapi.documents('api::order.order').update({
      //   documentId: data.orderId,
      //   data: {
      //     status: data.newStatus,
      //     lastStatusUpdate: new Date()
      //   }
      // })

      // Send notifications if configured
      if (data.triggeredBy !== 'system') {
        await this.sendStatusUpdateNotification(orderStatusUpdate)
      }

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
   * Validate status update
   */
  async validateStatusUpdate(previousStatus: string, newStatus: string): Promise<StatusUpdateValidation> {
    const errors: string[] = []
    const warnings: string[] = []

    // Define valid status transitions
    const validTransitions: { [key: string]: string[] } = {
      'pending': ['confirmed', 'cancelled', 'payment_pending'],
      'payment_pending': ['confirmed', 'cancelled', 'payment_failed'],
      'confirmed': ['processing', 'cancelled', 'refunded'],
      'processing': ['shipped', 'cancelled', 'refunded'],
      'shipped': ['delivered', 'returned', 'refunded'],
      'delivered': ['completed', 'returned', 'refunded'],
      'completed': ['refunded'],
      'cancelled': [], // No further transitions
      'refunded': [], // No further transitions
      'returned': ['refunded'],
      'payment_failed': ['cancelled', 'payment_pending']
    }

    // Check if transition is valid
    if (!validTransitions[previousStatus] || !validTransitions[previousStatus].includes(newStatus)) {
      errors.push(`Invalid transition from ${previousStatus} to ${newStatus}`)
    }

    // Add warnings for specific transitions
    if (previousStatus === 'delivered' && newStatus === 'returned') {
      warnings.push('Returning a delivered order may require additional processing')
    }

    if (previousStatus === 'completed' && newStatus === 'refunded') {
      warnings.push('Refunding a completed order requires special handling')
    }

    if (newStatus === 'cancelled' && ['confirmed', 'processing', 'shipped'].includes(previousStatus)) {
      warnings.push('Cancelling an order in progress may require inventory adjustments')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  },

  /**
   * Send status update notification
   */
  async sendStatusUpdateNotification(orderStatusUpdate: any): Promise<void> {
    try {
      const notificationChannels = ['email', 'sms']
      const notificationData = {
        orderId: orderStatusUpdate.order.documentId,
        previousStatus: orderStatusUpdate.previousStatus,
        newStatus: orderStatusUpdate.newStatus,
        updateReason: orderStatusUpdate.updateReason,
        updateNotes: orderStatusUpdate.updateNotes,
        customerEmail: orderStatusUpdate.order.user?.email,
        customerPhone: orderStatusUpdate.order.user?.phone
      }

      // Update notification status
      await strapi.documents('api::order-status-update.order-status-update').update({
        documentId: orderStatusUpdate.documentId,
        data: {
          notificationSent: true,
          notificationChannels
        }
      })

      // Log notification attempt
      strapi.log.info('Status update notification sent', {
        orderId: orderStatusUpdate.order.documentId,
        channels: notificationChannels,
        status: orderStatusUpdate.newStatus
      })
    } catch (error) {
      strapi.log.error('Error sending status update notification:', error)
    }
  },

  /**
   * Get order status updates by order ID
   */
  async getStatusUpdatesByOrder(orderId: string): Promise<OrderStatusUpdateResult> {
    try {
      const statusUpdates = await strapi.documents('api::order-status-update.order-status-update').findMany({
        filters: {
          order: orderId
        },
        populate: ['updatedBy', 'paymentConfirmation'],
        sort: 'createdAt:desc'
      })

      return {
        success: true,
        data: statusUpdates
      }
    } catch (error) {
      strapi.log.error('Error getting status updates by order:', error)
      return {
        success: false,
        error: 'Failed to get order status updates'
      }
    }
  },

  /**
   * Get order status update by ID
   */
  async getOrderStatusUpdate(updateId: string): Promise<OrderStatusUpdateResult> {
    try {
      const statusUpdate = await strapi.documents('api::order-status-update.order-status-update').findOne({
        documentId: updateId,
        populate: ['updatedBy', 'paymentConfirmation']
      })

      if (!statusUpdate) {
        return {
          success: false,
          error: 'Order status update not found'
        }
      }

      return {
        success: true,
        data: statusUpdate
      }
    } catch (error) {
      strapi.log.error('Error getting order status update:', error)
      return {
        success: false,
        error: 'Failed to get order status update'
      }
    }
  },

  /**
   * Get status update statistics
   */
  async getStatusUpdateStats(): Promise<OrderStatusUpdateResult> {
    try {
      const totalUpdates = await strapi.documents('api::order-status-update.order-status-update').count()
      const paymentConfirmationUpdates = await strapi.documents('api::order-status-update.order-status-update').count({
        triggeredBy: 'payment_confirmation'
      })
      const manualUpdates = await strapi.documents('api::order-status-update.order-status-update').count({
        triggeredBy: 'manual_update'
      })
      const systemUpdates = await strapi.documents('api::order-status-update.order-status-update').count({
        triggeredBy: 'system'
      })

      // Get most common status transitions
      const statusUpdates = await strapi.documents('api::order-status-update.order-status-update').findMany({
        fields: ['previousStatus', 'newStatus'],
        sort: 'createdAt:desc',
        pagination: { page: 1, pageSize: 1000 }
      })

      const transitionCounts: { [key: string]: number } = {}
      statusUpdates.forEach(update => {
        const transition = `${update.previousStatus} -> ${update.newStatus}`
        transitionCounts[transition] = (transitionCounts[transition] || 0) + 1
      })

      const mostCommonTransitions = Object.entries(transitionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([transition, count]) => ({ transition, count }))

      return {
        success: true,
        data: {
          total: totalUpdates,
          byTrigger: {
            paymentConfirmation: paymentConfirmationUpdates,
            manual: manualUpdates,
            system: systemUpdates
          },
          mostCommonTransitions
        }
      }
    } catch (error) {
      strapi.log.error('Error getting status update stats:', error)
      return {
        success: false,
        error: 'Failed to get status update statistics'
      }
    }
  },

  /**
   * Bulk update order statuses
   */
  async bulkUpdateOrderStatuses(updates: OrderStatusUpdateData[]): Promise<OrderStatusUpdateResult> {
    try {
      const results = []
      const errors = []

      for (const update of updates) {
        try {
          const result = await this.createOrderStatusUpdate(update)
          if (result.success) {
            results.push(result.data)
          } else {
            errors.push({ orderId: update.orderId, error: result.error })
          }
        } catch (error) {
          errors.push({ orderId: update.orderId, error: 'Failed to update order status' })
        }
      }

      return {
        success: errors.length === 0,
        data: {
          updated: results,
          errors
        },
        error: errors.length > 0 ? `${errors.length} updates failed` : undefined
      }
    } catch (error) {
      strapi.log.error('Error in bulk update order statuses:', error)
      return {
        success: false,
        error: 'Failed to bulk update order statuses'
      }
    }
  },

  /**
   * Get orders by status
   */
  async getOrdersByStatus(status: string, page: number = 1, pageSize: number = 25): Promise<OrderStatusUpdateResult> {
    try {
      const orders = await strapi.documents('api::order.order').findMany({
        filters: {
          status
        },
        populate: ['user', 'items'],
        sort: 'createdAt:desc',
        limit: pageSize,
        start: (page - 1) * pageSize,
      })

      return {
        success: true,
        data: orders
      }
    } catch (error) {
      strapi.log.error('Error getting orders by status:', error)
      return {
        success: false,
        error: 'Failed to get orders by status'
      }
    }
  },

  /**
   * Get order status history
   */
  async getOrderStatusHistory(orderId: string): Promise<OrderStatusUpdateResult> {
    try {
      const statusUpdates = await strapi.documents('api::order-status-update.order-status-update').findMany({
        filters: {
          order: orderId
        },
        populate: ['updatedBy', 'paymentConfirmation'],
        sort: 'createdAt:asc'
      })

      // Create timeline of status changes
      const timeline = statusUpdates.map(update => ({
        timestamp: update.createdAt,
        previousStatus: update.previousStatus,
        newStatus: update.newStatus,
        triggeredBy: update.triggeredBy,
        updatedBy: update.updatedBy,
        notes: update.updateNotes,
        reason: update.updateReason
      }))

      return {
        success: true,
        data: {
          orderId,
          timeline,
          totalUpdates: statusUpdates.length
        }
      }
    } catch (error) {
      strapi.log.error('Error getting order status history:', error)
      return {
        success: false,
        error: 'Failed to get order status history'
      }
    }
  },

  /**
   * Process automated status updates
   */
  async processAutomatedStatusUpdates(): Promise<OrderStatusUpdateResult> {
    try {
      const results = []
      const errors = []

      // Get orders that need automated status updates
      const pendingOrders = await strapi.documents('api::order.order').findMany({
        filters: {
          status: 'confirmed',
          createdAt: {
            $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Older than 24 hours
          }
        },
        populate: ['user']
      })

      for (const order of pendingOrders) {
        try {
          // Auto-update to processing after 24 hours
          const result = await this.createOrderStatusUpdate({
            orderId: order.documentId,
            previousStatus: 'confirmed',
            newStatus: 'processing',
            triggeredBy: 'automated_rule',
            updatedById: 'system',
            updateReason: 'system_automation',
            automationRule: 'auto_process_confirmed_orders',
            updateNotes: 'Automatically moved to processing after 24 hours'
          })

          if (result.success) {
            results.push(result.data)
          } else {
            errors.push({ orderId: order.documentId, error: result.error })
          }
        } catch (error) {
          errors.push({ orderId: order.documentId, error: 'Failed to process automated update' })
        }
      }

      return {
        success: errors.length === 0,
        data: {
          processed: results,
          errors
        },
        error: errors.length > 0 ? `${errors.length} automated updates failed` : undefined
      }
    } catch (error) {
      strapi.log.error('Error processing automated status updates:', error)
      return {
        success: false,
        error: 'Failed to process automated status updates'
      }
    }
  }
})
