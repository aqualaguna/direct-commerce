/**
 * Payment Confirmation Workflow Service Tests
 * 
 * Tests for payment confirmation workflow service following Jest 30+ and test standards
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
    createCoreController: jest.fn((serviceName: string, controllerFunction: any) => {
      return controllerFunction({ strapi: mockStrapi })
    }),
    createCoreService: jest.fn((serviceName: string, serviceFunction: any) => {
      return serviceFunction({ strapi: mockStrapi })
    }),
  },
}))

describe('Payment Confirmation Workflow Service', () => {
  let paymentConfirmationService: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up default mock return values for documents
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
    
    // Import the actual service with properly mocked strapi
    const serviceModule = require('../../../services/payment-confirmation-workflow').default
    paymentConfirmationService = serviceModule({ strapi: mockStrapi })
  })

  describe('createPaymentConfirmation', () => {
    it('should create payment confirmation successfully', async () => {
      // Arrange
      const mockManualPayment = {
        documentId: 'payment-123',
        status: 'pending',
        order: { documentId: 'order-123' },
        user: { documentId: 'user-123' },
        paymentMethod: { documentId: 'method-123' }
      }
      const mockPaymentConfirmation = {
        documentId: 'confirmation-123',
        manualPayment: mockManualPayment,
        confirmedBy: { documentId: 'admin-123' },
        confirmationType: 'manual',
        confirmationStatus: 'pending'
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

      mockStrapi.documents('api::manual-payment.manual-payment').findOne.mockResolvedValue(mockManualPayment)
      mockStrapi.documents('api::payment-confirmation.payment-confirmation').findFirst.mockResolvedValue(null)
      mockStrapi.documents('api::payment-confirmation.payment-confirmation').create.mockResolvedValue(mockPaymentConfirmation)

      const data = {
        manualPaymentId: 'payment-123',
        confirmedById: 'admin-123',
        confirmationType: 'manual',
        confirmationNotes: 'Payment confirmed by admin'
      }

      // Act
      const result = await paymentConfirmationService.createPaymentConfirmation(data)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockPaymentConfirmation)
      expect(mockStrapi.documents('api::payment-confirmation.payment-confirmation').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          manualPayment: 'payment-123',
          confirmedBy: 'admin-123',
          confirmationType: 'manual',
          confirmationStatus: 'pending',
          confirmationHistory: expect.arrayContaining([
            expect.objectContaining({
              action: 'created',
              status: 'pending'
            })
          ])
        })
      })
    })

    it('should return error when manual payment not found', async () => {
      // Arrange
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

      mockStrapi.documents('api::manual-payment.manual-payment').findOne.mockResolvedValue(null)

      const data = {
        manualPaymentId: 'non-existent',
        confirmedById: 'admin-123'
      }

      // Act
      const result = await paymentConfirmationService.createPaymentConfirmation(data)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Manual payment not found')
    })

    it('should return error when confirmation already exists', async () => {
      // Arrange
      const mockManualPayment = {
        documentId: 'payment-123',
        status: 'pending'
      }
      const existingConfirmation = {
        documentId: 'existing-confirmation-123',
        confirmationStatus: 'confirmed'
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

      mockStrapi.documents('api::manual-payment.manual-payment').findOne.mockResolvedValue(mockManualPayment)
      mockStrapi.documents('api::payment-confirmation.payment-confirmation').findFirst.mockResolvedValue(existingConfirmation)

      const data = {
        manualPaymentId: 'payment-123',
        confirmedById: 'admin-123'
      }

      // Act
      const result = await paymentConfirmationService.createPaymentConfirmation(data)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Payment confirmation already exists')
    })

    it('should validate required fields', async () => {
      // Arrange
      const data = {
        manualPaymentId: '',
        confirmedById: ''
      }

      // Act
      const result = await paymentConfirmationService.createPaymentConfirmation(data)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Manual payment ID and confirmed by ID are required')
    })
  })

  describe('confirmPayment', () => {
    it('should confirm payment successfully', async () => {
      // Arrange
      const mockConfirmation = {
        documentId: 'confirmation-123',
        confirmationStatus: 'pending',
        manualPayment: { documentId: 'payment-123' },
        confirmationHistory: []
      }
      const mockUpdatedConfirmation = {
        ...mockConfirmation,
        confirmationStatus: 'confirmed',
        confirmedAt: new Date()
      }

      // Create specific mock objects for each document type
      const paymentConfirmationMocks = {
        // @ts-ignore  
        findOne: jest.fn().mockResolvedValue(mockConfirmation),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        // @ts-ignore
        update: jest.fn().mockResolvedValue(mockUpdatedConfirmation),
        delete: jest.fn(),
        count: jest.fn(),
        publish: jest.fn(),
        unpublish: jest.fn(),
        discardDraft: jest.fn(),
      } as any;

      const manualPaymentMocks = {
        // @ts-ignore
        findOne: jest.fn().mockResolvedValue({ 
          documentId: 'payment-123', 
          order: { documentId: 'order-123', status: 'pending' }
        }),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        publish: jest.fn(),
        unpublish: jest.fn(),
        discardDraft: jest.fn(),
      } as any;

      const orderStatusUpdateMocks = {
        findOne: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        // @ts-ignore
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        publish: jest.fn(),
        unpublish: jest.fn(),
        discardDraft: jest.fn(),
      } as any;

      // Set up the mockImplementation to return the same mock objects consistently
      mockStrapi.documents.mockImplementation((contentType: string) => {
        if (contentType === 'api::payment-confirmation.payment-confirmation') {
          return paymentConfirmationMocks;
        } else if (contentType === 'api::manual-payment.manual-payment') {
          return manualPaymentMocks;
        } else if (contentType === 'api::order-status-update.order-status-update') {
          return orderStatusUpdateMocks;
        } else {
          // Default mock for other content types
          return {
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
          } as any
        }
      })
      

      
      // Mock the service call using a more explicit approach
      const mockUpdatePaymentStatus = jest.fn() as any
      mockUpdatePaymentStatus.mockResolvedValue({ success: true })
      mockStrapi.service.mockReturnValue({
        updatePaymentStatus: mockUpdatePaymentStatus
      })

      // Act
      const result = await paymentConfirmationService.confirmPayment('confirmation-123', 'admin-123', 'Payment confirmed')

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUpdatedConfirmation)
      expect(paymentConfirmationMocks.update).toHaveBeenCalledWith({
        documentId: 'confirmation-123',
        data: expect.objectContaining({
          confirmationStatus: 'confirmed',
          confirmationNotes: 'Payment confirmed',
          confirmedAt: expect.any(Date),
          confirmationHistory: expect.arrayContaining([
            expect.objectContaining({
              action: 'confirmed',
              status: 'confirmed'
            })
          ])
        }),
        populate: ['manualPayment', 'confirmedBy']
      })
    })

    it('should return error when confirmation not found', async () => {
      // Arrange
      mockStrapi.documents('api::payment-confirmation.payment-confirmation').findOne.mockResolvedValue(null)

      // Act
      const result = await paymentConfirmationService.confirmPayment('non-existent', 'admin-123')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Payment confirmation not found')
    })

    it('should return error when confirmation is not pending', async () => {
      // Arrange
      const mockConfirmation = {
        documentId: 'confirmation-123',
        confirmationStatus: 'confirmed', // Not pending
        manualPayment: { documentId: 'payment-123' }
      }

      mockStrapi.documents('api::payment-confirmation.payment-confirmation').findOne.mockResolvedValue(mockConfirmation)

      // Act
      const result = await paymentConfirmationService.confirmPayment('confirmation-123', 'admin-123')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Payment confirmation is not in pending status')
    })
  })

  describe('validateStatusTransition', () => {
    it('should validate valid status transitions', async () => {
      // Act
      const result = await paymentConfirmationService.validateStatusTransition('pending', 'confirmed')

      // Assert
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid status transitions', async () => {
      // Act
      const result = await paymentConfirmationService.validateStatusTransition('pending', 'paid')

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid transition from pending to paid')
    })

    it('should provide warnings for specific transitions', async () => {
      // Act
      const result = await paymentConfirmationService.validateStatusTransition('confirmed', 'cancelled')

      // Assert
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Cancelling a confirmed payment may require refund processing')
    })

    it('should handle cancelled status correctly', async () => {
      // Act
      const result = await paymentConfirmationService.validateStatusTransition('cancelled', 'confirmed')

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid transition from cancelled to confirmed')
    })
  })

  describe('getPaymentConfirmation', () => {
    it('should get payment confirmation successfully', async () => {
      // Arrange
      const mockConfirmation = {
        documentId: 'confirmation-123',
        manualPayment: { documentId: 'payment-123' },
        confirmedBy: { documentId: 'admin-123' },
        confirmationStatus: 'confirmed'
      }

      mockStrapi.documents('api::payment-confirmation.payment-confirmation').findOne.mockResolvedValue(mockConfirmation)

      // Act
      const result = await paymentConfirmationService.getPaymentConfirmation('confirmation-123')

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockConfirmation)
      expect(mockStrapi.documents('api::payment-confirmation.payment-confirmation').findOne).toHaveBeenCalledWith({
        documentId: 'confirmation-123',
        populate: ['manualPayment', 'confirmedBy', 'orderStatusUpdate']
      })
    })

    it('should handle confirmation not found', async () => {
      // Arrange
      mockStrapi.documents('api::payment-confirmation.payment-confirmation').findOne.mockResolvedValue(null)

      // Act
      const result = await paymentConfirmationService.getPaymentConfirmation('non-existent')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Payment confirmation not found')
    })
  })

  describe('getConfirmationsByPayment', () => {
    it('should get confirmations by payment successfully', async () => {
      // Arrange
      const mockConfirmations = [
        {
          documentId: 'confirmation-123',
          confirmationStatus: 'confirmed',
          confirmedAt: new Date()
        }
      ]

      mockStrapi.documents('api::payment-confirmation.payment-confirmation').findMany.mockResolvedValue(mockConfirmations)

      // Act
      const result = await paymentConfirmationService.getConfirmationsByPayment('payment-123')

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockConfirmations)
      expect(mockStrapi.documents('api::payment-confirmation.payment-confirmation').findMany).toHaveBeenCalledWith({
        filters: {
          manualPayment: 'payment-123'
        },
        populate: ['confirmedBy', 'orderStatusUpdate'],
        sort: 'confirmedAt:desc'
      })
    })
  })

  describe('cancelPaymentConfirmation', () => {
    it('should cancel payment confirmation successfully', async () => {
      // Arrange
      const mockConfirmation = {
        documentId: 'confirmation-123',
        confirmationStatus: 'pending',
        confirmationHistory: []
      }
      const mockUpdatedConfirmation = {
        ...mockConfirmation,
        confirmationStatus: 'cancelled'
      }

      mockStrapi.documents('api::payment-confirmation.payment-confirmation').findOne.mockResolvedValue(mockConfirmation)
      mockStrapi.documents('api::payment-confirmation.payment-confirmation').update.mockResolvedValue(mockUpdatedConfirmation)

      // Act
      const result = await paymentConfirmationService.cancelPaymentConfirmation('confirmation-123', 'admin-123', 'Cancelled by admin')

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUpdatedConfirmation)
      expect(mockStrapi.documents('api::payment-confirmation.payment-confirmation').update).toHaveBeenCalledWith({
        documentId: 'confirmation-123',
        data: expect.objectContaining({
          confirmationStatus: 'cancelled',
          confirmationNotes: 'Cancelled by admin',
          confirmationHistory: expect.arrayContaining([
            expect.objectContaining({
              action: 'cancelled',
              status: 'cancelled'
            })
          ])
        }),
        populate: ['manualPayment', 'confirmedBy']
      })
    })

    it('should return error when confirmation is already cancelled', async () => {
      // Arrange
      const mockConfirmation = {
        documentId: 'confirmation-123',
        confirmationStatus: 'cancelled'
      }

      mockStrapi.documents('api::payment-confirmation.payment-confirmation').findOne.mockResolvedValue(mockConfirmation)

      // Act
      const result = await paymentConfirmationService.cancelPaymentConfirmation('confirmation-123', 'admin-123')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Payment confirmation is already cancelled')
    })
  })

  describe('getConfirmationStats', () => {
    it('should get confirmation statistics successfully', async () => {
      // Arrange
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

      mockStrapi.documents('api::payment-confirmation.payment-confirmation').count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(20)  // pending
        .mockResolvedValueOnce(50)  // confirmed
        .mockResolvedValueOnce(20)  // failed
        .mockResolvedValueOnce(10)  // cancelled

      const mockConfirmedRecords = [
        {
          createdAt: new Date('2024-01-01T10:00:00Z'),
          confirmedAt: new Date('2024-01-01T10:30:00Z')
        },
        {
          createdAt: new Date('2024-01-01T11:00:00Z'),
          confirmedAt: new Date('2024-01-01T11:45:00Z')
        }
      ]

      mockStrapi.documents('api::payment-confirmation.payment-confirmation').findMany.mockResolvedValue(mockConfirmedRecords)

      // Act
      const result = await paymentConfirmationService.getConfirmationStats()

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        total: 100,
        pending: 20,
        confirmed: 50,
        failed: 20,
        cancelled: 10,
        averageConfirmationTimeMinutes: 38 // (30 + 45) / 2 = 37.5 rounded to 38
      })
    })
  })

  describe('processAutomatedConfirmationRules', () => {
    it('should apply low amount auto-confirm rule', async () => {
      // Arrange
      const mockManualPayment = {
        documentId: 'payment-123',
        amount: 2500, // $25.00 - below $50 threshold
        status: 'pending', // Required for validation
        user: { trustScore: 5 },
        paymentMethod: { code: 'bank_transfer' }
      }
      const mockConfirmation = {
        documentId: 'confirmation-123',
        confirmationType: 'automated'
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

      mockStrapi.documents('api::manual-payment.manual-payment').findOne.mockResolvedValue(mockManualPayment)
      mockStrapi.documents('api::payment-confirmation.payment-confirmation').findFirst.mockResolvedValue(null)
      mockStrapi.documents('api::payment-confirmation.payment-confirmation').create.mockResolvedValue(mockConfirmation)
      mockStrapi.documents('api::payment-confirmation.payment-confirmation').update.mockResolvedValue(mockConfirmation)

      // Act
      const result = await paymentConfirmationService.processAutomatedConfirmationRules('payment-123')

      // Assert
      expect(result.success).toBe(true)
      expect(mockStrapi.documents('api::payment-confirmation.payment-confirmation').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          confirmationType: 'automated',
          automationRules: ['low_amount_auto_confirm']
        })
      })
    })

    it('should apply trusted user auto-confirm rule', async () => {
      // Arrange
      const mockManualPayment = {
        documentId: 'payment-123',
        amount: 10000, // $100.00 - above $50 threshold
        status: 'pending', // Required for validation
        user: { trustScore: 9 }, // High trust score
        paymentMethod: { code: 'bank_transfer' }
      }
      const mockConfirmation = {
        documentId: 'confirmation-123',
        confirmationType: 'automated'
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

      mockStrapi.documents('api::manual-payment.manual-payment').findOne.mockResolvedValue(mockManualPayment)
      mockStrapi.documents('api::payment-confirmation.payment-confirmation').findFirst.mockResolvedValue(null)
      mockStrapi.documents('api::payment-confirmation.payment-confirmation').create.mockResolvedValue(mockConfirmation)
      mockStrapi.documents('api::payment-confirmation.payment-confirmation').update.mockResolvedValue(mockConfirmation)

      // Act
      const result = await paymentConfirmationService.processAutomatedConfirmationRules('payment-123')

      // Assert
      expect(result.success).toBe(true)
      expect(mockStrapi.documents('api::payment-confirmation.payment-confirmation').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          confirmationType: 'automated',
          automationRules: ['trusted_user_auto_confirm']
        })
      })
    })

    it('should require manual review for cash payments', async () => {
      // Arrange
      const mockManualPayment = {
        documentId: 'payment-123',
        amount: 10000, // $100.00 - above $50 threshold to avoid low_amount_auto_confirm rule
        status: 'pending', // Required for validation
        user: { trustScore: 7 }, // Below 8 to avoid trusted_user_auto_confirm rule
        paymentMethod: { code: 'cash' }
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

      mockStrapi.documents('api::manual-payment.manual-payment').findOne.mockResolvedValue(mockManualPayment)
      // No need to mock payment-confirmation operations for manual review case

      // Act
      const result = await paymentConfirmationService.processAutomatedConfirmationRules('payment-123')

      // Assert
      expect(result.success).toBe(true)
      expect(result.data.message).toBe('No automated confirmation rules applied')
      expect(result.data.applicableRules).toContain('cash_payment_manual_review')
    })

    it('should handle payment not found', async () => {
      // Arrange
      mockStrapi.documents('api::manual-payment.manual-payment').findOne.mockResolvedValue(null)

      // Act
      const result = await paymentConfirmationService.processAutomatedConfirmationRules('non-existent')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Manual payment not found')
    })
  })
})
