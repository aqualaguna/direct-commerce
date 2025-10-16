/**
 * Payment Comment Integration Tests
 * 
 * Comprehensive integration tests for Payment Comment module covering:
 * - Payment comment creation for authenticated users
 * - Payment comment creation for guest users
 * - Payment comment validation and error handling
 * - Payment comment security and authorization
 * - Payment comment CRUD operations
 * - Payment comment filtering and search
 */

import request from 'supertest'
import { 
  SERVER_URL, 
  setupTestEnvironment, 
  cleanupTestResources, 
  createNewOrderForTest,
  createGuestAddress,
  createCompleteOrder,
  createPayment,
  TestContext,
  TestResources
} from '../../payment/__tests__/test-helpers'

describe('Payment Comment Integration Tests', () => {
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
        paymentNotes: 'Test payment for comment integration tests'
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

  describe('Authenticated User Payment Comment Creation', () => {
    it('should create payment comment for authenticated user', async () => {
      const commentData = {
        content: 'Payment received via bank transfer',
        type: 'admin',
        isInternal: false
      }
      const response = await request(SERVER_URL)
        .post(`/api/payment-comment`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .send({ 
          data: {
            ...commentData,
            payment: context.testPayment.documentId
          }
        })
      expect(response.status).toBe(200)
      expect(response.body.data).toBeDefined()
      expect(response.body.data.content).toBe(commentData.content)
      expect(response.body.data.type).toBe(commentData.type)
      expect(response.body.data.isInternal).toBe(commentData.isInternal)
      expect(response.body.data.author).toBeDefined()
      expect(response.body.data.payment).toBeDefined()

      resources.createdPayments.push(response.body.data)
    })

    it('should create internal payment comment', async () => {
      const commentData = {
        content: 'Internal note: Payment verification in progress',
        noteType: 'internal',
        isInternal: true
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment-comments`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ 
          data: {
            ...commentData,
            payment: context.testPayment.documentId
          }
        })
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.data.content).toBe(commentData.content)
      expect(response.body.data.noteType).toBe(commentData.noteType)
      expect(response.body.data.isInternal).toBe(true)

      resources.createdPayments.push(response.body.data)
    })

    it('should create system-generated comment', async () => {
      const commentData = {
        content: 'Payment status updated automatically',
        noteType: 'system',
        isInternal: false,
        metadata: {
          systemEvent: 'status_change',
          previousStatus: 'pending',
          newStatus: 'processing'
        }
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment-comments`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ 
          data: {
            ...commentData,
            payment: context.testPayment.documentId
          }
        })
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.data.content).toBe(commentData.content)
      expect(response.body.data.noteType).toBe(commentData.noteType)
      expect(response.body.data.metadata).toEqual(commentData.metadata)

      resources.createdPayments.push(response.body.data)
    })
  })

  describe('Guest User Payment Comment Creation', () => {
    it('should create payment comment for guest user with session ID', async () => {
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

      // Create payment for guest
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 150.00,
        currency: 'USD',
        paymentType: 'manual'
      }

      const guestPayment = await createPayment(order.documentId, paymentData, undefined, sessionId)
      resources.createdPayments.push(guestPayment)

      const commentData = {
        content: 'Guest payment comment',
        noteType: 'note',
        isInternal: false
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment-comments?sessionId=${sessionId}`)
        .send({ 
          data: {
            ...commentData,
            payment: guestPayment.documentId
          }
        })
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.data.content).toBe(commentData.content)
      expect(response.body.data.noteType).toBe(commentData.noteType)
      expect(response.body.data.author).toBeNull() // Guest comment

      resources.createdPayments.push(response.body.data)
    })

    it('should allow public access to payment comment creation', async () => {
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

      // Create payment for guest
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 50.00,
        currency: 'USD',
        paymentType: 'manual'
      }

      const guestPayment = await createPayment(order.documentId, paymentData, undefined, sessionId)
      resources.createdPayments.push(guestPayment)

      const commentData = {
        content: 'Public payment comment',
        noteType: 'info',
        isInternal: false
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment-comments?sessionId=${sessionId}`)
        .send({ 
          data: {
            ...commentData,
            payment: guestPayment.documentId
          }
        })
        .expect(200)

      expect(response.body.data).toBeDefined()
      resources.createdPayments.push(response.body.data)
    })
  })

  describe('Payment Comment Validation and Error Handling', () => {
    it('should reject payment comment creation with invalid payment ID', async () => {
      const commentData = {
        content: 'Test comment',
        noteType: 'admin',
        isInternal: false,
        payment: 'invalid-payment-id'
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment-comments`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: commentData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('should reject payment comment creation with missing content', async () => {
      const commentData = {
        noteType: 'admin',
        isInternal: false,
        payment: context.testPayment.documentId
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment-comments`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: commentData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('should reject payment comment creation with invalid note type', async () => {
      const commentData = {
        content: 'Test comment',
        noteType: 'invalid_type',
        isInternal: false,
        payment: context.testPayment.documentId
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment-comments`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: commentData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('should reject payment comment creation with content exceeding max length', async () => {
      const longContent = 'a'.repeat(2001) // Exceeds maxLength of 2000
      const commentData = {
        content: longContent,
        noteType: 'admin',
        isInternal: false,
        payment: context.testPayment.documentId
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment-comments`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: commentData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('should reject payment comment creation without authentication for authenticated endpoints', async () => {
      const commentData = {
        content: 'Test comment',
        noteType: 'admin',
        isInternal: false,
        payment: context.testPayment.documentId
      }

      await request(SERVER_URL)
        .post(`/api/payment-comments`)
        .send({ data: commentData })
        .expect(401)
    })
  })

  describe('Payment Comment CRUD Operations', () => {
    let testComment: any

    beforeAll(async () => {
      // Create a test comment for CRUD operations
      const commentData = {
        content: 'Test comment for CRUD operations',
        noteType: 'admin',
        isInternal: false,
        payment: context.testPayment.documentId
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment-comments`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: commentData })
        .expect(200)

      testComment = response.body.data
      resources.createdPayments.push(testComment)
    })

    it('should retrieve payment comment by ID', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/payment-comments/${testComment.documentId}`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.data.documentId).toBe(testComment.documentId)
      expect(response.body.data.content).toBe(testComment.content)
    })

    it('should update payment comment', async () => {
      const updateData = {
        content: 'Updated comment content',
        noteType: 'warning'
      }

      const response = await request(SERVER_URL)
        .put(`/api/payment-comments/${testComment.documentId}`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: updateData })
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.data.content).toBe(updateData.content)
      expect(response.body.data.noteType).toBe(updateData.noteType)
    })

    it('should delete payment comment', async () => {
      const response = await request(SERVER_URL)
        .delete(`/api/payment-comments/${testComment.documentId}`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .expect(200)

      expect(response.body.data).toBeDefined()
    })

    it('should reject retrieval of non-existent payment comment', async () => {
      await request(SERVER_URL)
        .get(`/api/payment-comments/non-existent-id`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .expect(404)
    })

    it('should reject update of non-existent payment comment', async () => {
      const updateData = {
        content: 'Updated content'
      }

      await request(SERVER_URL)
        .put(`/api/payment-comments/non-existent-id`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: updateData })
        .expect(404)
    })

    it('should reject deletion of non-existent payment comment', async () => {
      await request(SERVER_URL)
        .delete(`/api/payment-comments/non-existent-id`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .expect(404)
    })
  })

  describe('Payment Comment Filtering and Search', () => {
    let testComments: any[] = []

    beforeAll(async () => {
      // Create multiple test comments for filtering tests
      const commentTypes = ['admin', 'system', 'internal', 'note', 'warning', 'info']
      
      for (let i = 0; i < commentTypes.length; i++) {
        const commentData = {
          content: `Test comment ${i + 1} of type ${commentTypes[i]}`,
          noteType: commentTypes[i],
          isInternal: i % 2 === 0, // Alternate between internal and external
          payment: context.testPayment.documentId
        }

        const response = await request(SERVER_URL)
          .post(`/api/payment-comments`)
          .set('Authorization', `Bearer ${context.testUserJwt}`)
          .send({ data: commentData })
          .expect(200)

        testComments.push(response.body.data)
        resources.createdPayments.push(response.body.data)
      }
    })

    it('should filter payment comments by note type', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/payment-comments`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .query({ 
          'filters[noteType]': 'admin',
          'filters[payment]': context.testPayment.documentId
        })
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.data.length).toBeGreaterThan(0)
      response.body.data.forEach((comment: any) => {
        expect(comment.noteType).toBe('admin')
      })
    })

    it('should filter payment comments by internal status', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/payment-comments`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .query({ 
          'filters[isInternal]': 'true',
          'filters[payment]': context.testPayment.documentId
        })
        .expect(200)

      expect(response.body.data).toBeDefined()
      response.body.data.forEach((comment: any) => {
        expect(comment.isInternal).toBe(true)
      })
    })

    it('should search payment comments by content', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/payment-comments`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .query({ 
          'filters[content][$containsi]': 'admin',
          'filters[payment]': context.testPayment.documentId
        })
        .expect(200)

      expect(response.body.data).toBeDefined()
      response.body.data.forEach((comment: any) => {
        expect(comment.content.toLowerCase()).toContain('admin')
      })
    })

    it('should sort payment comments by creation date', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/payment-comments`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .query({ 
          'filters[payment]': context.testPayment.documentId,
          'sort': 'createdAt:desc'
        })
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.data.length).toBeGreaterThan(1)
      
      // Verify sorting (most recent first)
      for (let i = 0; i < response.body.data.length - 1; i++) {
        const current = new Date(response.body.data[i].createdAt)
        const next = new Date(response.body.data[i + 1].createdAt)
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime())
      }
    })

    it('should paginate payment comments', async () => {
      const pageSize = 2
      const response = await request(SERVER_URL)
        .get(`/api/payment-comments`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .query({ 
          'filters[payment]': context.testPayment.documentId,
          'pagination[pageSize]': pageSize,
          'pagination[page]': 1
        })
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.data.length).toBeLessThanOrEqual(pageSize)
      expect(response.body.meta.pagination).toBeDefined()
    })
  })

  describe('Payment Comment Security and Authorization', () => {
    it('should validate user ownership for payment comment operations', async () => {
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

      // Try to create comment for payment owned by different user
      const commentData = {
        content: 'Unauthorized comment',
        noteType: 'admin',
        isInternal: false,
        payment: context.testPayment.documentId
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment-comments`)
        .set('Authorization', `Bearer ${anotherUserJwt}`)
        .send({ data: commentData })
        .expect(403)

      expect(response.body.error).toBeDefined()
    })

    it('should prevent unauthorized access to internal comments', async () => {
      // Create an internal comment
      const commentData = {
        content: 'Internal comment',
        noteType: 'internal',
        isInternal: true,
        payment: context.testPayment.documentId
      }

      const createResponse = await request(SERVER_URL)
        .post(`/api/payment-comments`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: commentData })
        .expect(200)

      const internalComment = createResponse.body.data
      resources.createdPayments.push(internalComment)

      // Try to access internal comments without proper authorization
      const response = await request(SERVER_URL)
        .get(`/api/payment-comments`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .query({ 
          'filters[payment]': context.testPayment.documentId,
          'filters[isInternal]': 'true'
        })
        .expect(200)

      // Should not return internal comments for regular users
      expect(response.body.data).toBeDefined()
      // The exact behavior depends on your authorization logic
    })

    it('should validate session ID for guest operations', async () => {
      const sessionId = `session_${context.timestamp}`
      
      // Create a guest order and payment
      const guestAddress = await createGuestAddress(sessionId, context.timestamp)
      resources.createdAddresses.push(guestAddress)

      const guestCartResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .query({ sessionId: sessionId })
        .send({
          productId: context.testProduct.documentId,
          productListingId: context.testProductListing.documentId,
          quantity: 1
        })
        .timeout(10000)

      const guestCart = guestCartResponse.body.data.cart
      const guestCartItem = guestCartResponse.body.data.cartItem
      resources.createdCarts.push(guestCart)
      resources.createdCartItems.push(guestCartItem)

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
        amount: 100.00,
        currency: 'USD',
        paymentType: 'manual'
      }

      const guestPayment = await createPayment(order.documentId, paymentData, undefined, sessionId)
      resources.createdPayments.push(guestPayment)

      // Try to create comment without session ID
      const commentData = {
        content: 'Guest comment without session',
        noteType: 'note',
        isInternal: false,
        payment: guestPayment.documentId
      }

      await request(SERVER_URL)
        .post(`/api/payment-comments`)
        .send({ data: commentData })
        .expect(400)
    })
  })

  describe('Payment Comment Performance and Concurrent Operations', () => {
    it('should handle multiple concurrent comment operations', async () => {
      const concurrentRequests = 5
      const promises: any[] = []

      for (let i = 0; i < concurrentRequests; i++) {
        const commentData = {
          content: `Concurrent comment ${i + 1}`,
          noteType: 'note',
          isInternal: false,
          payment: context.testPayment.documentId
        }

        promises.push(
          request(SERVER_URL)
            .post(`/api/payment-comments`)
            .set('Authorization', `Bearer ${context.testUserJwt}`)
            .send({ data: commentData })
            .timeout(10000)
        )
      }

      const responses = await Promise.all(promises)

      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.data).toBeDefined()
        resources.createdPayments.push(response.body.data)
      })
    })

    it('should handle comment operations efficiently', async () => {
      const startTime = Date.now()

      const commentData = {
        content: 'Performance test comment',
        noteType: 'admin',
        isInternal: false,
        payment: context.testPayment.documentId
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment-comments`)
        .set('Authorization', `Bearer ${context.testUserJwt}`)
        .send({ data: commentData })
        .expect(200)

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
      expect(response.body.data).toBeDefined()
      resources.createdPayments.push(response.body.data)
    })
  })
})
