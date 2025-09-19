/**
 * Payment Notes Service
 * 
 * Handles payment notes and comments for manual payments
 * following Strapi 5+ Document Service API patterns
 */

interface PaymentNoteData {
  manualPaymentId: string
  authorId: string
  noteType: 'customer' | 'admin' | 'system' | 'gateway'
  content: string
  isInternal?: boolean
  metadata?: any
}

interface PaymentNoteResult {
  success: boolean
  data?: any
  error?: string
}

interface PaymentNoteFilters {
  manualPaymentId?: string
  noteType?: string
  authorId?: string
  isInternal?: boolean
  search?: string
  page?: number
  pageSize?: number
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Create a new payment note
   */
  async createPaymentNote(data: PaymentNoteData): Promise<PaymentNoteResult> {
    try {
      // Validate required fields
      if (!data.manualPaymentId || !data.authorId || !data.content) {
        return {
          success: false,
          error: 'Manual payment ID, author ID, and content are required'
        }
      }

      // Check if manual payment exists
      const manualPayment = await strapi.documents('api::manual-payment.manual-payment').findOne({
        documentId: data.manualPaymentId
      })

      if (!manualPayment) {
        return {
          success: false,
          error: 'Manual payment not found'
        }
      }

      // Create payment note
      const paymentNote = await strapi.documents('api::payment-comment.payment-comment').create({
        data: {
          manualPayment: data.manualPaymentId,
          author: data.authorId,
          noteType: data.noteType || 'admin',
          content: data.content,
          isInternal: data.isInternal || false,
          metadata: data.metadata || {}
        },
        populate: ['manualPayment', 'author']
      })

      // Send notification if note is not internal
      if (!data.isInternal) {
        await this.sendNoteNotification(paymentNote)
      }

      return {
        success: true,
        data: paymentNote
      }
    } catch (error) {
      strapi.log.error('Error creating payment note:', error)
      return {
        success: false,
        error: 'Failed to create payment note'
      }
    }
  },

