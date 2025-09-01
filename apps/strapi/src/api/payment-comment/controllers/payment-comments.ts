/**
 * Payment Notes Controller
 * 
 * Handles HTTP requests for payment notes and comments
 * following Strapi 5+ patterns
 */

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Get payment notes with filtering and pagination
   */
  async find(ctx: any) {
    try {
      const { query } = ctx
      const filters = {
        manualPaymentId: query.manualPaymentId,
        noteType: query.noteType,
        authorId: query.authorId,
        isInternal: query.isInternal === 'true',
        search: query.search,
        page: parseInt(query.page) || 1,
        pageSize: parseInt(query.pageSize) || 25
      }

      const paymentNotesService = strapi.service('api::payment-comment.payment-comment')
      const result = await paymentNotesService.getPaymentNotes(filters)

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return result.data
    } catch (error) {
      strapi.log.error('Error in payment notes find:', error)
      ctx.throw(500, 'Internal server error')
    }
  },

  /**
   * Get a single payment note by ID
   */
  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params

      if (!documentId) {
        return ctx.badRequest('Payment note ID is required')
      }

      const paymentNotesService = strapi.service('api::payment-comment.payment-comment')
      const result = await paymentNotesService.getPaymentNote(documentId)

      if (!result.success) {
        if (result.error === 'Payment note not found') {
          return ctx.notFound(result.error)
        }
        return ctx.badRequest(result.error)
      }

      return result.data
    } catch (error) {
      strapi.log.error('Error in payment notes findOne:', error)
      ctx.throw(500, 'Internal server error')
    }
  },

  /**
   * Create a new payment note
   */
  async create(ctx: any) {
    try {
      const { data } = ctx.request.body
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      if (!data) {
        return ctx.badRequest('Note data is required')
      }

      const noteData = {
        manualPaymentId: data.manualPaymentId,
        authorId: user.id,
        noteType: data.noteType || 'admin',
        content: data.content,
        isInternal: data.isInternal || false,
        metadata: data.metadata || {}
      }

      const paymentNotesService = strapi.service('api::payment-comment.payment-comment')
      const result = await paymentNotesService.createPaymentNote(noteData)

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      // Create audit log
      await paymentNotesService.createAuditLog('create', result.data.documentId, user.id, {
        noteType: noteData.noteType,
        isInternal: noteData.isInternal
      })

      return result.data
    } catch (error) {
      strapi.log.error('Error in payment notes create:', error)
      ctx.throw(500, 'Internal server error')
    }
  },

  /**
   * Update a payment note
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
        return ctx.badRequest('Payment note ID is required')
      }

      if (!data) {
        return ctx.badRequest('Update data is required')
      }

      const paymentNotesService = strapi.service('api::payment-comment.payment-comment')
      const result = await paymentNotesService.updatePaymentNote(documentId, data)

      if (!result.success) {
        if (result.error === 'Payment note not found') {
          return ctx.notFound(result.error)
        }
        return ctx.badRequest(result.error)
      }

      // Create audit log
      await paymentNotesService.createAuditLog('update', documentId, user.id, {
        updatedFields: Object.keys(data)
      })

      return result.data
    } catch (error) {
      strapi.log.error('Error in payment notes update:', error)
      ctx.throw(500, 'Internal server error')
    }
  },

  /**
   * Delete a payment note
   */
  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      if (!documentId) {
        return ctx.badRequest('Payment note ID is required')
      }

      const paymentNotesService = strapi.service('api::payment-comment.payment-comment')
      const result = await paymentNotesService.deletePaymentNote(documentId)

      if (!result.success) {
        if (result.error === 'Payment note not found') {
          return ctx.notFound(result.error)
        }
        return ctx.badRequest(result.error)
      }

      // Create audit log
      await paymentNotesService.createAuditLog('delete', documentId, user.id)

      return result.data
    } catch (error) {
      strapi.log.error('Error in payment notes delete:', error)
      ctx.throw(500, 'Internal server error')
    }
  },

  /**
   * Get notes for a specific manual payment
   */
  async getNotesByPayment(ctx: any) {
    try {
      const { paymentId } = ctx.params
      const { query } = ctx
      const { user } = ctx.state

      if (!paymentId) {
        return ctx.badRequest('Payment ID is required')
      }

      // Only admins can see internal notes
      const includeInternal = user.role?.type === 'admin' && query.includeInternal === 'true'

      const paymentNotesService = strapi.service('api::payment-comment.payment-comment')
      const result = await paymentNotesService.getNotesByPayment(paymentId, includeInternal)

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return result.data
    } catch (error) {
      strapi.log.error('Error in getNotesByPayment:', error)
      ctx.throw(500, 'Internal server error')
    }
  },

  /**
   * Search payment notes
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
        manualPaymentId: query.manualPaymentId,
        noteType: query.noteType,
        authorId: query.authorId,
        isInternal: user.role?.type === 'admin' ? query.isInternal === 'true' : false
      }

      const paymentNotesService = strapi.service('api::payment-comment.payment-comment')
      const result = await paymentNotesService.searchPaymentNotes(searchTerm, filters)

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return result.data
    } catch (error) {
      strapi.log.error('Error in payment notes search:', error)
      ctx.throw(500, 'Internal server error')
    }
  },

  /**
   * Get note statistics
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

      const manualPaymentId = query.manualPaymentId

      const paymentNotesService = strapi.service('api::payment-comment.payment-comment')
      const result = await paymentNotesService.getNoteStatistics(manualPaymentId)

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
