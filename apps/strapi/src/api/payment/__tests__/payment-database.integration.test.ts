/**
 * Payment Database Verification Tests
 * 
 * Tests for database verification and data integrity including:
 * - Payment creation verification
 * - Payment confirmation updates
 * - Database consistency checks
 */

import request from 'supertest'
import { 
  SERVER_URL, 
  setupTestEnvironment, 
  cleanupTestResources, 
  createNewOrderForTest,
  TestContext,
  TestResources
} from './test-helpers'

describe('Payment Database Verification Tests', () => {
  let context: TestContext
  let resources: TestResources

  beforeAll(async () => {
    const setup = await setupTestEnvironment()
    context = setup.context
    resources = setup.resources
  })

  afterAll(async () => {
    await cleanupTestResources(resources, context.apiToken)
  })

  describe('Database Verification', () => {
    it('should verify payment creation in database', async () => {
      const { order } = await createNewOrderForTest(context, resources)
      
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 125.00,
        currency: 'USD',
        paymentType: 'manual',
        paymentNotes: 'Database verification test'
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment/${order.documentId}`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: paymentData })
        .expect(200)

      const createdPayment = response.body.data
      resources.createdPayments.push(createdPayment)

      // Verify payment exists in database
      expect(createdPayment.documentId).toBeDefined()
      expect(createdPayment.amount).toBe(paymentData.amount)
      expect(createdPayment.currency).toBe(paymentData.currency)
      expect(createdPayment.status).toBe('pending')
      expect(createdPayment.paymentConfirmation).toBeDefined()
      expect(createdPayment.order).toBeDefined()
      expect(createdPayment.paymentMethod).toBeDefined()
    })

    it('should verify payment confirmation updates in database', async () => {
      const { order } = await createNewOrderForTest(context, resources)
      
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 135.00,
        currency: 'USD',
        paymentType: 'manual'
      }

      const createResponse = await request(SERVER_URL)
        .post(`/api/payment/${order.documentId}`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: paymentData })
        .expect(200)

      const payment = createResponse.body.data
      resources.createdPayments.push(payment)

      // Confirm the payment
      const confirmationData = {
        confirmedBy: 'admin-user-id',
        confirmationNotes: 'Database verification confirmation',
        confirmationEvidence: {
          receipt: 'receipt-456',
          verified: true
        }
      }

      const confirmResponse = await request(SERVER_URL)
        .post(`/api/payment/${payment.documentId}/confirm`)
        .set('Authorization', `Bearer ${context.apiToken}`)
        .send({ data: confirmationData })
        .expect(200)

      // Verify confirmation in database
      expect(confirmResponse.body.data).toBeDefined()
      expect(confirmResponse.body.data.confirmationStatus).toBe('confirmed')
      expect(confirmResponse.body.data.confirmationNotes).toBe(confirmationData.confirmationNotes)
    })

    it('should verify payment relationships in database', async () => {
      const { order } = await createNewOrderForTest(context, resources)
      
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 165.00,
        currency: 'USD',
        paymentType: 'manual',
        paymentNotes: 'Relationship verification test'
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment/${order.documentId}`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: paymentData })
        .expect(200)

      const payment = response.body.data
      resources.createdPayments.push(payment)

      // Verify payment relationships
      expect(payment.order).toBeDefined()
      expect(payment.order.documentId).toBe(order.documentId)
      expect(payment.paymentMethod).toBeDefined()
      expect(payment.paymentMethod.documentId).toBe(context.testPaymentMethod.documentId)
      expect(payment.user).toBeDefined()
      expect(payment.user.id).toBe(context.testUser.id)
    })

    it('should verify payment confirmation relationships', async () => {
      const { order } = await createNewOrderForTest(context, resources)
      
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 175.00,
        currency: 'USD',
        paymentType: 'manual'
      }

      const createResponse = await request(SERVER_URL)
        .post(`/api/payment/${order.documentId}`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: paymentData })
        .expect(200)

      const payment = createResponse.body.data
      resources.createdPayments.push(payment)

      // Verify initial payment confirmation
      expect(payment.paymentConfirmation).toBeDefined()
      expect(payment.paymentConfirmation.confirmationStatus).toBe('pending')
      expect(payment.paymentConfirmation.confirmationType).toBe(paymentData.paymentType)

      // Confirm the payment
      const confirmationData = {
        confirmedBy: 'admin-user-id',
        confirmationNotes: 'Relationship verification confirmation',
        confirmationEvidence: {
          receipt: 'receipt-789',
          verified: true
        }
      }

      const confirmResponse = await request(SERVER_URL)
        .post(`/api/payment/${payment.documentId}/confirm`)
        .set('Authorization', `Bearer ${context.apiToken}`)
        .send({ data: confirmationData })
        .expect(200)

      // Verify confirmation relationships
      expect(confirmResponse.body.data).toBeDefined()
      expect(confirmResponse.body.data.confirmationStatus).toBe('confirmed')
      const history = confirmResponse.body.data.confirmationHistory;
      expect(history.history[history.history.length - 1].confirmedBy).toBe(confirmationData.confirmedBy)
      expect(confirmResponse.body.data.confirmationNotes).toBe(confirmationData.confirmationNotes)
    })

    it('should verify payment data consistency', async () => {
      const { order } = await createNewOrderForTest(context, resources)
      
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 185.00,
        currency: 'USD',
        paymentType: 'manual',
        paymentNotes: 'Data consistency test'
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment/${order.documentId}`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: paymentData })
        .expect(200)

      const payment = response.body.data
      resources.createdPayments.push(payment)

      // Verify data consistency
      expect(payment.amount).toBe(paymentData.amount)
      expect(payment.currency).toBe(paymentData.currency)
      expect(payment.paymentType).toBe(paymentData.paymentType)
      expect(payment.paymentNotes).toBe(paymentData.paymentNotes)
      expect(payment.status).toBe('pending')
      expect(payment.createdAt).toBeDefined()
      expect(payment.updatedAt).toBeDefined()
    })

    it('should verify payment confirmation data consistency', async () => {
      const { order } = await createNewOrderForTest(context, resources)
      
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 195.00,
        currency: 'USD',
        paymentType: 'manual'
      }

      const createResponse = await request(SERVER_URL)
        .post(`/api/payment/${order.documentId}`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: paymentData })
        .expect(200)

      const payment = createResponse.body.data
      resources.createdPayments.push(payment)

      const confirmationData = {
        confirmedBy: 'admin-user-id',
        confirmationNotes: 'Data consistency confirmation test',
        confirmationEvidence: {
          receipt: 'receipt-999',
          verified: true,
          timestamp: new Date().toISOString()
        }
      }

      const confirmResponse = await request(SERVER_URL)
        .post(`/api/payment/${payment.documentId}/confirm`)
        .set('Authorization', `Bearer ${context.apiToken}`)
        .send({ data: confirmationData })
        .expect(200)

      // Verify confirmation data consistency
      expect(confirmResponse.body.data).toBeDefined()
      expect(confirmResponse.body.data.confirmationStatus).toBe('confirmed')
      const history = confirmResponse.body.data.confirmationHistory;
      expect(history.history[history.history.length - 1].confirmedBy).toBe(confirmationData.confirmedBy)
      expect(confirmResponse.body.data.confirmationNotes).toBe(confirmationData.confirmationNotes)
      expect(confirmResponse.body.data.confirmationEvidence).toBeDefined()
    })
  })
})
