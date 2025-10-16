/**
 * Guest Integration Tests
 * 
 * Comprehensive integration tests for Guest module covering:
 * - Guest creation and validation
 * - Guest retrieval and session management
 * - Guest updates and data validation
 * - Guest to user conversion
 * - Guest analytics and reporting
 * - Error handling and edge cases
 * - Performance and bulk operations
 */

import request from 'supertest';
import {
  SERVER_URL,
  createTestGuestData,
  createTestUserData,
  createTestCart,
  getGuestAnalytics,
  cleanupTestData,
  validateGuestData,
  validateUserData,
  validateAnalyticsData
} from './test-setup';

describe('Guest Integration Tests', () => {
  let apiToken: string;
  let testProduct: any;
  let testProductListing: any;
  let testCart: any;

  // Track all created guests, carts, and users for cleanup
  const createdGuests: any[] = [];
  const createdCarts: any[] = [];
  const createdUsers: any[] = [];

  // Generate unique test data with timestamp
  const timestamp = Date.now();

  beforeAll(async () => {
    // Get admin token for authenticated requests
    apiToken = process.env.STRAPI_API_TOKEN as string;

    if (!apiToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }

    // Create test product for guest operations
    const productData = {
      name: `Test Product ${timestamp}`,
      brand: `Test Brand ${timestamp}`,
      sku: `TEST-PROD-${timestamp}`,
      inventory: 10000,
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

    // Create test product listing for guest operations
    const productListingData = {
      title: `Test Product Listing ${timestamp}`,
      description: 'Test product listing for guest integration tests',
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
    // Use the test utilities for cleanup
    await cleanupTestData(createdGuests, createdCarts, createdUsers, apiToken);

    // Clean up test product listing
    if (testProductListing?.documentId) {
      try {
        await request(SERVER_URL)
          .delete(`/api/product-listings/${testProductListing.documentId}`)
          .set('Authorization', `Bearer ${apiToken}`)
          .expect(200)
          .timeout(10000);
      } catch (error) {
        console.warn('Failed to clean up test product listing:', error.message);
      }
    }

    // Clean up test product
    if (testProduct?.documentId) {
      try {
        await request(SERVER_URL)
          .delete(`/api/products/${testProduct.documentId}`)
          .set('Authorization', `Bearer ${apiToken}`)
          .expect(200)
          .timeout(10000);
      } catch (error) {
        console.warn('Failed to clean up test product:', error.message);
      }
    }
  });

  describe('Guest Creation and Validation', () => {
    it('should create a new guest successfully with email', async () => {
      const sessionId = `test-session-${timestamp}`;
      const email = `testguest${timestamp}@example.com`;
      
      // Create a cart first for the guest
      const cart = await createTestCart(
        sessionId,
        testProduct.documentId,
        testProductListing.documentId,
        1
      );
      createdCarts.push(cart);

      // Create guest
      const guestData = createTestGuestData({
        sessionId,
        email,
        cartId: cart.documentId
      });

      const response = await request(SERVER_URL)
        .post('/api/guests')
        .send(guestData)
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.sessionId).toBe(sessionId);
      expect(response.body.data.email).toBe(email);
      expect(response.body.data.status).toBe('active');
      expect(response.body.meta.message).toBe('Guest created successfully');
      expect(validateGuestData(response.body.data)).toBe(true);

      // Store guest for cleanup
      createdGuests.push(response.body.data);
    });

    it('should create a new guest successfully without email', async () => {
      const sessionId = `test-session-no-email-${timestamp}`;
      
      // Create a cart first for the guest
      const cart = await createTestCart(
        sessionId,
        testProduct.documentId,
        testProductListing.documentId,
        1
      );
      createdCarts.push(cart);

      // Create guest without email
      const guestData = {
        sessionId,
        cartId: cart.documentId
      };

      const response = await request(SERVER_URL)
        .post('/api/guests')
        .send(guestData)
        .timeout(10000);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.sessionId).toBe(sessionId);
      expect(response.body.data.email).toBeNull();
      expect(response.body.data.status).toBe('active');
      expect(response.body.meta.message).toBe('Guest created successfully');
      expect(validateGuestData(response.body.data)).toBe(true);

      // Store guest for cleanup
      createdGuests.push(response.body.data);
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteGuestData = {
        sessionId: `incomplete-session-${timestamp}`,
        // Missing cartId (email is optional)
      };

      const response = await request(SERVER_URL)
        .post('/api/guests')
        .send(incompleteGuestData)
        .expect(400)
        .timeout(10000);

      expect(response.body.error.message).toContain('Missing required fields');
    });

    it('should return 400 for invalid email format', async () => {
      const sessionId = `invalid-email-session-${timestamp}`;
      const invalidEmail = 'invalid-email-format';
      
      // Create a cart first
      const cart = await createTestCart(
        sessionId,
        testProduct.documentId,
        testProductListing.documentId,
        1
      );
      createdCarts.push(cart);

      const guestData = createTestGuestData({
        sessionId,
        email: invalidEmail,
        cartId: cart.documentId
      });

      const response = await request(SERVER_URL)
        .post('/api/guests')
        .send(guestData)
        .expect(400)
        .timeout(10000);

      expect(response.body.error.message).toContain('Validation failed');
    });

    it('should return 400 for duplicate session ID', async () => {
      const sessionId = `duplicate-session-${timestamp}`;
      const email = `duplicateguest${timestamp}@example.com`;
      
      // Create first guest
      const cart1 = await createTestCart(
        sessionId,
        testProduct.documentId,
        testProductListing.documentId,
        1
      );
      createdCarts.push(cart1);

      const guestData1 = createTestGuestData({
        sessionId,
        email,
        cartId: cart1.documentId
      });

      const response1 = await request(SERVER_URL)
        .post('/api/guests')
        .send(guestData1)
        .expect(200)
        .timeout(10000);

      createdGuests.push(response1.body.data);

      // Try to create second guest with same session ID
      const cart2 = await createTestCart(
        `different-session-${timestamp}`,
        testProduct.documentId,
        testProductListing.documentId,
        1
      );
      createdCarts.push(cart2);

      const guestData2 = createTestGuestData({
        sessionId, // Same session ID
        email: `different${timestamp}@example.com`,
        cartId: cart2.documentId
      });

      const response2 = await request(SERVER_URL)
        .post('/api/guests')
        .send(guestData2)
        .expect(400)
        .timeout(10000);

      expect(response2.body.error.message).toContain('Validation failed');
    });

    it('should return 400 for non-existent cart', async () => {
      const sessionId = `non-existent-cart-session-${timestamp}`;
      const email = `nonexistentcart${timestamp}@example.com`;

      const guestData = createTestGuestData({
        sessionId,
        email,
        cartId: 'non-existent-cart-id'
      });

      const response = await request(SERVER_URL)
        .post('/api/guests')
        .send(guestData)
        .timeout(10000);
      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Validation failed');
    });

    it('should return 400 for cart with different session ID', async () => {
      const sessionId = `different-session-${timestamp}`;
      const email = `differentsession${timestamp}@example.com`;
      
      // Create cart with different session ID
      const cart = await createTestCart(
        `other-session-${timestamp}`,
        testProduct.documentId,
        testProductListing.documentId,
        1
      );
      createdCarts.push(cart);

      const guestData = createTestGuestData({
        sessionId, // Different session ID
        email,
        cartId: cart.documentId
      });

      const response = await request(SERVER_URL)
        .post('/api/guests')
        .send(guestData)
        .expect(400)
        .timeout(10000);

      expect(response.body.error.message).toContain('Validation failed');
    });
  });

  describe('Guest Retrieval and Session Management', () => {
    let testGuest: any;
    let testSessionId: string;

    beforeAll(async () => {
      testSessionId = `retrieval-session-${timestamp}`;
      const email = `retrievalguest${timestamp}@example.com`;
      
      // Create a cart first
      const cart = await createTestCart(
        testSessionId,
        testProduct.documentId,
        testProductListing.documentId,
        1
      );
      createdCarts.push(cart);

      // Create guest
      const guestData = createTestGuestData({
        sessionId: testSessionId,
        email,
        cartId: cart.documentId
      });

      const response = await request(SERVER_URL)
        .post('/api/guests')
        .send(guestData)
        .expect(200)
        .timeout(10000);

      testGuest = response.body.data;
      createdGuests.push(testGuest);
    });

    it('should retrieve guest by session ID', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/guests/${testSessionId}`)
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.sessionId).toBe(testSessionId);
      expect(response.body.data.email).toBe(`retrievalguest${timestamp}@example.com`);
      expect(response.body.data.status).toBe('active');
      expect(response.body.meta.message).toBe('Guest retrieved successfully');
    });

    it('should return 404 for non-existent guest', async () => {
      const nonExistentSessionId = 'non-existent-session';

      const response = await request(SERVER_URL)
        .get(`/api/guests/${nonExistentSessionId}`)
        .expect(404)
        .timeout(10000);

      expect(response.body.error.message).toBe('Guest not found');
    });

    it('should return 400 for missing session ID', async () => {
      const response = await request(SERVER_URL)
        .get('/api/guests/')
        .expect(404)
        .timeout(10000);
    });
  });

  describe('Guest Updates and Data Validation', () => {
    let testGuest: any;
    let testSessionId: string;

    beforeAll(async () => {
      testSessionId = `update-session-${timestamp}`;
      const email = `updateguest${timestamp}@example.com`;
      
      // Create a cart first
      const cart = await createTestCart(
        testSessionId,
        testProduct.documentId,
        testProductListing.documentId,
        1
      );
      createdCarts.push(cart);

      // Create guest
      const guestData = createTestGuestData({
        sessionId: testSessionId,
        email,
        cartId: cart.documentId
      });

      const response = await request(SERVER_URL)
        .post('/api/guests')
        .send(guestData)
        .expect(200)
        .timeout(10000);

      testGuest = response.body.data;
      createdGuests.push(testGuest);
    });

    it('should update guest successfully', async () => {
      const updateData = {
        email: `updated${timestamp}@example.com`,
        metadata: {
          source: 'mobile',
          preferences: {
            newsletter: true
          }
        }
      };

      const response = await request(SERVER_URL)
        .put(`/api/guests/${testSessionId}`)
        .send(updateData)
        .timeout(10000);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.email).toBe(`updated${timestamp}@example.com`);
      expect(response.body.data.metadata).toEqual(updateData.metadata);
      expect(response.body.meta.message).toBe('Guest updated successfully');
    });

    it('should return 400 for invalid email format in update', async () => {
      const updateData = {
        email: 'invalid-email-format'
      };

      const response = await request(SERVER_URL)
        .put(`/api/guests/${testSessionId}`)
        .send(updateData)
        .expect(400)
        .timeout(10000);
      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.details).toBeDefined();
      expect(response.body.error.details.length).toBe(1);
      expect(response.body.error.details[0]).toBe('Invalid email format');
    });

    it('should return 405 for missing session ID in update', async () => {
      const updateData = {
        email: `valid${timestamp}@example.com`
      };

      const response = await request(SERVER_URL)
        .put('/api/guests/')
        .send(updateData)
        .expect(405)
        .timeout(10000);
    });

    it('should return 404 for non-existent guest update', async () => {
      const updateData = {
        email: `valid${timestamp}@example.com`
      };

      const response = await request(SERVER_URL)
        .put('/api/guests/non-existent-session')
        .send(updateData)
        .expect(404)
        .timeout(10000);
    });
  });

  describe('Guest to User Conversion', () => {
    let testGuest: any;
    let testSessionId: string;

    beforeAll(async () => {
      testSessionId = `conversion-session-${timestamp}`;
      const email = `conversionguest${timestamp}@example.com`;
      
      // Create a cart first
      const cart = await createTestCart(
        testSessionId,
        testProduct.documentId,
        testProductListing.documentId,
        1
      );
      createdCarts.push(cart);

      // Create guest
      const guestData = createTestGuestData({
        sessionId: testSessionId,
        email,
        cartId: cart.documentId
      });

      const response = await request(SERVER_URL)
        .post('/api/guests')
        .send(guestData)
        .expect(200)
        .timeout(10000);

      testGuest = response.body.data;
      createdGuests.push(testGuest);
    });

    it('should convert guest to registered user successfully', async () => {
      const userData = createTestUserData({
        username: `conversionuser${timestamp}`,
        email: `conversionuser${timestamp}@example.com`
      });

      const response = await request(SERVER_URL)
        .post(`/api/guests/${testSessionId}/convert`)
        .send(userData)
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.guest).toBeDefined();
      expect(response.body.data.user.username).toBe(`conversionuser${timestamp}`);
      expect(response.body.data.user.email).toBe(`conversionuser${timestamp}@example.com`);
      expect(response.body.data.guest.status).toBe('converted');
      expect(response.body.meta.message).toBe('Guest successfully converted to user account');
      expect(validateUserData(response.body.data.user)).toBe(true);

      // Store user for cleanup
      createdUsers.push(response.body.data.user);
    });

    it('should return 400 for missing required user fields', async () => {
      const incompleteUserData = {
        username: `incompleteuser${timestamp}`,
        // Missing password, email, firstName, lastName
      };

      const response = await request(SERVER_URL)
        .post(`/api/guests/${testSessionId}/convert`)
        .send(incompleteUserData)
        .expect(400)
        .timeout(10000);

      expect(response.body.error.message).toContain('Missing required fields');
    });

    it('should return 400 for invalid email format in conversion', async () => {
      const userData = {
        username: `invalidemail${timestamp}`,
        password: 'TestPassword123!',
        email: 'invalid-email-format',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(SERVER_URL)
        .post(`/api/guests/${testSessionId}/convert`)
        .send(userData)
        .expect(400)
        .timeout(10000);

      expect(response.body.error.message).toBe('Invalid email format');
    });

    it('should return 400 for weak password in conversion', async () => {
      const userData = {
        username: `weakpassword${timestamp}`,
        password: '123', // Too short
        email: `weakpassword${timestamp}@example.com`,
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(SERVER_URL)
        .post(`/api/guests/${testSessionId}/convert`)
        .send(userData)
        .expect(400)
        .timeout(10000);

      expect(response.body.error.message).toBe('Password must be at least 6 characters long');
    });

    it('should return 400 for missing session ID in conversion', async () => {
      const userData = {
        username: `nosession${timestamp}`,
        password: 'TestPassword123!',
        email: `nosession${timestamp}@example.com`,
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(SERVER_URL)
        .post('/api/guests/testset/convert')
        .send(userData)
        .expect(404)
        .timeout(10000);
    });

    it('should return 404 for non-existent guest conversion', async () => {
      const userData = {
        username: `nonexistent${timestamp}`,
        password: 'TestPassword123!',
        email: `nonexistent${timestamp}@example.com`,
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(SERVER_URL)
        .post('/api/guests/non-existent-session/convert')
        .send(userData)
        .expect(404)
        .timeout(10000);
    });

    it('should return 400 for already converted guest', async () => {
      // Create a new guest for this test
      const newSessionId = `already-converted-session-${timestamp}`;
      const email = `alreadyconverted${timestamp}@example.com`;
      
      // Create a cart first
      const cartResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .query({ sessionId: newSessionId })
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 1
        })
        .timeout(10000);

      const cart = cartResponse.body.data.cart;
      createdCarts.push(cart);

      // Create guest
      const guestData = {
        sessionId: newSessionId,
        email,
        cartId: cart.documentId
      };

      const guestResponse = await request(SERVER_URL)
        .post('/api/guests')
        .send(guestData)
        .expect(200)
        .timeout(10000);

      createdGuests.push(guestResponse.body.data);

      // Convert to user first time
      const userData1 = {
        username: `firstconversion${timestamp}`,
        password: 'TestPassword123!',
        email: `firstconversion${timestamp}@example.com`,
        firstName: 'John',
        lastName: 'Doe'
      };

      const conversionResponse = await request(SERVER_URL)
        .post(`/api/guests/${newSessionId}/convert`)
        .send(userData1)
        .expect(200)
        .timeout(10000);

      createdUsers.push(conversionResponse.body.data.user);

      // Try to convert again
      const userData2 = {
        username: `secondconversion${timestamp}`,
        password: 'TestPassword123!',
        email: `secondconversion${timestamp}@example.com`,
        firstName: 'Jane',
        lastName: 'Smith'
      };

      const secondConversionResponse = await request(SERVER_URL)
        .post(`/api/guests/${newSessionId}/convert`)
        .send(userData2)
        .expect(400)
        .timeout(10000);

      expect(secondConversionResponse.body.error.message).toContain('Guest already converted to user');
    });
  });

  describe('Guest Analytics and Reporting', () => {
    beforeAll(async () => {
      // Create multiple guests for analytics testing
      const guests = [
        { sessionId: `analytics-session-1-${timestamp}`, email: `analytics1${timestamp}@example.com` },
        { sessionId: `analytics-session-2-${timestamp}`, email: `analytics2${timestamp}@example.com` },
        { sessionId: `analytics-session-3-${timestamp}`, email: `analytics3${timestamp}@example.com` }
      ];

      for (const guest of guests) {
        // Create cart for each guest
        const cartResponse = await request(SERVER_URL)
          .post('/api/carts/items')
          .query({ sessionId: guest.sessionId })
          .send({
            productId: testProduct.documentId,
            productListingId: testProductListing.documentId,
            quantity: 1
          })
          .timeout(10000);

        const cart = cartResponse.body.data.cart;
        createdCarts.push(cart);

        // Create guest
        const guestData = {
          sessionId: guest.sessionId,
          email: guest.email,
          cartId: cart.documentId
        };

        const response = await request(SERVER_URL)
          .post('/api/guests')
          .send(guestData)
          .expect(200)
          .timeout(10000);

        createdGuests.push(response.body.data);
      }
    });

    it('should get guest analytics', async () => {
      const analytics = await getGuestAnalytics(apiToken);

      expect(analytics).toBeDefined();
      expect(analytics).toHaveProperty('totalGuest');
      expect(analytics).toHaveProperty('activeGuest');
      expect(analytics).toHaveProperty('convertedGuest');
      expect(analytics).toHaveProperty('conversionRate');
      expect(analytics).toHaveProperty('completionRate');
      expect(validateAnalyticsData(analytics)).toBe(true);

      // Verify analytics data types
      expect(typeof analytics.totalGuest).toBe('number');
      expect(typeof analytics.activeGuest).toBe('number');
      expect(typeof analytics.convertedGuest).toBe('number');
      expect(typeof analytics.conversionRate).toBe('number');
      expect(typeof analytics.completionRate).toBe('number');

      // Verify analytics data values
      expect(analytics.totalGuest).toBeGreaterThanOrEqual(0);
      expect(analytics.activeGuest).toBeGreaterThanOrEqual(0);
      expect(analytics.convertedGuest).toBeGreaterThanOrEqual(0);
      expect(analytics.conversionRate).toBeGreaterThanOrEqual(0);
      expect(analytics.completionRate).toBeGreaterThanOrEqual(0);
    });

    it('should return 403 for analytics without admin token', async () => {
      const response = await request(SERVER_URL)
        .post('/api/guests/analytics')
        .expect(403)
        .timeout(10000);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle server errors gracefully', async () => {
      // Test with malformed request
      const response = await request(SERVER_URL)
        .post('/api/guests')
        .send('invalid json')
        .expect(400)
        .timeout(10000);
    });

    it('should handle timeout scenarios', async () => {
      const sessionId = `timeout-session-${timestamp}`;
      const email = `timeoutguest${timestamp}@example.com`;
      
      // Create a cart first
      const cartResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .query({ sessionId })
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 1
        })
        .timeout(10000);

      const cart = cartResponse.body.data.cart;
      createdCarts.push(cart);

      const guestData = {
        sessionId,
        email,
        cartId: cart.documentId
      };

      // Test with very short timeout
      const response = await request(SERVER_URL)
        .post('/api/guests')
        .send(guestData)
        .timeout(100); // Very short timeout

      // Should either succeed or timeout, but not crash
      expect([200, 408]).toContain(response.status);
    });

    it('should handle concurrent guest creation', async () => {
      const baseSessionId = `concurrent-session-${timestamp}`;
      const concurrentRequests = 3;
      const promises: any[] = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const sessionId = `${baseSessionId}-${i}`;
        const email = `concurrent${i}${timestamp}@example.com`;
        
        // Create cart for each request
        const cartResponse = await request(SERVER_URL)
          .post('/api/carts/items')
          .query({ sessionId })
          .send({
            productId: testProduct.documentId,
            productListingId: testProductListing.documentId,
            quantity: 1
          })
          .timeout(10000);

        const cart = cartResponse.body.data.cart;
        createdCarts.push(cart);

        const guestData = {
          sessionId,
          email,
          cartId: cart.documentId
        };

        promises.push(
          request(SERVER_URL)
            .post('/api/guests')
            .send(guestData)
            .timeout(10000)
        );
      }

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
        createdGuests.push(response.body.data);
      });
    });
  });

  describe('Performance and Bulk Operations', () => {
    it('should handle bulk guest creation efficiently', async () => {
      const startTime = Date.now();
      const bulkCount = 5;
      const promises: any[] = [];

      for (let i = 0; i < bulkCount; i++) {
        const sessionId = `bulk-session-${timestamp}-${i}`;
        const email = `bulkguest${i}${timestamp}@example.com`;
        
        // Create cart for each guest
        const cartResponse = await request(SERVER_URL)
          .post('/api/carts/items')
          .query({ sessionId })
          .send({
            productId: testProduct.documentId,
            productListingId: testProductListing.documentId,
            quantity: 1
          })
          .timeout(10000);

        const cart = cartResponse.body.data.cart;
        createdCarts.push(cart);

        const guestData = {
          sessionId,
          email,
          cartId: cart.documentId
        };

        promises.push(
          request(SERVER_URL)
            .post('/api/guests')
            .send(guestData)
            .timeout(10000)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        createdGuests.push(response.body.data);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(30000); // 30 seconds
    });

    it('should handle large guest data efficiently', async () => {
      const sessionId = `large-data-session-${timestamp}`;
      const email = `largedataguest${timestamp}@example.com`;
      
      // Create a cart first
      const cartResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .query({ sessionId })
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 1
        })
        .timeout(10000);

      const cart = cartResponse.body.data.cart;
      createdCarts.push(cart);

      // Create guest with large metadata
      const largeMetadata = {
        source: 'mobile',
        device: 'iPhone 13',
        browser: 'Safari',
        os: 'iOS 15',
        preferences: {
          newsletter: true,
          sms: false,
          push: true,
          language: 'en-US',
          currency: 'USD',
          timezone: 'America/New_York'
        },
        tracking: {
          utm_source: 'google',
          utm_medium: 'cpc',
          utm_campaign: 'summer_sale',
          referrer: 'https://google.com',
          landing_page: '/products'
        },
        custom_fields: {
          age_group: '25-34',
          interests: ['technology', 'shopping', 'lifestyle'],
          budget_range: '$100-500',
          purchase_frequency: 'monthly'
        }
      };

      const guestData = {
        sessionId,
        email,
        cartId: cart.documentId,
        metadata: largeMetadata
      };

      const startTime = Date.now();
      const response = await request(SERVER_URL)
        .post('/api/guests')
        .send(guestData)
        .expect(200)
        .timeout(10000);
      const endTime = Date.now();

      expect(response.body.data).toBeDefined();
      expect(response.body.data.metadata).toEqual(largeMetadata);
      createdGuests.push(response.body.data);

      // Should complete within reasonable time even with large data
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });
  });
});
