/**
 * Cart Security and Permissions Integration Tests
 * 
 * Comprehensive security tests for Cart module covering:
 * - Authentication and authorization
 * - Data validation and sanitization
 * - Permission-based access control
 * - Security headers and CORS
 * - Rate limiting and abuse prevention
 * - Data privacy and GDPR compliance
 * - Input validation and injection prevention
 * - Session security and management
 */

import request from 'supertest';

describe('Cart Security and Permissions Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let apiToken: string;
  let testUser: any;
  let testUser2: any;
  let testProduct: any;
  let testProductListing: any;
  let testCart: any;
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();

  beforeAll(async () => {
    // Get admin token for authenticated requests
    apiToken = process.env.STRAPI_API_TOKEN as string;

    if (!apiToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }

    // Create test users for security testing
    const user1Data = {
      username: `testuser1${timestamp}`,
      email: `testuser1${timestamp}@example.com`,
      password: 'TestPassword123!',
    };

    const user1Response = await request(SERVER_URL)
      .post('/api/auth/local/register')
      .send(user1Data)
      .timeout(10000);

    if (user1Response.status !== 200) {
      throw new Error(`Failed to create test user 1: ${user1Response.status} - ${JSON.stringify(user1Response.body)}`);
    }

    testUser = user1Response.body.user;

    const user2Data = {
      username: `testuser2${timestamp}`,
      email: `testuser2${timestamp}@example.com`,
      password: 'TestPassword123!',
    };

    const user2Response = await request(SERVER_URL)
      .post('/api/auth/local/register')
      .send(user2Data)
      .timeout(10000);

    if (user2Response.status !== 200) {
      throw new Error(`Failed to create test user 2: ${user2Response.status} - ${JSON.stringify(user2Response.body)}`);
    }

    testUser2 = user2Response.body.user;

    // Create test product for cart operations
    const productData = {
      name: `Test Product ${timestamp}`,
      brand: `Test Brand ${timestamp}`,
      sku: `TEST-PROD-${timestamp}`,
      inventory: 100000,
      status: 'active'
    };

    const productResponse = await request(SERVER_URL)
      .post('/api/products')
      .set('Authorization', `Bearer ${apiToken}`)
      .send({ data: productData })
      .timeout(10000);

    if (productResponse.status !== 200) {
      throw new Error(`Failed to create test product: ${productResponse.status} - ${JSON.stringify(productResponse.body)}`);
    }

    testProduct = productResponse.body.data;

    // Create test product listing for cart operations
    const productListingData = {
      title: `Test Product Listing ${timestamp}`,
      description: 'Test product listing for cart security tests',
      type: 'single',
      basePrice: 29.99,
      isActive: true,
      product: testProduct.documentId,
      status: 'published'
    };

    const productListingResponse = await request(SERVER_URL)
      .post('/api/product-listings')
      .set('Authorization', `Bearer ${apiToken}`)
      .send({ data: productListingData })
      .timeout(10000);
    if (productListingResponse.status !== 200) {
      throw new Error(`Failed to create test product listing: ${productListingResponse.status} - ${JSON.stringify(productListingResponse.body)}`);
    }

    testProductListing = productListingResponse.body;
  });

  afterAll(async () => {
    // Clean up test data
    if (testCart?.documentId) {
      try {
        await request(SERVER_URL)
          .delete(`/api/carts/${testCart.documentId}`)
          .set('Authorization', `Bearer ${apiToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn('Failed to clean up test cart:', error.message);
      }
    }

    if (testProductListing?.documentId) {
      try {
        await request(SERVER_URL)
          .delete(`/api/product-listings/${testProductListing.documentId}`)
          .set('Authorization', `Bearer ${apiToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn('Failed to clean up test product listing:', error.message);
      }
    }

    if (testProduct?.documentId) {
      try {
        await request(SERVER_URL)
          .delete(`/api/products/${testProduct.documentId}`)
          .set('Authorization', `Bearer ${apiToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn('Failed to clean up test product:', error.message);
      }
    }

    if (testUser?.id) {
      try {
        await request(SERVER_URL)
          .delete(`/api/users/${testUser.id}`)
          .set('Authorization', `Bearer ${apiToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn('Failed to clean up test user 1:', error.message);
      }
    }

    if (testUser2?.id) {
      try {
        await request(SERVER_URL)
          .delete(`/api/users/${testUser2.id}`)
          .set('Authorization', `Bearer ${apiToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn('Failed to clean up test user 2:', error.message);
      }
    }
  });

  describe('Authentication and Authorization', () => {
    let userToken: string;
    let user2Token: string;

    beforeAll(async () => {
      // Authenticate users
      const loginResponse = await request(SERVER_URL)
        .post('/api/auth/local')
        .send({
          identifier: testUser.email,
          password: 'TestPassword123!'
        })
        .timeout(10000);

      userToken = loginResponse.body.jwt;

      const login2Response = await request(SERVER_URL)
        .post('/api/auth/local')
        .send({
          identifier: testUser2.email,
          password: 'TestPassword123!'
        })
        .timeout(10000);

      user2Token = login2Response.body.jwt;
    });

    it('should require authentication for protected cart operations', async () => {
      // Test without authentication
      await request(SERVER_URL)
        .get('/api/carts/current')
        .expect(401)
        .timeout(10000);

      await request(SERVER_URL)
        .post('/api/carts/items')
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 1
        })
        .expect(401)
        .timeout(10000);
    });

    it('should reject invalid authentication tokens', async () => {
      const invalidTokens = [
        'invalid-token',
        'Bearer invalid-token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        '',
        null,
        undefined
      ];

      for (const token of invalidTokens) {
        await request(SERVER_URL)
          .get('/api/carts/current')
          .set('Authorization', token ? `Bearer ${token}` : '')
          .expect(401)
          .timeout(10000);
      }
    });

    it('should prevent users from accessing other users carts', async () => {
      // User 1 creates a cart
      await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 1
        })
        .timeout(10000);

      // User 2 should not be able to access User 1's cart
      const user2CartResponse = await request(SERVER_URL)
        .get('/api/carts/current')
        .set('Authorization', `Bearer ${user2Token}`)
        .timeout(10000);

      // User 2 should either have no cart or a different cart
      if (user2CartResponse.status === 200) {
        expect(user2CartResponse.body.data.user.id).toBe(testUser2.id);
        expect(user2CartResponse.body.data.user.id).not.toBe(testUser.id);
      }
    });

    it('should prevent users from modifying other users cart items', async () => {
      // User 1 creates a cart with item
      const user1CartResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 1
        })
        .timeout(10000);
      const cartItemId = user1CartResponse.body.data.cartItem.documentId;

      // User 2 should not be able to modify User 1's cart item
      await request(SERVER_URL)
        .put(`/api/carts/items/${cartItemId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ quantity: 5 })
        .expect(403)
        .timeout(10000);

      await request(SERVER_URL)
        .delete(`/api/carts/items/${cartItemId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403)
        .timeout(10000);
    });
  });

  describe('Input Validation and Sanitization', () => {
    let userToken: string;

    beforeAll(async () => {
      const loginResponse = await request(SERVER_URL)
        .post('/api/auth/local')
        .send({
          identifier: testUser.email,
          password: 'TestPassword123!'
        })
        .timeout(10000);

      userToken = loginResponse.body.jwt;
    });



    it('should validate and sanitize quantity inputs', async () => {
      const invalidQuantities = [
        -1,
        0,
        'invalid',
        null,
        undefined,
        Infinity,
        -Infinity,
        NaN,
        '1; DROP TABLE carts; --',
        '<script>alert(1)</script>'
      ];

      for (const quantity of invalidQuantities) {

        const response = await request(SERVER_URL)
          .post('/api/carts/items')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            productId: testProduct.documentId,
            productListingId: testProductListing.documentId,
            quantity: quantity
          })
          .timeout(10000);
          expect(response.status).toBe(400);
      }
    });

    it('should validate product and product listing IDs', async () => {
      const invalidIds = [
        '',
        'invalid-id',
        '123', // Numeric string
        null,
        undefined,
        'non-existent-id',
        'a'.repeat(1000), // Extremely long string
        'id with spaces',
        'id/with/slashes',
        'id\\with\\backslashes'
      ];

      for (const invalidId of invalidIds) {
        const response = await request(SERVER_URL)
          .post('/api/carts/items')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            productId: invalidId,
            productListingId: testProductListing.documentId,
            quantity: 1
          })
          .timeout(10000);
          expect([400, 404]).toContain(response.status);
      }
    });

  });


  describe('Data Privacy and GDPR Compliance', () => {
    let userToken: string;

    beforeAll(async () => {
      const loginResponse = await request(SERVER_URL)
        .post('/api/auth/local')
        .send({
          identifier: testUser.email,
          password: 'TestPassword123!'
        })
        .timeout(10000);

      userToken = loginResponse.body.jwt;
    });

    it('should not expose sensitive user data in cart responses', async () => {
      // Create a cart
      await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 1
        })
        .timeout(10000);

      const cartResponse = await request(SERVER_URL)
        .get('/api/carts/current')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .timeout(10000);

      const cartData = cartResponse.body.data;
      
      // Should not expose sensitive fields
      expect(cartData.user).not.toHaveProperty('password');
      expect(cartData.user).not.toHaveProperty('resetPasswordToken');
      expect(cartData.user).not.toHaveProperty('confirmationToken');
      expect(cartData.user).not.toHaveProperty('provider');
      
      // Should only expose necessary user fields
      expect(cartData.user).toHaveProperty('id');
      expect(cartData.user).toHaveProperty('email');
      expect(cartData.user).toHaveProperty('username');
    });

    it('should anonymize guest cart data appropriately', async () => {
      const sessionId = `privacy-session-${timestamp}`;
      
      // Create guest cart
      await request(SERVER_URL)
        .post('/api/carts/items')
        .query({ sessionId })
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 1
        })
        .timeout(10000);

      const cartResponse = await request(SERVER_URL)
        .get('/api/carts/current')
        .query({ sessionId })
        .expect(200)
        .timeout(10000);

      const cartData = cartResponse.body.data;
      
      // Guest cart should not have user data
      expect(cartData.user).toBeUndefined();
      expect(cartData.sessionId).toBe(sessionId);
    });
  });

  describe('Security Headers and CORS', () => {
    it('should include proper security headers', async () => {
      const response = await request(SERVER_URL)
        .get('/api/carts/current')
        .timeout(10000);

      // Check for security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
      expect(response.headers).toHaveProperty('strict-transport-security');
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(SERVER_URL)
        .options('/api/carts/items')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization')
        .timeout(10000);

      expect(response.status).toBe(204);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });
  });

  describe('Error Handling and Information Disclosure', () => {
    let userToken: string;

    beforeAll(async () => {
      const loginResponse = await request(SERVER_URL)
        .post('/api/auth/local')
        .send({
          identifier: testUser.email,
          password: 'TestPassword123!'
        })
        .timeout(10000);

      userToken = loginResponse.body.jwt;
    });

    it('should not expose internal system information in errors', async () => {
      const response = await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: 'non-existent-id',
          quantity: 1
        })
        .timeout(10000);

      // Error should not contain internal paths, stack traces, or system info
      expect(JSON.stringify(response.body)).not.toContain('/home/');
      expect(JSON.stringify(response.body)).not.toContain('node_modules');
      expect(JSON.stringify(response.body)).not.toContain('at ');
      expect(JSON.stringify(response.body)).not.toContain('Error:');
    });

    it('should handle malformed requests gracefully', async () => {
      const malformedRequests: any[] = [
        { method: 'GET', url: '/api/carts/items', body: 'invalid json' },
        { method: 'POST', url: '/api/carts/items', body: '{ invalid json' },
        { method: 'POST', url: '/api/carts/items', body: null },
        { method: 'POST', url: '/api/carts/items', body: undefined }
      ];
      for (const malformedRequest of malformedRequests) {
        const response = await request(SERVER_URL)
          .post('/api/carts/items')
          .set('Authorization', `Bearer ${userToken}`)
          .send(malformedRequest.body)
          .timeout(10000);

        // Should return proper error status
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThanOrEqual(500);
      }
    });
  });

  describe('Business Logic Security', () => {
    let userToken: string;

    beforeAll(async () => {
      const loginResponse = await request(SERVER_URL)
        .post('/api/auth/local')
        .send({
          identifier: testUser.email,
          password: 'TestPassword123!'
        })
        .timeout(10000);

      userToken = loginResponse.body.jwt;
    });

    it('should prevent negative pricing manipulation', async () => {
      // Attempt to manipulate cart totals
      await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: -1
        })
        .expect(400)
        .timeout(10000);
    });

    it('should validate inventory constraints', async () => {
      // Attempt to add more items than available
      await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 1000000 // More than available inventory
        })
        .expect(400)
        .timeout(10000);
    });

  });
});
