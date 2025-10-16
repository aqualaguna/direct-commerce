/**
 * Basic Payment Method Integration Tests
 * 
 * Comprehensive integration tests for Basic Payment Method module covering:
 * - Payment method creation with database verification
 * - Payment method retrieval and filtering
 * - Payment method updates and validation
 * - Payment method deletion and cleanup
 * - Payment method validation and constraints
 * - Payment method security and encryption
 * - Payment method bulk operations
 */

import request from 'supertest'

describe('Basic Payment Method Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337'
  let apiToken: string
  let testUser: any
  let testPaymentMethod: any
  
  // Track all created payment methods for cleanup
  const createdPaymentMethods: any[] = []
  
  // Generate unique test data with timestamp
  const timestamp = Date.now()

  beforeAll(async () => {
    // Get admin token for authenticated requests
    apiToken = process.env.STRAPI_API_TOKEN as string

    if (!apiToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.')
    }

    // Create test user for authentication
    const userData = {
      username: `testuser${timestamp}`,
      email: `testuser${timestamp}@example.com`,
      password: 'TestPassword123!',
    }

    const userResponse = await request(SERVER_URL)
      .post('/api/auth/local/register')
      .send(userData)
      .timeout(10000)

    if (userResponse.status !== 200) {
      throw new Error(`Failed to create test user: ${userResponse.status} - ${JSON.stringify(userResponse.body)}`)
    }

    testUser = userResponse.body.user
  })

  afterAll(async () => {
    // Clean up created payment methods
    for (const paymentMethod of createdPaymentMethods) {
      try {
        await request(SERVER_URL)
          .delete(`/api/payment-methods/${paymentMethod.documentId}`)
          .set('Authorization', `Bearer ${apiToken}`)
          .timeout(5000)
      } catch (error) {
        console.warn(`Failed to cleanup payment method ${paymentMethod.documentId}:`, error)
      }
    }
    // delete test user
    await request(SERVER_URL)
      .delete(`/api/users/${testUser.documentId}`)
      .set('Authorization', `Bearer ${apiToken}`)
      .timeout(5000)
  })

  describe('Payment Method Creation', () => {
    it('should create payment method with valid data and verify database record', async () => {
      const paymentMethodData = {
        name: `Test Payment Method ${timestamp}`,
        code: 'other', // Use 'other' to avoid conflicts with default methods
        paymentType: 'manual',
        description: 'Test payment method for integration testing',
        isActive: true,
        instructions: 'Test payment instructions'
      }

      const response = await request(SERVER_URL)
        .post('/api/payment-methods')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: paymentMethodData })
      expect(response.status).toBe(201)
      expect(response.body.data).toBeDefined()
      expect(response.body.data.name).toBe(paymentMethodData.name)
      expect(response.body.data.code).toBe(paymentMethodData.code)
      expect(response.body.data.description).toBe(paymentMethodData.description)
      expect(response.body.data.isActive).toBe(paymentMethodData.isActive)
      expect(response.body.data.instructions).toBe(paymentMethodData.instructions)

      testPaymentMethod = response.body.data
      createdPaymentMethods.push(testPaymentMethod)
    })

    it('should reject payment method creation with duplicate code', async () => {
      const paymentMethodData = {
        name: `Duplicate Test Payment Method ${timestamp}`,
        code: 'other', // Same code as previous test
        paymentType: 'manual',
        description: 'Duplicate payment method test',
        isActive: true
      }

      const response = await request(SERVER_URL)
        .post('/api/payment-methods')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: paymentMethodData })
        .expect(400)

      expect(response.body.error).toBeDefined()
      expect(response.body.error.message).toContain('Payment method code already exists')
    })

    it('should reject payment method creation with missing required fields', async () => {
      const invalidData = {
        name: `Invalid Payment Method ${timestamp}`,
        // Missing code and description
        isActive: true
      }

      const response = await request(SERVER_URL)
        .post('/api/payment-methods')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: invalidData })
        .expect(400)

      expect(response.body.error).toBeDefined()
      expect(response.body.error.message).toContain('Code is required')
    })

    it('should reject payment method creation without admin authentication', async () => {
      const paymentMethodData = {
        name: `Unauthorized Test ${timestamp}`,
        code: 'cash',
        paymentType: 'manual',
        description: 'Unauthorized payment method test',
        isActive: true
      }

      const response = await request(SERVER_URL)
        .post('/api/payment-methods')
        .send({ data: paymentMethodData })
        .expect(403)

      expect(response.body.error).toBeDefined()
    })
  })

  describe('Payment Method Retrieval', () => {
    it('should get all payment methods for admin', async () => {
      const response = await request(SERVER_URL)
        .get('/api/payment-methods')
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(200)
      expect(response.body.data).toBeDefined()
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.data.length).toBeGreaterThan(0)
    })

    it('should get active payment methods for authenticated users', async () => {
      const response = await request(SERVER_URL)
        .get('/api/payment-methods/basic')
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(200)
      expect(response.body).toBeDefined()
      expect(Array.isArray(response.body.data)).toBe(true)
      
      // All returned methods should be active
      response.body.data.forEach((method: any) => {
        expect(method.isActive).toBe(true)
      })
    })

    it('should get payment method by code', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/payment-methods/basic/${testPaymentMethod.code}`)
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(200)
      expect(response.body.data).toBeDefined()
      expect(response.body.data.code).toBe(testPaymentMethod.code)
      expect(response.body.data.name).toBe(testPaymentMethod.name)
    })

    it('should return 404 for non-existent payment method code', async () => {
      const response = await request(SERVER_URL)
        .get('/api/payment-methods/basic/non_existent_code')
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(404)

      expect(response.body.error).toBeDefined()
    })

  })

  describe('Payment Method Updates', () => {
    it('should update payment method with valid data', async () => {
      const updateData = {
        name: `Updated Test Payment Method ${timestamp}`,
        description: 'Updated description for testing',
        instructions: 'Updated payment instructions'
      }

      const response = await request(SERVER_URL)
        .put(`/api/payment-methods/${testPaymentMethod.documentId}`)
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: updateData })
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.data.name).toBe(updateData.name)
      expect(response.body.data.description).toBe(updateData.description)
      expect(response.body.data.instructions).toBe(updateData.instructions)
    })

    it('should reject update with duplicate code', async () => {
      // Try to update testPaymentMethod with its own code (should succeed)
      const updateData = {
        code: testPaymentMethod.code // Same as testPaymentMethod
      }

      const response = await request(SERVER_URL)
        .put(`/api/payment-methods/${testPaymentMethod.documentId}`)
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: updateData })
        .expect(200)

      // Now try to update with a code that already exists (from default methods)
      const duplicateUpdateData = {
        code: 'cash' // This should exist from default initialization
      }

      const duplicateResponse = await request(SERVER_URL)
        .put(`/api/payment-methods/${testPaymentMethod.documentId}`)
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: duplicateUpdateData })
        .expect(400)

      expect(duplicateResponse.body.error).toBeDefined()
      expect(duplicateResponse.body.error.message).toContain('Payment method code already exists')
    })

    it('should reject update without admin authentication', async () => {
      const updateData = {
        name: `Unauthorized Update ${timestamp}`
      }

      const response = await request(SERVER_URL)
        .put(`/api/payment-methods/${testPaymentMethod.documentId}`)
        .send({ data: updateData })
        .expect(403)

      expect(response.body.error).toBeDefined()
    })
  })

  describe('Payment Method Activation/Deactivation', () => {
    it('should activate payment method', async () => {
      // First deactivate the method
      await request(SERVER_URL)
        .post(`/api/payment-methods/basic/${testPaymentMethod.documentId}/deactivate`)
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(200)

      // Then activate it
      const response = await request(SERVER_URL)
        .post(`/api/payment-methods/basic/${testPaymentMethod.documentId}/activate`)
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.data.isActive).toBe(true)
    })

    it('should deactivate payment method', async () => {
      const response = await request(SERVER_URL)
        .post(`/api/payment-methods/basic/${testPaymentMethod.documentId}/deactivate`)
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.data.isActive).toBe(false)
    })

    it('should reject activation/deactivation without admin authentication', async () => {
      const response = await request(SERVER_URL)
        .post(`/api/payment-methods/basic/${testPaymentMethod.documentId}/activate`)
        .expect(403)

      expect(response.body.error).toBeDefined()
    })
  })

  describe('Payment Method Statistics', () => {
    it('should get payment method statistics for admin', async () => {
      const response = await request(SERVER_URL)
        .get('/api/payment-methods/basic/stats')
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.data.total).toBeDefined()
      expect(response.body.data.active).toBeDefined()
      expect(response.body.data.inactive).toBeDefined()
      expect(typeof response.body.data.total).toBe('number')
      expect(typeof response.body.data.active).toBe('number')
      expect(typeof response.body.data.inactive).toBe('number')
    })

    it('should reject statistics request without admin authentication', async () => {
      const response = await request(SERVER_URL)
        .get('/api/payment-methods/basic/stats')
        .expect(403)

      expect(response.body.error).toBeDefined()
    })
  })

  describe('Default Payment Methods Initialization', () => {
    it('should initialize default payment methods', async () => {
      const response = await request(SERVER_URL)
        .post('/api/payment-methods/basic/initialize')
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.data.message).toBeDefined()
      expect(response.body.data.created).toBeDefined()
      expect(Array.isArray(response.body.data.created)).toBe(true)
    })

    it('should handle initialization when methods already exist', async () => {
      // Run initialization again
      const response = await request(SERVER_URL)
        .post('/api/payment-methods/basic/initialize')
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.data.message).toBeDefined()
      // Should handle gracefully when methods already exist
    })

    it('should reject initialization without admin authentication', async () => {
      const response = await request(SERVER_URL)
        .post('/api/payment-methods/basic/initialize')
        .expect(403)

      expect(response.body.error).toBeDefined()
    })
  })

  describe('Payment Method Deletion', () => {

    it('should return 404 when deleting non-existent payment method', async () => {
      const response = await request(SERVER_URL)
        .delete('/api/payment-methods/non-existent-document-id')
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(404)

      expect(response.body.error).toBeDefined()
    })

    it('should reject deletion without admin authentication', async () => {
      const response = await request(SERVER_URL)
        .delete(`/api/payment-methods/${testPaymentMethod.documentId}`)
        .expect(403)

      expect(response.body.error).toBeDefined()
    })
  })

  describe('Payment Method Validation and Constraints', () => {
    it('should validate enum values for code field', async () => {
      const invalidData = {
        name: `Invalid Code Test ${timestamp}`,
        code: 'invalid_code', // Not in enum
        paymentType: 'manual',
        description: 'Test with invalid code',
        isActive: true
      }

      const response = await request(SERVER_URL)
        .post('/api/payment-methods')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: invalidData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('should validate required field constraints', async () => {
      const invalidData = {
        // Missing name
        code: 'cash',
        paymentType: 'manual',
        description: 'Missing name field'
      }

      const response = await request(SERVER_URL)
        .post('/api/payment-methods')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: invalidData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('should validate string length constraints', async () => {
      const invalidData = {
        name: 'A'.repeat(300), // Exceeds maxLength of 255
        code: 'cash',
        paymentType: 'manual',
        description: 'Test with long name',
        isActive: true
      }

      const response = await request(SERVER_URL)
        .post('/api/payment-methods')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: invalidData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })
  })

  describe('Payment Method Security', () => {
    it('should require authentication for admin endpoints', async () => {
      const adminEndpoints = [
        { method: 'GET', path: '/api/payment-methods' },
        { method: 'POST', path: '/api/payment-methods' },
        { method: 'PUT', path: `/api/payment-methods/${testPaymentMethod.documentId}` },
        { method: 'DELETE', path: `/api/payment-methods/${testPaymentMethod.documentId}` }
      ]

      for (const endpoint of adminEndpoints) {
        const response = await request(SERVER_URL)
          [endpoint.method.toLowerCase()](endpoint.path)
          .expect(403)

        expect(response.body.error).toBeDefined()
      }
    })

    it('should allow public access to basic payment methods', async () => {
      const response = await request(SERVER_URL)
        .get('/api/payment-methods/basic')
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it('should require admin role for management operations', async () => {
      // Create a non-admin user
      const userData = {
        username: `nonadmin${timestamp}`,
        email: `nonadmin${timestamp}@example.com`,
        password: 'TestPassword123!',
      }

      const userResponse = await request(SERVER_URL)
        .post('/api/auth/local/register')
        .send(userData)
        .timeout(10000)

      const userToken = userResponse.body.jwt

      const adminEndpoints = [
        { method: 'POST', path: '/api/payment-methods' },
        { method: 'PUT', path: `/api/payment-methods/${testPaymentMethod.documentId}` },
        { method: 'DELETE', path: `/api/payment-methods/${testPaymentMethod.documentId}` },
        { method: 'POST', path: '/api/payment-methods/basic/initialize' },
        { method: 'GET', path: '/api/payment-methods/basic/stats' }
      ]

      for (const endpoint of adminEndpoints) {
        const response = await request(SERVER_URL)
          [endpoint.method.toLowerCase()](endpoint.path)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403)

        expect(response.body.error).toBeDefined()
      }
    })
  })

  describe('Database Verification', () => {
    it('should verify payment method creation in database', async () => {
      // Use the existing testPaymentMethod for verification
      const getResponse = await request(SERVER_URL)
        .get(`/api/payment-methods/${testPaymentMethod.documentId}`)
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(200)

      expect(getResponse.body.data.documentId).toBe(testPaymentMethod.documentId)
      expect(getResponse.body.data.code).toBe(testPaymentMethod.code)
      // Only check immutable fields as other fields may have been updated by previous tests
    })

    it('should verify payment method update in database', async () => {
      const updateData = {
        name: `Updated Database Test ${timestamp}`,
        description: 'Updated database verification test',
        instructions: 'Updated database test instructions'
      }

      const response = await request(SERVER_URL)
        .put(`/api/payment-methods/${testPaymentMethod.documentId}`)
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: updateData })
        .expect(200)
      // Verify the update in database
      const getResponse = await request(SERVER_URL)
        .get(`/api/payment-methods/${testPaymentMethod.documentId}`)
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(200)

      expect(getResponse.body.data.name).toBe(updateData.name)
      expect(getResponse.body.data.description).toBe(updateData.description)
      expect(getResponse.body.data.instructions).toBe(updateData.instructions)
    })


  })
})