  /**
   * Get payment notes with filtering and pagination
   */
  async getPaymentNotes(filters: PaymentNoteFilters = {}): Promise<PaymentNoteResult> {
    try {
      const queryFilters: any = {}

      if (filters.manualPaymentId) {
        queryFilters.manualPayment = filters.manualPaymentId
      }

      if (filters.noteType) {
        queryFilters.noteType = filters.noteType
      }

      if (filters.authorId) {
        queryFilters.author = filters.authorId
      }

      if (filters.isInternal !== undefined) {
        queryFilters.isInternal = filters.isInternal
      }

      const pagination = {
        page: Math.max(1, filters.page || 1),
        pageSize: Math.min(Math.max(1, filters.pageSize || 25), 100)
      }

      const paymentNotes = await strapi.documents('api::payment-comment.payment-comment').findMany({
        filters: queryFilters,
        sort: 'createdAt:desc',
        limit: pagination.pageSize,
        start: (pagination.page - 1) * pagination.pageSize,
        populate: ['manualPayment', 'author']
      })

      // Apply search filter if provided
      let filteredNotes = paymentNotes
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        filteredNotes = paymentNotes.filter((note: any) =>
          note.content.toLowerCase().includes(searchTerm) ||
          (note.author?.username && note.author.username.toLowerCase().includes(searchTerm))
        )
      }

      return {
        success: true,
        data: {
          notes: filteredNotes,
          pagination: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: filteredNotes.length
          }
        }
      }
    } catch (error) {
      strapi.log.error('Error getting payment notes:', error)
      return {
        success: false,
        error: 'Failed to get payment notes'
      }
    }
  },

  /**
   * Get payment note by ID
   */
  async getPaymentNote(noteId: string): Promise<PaymentNoteResult> {
    try {
      const paymentNote = await strapi.documents('api::payment-comment.payment-comment').findOne({
        documentId: noteId,
        populate: ['manualPayment', 'author']
      })

      if (!paymentNote) {
        return {
          success: false,
          error: 'Payment note not found'
        }
      }

      return {
        success: true,
        data: paymentNote
      }
    } catch (error) {
      strapi.log.error('Error getting payment note:', error)
      return {
        success: false,
        error: 'Failed to get payment note'
      }
    }
  },

  /**
   * Update payment note
   */
  async updatePaymentNote(noteId: string, data: Partial<PaymentNoteData>): Promise<PaymentNoteResult> {
    try {
      const existingNote = await strapi.documents('api::payment-comment.payment-comment').findOne({
        documentId: noteId
      })

      if (!existingNote) {
        return {
          success: false,
          error: 'Payment note not found'
        }
      }

      const updateData: any = {}
      if (data.content !== undefined) updateData.content = data.content
      if (data.noteType !== undefined) updateData.noteType = data.noteType
      if (data.isInternal !== undefined) updateData.isInternal = data.isInternal
      if (data.metadata !== undefined) updateData.metadata = data.metadata

      const updatedNote = await strapi.documents('api::payment-comment.payment-comment').update({
        documentId: noteId,
        data: updateData,
        populate: ['manualPayment', 'author']
      })

      return {
        success: true,
        data: updatedNote
      }
    } catch (error) {
      strapi.log.error('Error updating payment note:', error)
      return {
        success: false,
        error: 'Failed to update payment note'
      }
    }
  },

  /**
   * Delete payment note
   */
  async deletePaymentNote(noteId: string): Promise<PaymentNoteResult> {
    try {
      const existingNote = await strapi.documents('api::payment-comment.payment-comment').findOne({
        documentId: noteId
      })

      if (!existingNote) {
        return {
          success: false,
          error: 'Payment note not found'
        }
      }

      await strapi.documents('api::payment-comment.payment-comment').delete({
        documentId: noteId
      })

      return {
        success: true,
        data: { message: 'Payment note deleted successfully' }
      }
    } catch (error) {
      strapi.log.error('Error deleting payment note:', error)
      return {
        success: false,
        error: 'Failed to delete payment note'
      }
    }
  },

  /**
   * Get notes for a specific manual payment
   */
  async getNotesByPayment(manualPaymentId: string, includeInternal: boolean = false): Promise<PaymentNoteResult> {
    try {
      const filters: any = {
        manualPayment: manualPaymentId
      }

      if (!includeInternal) {
        filters.isInternal = false
      }

      const notes = await strapi.documents('api::payment-comment.payment-comment').findMany({
        filters,
        sort: 'createdAt:desc',
        populate: ['author']
      })

      return {
        success: true,
        data: notes
      }
    } catch (error) {
      strapi.log.error('Error getting notes by payment:', error)
      return {
        success: false,
        error: 'Failed to get notes by payment'
      }
    }
  },

  /**
   * Search payment notes
   */
  async searchPaymentNotes(searchTerm: string, filters: PaymentNoteFilters = {}): Promise<PaymentNoteResult> {
    try {
      const allNotes = await this.getPaymentNotes(filters)
      
      if (!allNotes.success) {
        return allNotes
      }

      const searchLower = searchTerm.toLowerCase()
      const filteredNotes = allNotes.data.notes.filter((note: any) =>
        note.content.toLowerCase().includes(searchLower) ||
        (note.author?.username && note.author.username.toLowerCase().includes(searchLower)) ||
        note.noteType.toLowerCase().includes(searchLower)
      )

      return {
        success: true,
        data: {
          notes: filteredNotes,
          searchTerm,
          total: filteredNotes.length
        }
      }
    } catch (error) {
      strapi.log.error('Error searching payment notes:', error)
      return {
        success: false,
        error: 'Failed to search payment notes'
      }
    }
  },

  /**
   * Get note statistics
   */
  async getNoteStatistics(manualPaymentId?: string): Promise<PaymentNoteResult> {
    try {
      const filters: any = {}
      if (manualPaymentId) {
        filters.manualPayment = manualPaymentId
      }

      const allNotes = await strapi.documents('api::payment-comment.payment-comment').findMany({
        filters,
        fields: ['noteType', 'isInternal', 'createdAt']
      })

      const stats = {
        total: allNotes.length,
        byType: {
          customer: 0,
          admin: 0,
          system: 0,
          gateway: 0
        },
        internal: 0,
        external: 0,
        recentNotes: 0 // Notes created in last 7 days
      }

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      allNotes.forEach((note: any) => {
        stats.byType[note.noteType as keyof typeof stats.byType]++
        
        if (note.isInternal) {
          stats.internal++
        } else {
          stats.external++
        }

        if (new Date(note.createdAt) > sevenDaysAgo) {
          stats.recentNotes++
        }
      })

      return {
        success: true,
        data: stats
      }
    } catch (error) {
      strapi.log.error('Error getting note statistics:', error)
      return {
        success: false,
        error: 'Failed to get note statistics'
      }
    }
  },

  /**
   * Send notification for new note
   */
  async sendNoteNotification(paymentNote: any): Promise<void> {
    try {
      // This would integrate with the notification system
      // For now, we'll just log the notification
      strapi.log.info('Payment note notification:', {
        noteId: paymentNote.documentId,
        paymentId: paymentNote.manualPayment?.documentId,
        author: paymentNote.author?.username,
        noteType: paymentNote.noteType,
        isInternal: paymentNote.isInternal
      })
    } catch (error) {
      strapi.log.error('Error sending note notification:', error)
    }
  },

  /**
   * Create audit log entry for note operations
   */
  async createAuditLog(action: string, noteId: string, userId: string, details?: any): Promise<void> {
    try {
      // This would integrate with the audit logging system
      strapi.log.info('Payment note audit log:', {
        action,
        noteId,
        userId,
        timestamp: new Date().toISOString(),
        details
      })
    } catch (error) {
      strapi.log.error('Error creating audit log:', error)
    }
  }
})
