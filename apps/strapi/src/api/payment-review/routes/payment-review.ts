/**
 * Payment Review Routes
 * 
 * API routes for payment review management following the story specifications
 */

export default {
  routes: [
    // Get review queue
    {
      method: 'GET',
      path: '/payment-review/queue',
      handler: 'payment-review.getQueue',
      config: {
        policies: ['global::is-admin'],
        description: 'Get payment review queue',
        tag: {
          plugin: 'payment-review',
          name: 'Payment Review',
          actionType: 'find'
        }
      }
    },

    // Get review statistics
    {
      method: 'GET',
      path: '/payment-review/stats',
      handler: 'payment-review.getStats',
      config: {
        policies: ['global::is-admin'],
        description: 'Get payment review statistics',
        tag: {
          plugin: 'payment-review',
          name: 'Payment Review',
          actionType: 'find'
        }
      }
    },

    // Assign review to admin
    {
      method: 'POST',
      path: '/payment-review/:reviewId/assign',
      handler: 'payment-review.assignReview',
      config: {
        policies: ['global::is-admin'],
        description: 'Assign review to admin',
        tag: {
          plugin: 'payment-review',
          name: 'Payment Review',
          actionType: 'update'
        }
      }
    },

    // Get reviews by reviewer
    {
      method: 'GET',
      path: '/payment-review/reviewer/:reviewerId',
      handler: 'payment-review.getByReviewer',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Get reviews by reviewer',
        tag: {
          plugin: 'payment-review',
          name: 'Payment Review',
          actionType: 'find'
        }
      }
    },

    // Get reviews by assigned admin
    {
      method: 'GET',
      path: '/payment-review/assigned/:assignedToId',
      handler: 'payment-review.getByAssigned',
      config: {
        policies: ['global::is-authenticated'],
        description: 'Get reviews by assigned admin',
        tag: {
          plugin: 'payment-review',
          name: 'Payment Review',
          actionType: 'find'
        }
      }
    },

    // Bulk update review status
    {
      method: 'POST',
      path: '/payment-review/bulk-update',
      handler: 'payment-review.bulkUpdateStatus',
      config: {
        policies: ['global::is-admin'],
        description: 'Bulk update review status',
        tag: {
          plugin: 'payment-review',
          name: 'Payment Review',
          actionType: 'update'
        }
      }
    },

    // Standard CRUD routes (admin only)
    {
      method: 'GET',
      path: '/payment-reviews',
      handler: 'payment-review.find',
      config: {
        policies: ['global::is-admin'],
        description: 'Get all payment reviews (admin only)',
        tag: {
          plugin: 'payment-review',
          name: 'Payment Review',
          actionType: 'find'
        }
      }
    },

    {
      method: 'GET',
      path: '/payment-reviews/:documentId',
      handler: 'payment-review.findOne',
      config: {
        policies: ['global::is-admin'],
        description: 'Get payment review by ID (admin only)',
        tag: {
          plugin: 'payment-review',
          name: 'Payment Review',
          actionType: 'find'
        }
      }
    },

    {
      method: 'POST',
      path: '/payment-reviews',
      handler: 'payment-review.create',
      config: {
        policies: ['global::is-admin'],
        description: 'Create payment review (admin only)',
        tag: {
          plugin: 'payment-review',
          name: 'Payment Review',
          actionType: 'create'
        }
      }
    },

    {
      method: 'PUT',
      path: '/payment-reviews/:documentId',
      handler: 'payment-review.update',
      config: {
        policies: ['global::is-admin'],
        description: 'Update payment review (admin only)',
        tag: {
          plugin: 'payment-review',
          name: 'Payment Review',
          actionType: 'update'
        }
      }
    },

    {
      method: 'DELETE',
      path: '/payment-reviews/:documentId',
      handler: 'payment-review.delete',
      config: {
        policies: ['global::is-admin'],
        description: 'Delete payment review (admin only)',
        tag: {
          plugin: 'payment-review',
          name: 'Payment Review',
          actionType: 'delete'
        }
      }
    }
  ]
}
