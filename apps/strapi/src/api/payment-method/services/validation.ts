/**
 * Payment Method Validation Service
 * 
 * Comprehensive validation logic for payment method operations
 * following Strapi 5+ patterns and best practices
 */

import { sanitizeString } from "../../../utils"

export interface PaymentMethodData {
  name: string
  code: 'cash' | 'bank_transfer' | 'check' | 'money_order' | 'other'
  paymentType: 'manual' | 'automated'
  description: string
  isActive?: boolean
  instructions?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface ValidationOptions {
  skipCodeUniqueness?: boolean
  existingDocumentId?: string
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Validate payment method data
   */
  async validatePaymentMethodData(
    data: Partial<PaymentMethodData>, 
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    const errors: string[] = []

    // Required field validation
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Name is required')
    }

    if (!data.code) {
      errors.push('Code is required')
    }

    if (!data.description || data.description.trim().length === 0) {
      errors.push('Description is required')
    }

    if (!data.paymentType) {
      errors.push('Payment type is required')
    }

    // String length validation
    if (data.name && data.name.length > 255) {
      errors.push('Name must be 255 characters or less')
    }

    if (data.description && data.description.length > 1000) {
      errors.push('Description must be 1000 characters or less')
    }

    if (data.instructions && data.instructions.length > 2000) {
      errors.push('Instructions must be 2000 characters or less')
    }

    // Enum validation
    if (data.code && !['cash', 'bank_transfer', 'check', 'money_order', 'other'].includes(data.code as any)) {
      errors.push('Invalid payment method code')
    }

    if (data.paymentType && !['manual', 'automated'].includes(data.paymentType)) {
      errors.push('Invalid payment type')
    }

    // Code uniqueness validation
    if (data.code && !options.skipCodeUniqueness) {
      const isCodeUnique = await this.checkCodeUniqueness(data.code, options.existingDocumentId)
      if (!isCodeUnique) {
        errors.push('Payment method code already exists')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Check if payment method code is unique
   */
  async checkCodeUniqueness(code: string, excludeDocumentId?: string): Promise<boolean> {
    try {
      const filters: any = { code }
      
      if (excludeDocumentId) {
        filters.documentId = { $ne: excludeDocumentId }
      }

      const existingMethod = await strapi.documents('api::payment-method.payment-method').findFirst({
        filters
      })

      return !existingMethod
    } catch (error) {
      strapi.log.error('Error checking code uniqueness:', error)
      return false
    }
  },

  /**
   * Validate payment method exists
   */
  async validatePaymentMethodExists(documentId: string): Promise<ValidationResult> {
    try {
      const paymentMethod = await strapi.documents('api::payment-method.payment-method').findOne({
        documentId
      })

      if (!paymentMethod) {
        return {
          isValid: false,
          errors: ['Payment method not found']
        }
      }

      return {
        isValid: true,
        errors: []
      }
    } catch (error) {
      strapi.log.error('Error validating payment method exists:', error)
      return {
        isValid: false,
        errors: ['Failed to validate payment method']
      }
    }
  },

  /**
   * Validate payment method code format
   */
  validateCodeFormat(code: string): ValidationResult {
    const errors: string[] = []

    if (!code || code.trim().length === 0) {
      errors.push('Code is required')
    }

    if (code && !/^[a-z_]+$/.test(code)) {
      errors.push('Code must contain only lowercase letters and underscores')
    }

    if (code && code.length > 50) {
      errors.push('Code must be 50 characters or less')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Validate payment method name format
   */
  validateNameFormat(name: string): ValidationResult {
    const errors: string[] = []

    if (!name || name.trim().length === 0) {
      errors.push('Name is required')
    }

    if (name && name.length > 255) {
      errors.push('Name must be 255 characters or less')
    }

    if (name && name.length < 2) {
      errors.push('Name must be at least 2 characters')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Validate payment method description format
   */
  validateDescriptionFormat(description: string): ValidationResult {
    const errors: string[] = []

    if (!description || description.trim().length === 0) {
      errors.push('Description is required')
    }

    if (description && description.length > 1000) {
      errors.push('Description must be 1000 characters or less')
    }

    if (description && description.length < 10) {
      errors.push('Description must be at least 10 characters')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Validate payment method instructions format
   */
  validateInstructionsFormat(instructions?: string): ValidationResult {
    const errors: string[] = []

    if (instructions && instructions.length > 2000) {
      errors.push('Instructions must be 2000 characters or less')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Validate payment method activation status
   */
  validateActivationStatus(isActive: boolean): ValidationResult {
    const errors: string[] = []

    if (typeof isActive !== 'boolean') {
      errors.push('Active status must be a boolean value')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Validate payment method update data
   */
  async validateUpdateData(
    documentId: string, 
    data: Partial<PaymentMethodData>
  ): Promise<ValidationResult> {
    const errors: string[] = []

    // Check if payment method exists
    const existsValidation = await this.validatePaymentMethodExists(documentId)
    if (!existsValidation.isValid) {
      return existsValidation
    }

    // Validate individual fields if provided
    if (data.name !== undefined) {
      const nameValidation = this.validateNameFormat(data.name)
      if (!nameValidation.isValid) {
        errors.push(...nameValidation.errors)
      }
    }

    if (data.description !== undefined) {
      const descriptionValidation = this.validateDescriptionFormat(data.description)
      if (!descriptionValidation.isValid) {
        errors.push(...descriptionValidation.errors)
      }
    }

    if (data.instructions !== undefined) {
      const instructionsValidation = this.validateInstructionsFormat(data.instructions)
      if (!instructionsValidation.isValid) {
        errors.push(...instructionsValidation.errors)
      }
    }

    if (data.code !== undefined) {
      const codeValidation = this.validateCodeFormat(data.code)
      if (!codeValidation.isValid) {
        errors.push(...codeValidation.errors)
      } else {
        // Check code uniqueness
        const isCodeUnique = await this.checkCodeUniqueness(data.code, documentId)
        if (!isCodeUnique) {
          errors.push('Payment method code already exists')
        }
      }
    }

    if (data.paymentType !== undefined) {
      if (!['manual', 'automated'].includes(data.paymentType)) {
        errors.push('Invalid payment type')
      }
    }

    if (data.isActive !== undefined) {
      const activationValidation = this.validateActivationStatus(data.isActive)
      if (!activationValidation.isValid) {
        errors.push(...activationValidation.errors)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Sanitize payment method data
   */
  sanitizePaymentMethodData(data: Partial<PaymentMethodData>): Partial<PaymentMethodData> {
    const sanitized: Partial<PaymentMethodData> = {}

    if (data.name !== undefined) {
      sanitized.name = sanitizeString(data.name, { sanitizeHtmlEnabled: true })
    }

    if (data.description !== undefined) {
      sanitized.description = sanitizeString(data.description, { sanitizeHtmlEnabled: true })
    }

    if (data.instructions !== undefined) {
      sanitized.instructions = sanitizeString(data.instructions, { sanitizeHtmlEnabled: true })
    }

    if (data.code !== undefined) {
      sanitized.code = sanitizeString(data.code, { sanitizeHtmlEnabled: true }) as any
    }

    if (data.paymentType !== undefined) {
      sanitized.paymentType = data.paymentType
    }

    if (data.isActive !== undefined) {
      sanitized.isActive = Boolean(data.isActive)
    }

    return sanitized
  }
})
