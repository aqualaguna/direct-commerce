/**
 * Cart Integration Tests - Guest Users
 * 
 * Comprehensive integration tests for Cart module covering guest user scenarios:
 * - Cart creation with session ID
 * - Cart retrieval and session management
 * - Cart updates and validation
 * - Cart persistence across sessions
 * - Cart migration to authenticated users
 * - Cart expiration and cleanup
 */

import request from 'supertest';

describe('Cart Integration Tests - Guest Users', () => {
  const SERVER_URL = 'http://localhost:1337';
  let adminToken: string;
  let testProduct: any;
  let testProductListing: any;
  let testCart: any;

  // Track all created carts and users for cleanup
  const createdCarts: any[] = [];
  const createdUsers: any[] = [];

  // Generate unique test data with timestamp
  const timestamp = Date.now();

  beforeAll(async () => {
    // Get admin token for authenticated requests
    adminToken = process.env.STRAPI_API_TOKEN as string;

    if (!adminToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }

    // Create test product for cart operations
    const productData = {
      name: `Test Product ${timestamp}`,
      brand: `Test Brand ${timestamp}`,
      sku: `TEST-PROD-${timestamp}`,
      inventory: 10000,
      status: 'active'
    };

    const productResponse = await request(SERVER_URL)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
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
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: productListingData })
      .timeout(10000);
    if (productListingResponse.status !== 200) {
      throw new Error(`Failed to create test product listing: ${productListingResponse.status} - ${JSON.stringify(productListingResponse.body)}`);
    }

    testProductListing = productListingResponse.body;
  });

  afterAll(async () => {

    // make sure cart documentId are unique
    const uniqueCarts = createdCarts.filter((cart, index, self) =>
      index === self.findIndex((t) => t.documentId === cart.documentId)
    );
    // Clean up all created carts
    for (const cart of uniqueCarts) {
      if (cart?.documentId) {
        try {
          await request(SERVER_URL)
            .delete(`/api/carts/${cart.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200)
            .timeout(10000);
        } catch (error) {
          console.warn(`Failed to clean up cart ${cart.documentId}:`, error.message);
        }
      }
    }

    // Clean up all created users first
    for (const user of createdUsers) {
      if (user?.id) {
        try {
          await request(SERVER_URL)
            .delete(`/api/users/${user.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
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
          .set('Authorization', `Bearer ${adminToken}`)
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
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .timeout(10000);
      } catch (error) {
        console.warn('Failed to clean up test product:', error.message);
      }
    }
  });

  describe('Cart Creation and Database Verification', () => {
    it('should create cart for guest user with session ID', async () => {
      const sessionId = `test-session-${timestamp}`;

      // Add item to cart for guest user
      const addItemResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .query({ sessionId })
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 1
        })
        .expect(200)
        .timeout(10000);

      expect(addItemResponse.body.data.cart).toBeDefined();
      expect(addItemResponse.body.data.cartItem).toBeDefined();
      expect(addItemResponse.body.data.cart.sessionId).toBe(sessionId);
      expect(addItemResponse.body.data.cart.user).toBeNull();

      // Store cart for cleanup
      testCart = addItemResponse.body.data.cart;
      createdCarts.push(testCart);

      // Verify cart can be retrieved by session ID
      const cartResponse = await request(SERVER_URL)
        .get('/api/carts/current')
        .query({ sessionId })
        .expect(200)
        .timeout(10000);

      expect(cartResponse.body.data.sessionId).toBe(sessionId);
      expect(cartResponse.body.data.user).toBeUndefined();
      // expect cart items to be defined
      expect(cartResponse.body.data.items).toBeDefined();
      expect(Array.isArray(cartResponse.body.data.items)).toBe(true);
      expect(cartResponse.body.data.items.length).toBe(1);
      expect(cartResponse.body.data.items[0].product.documentId).toBe(testProduct.documentId);
      expect(cartResponse.body.data.items[0].productListing.documentId).toBe(testProductListing.documentId);
      expect(cartResponse.body.data.items[0].quantity).toBe(1);
    });
  });

  describe('Cart Retrieval and Session Management', () => {
    it('should retrieve cart for guest user by session ID', async () => {
      // Use unique session ID for this test
      const sessionId = `retrieval-session-${timestamp}-${Date.now()}`;

      // Ensure guest has a cart with items
      const addItemResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .query({ sessionId })
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 1
        })
        .timeout(10000);

      // Track the cart for cleanup
      if (addItemResponse.body.data.cart) {
        createdCarts.push(addItemResponse.body.data.cart);
      }

      const response = await request(SERVER_URL)
        .get('/api/carts/current')
        .query({ sessionId })
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.sessionId).toBe(sessionId);
      expect(response.body.data.user).toBeUndefined();
      expect(response.body.data.items).toBeDefined();
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0].product.documentId).toBe(testProduct.documentId);
      expect(response.body.data.items[0].productListing.documentId).toBe(testProductListing.documentId);
      expect(response.body.data.items[0].quantity).toBe(1);
    });

    it('should return 404 for non-existent cart', async () => {
      const nonExistentSessionId = 'non-existent-session';

      await request(SERVER_URL)
        .get('/api/carts/current')
        .query({ sessionId: nonExistentSessionId })
        .expect(404)
        .timeout(10000);
    });
  });

  describe('Cart Updates and Validation', () => {
    let sessionId: string;
    let cartItem: any;

    beforeAll(async () => {
      sessionId = `updates-session-${timestamp}-${Date.now()}`;

      // Add item to cart
      const addItemResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .query({ sessionId })
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 2
        })
        .timeout(10000);

      cartItem = addItemResponse.body.data.cartItem;

      // Track the cart for cleanup
      if (addItemResponse.body.data.cart) {
        createdCarts.push(addItemResponse.body.data.cart);
      }
    });

    it('should update cart item quantity for guest user', async () => {
      const newQuantity = 5;

      const response = await request(SERVER_URL)
        .put(`/api/carts/items/${cartItem.documentId}`)
        .query({ sessionId })
        .send({ quantity: newQuantity })
        .expect(200)
        .timeout(10000);

      expect(response.body.data.cartItem.quantity).toBe(newQuantity);
      expect(response.body.data.cartItem.total).toBe(cartItem.price * newQuantity);
      expect(response.body.data.calculation).toBeDefined();
    });

    it('should reject invalid quantity updates for guest user', async () => {
      await request(SERVER_URL)
        .put(`/api/carts/items/${cartItem.documentId}`)
        .query({ sessionId })
        .send({ quantity: 0 })
        .expect(400)
        .timeout(10000);

      await request(SERVER_URL)
        .put(`/api/carts/items/${cartItem.documentId}`)
        .query({ sessionId })
        .send({ quantity: -1 })
        .expect(400)
        .timeout(10000);
    });

    it('should return 404 for non-existent cart item for guest user', async () => {
      const nonExistentDocumentId = 'non-existent-document-id';

      await request(SERVER_URL)
        .put(`/api/carts/items/${nonExistentDocumentId}`)
        .query({ sessionId })
        .send({ quantity: 3 })
        .expect(404)
        .timeout(10000);
    });
  });

  describe('Cart Item Management', () => {
    let sessionId: string;
    let cartItem: any;

    beforeAll(async () => {
      sessionId = `management-session-${timestamp}-${Date.now()}`;

      // Add item to cart
      const addItemResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .query({ sessionId })
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 3
        })
        .timeout(10000);

      cartItem = addItemResponse.body.data.cartItem;

      // Track the cart for cleanup
      if (addItemResponse.body.data.cart) {
        createdCarts.push(addItemResponse.body.data.cart);
      }
    });

    it('should remove cart item and update totals for guest user', async () => {
      const response = await request(SERVER_URL)
        .delete(`/api/carts/items/${cartItem.documentId}`)
        .query({ sessionId })
        .expect(200)
        .timeout(10000);

      expect(response.body.data.message).toBe('Item removed from cart');
      expect(response.body.data.calculation).toBeDefined();

      // Verify item is removed by checking cart
      const cartResponse = await request(SERVER_URL)
        .get('/api/carts/current')
        .query({ sessionId })
        .expect(200)
        .timeout(10000);

      expect(cartResponse.body.data.items).toHaveLength(0);
      expect(cartResponse.body.data.subtotal).toBe(0);
      expect(cartResponse.body.data.total).toBe(0);
    });

    it('should return 404 for non-existent cart item removal for guest user', async () => {
      const nonExistentDocumentId = 'non-existent-document-id';

      await request(SERVER_URL)
        .delete(`/api/carts/items/${nonExistentDocumentId}`)
        .query({ sessionId })
        .expect(404)
        .timeout(10000);
    });

    it('should clear all cart items for guest user', async () => {
      // Add multiple items to cart
      await request(SERVER_URL)
        .post('/api/carts/items')
        .query({ sessionId })
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 2
        })
        .timeout(10000);

      // Clear cart
      const response = await request(SERVER_URL)
        .post('/api/carts/clear')
        .query({ sessionId })
        .timeout(10000);
      expect(response.status).toBe(200);
      expect(response.body.data.message).toBe('Cart cleared successfully');

      // Verify cart is empty
      const cartResponse = await request(SERVER_URL)
        .get('/api/carts/current')
        .query({ sessionId })
        .expect(200)
        .timeout(10000);

      expect(cartResponse.body.data.items).toHaveLength(0);
      expect(cartResponse.body.data.subtotal).toBe(0);
      expect(cartResponse.body.data.total).toBe(0);
    });
  });

  describe('Cart Persistence and Recovery', () => {
    it('should persist cart across multiple requests for guest user', async () => {
      // Use unique session ID for this test
      const sessionId = `persistence-session-${timestamp}-${Date.now()}`;

      // Add item to cart for guest
      const addItemResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .query({ sessionId })
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 1
        })
        .timeout(10000);

      // Track the cart for cleanup
      if (addItemResponse.body.data.cart) {
        createdCarts.push(addItemResponse.body.data.cart);
      }

      // Retrieve cart multiple times
      const response1 = await request(SERVER_URL)
        .get('/api/carts/current')
        .query({ sessionId })
        .expect(200)
        .timeout(10000);

      const response2 = await request(SERVER_URL)
        .get('/api/carts/current')
        .query({ sessionId })
        .expect(200)
        .timeout(10000);

      expect(response1.body.data.documentId).toBe(response2.body.data.documentId);
      expect(response1.body.data.sessionId).toBe(sessionId);
    });
  });

  describe('Cart Migration to Authenticated User', () => {
    let sessionId: string;
    let testUser: any;
    let userToken: string;

    beforeAll(async () => {
      sessionId = `migration-session-${timestamp}`;

      // Create test user for migration
      const userData = {
        username: `migrationuser${timestamp}`,
        email: `migrationuser${timestamp}@example.com`,
        password: 'TestPassword123!',
      };

      const userResponse = await request(SERVER_URL)
        .post('/api/auth/local/register')
        .send(userData)
        .timeout(10000);

      testUser = userResponse.body.user;
      createdUsers.push(testUser);

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

    it('should migrate guest cart to authenticated user', async () => {
      // Create guest cart with items
      const guestCartResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .query({ sessionId })
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 2
        })
        .timeout(10000);

      const guestCart = guestCartResponse.body.data.cart;
      createdCarts.push(guestCart);

      // Verify guest cart exists
      const guestCartCheck = await request(SERVER_URL)
        .get('/api/carts/current')
        .query({ sessionId })
        .expect(200)
        .timeout(10000);

      expect(guestCartCheck.body.data.sessionId).toBe(sessionId);
      expect(guestCartCheck.body.data.user).toBeUndefined();
      expect(guestCartCheck.body.data.items).toHaveLength(1);

      // Migrate cart to authenticated user
      const migrationResponse = await request(SERVER_URL)
        .post('/api/carts/migrate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ sessionId })
        .expect(200)
        .timeout(10000);
      expect(migrationResponse.body.data.message).toBe('Cart migrated successfully');
      expect(migrationResponse.body.data.cart).toBeDefined();
      expect(migrationResponse.body.data.cart.user).toBeDefined();
      expect(migrationResponse.body.data.cart.user.id).toBe(testUser.id);
      expect(migrationResponse.body.data.cart.sessionId).toBeNull();

      // Track the migrated cart for cleanup
      createdCarts.push(migrationResponse.body.data.cart);

      // Verify cart is now associated with user
      const userCartResponse = await request(SERVER_URL)
        .get('/api/carts/current')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .timeout(10000);

      expect(userCartResponse.body.data.user.id).toBe(testUser.id);
      expect(userCartResponse.body.data.sessionId).toBeNull();
      expect(userCartResponse.body.data.items).toHaveLength(1);
      expect(userCartResponse.body.data.items[0].quantity).toBe(2);

      // Verify guest cart no longer exists
      await request(SERVER_URL)
        .get('/api/carts/current')
        .query({ sessionId })
        .expect(404)
        .timeout(10000);
    });

    it('should handle migration when user already has a cart', async () => {
      // Create a new session for this test
      const newSessionId = `migration-session-2-${timestamp}`;

      // Clear any existing user cart first
      try {
        const existingCart = await request(SERVER_URL)
          .get('/api/carts/current')
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000);
        
        if (existingCart.status === 200 && existingCart.body.data.items.length > 0) {
          await request(SERVER_URL)
            .post('/api/carts/clear')
            .set('Authorization', `Bearer ${userToken}`)
            .timeout(10000);
        }
      } catch (error) {
        // No existing cart, continue
      }

      // Create guest cart with same product
      const guestCartResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .query({ sessionId: newSessionId })
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 1
        })
        .timeout(10000);

      const guestCart = guestCartResponse.body.data.cart;
      createdCarts.push(guestCart);

      // Create user cart first with same product
      await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          quantity: 3
        })
        .timeout(10000);

      // Attempt migration (should merge carts)
      const migrationResponse = await request(SERVER_URL)
        .post('/api/carts/migrate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ sessionId: newSessionId })
        .expect(200)
        .timeout(10000);

      expect(migrationResponse.body.data.message).toBe('Cart migrated successfully');

      // Track the merged cart for cleanup
      createdCarts.push(migrationResponse.body.data.cart);

      // Verify merged cart has correct quantities
      const userCartResponse = await request(SERVER_URL)
        .get('/api/carts/current')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .timeout(10000);

      // Should have 1 item with merged quantity (3 + 1 = 4)
      expect(userCartResponse.body.data.items).toHaveLength(1);
      expect(userCartResponse.body.data.items[0].quantity).toBe(4);
    });

    it('should return 404 when migrating non-existent guest cart', async () => {
      const nonExistentSessionId = 'non-existent-session';

      await request(SERVER_URL)
        .post('/api/carts/migrate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ sessionId: nonExistentSessionId })
        .expect(404)
        .timeout(10000);
    });
  });

  describe('Cart Validation and Error Handling', () => {
    it('should require session ID for guest users', async () => {
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

    it('should reject adding invalid product to cart for guest user', async () => {
      const sessionId = `validation-session-${timestamp}-${Date.now()}`;

      await request(SERVER_URL)
        .post('/api/carts/items')
        .query({ sessionId })
        .send({
          productListingId: testProductListing.documentId,
          productId: 'non-existent-product-id',
          quantity: 1
        })
        .expect(404)
        .timeout(10000);
    });

    it('should reject adding item with invalid quantity for guest user', async () => {
      const sessionId = `validation-session-2-${timestamp}-${Date.now()}`;

      await request(SERVER_URL)
        .post('/api/carts/items')
        .query({ sessionId })
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
    it('should handle multiple concurrent cart operations for guest user', async () => {
      const baseSessionId = `concurrent-session-${timestamp}-${Date.now()}`;
      const concurrentRequests = 3;
      const promises: any[] = [];

      for (let i = 0; i < concurrentRequests; i++) {
        // Use unique session ID for each concurrent request
        const sessionId = `${baseSessionId}-${i}`;
        promises.push(
          request(SERVER_URL)
            .post('/api/carts/items')
            .query({ sessionId })
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
        // Track carts for cleanup
        if (response.body.data.cart) {
          createdCarts.push(response.body.data.cart);
        }
      });
    });

    it('should handle large cart operations efficiently for guest user', async () => {
      const sessionId = `bulk-session-${timestamp}-${Date.now()}`;
      const startTime = Date.now();

      // Add multiple items to cart
      for (let i = 0; i < 5; i++) {
        const response = await request(SERVER_URL)
          .post('/api/carts/items')
          .query({ sessionId })
          .send({
            productId: testProduct.documentId,
            productListingId: testProductListing.documentId,
            quantity: 1
          })
          .timeout(10000)
          .expect(200);

        // Track cart for cleanup
        if (response.body.data.cart) {
          createdCarts.push(response.body.data.cart);
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});
