/**
 * Payment Review Service Tests
 * 
 * Integration tests for payment review service following Jest 30+ and test standards
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock Strapi instance
const mockStrapi: any = {
  documents: jest.fn() as jest.MockedFunction<any>,
  service: jest.fn().mockReturnValue({
    // Mock service methods
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

describe('Payment Review Service', () => {
  let paymentReviewService: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Import the actual service
    const serviceModule = require('../../../services/payment-review').default
    paymentReviewService = serviceModule({ strapi: mockStrapi })
  })

  describe('createPaymentReview', () => {
    it('should create payment review successfully', async () => {
      // Arrange
      const mockManualPayment = {
        documentId: 'payment-123',
        status: 'pending',
        order: { documentId: 'order-123' },
        user: { documentId: 'user-123' },
        paymentMethod: { documentId: 'method-123' }
      }
      const mockPaymentReview = {
        documentId: 'review-123',
        manualPayment: mockManualPayment,
        reviewer: { documentId: 'admin-123' },
        status: 'pending',
        priority: 'normal'
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
      mockStrapi.documents('api::payment-review.payment-review').findFirst.mockResolvedValue(null)
      mockStrapi.documents('api::payment-review.payment-review').create.mockResolvedValue(mockPaymentReview)

      const data = {
        manualPaymentId: 'payment-123',
        reviewerId: 'admin-123',
        status: 'pending',
        priority: 'normal'
      }

      // Act
      const result = await paymentReviewService.createPaymentReview(data)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockPaymentReview)
      expect(mockStrapi.documents('api::manual-payment.manual-payment').findOne).toHaveBeenCalledWith({
        documentId: 'payment-123',
        populate: ['user', 'paymentMethod']
      })
      expect(mockStrapi.documents('api::payment-review.payment-review').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          manualPayment: 'payment-123',
          reviewer: 'admin-123',
          status: 'pending',
          priority: 'normal',
          reviewHistory: expect.arrayContaining([
            expect.objectContaining({
              action: 'created',
              reviewer: 'admin-123'
            })
          ])
        })
      })
    })

    it('should return error when manual payment not found', async () => {
      // Arrange
      mockStrapi.documents('api::manual-payment.manual-payment').findOne.mockResolvedValue(null)

      const data = {
        manualPaymentId: 'non-existent',
        reviewerId: 'admin-123'
      }

      // Act
      const result = await paymentReviewService.createPaymentReview(data)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Manual payment not found')
    })

    it('should return error when payment is not in pending status', async () => {
      // Arrange
      const mockManualPayment = {
        documentId: 'payment-123',
        status: 'confirmed', // Not pending
        order: { documentId: 'order-123' },
        user: { documentId: 'user-123' },
        paymentMethod: { documentId: 'method-123' }
      }

      mockStrapi.documents('api::manual-payment.manual-payment').findOne.mockResolvedValue(mockManualPayment)

      const data = {
        manualPaymentId: 'payment-123',
        reviewerId: 'admin-123'
      }

      // Act
      const result = await paymentReviewService.createPaymentReview(data)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Payment is not in pending status')
    })

    it('should return error when review already exists', async () => {
      // Arrange
      const mockManualPayment = {
        documentId: 'payment-123',
        status: 'pending',
        order: { documentId: 'order-123' },
        user: { documentId: 'user-123' },
        paymentMethod: { documentId: 'method-123' }
      }
      const existingReview = {
        documentId: 'existing-review-123',
        status: 'pending'
      }

      mockStrapi.documents('api::manual-payment.manual-payment').findOne.mockResolvedValue(mockManualPayment)
      mockStrapi.documents('api::payment-review.payment-review').findFirst.mockResolvedValue(existingReview)

      const data = {
        manualPaymentId: 'payment-123',
        reviewerId: 'admin-123'
      }

      // Act
      const result = await paymentReviewService.createPaymentReview(data)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Payment review already exists')
    })

    it('should validate required fields', async () => {
      // Arrange
      const data = {
        manualPaymentId: '',
        reviewerId: ''
      }

      // Act
      const result = await paymentReviewService.createPaymentReview(data)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Manual payment ID and reviewer ID are required')
    })
  })

  describe('updatePaymentReview', () => {
    it('should update payment review successfully', async () => {
      // Arrange
      const mockCurrentReview = {
        documentId: 'review-123',
        status: 'pending',
        reviewer: { documentId: 'admin-123' },
        createdAt: new Date('2024-01-01T10:00:00Z'),
        reviewHistory: []
      }
      const mockUpdatedReview = {
        ...mockCurrentReview,
        status: 'approved',
        reviewedAt: new Date(),
        reviewDuration: 30
      }

      mockStrapi.documents('api::payment-review.payment-review').findOne.mockResolvedValue(mockCurrentReview)
      mockStrapi.documents('api::payment-review.payment-review').update.mockResolvedValue(mockUpdatedReview)

      const updateData = {
        status: 'approved',
        reviewNotes: 'Payment approved'
      }

      // Act
      const result = await paymentReviewService.updatePaymentReview('review-123', updateData)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUpdatedReview)
      expect(mockStrapi.documents('api::payment-review.payment-review').update).toHaveBeenCalledWith({
        documentId: 'review-123',
        data: expect.objectContaining({
          status: 'approved',
          reviewedAt: expect.any(Date),
          reviewDuration: expect.any(Number),
          reviewHistory: expect.arrayContaining([
            expect.objectContaining({
              action: 'updated',
              previousStatus: 'pending',
              newStatus: 'approved'
            })
          ])
        }),
        populate: ['manualPayment', 'reviewer', 'assignedTo']
      })
    })

    it('should return error when review not found', async () => {
      // Arrange
      mockStrapi.documents('api::payment-review.payment-review').findOne.mockResolvedValue(null)

      const updateData = {
        status: 'approved'
      }

      // Act
      const result = await paymentReviewService.updatePaymentReview('non-existent', updateData)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Payment review not found')
    })
  })

  describe('getReviewQueue', () => {
    it('should get review queue with filters', async () => {
      // Arrange
      const mockReviews = [
        {
          documentId: 'review-123',
          status: 'pending',
          priority: 'high',
          manualPayment: { documentId: 'payment-123' },
          reviewer: { documentId: 'admin-123' }
        }
      ]

      mockStrapi.documents('api::payment-review.payment-review').findMany.mockResolvedValue(mockReviews)

      const filters = {
        status: 'pending',
        priority: 'high'
      }

      // Act
      const result = await paymentReviewService.getReviewQueue(filters, 1, 25)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockReviews)
      expect(mockStrapi.documents('api::payment-review.payment-review').findMany).toHaveBeenCalledWith({
        filters: {
          status: 'pending',
          priority: 'high'
        },
        populate: ['manualPayment', 'reviewer', 'assignedTo'],
        sort: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'asc' }
        ],
        pagination: {
          page: 1,
          pageSize: 25
        }
      })
    })

    it('should default to pending status when no filters provided', async () => {
      // Arrange
      const mockReviews = []
      mockStrapi.documents('api::payment-review.payment-review').findMany.mockResolvedValue(mockReviews)

      // Act
      const result = await paymentReviewService.getReviewQueue()

      // Assert
      expect(result.success).toBe(true)
      expect(mockStrapi.documents('api::payment-review.payment-review').findMany).toHaveBeenCalledWith({
        filters: {
          status: 'pending'
        },
        populate: ['manualPayment', 'reviewer', 'assignedTo'],
        sort: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'asc' }
        ],
        pagination: {
          page: 1,
          pageSize: 25
        }
      })
    })
  })

  describe('getReviewStats', () => {
    it('should get review statistics successfully', async () => {
      // Arrange
      mockStrapi.documents('api::payment-review.payment-review').count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(20)  // pending
        .mockResolvedValueOnce(50)  // approved
        .mockResolvedValueOnce(20)  // rejected
        .mockResolvedValueOnce(10)  // requires_info
        .mockResolvedValueOnce(5)   // overdue

      const mockCompletedReviews = [
        { reviewDuration: 30 },
        { reviewDuration: 45 },
        { reviewDuration: 60 }
      ]

      mockStrapi.documents('api::payment-review.payment-review').findMany.mockResolvedValue(mockCompletedReviews)

      // Act
      const result = await paymentReviewService.getReviewStats()

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        total: 100,
        pending: 20,
        approved: 50,
        rejected: 20,
        requiresInfo: 10,
        overdue: 5,
        averageDurationMinutes: 45
      })
    })
  })

  describe('assignReview', () => {
    it('should assign review successfully', async () => {
      // Arrange
      const mockReview = {
        documentId: 'review-123',
        status: 'pending'
      }
      const mockUpdatedReview = {
        ...mockReview,
        assignedTo: { documentId: 'admin-456' }
      }

      mockStrapi.documents('api::payment-review.payment-review').findOne.mockResolvedValue(mockReview)
      mockStrapi.documents('api::payment-review.payment-review').update.mockResolvedValue(mockUpdatedReview)

      // Act
      const result = await paymentReviewService.assignReview('review-123', 'admin-456')

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUpdatedReview)
      expect(mockStrapi.documents('api::payment-review.payment-review').update).toHaveBeenCalledWith({
        documentId: 'review-123',
        data: {
          assignedTo: 'admin-456'
        },
        populate: ['manualPayment', 'reviewer', 'assignedTo']
      })
    })

    it('should return error when review not found', async () => {
      // Arrange
      mockStrapi.documents('api::payment-review.payment-review').findOne.mockResolvedValue(null)

      // Act
      const result = await paymentReviewService.assignReview('non-existent', 'admin-456')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Payment review not found')
    })

    it('should return error when review is not pending', async () => {
      // Arrange
      const mockReview = {
        documentId: 'review-123',
        status: 'approved' // Not pending
      }

      mockStrapi.documents('api::payment-review.payment-review').findOne.mockResolvedValue(mockReview)

      // Act
      const result = await paymentReviewService.assignReview('review-123', 'admin-456')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Only pending reviews can be assigned')
    })
  })

  describe('bulkUpdateReviewStatus', () => {
    it('should bulk update review status successfully', async () => {
      // Arrange
      const mockReview = {
        documentId: 'review-123',
        status: 'pending',
        reviewer: { documentId: 'admin-123' },
        createdAt: new Date('2024-01-01T10:00:00Z'),
        reviewHistory: []
      }
      const mockUpdatedReview = {
        ...mockReview,
        status: 'approved'
      }

      mockStrapi.documents('api::payment-review.payment-review').findOne.mockResolvedValue(mockReview)
      mockStrapi.documents('api::payment-review.payment-review').update.mockResolvedValue(mockUpdatedReview)

      const reviewIds = ['review-123', 'review-456']

      // Act
      const result = await paymentReviewService.bulkUpdateReviewStatus(reviewIds, 'approved', 'admin-123')

      // Assert
      expect(result.success).toBe(true)
      expect(result.data.updated).toHaveLength(2)
      expect(result.data.errors).toHaveLength(0)
    })

    it('should handle partial failures in bulk update', async () => {
      // Arrange
      const mockReview = {
        documentId: 'review-123',
        status: 'pending',
        reviewer: { documentId: 'admin-123' },
        createdAt: new Date('2024-01-01T10:00:00Z'),
        reviewHistory: []
      }

      mockStrapi.documents('api::payment-review.payment-review').findOne
        .mockResolvedValueOnce(mockReview) // First review exists
        .mockResolvedValueOnce(null)       // Second review doesn't exist
      mockStrapi.documents('api::payment-review.payment-review').update.mockResolvedValue(mockReview)

      const reviewIds = ['review-123', 'non-existent']

      // Act
      const result = await paymentReviewService.bulkUpdateReviewStatus(reviewIds, 'approved', 'admin-123')

      // Assert
      expect(result.success).toBe(false)
      expect(result.data.updated).toHaveLength(1)
      expect(result.data.errors).toHaveLength(1)
      expect(result.error).toBe('1 reviews failed to update')
    })
  })
})
