/**
 * Payment comment Controller
 * 
 * Handles HTTP requests for payment comment and comments
 * following Strapi 5+ patterns
 */

import { Core } from "@strapi/strapi"
import { UserType } from "../../../../config/constant"

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Get payment comment with filtering and pagination
   */
  async find(ctx: any) {
    try {
      const { query } = ctx
      const { user } = ctx.state

      // Validate query parameters
      const validationService = strapi.service('api::payment-comment.validation')
      const queryValidation = await validationService.validateQueryParams(query)
      
      if (!queryValidation.isValid) {
        return ctx.badRequest(queryValidation.errors.join(', '))
      }

      // Sanitize and normalize filters
      const sanitizedFilters = validationService.sanitizeFilters(query)
      const filters = {
        ...((query.filters as Record<string, any>) || {}),
        type: sanitizedFilters.type,
        ...(sanitizedFilters.paymentId && { payment: { documentId: sanitizedFilters.paymentId } }),
        ...(sanitizedFilters.authorId && { author: { documentId: sanitizedFilters.authorId } }),
        isInternal: sanitizedFilters.isInternal,
        page: sanitizedFilters.page || 1,
        pageSize: sanitizedFilters.pageSize || 25,
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
      return {
        data: responseData,
        meta: {
          message: 'Payment comment retrieved successfully'
        }
      }
    } catch (error) {
      strapi.log.error('Error in payment comment find:', error)
      return ctx.internalServerError('Failed to get payment comments', { error: error.message })
    }
  },

  /**
   * Get a single payment comment by ID
   */
  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params

      // Validate comment ID
      const validationService = strapi.service('api::payment-comment.validation')
      const idValidation = await validationService.validateCommentId(documentId)
      
      if (!idValidation.isValid) {
        return ctx.badRequest(idValidation.errors.join(', '))
      }

      const paymentCommentService = strapi.service('api::payment-comment.payment-comment')
      const result = await paymentCommentService.getPaymentComment(documentId)

      if (!result.success) {
        if (result.error === 'Payment comment not found') {
          return ctx.notFound(result.error)
        }
        return ctx.badRequest(result.error)
      }

      return {
        data: result.data,
        meta: {
          message: 'Payment comment retrieved successfully'
        }
      }
    } catch (error) {
      strapi.log.error('Error in payment comment findOne:', error)
      return ctx.internalServerError('Failed to get payment comment', { error: error.message })
    }
  },

  /**
   * Create a new payment comment
   */
  async create(ctx: any) {
    try {
      const { data } = ctx.request.body
      const { user } = ctx.state

      // Validate request body
      const validationService = strapi.service('api::payment-comment.validation')
      const bodyValidation = await validationService.validateRequestBody(data)
      
      if (!bodyValidation.isValid) {
        return ctx.badRequest(bodyValidation.errors.join(', '))
      }

      // Sanitize and validate comment data
      const sanitizedData = validationService.sanitizeCommentData(data)
      const commentValidation = await validationService.validateCreateComment(sanitizedData, user.id)
      
      if (!commentValidation.isValid) {
        return ctx.badRequest(commentValidation.errors.join(', '))
      }

      // Validate payment exists
      const paymentValidation = await validationService.validatePaymentExists(sanitizedData.payment)
      if (!paymentValidation.isValid) {
        return ctx.badRequest(paymentValidation.errors.join(', '))
      }

      const commentData = {
        paymentId: sanitizedData.payment,
        authorId: user.id,
        type: sanitizedData.type || 'admin',
        content: sanitizedData.content,
        isInternal: sanitizedData.isInternal || false,
        metadata: sanitizedData.metadata || {},
        attachments: sanitizedData.attachments || []
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
      return ctx.internalServerError('Failed to create payment comment', { error: error.message })
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

      // Validate comment ID
      const validationService = strapi.service('api::payment-comment.validation')
      const idValidation = await validationService.validateCommentId(documentId)
      
      if (!idValidation.isValid) {
        return ctx.badRequest(idValidation.errors.join(', '))
      }

      // Validate request body
      const bodyValidation = await validationService.validateRequestBody(data)
      if (!bodyValidation.isValid) {
        return ctx.badRequest(bodyValidation.errors.join(', '))
      }

      // Validate update data
      const updateValidation = await validationService.validateUpdateComment(data)
      if (!updateValidation.isValid) {
        return ctx.badRequest(updateValidation.errors.join(', '))
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

      return {
        data: result.data,
        meta: {
          message: 'Payment comment updated successfully'
        }
      }
    } catch (error) {
      strapi.log.error('Error in payment comment update:', error)
      return ctx.internalServerError('Failed to update payment comment', { error: error.message })
    }
  },

  /**
   * Delete a payment comment
   */
  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params
      const { user } = ctx.state

      // Validate comment ID
      const validationService = strapi.service('api::payment-comment.validation')
      const idValidation = await validationService.validateCommentId(documentId)
      
      if (!idValidation.isValid) {
        return ctx.badRequest(idValidation.errors.join(', '))
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

      return {
        data: result.data,
        meta: {
          message: 'Payment comment deleted successfully'
        }
      }
    } catch (error) {
      strapi.log.error('Error in payment comment delete:', error)
      return ctx.internalServerError('Failed to delete payment comment', { error: error.message })
    }
  },

  /**
   * Get comment for a specific payment
   */
  async getCommentsByPayment(ctx: any) {
    try {
      const { paymentId } = ctx.params
      const { query } = ctx
      const { user, userType } = ctx.state

      // Validate payment ID
      const validationService = strapi.service('api::payment-comment.validation')
      const paymentIdValidation = await validationService.validatePaymentId(paymentId)
      
      if (!paymentIdValidation.isValid) {
        return ctx.badRequest(paymentIdValidation.errors.join(', '))
      }

      // Validate query parameters
      const queryValidation = await validationService.validateQueryParams(query)
      if (!queryValidation.isValid) {
        return ctx.badRequest(queryValidation.errors.join(', '))
      }

      // Validate payment access
      const accessValidation = await validationService.validatePaymentAccess(paymentId, user.id, user.role?.type)
      if (!accessValidation.isValid) {
        return ctx.forbidden(accessValidation.errors.join(', '))
      }

      // Validate internal comment access
      const includeInternal = query.includeInternal === 'true'
      const internalAccessValidation = await validationService.validateInternalCommentAccess(user.role?.type, includeInternal)
      if (!internalAccessValidation.isValid) {
        return ctx.forbidden(internalAccessValidation.errors.join(', '))
      }

      const PaymentCommentService = strapi.service('api::payment-comment.payment-comment')
      const result = await PaymentCommentService.getCommentsByPayment(paymentId, includeInternal)

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return {
        data: result.data,
        meta: {
          message: 'Payment comment retrieved successfully'
        }
      }
    } catch (error) {
      strapi.log.error('Error in getCommentsByPayment:', error)
      return ctx.internalServerError('Failed to get payment comments', { error: error.message })
    }
  },

  /**
   * Get payment comment statistics
   */
  async getStatistics(ctx: any) {
    try {
      const { query } = ctx

      // Validate query parameters
      const validationService = strapi.service('api::payment-comment.validation')
      const queryValidation = await validationService.validateQueryParams(query)
      
      if (!queryValidation.isValid) {
        return ctx.badRequest(queryValidation.errors.join(', '))
      }

      const paymentId = query.paymentId

      // Validate payment ID if provided
      if (paymentId) {
        const paymentIdValidation = await validationService.validatePaymentId(paymentId)
        if (!paymentIdValidation.isValid) {
          return ctx.badRequest(paymentIdValidation.errors.join(', '))
        }
      }

      const PaymentCommentService = strapi.service('api::payment-comment.payment-comment')
      const result = await PaymentCommentService.getCommentStatistics(paymentId)

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return {
        data: result.data,
        meta: {
          message: 'Payment comment statistics retrieved successfully'
        }
      }
    } catch (error) {
      strapi.log.error('Error in getStatistics:', error)
      return ctx.internalServerError('Failed to retrieve payment comment statistics', { error: error.message })
    }
  }
})
