/**
 * Payment Review Service
 * 
 * Handles payment review management for admin approval workflow
 * following Strapi 5+ Document Service API patterns
 */

interface PaymentReviewData {
  manualPaymentId: string
  reviewerId: string
  status: 'pending' | 'approved' | 'rejected' | 'requires_info'
  reviewNotes?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  assignedToId?: string
  dueDate?: Date
  tags?: string[]
}

interface PaymentReviewResult {
  success: boolean
  data?: any
  error?: string
}

interface ReviewQueueFilters {
  status?: string
  priority?: string
  assignedToId?: string
  dueDate?: Date
  tags?: string[]
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Create payment review
   */
  async createPaymentReview(data: PaymentReviewData): Promise<PaymentReviewResult> {
    try {
      // Validate required fields
      if (!data.manualPaymentId || !data.reviewerId) {
        return {
          success: false,
          error: 'Manual payment ID and reviewer ID are required'
        }
      }

      // Check if manual payment exists
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

      // Check if payment is in pending status
      if (manualPayment.status !== 'pending') {
        return {
          success: false,
          error: 'Payment is not in pending status'
        }
      }

      // Check if review already exists
      const existingReview = await strapi.documents('api::payment-review.payment-review').findFirst({
        filters: {
          manualPayment: data.manualPaymentId,
          status: 'pending'
        }
      })

      if (existingReview) {
        return {
          success: false,
          error: 'Payment review already exists'
        }
      }

      // Create review history
      const reviewHistory = [
        {
          action: 'created',
          timestamp: new Date().toISOString(),
          reviewer: data.reviewerId,
          notes: 'Review created'
        }
      ]

      const paymentReview = await strapi.documents('api::payment-review.payment-review').create({
        data: {
          manualPayment: data.manualPaymentId,
          reviewer: data.reviewerId,
          status: data.status || 'pending',
          reviewNotes: data.reviewNotes,
          priority: data.priority || 'normal',
          assignedTo: data.assignedToId,
          dueDate: data.dueDate,
          reviewHistory,
          tags: data.tags || [],
          populate: ['manualPayment', 'reviewer', 'assignedTo']
        }
      })

      return {
        success: true,
        data: paymentReview
      }
    } catch (error) {
      strapi.log.error('Error creating payment review:', error)
      return {
        success: false,
        error: 'Failed to create payment review'
      }
    }
  },

  /**
   * Update payment review
   */
  async updatePaymentReview(reviewId: string, data: Partial<PaymentReviewData>): Promise<PaymentReviewResult> {
    try {
      // Get current review
      const currentReview = await strapi.documents('api::payment-review.payment-review').findOne({
        documentId: reviewId,
        populate: ['manualPayment', 'reviewer', 'assignedTo']
      })

      if (!currentReview) {
        return {
          success: false,
          error: 'Payment review not found'
        }
      }

      // Update review history
      const reviewHistory = currentReview.reviewHistory || []
      reviewHistory.push({
        action: 'updated',
        timestamp: new Date().toISOString(),
        reviewer: data.reviewerId || currentReview.reviewer.documentId,
        notes: data.reviewNotes || 'Review updated',
        previousStatus: currentReview.status,
        newStatus: data.status
      })

      const updateData: any = {
        reviewHistory
      }

      if (data.status) {
        updateData.status = data.status
        updateData.reviewedAt = new Date()
        
        // Calculate review duration if status is changing from pending
        if (currentReview.status === 'pending' && data.status !== 'pending') {
          const startTime = new Date(currentReview.createdAt)
          const endTime = new Date()
          const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
          updateData.reviewDuration = durationMinutes
        }
      }

      if (data.reviewNotes) {
        updateData.reviewNotes = data.reviewNotes
      }

      if (data.priority) {
        updateData.priority = data.priority
      }

      if (data.assignedToId) {
        updateData.assignedTo = data.assignedToId
      }

      if (data.dueDate) {
        updateData.dueDate = data.dueDate
      }

      if (data.tags) {
        updateData.tags = data.tags
      }

      const paymentReview = await strapi.documents('api::payment-review.payment-review').update({
        documentId: reviewId,
        data: updateData,
        populate: ['manualPayment', 'reviewer', 'assignedTo']
      })

      return {
        success: true,
        data: paymentReview
      }
    } catch (error) {
      strapi.log.error('Error updating payment review:', error)
      return {
        success: false,
        error: 'Failed to update payment review'
      }
    }
  },

  /**
   * Get review queue with filters
   */
  async getReviewQueue(filters: ReviewQueueFilters = {}, page: number = 1, pageSize: number = 25): Promise<PaymentReviewResult> {
    try {
      const queryFilters: any = {}

      if (filters.status) {
        queryFilters.status = filters.status
      } else {
        queryFilters.status = 'pending' // Default to pending reviews
      }

      if (filters.priority) {
        queryFilters.priority = filters.priority
      }

      if (filters.assignedToId) {
        queryFilters.assignedTo = filters.assignedToId
      }

      if (filters.dueDate) {
        queryFilters.dueDate = {
          $lte: filters.dueDate
        }
      }

      const reviews = await strapi.documents('api::payment-review.payment-review').findMany({
        filters: queryFilters,
        populate: ['manualPayment', 'reviewer', 'assignedTo'],
        sort: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'asc' }
        ],
        pagination: {
          page,
          pageSize
        }
      })

