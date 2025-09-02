/**
 * Guest Checkout Integration tests
 * 
 * Tests for guest checkout creation, validation, and user conversion
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock Strapi factories
jest.mock('@strapi/strapi', () => ({
  factories: {
    createCoreService: jest.fn((serviceName: string, serviceFunction: any) => {
      return serviceFunction
    }),
  },
}))

describe('Guest Checkout Service', () => {
  let guestCheckoutService: any
  let mockStrapi: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Create mock methods
    const createMockMethods = () => ({
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
    })
    
    // Create a fresh mock Strapi instance for each test
    mockStrapi = {
      documents: jest.fn((contentType) => {
        // Return different mock implementations based on content type
        const mockMethods = createMockMethods()
        
        // Store the mock methods so we can access them in tests
        if (contentType === 'api::guest-checkout.guest-checkout') {
          mockStrapi.guestCheckoutMocks = mockMethods
        } else if (contentType === 'plugin::users-permissions.user') {
          mockStrapi.userMocks = mockMethods
        } else if (contentType === 'api::cart.cart') {
          mockStrapi.cartMocks = mockMethods
        } else if (contentType === 'api::checkout.checkout-session') {
          mockStrapi.checkoutSessionMocks = mockMethods
        }
        
        return mockMethods
      }),
      service: jest.fn(),
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
    
    // Initialize mock properties
    mockStrapi.guestCheckoutMocks = createMockMethods()
    mockStrapi.userMocks = createMockMethods()
    mockStrapi.cartMocks = createMockMethods()
    mockStrapi.checkoutSessionMocks = createMockMethods()
    
    // Override the documents function to return the correct mocks
    mockStrapi.documents = jest.fn((contentType) => {
      if (contentType === 'api::guest-checkout.guest-checkout') {
        return mockStrapi.guestCheckoutMocks
      } else if (contentType === 'plugin::users-permissions.user') {
        return mockStrapi.userMocks
      } else if (contentType === 'api::cart.cart') {
        return mockStrapi.cartMocks
      } else if (contentType === 'api::checkout.checkout-session') {
        return mockStrapi.checkoutSessionMocks
      }
      return createMockMethods()
    })
    
    // Import the actual service
    const serviceModule = require('../services/guest-checkout').default
    guestCheckoutService = serviceModule({ strapi: mockStrapi })
  })

  describe('createGuestCheckout', () => {
    it('should create a new guest checkout successfully', async () => {
      const mockGuestCheckout = {
        documentId: 'doc123',
        sessionId: 'session123',
        email: 'guest@example.com',
        firstName: 'John',
        lastName: 'Doe',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Set up the mocks
      mockStrapi.userMocks.findFirst.mockResolvedValue(null)
      mockStrapi.guestCheckoutMocks.create.mockResolvedValue(mockGuestCheckout)

      const result = await guestCheckoutService.createGuestCheckout({
        sessionId: 'session123',
        email: 'guest@example.com',
        firstName: 'John',
        lastName: 'Doe',
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
          phone: '555-1234'
        },
        billingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
          phone: '555-1234'
        },
        cartId: 'cart123',
        expiresAt: new Date()
      })

      expect(result).toEqual(mockGuestCheckout)
      expect(mockStrapi.guestCheckoutMocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: 'session123',
            email: 'guest@example.com',
            firstName: 'John',
            lastName: 'Doe',
            status: 'active'
          }),
          populate: ['cart', 'checkoutSession', 'convertedToUser', 'order']
        })
      )
    })

    it('should reject invalid email format', async () => {
      await expect(guestCheckoutService.createGuestCheckout({
        sessionId: 'session123',
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe',
        shippingAddress: {},
        billingAddress: {},
        cartId: 'cart123',
        expiresAt: new Date()
      })).rejects.toThrow('Invalid email format')
    })

    it('should reject if email already registered', async () => {
      const existingUser = {
        documentId: 'user123',
        email: 'guest@example.com'
      }

      mockStrapi.userMocks.findFirst.mockResolvedValue(existingUser)

      await expect(guestCheckoutService.createGuestCheckout({
        sessionId: 'session123',
        email: 'guest@example.com',
        firstName: 'John',
        lastName: 'Doe',
        shippingAddress: {},
        billingAddress: {},
        cartId: 'cart123',
        expiresAt: new Date()
      })).rejects.toThrow('Email already registered. Please login instead.')
    })
  })

  describe('getGuestCheckout', () => {
    it('should get guest checkout by session ID', async () => {
      const mockGuestCheckout = {
        documentId: 'doc123',
        sessionId: 'session123',
        email: 'guest@example.com',
        firstName: 'John',
        lastName: 'Doe'
      }

      mockStrapi.guestCheckoutMocks.findFirst.mockResolvedValue(mockGuestCheckout)

      const result = await guestCheckoutService.getGuestCheckout('session123')

      expect(result).toEqual(mockGuestCheckout)
      expect(mockStrapi.guestCheckoutMocks.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: { sessionId: 'session123' },
          populate: ['cart', 'checkoutSession', 'convertedToUser', 'order', 'shippingAddress', 'billingAddress']
        })
      )
    })

    it('should return null for non-existent guest checkout', async () => {
      mockStrapi.guestCheckoutMocks.findFirst.mockResolvedValue(null)

      const result = await guestCheckoutService.getGuestCheckout('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('convertToUser', () => {
    it('should convert guest checkout to registered user successfully', async () => {
      const mockGuestCheckout = {
        documentId: 'doc123',
        sessionId: 'session123',
        email: 'guest@example.com',
        firstName: 'John',
        lastName: 'Doe',
        status: 'active',
        cart: { documentId: 'cart123' },
        checkoutSession: { documentId: 'checkout123' }
      }

      const mockNewUser = {
        documentId: 'user123',
        username: 'johndoe',
        email: 'guest@example.com',
        firstName: 'John',
        lastName: 'Doe'
      }

      const mockUpdatedGuestCheckout = {
        ...mockGuestCheckout,
        status: 'converted',
        convertedToUser: mockNewUser,
        convertedAt: new Date()
      }

      // Mock no existing user/username
      mockStrapi.userMocks.findFirst
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce(null) // email check

      // Mock guest checkout retrieval
      mockStrapi.guestCheckoutMocks.findFirst.mockResolvedValue(mockGuestCheckout)

      // Mock user creation
      mockStrapi.userMocks.create.mockResolvedValue(mockNewUser)

      // Mock guest checkout update
      mockStrapi.guestCheckoutMocks.update.mockResolvedValue(mockUpdatedGuestCheckout)

      // Mock cart and checkout session updates
      mockStrapi.cartMocks.update.mockResolvedValue({})
      mockStrapi.checkoutSessionMocks.update.mockResolvedValue({})

      const result = await guestCheckoutService.convertToUser('session123', {
        username: 'johndoe',
        password: 'password123',
        email: 'guest@example.com',
        firstName: 'John',
        lastName: 'Doe'
      })

      expect(result.user).toEqual(mockNewUser)
      expect(result.guestCheckout).toEqual(mockUpdatedGuestCheckout)
      expect(mockStrapi.userMocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            username: 'johndoe',
            email: 'guest@example.com',
            firstName: 'John',
            lastName: 'Doe',
            confirmed: true,
            blocked: false
          })
        })
      )
    })

    it('should reject conversion if username already taken', async () => {
      const existingUser = {
        documentId: 'user123',
        username: 'johndoe'
      }

      const mockGuestCheckout = {
        documentId: 'doc123',
        sessionId: 'session123',
        email: 'guest@example.com',
        firstName: 'John',
        lastName: 'Doe',
        status: 'active'
      }

      // Mock guest checkout retrieval
      mockStrapi.guestCheckoutMocks.findFirst.mockResolvedValue(mockGuestCheckout)

      // Mock existing username
      mockStrapi.userMocks.findFirst.mockResolvedValue(existingUser)

      await expect(guestCheckoutService.convertToUser('session123', {
        username: 'johndoe',
        password: 'password123',
        email: 'guest@example.com',
        firstName: 'John',
        lastName: 'Doe'
      })).rejects.toThrow('Username already taken')
    })

    it('should reject conversion if email already registered', async () => {
      const existingUser = {
        documentId: 'user123',
        email: 'guest@example.com'
      }

      const mockGuestCheckout = {
        documentId: 'doc123',
        sessionId: 'session123',
        email: 'guest@example.com',
        firstName: 'John',
        lastName: 'Doe',
        status: 'active'
      }

      // Mock guest checkout retrieval
      mockStrapi.guestCheckoutMocks.findFirst.mockResolvedValue(mockGuestCheckout)

      // Mock no existing username, but existing email
      mockStrapi.userMocks.findFirst
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce(existingUser) // email check

      await expect(guestCheckoutService.convertToUser('session123', {
        username: 'johndoe',
        password: 'password123',
        email: 'guest@example.com',
        firstName: 'John',
        lastName: 'Doe'
      })).rejects.toThrow('Email already registered')
    })
  })

  describe('validateGuestCheckoutData', () => {
    it('should validate complete guest checkout data successfully', () => {
      const validData = {
        sessionId: 'session123',
        email: 'guest@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '5551234567',
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
          phone: '5551234567'
        },
        billingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
          phone: '5551234567'
        },
        cartId: 'cart123',
        expiresAt: new Date()
      }

      const result = guestCheckoutService.validateGuestCheckoutData(validData)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return errors for invalid data', () => {
      const invalidData = {
        sessionId: 'session123',
        email: 'invalid-email',
        firstName: '',
        lastName: '',
        shippingAddress: {},
        billingAddress: {},
        cartId: 'cart123',
        expiresAt: new Date()
      }

      const result = guestCheckoutService.validateGuestCheckoutData(invalidData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Valid email is required')
      expect(result.errors).toContain('First name is required')
      expect(result.errors).toContain('Last name is required')
      expect(result.errors).toContain('Shipping: First name is required')
      expect(result.errors).toContain('Billing: First name is required')
    })
  })

  describe('validateAddress', () => {
    it('should validate complete address successfully', () => {
      const address = {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
        phone: '5551234567'
      }

      const errors = guestCheckoutService.validateAddress(address)

      expect(errors).toHaveLength(0)
    })

    it('should return errors for incomplete address', () => {
      const address = {
        firstName: 'John',
        lastName: 'Doe',
        // Missing required fields
      }

      const errors = guestCheckoutService.validateAddress(address)

      expect(errors).toContain('Address line 1 is required')
      expect(errors).toContain('City is required')
      expect(errors).toContain('State is required')
      expect(errors).toContain('Postal code is required')
      expect(errors).toContain('Country is required')
      expect(errors).toContain('Phone number is required')
    })
  })

  describe('validatePhone', () => {
    it('should validate valid phone numbers', () => {
      expect(guestCheckoutService.validatePhone('555-123-4567')).toBe(true)
      expect(guestCheckoutService.validatePhone('(555) 123-4567')).toBe(true)
      expect(guestCheckoutService.validatePhone('+1 555 123 4567')).toBe(true)
      expect(guestCheckoutService.validatePhone('5551234567')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      expect(guestCheckoutService.validatePhone('123')).toBe(false)
      expect(guestCheckoutService.validatePhone('abc-def-ghij')).toBe(false)
      expect(guestCheckoutService.validatePhone('')).toBe(false)
    })
  })

  describe('abandonGuestCheckout', () => {
    it('should abandon guest checkout successfully', async () => {
      const mockGuestCheckout = {
        documentId: 'doc123',
        sessionId: 'session123',
        status: 'active'
      }

      const mockAbandonedGuestCheckout = {
        ...mockGuestCheckout,
        status: 'abandoned',
        abandonedAt: new Date()
      }

      mockStrapi.guestCheckoutMocks.findFirst.mockResolvedValue(mockGuestCheckout)
      mockStrapi.guestCheckoutMocks.update.mockResolvedValue(mockAbandonedGuestCheckout)

      const result = await guestCheckoutService.abandonGuestCheckout('session123')

      expect(result).toEqual(mockAbandonedGuestCheckout)
      expect(mockStrapi.log.info).toHaveBeenCalledWith('Guest checkout abandoned: session123')
    })

    it('should reject abandoning completed guest checkout', async () => {
      const mockGuestCheckout = {
        documentId: 'doc123',
        sessionId: 'session123',
        status: 'completed'
      }

      mockStrapi.guestCheckoutMocks.findFirst.mockResolvedValue(mockGuestCheckout)

      await expect(guestCheckoutService.abandonGuestCheckout('session123'))
        .rejects.toThrow('Cannot abandon completed or converted guest checkout')
    })
  })

  describe('cleanupExpiredGuestCheckouts', () => {
    it('should cleanup expired guest checkouts successfully', async () => {
      const expiredGuestCheckouts = [
        { documentId: 'doc1' },
        { documentId: 'doc2' }
      ]

      mockStrapi.guestCheckoutMocks.findMany.mockResolvedValue(expiredGuestCheckouts)
      mockStrapi.guestCheckoutMocks.update.mockResolvedValue({})

      const result = await guestCheckoutService.cleanupExpiredGuestCheckouts()

      expect(result).toBe(2)
      expect(mockStrapi.log.info).toHaveBeenCalledWith('Cleaned up 2 expired guest checkouts')
    })
  })

  describe('getAnalytics', () => {
    it('should return guest checkout analytics', async () => {
      mockStrapi.guestCheckoutMocks.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(40)  // completed
        .mockResolvedValueOnce(30)  // converted
        .mockResolvedValueOnce(20)  // abandoned
        .mockResolvedValueOnce(10)  // expired

      const result = await guestCheckoutService.getAnalytics()

      expect(result).toEqual({
        totalGuestCheckouts: 100,
        completedGuestCheckouts: 40,
        convertedGuestCheckouts: 30,
        abandonedGuestCheckouts: 20,
        expiredGuestCheckouts: 10,
        conversionRate: 30,
        completionRate: 70
      })
    })
  })


})
