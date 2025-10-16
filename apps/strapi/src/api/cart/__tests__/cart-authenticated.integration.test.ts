/**
 * Cart Integration Tests - Authenticated Users
 * 
 * Comprehensive integration tests for Cart module covering authenticated user scenarios:
 * - Cart creation with database verification
 * - Cart retrieval and session management
 * - Cart updates and validation
 * - Cart deletion and cleanup
 * - Cart persistence across sessions
 * - Cart recovery and restoration
 * - Cart expiration and cleanup
 * - Cart user association and management
 */

import request from 'supertest';

describe('Cart Integration Tests - Authenticated Users', () => {
  const SERVER_URL = 'http://localhost:1337';
  let apiToken: string;
  let testUser: any;
  let testProduct: any;
  let testProductListing: any;
  let testCart: any;
  
  // Track all created users for cleanup
  const createdUsers: any[] = [];
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();

  beforeAll(async () => {
    // Get admin token for authenticated requests
    apiToken = process.env.STRAPI_API_TOKEN as string;

    if (!apiToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }

    // Create test user for cart operations
    const userData = {
      username: `testuser${timestamp}`,
      email: `testuser${timestamp}@example.com`,
      password: 'TestPassword123!',
    };

    const userResponse = await request(SERVER_URL)
      .post('/api/auth/local/register')
      .send(userData)
      .timeout(10000);

    if (userResponse.status !== 200) {
      throw new Error(`Failed to create test user: ${userResponse.status} - ${JSON.stringify(userResponse.body)}`);
    }

    testUser = userResponse.body.user;
    createdUsers.push(testUser);

    // Create test product for cart operations
    const productData = {
      name: `Test Product ${timestamp}`,
      brand: `Test Brand ${timestamp}`,
      sku: `TEST-PROD-${timestamp}`,
      inventory: 100,
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
      description: 'Test product listing for cart integration tests',
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
    // Clean up all created users
    for (const user of createdUsers) {
      if (user?.id) {
        try {
          await request(SERVER_URL)
            .delete(`/api/users/${user.id}`)
            .set('Authorization', `Bearer ${apiToken}`)
            .expect(200)
            .timeout(10000);
        } catch (error) {
          console.warn(`Failed to clean up user ${user.id}:`, error.message);
        }
      }
    }

   
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

  describe('Cart Creation and Database Verification', () => {
    it('should create cart for authenticated user and verify database record', async () => {
      // First, authenticate the test user to get their JWT token
      const loginResponse = await request(SERVER_URL)
        .post('/api/auth/local')
        .send({
          identifier: testUser.email,
          password: 'TestPassword123!'
        })
        .timeout(10000);

      if (loginResponse.status !== 200) {
        throw new Error(`Failed to authenticate test user: ${loginResponse.status} - ${JSON.stringify(loginResponse.body)}`);
      }

      const userToken = loginResponse.body.jwt;

      // Add item to cart (this should create a cart if one doesn't exist)
      const addItemResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 2
        })
        .timeout(10000);
      
      expect(addItemResponse.status).toBe(200);
      expect(addItemResponse.body.data.cart).toBeDefined();
      expect(addItemResponse.body.data.cartItem).toBeDefined();
      expect(addItemResponse.body.data.cart.user).toBeDefined();
      expect(addItemResponse.body.data.cart.user.id).toBe(testUser.id);

      // Store cart for cleanup
      testCart = addItemResponse.body.data.cart;

      // Verify cart was created in database
      const cartResponse = await request(SERVER_URL)
        .get('/api/carts/current')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .timeout(10000);
      expect(cartResponse.body.data.documentId).toBe(testCart.documentId);
      expect(cartResponse.body.data.user.id).toBe(testUser.id);
      expect(cartResponse.body.data.subtotal).toBeGreaterThan(0);
      expect(cartResponse.body.data.total).toBeGreaterThan(0);
    });
  });

  describe('Cart Retrieval and Session Management', () => {
    let userToken: string;

    beforeAll(async () => {
      // Authenticate user for tests
      const loginResponse = await request(SERVER_URL)
        .post('/api/auth/local')
        .send({
          identifier: testUser.email,
          password: 'TestPassword123!'
        })
        .timeout(10000);

      userToken = loginResponse.body.jwt;
    });

    it('should retrieve cart for authenticated user', async () => {
      // Ensure user has a cart with items
      await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 1
        })
        .timeout(10000);

      const response = await request(SERVER_URL)
        .get('/api/carts/current')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.items).toBeDefined();
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it('should return 404 for non-existent cart', async () => {
      // Create a new user without a cart
      const newUserData = {
        username: `newuser${timestamp}`,
        email: `newuser${timestamp}@example.com`,
        password: 'TestPassword123!',
      };

      const newUserResponse = await request(SERVER_URL)
        .post('/api/auth/local/register')
        .send(newUserData)
        .timeout(10000);

      const newUser = newUserResponse.body.user;
      createdUsers.push(newUser);

      const newUserToken = newUserResponse.body.jwt;

      await request(SERVER_URL)
        .get('/api/carts/current')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(404)
        .timeout(10000);
    });

  });

  describe('Cart Updates and Validation', () => {
    let userToken: string;
    let cartItem: any;

    beforeAll(async () => {
      // Authenticate user and create cart with item
      const loginResponse = await request(SERVER_URL)
        .post('/api/auth/local')
        .send({
          identifier: testUser.email,
          password: 'TestPassword123!'
        })
        .timeout(10000);

      userToken = loginResponse.body.jwt;

      // Add item to cart
      const addItemResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 2
        })
        .timeout(10000);

      cartItem = addItemResponse.body.data.cartItem;
    });

    it('should update cart item quantity', async () => {
      const newQuantity = 5;

      const response = await request(SERVER_URL)
        .put(`/api/carts/items/${cartItem.documentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quantity: newQuantity })
        .expect(200)
        .timeout(10000);
      expect(response.body.data.cartItem.quantity).toBe(newQuantity);
      expect(response.body.data.cartItem.total).toBe(cartItem.price * newQuantity);
      expect(response.body.data.calculation).toBeDefined();
    });

    it('should reject invalid quantity updates', async () => {
      await request(SERVER_URL)
        .put(`/api/carts/items/${cartItem.documentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quantity: 0 })
        .expect(400)
        .timeout(10000);

      await request(SERVER_URL)
        .put(`/api/carts/items/${cartItem.documentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quantity: -1 })
        .expect(400)
        .timeout(10000);
    });

    it('should return 404 for non-existent cart item', async () => {
      const nonExistentDocumentId = 'non-existent-document-id';

      await request(SERVER_URL)
        .put(`/api/carts/items/${nonExistentDocumentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quantity: 3 })
        .expect(404)
        .timeout(10000);
    });

    it('should forbid updating other users cart items', async () => {
      // Create a second user and their cart item
      const user2Data = {
        username: `testuser2${timestamp}`,
        email: `testuser2${timestamp}@example.com`,
        password: 'TestPassword123!',
      };

      const user2Response = await request(SERVER_URL)
        .post('/api/auth/local/register')
        .send(user2Data)
        .timeout(10000);

      const user2 = user2Response.body.user;
      createdUsers.push(user2);

      const user2Token = user2Response.body.jwt;

      // User 2 creates a cart with item
      const user2CartResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 1
        })
        .timeout(10000);

      const user2CartItemId = user2CartResponse.body.data.cartItem.documentId;

      // User 1 should not be able to update User 2's cart item
      await request(SERVER_URL)
        .put(`/api/carts/items/${user2CartItemId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quantity: 5 })
        .expect(403)
        .timeout(10000);
    });
  });

  describe('Cart Item Management', () => {
    let userToken: string;
    let cartItem: any;

    beforeAll(async () => {
      // Authenticate user and create cart with item
      const loginResponse = await request(SERVER_URL)
        .post('/api/auth/local')
        .send({
          identifier: testUser.email,
          password: 'TestPassword123!'
        })
        .timeout(10000);

      userToken = loginResponse.body.jwt;

      // Add item to cart
      const addItemResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 3
        })
        .timeout(10000);

      cartItem = addItemResponse.body.data.cartItem;
    });

    it('should remove cart item and update totals', async () => {
      const response = await request(SERVER_URL)
        .delete(`/api/carts/items/${cartItem.documentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .timeout(10000);

      expect(response.body.data.message).toBe('Item removed from cart');
      expect(response.body.data.calculation).toBeDefined();

      // Verify item is removed by checking cart
      const cartResponse = await request(SERVER_URL)
        .get('/api/carts/current')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .timeout(10000);

      expect(cartResponse.body.data.items).toHaveLength(0);
      expect(cartResponse.body.data.subtotal).toBe(0);
      expect(cartResponse.body.data.total).toBe(0);
    });

    it('should return 404 for non-existent cart item removal', async () => {
      const nonExistentDocumentId = 'non-existent-document-id';

      await request(SERVER_URL)
        .delete(`/api/carts/items/${nonExistentDocumentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404)
        .timeout(10000);
    });

    it('should forbid deleting other users cart items', async () => {
      // Create a second user and their cart item
      const user2Data = {
        username: `testuser3${timestamp}`,
        email: `testuser3${timestamp}@example.com`,
        password: 'TestPassword123!',
      };

      const user2Response = await request(SERVER_URL)
        .post('/api/auth/local/register')
        .send(user2Data)
        .timeout(10000);

      const user2 = user2Response.body.user;
      createdUsers.push(user2);

      const user2Token = user2Response.body.jwt;

      // User 2 creates a cart with item
      const user2CartResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 1
        })
        .timeout(10000);

      const user2CartItemId = user2CartResponse.body.data.cartItem.documentId;

      // User 1 should not be able to delete User 2's cart item
      await request(SERVER_URL)
        .delete(`/api/carts/items/${user2CartItemId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
        .timeout(10000);
    });

    it('should clear all cart items', async () => {
      // Add multiple items to cart
      const addItemResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 2
        })
        .expect(200)
        .timeout(10000);

      // Clear cart
      const response = await request(SERVER_URL)
        .post('/api/carts/clear')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);
      expect(response.status).toBe(200);
      expect(response.body.data.message).toBe('Cart cleared successfully');

      // Verify cart is empty
      const cartResponse = await request(SERVER_URL)
        .get('/api/carts/current')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .timeout(10000);

      expect(cartResponse.body.data.items).toHaveLength(0);
      expect(cartResponse.body.data.subtotal).toBe(0);
      expect(cartResponse.body.data.total).toBe(0);
    });
  });

  describe('Cart Persistence and Recovery', () => {
    let userToken: string;

    beforeAll(async () => {
      // Authenticate user
      const loginResponse = await request(SERVER_URL)
        .post('/api/auth/local')
        .send({
          identifier: testUser.email,
          password: 'TestPassword123!'
        })
        .timeout(10000);

      userToken = loginResponse.body.jwt;
    });

    it('should persist cart across multiple requests for authenticated user', async () => {
      // Add item to cart
      await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 2
        })
        .timeout(10000);

      // Retrieve cart multiple times
      const response1 = await request(SERVER_URL)
        .get('/api/carts/current')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .timeout(10000);

      const response2 = await request(SERVER_URL)
        .get('/api/carts/current')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .timeout(10000);

      expect(response1.body.data.documentId).toBe(response2.body.data.documentId);
      expect(response1.body.data.items).toHaveLength(response2.body.data.items.length);
    });

  });

  describe('Cart Calculation and Totals', () => {
    let userToken: string;

    beforeAll(async () => {
      // Authenticate user
      const loginResponse = await request(SERVER_URL)
        .post('/api/auth/local')
        .send({
          identifier: testUser.email,
          password: 'TestPassword123!'
        })
        .timeout(10000);

      userToken = loginResponse.body.jwt;
    });

    it('should calculate cart totals correctly', async () => {
      // Add item to cart
      await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 2
        })
        .timeout(10000);

      // Calculate totals
      const response = await request(SERVER_URL)
        .post('/api/carts/calculate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            country: 'US'
          },
          shippingMethod: 'standard'
        })
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.subtotal).toBeGreaterThan(0);
      expect(response.body.data.total).toBeGreaterThanOrEqual(response.body.data.subtotal);
    });


  });

  describe('Cart Validation and Error Handling', () => {
    it('should reject adding invalid product to cart', async () => {
      const loginResponse = await request(SERVER_URL)
        .post('/api/auth/local')
        .send({
          identifier: testUser.email,
          password: 'TestPassword123!'
        })
        .timeout(10000);

      const userToken = loginResponse.body.jwt;

      const response = await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productListingId: testProductListing.documentId,
          productId: 'non-existent-product-id',
          quantity: 1
        })
        .timeout(10000);
      expect(response.status).toBe(404);
    });

    it('should reject adding item with invalid quantity', async () => {
      const loginResponse = await request(SERVER_URL)
        .post('/api/auth/local')
        .send({
          identifier: testUser.email,
          password: 'TestPassword123!'
        })
        .timeout(10000);

      const userToken = loginResponse.body.jwt;

      await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 0
        })
        .expect(400)
        .timeout(10000);
    });
  });

  describe('Cart Performance and Bulk Operations', () => {
    let userToken: string;

    beforeAll(async () => {
      // Authenticate user
      const loginResponse = await request(SERVER_URL)
        .post('/api/auth/local')
        .send({
          identifier: testUser.email,
          password: 'TestPassword123!'
        })
        .timeout(10000);

      userToken = loginResponse.body.jwt;
    });

    it('should handle multiple concurrent cart operations', async () => {
      const concurrentRequests = 3;
      const promises: any[] = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(SERVER_URL)
            .post('/api/carts/items')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
              productId: testProduct.documentId,
              productListingId: testProductListing.documentId,
              quantity: 1
            })
            .timeout(10000)
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.cartItem).toBeDefined();
      });
    });

    it('should handle large cart operations efficiently', async () => {
      const startTime = Date.now();
      
      // Add multiple items to cart
      for (let i = 0; i < 5; i++) {
        await request(SERVER_URL)
          .post('/api/carts/items')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            productId: testProduct.documentId,
            productListingId: testProductListing.documentId,
            quantity: 1
          })
          .timeout(10000)
          .expect(200)
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});
