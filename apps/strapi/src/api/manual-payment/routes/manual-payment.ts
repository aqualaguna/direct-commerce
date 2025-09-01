/**
 * Manual Payment Routes
 * 
 * API routes for manual payment processing following the story specifications
 */

export default {
  routes: [
    // Create manual payment order
    {
      method: 'POST',
      path: '/manual-payment/order',
      handler: 'manual-payment.createOrder',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Create order with manual payment',
        tag: {
          plugin: 'manual-payment',
          name: 'Manual Payment',
          actionType: 'create'
        }
      }
    },

    // Confirm manual payment
    {
      method: 'POST',
      path: '/manual-payment/:paymentId/confirm',
      handler: 'manual-payment.confirmPayment',
      config: {
        policies: ['global::is-admin'],
        description: 'Confirm manual payment',
        tag: {
          plugin: 'manual-payment',
          name: 'Manual Payment',
          actionType: 'update'
        }
      }
    },

    // Get payment review queue
    {
      method: 'GET',
      path: '/manual-payment/review',
      handler: 'manual-payment.getReviewQueue',
      config: {
        policies: ['global::is-admin'],
        description: 'Get payment review queue',
        tag: {
          plugin: 'manual-payment',
          name: 'Manual Payment',
          actionType: 'find'
        }
      }
    },

    // Review manual payment
    {
      method: 'POST',
      path: '/manual-payment/:paymentId/review',
      handler: 'manual-payment.reviewPayment',
      config: {
        policies: ['global::is-admin'],
        description: 'Review manual payment',
        tag: {
          plugin: 'manual-payment',
          name: 'Manual Payment',
          actionType: 'update'
        }
      }
    },

    // Get manual payment by ID
    {
      method: 'GET',
      path: '/manual-payment/:documentId',
      handler: 'manual-payment.findOne',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Get manual payment by ID',
        tag: {
          plugin: 'manual-payment',
          name: 'Manual Payment',
          actionType: 'find'
        }
      }
    },

    // Get manual payments by order
    {
      method: 'GET',
      path: '/manual-payment/order/:orderId',
      handler: 'manual-payment.getByOrder',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Get manual payments by order ID',
        tag: {
          plugin: 'manual-payment',
          name: 'Manual Payment',
          actionType: 'find'
        }
      }
    },

    // Cancel manual payment
    {
      method: 'POST',
      path: '/manual-payment/:paymentId/cancel',
      handler: 'manual-payment.cancelPayment',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Cancel manual payment',
        tag: {
          plugin: 'manual-payment',
          name: 'Manual Payment',
          actionType: 'update'
        }
      }
    },

    // Standard CRUD routes
    {
      method: 'GET',
      path: '/manual-payments',
      handler: 'manual-payment.find',
      config: {
        policies: ['global::is-admin'],
        description: 'Get all manual payments (admin only)',
        tag: {
          plugin: 'manual-payment',
          name: 'Manual Payment',
          actionType: 'find'
        }
      }
    },

    {
      method: 'PUT',
      path: '/manual-payments/:documentId',
      handler: 'manual-payment.update',
      config: {
        policies: ['global::is-admin'],
        description: 'Update manual payment (admin only)',
        tag: {
          plugin: 'manual-payment',
          name: 'Manual Payment',
          actionType: 'update'
        }
      }
    },

    {
      method: 'DELETE',
      path: '/manual-payments/:documentId',
      handler: 'manual-payment.delete',
      config: {
        policies: ['global::is-admin'],
        description: 'Delete manual payment (admin only)',
        tag: {
          plugin: 'manual-payment',
          name: 'Manual Payment',
          actionType: 'delete'
        }
      }
    }
  ]
}