      return {
        success: true,
        data: reviews
      }
    } catch (error) {
      strapi.log.error('Error getting review queue:', error)
      return {
        success: false,
        error: 'Failed to get review queue'
      }
    }
  },

  /**
   * Get review statistics
   */
  async getReviewStats(): Promise<PaymentReviewResult> {
    try {
      const totalReviews = await strapi.documents('api::payment-review.payment-review').count()
      const pendingReviews = await strapi.documents('api::payment-review.payment-review').count({
        status: 'pending'
      })
      const approvedReviews = await strapi.documents('api::payment-review.payment-review').count({
        status: 'approved'
      })
      const rejectedReviews = await strapi.documents('api::payment-review.payment-review').count({
        status: 'rejected'
      })
      const requiresInfoReviews = await strapi.documents('api::payment-review.payment-review').count({
        status: 'requires_info'
      })

      // Get overdue reviews
      const overdueReviews = await strapi.documents('api::payment-review.payment-review').count({
        status: 'pending',
        dueDate: {
          $lt: new Date()
        }
      })

      // Get average review duration
      const completedReviews = await strapi.documents('api::payment-review.payment-review').findMany({
        filters: {
          status: { $in: ['approved', 'rejected'] },
          reviewDuration: { $notNull: true }
        },
        fields: ['reviewDuration']
      })

      const totalDuration = completedReviews.reduce((sum, review) => sum + (review.reviewDuration || 0), 0)
      const averageDuration = completedReviews.length > 0 ? Math.round(totalDuration / completedReviews.length) : 0

      return {
        success: true,
        data: {
          total: totalReviews,
          pending: pendingReviews,
          approved: approvedReviews,
          rejected: rejectedReviews,
          requiresInfo: requiresInfoReviews,
          overdue: overdueReviews,
          averageDurationMinutes: averageDuration
        }
      }
    } catch (error) {
      strapi.log.error('Error getting review stats:', error)
      return {
        success: false,
        error: 'Failed to get review statistics'
      }
    }
  },

  /**
   * Assign review to admin
   */
  async assignReview(reviewId: string, assignedToId: string): Promise<PaymentReviewResult> {
    try {
      const review = await strapi.documents('api::payment-review.payment-review').findOne({
        documentId: reviewId
      })

      if (!review) {
        return {
          success: false,
          error: 'Payment review not found'
        }
      }

      if (review.status !== 'pending') {
        return {
          success: false,
          error: 'Only pending reviews can be assigned'
        }
      }

      const updatedReview = await strapi.documents('api::payment-review.payment-review').update({
        documentId: reviewId,
        data: {
          assignedTo: assignedToId
        },
        populate: ['manualPayment', 'reviewer', 'assignedTo']
      })

      return {
        success: true,
        data: updatedReview
      }
    } catch (error) {
      strapi.log.error('Error assigning review:', error)
      return {
        success: false,
        error: 'Failed to assign review'
      }
    }
  },

  /**
   * Get reviews by reviewer
   */
  async getReviewsByReviewer(reviewerId: string, status?: string): Promise<PaymentReviewResult> {
    try {
      const filters: any = {
        reviewer: reviewerId
      }

      if (status) {
        filters.status = status
      }

      const reviews = await strapi.documents('api::payment-review.payment-review').findMany({
        filters,
        populate: ['manualPayment', 'assignedTo'],
        sort: { createdAt: 'desc' }
      })

      return {
        success: true,
        data: reviews
      }
    } catch (error) {
      strapi.log.error('Error getting reviews by reviewer:', error)
      return {
        success: false,
        error: 'Failed to get reviews by reviewer'
      }
    }
  },

  /**
   * Get reviews by assigned admin
   */
  async getReviewsByAssigned(assignedToId: string, status?: string): Promise<PaymentReviewResult> {
    try {
      const filters: any = {
        assignedTo: assignedToId
      }

      if (status) {
        filters.status = status
      }

      const reviews = await strapi.documents('api::payment-review.payment-review').findMany({
        filters,
        populate: ['manualPayment', 'reviewer'],
        sort: [
          { priority: 'desc' },
          { dueDate: 'asc' }
        ]
      })

      return {
        success: true,
        data: reviews
      }
    } catch (error) {
      strapi.log.error('Error getting reviews by assigned:', error)
      return {
        success: false,
        error: 'Failed to get reviews by assigned'
      }
    }
  },

  /**
   * Bulk update review status
   */
  async bulkUpdateReviewStatus(reviewIds: string[], status: string, reviewerId: string): Promise<PaymentReviewResult> {
    try {
      const results = []
      const errors = []

      for (const reviewId of reviewIds) {
        try {
          const result = await this.updatePaymentReview(reviewId, {
            status: status as any,
            reviewerId
          })

          if (result.success) {
            results.push(result.data)
          } else {
            errors.push({ reviewId, error: result.error })
          }
        } catch (error) {
          errors.push({ reviewId, error: 'Failed to update review' })
        }
      }

      return {
        success: errors.length === 0,
        data: {
          updated: results,
          errors
        },
        error: errors.length > 0 ? `${errors.length} reviews failed to update` : undefined
      }
    } catch (error) {
      strapi.log.error('Error in bulk update review status:', error)
      return {
        success: false,
        error: 'Failed to bulk update review status'
      }
    }
  }
})
