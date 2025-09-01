/**
 * Payment Review Controller
 * 
 * Handles payment review API endpoints following Strapi 5+ Document Service API patterns
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::payment-review.payment-review', ({ strapi }) => ({
  /**
   * Create payment review
   */
  async create(ctx) {
    try {
      const { data } = ctx.request.body
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      // Check if user is admin
      if (user.role.type !== 'admin') {
        return ctx.forbidden('Admin access required')
      }

      if (!data.manualPaymentId) {
        return ctx.badRequest('Manual payment ID is required')
      }

      const paymentReviewService = strapi.service('api::payment-review.payment-review')
      const result = await paymentReviewService.createPaymentReview({
        ...data,
        reviewerId: user.id
      })

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return ctx.created(result.data)
    } catch (error) {
      strapi.log.error('Error in create:', error)
      return ctx.internalServerError('Failed to create payment review')
    }
  },

  /**
   * Get review queue
   */
  async getQueue(ctx) {
    try {
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      // Check if user is admin
      if (user.role.type !== 'admin') {
        return ctx.forbidden('Admin access required')
      }

      const { status, priority, assignedToId, dueDate, page = 1, pageSize = 25 } = ctx.query

      const filters: any = {}
      if (status) filters.status = status as string
      if (priority) filters.priority = priority as string
      if (assignedToId) filters.assignedToId = assignedToId as string
      if (dueDate) filters.dueDate = new Date(dueDate as string)

      const paymentReviewService = strapi.service('api::payment-review.payment-review')
      const result = await paymentReviewService.getReviewQueue(filters, parseInt(page as string), parseInt(pageSize as string))

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return ctx.ok(result.data)
    } catch (error) {
      strapi.log.error('Error in getQueue:', error)
      return ctx.internalServerError('Failed to get review queue')
    }
  },

  /**
   * Get review statistics
   */
  async getStats(ctx) {
    try {
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      // Check if user is admin
      if (user.role.type !== 'admin') {
        return ctx.forbidden('Admin access required')
      }

      const paymentReviewService = strapi.service('api::payment-review.payment-review')
      const result = await paymentReviewService.getReviewStats()

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return ctx.ok(result.data)
    } catch (error) {
      strapi.log.error('Error in getStats:', error)
      return ctx.internalServerError('Failed to get review statistics')
    }
  },

  /**
   * Assign review to admin
   */
  async assignReview(ctx) {
    try {
      const { reviewId } = ctx.params
      const { data } = ctx.request.body
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      // Check if user is admin
      if (user.role.type !== 'admin') {
        return ctx.forbidden('Admin access required')
      }

      if (!reviewId) {
        return ctx.badRequest('Review ID is required')
      }

      if (!data.assignedToId) {
        return ctx.badRequest('Assigned to ID is required')
      }

      const paymentReviewService = strapi.service('api::payment-review.payment-review')
      const result = await paymentReviewService.assignReview(reviewId, data.assignedToId)

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return ctx.ok(result.data)
    } catch (error) {
      strapi.log.error('Error in assignReview:', error)
      return ctx.internalServerError('Failed to assign review')
    }
  },

  /**
   * Get reviews by reviewer
   */
  async getByReviewer(ctx) {
    try {
      const { reviewerId } = ctx.params
      const { status } = ctx.query
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      // Check if user is admin or the reviewer
      if (user.role.type !== 'admin' && user.id !== reviewerId) {
        return ctx.forbidden('Access denied')
      }

      const paymentReviewService = strapi.service('api::payment-review.payment-review')
      const result = await paymentReviewService.getReviewsByReviewer(reviewerId, status)

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return ctx.ok(result.data)
    } catch (error) {
      strapi.log.error('Error in getByReviewer:', error)
      return ctx.internalServerError('Failed to get reviews by reviewer')
    }
  },

  /**
   * Get reviews by assigned admin
   */
  async getByAssigned(ctx) {
    try {
      const { assignedToId } = ctx.params
      const { status } = ctx.query
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      // Check if user is admin or the assigned admin
      if (user.role.type !== 'admin' && user.id !== assignedToId) {
        return ctx.forbidden('Access denied')
      }

      const paymentReviewService = strapi.service('api::payment-review.payment-review')
      const result = await paymentReviewService.getReviewsByAssigned(assignedToId, status)

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return ctx.ok(result.data)
    } catch (error) {
      strapi.log.error('Error in getByAssigned:', error)
      return ctx.internalServerError('Failed to get reviews by assigned')
    }
  },

  /**
   * Bulk update review status
   */
  async bulkUpdateStatus(ctx) {
    try {
      const { data } = ctx.request.body
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      // Check if user is admin
      if (user.role.type !== 'admin') {
        return ctx.forbidden('Admin access required')
      }

      if (!data.reviewIds || !Array.isArray(data.reviewIds) || data.reviewIds.length === 0) {
        return ctx.badRequest('Review IDs array is required')
      }

      if (!data.status || !['pending', 'approved', 'rejected', 'requires_info'].includes(data.status)) {
        return ctx.badRequest('Valid status is required')
      }

      const paymentReviewService = strapi.service('api::payment-review.payment-review')
      const result = await paymentReviewService.bulkUpdateReviewStatus(
        data.reviewIds,
        data.status,
        user.id
      )

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return ctx.ok(result.data)
    } catch (error) {
      strapi.log.error('Error in bulkUpdateStatus:', error)
      return ctx.internalServerError('Failed to bulk update review status')
    }
  },

  /**
   * Update payment review
   */
  async update(ctx) {
    try {
      const { documentId } = ctx.params
      const { data } = ctx.request.body
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      // Check if user is admin
      if (user.role.type !== 'admin') {
        return ctx.forbidden('Admin access required')
      }

      if (!documentId) {
        return ctx.badRequest('Review ID is required')
      }

      const paymentReviewService = strapi.service('api::payment-review.payment-review')
      const result = await paymentReviewService.updatePaymentReview(documentId, {
        ...data,
        reviewerId: user.id
      })

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return ctx.ok(result.data)
    } catch (error) {
      strapi.log.error('Error in update:', error)
      return ctx.internalServerError('Failed to update payment review')
    }
  },

  /**
   * Get payment review by ID
   */
  async findOne(ctx) {
    try {
      const { documentId } = ctx.params
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      // Check if user is admin
      if (user.role.type !== 'admin') {
        return ctx.forbidden('Admin access required')
      }

      if (!documentId) {
        return ctx.badRequest('Review ID is required')
      }

      const review = await strapi.documents('api::payment-review.payment-review').findOne({
        documentId,
        populate: ['manualPayment', 'reviewer', 'assignedTo']
      })

      if (!review) {
        return ctx.notFound('Payment review not found')
      }

      return ctx.ok(review)
    } catch (error) {
      strapi.log.error('Error in findOne:', error)
      return ctx.internalServerError('Failed to get payment review')
    }
  }
}))
