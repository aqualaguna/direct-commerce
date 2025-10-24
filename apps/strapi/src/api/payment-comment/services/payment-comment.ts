/**
 * Payment comment Service
 * 
 * Handles payment comment and comments for manual payments
 * following Strapi 5+ Document Service API patterns
 */

interface PaymentCommentData {
  paymentId: string
  authorId: string
  type: 'customer' | 'admin' | 'system' | 'gateway'
  content: string
  isInternal?: boolean
  metadata?: any
  attachments?: string[]
}

interface PaymentCommentResult {
  success: boolean
  data?: any
  error?: string
}

interface PaymentCommentFilters {
  paymentId?: string
  type?: string
  authorId?: string
  isInternal?: boolean
  search?: string
  page?: number
  pageSize?: number
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Create a new payment comment
   */
  async createPaymentComment(data: PaymentCommentData): Promise<PaymentCommentResult> {
    try {
      // Validate required fields
      if (!data.paymentId || !data.authorId || !data.content) {
        return {
          success: false,
          error: 'Manual payment ID, author ID, and content are required'
        }
      }

      // Check if manual payment exists
      const manualPayment = await strapi.documents('api::payment.payment').findOne({
        documentId: data.paymentId
      })

      if (!manualPayment) {
        return {
          success: false,
          error: 'Manual payment not found'
        }
      }

      // Create payment comment
      const PaymentComment = await strapi.documents('api::payment-comment.payment-comment').create({
        data: {
          payment: data.paymentId,
          author: data.authorId,
          type: data.type || 'admin',
          content: data.content,
          isInternal: data.isInternal || false,
          metadata: data.metadata || {},
          attachments: data.attachments || []
        },
        populate: ['payment', 'author', 'attachments']
      })

      // Send notification if comment is not internal
      if (!data.isInternal) {
        await this.sendCommentNotification(PaymentComment)
      }

      return {
        success: true,
        data: PaymentComment
      }
    } catch (error) {
      strapi.log.error('Error creating payment comment:', error)
      return {
        success: false,
        error: 'Failed to create payment comment'
      }
    }
  },

