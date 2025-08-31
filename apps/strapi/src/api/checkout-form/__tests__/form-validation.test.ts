/**
 * Checkout Form Validation tests
 * 
 * Tests for checkout form validation service with comprehensive validation rules
 * 
 * @ts-nocheck - Disable TypeScript checking for Jest mocks and test setup
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock Strapi instance
const mockStrapi = {
  documents: jest.fn<any>(),
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}

// Mock Strapi factories
jest.mock('@strapi/strapi', () => ({
  factories: {
    createCoreService: jest.fn((serviceName: string, serviceFunction: any) => {
      return serviceFunction({ strapi: mockStrapi })
    }),
  },
}))

describe('Checkout Form Validation Service', () => {
  let validationService: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Import the actual service
    const serviceModule = require('../services/checkout-form-validation').default
    validationService = serviceModule({ strapi: mockStrapi })
  })

  describe('validateCheckoutForm', () => {
    it('should validate shipping step with valid data', async () => {
      const formData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '1234567890',
        address1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US'
      }

      const result = await validationService.validateCheckoutForm(formData, 'shipping', 'session-123')

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
      expect(result.warnings).toEqual({})
    })

    it('should validate shipping step with missing required fields', async () => {
      const formData = {
        firstName: 'John',
        lastName: 'Doe',
        // Missing required fields
        address1: '123 Main St',
        city: 'New York'
      }

      const result = await validationService.validateCheckoutForm(formData, 'shipping', 'session-123')

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveProperty('email')
      expect(result.errors).toHaveProperty('state')
      expect(result.errors).toHaveProperty('postalCode')
      expect(result.errors).toHaveProperty('country')
    })

    it('should validate billing step with same-as-shipping option', async () => {
      const formData = {
        sameAsShipping: true
      }

      const result = await validationService.validateCheckoutForm(formData, 'billing', 'session-123')

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('should validate billing step with separate billing address', async () => {
      const formData = {
        email: 'test@example.com',
        sameAsShipping: false,
        firstName: 'John',
        lastName: 'Doe',
        address1: '456 Billing St',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90210',
        country: 'US'
      }

      const result = await validationService.validateCheckoutForm(formData, 'billing', 'session-123')

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('should validate payment step with valid card data', async () => {
      const formData = {
        email: 'test@example.com',
        cardNumber: '4111111111111111', // Valid Visa
        expiryMonth: 12,
        expiryYear: 2025,
        cvv: '123',
        cardholderName: 'John Doe'
      }

      const result = await validationService.validateCheckoutForm(formData, 'payment', 'session-123')

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('should validate payment step with expired card', async () => {
      const currentYear = new Date().getFullYear()
      const formData = {
        cardNumber: '4111111111111111',
        expiryMonth: 1,
        expiryYear: currentYear - 1, // Expired
        cvv: '123',
        cardholderName: 'John Doe'
      }

      const result = await validationService.validateCheckoutForm(formData, 'payment', 'session-123')

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveProperty('cardExpiry')
      expect(result.errors.cardExpiry).toContain('Card has expired')
    })

    it('should validate payment step with invalid card number', async () => {
      const formData = {
        cardNumber: '4111111111111112', // Invalid Luhn
        expiryMonth: 12,
        expiryYear: 2025,
        cvv: '123',
        cardholderName: 'John Doe'
      }

      const result = await validationService.validateCheckoutForm(formData, 'payment', 'session-123')

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveProperty('cardNumber')
      expect(result.errors.cardNumber).toContain('Invalid card number')
    })

    it('should validate review step with accepted terms', async () => {
      const formData = {
        email: 'test@example.com',
        termsAccepted: true,
        privacyAccepted: true
      }

      const result = await validationService.validateCheckoutForm(formData, 'review', 'session-123')

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('should validate review step with missing terms acceptance', async () => {
      const formData = {
        email: 'test@example.com',
        termsAccepted: false,
        privacyAccepted: true
      }

      const result = await validationService.validateCheckoutForm(formData, 'review', 'session-123')

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveProperty('termsAccepted')
      expect(result.errors.termsAccepted).toContain('You must accept the terms and conditions')
    })
  })

  describe('validateField', () => {
    it('should validate email field correctly', async () => {
      const result = await validationService.validateField('email', 'test@example.com', 'shipping', {})

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should validate email field with invalid format', async () => {
      const result = await validationService.validateField('email', 'invalid-email', 'shipping', {})

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid email format')
    })

    it('should validate required field when empty', async () => {
      const result = await validationService.validateField('firstName', '', 'shipping', {})

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('firstName is required')
    })

    it('should validate phone field with valid format', async () => {
      const result = await validationService.validateField('phone', '1234567890', 'shipping', {})

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should validate postal code with valid format', async () => {
      const result = await validationService.validateField('postalCode', '12345', 'shipping', {})

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })
  })

  describe('validateFieldType', () => {
    it('should validate string length constraints', () => {
      const rule = { minLength: 3, maxLength: 10 }
      const result = validationService.validateFieldType('testField', 'ab', rule)

      expect(result.errors).toContain('testField must be at least 3 characters')
    })

    it('should validate pattern matching', () => {
      const rule = { pattern: /^[A-Z]{2}$/ }
      const result = validationService.validateFieldType('state', 'NY', rule)

      expect(result.errors).toEqual([])
    })

    it('should validate pattern matching with invalid input', () => {
      const rule = { pattern: /^[A-Z]{2}$/ }
      const result = validationService.validateFieldType('state', 'New York', rule)

      expect(result.errors).toContain('state format is invalid')
    })
  })

  describe('validateCrossFields', () => {
    it('should validate billing address when not using shipping address', () => {
      const formData = {
        sameAsShipping: false,
        // Missing billing fields
      }

      const result = validationService.validateCrossFields(formData, 'billing')

      expect(result.errors).toHaveProperty('billingAddress')
      expect(result.errors.billingAddress).toContain('Missing required billing fields: firstName, lastName, address1, city, state, postalCode, country')
    })

    it('should not validate billing address when using shipping address', () => {
      const formData = {
        sameAsShipping: true
      }

      const result = validationService.validateCrossFields(formData, 'billing')

      expect(result.errors).toEqual({})
    })

    it('should validate card expiry date', () => {
      const currentYear = new Date().getFullYear()
      const formData = {
        expiryMonth: 1,
        expiryYear: currentYear - 1
      }

      const result = validationService.validateCrossFields(formData, 'payment')

      expect(result.errors).toHaveProperty('cardExpiry')
      expect(result.errors.cardExpiry).toContain('Card has expired')
    })

    it('should validate CVV length for different card types', () => {
      const formData = {
        cardNumber: '378282246310005', // Amex
        cvv: '123' // Should be 4 digits for Amex
      }

      const result = validationService.validateCrossFields(formData, 'payment')

      expect(result.warnings).toHaveProperty('cvv')
      expect(result.warnings.cvv).toContain('CVV should be 4 digits for AMEX cards')
    })
  })

  describe('Utility Methods', () => {
    it('should validate email format correctly', () => {
      expect(validationService.isValidEmail('test@example.com')).toBe(true)
      expect(validationService.isValidEmail('invalid-email')).toBe(false)
      expect(validationService.isValidEmail('test@')).toBe(false)
      expect(validationService.isValidEmail('@example.com')).toBe(false)
    })

    it('should validate phone format correctly', () => {
      expect(validationService.isValidPhone('1234567890')).toBe(true)
      expect(validationService.isValidPhone('+1234567890')).toBe(true)
      expect(validationService.isValidPhone('123')).toBe(false) // Too short
      expect(validationService.isValidPhone('abc')).toBe(false) // Invalid characters
    })

    it('should validate postal code format correctly', () => {
      expect(validationService.isValidPostalCode('12345')).toBe(true)
      expect(validationService.isValidPostalCode('A1B 2C3')).toBe(true)
      expect(validationService.isValidPostalCode('123')).toBe(false) // Too short
      expect(validationService.isValidPostalCode('123456789012345')).toBe(false) // Too long
    })

    it('should perform Luhn check correctly', () => {
      expect(validationService.luhnCheck('4111111111111111')).toBe(true) // Valid Visa
      expect(validationService.luhnCheck('5555555555554444')).toBe(true) // Valid Mastercard
      expect(validationService.luhnCheck('4111111111111112')).toBe(false) // Invalid
      expect(validationService.luhnCheck('1234567890123456')).toBe(false) // Invalid
    })

    it('should identify card types correctly', () => {
      expect(validationService.getCardType('4111111111111111')).toBe('visa')
      expect(validationService.getCardType('5555555555554444')).toBe('mastercard')
      expect(validationService.getCardType('378282246310005')).toBe('amex')
      expect(validationService.getCardType('6011111111111117')).toBe('discover')
      expect(validationService.getCardType('1234567890123456')).toBe('unknown')
    })
  })

  describe('Accessibility and Usability Features', () => {
    it('should return accessibility features', () => {
      const features = validationService.getAccessibilityFeatures()

      expect(features).toHaveProperty('ariaLabels')
      expect(features).toHaveProperty('errorAnnouncements')
      expect(features).toHaveProperty('focusManagement')
      expect(features).toHaveProperty('keyboardNavigation')
      expect(features).toHaveProperty('screenReaderSupport')
      expect(features.ariaLabels).toHaveProperty('firstName')
      expect(features.ariaLabels).toHaveProperty('email')
    })

    it('should return usability features', () => {
      const features = validationService.getUsabilityFeatures()

      expect(features).toHaveProperty('autoComplete')
      expect(features).toHaveProperty('inputMasks')
      expect(features).toHaveProperty('suggestions')
      expect(features).toHaveProperty('validationDelay')
      expect(features.autoComplete).toHaveProperty('firstName')
      expect(features.inputMasks).toHaveProperty('phone')
      expect(features.suggestions).toHaveProperty('country')
    })
  })

  describe('Database Integration', () => {
    it('should save validation result to database', async () => {
      const formData = { firstName: 'John', lastName: 'Doe' }
      const result = { isValid: true, errors: {}, warnings: {} }

      // Mock the documents method to return the expected service
      mockStrapi.documents.mockReturnValue({
        findFirst: jest.fn<any>().mockResolvedValue(null),
        create: jest.fn<any>().mockResolvedValue({}),
        update: jest.fn(),  
        delete: jest.fn(),
      })

      await validationService.saveValidationResult('session-123', 'shipping', result)

      expect(mockStrapi.documents).toHaveBeenCalledWith('api::checkout-form.checkout-form')
      expect(mockStrapi.documents().findFirst).toHaveBeenCalledWith({
        filters: {
          checkoutSession: 'session-123',
          step: 'shipping'
        }
      })
      expect(mockStrapi.documents().create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          checkoutSession: 'session-123',
          step: 'shipping',
          isValid: true
        })
      })
    })

    it('should update existing validation result', async () => {
      const existingForm = { documentId: 'form-123' }
      const result = { isValid: false, errors: { firstName: ['Required'] }, warnings: {} }

      const mockFindFirst = jest.fn<any>().mockResolvedValue(existingForm)
      const mockUpdate = jest.fn<any>().mockResolvedValue({})
      
      mockStrapi.documents.mockReturnValue({
        findFirst: mockFindFirst,
        create: jest.fn(),
        update: mockUpdate,
        delete: jest.fn(),
      } as any)

      await validationService.saveValidationResult('session-123', 'shipping', result)

      expect(mockUpdate).toHaveBeenCalledWith({
        documentId: 'form-123',
        data: expect.objectContaining({
          checkoutSession: 'session-123',
          step: 'shipping',
          isValid: false
        })
      })
    })

    it('should handle database errors gracefully', async () => {
      const result = { isValid: true, errors: {}, warnings: {} }

      const mockFindFirst = jest.fn<any>().mockRejectedValue(new Error('DB Error'))
      
      mockStrapi.documents.mockReturnValue({
        findFirst: mockFindFirst,
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      } as any)

      // Should not throw error
      await expect(validationService.saveValidationResult('session-123', 'shipping', result)).resolves.not.toThrow()

      expect(mockStrapi.log.error).toHaveBeenCalledWith('Error saving validation result:', expect.any(Error))
    })
  })

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      // Mock a validation error
      const originalGetValidationRules = validationService.getValidationRules
      validationService.getValidationRules = jest.fn().mockImplementation(() => Promise.reject(new Error('Validation error')))

      await expect(validationService.validateCheckoutForm({}, 'shipping', 'session-123')).rejects.toThrow('Form validation failed')

      expect(mockStrapi.log.error).toHaveBeenCalledWith('Error validating checkout form:', expect.any(Error))

      // Restore original method
      validationService.getValidationRules = originalGetValidationRules
    })
  })
})


