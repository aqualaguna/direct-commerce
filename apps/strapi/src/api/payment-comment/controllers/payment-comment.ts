/**
 * Payment comment Controller
 * 
 * Handles HTTP requests for payment comment and comments
 * following Strapi 5+ patterns
 */

import { Core } from "@strapi/strapi"

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Get payment comment with filtering and pagination
   */
  async find(ctx: any) {
    try {
      const { query } = ctx
      const filters = {
        manualPaymentId: query.manualPaymentId,
        type: query.type,
        authorId: query.authorId,
        isInternal: query.isInternal === 'true',
        search: query.search,
        page: parseInt(query.page) || 1,
        pageSize: parseInt(query.pageSize) || 25
      }

      const paymentCommentService = strapi.service('api::payment-comment.payment-comment')
      const result = await paymentCommentService.getPaymentComments(filters)

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      // Map type to commentType for API consistency
      const responseData = {
        ...result.data,
        data: result.data.data?.map((item: any) => ({
          ...item,
          commentType: item.type
        }))
      }
      return responseData
    } catch (error) {
      strapi.log.error('Error in payment comment find:', error)
      ctx.throw(500, 'Internal server error')
    }
  },

  /**
   * Get a single payment comment by ID
   */
  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params

      if (!documentId) {
        return ctx.badRequest('Payment comment ID is required')
      }

      const paymentCommentService = strapi.service('api::payment-comment.payment-comment')
      const result = await paymentCommentService.getPaymentComment(documentId)

      if (!result.success) {
        if (result.error === 'Payment comment not found') {
          return ctx.notFound(result.error)
        }
        return ctx.badRequest(result.error)
      }

      return result.data
    } catch (error) {
      strapi.log.error('Error in payment comment findOne:', error)
      ctx.throw(500, 'Internal server error')
    }
  },

  /**
   * Create a new payment comment
   */
  async create(ctx: any) {
    try {
      const { data } = ctx.request.body
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      if (!data) {
        return ctx.badRequest('Payment Comment data is required')
      }

      const commentData = {
        paymentId: data.payment,
        authorId: user.id,
        type: data.type || 'admin',
        content: data.content,
        isInternal: data.isInternal || false,
        metadata: data.metadata || {}
      }

      const paymentCommentService = strapi.service('api::payment-comment.payment-comment')
      const result = await paymentCommentService.createPaymentComment(commentData)

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      // Create audit log
      await paymentCommentService.createAuditLog('create', result.data.documentId, user.id, {
        type: commentData.type,
        isInternal: commentData.isInternal
      })

      return {
        data: result.data,
        meta: {
          message: 'Payment comment created successfully'
        }
      }
    } catch (error) {
      strapi.log.error('Error in payment comment create:', error)
      ctx.throw(500, 'Internal server error')
    }
  },

  /**
   * Update a payment comment
   */
  async update(ctx: any) {
    try {
      const { documentId } = ctx.params
      const { data } = ctx.request.body
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      if (!documentId) {
        return ctx.badRequest('Payment comment ID is required')
      }

      if (!data) {
        return ctx.badRequest('Update data is required')
      }

      const PaymentCommentService = strapi.service('api::payment-comment.payment-comment')
      const result = await PaymentCommentService.updatePaymentComment(documentId, data)

      if (!result.success) {
        if (result.error === 'Payment comment not found') {
          return ctx.notFound(result.error)
        }
        return ctx.badRequest(result.error)
      }

      // Create audit log
      await PaymentCommentService.createAuditLog('update', documentId, user.id, {
        updatedFields: Object.keys(data)
      })

      return result.data
    } catch (error) {
      strapi.log.error('Error in payment comment update:', error)
      ctx.throw(500, 'Internal server error')
    }
  },

  /**
   * Delete a payment comment
   */
  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      if (!documentId) {
        return ctx.badRequest('Payment comment ID is required')
      }

      const PaymentCommentService = strapi.service('api::payment-comment.payment-comment')
      const result = await PaymentCommentService.deletePaymentComment(documentId)

      if (!result.success) {
        if (result.error === 'Payment comment not found') {
          return ctx.notFound(result.error)
        }
        return ctx.badRequest(result.error)
      }

      // Create audit log
      await PaymentCommentService.createAuditLog('delete', documentId, user.id)

      return result.data
    } catch (error) {
      strapi.log.error('Error in payment comment delete:', error)
      ctx.throw(500, 'Internal server error')
    }
  },

  /**
   * Get comment for a specific payment
   */
  async getCommentsByPayment(ctx: any) {
    try {
      const { paymentId } = ctx.params
      const { query } = ctx
      const { user } = ctx.state

      if (!paymentId) {
        return ctx.badRequest('Payment ID is required')
      }

      // Only admins can see internal comments
      const includeInternal = user.role?.type === 'admin' && query.includeInternal === 'true'

      const PaymentCommentService = strapi.service('api::payment-comment.payment-comment')
      const result = await PaymentCommentService.getCommentsByPayment(paymentId, includeInternal)

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return result.data
    } catch (error) {
      strapi.log.error('Error in getCommentsByPayment:', error)
      ctx.throw(500, 'Internal server error')
    }
  },

  /**
   * Search payment comments
   */
  async search(ctx: any) {
    try {
      const { query } = ctx
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      const searchTerm = query.q || query.search
      if (!searchTerm) {
        return ctx.badRequest('Search term is required')
      }

      const filters = {
        paymentId: query.paymentId,
        type: query.type,
        authorId: query.authorId,
        isInternal: user.role?.type === 'admin' ? query.isInternal === 'true' : false
      }

      const PaymentCommentService = strapi.service('api::payment-comment.payment-comment')
      const result = await PaymentCommentService.searchPaymentComments(searchTerm, filters)

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return result.data
    } catch (error) {
      strapi.log.error('Error in payment comment search:', error)
      ctx.throw(500, 'Internal server error')
    }
  },

  /**
   * Get payment comment statistics
   */
  async getStatistics(ctx: any) {
    try {
      const { query } = ctx
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      // Only admins can access statistics
      if (user.role?.type !== 'admin') {
        return ctx.forbidden('Admin access required')
      }

      const paymentId = query.paymentId

      const PaymentCommentService = strapi.service('api::payment-comment.payment-comment')
      const result = await PaymentCommentService.getCommentStatistics(paymentId)

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return result.data
    } catch (error) {
      strapi.log.error('Error in getStatistics:', error)
      ctx.throw(500, 'Internal server error')
    }
  }
})
