/**
 * Checkout Flow Service tests
 * 
 * Tests for checkout session management, step progression, and validation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

describe('Checkout Flow Service', () => {
  let checkoutFlowService: any
  let mockStrapi: any
  let mockDocuments: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Create mock documents object
    mockDocuments = {
      findOne: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      publish: jest.fn(),
      unpublish: jest.fn(),
      discardDraft: jest.fn(),
    }

    // Create fresh mock Strapi instance for each test
    mockStrapi = {
      documents: jest.fn((contentType) => mockDocuments),
      service: jest.fn((serviceName: string) => {
        if (serviceName === 'api::address-validation.address-validation') {
          return {
            validateAddress: jest.fn<any>().mockResolvedValue({ errors: [] })
          }
        }
        return {}
      }),
      log: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
      },
      plugins: {
        'users-permissions': {
          services: {
            jwt: {
              issue: jest.fn()
            }
          }
        }
      }
    }

    // Import the actual service
    const serviceModule = require('../../../services/checkout-flow').default
    checkoutFlowService = serviceModule({ strapi: mockStrapi })
  })

  describe('createSession', () => {
    it('should create a new checkout session successfully', async () => {
      const mockSession = {
        documentId: 'doc123',
        sessionId: 'session123',
        step: 'cart',
        status: 'active',
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDocuments.create.mockResolvedValue(mockSession)

      const result = await checkoutFlowService.createSession({
        sessionId: 'session123',
        cartId: 'cart123',
        expiresAt: new Date()
      })

      expect(result).toEqual(mockSession)
      expect(mockStrapi.documents).toHaveBeenCalledWith('api::checkout.checkout-session')
      expect(mockDocuments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: 'session123',
            currentStep: 'cart',
            status: 'active'
          }),
          populate: ['user', 'cart', 'order']
        })
      )
    })

    it('should handle creation errors', async () => {
      mockDocuments.create.mockRejectedValue(new Error('Database error'))

      await expect(checkoutFlowService.createSession({
        sessionId: 'session123',
        cartId: 'cart123',
        expiresAt: new Date()
      })).rejects.toThrow('Failed to create checkout session')

      expect(mockStrapi.log.error).toHaveBeenCalledWith('Error creating checkout session:', expect.any(Error))
    })
  })

  describe('getSession', () => {
    it('should get checkout session by session ID', async () => {
      const mockSession = {
        documentId: 'doc123',
        sessionId: 'session123',
        step: 'shipping',
        status: 'active'
      }

      mockDocuments.findFirst.mockResolvedValue(mockSession)

      const result = await checkoutFlowService.getSession('session123')

      expect(result).toEqual(mockSession)
      expect(mockDocuments.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: { sessionId: 'session123' },
          populate: ['user', 'cart', 'order', 'shippingAddress', 'billingAddress']
        })
      )
    })

    it('should return null for non-existent session', async () => {
      mockDocuments.findFirst.mockResolvedValue(null)

      const result = await checkoutFlowService.getSession('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('updateSession', () => {
    it('should update checkout session successfully', async () => {
      const existingSession = {
        documentId: 'doc123',
        sessionId: 'session123',
        currentStep: 'cart',
        status: 'active'
      }

      const updatedSession = {
        ...existingSession,
        currentStep: 'shipping',
        shippingAddress: { firstName: 'John', lastName: 'Doe' }
      }

      mockDocuments.findFirst.mockResolvedValue(existingSession)
      mockDocuments.update.mockResolvedValue(updatedSession)

      const result = await checkoutFlowService.updateSession('session123', {
        currentStep: 'shipping',
        shippingAddress: { firstName: 'John', lastName: 'Doe' }
      })

      expect(result).toEqual(updatedSession)
      expect(mockDocuments.update).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'doc123',
          data: expect.objectContaining({
            currentStep: 'shipping',
            shippingAddress: { firstName: 'John', lastName: 'Doe' }
          }),
          populate: ['user', 'cart', 'order', 'shippingAddress', 'billingAddress']
        })
      )
    })

    it('should throw error for non-existent session', async () => {
      mockDocuments.findFirst.mockResolvedValue(null)

      await expect(checkoutFlowService.updateSession('non-existent', { step: 'shipping' }))
        .rejects.toThrow('Checkout session not found')
    })

    it('should throw error for invalid step progression', async () => {
      const existingSession = {
        documentId: 'doc123',
        sessionId: 'session123',
        currentStep: 'cart',
        status: 'active'
      }

      mockDocuments.findFirst.mockResolvedValue(existingSession)

      await expect(checkoutFlowService.updateSession('session123', { currentStep: 'payment' }))
        .rejects.toThrow('Invalid step progression from cart to payment')
    })
  })

  describe('isValidStepProgression', () => {
    it('should allow forward progression by one step', () => {
      expect(checkoutFlowService.isValidStepProgression('cart', 'shipping')).toBe(true)
      expect(checkoutFlowService.isValidStepProgression('shipping', 'billing')).toBe(true)
      expect(checkoutFlowService.isValidStepProgression('billing', 'payment')).toBe(true)
    })

    it('should allow backward progression', () => {
      expect(checkoutFlowService.isValidStepProgression('payment', 'billing')).toBe(true)
      expect(checkoutFlowService.isValidStepProgression('billing', 'shipping')).toBe(true)
      expect(checkoutFlowService.isValidStepProgression('shipping', 'cart')).toBe(true)
    })

    it('should not allow skipping steps forward', () => {
      expect(checkoutFlowService.isValidStepProgression('cart', 'payment')).toBe(false)
      expect(checkoutFlowService.isValidStepProgression('shipping', 'review')).toBe(false)
    })
  })

  describe('validateStep', () => {
    it('should validate cart step successfully', async () => {
      const mockSession = {
        documentId: 'doc123',
        sessionId: 'session123',
        step: 'cart',
        cart: { items: [{ id: 1, quantity: 2 }] }
      }

      mockDocuments.findFirst.mockResolvedValue(mockSession)

      const result = await checkoutFlowService.validateStep('session123', 'cart')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.canProceed).toBe(true)
    })

    it('should fail cart validation for empty cart', async () => {
      const mockSession = {
        documentId: 'doc123',
        sessionId: 'session123',
        step: 'cart',
        cart: { items: [] }
      }

      mockDocuments.findFirst.mockResolvedValue(mockSession)

      const result = await checkoutFlowService.validateStep('session123', 'cart')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Cart is empty')
      expect(result.canProceed).toBe(false)
    })

    it('should validate shipping step successfully', async () => {
      const mockSession = {
        documentId: 'doc123',
        sessionId: 'session123',
        step: 'shipping',
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
          phone: '555-1234'
        }
      }

      mockDocuments.findFirst.mockResolvedValue(mockSession)

      const result = await checkoutFlowService.validateStep('session123', 'shipping')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.canProceed).toBe(false) // Can't proceed from shipping to shipping
    })

    it('should fail shipping validation for missing address', async () => {
      const mockSession = {
        documentId: 'doc123',
        sessionId: 'session123',
        step: 'shipping'
      }

      mockDocuments.findFirst.mockResolvedValue(mockSession)

      const result = await checkoutFlowService.validateStep('session123', 'shipping')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Shipping address is required')
      expect(result.canProceed).toBe(false)
    })
  })

  describe('validateAddress', () => {
    it('should validate complete address successfully', async () => {
      const address = {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
        phone: '555-1234'
      }

      const errors = await checkoutFlowService.validateAddress(address)

      expect(errors).toHaveLength(0)
    })

    it('should return errors for incomplete address', async () => {
      // Create a new service instance with different mock for this test
      const mockAddressValidationService = {
        validateAddress: jest.fn<any>().mockResolvedValue({ 
          errors: [
            'Address line 1 is required',
            'City is required',
            'State is required',
            'Postal code is required',
            'Country is required',
            'Phone number is required'
          ] 
        })
      }

      const testMockStrapi = {
        ...mockStrapi,
        service: jest.fn((serviceName: string) => {
          if (serviceName === 'api::address-validation.address-validation') {
            return mockAddressValidationService
          }
          return {}
        })
      }

      const testService = require('../../../services/checkout-flow').default({ strapi: testMockStrapi })

      const address = {
        firstName: 'John',
        lastName: 'Doe',
        // Missing required fields
      }

      const errors = await testService.validateAddress(address)

      expect(errors).toContain('Address line 1 is required')
      expect(errors).toContain('City is required')
      expect(errors).toContain('State is required')
      expect(errors).toContain('Postal code is required')
      expect(errors).toContain('Country is required')
      expect(errors).toContain('Phone number is required')
    })
  })

  describe('abandonSession', () => {
    it('should abandon checkout session successfully', async () => {
      const existingSession = {
        documentId: 'doc123',
        sessionId: 'session123',
        step: 'shipping',
        status: 'active'
      }

      const abandonedSession = {
        ...existingSession,
        status: 'abandoned',
        abandonedAt: new Date()
      }

      mockDocuments.findFirst.mockResolvedValue(existingSession)
      mockDocuments.update.mockResolvedValue(abandonedSession)

      const result = await checkoutFlowService.abandonSession('session123')

      expect(result).toEqual(abandonedSession)
      expect(mockStrapi.log.info).toHaveBeenCalledWith('Checkout session abandoned: session123')
    })

    it('should throw error for completed session', async () => {
      const existingSession = {
        documentId: 'doc123',
        sessionId: 'session123',
        step: 'confirmation',
        status: 'completed'
      }

      mockDocuments.findFirst.mockResolvedValue(existingSession)

      await expect(checkoutFlowService.abandonSession('session123'))
        .rejects.toThrow('Cannot abandon completed checkout session')
    })
  })

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions successfully', async () => {
      const expiredSessions = [
        { documentId: 'doc1' },
        { documentId: 'doc2' }
      ]

      mockDocuments.findMany.mockResolvedValue(expiredSessions)
      mockDocuments.update.mockResolvedValue({})

      const result = await checkoutFlowService.cleanupExpiredSessions()

      expect(result).toBe(2)
      expect(mockStrapi.log.info).toHaveBeenCalledWith('Cleaned up 2 expired checkout sessions')
    })
  })

  describe('getAnalytics', () => {
    it('should return checkout analytics', async () => {
      mockDocuments.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(60)  // completed
        .mockResolvedValueOnce(30)  // abandoned
        .mockResolvedValueOnce(10)  // expired

      const result = await checkoutFlowService.getAnalytics()

      expect(result).toEqual({
        totalSessions: 100,
        completedSessions: 60,
        abandonedSessions: 30,
        expiredSessions: 10,
        conversionRate: 60
      })
    })
  })
})
