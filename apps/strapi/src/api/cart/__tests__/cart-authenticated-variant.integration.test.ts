/**
 * Cart Integration Tests - Authenticated Users with Product Listing Variants
 * 
 * Comprehensive integration tests for Cart module covering authenticated user scenarios with variants:
 * - Cart creation with product listing variants and database verification
 * - Cart retrieval and session management with variants
 * - Cart updates and validation with variants
 * - Cart deletion and cleanup with variants
 * - Cart persistence across sessions with variants
 * - Cart recovery and restoration with variants
 * - Cart expiration and cleanup with variants
 * - Cart user association and management with variants
 * - Variant-specific pricing and calculations
 * - Option values and variant relationships in cart
 */

import request from 'supertest';

describe('Cart Integration Tests - Authenticated Users with Product Listing Variants', () => {
  const SERVER_URL = 'http://localhost:1337';
  let adminToken: string;
  let testUser: any;
  let testProduct: any;
  let testProduct2: any;
  let testCategory: any;
  let testProductListing: any;
  let testOptionGroup: any;
  let testOptionValue: any;
  let testOptionValue2: any;
  let testVariant: any;
  let testVariant2: any;
  
  // Track created entities for cleanup
  const createdEntities: {
    products: string[];
    categories: string[];
    productListings: string[];
    optionGroups: string[];
    optionValues: string[];
    variants: string[];
    users: any[];
  } = {
    products: [],
    categories: [],
    productListings: [],
    optionGroups: [],
    optionValues: [],
    variants: [],
    users: []
  };

  // Generate unique test data with timestamp
  const timestamp = Date.now();

  // Helper function to track created entities
  const trackEntity = (type: keyof typeof createdEntities, documentId: string | any) => {
    if (type === 'users') {
      createdEntities[type].push(documentId);
    } else {
      (createdEntities[type] as string[]).push(documentId);
    }
  };

  // Helper function to clean up entities
  const cleanupEntity = async (type: string, documentId: string) => {
    try {
      await request(SERVER_URL)
        .delete(`/api/${type}/${documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
    } catch (error) {
      console.warn(`Failed to cleanup ${type} ${documentId}:`, error);
    }
  };

  beforeAll(async () => {
    // Get admin token for authenticated requests
    adminToken = process.env.STRAPI_API_TOKEN as string;

    if (!adminToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }

    // Create test user for cart operations
    const userData = {
      username: `cartuser${timestamp}`,
      email: `cartuser${timestamp}@example.com`,
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
    trackEntity('users', testUser);

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
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: productData })
      .timeout(10000);

    if (productResponse.status !== 200) {
      throw new Error(`Failed to create test product: ${productResponse.status} - ${JSON.stringify(productResponse.body)}`);
    }

    testProduct = productResponse.body.data;
    trackEntity('products', testProduct.documentId);
    const productData2 = {
      name: `Test Product2 ${timestamp}`,
      brand: `Test Brand2 ${timestamp}`,
      sku: `TEST-PROD-2-${timestamp}`,
      inventory: 100,
      status: 'active'
    };

    const productResponse2 = await request(SERVER_URL)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: productData2 })
      .timeout(10000);

    if (productResponse2.status !== 200) {
      throw new Error(`Failed to create test product: ${productResponse.status} - ${JSON.stringify(productResponse.body)}`);
    }

    testProduct2 = productResponse2.body.data;
    trackEntity('products', testProduct2.documentId);

    // Create test category for product listing
    const categoryData = {
      name: `Test Category ${timestamp}`,
      slug: `test-category-${timestamp}`,
      description: 'Test category for cart variant integration tests',
      isActive: true,
      status: 'published'
    };

    const categoryResponse = await request(SERVER_URL)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: categoryData })
      .timeout(10000);

    if (categoryResponse.status !== 200) {
      throw new Error(`Failed to create test category: ${categoryResponse.status} - ${JSON.stringify(categoryResponse.body)}`);
    }

    testCategory = categoryResponse.body.data;
    trackEntity('categories', testCategory.documentId);

    
    // Create test option group
    const optionGroupData = {
      name: `Test Option Group ${timestamp}`,
      displayName: 'Size',
      type: 'select',
      isActive: true,
      status: 'published'
    };

    const optionGroupResponse = await request(SERVER_URL)
      .post('/api/option-groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: optionGroupData })
      .timeout(10000);

    if (optionGroupResponse.status !== 201) {
      throw new Error(`Failed to create test option group: ${optionGroupResponse.status} - ${JSON.stringify(optionGroupResponse.body)}`);
    }

    testOptionGroup = optionGroupResponse.body.data;
    trackEntity('optionGroups', testOptionGroup.documentId);

    // Create test option value
    const optionValueData = {
      value: `Test Option Value ${timestamp}`,
      displayName: 'Large',
      optionGroup: testOptionGroup.documentId,
      isActive: true,
      status: 'published'
    };
    const optionValueData2 = {
      value: `Test Option Value 2 ${timestamp}`,
      displayName: 'Medium',
      optionGroup: testOptionGroup.documentId,
      isActive: true,
      status: 'published'
    };

    const optionValueResponse = await request(SERVER_URL)
      .post('/api/option-values')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: optionValueData })
      .timeout(10000);
    const optionValueResponse2 = await request(SERVER_URL)
      .post('/api/option-values')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: optionValueData2 })
      .timeout(10000);

    if (optionValueResponse.status !== 200 || optionValueResponse2.status !== 200) {
      throw new Error(`Failed to create test option value: ${optionValueResponse.status} - ${JSON.stringify(optionValueResponse.body)}`);
    }

    testOptionValue = optionValueResponse.body.data;
    testOptionValue2 = optionValueResponse2.body.data;
    trackEntity('optionValues', testOptionValue.documentId);
    trackEntity('optionValues', testOptionValue2.documentId);

    // Create test product listing for variants
    const productListingData = {
      title: `Test Product Listing ${timestamp}`,
      description: 'Test product listing for cart variant integration tests',
      type: 'variant',
      basePrice: 29.99,
      isActive: true,
      product: testProduct.documentId,
      category: testCategory.documentId,
      optionGroups: [testOptionGroup.documentId],
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
    trackEntity('productListings', testProductListing.documentId);

    // Create test variant for cart operations
    const variantData = {
      basePrice: 99.99,
      discountPrice: 79.99,
      product: testProduct.documentId,
      productListing: testProductListing.documentId,
      optionValue: testOptionValue.documentId,
      status: 'published'
    };
   
    const variantData2 = {
      basePrice: 99.99,
      discountPrice: 79.99,
      product: testProduct2.documentId,
      productListing: testProductListing.documentId,
      optionValue: testOptionValue2.documentId,
      status: 'published'
    };
    
    const variantResponse2 = await request(SERVER_URL)
      .post('/api/product-listing-variants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: variantData2 })
      .timeout(10000);

    if (variantResponse2.status !== 200) {
      throw new Error(`Failed to create test variant: ${variantResponse2.status} - ${JSON.stringify(variantResponse2.body)}`);
    }

    testVariant2 = variantResponse2.body.data;
    trackEntity('variants', testVariant2.documentId);

    const variantResponse = await request(SERVER_URL)
      .post('/api/product-listing-variants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: variantData })
      .timeout(10000);

    if (variantResponse.status !== 200) {
      throw new Error(`Failed to create test variant: ${variantResponse.status} - ${JSON.stringify(variantResponse.body)}`);
    }

    testVariant = variantResponse.body.data;
    trackEntity('variants', testVariant.documentId);
  });

  afterAll(async () => {
    // Clean up in reverse dependency order
    const cleanupOrder = [
      { type: 'product-listing-variants', ids: createdEntities.variants },
      { type: 'option-values', ids: createdEntities.optionValues },
      { type: 'option-groups', ids: createdEntities.optionGroups },
      { type: 'product-listings', ids: createdEntities.productListings },
      { type: 'products', ids: createdEntities.products },
      { type: 'categories', ids: createdEntities.categories }
    ];

    for (const { type, ids } of cleanupOrder) {
      if (ids.length > 0) {
        const cleanupPromises = ids.map(id => cleanupEntity(type, id));
        await Promise.all(cleanupPromises);
      }
    }

    // Clean up users
    for (const user of createdEntities.users) {
      if (user?.id) {
        try {
          await request(SERVER_URL)
            .delete(`/api/users/${user.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .timeout(10000);
        } catch (error) {
          console.warn(`Failed to clean up user ${user.id}:`, error.message);
        }
      }
    }
  });

  describe('Cart Creation with Variants and Database Verification', () => {
    it('should create cart with variant and verify database record', async () => {
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

      // Add variant to cart (this should create a cart if one doesn't exist)
      const addItemResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          variantId: testVariant.documentId,
          quantity: 2
        })
        .timeout(10000);
      expect(addItemResponse.status).toBe(200);
      expect(addItemResponse.body.data.cart).toBeDefined();
      expect(addItemResponse.body.data.cartItem).toBeDefined();
      expect(addItemResponse.body.data.cartItem.variant).toBeDefined();
      expect(addItemResponse.body.data.cartItem.variant.documentId).toBe(testVariant.documentId);
      expect(addItemResponse.body.data.cart.user).toBeDefined();
      expect(addItemResponse.body.data.cart.user.id).toBe(testUser.id);

      // Verify cart was created in database
      const cartResponse = await request(SERVER_URL)
        .get('/api/carts/current')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .timeout(10000);
      
      expect(cartResponse.body.data.documentId).toBe(addItemResponse.body.data.cart.documentId);
      expect(cartResponse.body.data.user.id).toBe(testUser.id);
      expect(cartResponse.body.data.items).toHaveLength(1);
      expect(cartResponse.body.data.items[0].variant.documentId).toBe(testVariant.documentId);
      expect(cartResponse.body.data.subtotal).toBeGreaterThan(0);
      expect(cartResponse.body.data.total).toBeGreaterThan(0);
    });
  });

  describe('Cart Retrieval and Session Management with Variants', () => {
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
      // clear cart
      await request(SERVER_URL)
        .post('/api/carts/clear')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);
    });

    it('should retrieve cart with variants for authenticated user', async () => {
      // Ensure user has a cart with variant items
      await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          variantId: testVariant.documentId,
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
      expect(response.body.data.items[0].variant).toBeDefined();
      expect(response.body.data.items[0].variant.documentId).toBe(testVariant.documentId);
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
      trackEntity('users', newUser);

      const newUserToken = newUserResponse.body.jwt;

      await request(SERVER_URL)
        .get('/api/carts/current')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(404)
        .timeout(10000);
    });
  });

  describe('Cart Updates and Validation with Variants', () => {
    let userToken: string;
    let cartItem: any;

    beforeAll(async () => {
      // Authenticate user and create cart with variant item
      const loginResponse = await request(SERVER_URL)
        .post('/api/auth/local')
        .send({
          identifier: testUser.email,
          password: 'TestPassword123!'
        })
        .timeout(10000);

      userToken = loginResponse.body.jwt;
      // clear cart
      await request(SERVER_URL)
        .post('/api/carts/clear')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);
      // Add variant to cart
      const addItemResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          variantId: testVariant.documentId,
          quantity: 2
        })
        .timeout(10000);
      cartItem = addItemResponse.body.data.cartItem;
    });

    it('should update variant quantity in cart', async () => {
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

    it('should reject invalid quantity updates for variants', async () => {
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
      trackEntity('users', user2);

      const user2Token = user2Response.body.jwt;

      // User 2 creates a cart with variant item
      const user2CartResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          variantId: testVariant.documentId,
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

  describe('Cart Item Management with Variants', () => {
    let userToken: string;
    let cartItem: any;

    beforeAll(async () => {
      // Authenticate user and create cart with variant item
      const loginResponse = await request(SERVER_URL)
        .post('/api/auth/local')
        .send({
          identifier: testUser.email,
          password: 'TestPassword123!'
        })
        .timeout(10000);

      userToken = loginResponse.body.jwt;
      // clear cart
      await request(SERVER_URL)
        .post('/api/carts/clear')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      // Add variant to cart
      const addItemResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          variantId: testVariant.documentId,
          quantity: 3
        })
        .timeout(10000);

      cartItem = addItemResponse.body.data.cartItem;
    });

    it('should remove variant from cart and update totals', async () => {
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
      trackEntity('users', user2);

      const user2Token = user2Response.body.jwt;

      // User 2 creates a cart with variant item
      const user2CartResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          variantId: testVariant.documentId,
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

    it('should clear all cart items including variants', async () => {
      // Add multiple variant items to cart
      const addItemResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          variantId: testVariant.documentId,
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

  describe('Cart Calculation and Totals with Variants', () => {
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
      // clear cart
      await request(SERVER_URL)
        .post('/api/carts/clear')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);
    });

    it('should calculate cart totals correctly with variants', async () => {
      // Add variant to cart
      await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          variantId: testVariant.documentId,
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

  describe('Cart Validation and Error Handling with Variants', () => {
    it('should reject adding invalid variant to cart', async () => {
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
          productId: testProduct.documentId,
          variantId: 'non-existent-variant-id',
          quantity: 1
        })
        .timeout(10000);
      
      expect(response.status).toBe(400);
    });

    it('should reject adding variant with invalid quantity', async () => {
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
          variantId: testVariant.documentId,
          quantity: 0
        })
        .expect(400)
        .timeout(10000);
    });
  });



  describe('Variant-Specific Cart Operations', () => {
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
      // clear cart
      await request(SERVER_URL)
        .post('/api/carts/clear')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);
    });

    it('should handle multiple variants in cart', async () => {
      // add first variant to cart
      const addFirstVariantResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          variantId: testVariant.documentId,
          quantity: 1
        })
        .timeout(10000);

      expect(addFirstVariantResponse.status).toBe(200);
      expect(addFirstVariantResponse.body.data.cartItem.variant.documentId).toBe(testVariant.documentId);

      // Add second variant to cart
      const addSecondVariantResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          variantId: testVariant2.documentId,
          quantity: 1
        })
        .timeout(10000);

      expect(addSecondVariantResponse.status).toBe(200);
      expect(addSecondVariantResponse.body.data.cartItem.variant.documentId).toBe(testVariant2.documentId);

      // Verify both variants are in cart
      const cartResponse = await request(SERVER_URL)
        .get('/api/carts/current')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .timeout(10000);

      expect(cartResponse.body.data.items).toHaveLength(2);
      expect(cartResponse.body.data.subtotal).toBeGreaterThan(0);
      expect(cartResponse.body.data.total).toBeGreaterThan(0);
    });

    it('should calculate variant pricing correctly in cart', async () => {
      // Clear existing cart
      await request(SERVER_URL)
        .post('/api/carts/clear')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      // Add variant with specific pricing
      const addItemResponse = await request(SERVER_URL)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct.documentId,
          productListingId: testProductListing.documentId,
          variantId: testVariant.documentId,
          quantity: 3
        })
        .timeout(10000);

      expect(addItemResponse.status).toBe(200);
      
      const cartItem = addItemResponse.body.data.cartItem;
      const expectedPrice = testVariant.discountPrice || testVariant.basePrice;
      const expectedTotal = expectedPrice * 3;

      expect(cartItem.price).toBe(expectedPrice);
      expect(cartItem.total).toBeCloseTo(expectedTotal, 2);
      expect(addItemResponse.body.data.cart.calculation.subtotal).toBeCloseTo(expectedTotal, 2);
    });

    it('should handle variant option values in cart', async () => {
      const cartResponse = await request(SERVER_URL)
        .get('/api/carts/current')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .timeout(10000);

      const cartItem = cartResponse.body.data.items[0];
      expect(cartItem.variant).toBeDefined();
      expect(cartItem.selectedOptions).toBeDefined();
      expect(cartItem.selectedOptions.documentId).toBe(testOptionValue.documentId);
    });
  });
});
