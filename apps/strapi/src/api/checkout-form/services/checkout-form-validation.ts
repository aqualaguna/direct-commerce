'use strict'

interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => boolean | string
  dependsOn?: string
  condition?: (formData: any) => boolean
}

interface ValidationResult {
  isValid: boolean
  errors: Record<string, string[]>
  warnings: Record<string, string[]>
}

interface FormField {
  name: string
  value: any
  type: string
  required?: boolean
  validation?: ValidationRule
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Validate checkout form data for a specific step
   */
  async validateCheckoutForm(
    formData: Record<string, any>,
    step: string,
    checkoutSessionId: string
  ): Promise<ValidationResult> {
    try {
      const validationRules = await this.getValidationRules(step)
      const result: ValidationResult = {
        isValid: true,
        errors: {},
        warnings: {}
      }

      // Validate each field based on step-specific rules
      for (const [fieldName, rule] of Object.entries(validationRules)) {
        const fieldValue = formData[fieldName]
        const fieldErrors: string[] = []
        const fieldWarnings: string[] = []

        // Check if field should be validated based on dependencies or conditions
        if (rule.dependsOn && !this.shouldValidateField(fieldName, rule, formData)) {
          continue
        }

        // Check if field should be validated based on conditions
        if (rule.condition && !rule.condition(formData)) {
          continue
        }

        // Required field validation
        if (rule.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
          fieldErrors.push(`${fieldName} is required`)
          result.isValid = false
        }

        // Skip further validation if field is empty and not required (but allow boolean false)
        if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
          if (!rule.required) {
            continue
          }
        }

        // Type-specific validation
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
          const typeValidation = this.validateFieldType(fieldName, fieldValue, rule)
          fieldErrors.push(...typeValidation.errors)
          fieldWarnings.push(...typeValidation.warnings)

          if (typeValidation.errors.length > 0) {
            result.isValid = false
          }
        }

        // Custom validation (run for all values including boolean false)
        if (rule.custom && fieldValue !== undefined && fieldValue !== null) {
          const customResult = rule.custom(fieldValue)
          if (typeof customResult === 'string') {
            fieldErrors.push(customResult)
            result.isValid = false
          } else if (!customResult) {
            fieldErrors.push(`${fieldName} validation failed`)
            result.isValid = false
          }
        }

        // Store errors and warnings
        if (fieldErrors.length > 0) {
          result.errors[fieldName] = fieldErrors
        }
        if (fieldWarnings.length > 0) {
          result.warnings[fieldName] = fieldWarnings
        }
      }

      // Cross-field validation
      const crossFieldValidation = this.validateCrossFields(formData, step)
      Object.assign(result.errors, crossFieldValidation.errors)
      Object.assign(result.warnings, crossFieldValidation.warnings)
      
      if (Object.keys(crossFieldValidation.errors).length > 0) {
        result.isValid = false
      }

      // Save validation result to database
      await this.saveValidationResult(checkoutSessionId, step, result)

