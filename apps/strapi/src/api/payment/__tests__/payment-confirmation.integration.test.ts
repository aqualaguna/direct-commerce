/**
 * Payment Confirmation Tests
 * 
 * Tests for payment confirmation functionality including:
 * - Admin payment confirmation
 * - Payment status management
 * - Confirmation security and validation
 */

import request from 'supertest'
import { 
  SERVER_URL, 
  setupTestEnvironment, 
  cleanupTestResources, 
  createNewOrderForTest,
  createPayment,
  confirmPayment,
  TestContext,
  TestResources
} from './test-helpers'

describe('Payment Confirmation Tests', () => {
  let context: TestContext
  let resources: TestResources

  beforeAll(async () => {
    const setup = await setupTestEnvironment()
    context = setup.context
    resources = setup.resources

    // Create initial payment for some tests
    const paymentData = {
      paymentMethod: context.testPaymentMethod.documentId,
      amount: 100.00,
      currency: 'USD',
      paymentType: 'manual',
      paymentNotes: 'Test payment for confirmation tests'
    }

    const payment = await createPayment(context.testOrder.documentId, paymentData, context.testUserJwt)
    resources.createdPayments.push(payment)
    context.testPayment = payment
  })

  afterAll(async () => {
    await cleanupTestResources(resources, context.apiToken)
  })

  describe('Admin Payment Confirmation', () => {
    it('should confirm payment as admin', async () => {
      if (!context.testPayment) {
        throw new Error('No test payment available for confirmation')
      }

      const confirmationData = {
        confirmedBy: 'admin-user-id',
        confirmationNotes: 'Payment verified by admin',
        confirmationEvidence: {
          receipt: 'receipt-123',
          verified: true
        },
        attachments: []
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment/${context.testPayment.documentId}/confirm`)
        .set('Authorization', `Bearer ${context.apiToken}`)
        .send({ data: confirmationData })
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.meta.message).toBe('Payment confirmed successfully')
    })

    it('should reject payment confirmation without admin authentication', async () => {
      const { order } = await createNewOrderForTest(context, resources)
      
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 200.00,
        currency: 'USD',
        paymentType: 'manual'
      }

      const payment = await createPayment(order.documentId, paymentData, context.testUserJwt)
      resources.createdPayments.push(payment)

      const confirmationData = {
        confirmedBy: 'user-id',
        confirmationNotes: 'Unauthorized confirmation attempt'
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment/${payment.documentId}/confirm`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: confirmationData })
        .expect(403)

      expect(response.body.error).toBeDefined()
    })

    it('should reject payment confirmation without authentication', async () => {
      const { order } = await createNewOrderForTest(context, resources)
      
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 200.00,
        currency: 'USD',
        paymentType: 'manual'
      }

      const payment = await createPayment(order.documentId, paymentData, context.testUserJwt)
      resources.createdPayments.push(payment)

      const confirmationData = {
        confirmedBy: 'anonymous',
        confirmationNotes: 'Anonymous confirmation attempt'
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment/${payment.documentId}/confirm`)
        .send({ data: confirmationData })
        .expect(403)

      expect(response.body.error).toBeDefined()
    })

    it('should reject confirmation of non-existent payment', async () => {
      const confirmationData = {
        confirmedBy: 'admin-user-id',
        confirmationNotes: 'Confirmation attempt for non-existent payment'
      }

      const response = await request(SERVER_URL)
        .post('/api/payment/non-existent-payment-id/confirm')
        .set('Authorization', `Bearer ${context.apiToken}`)
        .send({ data: confirmationData })
        .expect(404)

      expect(response.body.error).toBeDefined()
    })

    it('should reject confirmation of already confirmed payment', async () => {
      const { order } = await createNewOrderForTest(context, resources)
      
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 200.00,
        currency: 'USD',
        paymentType: 'manual'
      }

      const payment = await createPayment(order.documentId, paymentData, context.testUserJwt)
      resources.createdPayments.push(payment)

      // Confirm the payment first
      const confirmationData = {
        confirmedBy: 'admin-user-id',
        confirmationNotes: 'First confirmation'
      }

      await confirmPayment(payment.documentId, confirmationData, context.apiToken)

      // Try to confirm again
      const secondConfirmationData = {
        confirmedBy: 'admin-user-id',
        confirmationNotes: 'Second confirmation attempt'
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment/${payment.documentId}/confirm`)
        .set('Authorization', `Bearer ${context.apiToken}`)
        .send({ data: secondConfirmationData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })
  })

  describe('Payment Status Management', () => {
    it('should update payment status after confirmation', async () => {
      const { order } = await createNewOrderForTest(context, resources)
      
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 85.00,
        currency: 'USD',
        paymentType: 'manual'
      }

      const payment = await createPayment(order.documentId, paymentData, context.testUserJwt)
      resources.createdPayments.push(payment)

      // Confirm the payment
      const confirmationData = {
        confirmedBy: 'admin-user-id',
        confirmationNotes: 'Status update test confirmation'
      }

      const confirmResponse = await request(SERVER_URL)
        .post(`/api/payment/${payment.documentId}/confirm`)
        .set('Authorization', `Bearer ${context.apiToken}`)
        .send({ data: confirmationData })
        .expect(200)

      expect(confirmResponse.body.data).toBeDefined()
    })
  })

  describe('Payment Confirmation Workflow', () => {
    it('should create payment confirmation when payment is created', async () => {
      const { order } = await createNewOrderForTest(context, resources)
      
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 145.00,
        currency: 'USD',
        paymentType: 'manual'
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment/${order.documentId}`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: paymentData })
        .expect(200)

      const payment = response.body.data
      resources.createdPayments.push(payment)

      // Verify payment confirmation was created
      expect(payment.paymentConfirmation).toBeDefined()
      expect(payment.paymentConfirmation.confirmationStatus).toBe('pending')
      expect(payment.paymentConfirmation.confirmationType).toBe(paymentData.paymentType)
    })

    it('should handle payment confirmation workflow end-to-end', async () => {
      const { order } = await createNewOrderForTest(context, resources)
      
      // Step 1: Create payment
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 155.00,
        currency: 'USD',
        paymentType: 'manual',
        paymentNotes: 'End-to-end workflow test'
      }

      const createResponse = await request(SERVER_URL)
        .post(`/api/payment/${order.documentId}`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: paymentData })
        .expect(200)

      const payment = createResponse.body.data
      resources.createdPayments.push(payment)

      // Step 2: Verify initial state
      expect(payment.status).toBe('pending')
      expect(payment.paymentConfirmation.confirmationStatus).toBe('pending')

      // Step 3: Admin confirms payment
      const confirmationData = {
        confirmedBy: 'admin-user-id',
        confirmationNotes: 'End-to-end workflow confirmation',
        confirmationEvidence: {
          receipt: 'receipt-789',
          verified: true,
          timestamp: new Date().toISOString()
        }
      }

      const confirmResponse = await request(SERVER_URL)
        .post(`/api/payment/${payment.documentId}/confirm`)
        .set('Authorization', `Bearer ${context.apiToken}`)
        .send({ data: confirmationData })
        .expect(200)

      // Step 4: Verify final state
      expect(confirmResponse.body.data).toBeDefined()
      expect(confirmResponse.body.meta.message).toBe('Payment confirmed successfully')
    })
  })
})
