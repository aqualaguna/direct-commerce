/**
 * Order Status Management Service
 * Handles order status transitions, validation, and automation
 */

interface StatusTransition {
  from: string;
  to: string;
  allowed: boolean;
  requiresApproval: boolean;
  automationRules: string[];
}

interface StatusUpdateRequest {
  orderId: string;
  newStatus: string;
  reason?: string;
  notes?: string;
  updatedBy: string;
  automatedTrigger?: string;
  customerVisible?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export default {
  /**
   * Update order status
   */
  async updateOrderStatus(request: StatusUpdateRequest) {
    try {
      const { orderId, newStatus, reason, notes, updatedBy, automatedTrigger, customerVisible = true, priority = 'normal' } = request;

      // Get current order
      const order = await strapi.documents('api::order.order').findOne({
        documentId: orderId,
        populate: ['user']
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const previousStatus = order.status;

      // Validate status transition
      const transitionValidation = await this.validateStatusTransition(previousStatus, newStatus);
      if (!transitionValidation.allowed) {
        throw new Error(`Invalid status transition from ${previousStatus} to ${newStatus}`);
      }

      // Update order status
      const updatedOrder = await strapi.documents('api::order.order').update({
        documentId: orderId,
        data: { status: newStatus as any },
        populate: ['user']
      });

      // Create status history record
      const statusRecord = await strapi.documents('api::order.order-status').create({
        data: {
          order: orderId,
          status: newStatus as any,
          previousStatus,
          statusReason: reason as any,
          notes,
          updatedBy,
          automatedTrigger,
          customerVisible,
          priority,
          notificationSent: false,
          notificationMethod: 'email'
        }
      });

      // Send notifications if needed
      if (customerVisible && order.user) {
        await this.sendStatusNotification(order, newStatus, reason);
      }

      // Trigger automation rules
      await this.triggerAutomationRules(orderId, newStatus, automatedTrigger);

      return {
        order: updatedOrder,
        statusRecord,
        transition: transitionValidation
      };
    } catch (error) {
      strapi.log.error('Error updating order status:', error);
      throw error;
    }
  },

  /**
   * Validate status transition
   */
  async validateStatusTransition(fromStatus: string, toStatus: string): Promise<StatusTransition> {
    const validTransitions = {
      pending: {
        confirmed: { allowed: true, requiresApproval: false, automationRules: ['payment_confirmation'] },
        cancelled: { allowed: true, requiresApproval: false, automationRules: ['customer_cancellation', 'fraud_detection'] }
      },
      confirmed: {
        processing: { allowed: true, requiresApproval: false, automationRules: ['inventory_check', 'payment_verification'] },
        cancelled: { allowed: true, requiresApproval: true, automationRules: ['admin_cancellation'] }
      },
      processing: {
        shipped: { allowed: true, requiresApproval: false, automationRules: ['shipping_label_created'] },
        cancelled: { allowed: true, requiresApproval: true, automationRules: ['admin_cancellation'] }
      },
      shipped: {
        delivered: { allowed: true, requiresApproval: false, automationRules: ['delivery_confirmation'] },
        cancelled: { allowed: true, requiresApproval: true, automationRules: ['admin_cancellation'] }
      },
      delivered: {
        refunded: { allowed: true, requiresApproval: true, automationRules: ['customer_return', 'admin_refund'] }
      },
      cancelled: {
        // No valid transitions from cancelled
      },
      refunded: {
        // No valid transitions from refunded
      }
    };

    const transition = validTransitions[fromStatus]?.[toStatus];

    return {
      from: fromStatus,
      to: toStatus,
      allowed: !!transition,
      requiresApproval: transition?.requiresApproval || false,
      automationRules: transition?.automationRules || []
    };
  },

  /**
   * Send status notification
   */
  async sendStatusNotification(order: any, status: string, reason?: string) {
    try {
      const statusMessages = {
        confirmed: 'Your order has been confirmed and is being processed.',
        processing: 'Your order is being prepared for shipment.',
        shipped: 'Your order has been shipped and is on its way.',
        delivered: 'Your order has been delivered successfully.',
        cancelled: 'Your order has been cancelled.',
        refunded: 'Your order has been refunded.'
      };

      const message = statusMessages[status] || `Your order status has been updated to ${status}.`;
      
      // Get existing status record
      const statusRecord = await strapi.documents('api::order.order-status').findFirst({
        filters: { order: {documentId: order.documentId}, status: status as any }
      });

      // Update the status record
      await strapi.documents('api::order.order-status').update({
        documentId: statusRecord.documentId,
        data: { 
          notificationSent: true,
          notificationMethod: 'email'
        }
      });

      // TODO: Integrate with notification service
      strapi.log.info(`Status notification sent for order ${order.orderNumber}: ${message}`);
    } catch (error) {
      strapi.log.error('Error sending status notification:', error);
    }
  },

  /**
   * Trigger automation rules
   */
  async triggerAutomationRules(orderId: string, status: string, trigger?: string) {
    try {
      const automationRules = await this.getAutomationRules(status, trigger);
      
      for (const rule of automationRules) {
        await this.executeAutomationRule(orderId, rule);
      }
    } catch (error) {
      strapi.log.error('Error triggering automation rules:', error);
    }
  },

  /**
   * Get automation rules for status
   */
  async getAutomationRules(status: string, trigger?: string) {
    const rules = [];

    switch (status) {
      case 'confirmed':
        rules.push({
          name: 'inventory_reservation',
          action: 'reserve_inventory',
          priority: 1
        });
        rules.push({
          name: 'payment_verification',
          action: 'verify_payment',
          priority: 2
        });
        break;
      case 'processing':
        rules.push({
          name: 'shipping_label_generation',
          action: 'generate_shipping_label',
          priority: 1
        });
        break;
      case 'shipped':
        rules.push({
          name: 'delivery_tracking',
          action: 'setup_tracking',
          priority: 1
        });
        break;
      case 'delivered':
        rules.push({
          name: 'post_delivery_survey',
          action: 'send_survey',
          priority: 1
        });
        break;
    }

    return rules.sort((a, b) => a.priority - b.priority);
  },

  /**
   * Execute automation rule
   */
  async executeAutomationRule(orderId: string, rule: any) {
    try {
      switch (rule.action) {
        case 'reserve_inventory':
          await this.reserveInventory(orderId);
          break;
        case 'verify_payment':
          await this.verifyPayment(orderId);
          break;
        case 'generate_shipping_label':
          await this.generateShippingLabel(orderId);
          break;
        case 'setup_tracking':
          await this.setupTracking(orderId);
          break;
        case 'send_survey':
          await this.sendPostDeliverySurvey(orderId);
          break;
      }

      strapi.log.info(`Automation rule ${rule.name} executed for order ${orderId}`);
    } catch (error) {
      strapi.log.error(`Error executing automation rule ${rule.name}:`, error);
    }
  },

  /**
   * Reserve inventory for order
   */
  async reserveInventory(orderId: string) {
    const order = await strapi.documents('api::order.order').findOne({
      documentId: orderId,
      populate: ['items', 'items.productListing', 'items.productListingVariant']
    });

    if (!order || !order.items) {
      return;
    }

    for (const item of order.items) {
      if (item.variant) {
        // Reserve variant inventory
        // Update inventory through the product's inventory record
        const variant = await strapi.documents('api::product-listing-variant.product-listing-variant').findOne({
          documentId: item.variant.documentId,
          populate: ['product']
        });
        
        if (!variant?.product) {
          continue;
        }
        
        const product = await strapi.documents('api::product.product').findOne({
          documentId: variant.product.documentId,
          populate: ['inventoryRecord']
        });
        
        if (product?.inventoryRecord) {
          await strapi.documents('api::inventory.inventory').update({
            documentId: product.inventoryRecord.documentId,
            data: {
              available: product.inventoryRecord.available - item.quantity,
              reserved: product.inventoryRecord.reserved + item.quantity
            }
          });
        }
      } else if (item.productListing) {
        // TODO: Reserve product inventory
        // await strapi.documents('api::product-listing.product-listing').update({
        //   documentId: item.productListing.documentId,
        //   data: {
        //     inventory: item.productListing.inventory - item.quantity
        //   }
        // });
      }
    }
  },

  /**
   * Verify payment for order
   */
  async verifyPayment(orderId: string) {
    const order = await strapi.documents('api::order.order').findOne({
      documentId: orderId,
      populate: ['payments']
    });

    if (order.payments) {
      for (const payment of order.payments) {
      // Verify manual payment status

      if (payment && payment.status === 'confirmed') {
        await strapi.documents('api::order.order').update({
          documentId: orderId,
          data: { paymentStatus: 'paid' }
          });
        }
      }
    }
  },

  /**
   * Generate shipping label
   */
  async generateShippingLabel(orderId: string) {
    // TODO: Integrate with shipping service
    strapi.log.info(`Shipping label generation requested for order ${orderId}`);
  },

  /**
   * Setup tracking for order
   */
  async setupTracking(orderId: string) {
    // TODO: Integrate with tracking service
    strapi.log.info(`Tracking setup requested for order ${orderId}`);
  },

  /**
   * Send post-delivery survey
   */
  async sendPostDeliverySurvey(orderId: string) {
    // TODO: Integrate with survey service
    strapi.log.info(`Post-delivery survey requested for order ${orderId}`);
  },

  /**
   * Get order status history
   */
  async getOrderStatusHistory(orderId: string) {
    try {
      const statusHistory = await strapi.documents('api::order.order-status').findMany({
        filters: { order: orderId as any },
        sort: 'createdAt:desc',
        populate: ['updatedBy']
      });

      return statusHistory;
    } catch (error) {
      strapi.log.error('Error getting order status history:', error);
      throw error;
    }
  },

  /**
   * Get orders by status
   */
  async getOrdersByStatus(status: string, page = 1, pageSize = 25) {
    try {
      const orders = await strapi.documents('api::order.order').findMany({
        filters: { status: status as any },
        sort: 'createdAt:desc',
        limit: pageSize,
        start: (page - 1) * pageSize,
        populate: ['user', 'items']
      });

      return orders;
    } catch (error) {
      strapi.log.error('Error getting orders by status:', error);
      throw error;
    }
  },

  /**
   * Get status statistics
   */
  async getStatusStatistics() {
    try {
      const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
      const stats = {};

      for (const status of statuses) {
        stats[status] = await strapi.documents('api::order.order').count({ filters: { status: status as any } });
      }

      return stats;
    } catch (error) {
      strapi.log.error('Error getting status statistics:', error);
      throw error;
    }
  },

  /**
   * Validate status update
   */
  async validateStatusUpdate(previousStatus: string, newStatus: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
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
};
