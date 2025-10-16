/**
 * Payment Creation Tests
 * 
 * Tests for payment creation functionality including:
 * - Payment creation for authenticated users
 * - Payment creation for guest users
 * - Payment validation and error handling
 */

import request from 'supertest'
import { 
  SERVER_URL, 
  setupTestEnvironment, 
  cleanupTestResources, 
  createNewOrderForTest,
  createGuestAddress,
  createCompleteOrder,
  TestContext,
  TestResources
} from './test-helpers'

describe('Payment Creation Tests', () => {
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

  describe('Authenticated User Payment Creation', () => {
    it('should create payment for authenticated user', async () => {
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 100.00,
        currency: 'USD',
        paymentType: 'manual',
        paymentNotes: 'Test payment for authenticated user'
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment/${context.testOrder.documentId}`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: paymentData })
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.data.amount).toBe(paymentData.amount)
      expect(response.body.data.currency).toBe(paymentData.currency)
      expect(response.body.data.status).toBe('pending')
      expect(response.body.data.paymentType).toBe(paymentData.paymentType)
      expect(response.body.data.paymentConfirmation).toBeDefined()

      const payment = response.body.data
      resources.createdPayments.push(payment)
      context.testPayment = payment
    })

    it('should create payment with pending status', async () => {
      const { order } = await createNewOrderForTest(context, resources)

      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 75.00,
        currency: 'USD',
        paymentType: 'manual'
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment/${order.documentId}`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: paymentData })
        .expect(200)

      expect(response.body.data.status).toBe('pending')
      expect(response.body.data.paymentConfirmation).toBeDefined()
      expect(response.body.data.paymentConfirmation.confirmationStatus).toBe('pending')

      resources.createdPayments.push(response.body.data)
    })
  })

  describe('Guest User Payment Creation', () => {
    it('should create payment for guest user with session ID', async () => {
      const sessionId = `session_${context.timestamp}`
      
      // Create a guest order for this test
      const guestAddress = await createGuestAddress(sessionId, context.timestamp)
      resources.createdAddresses.push(guestAddress)

      // Create guest cart
      const guestCartResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .query({ sessionId: sessionId })
        .send({
          productId: context.testProduct.documentId,
          productListingId: context.testProductListing.documentId,
          quantity: 1
        })
        .timeout(10000)

      if (guestCartResponse.status !== 200) {
        throw new Error(`Failed to create guest cart: ${guestCartResponse.status}`)
      }

      const guestCart = guestCartResponse.body.data.cart
      const guestCartItem = guestCartResponse.body.data.cartItem
      resources.createdCarts.push(guestCart)
      resources.createdCartItems.push(guestCartItem)

      // Create guest checkout
      const guestCheckoutData = {
        shippingAddress: guestAddress.documentId,
        billingAddress: guestAddress.documentId,
        shippingMethod: 'standard',
        cartItems: [guestCartItem.documentId],
        sessionId: sessionId
      }

      const { checkoutSession, order } = await createCompleteOrder('', guestCheckoutData, sessionId)
      resources.createdCheckoutSessions.push(checkoutSession)
      resources.createdOrders.push(order)

      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 150.00,
        currency: 'USD',
        paymentType: 'manual',
        paymentNotes: 'Test payment for guest user'
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment/${order.documentId}?sessionId=${sessionId}`)
        .send({ data: paymentData })
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.data.amount).toBe(paymentData.amount)
      expect(response.body.data.currency).toBe(paymentData.currency)
      expect(response.body.data.status).toBe('pending')
      expect(response.body.data.user).toBeNull() // Guest payment

      resources.createdPayments.push(response.body.data)
    })

    it('should allow public access to payment creation', async () => {
      const sessionId = `session_public_${context.timestamp}`
      
      // Create a guest order for this test
      const guestAddress = await createGuestAddress(sessionId, context.timestamp, {
        address1: '123 Public Street',
        city: 'Public City',
        firstName: 'Public',
        lastName: 'User',
        state: 'PS',
        postalCode: '67890'
      })
      resources.createdAddresses.push(guestAddress)

      // Create guest cart
      const guestCartResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .query({ sessionId: sessionId })
        .send({
          productId: context.testProduct.documentId,
          productListingId: context.testProductListing.documentId,
          quantity: 1
        })
        .timeout(10000)

      if (guestCartResponse.status !== 200) {
        throw new Error(`Failed to create guest cart: ${guestCartResponse.status}`)
      }

      const guestCart = guestCartResponse.body.data.cart
      const guestCartItem = guestCartResponse.body.data.cartItem
      resources.createdCarts.push(guestCart)
      resources.createdCartItems.push(guestCartItem)

      // Create guest checkout
      const guestCheckoutData = {
        shippingAddress: guestAddress.documentId,
        billingAddress: guestAddress.documentId,
        shippingMethod: 'standard',
        cartItems: [guestCartItem.documentId],
        sessionId: sessionId
      }

      const { checkoutSession, order } = await createCompleteOrder('', guestCheckoutData, sessionId)
      resources.createdCheckoutSessions.push(checkoutSession)
      resources.createdOrders.push(order)

      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 50.00,
        currency: 'USD',
        paymentType: 'manual'
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment/${order.documentId}?sessionId=${sessionId}`)
        .send({ data: paymentData })
        .expect(200)

      expect(response.body.data).toBeDefined()
      resources.createdPayments.push(response.body.data)
    })
  })

  describe('Payment Validation and Error Handling', () => {
    it('should reject payment creation with invalid order ID', async () => {
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 100.00,
        currency: 'USD',
        paymentType: 'manual'
      }

      const response = await request(SERVER_URL)
        .post('/api/payment/invalid-order-id')
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: paymentData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('should reject payment creation with invalid payment method', async () => {
      const paymentData = {
        paymentMethod: 'invalid-payment-method-id',
        amount: 100.00,
        currency: 'USD',
        paymentType: 'manual'
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment/${context.testOrder.documentId}`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: paymentData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('should reject payment creation with invalid amount', async () => {
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: -10.00, // Invalid negative amount
        currency: 'USD',
        paymentType: 'manual'
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment/${context.testOrder.documentId}`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: paymentData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('should reject payment creation with invalid currency', async () => {
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 100.00,
        currency: 'INVALID', // Invalid currency
        paymentType: 'manual'
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment/${context.testOrder.documentId}`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: paymentData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('should reject payment creation with missing required fields', async () => {
      const paymentData = {
        // Missing paymentMethod, amount, currency
        paymentType: 'manual'
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment/${context.testOrder.documentId}`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: paymentData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('should validate payment amount constraints', async () => {
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 0, // Invalid amount
        currency: 'USD',
        paymentType: 'manual'
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment/${context.testOrder.documentId}`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: paymentData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('should validate currency format', async () => {
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 100.00,
        currency: 'INVALID_CURRENCY', // Invalid currency format
        paymentType: 'manual'
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment/${context.testOrder.documentId}`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: paymentData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('should validate payment type enum', async () => {
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 100.00,
        currency: 'USD',
        paymentType: 'invalid_type' // Invalid payment type
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment/${context.testOrder.documentId}`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: paymentData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })
  })

  describe('Payment Security', () => {
    it('should validate user ownership for payment creation', async () => {
      // Create another user
      const anotherUserData = {
        username: `anotheruser${context.timestamp}`,
        email: `anotheruser${context.timestamp}@example.com`,
        password: 'TestPassword123!',
      }

      const anotherUserResponse = await request(SERVER_URL)
        .post('/api/auth/local/register')
        .send(anotherUserData)
        .timeout(10000)

      if (anotherUserResponse.status !== 200) {
        throw new Error(`Failed to create another test user: ${anotherUserResponse.status}`)
      }

      const anotherUser = anotherUserResponse.body.user
      const anotherUserJwt = anotherUserResponse.body.jwt
      resources.createdUsers.push(anotherUser)

      // Try to create payment for order owned by different user
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 100.00,
        currency: 'USD',
        paymentType: 'manual'
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment/${context.testOrder.documentId}`)
        .set('Authorization', `Bearer ${anotherUserJwt}`)
        .send({ data: paymentData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })
  })
})
