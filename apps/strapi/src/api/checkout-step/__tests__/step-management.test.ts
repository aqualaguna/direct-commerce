/**
 * Checkout Step Management tests
 * 
 * Tests for checkout step progression, validation, and analytics
 * 
 * @ts-nocheck - Disable TypeScript checking for Jest mocks
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Define types for mock functions
type MockDocumentService = {
  findFirst: jest.MockedFunction<any>
  findMany: jest.MockedFunction<any>
  findOne: jest.MockedFunction<any>
  create: jest.MockedFunction<any>
  update: jest.MockedFunction<any>
  delete: jest.MockedFunction<any>
}

// Mock Strapi instance with proper typing
const mockStrapi = {
  documents: jest.fn((contentType: string): MockDocumentService => ({
    findFirst: jest.fn() as jest.MockedFunction<any>,
    findMany: jest.fn() as jest.MockedFunction<any>,
    findOne: jest.fn() as jest.MockedFunction<any>,
    create: jest.fn() as jest.MockedFunction<any>,
    update: jest.fn() as jest.MockedFunction<any>,
    delete: jest.fn() as jest.MockedFunction<any>,
  })),
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

describe('Checkout Step Management Service', () => {
  let stepManagementService: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Import the actual service
    const serviceModule = require('../services/step-management').default
    stepManagementService = serviceModule({ strapi: mockStrapi })
  })

  describe('initializeSteps', () => {
    it('should initialize all checkout steps for a session', async () => {
      const mockSteps = [
        { documentId: 'step1', stepName: 'cart', stepOrder: 1 },
        { documentId: 'step2', stepName: 'shipping', stepOrder: 2 },
        { documentId: 'step3', stepName: 'billing', stepOrder: 3 },
        { documentId: 'step4', stepName: 'payment', stepOrder: 4 },
        { documentId: 'step5', stepName: 'review', stepOrder: 5 },
        { documentId: 'step6', stepName: 'confirmation', stepOrder: 6 }
      ]

      // Set up the mock to return the expected values
      const mockCreate = jest.fn().mockImplementation(() => Promise.resolve(mockSteps[0]))
      mockStrapi.documents.mockReturnValue({
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findOne: jest.fn(),
        create: mockCreate,
        update: jest.fn(),
        delete: jest.fn(),
      })

      const result = await stepManagementService.initializeSteps('session-123')

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(mockCreate).toHaveBeenCalledTimes(6)
    })

    it('should handle initialization errors', async () => {
      // Mock the create method to reject
      const mockCreate = jest.fn().mockImplementation(() => Promise.reject(new Error('DB Error')))
      mockStrapi.documents.mockReturnValue({
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findOne: jest.fn(),
        create: mockCreate,
        update: jest.fn(),
        delete: jest.fn(),
      })

      await expect(stepManagementService.initializeSteps('session-123')).rejects.toThrow('Failed to initialize checkout steps')

      expect(mockStrapi.log.error).toHaveBeenCalledWith('Error initializing checkout steps:', expect.any(Error))
    })
  })

  describe('getStepProgress', () => {
    it('should return step progress for a session', async () => {
      const mockSteps = [
        { stepName: 'cart', stepOrder: 1, isActive: true, isCompleted: true },
        { stepName: 'shipping', stepOrder: 2, isActive: false, isCompleted: false },
        { stepName: 'billing', stepOrder: 3, isActive: false, isCompleted: false }
      ]

      mockStrapi.documents('api::checkout-step.checkout-step').findMany.mockImplementation(() => Promise.resolve(mockSteps))

      const result = await stepManagementService.getStepProgress('session-123')

      expect(result.currentStep).toBe('cart')
      expect(result.completedSteps).toEqual(['cart'])
      expect(result.availableSteps).toContain('shipping')
      expect(result.nextStep).toBe('shipping')
      expect(result.previousStep).toBeUndefined()
    })

    it('should handle empty steps', async () => {
      mockStrapi.documents('api::checkout-step.checkout-step').findMany.mockImplementation(() => Promise.resolve([]))

      const result = await stepManagementService.getStepProgress('session-123')

      expect(result.currentStep).toBe('cart')
      expect(result.completedSteps).toEqual([])
      expect(result.availableSteps).toEqual([])
    })
  })

  describe('moveToNextStep', () => {
    it('should move to next step successfully', async () => {
      const initialSteps = [
        { documentId: 'step1', stepName: 'cart', stepOrder: 1, isActive: true, isCompleted: true },
        { documentId: 'step2', stepName: 'shipping', stepOrder: 2, isActive: false, isCompleted: false }
      ]

      const finalSteps = [
        { documentId: 'step1', stepName: 'cart', stepOrder: 1, isActive: false, isCompleted: true },
        { documentId: 'step2', stepName: 'shipping', stepOrder: 2, isActive: true, isCompleted: false }
      ]

      // Mock findMany to return different results for different calls
      const mockFindMany = jest.fn<any>()
        .mockResolvedValueOnce(initialSteps) // First call in getStepProgress
        .mockResolvedValueOnce(initialSteps) // Second call in moveToNextStep
        .mockResolvedValueOnce(finalSteps)   // Third call in final getStepProgress
      
      // Mock findFirst for canProceedToNextStep - return the cart step as completed
      const mockFindFirst = jest.fn().mockImplementation(() => Promise.resolve(initialSteps[0]))
      
      // Mock findOne for completeStep - return the cart step
      const mockFindOne = jest.fn().mockImplementation(() => Promise.resolve(initialSteps[0]))
      
      // Mock update for step operations
      const mockUpdate = jest.fn().mockImplementation(() => Promise.resolve({}))

      mockStrapi.documents.mockReturnValue({
        findFirst: mockFindFirst,
        findMany: mockFindMany,
        findOne: mockFindOne,
        create: jest.fn(),
        update: mockUpdate,
        delete: jest.fn(),
      })

      const result = await stepManagementService.moveToNextStep('session-123')

      expect(result).toBeDefined()
      expect(result.currentStep).toBe('shipping')
    })

    it('should throw error when cannot proceed', async () => {
      const mockSteps = [
        { documentId: 'step1', stepName: 'cart', stepOrder: 1, isActive: true, isCompleted: false }
      ]

      // Mock findMany for getStepProgress
      const mockFindMany = jest.fn().mockImplementation(() => Promise.resolve(mockSteps))
      
      // Mock findFirst for canProceedToNextStep
      const mockFindFirst = jest.fn().mockImplementation(() => Promise.resolve(mockSteps[0]))

      mockStrapi.documents.mockReturnValue({
        findFirst: mockFindFirst,
        findMany: mockFindMany,
        findOne: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })

      await expect(stepManagementService.moveToNextStep('session-123')).rejects.toThrow('Cannot proceed to next step - validation failed')
    })

    it('should throw error when no next step available', async () => {
      const mockSteps = [
        { documentId: 'step1', stepName: 'confirmation', stepOrder: 6, isActive: true, isCompleted: true }
      ]

      // Mock findMany for getStepProgress
      const mockFindMany = jest.fn().mockImplementation(() => Promise.resolve(mockSteps))
      
      // Mock findFirst for canProceedToNextStep
      const mockFindFirst = jest.fn().mockImplementation(() => Promise.resolve(mockSteps[0]))

      mockStrapi.documents.mockReturnValue({
        findFirst: mockFindFirst,
        findMany: mockFindMany,
        findOne: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })

      await expect(stepManagementService.moveToNextStep('session-123')).rejects.toThrow('No next step available')
    })
  })

  describe('moveToPreviousStep', () => {
    it('should move to previous step successfully', async () => {
      const initialSteps = [
        { documentId: 'step1', stepName: 'cart', stepOrder: 1, isActive: false, isCompleted: true },
        { documentId: 'step2', stepName: 'shipping', stepOrder: 2, isActive: true, isCompleted: false }
      ]

      const finalSteps = [
        { documentId: 'step1', stepName: 'cart', stepOrder: 1, isActive: true, isCompleted: true },
        { documentId: 'step2', stepName: 'shipping', stepOrder: 2, isActive: false, isCompleted: false }
      ]

      // Mock findMany to return different results for different calls
      const mockFindMany = jest.fn<any>()
        .mockResolvedValueOnce(initialSteps) // First call in getStepProgress
        .mockResolvedValueOnce(initialSteps) // Second call in moveToPreviousStep
        .mockResolvedValueOnce(finalSteps)   // Third call in final getStepProgress
      
      // Mock findFirst for canProceedToNextStep - return the shipping step
      const mockFindFirst = jest.fn().mockImplementation(() => Promise.resolve(initialSteps[1]))
      
      // Mock update for step operations
      const mockUpdate = jest.fn().mockImplementation(() => Promise.resolve({}))

      mockStrapi.documents.mockReturnValue({
        findFirst: mockFindFirst,
        findMany: mockFindMany,
        findOne: jest.fn(),
        create: jest.fn(),
        update: mockUpdate,
        delete: jest.fn(),
      })

      const result = await stepManagementService.moveToPreviousStep('session-123')

      expect(result).toBeDefined()
      expect(result.currentStep).toBe('cart')
    })

    it('should throw error when no previous step available', async () => {
      const mockSteps = [
        { documentId: 'step1', stepName: 'cart', stepOrder: 1, isActive: true, isCompleted: false }
      ]

      mockStrapi.documents('api::checkout-step.checkout-step').findMany.mockResolvedValue(mockSteps as any)

      await expect(stepManagementService.moveToPreviousStep('session-123')).rejects.toThrow('No previous step available')
    })
  })

  describe('jumpToStep', () => {
    it('should jump to available step successfully', async () => {
      const initialSteps = [
        { documentId: 'step1', stepName: 'cart', stepOrder: 1, isActive: false, isCompleted: true },
        { documentId: 'step2', stepName: 'shipping', stepOrder: 2, isActive: false, isCompleted: false },
        { documentId: 'step3', stepName: 'billing', stepOrder: 3, isActive: false, isCompleted: false }
      ]

      const finalSteps = [
        { documentId: 'step1', stepName: 'cart', stepOrder: 1, isActive: false, isCompleted: true },
        { documentId: 'step2', stepName: 'shipping', stepOrder: 2, isActive: true, isCompleted: false },
        { documentId: 'step3', stepName: 'billing', stepOrder: 3, isActive: false, isCompleted: false }
      ]

      // Mock findMany to return different results for different calls
      const mockFindMany = jest.fn<any>()
        .mockResolvedValueOnce(initialSteps) // First call in jumpToStep
        .mockResolvedValueOnce(finalSteps)   // Second call in final getStepProgress
      
      // Mock update for step operations
      const mockUpdate = jest.fn().mockImplementation(() => Promise.resolve({}))

      mockStrapi.documents.mockReturnValue({
        findFirst: jest.fn(),
        findOne: jest.fn(),
        findMany: mockFindMany,
        create: jest.fn(),
        update: mockUpdate,
        delete: jest.fn(),
      })

      const result = await stepManagementService.jumpToStep('session-123', 'shipping')

      expect(result).toBeDefined()
      expect(result.currentStep).toBe('shipping')
    })

    it('should throw error when target step not found', async () => {
      const mockSteps = [
        { documentId: 'step1', stepName: 'cart', stepOrder: 1, isActive: true, isCompleted: false }
      ]

      mockStrapi.documents('api::checkout-step.checkout-step').findMany.mockImplementation(() => Promise.resolve(mockSteps))

      await expect(stepManagementService.jumpToStep('session-123', 'nonexistent')).rejects.toThrow('Target step not found')
    })

    it('should throw error when target step not available', async () => {
      const mockSteps = [
        { documentId: 'step1', stepName: 'cart', stepOrder: 1, isActive: true, isCompleted: false },
        { documentId: 'step2', stepName: 'shipping', stepOrder: 2, isActive: false, isCompleted: false }
      ]

      mockStrapi.documents('api::checkout-step.checkout-step').findMany.mockImplementation(() => Promise.resolve(mockSteps))

      await expect(stepManagementService.jumpToStep('session-123', 'shipping')).rejects.toThrow('Target step is not available')
    })
  })

  describe('validateStep', () => {
    it('should validate step data successfully', async () => {
      const mockStep = {
        documentId: 'step1',
        stepName: 'shipping',
        attempts: 0
      }

      // Mock findFirst for validateStep
      const mockFindFirst = jest.fn().mockImplementation(() => Promise.resolve(mockStep))
      
      // Mock update for step operations
      const mockUpdate = jest.fn().mockImplementation(() => Promise.resolve({}))

      mockStrapi.documents.mockReturnValue({
        findFirst: mockFindFirst,
        findMany: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        update: mockUpdate,
        delete: jest.fn(),
      })

      const stepData = { address: '123 Main St', shippingMethod: 'standard', email: 'test@example.com' }
      const result = await stepManagementService.validateStep('session-123', 'shipping', stepData)

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
      expect(mockUpdate).toHaveBeenCalledWith({
        documentId: 'step1',
        data: expect.objectContaining({
          validationErrors: {},
          stepData,
          attempts: 1
        })
      })
    })

    it('should return validation errors for invalid data', async () => {
      const mockStep = {
        documentId: 'step1',
        stepName: 'shipping',
        validationRules: { address: { required: true } },
        errorMessages: { address: 'Shipping address is required' },
        attempts: 0
      }

      mockStrapi.documents('api::checkout-step.checkout-step').findFirst.mockResolvedValue(mockStep as any)

      const stepData = { address: '' }
      const result = await stepManagementService.validateStep('session-123', 'shipping', stepData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveProperty('address')
      expect(result.errors.address).toContain('Shipping address is required')
    })

    it('should validate credit card format', async () => {
      const mockStep = {
        documentId: 'step1',
        stepName: 'payment',
        validationRules: { cardNumber: { required: true, format: 'credit_card' } },
        errorMessages: { cardNumber: 'Valid card number is required' },
        attempts: 0
      }

      mockStrapi.documents('api::checkout-step.checkout-step').findFirst.mockResolvedValue(mockStep as any)

      const stepData = { cardNumber: '4111111111111112' } // Invalid Luhn
      const result = await stepManagementService.validateStep('session-123', 'payment', stepData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveProperty('cardNumber')
      expect(result.errors.cardNumber).toContain('Invalid card number')
    })
  })

  describe('getStepAnalytics', () => {
    it('should return step analytics', async () => {
      const mockSteps = [
        {
          stepName: 'cart',
          timeSpent: 30,
          attempts: 1,
          isCompleted: true
        },
        {
          stepName: 'shipping',
          timeSpent: 60,
          attempts: 2,
          isCompleted: false
        }
      ]

      mockStrapi.documents('api::checkout-step.checkout-step').findMany.mockResolvedValue(mockSteps as any)

      const result = await stepManagementService.getStepAnalytics('session-123')

      expect(result).toHaveProperty('cart')
      expect(result).toHaveProperty('shipping')
      expect(result.cart.completionRate).toBe(100)
      expect(result.shipping.completionRate).toBe(0)
      expect(result.shipping.abandonmentRate).toBe(100)
    })
  })

  describe('trackNavigation', () => {
    it('should track navigation successfully', async () => {
      const mockStep = {
        documentId: 'step1',
        navigationHistory: []
      }

      mockStrapi.documents('api::checkout-step.checkout-step').findFirst.mockResolvedValue(mockStep as any)

      await stepManagementService.trackNavigation('session-123', 'shipping', 'next')

      expect(mockStrapi.documents('api::checkout-step.checkout-step').update).toHaveBeenCalledWith({
        documentId: 'step1',
        data: {
          navigationHistory: expect.arrayContaining([
            expect.objectContaining({
              action: 'next',
              stepName: 'shipping',
              sessionId: 'session-123'
            })
          ])
        }
      })
    })

    it('should handle missing step gracefully', async () => {
      mockStrapi.documents('api::checkout-step.checkout-step').findFirst.mockResolvedValue(null as any)

      await expect(stepManagementService.trackNavigation('session-123', 'nonexistent', 'next')).resolves.not.toThrow()
    })
  })

  describe('Helper Methods', () => {
    it('should get available steps correctly', () => {
      const steps = [
        { stepName: 'cart', stepOrder: 1 },
        { stepName: 'shipping', stepOrder: 2 },
        { stepName: 'billing', stepOrder: 3 }
      ]
      const completedSteps = ['cart']

      const result = stepManagementService.getAvailableSteps(steps, completedSteps)

      expect(result).toContain('shipping')
      expect(result).not.toContain('billing') // billing depends on shipping
    })

    it('should get next step correctly', () => {
      const steps = [
        { stepName: 'cart', stepOrder: 1 },
        { stepName: 'shipping', stepOrder: 2 },
        { stepName: 'billing', stepOrder: 3 }
      ]

      const result = stepManagementService.getNextStep(steps, 'cart')
      expect(result.stepName).toBe('shipping')
    })

    it('should get previous step correctly', () => {
      const steps = [
        { stepName: 'cart', stepOrder: 1 },
        { stepName: 'shipping', stepOrder: 2 },
        { stepName: 'billing', stepOrder: 3 }
      ]

      const result = stepManagementService.getPreviousStep(steps, 'shipping')
      expect(result.stepName).toBe('cart')
    })

    it('should validate field formats correctly', () => {
      // Valid credit card
      expect(stepManagementService.validateFieldFormat('cardNumber', '4111111111111111', 'credit_card')).toBeNull()
      
      // Invalid credit card
      expect(stepManagementService.validateFieldFormat('cardNumber', '4111111111111112', 'credit_card')).toBe('Invalid card number')
      
      // Valid expiry
      expect(stepManagementService.validateFieldFormat('expiry', '12/25', 'expiry')).toBeNull()
      
      // Invalid expiry
      expect(stepManagementService.validateFieldFormat('expiry', '13/25', 'expiry')).toBe('Invalid expiry date format (MM/YY)')
      
      // Valid CVV
      expect(stepManagementService.validateFieldFormat('cvv', '123', 'cvv')).toBeNull()
      
      // Invalid CVV
      expect(stepManagementService.validateFieldFormat('cvv', '12', 'cvv')).toBe('Invalid CVV format')
    })

    it('should perform Luhn check correctly', () => {
      expect(stepManagementService.luhnCheck('4111111111111111')).toBe(true) // Valid Visa
      expect(stepManagementService.luhnCheck('5555555555554444')).toBe(true) // Valid Mastercard
      expect(stepManagementService.luhnCheck('4111111111111112')).toBe(false) // Invalid
      expect(stepManagementService.luhnCheck('123')).toBe(false) // Too short
    })
  })

  describe('Step Configuration', () => {
    it('should have correct step configurations', () => {
      const configs = stepManagementService.stepConfigs

      expect(configs.cart.order).toBe(1)
      expect(configs.shipping.order).toBe(2)
      expect(configs.billing.order).toBe(3)
      expect(configs.payment.order).toBe(4)
      expect(configs.review.order).toBe(5)
      expect(configs.confirmation.order).toBe(6)

      expect(configs.cart.required).toBe(true)
      expect(configs.confirmation.required).toBe(false)

      expect(configs.cart.dependencies).toEqual([])
      expect(configs.shipping.dependencies).toEqual(['cart'])
      expect(configs.billing.dependencies).toEqual(['shipping'])
    })

    it('should have validation rules for each step', () => {
      const configs = stepManagementService.stepConfigs

      expect(configs.cart.validationRules).toHaveProperty('hasItems')
      expect(configs.shipping.validationRules).toHaveProperty('address')
      expect(configs.payment.validationRules).toHaveProperty('cardNumber')
      expect(configs.review.validationRules).toHaveProperty('termsAccepted')
    })

    it('should have error messages for each step', () => {
      const configs = stepManagementService.stepConfigs

      expect(configs.cart.errorMessages).toHaveProperty('hasItems')
      expect(configs.shipping.errorMessages).toHaveProperty('address')
      expect(configs.payment.errorMessages).toHaveProperty('cardNumber')
      expect(configs.review.errorMessages).toHaveProperty('termsAccepted')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
             mockStrapi.documents('api::checkout-step.checkout-step').findMany.mockRejectedValue(new Error('DB Error') as any)

      await expect(stepManagementService.getStepProgress('session-123')).rejects.toThrow('Failed to get step progress')

      expect(mockStrapi.log.error).toHaveBeenCalledWith('Error getting step progress:', expect.any(Error))
    })

    it('should handle step not found errors', async () => {
      mockStrapi.documents('api::checkout-step.checkout-step').findFirst.mockResolvedValue(null as any)

      await expect(stepManagementService.validateStep('session-123', 'nonexistent', {})).rejects.toThrow('Step not found')
    })

    it('should handle configuration not found errors', async () => {
      const mockStep = {
        documentId: 'step1',
        stepName: 'nonexistent'
      }

      mockStrapi.documents('api::checkout-step.checkout-step').findFirst.mockResolvedValue(mockStep as any)

      await expect(stepManagementService.validateStep('session-123', 'nonexistent', {})).rejects.toThrow('Step configuration not found')
    })
  })
})
