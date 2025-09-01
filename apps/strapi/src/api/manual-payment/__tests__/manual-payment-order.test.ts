/**
 * Manual Payment Order Service Tests
 * 
 * Unit tests for manual payment order service following Jest 30+ and test standards
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock Strapi instance
const mockStrapi: any = {
  documents: jest.fn() as jest.MockedFunction<any>,
  service: jest.fn().mockReturnValue({
    updatePaymentStatus: jest.fn() as any
  }),
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
    createCoreController: jest.fn((serviceName, controllerFunction: any) => {
      return controllerFunction({ strapi: mockStrapi })
    }),
    createCoreService: jest.fn((serviceName, serviceFunction: any) => {
      return serviceFunction({ strapi: mockStrapi })
    }),
  },
}))

describe('Manual Payment Order Service', () => {
  let manualPaymentService: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Import the actual service
    const serviceModule = require('../../../services/manual-payment-order').default
    manualPaymentService = serviceModule({ strapi: mockStrapi })
  })

  describe('createManualPaymentOrder', () => {
    it('should create manual payment order successfully', async () => {
      // Arrange
      const mockOrder = {
        documentId: 'order-123',
        status: 'pending',
        user: { documentId: 'user-123' }
      }
      const mockPaymentMethod = {
        documentId: 'method-123',
        isActive: true
      }
      const mockManualPayment = {
        documentId: 'payment-123',
        order: mockOrder,
        user: { documentId: 'user-123' },
        paymentMethod: mockPaymentMethod,
        amount: 2999,
        currency: 'USD',
        status: 'pending'
      }

      // Set up mock return values for documents
      mockStrapi.documents.mockReturnValue({
        findOne: jest.fn<any>().mockResolvedValue(mockOrder),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn<any>().mockResolvedValue(mockManualPayment),
        update: jest.fn<any>().mockResolvedValue({}),
        delete: jest.fn(),
        count: jest.fn(),
        publish: jest.fn(),
        unpublish: jest.fn(),
        discardDraft: jest.fn(),
      } as any);

      // Mock specific method calls - handle both validation and main method calls
      mockStrapi.documents('api::order.order').findOne
        .mockResolvedValueOnce(mockOrder) // For validation (populate: ['user'])
        .mockResolvedValueOnce(mockOrder); // For main method (populate: ['user', 'items'])
      mockStrapi.documents('api::basic-payment-method.basic-payment-method').findOne.mockResolvedValue(mockPaymentMethod);
      mockStrapi.documents('api::manual-payment.manual-payment').create.mockResolvedValue(mockManualPayment);
      mockStrapi.documents('api::order.order').update.mockResolvedValue({});

      const data = {
        orderId: 'order-123',
        userId: 'user-123',
        paymentMethodId: 'method-123',
        amount: 2999,
        currency: 'USD',
        paymentNotes: 'Test payment'
      }

      // Act
      const result = await manualPaymentService.createManualPaymentOrder(data)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockManualPayment)
    })

    it('should return error when order not found', async () => {
      // Arrange
      // Both validation and main method will call findOne, so we need to mock both calls
      mockStrapi.documents('api::order.order').findOne
        .mockResolvedValueOnce(null) // For validation
        .mockResolvedValueOnce(null); // For main method

      const data = {
        orderId: 'non-existent',
        userId: 'user-123',
        paymentMethodId: 'method-123',
        amount: 2999
      }

      // Act
      const result = await manualPaymentService.createManualPaymentOrder(data)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Validation failed: Order not found')
    })

    it('should validate required fields', async () => {
      // Arrange
      const data = {
        orderId: '',
        userId: '',
        paymentMethodId: '',
        amount: 0
      }

      // Act
      const result = await manualPaymentService.createManualPaymentOrder(data)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('Validation failed')
    })
  })

  describe('validateManualPaymentOrder', () => {
    it('should validate correct data successfully', async () => {
      // Arrange
      const mockOrder = {
        documentId: 'order-123',
        status: 'pending',
        user: { documentId: 'user-123' }
      }

      // Set up mock return values for documents
      mockStrapi.documents.mockReturnValue({
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
      } as any);

      mockStrapi.documents('api::order.order').findOne.mockResolvedValue(mockOrder)

      const data = {
        orderId: 'order-123',
        userId: 'user-123',
        paymentMethodId: 'method-123',
        amount: 2999,
        currency: 'USD'
      }

      // Act
      const result = await manualPaymentService.validateManualPaymentOrder(data)

      // Assert
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return validation errors for missing fields', async () => {
      // Arrange
      const data = {
        orderId: '',
        userId: '',
        paymentMethodId: '',
        amount: 0
      }

      // Act
      const result = await manualPaymentService.validateManualPaymentOrder(data)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Order ID is required')
    })
  })

  describe('getManualPayment', () => {
    it('should get manual payment successfully', async () => {
      // Arrange
      const mockPayment = {
        documentId: 'payment-123',
        order: { documentId: 'order-123' },
        user: { documentId: 'user-123' },
        paymentMethod: { documentId: 'method-123' },
        amount: 2999,
        status: 'pending'
      }

      mockStrapi.documents('api::manual-payment.manual-payment').findOne.mockResolvedValue(mockPayment)

      // Act
      const result = await manualPaymentService.getManualPayment('payment-123')

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockPayment)
    })
  })

  describe('updatePaymentStatus', () => {
    it('should update payment status successfully', async () => {
      // Arrange
      const mockPayment = {
        documentId: 'payment-123',
        order: { documentId: 'order-123' },
        status: 'confirmed'
      }

      mockStrapi.documents('api::manual-payment.manual-payment').update.mockResolvedValue(mockPayment)

      // Act
      const result = await manualPaymentService.updatePaymentStatus('payment-123', 'confirmed', 'admin-123')

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockPayment)
    })
  })

  describe('getPendingPayments', () => {
    it('should get pending payments successfully', async () => {
      // Arrange
      const mockPayments = [
        {
          documentId: 'payment-123',
          order: { documentId: 'order-123' },
          user: { documentId: 'user-123' },
          paymentMethod: { documentId: 'method-123' },
          status: 'pending'
        }
      ]

      mockStrapi.documents('api::manual-payment.manual-payment').findMany.mockResolvedValue(mockPayments)

      // Act
      const result = await manualPaymentService.getPendingPayments(1, 25)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockPayments)
    })
  })

  describe('cancelManualPayment', () => {
    it('should cancel manual payment successfully', async () => {
      // Arrange
      const mockPayment = {
        documentId: 'payment-123',
        order: { documentId: 'order-123' },
        status: 'cancelled'
      }

      mockStrapi.documents('api::manual-payment.manual-payment').update.mockResolvedValue(mockPayment)

      // Act
      const result = await manualPaymentService.cancelManualPayment('payment-123', 'Customer requested cancellation')

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockPayment)
    })
  })
})