      return result
    } catch (error) {
      strapi.log.error('Error validating checkout form:', error)
      throw new Error('Form validation failed')
    }
  },

  /**
   * Get validation rules for a specific checkout step
   */
  async getValidationRules(step: string): Promise<Record<string, ValidationRule>> {
    const baseRules: Record<string, ValidationRule> = {
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        custom: (value: string) => {
          if (!value.includes('@')) return 'Invalid email format'
          return true
        }
      },
      phone: {
        pattern: /^[\+]?[1-9][\d]{0,15}$/,
        custom: (value: string) => {
          if (value && value.length < 10) return 'Phone number too short'
          return true
        }
      }
    }

    const stepRules: Record<string, Record<string, ValidationRule>> = {
      shipping: {
        firstName: { required: true, minLength: 2, maxLength: 50 },
        lastName: { required: true, minLength: 2, maxLength: 50 },
        email: { ...baseRules.email },
        address1: { required: true, minLength: 5, maxLength: 100 },
        city: { required: true, minLength: 2, maxLength: 50 },
        state: { required: true, minLength: 2, maxLength: 50 },
        postalCode: { required: true, pattern: /^[A-Z0-9\s-]{3,10}$/i },
        country: { required: true },
        phone: { ...baseRules.phone }
      },
      billing: {
        sameAsShipping: { required: false },
        firstName: { 
          required: true, 
          minLength: 2, 
          maxLength: 50,
          condition: (formData: any) => !formData.sameAsShipping
        },
        lastName: { 
          required: true, 
          minLength: 2, 
          maxLength: 50,
          condition: (formData: any) => !formData.sameAsShipping
        },
        email: { 
          ...baseRules.email,
          condition: (formData: any) => !formData.sameAsShipping
        },
        address1: { 
          required: true, 
          minLength: 5, 
          maxLength: 100,
          condition: (formData: any) => !formData.sameAsShipping
        },
        city: { 
          required: true, 
          minLength: 2, 
          maxLength: 50,
          condition: (formData: any) => !formData.sameAsShipping
        },
        state: { 
          required: true, 
          minLength: 2, 
          maxLength: 50,
          condition: (formData: any) => !formData.sameAsShipping
        },
        postalCode: { 
          required: true, 
          pattern: /^[A-Z0-9\s-]{3,10}$/i,
          condition: (formData: any) => !formData.sameAsShipping
        },
        country: { 
          required: true,
          condition: (formData: any) => !formData.sameAsShipping
        },
        phone: { 
          ...baseRules.phone,
          condition: (formData: any) => !formData.sameAsShipping
        }
      },
      payment: {
        email: { ...baseRules.email },
        cardNumber: {
          required: true,
          pattern: /^[0-9]{13,19}$/,
          custom: (value: string) => {
            if (!this.luhnCheck(value)) return 'Invalid card number'
            return true
          }
        },
        expiryMonth: {
          required: true,
          custom: (value: number) => {
            if (value < 1 || value > 12) return 'Invalid expiry month'
            return true
          }
        },
        expiryYear: {
          required: true,
          custom: (value: number) => {
            const currentYear = new Date().getFullYear()
            if (value < currentYear || value > currentYear + 20) {
              return 'Invalid expiry year'
            }
            return true
          }
        },
        cvv: {
          required: true,
          pattern: /^[0-9]{3,4}$/,
          custom: (value: string) => {
            if (value.length < 3 || value.length > 4) return 'Invalid CVV'
            return true
          }
        },
        cardholderName: {
          required: true,
          minLength: 2,
          maxLength: 100
        }
      },
      review: {
        email: { ...baseRules.email },
        termsAccepted: {
          required: true,
          custom: (value: boolean) => {
            if (!value) return 'You must accept the terms and conditions'
            return true
          }
        },
        privacyAccepted: {
          required: true,
          custom: (value: boolean) => {
            if (!value) return 'You must accept the privacy policy'
            return true
          }
        }
      }
    }

    return { ...baseRules, ...(stepRules[step] || {}) }
  },

  /**
   * Validate field type and format
   */
  validateFieldType(
    fieldName: string,
    value: any,
    rule: ValidationRule
  ): { errors: string[], warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    // Length validation
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${fieldName} must be at least ${rule.minLength} characters`)
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${fieldName} must be no more than ${rule.maxLength} characters`)
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      errors.push(`${fieldName} format is invalid`)
    }

    // Type-specific validation
    switch (fieldName) {
      case 'email':
        if (!this.isValidEmail(value)) {
          errors.push('Invalid email format')
        }
        break
      case 'phone':
        if (!this.isValidPhone(value)) {
          warnings.push('Phone number format may be invalid')
        }
        break
      case 'postalCode':
        if (!this.isValidPostalCode(value)) {
          errors.push('Invalid postal code format')
        }
        break
    }

    return { errors, warnings }
  },

  /**
   * Validate cross-field dependencies and relationships
   */
  validateCrossFields(
    formData: Record<string, any>,
    step: string
  ): { errors: Record<string, string[]>, warnings: Record<string, string[]> } {
    const errors: Record<string, string[]> = {}
    const warnings: Record<string, string[]> = {}

    // Billing address validation
    if (step === 'billing' && !formData.sameAsShipping) {
      const requiredBillingFields = ['firstName', 'lastName', 'address1', 'city', 'state', 'postalCode', 'country']
      const missingFields = requiredBillingFields.filter(field => !formData[field])
      
      if (missingFields.length > 0) {
        errors.billingAddress = [`Missing required billing fields: ${missingFields.join(', ')}`]
      }
    }

    // Payment validation
    if (step === 'payment') {
      // Check if card is expired
      if (formData.expiryMonth && formData.expiryYear) {
        const currentDate = new Date()
        const currentYear = currentDate.getFullYear()
        const currentMonth = currentDate.getMonth() + 1

        if (formData.expiryYear < currentYear || 
            (formData.expiryYear === currentYear && formData.expiryMonth < currentMonth)) {
          errors.cardExpiry = ['Card has expired']
        }
      }

      // Validate CVV length based on card type (basic validation)
      if (formData.cardNumber && formData.cvv) {
        const cardType = this.getCardType(formData.cardNumber)
        const expectedCvvLength = cardType === 'amex' ? 4 : 3
        
        if (formData.cvv.length !== expectedCvvLength) {
          warnings.cvv = [`CVV should be ${expectedCvvLength} digits for ${cardType.toUpperCase()} cards`]
        }
      }
    }

    return { errors, warnings }
  },

  /**
   * Check if field should be validated based on dependencies
   */
  shouldValidateField(
    fieldName: string,
    rule: ValidationRule,
    formData: Record<string, any>
  ): boolean {
    if (!rule.dependsOn && !rule.condition) return true

    if (rule.condition) {
      return rule.condition(formData)
    }

    if (rule.dependsOn) {
      const dependentValue = formData[rule.dependsOn]
      return !!dependentValue
    }

    return true
  },

  /**
   * Save validation result to database
   */
  async saveValidationResult(
    checkoutSessionId: string,
    step: string,
    result: ValidationResult
  ): Promise<void> {
    try {
      const existingForm = await strapi.documents('api::checkout-form.checkout-form').findFirst({
        filters: {
          checkoutSession: checkoutSessionId,
          step
        }
      })

      const formData = {
        checkoutSession: checkoutSessionId,
        step,
        validationErrors: result.errors,
        isValid: result.isValid,
        submitted: false
      }

      if (existingForm) {
        await strapi.documents('api::checkout-form.checkout-form').update({
          documentId: existingForm.documentId,
          data: formData
        })
      } else {
        await strapi.documents('api::checkout-form.checkout-form').create({
          data: formData
        })
      }
    } catch (error) {
      strapi.log.error('Error saving validation result:', error)
      // Don't throw error as validation should still work even if saving fails
    }
  },

  /**
   * Real-time validation for form fields
   */
  async validateField(
    fieldName: string,
    value: any,
    step: string,
    formData: Record<string, any>
  ): Promise<{ isValid: boolean, errors: string[], warnings: string[] }> {
    const rules = await this.getValidationRules(step)
    const rule = rules[fieldName]

    if (!rule) {
      return { isValid: true, errors: [], warnings: [] }
    }

    const result = this.validateFieldType(fieldName, value, rule)
    
    // Required validation
    if (rule.required && (!value || value === '')) {
      result.errors.unshift(`${fieldName} is required`)
    }

    // Custom validation
    if (rule.custom && value) {
      const customResult = rule.custom(value)
      if (typeof customResult === 'string') {
        result.errors.push(customResult)
      } else if (!customResult) {
        result.errors.push(`${fieldName} validation failed`)
      }
    }

    return {
      isValid: result.errors.length === 0,
      errors: result.errors,
      warnings: result.warnings
    }
  },

  /**
   * Get form accessibility features
   */
  getAccessibilityFeatures(): Record<string, any> {
    return {
      ariaLabels: {
        firstName: 'First name',
        lastName: 'Last name',
        email: 'Email address',
        phone: 'Phone number',
        address1: 'Street address',
        city: 'City',
        state: 'State or province',
        postalCode: 'Postal code',
        country: 'Country',
        cardNumber: 'Card number',
        expiryMonth: 'Expiry month',
        expiryYear: 'Expiry year',
        cvv: 'Security code',
        cardholderName: 'Cardholder name'
      },
      errorAnnouncements: true,
      focusManagement: true,
      keyboardNavigation: true,
      screenReaderSupport: true
    }
  },

  /**
   * Get form usability features
   */
  getUsabilityFeatures(): Record<string, any> {
    return {
      autoComplete: {
        firstName: 'given-name',
        lastName: 'family-name',
        email: 'email',
        phone: 'tel',
        address1: 'street-address',
        city: 'address-level2',
        state: 'address-level1',
        postalCode: 'postal-code',
        country: 'country'
      },
      inputMasks: {
        phone: '(999) 999-9999',
        cardNumber: '9999 9999 9999 9999',
        cvv: '999',
        postalCode: '99999'
      },
      suggestions: {
        country: ['US', 'CA', 'MX', 'GB', 'DE', 'FR', 'AU'],
        state: {
          US: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA'],
          CA: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE']
        }
      },
      validationDelay: 500, // ms
      showPasswordToggle: false,
      rememberFormData: true
    }
  },

  // Utility methods
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  isValidPhone(phone: string): boolean {
    // More restrictive phone validation - must be at least 10 digits
    const cleanPhone = phone.replace(/\D/g, '')
    return cleanPhone.length >= 10 && cleanPhone.length <= 15
  },

  isValidPostalCode(postalCode: string): boolean {
    // More restrictive postal code validation - must be 5-10 characters
    const postalRegex = /^[A-Z0-9\s-]{5,10}$/i
    return postalRegex.test(postalCode) && postalCode.length >= 5 && postalCode.length <= 10
  },

  luhnCheck(cardNumber: string): boolean {
    let sum = 0
    let isEven = false
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i))
      
      if (isEven) {
        digit *= 2
        if (digit > 9) {
          digit -= 9
        }
      }
      
      sum += digit
      isEven = !isEven
    }
    
    return sum % 10 === 0
  },

  getCardType(cardNumber: string): string {
    const patterns = {
      visa: /^4/,
      mastercard: /^5[1-5]/,
      amex: /^3[47]/,
      discover: /^6(?:011|5)/
    }
    
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(cardNumber)) {
        return type
      }
    }
    
    return 'unknown'
  }
})
