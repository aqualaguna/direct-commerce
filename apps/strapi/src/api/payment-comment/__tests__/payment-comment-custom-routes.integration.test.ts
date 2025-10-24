/**
 * Payment Comment Custom Routes Integration Tests
 * 
 * Comprehensive integration tests for Payment Comment custom routes covering:
 * - GET /payment-comment/payment/:paymentId - Get comments by payment ID
 * - GET /payment-comment/search - Search payment comments
 * - GET /payment-comment/statistics - Get payment comment statistics (admin only)
 */

import request from 'supertest'
import { 
  SERVER_URL, 
  setupTestEnvironment, 
  cleanupTestResources, 
  createPayment,
  TestContext,
  TestResources
} from '../../payment/__tests__/test-helpers'

describe('Payment Comment Custom Routes Integration Tests', () => {
  let context: TestContext
  let resources: TestResources

  beforeAll(async () => {
    try {
      const setup = await setupTestEnvironment()
      context = setup.context
      resources = setup.resources

      // Create a test payment for comment operations
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 100.00,
        currency: 'USD',
        paymentType: 'manual',
        paymentNotes: 'Test payment for custom route integration tests'
      }

      const payment = await createPayment(context.testOrder.documentId, paymentData, context.testUserJwt)
      resources.createdPayments.push(payment)
      context.testPayment = payment
    } catch (error) {
      console.error('Failed to setup test environment:', error)
      throw error
    }
  })

  afterAll(async () => {
    if (context && context.apiToken) {
      await cleanupTestResources(resources, context.apiToken)
    }
  })

  describe('Custom Payment Comment Routes', () => {
    let testComments: any[] = []

    beforeAll(async () => {
      // Create multiple test comments for custom route testing
      const commentData = [
        {
          content: 'Payment received successfully',
          type: 'admin',
          isInternal: false
        },
        {
          content: 'Internal verification note',
          type: 'internal',
          isInternal: true
        },
        {
          content: 'System status update',
          type: 'system',
          isInternal: false
        },
        {
          content: 'Customer inquiry about payment',
          type: 'info',
          isInternal: false
        },
        {
          content: 'Payment warning - check amount',
          type: 'warning',
          isInternal: false
        }
      ]

      for (const data of commentData) {
        const response = await request(SERVER_URL)
          .post(`/api/payment-comment`)
          .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
          .send({ 
            data: {
              ...data,
              payment: context.testPayment.documentId
            }
          })
          // .expect(200)
        if (response.status !== 200) {
          throw new Error('Failed to create Payment Comment')
        }
        testComments.push(response.body.data)
        resources.createdPayments.push(response.body.data)
      }
    })

    describe('GET /payment-comment/payment/:paymentId', () => {
      it('should get comments by payment ID for authenticated user', async () => {
        const response = await request(SERVER_URL)
          .get(`/api/payment-comment/payment/${context.testPayment.documentId}`)
          .set('Authorization', `Bearer ${context.testUserJwt}`)
          .expect(200)
        expect(response.body.data).toBeDefined()
        expect(Array.isArray(response.body.data)).toBe(true)
        expect(response.body.data.length).toBeGreaterThan(0)
        
        // Verify all comments belong to the specified payment
        response.body.data.forEach((comment: any) => {
          expect(comment.payment).toBeDefined()
          expect(comment.payment.documentId).toBe(context.testPayment.documentId)
          expect(comment.content).toBeDefined()
          expect(comment.type).toBeDefined()
        })
      })

      it('should get comments by payment ID for admin user', async () => {
        const response = await request(SERVER_URL)
          .get(`/api/payment-comment/payment/${context.testPayment.documentId}`)
          .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
          .expect(200)
        expect(response.body.data).toBeDefined()
        expect(Array.isArray(response.body.data)).toBe(true)
        expect(response.body.data.length).toBeGreaterThan(0)
        
        // Verify all comments belong to the specified payment
        response.body.data.forEach((comment: any) => {
          expect(comment.payment).toBeDefined()
          expect(comment.payment.documentId).toBe(context.testPayment.documentId)
          expect(comment.content).toBeDefined()
          expect(comment.type).toBeDefined()
        })
      })

      it('should return empty array for payment with no comments', async () => {
        // Create a new payment without comments
        const paymentData = {
          paymentMethod: context.testPaymentMethod.documentId,
          amount: 50.00,
          currency: 'USD',
          paymentType: 'manual',
          paymentNotes: 'Payment without comments'
        }

        const payment = await createPayment(context.testOrder.documentId, paymentData, context.testUserJwt)
        resources.createdPayments.push(payment)

        const response = await request(SERVER_URL)
          .get(`/api/payment-comment/payment/${payment.documentId}`)
          .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        expect(response.status).toBe(200)
        expect(response.body.data).toBeDefined()
        expect(Array.isArray(response.body.data)).toBe(true)
        expect(response.body.data.length).toBe(0)
      })

      it('should reject request for non-existent payment ID', async () => {
        await request(SERVER_URL)
          .get(`/api/payment-comment/payment/non-existent-id`)
          .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
          .expect(404)
      })

      it('should reject unauthenticated requests', async () => {
        await request(SERVER_URL)
          .get(`/api/payment-comment/payment/${context.testPayment.documentId}`)
          .expect(403)
      })

      it('should handle invalid payment ID format', async () => {
        await request(SERVER_URL)
          .get(`/api/payment-comment/payment/invalid-format`)
          .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
          .expect(404)
      })
    })

    describe('GET /payment-comment/statistics', () => {
      it('should get payment comment statistics for admin user', async () => {
        const response = await request(SERVER_URL)
          .get(`/api/payment-comment/statistics`)
          .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        expect(response.status).toBe(200)
        expect(response.body.data).toBeDefined()
        expect(response.body.data).toHaveProperty('total')
        expect(response.body.data).toHaveProperty('byType')
        expect(response.body.data).toHaveProperty('internal')
        expect(response.body.data).toHaveProperty('external')
        expect(response.body.data).toHaveProperty('recentComments')
        
        expect(typeof response.body.data.total).toBe('number')
        expect(typeof response.body.data.internal).toBe('number')
        expect(typeof response.body.data.external).toBe('number')
        expect(typeof response.body.data.byType).toBe('object')
        expect(typeof response.body.data.recentComments).toBe('number')
      })

      it('should include payment-specific statistics when payment ID provided', async () => {
        const response = await request(SERVER_URL)
          .get(`/api/payment-comment/statistics`)
          .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
          .query({ payment: context.testPayment.documentId })
          .expect(200)

        expect(response.body.data).toBeDefined()
        expect(response.body.data).toHaveProperty('total')
        expect(response.body.data).toHaveProperty('byType')
        expect(response.body.data).toHaveProperty('internal')
        expect(response.body.data).toHaveProperty('external')
        
        // For a specific payment, we should have some comments
        expect(response.body.data.total).toBeGreaterThan(0)
      })

      it('should reject statistics request from authenticated user without admin role', async () => {
        await request(SERVER_URL)
          .get(`/api/payment-comment/statistics`)
          .set('Authorization', `Bearer ${context.testUserJwt}`)
          .expect(403)
      })

      it('should reject unauthenticated statistics requests', async () => {
        await request(SERVER_URL)
          .get(`/api/payment-comment/statistics`)
          .expect(403)
      })

      it('should handle statistics with date range filters', async () => {
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
        const endDate = new Date().toISOString()

        const response = await request(SERVER_URL)
          .get(`/api/payment-comment/statistics`)
          .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
          .query({ 
            startDate,
            endDate
          })
          .expect(200)

        expect(response.body.data).toBeDefined()
        expect(response.body.data).toHaveProperty('total')
        expect(response.body.data).toHaveProperty('byType')
      })

      it('should handle statistics with type filters', async () => {
        const response = await request(SERVER_URL)
          .get(`/api/payment-comment/statistics`)
          .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
          .query({ 
            type: 'admin'
          })
          .expect(200)

        expect(response.body.data).toBeDefined()
        expect(response.body.data).toHaveProperty('total')
        expect(response.body.data).toHaveProperty('byType')
      })
    })
  })
})
