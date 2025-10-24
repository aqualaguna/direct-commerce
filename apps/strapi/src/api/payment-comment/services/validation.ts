/**
 * Payment Comment Validation Service
 * 
 * Handles all validation logic for payment comments
 * following Strapi 5+ patterns
 */

import { sanitizeString, sanitizeString as sanitizeStringWithOptions } from '../../../utils/sanitization'

interface ValidationResult {
  isValid: boolean
  errors: string[]
}

interface PaymentCommentData {
  paymentId: string
  authorId: string
  type: 'customer' | 'admin' | 'system' | 'gateway' | 'internal' | 'warning' | 'info'
  content: string
  isInternal?: boolean
  metadata?: any
  attachments?: any[]
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

interface CreateCommentRequest {
  payment: string
  type?: string
  content: string
  isInternal?: boolean
  metadata?: any
  attachments?: any[]
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Validate payment comment data for creation
   */
  async validateCreateComment(data: CreateCommentRequest, userId: string): Promise<ValidationResult> {
    const errors: string[] = []

    // Validate required fields
    if (!data.payment) {
      errors.push('Payment ID is required')
    }

    if (!data.content) {
      errors.push('Content is required')
    }

    if (!userId) {
      errors.push('Author ID is required')
    }

    // Sanitize and validate content
    if (data.content) {
      const sanitizedContent = sanitizeString(data.content)
      
      // Validate content length after sanitization
      if (sanitizedContent.length > 2000) {
        errors.push('Content must not exceed 2000 characters')
      }

      // Validate content is not empty after sanitization and trimming
      if (sanitizedContent.trim().length === 0) {
        errors.push('Content cannot be empty')
      }
    }

    // Validate type if provided
    if (data.type) {
      const validTypes = ['customer', 'admin', 'system', 'gateway', 'internal', 'warning', 'info']
      if (!validTypes.includes(data.type)) {
        errors.push(`Invalid comment type. Must be one of: ${validTypes.join(', ')}`)
      }
    }

    // Validate isInternal is boolean if provided
    if (data.isInternal !== undefined && typeof data.isInternal !== 'boolean') {
      errors.push('isInternal must be a boolean value')
    }

    // Validate attachments if provided
    if (data.attachments && Array.isArray(data.attachments)) {
      for (const attachment of data.attachments) {
        if (typeof attachment !== 'object' || attachment === null) {
          errors.push('All attachments must be objects')
          break
        }
        if (!attachment.id || typeof attachment.id !== 'number') {
          errors.push('All attachments must have a valid number ID')
          break
        }
      }
    } else if (data.attachments && !Array.isArray(data.attachments)) {
      errors.push('Attachments must be an array of objects')
    }

    // Validate metadata if provided
    if (data.metadata !== undefined && typeof data.metadata !== 'object') {
      errors.push('Metadata must be an object')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Validate payment comment data for update
   */
  async validateUpdateComment(data: Partial<PaymentCommentData>): Promise<ValidationResult> {
    const errors: string[] = []

    // Sanitize and validate content if provided
    if (data.content !== undefined) {
      const sanitizedContent = sanitizeString(data.content)
      
      if (sanitizedContent.length > 2000) {
        errors.push('Content must not exceed 2000 characters')
      }
      if (sanitizedContent.trim().length === 0) {
        errors.push('Content cannot be empty')
      }
    }

    // Validate type if provided
    if (data.type !== undefined) {
      const validTypes = ['customer', 'admin', 'system', 'gateway', 'internal', 'warning', 'info']
      if (!validTypes.includes(data.type)) {
        errors.push(`Invalid comment type. Must be one of: ${validTypes.join(', ')}`)
      }
    }

    // Validate isInternal is boolean if provided
    if (data.isInternal !== undefined && typeof data.isInternal !== 'boolean') {
      errors.push('isInternal must be a boolean value')
    }

    // Validate attachments if provided
    if (data.attachments !== undefined) {
      if (!Array.isArray(data.attachments)) {
        errors.push('Attachments must be an array of objects')
      } else {
        for (const attachment of data.attachments) {
          if (typeof attachment !== 'object' || attachment === null) {
            errors.push('All attachments must be objects')
            break
          }
          if (!attachment.id || typeof attachment.id !== 'number') {
            errors.push('All attachments must have a valid number ID')
            break
          }
        }
      }
    }

    // Validate metadata if provided
    if (data.metadata !== undefined && typeof data.metadata !== 'object') {
      errors.push('Metadata must be an object')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Validate payment comment filters
   */
  async validateFilters(filters: PaymentCommentFilters): Promise<ValidationResult> {
    const errors: string[] = []

    // Validate page number
    if (filters.page !== undefined) {
      if (!Number.isInteger(filters.page) || filters.page < 1) {
        errors.push('Page must be a positive integer')
      }
    }

    // Validate page size
    if (filters.pageSize !== undefined) {
      if (!Number.isInteger(filters.pageSize) || filters.pageSize < 1 || filters.pageSize > 100) {
        errors.push('Page size must be a positive integer between 1 and 100')
      }
    }

    // Validate type if provided
    if (filters.type !== undefined) {
      const validTypes = ['customer', 'admin', 'system', 'gateway', 'internal', 'warning', 'info']
      if (!validTypes.includes(filters.type)) {
        errors.push(`Invalid filter type. Must be one of: ${validTypes.join(', ')}`)
      }
    }

    // Validate isInternal is boolean if provided
    if (filters.isInternal !== undefined && typeof filters.isInternal !== 'boolean') {
      errors.push('isInternal filter must be a boolean value')
    }

    // Validate and sanitize search string if provided
    if (filters.search !== undefined) {
      if (typeof filters.search !== 'string') {
        errors.push('Search must be a string')
      } else {
        // Sanitize search string
        const sanitizedSearch = sanitizeString(filters.search.trim())
        if (sanitizedSearch.length === 0) {
          errors.push('Search cannot be empty')
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Validate payment comment ID
   */
  async validateCommentId(commentId: string): Promise<ValidationResult> {
    const errors: string[] = []

    if (!commentId) {
      errors.push('Comment ID is required')
    } else if (typeof commentId !== 'string') {
      errors.push('Comment ID must be a string')
    } else {
      // Sanitize the comment ID
      const sanitizedId = sanitizeString(commentId.trim())
      if (sanitizedId.length === 0) {
        errors.push('Comment ID cannot be empty')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Validate payment ID
   */
  async validatePaymentId(paymentId: string): Promise<ValidationResult> {
    const errors: string[] = []

    if (!paymentId) {
      errors.push('Payment ID is required')
    } else if (typeof paymentId !== 'string') {
      errors.push('Payment ID must be a string')
    } else {
      // Sanitize the payment ID
      const sanitizedId = sanitizeString(paymentId.trim())
      if (sanitizedId.length === 0) {
        errors.push('Payment ID cannot be empty')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Validate user ID
   */
  async validateUserId(userId: string): Promise<ValidationResult> {
    const errors: string[] = []

    if (!userId) {
      errors.push('User ID is required')
    } else if (typeof userId !== 'string') {
      errors.push('User ID must be a string')
    } else {
      // Sanitize the user ID
      const sanitizedId = sanitizeString(userId.trim())
      if (sanitizedId.length === 0) {
        errors.push('User ID cannot be empty')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Validate request body data
   */
  async validateRequestBody(data: any): Promise<ValidationResult> {
    const errors: string[] = []

    if (!data) {
      errors.push('Request body data is required')
    } else if (typeof data !== 'object') {
      errors.push('Request body data must be an object')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Validate query parameters
   */
  async validateQueryParams(query: any): Promise<ValidationResult> {
    const errors: string[] = []

    // Validate page parameter
    if (query.page !== undefined) {
      const page = parseInt(query.page)
      if (isNaN(page) || page < 1) {
        errors.push('Page must be a positive integer')
      }
    }

    // Validate pageSize parameter
    if (query.pageSize !== undefined) {
      const pageSize = parseInt(query.pageSize)
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
        errors.push('Page size must be a positive integer between 1 and 100')
      }
    }

    // Validate isInternal parameter
    if (query.isInternal !== undefined && !['true', 'false'].includes(query.isInternal)) {
      errors.push('isInternal must be "true" or "false"')
    }

    // Validate includeInternal parameter
    if (query.includeInternal !== undefined && !['true', 'false'].includes(query.includeInternal)) {
      errors.push('includeInternal must be "true" or "false"')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Validate payment exists
   */
  async validatePaymentExists(paymentId: string): Promise<ValidationResult> {
    const errors: string[] = []

    try {
      const payment = await strapi.documents('api::payment.payment').findOne({
        documentId: paymentId
      })

      if (!payment) {
        errors.push('Payment not found')
      }
    } catch (error) {
      errors.push('Failed to validate payment existence')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Validate comment exists
   */
  async validateCommentExists(commentId: string): Promise<ValidationResult> {
    const errors: string[] = []

    try {
      const comment = await strapi.documents('api::payment-comment.payment-comment').findOne({
        documentId: commentId
      })

      if (!comment) {
        errors.push('Payment comment not found')
      }
    } catch (error) {
      errors.push('Failed to validate comment existence')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Validate user permissions for payment access
   */
  async validatePaymentAccess(paymentId: string, userId: string, userRole: string): Promise<ValidationResult> {
    const errors: string[] = []

    try {
      const payment = await strapi.documents('api::payment.payment').findOne({
        documentId: paymentId,
        populate: {
          user: true
        }
      })

      if (!payment) {
        errors.push('Payment not found')
        return { isValid: false, errors }
      }

      // Admin can access any payment
      if (userRole === 'admin') {
        return { isValid: true, errors: [] }
      }

      // User can only access their own payments
      if (payment.user?.id !== userId) {
        errors.push('You are not allowed to access this payment')
      }
    } catch (error) {
      errors.push('Failed to validate payment access')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Validate user permissions for internal comments
   */
  async validateInternalCommentAccess(userRole: string, includeInternal: boolean): Promise<ValidationResult> {
    const errors: string[] = []

    if (includeInternal && userRole !== 'admin') {
      errors.push('Only admins can access internal comments')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Sanitize and normalize comment data
   */
  sanitizeCommentData(data: any): CreateCommentRequest {
    return {
      payment: data.payment ? sanitizeString(data.payment.toString().trim()) : undefined,
      type: data.type ? sanitizeString(data.type.toString().trim()) : undefined,
      content: data.content ? this.sanitizeCommentContent(data.content.toString(), { allowHtml: false }) : undefined,
      isInternal: data.isInternal === 'true' || data.isInternal === true,
      metadata: data.metadata ? this.sanitizeMetadata(data.metadata) : {},
      attachments: Array.isArray(data.attachments) ? this.sanitizeAttachments(data.attachments) : []
    }
  },

  /**
   * Sanitize and normalize filter data
   */
  sanitizeFilters(query: any): PaymentCommentFilters {
    return {
      paymentId: query.payment ? sanitizeString(query.payment.toString().trim()) : undefined,
      type: query.type ? sanitizeString(query.type.toString().trim()) : undefined,
      authorId: query.author ? sanitizeString(query.author.toString().trim()) : undefined,
      isInternal: query.isInternal === 'true',
      search: query.search ? sanitizeString(query.search.toString().trim()) : undefined,
      page: query.page ? parseInt(query.page) : undefined,
      pageSize: query.pageSize ? parseInt(query.pageSize) : undefined
    }
  },

  /**
   * Sanitize comment content with enhanced security
   */
  sanitizeCommentContent(content: string, options: { allowHtml?: boolean } = {}): string {
    if (!content || typeof content !== 'string') {
      return ''
    }

    // Basic sanitization for SQL injection and XSS
    let sanitized = sanitizeString(content.trim())

    // If HTML is not allowed, ensure no HTML tags remain
    if (!options.allowHtml) {
      // Remove any remaining HTML tags
      sanitized = sanitized.replace(/<[^>]*>/g, '')
    }

    return sanitized
  },

  /**
   * Sanitize metadata object to prevent injection attacks
   */
  sanitizeMetadata(metadata: any): any {
    if (!metadata || typeof metadata !== 'object') {
      return {}
    }

    const sanitized: any = {}
    
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string') {
        sanitized[sanitizeString(key)] = sanitizeString(value)
      } else if (typeof value === 'object' && value !== null) {
        sanitized[sanitizeString(key)] = this.sanitizeMetadata(value)
      } else {
        sanitized[sanitizeString(key)] = value
      }
    }

    return sanitized
  },

  /**
   * Sanitize attachment object to prevent injection attacks
   */
  sanitizeAttachment(attachment: any): any {
    if (!attachment || typeof attachment !== 'object') {
      return attachment
    }

    const sanitized: any = {}
    
    for (const [key, value] of Object.entries(attachment)) {
      if (typeof value === 'string') {
        sanitized[sanitizeString(key)] = sanitizeString(value)
      } else if (typeof value === 'object' && value !== null) {
        sanitized[sanitizeString(key)] = this.sanitizeAttachment(value)
      } else {
        sanitized[sanitizeString(key)] = value
      }
    }

    return sanitized
  },

  /**
   * Sanitize array of attachment objects
   */
  sanitizeAttachments(attachments: any[]): any[] {
    if (!Array.isArray(attachments)) {
      return []
    }

    return attachments.map(attachment => this.sanitizeAttachment(attachment))
  }
})