  /**
   * Get payment comment with filtering and pagination
   */
  async getPaymentComments(filters: PaymentCommentFilters = {}): Promise<PaymentCommentResult> {
    try {
      const queryFilters: any = {...filters}
      delete queryFilters.page
      delete queryFilters.pageSize

      // delete undefined or null values
      Object.keys(queryFilters).forEach(key => {
        if (queryFilters[key] === undefined || queryFilters[key] === null) {
          delete queryFilters[key]
        }
      })

     

      const pagination = {
        page: Math.max(1, filters.page || 1),
        pageSize: Math.min(Math.max(1, filters.pageSize || 25), 100)
      }
      console.log(queryFilters)

      const paymentcomment = await strapi.documents('api::payment-comment.payment-comment').findMany({
        filters: queryFilters,
        sort: 'createdAt:desc',
        limit: pagination.pageSize,
        start: (pagination.page - 1) * pagination.pageSize,
        populate: ['payment', 'author', 'attachments']
      })

     

      return {
        success: true,
        data: {
          comments: paymentcomment,
          pagination: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: paymentcomment.length
          }
        }
      }
    } catch (error) {
      strapi.log.error('Error getting payment comments:', error)
      return {
        success: false,
        error: 'Failed to get payment comments'
      }
    }
  },

  /**
   * Get payment comment by ID
   */
  async getPaymentComment(commentId: string): Promise<PaymentCommentResult> {
    try {
      const PaymentComment = await strapi.documents('api::payment-comment.payment-comment').findOne({
        documentId: commentId,
        populate: ['payment', 'author', 'attachments']
      })

      if (!PaymentComment) {
        return {
          success: false,
          error: 'Payment comment not found'
        }
      }

      return {
        success: true,
        data: PaymentComment
      }
    } catch (error) {
      strapi.log.error('Error getting payment comment:', error)
      return {
        success: false,
        error: 'Failed to get payment comment'
      }
    }
  },

  /**
   * Update payment comment
   */
  async updatePaymentComment(commentId: string, data: Partial<PaymentCommentData>): Promise<PaymentCommentResult> {
    try {
      const existingComment = await strapi.documents('api::payment-comment.payment-comment').findOne({
        documentId: commentId
      })

      if (!existingComment) {
        return {
          success: false,
          error: 'Payment comment not found'
        }
      }

      const updateData: any = {}
      if (data.content !== undefined) updateData.content = data.content
      if (data.type !== undefined) updateData.type = data.type
      if (data.isInternal !== undefined) updateData.isInternal = data.isInternal
      if (data.metadata !== undefined) updateData.metadata = data.metadata
      if (data.attachments !== undefined) updateData.attachments = data.attachments

      const updatedComment = await strapi.documents('api::payment-comment.payment-comment').update({
        documentId: commentId,
        data: updateData,
        populate: ['payment', 'author', 'attachments']
      })

      return {
        success: true,
        data: updatedComment
      }
    } catch (error) {
      strapi.log.error('Error updating payment comment:', error)
      return {
        success: false,
        error: 'Failed to update payment comment'
      }
    }
  },

  /**
   * Delete payment comment
   */
  async deletePaymentComment(commentId: string): Promise<PaymentCommentResult> {
    try {
      const existingComment = await strapi.documents('api::payment-comment.payment-comment').findOne({
        documentId: commentId
      })

      if (!existingComment) {
        return {
          success: false,
          error: 'Payment comment not found'
        }
      }

      await strapi.documents('api::payment-comment.payment-comment').delete({
        documentId: commentId
      })

      return {
        success: true,
        data: { message: 'Payment comment deleted successfully' }
      }
    } catch (error) {
      strapi.log.error('Error deleting payment comment:', error)
      return {
        success: false,
        error: 'Failed to delete payment comment'
      }
    }
  },

  /**
   * Get comment for a specific manual payment
   */
  async getCommentsByPayment(paymentId: string, includeInternal: boolean = false): Promise<PaymentCommentResult> {
    try {
      const filters: any = {
        payment: {documentId: paymentId}
      }

      if (!includeInternal) {
        filters.isInternal = false
      }

      const comment = await strapi.documents('api::payment-comment.payment-comment').findMany({
        filters,
        sort: 'createdAt:desc',
        populate: ['author', 'payment', 'attachments']
      })

      return {
        success: true,
        data: comment
      }
    } catch (error) {
      strapi.log.error('Error getting comment by payment:', error)
      return {
        success: false,
        error: 'Failed to get comment by payment'
      }
    }
  },

  /**
   * Get comment statistics
   */
  async getCommentStatistics(paymentId?: string): Promise<PaymentCommentResult> {
    try {
      const filters: any = {}
      if (paymentId) {
        filters.payment = paymentId
      }

      const allcomment = await strapi.documents('api::payment-comment.payment-comment').findMany({
        filters,
        fields: ['type', 'isInternal', 'createdAt']
      })

      const stats = {
        total: allcomment.length,
        byType: {
          customer: 0,
          admin: 0,
          system: 0,
          gateway: 0
        },
        internal: 0,
        external: 0,
        recentComments: 0 // comment created in last 7 days
      }

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      allcomment.forEach((comment: any) => {
        stats.byType[comment.type as keyof typeof stats.byType]++
        
        if (comment.isInternal) {
          stats.internal++
        } else {
          stats.external++
        }

        if (new Date(comment.createdAt) > sevenDaysAgo) {
          stats.recentComments++
        }
      })

      return {
        success: true,
        data: stats
      }
    } catch (error) {
      strapi.log.error('Error getting comment statistics:', error)
      return {
        success: false,
        error: 'Failed to get comment statistics'
      }
    }
  },

  /**
   * Send notification for new comment
   */
  async sendCommentNotification(PaymentComment: any): Promise<void> {
    try {
      // This would integrate with the notification system
      // For now, we'll just log the notification
      strapi.log.info('Payment comment notification:', {
        commentId: PaymentComment.documentId,
        paymentId: PaymentComment.payment?.documentId,
        author: PaymentComment.author?.username,
        type: PaymentComment.type,
        isInternal: PaymentComment.isInternal
      })
    } catch (error) {
      strapi.log.error('Error sending comment notification:', error)
    }
  },

  /**
   * Create audit log entry for comment operations
   */
  async createAuditLog(action: string, commentId: string, userId: string, details?: any): Promise<void> {
    try {
      // This would integrate with the audit logging system
      strapi.log.info('Payment comment audit log:', {
        action,
        commentId,
        userId,
        timestamp: new Date().toISOString(),
        details
      })
    } catch (error) {
      strapi.log.error('Error creating audit log:', error)
    }
  }
})
