/**
 * Payment Test Helpers
 * 
 * Common helper functions for payment integration tests including:
 * - Test data creation utilities
 * - API request helpers
 * - Cleanup utilities
 * - Test setup functions
 */

import request from 'supertest'
import { createTestAddressData } from '../../address/__tests__/test-setup'

export const SERVER_URL = 'http://localhost:1337'

export interface TestContext {
  apiToken: string
  testUser: any
  testUserJwt: string
  testUserAdmin: any
  testUserAdminJwt: string
  testProduct: any
  testProductListing: any
  testCart: any
  testAddress: any
  testCheckoutSession: any
  testOrder: any
  testPaymentMethod: any
  testPayment: any
  timestamp: number
}

export interface TestResources {
  createdPayments: any[]
  createdOrders: any[]
  createdUsers: any[]
  createdProducts: any[]
  createdProductListings: any[]
  createdCarts: any[]
  createdAddresses: any[]
  createdCheckoutSessions: any[]
  createdCartItems: any[]
}

/**
 * Create a new test user
 */
export const createTestUser = async (timestamp: number) => {
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
  return {
    user: userResponse.body.user,
    jwt: userResponse.body.jwt
  }
}

/** login as user */
export const loginAsUser = async (user: any) => {
  const loginResponse = await request(SERVER_URL)
    .post('/api/auth/local')
    .send({
      identifier: user.email,
      password: user.password
    })
    .timeout(10000)

  if (loginResponse.status !== 200) {
    throw new Error(`Failed to login as user: ${loginResponse.status} - ${JSON.stringify(loginResponse.body)}`)
  }

  return loginResponse.body
}

/**
 * Create a test product
 */
export const createTestProduct = async (apiToken: string, timestamp: number) => {
  const productData = {
    name: `Test Product ${timestamp}`,
    brand: `Test Brand ${timestamp}`,
    sku: `TEST-PROD-${timestamp}`,
    inventory: 100,
    status: 'active'
  }

  const productResponse = await request(SERVER_URL)
    .post('/api/products')
    .set('Authorization', `Bearer ${apiToken}`)
    .send({ data: productData })
    .timeout(10000)

  if (productResponse.status !== 200) {
    throw new Error(`Failed to create test product: ${productResponse.status} - ${JSON.stringify(productResponse.body)}`)
  }

  return productResponse.body.data
}

/**
 * Create a test product listing
 */
export const createTestProductListing = async (apiToken: string, productId: string, timestamp: number) => {
  const productListingData = {
    title: `Test Product Listing ${timestamp}`,
    description: 'Test product listing for payment integration tests',
    type: 'single',
    basePrice: 50.00,
    isActive: true,
    product: productId,
    status: 'published'
  }

  const productListingResponse = await request(SERVER_URL)
    .post('/api/product-listings')
    .set('Authorization', `Bearer ${apiToken}`)
    .send({ data: productListingData })
    .timeout(10000)

  if (productListingResponse.status !== 200) {
    throw new Error(`Failed to create test product listing: ${productListingResponse.status} - ${JSON.stringify(productListingResponse.body)}`)
  }

  return productListingResponse.body
}

/**
 * Create test address
 */
export const createTestAddress = async (userJwt: string, timestamp: number, overrides: any = {}) => {
  const addressData = createTestAddressData({
    address1: '123 Test Street',
    city: 'Test City',
    firstName: 'Test',
    lastName: 'User',
    state: 'TS',
    postalCode: '12345',
    country: 'US',
    type: 'shipping',
    isDefault: true,
    ...overrides
  })

  const addressResponse = await request(SERVER_URL)
    .post('/api/addresses')
    .set('Authorization', `Bearer ${userJwt}`)
    .send({ data: addressData })
    .timeout(10000)

  if (addressResponse.status !== 200) {
    throw new Error(`Failed to create test address: ${addressResponse.status} - ${JSON.stringify(addressResponse.body)}`)
  }

  return addressResponse.body.data
}

/**
 * Create guest address with session ID
 */
export const createGuestAddress = async (sessionId: string, timestamp: number, overrides: any = {}) => {
  const addressData = createTestAddressData({
    address1: '123 Guest Street',
    city: 'Guest City',
    firstName: 'Guest',
    lastName: 'User',
    state: 'GS',
    postalCode: '54321',
    country: 'US',
    type: 'shipping',
    isDefault: true,
    ...overrides
  })

  const addressResponse = await request(SERVER_URL)
    .post('/api/addresses')
    .query({ sessionId })
    .send({ data: addressData })
    .timeout(10000)

  if (addressResponse.status !== 200) {
    throw new Error(`Failed to create guest address: ${addressResponse.status}`)
  }

  return addressResponse.body.data
}

/**
 * Add items to cart
 */
export const addItemsToCart = async (userJwt: string, productId: string, productListingId: string, quantity: number = 2, sessionId?: string) => {
  const addItemResponse = await request(SERVER_URL)
    .post('/api/carts/items')
    .set('Authorization', `Bearer ${userJwt}`)
    .query(sessionId ? { sessionId } : {})
    .send({
      productId,
      productListingId,
      quantity
    })
    .timeout(10000)

  if (addItemResponse.status !== 200) {
    throw new Error(`Failed to add item to cart: ${addItemResponse.status} - ${JSON.stringify(addItemResponse.body)}`)
  }

  return {
    cart: addItemResponse.body.data.cart,
    cartItem: addItemResponse.body.data.cartItem
  }
}

/**
 * Create new cart items for tests
 */
export const createNewCartItems = async (userJwt: string, productId: string, productListingId: string, sessionId?: string) => {
  const addItemResponse = await request(SERVER_URL)
    .post('/api/carts/items')
    .set('Authorization', `Bearer ${userJwt}`)
    .query(sessionId ? { sessionId } : {})
    .send({
      productId,
      productListingId,
      quantity: 1
    })
    .timeout(10000)

  if (addItemResponse.status !== 200) {
    throw new Error(`Failed to add item to cart: ${addItemResponse.status} - ${JSON.stringify(addItemResponse.body)}`)
  }

  return addItemResponse.body.data.cartItem
}

/**
 * Initialize default payment methods
 */
export const initializePaymentMethods = async (apiToken: string) => {
  const initializeResponse = await request(SERVER_URL)
    .post('/api/payment-methods/basic/initialize')
    .set('Authorization', `Bearer ${apiToken}`)
    .timeout(10000)

  if (initializeResponse.status !== 200) {
    throw new Error(`Failed to initialize payment methods: ${initializeResponse.status} - ${JSON.stringify(initializeResponse.body)}`)
  }

  return initializeResponse.body.data
}

/**
 * Get payment methods
 */
export const getPaymentMethods = async () => {
  const paymentMethodsResponse = await request(SERVER_URL)
    .get('/api/payment-methods/basic')
    .timeout(10000)

  if (paymentMethodsResponse.status !== 200 || !paymentMethodsResponse.body.data?.length) {
    throw new Error('No payment methods available for testing')
  }

  return paymentMethodsResponse.body.data[0]
}

/**
 * Create checkout session
 */
export const createCheckoutSession = async (userJwt: string, checkoutData: any, sessionId?: string) => {
  const checkoutResponse = await request(SERVER_URL)
    .post('/api/checkout')
    .set('Authorization', `Bearer ${userJwt}`)
    .send(checkoutData)
    .timeout(10000)

  if (checkoutResponse.status !== 200) {
    throw new Error(`Failed to create checkout session: ${checkoutResponse.status} - ${JSON.stringify(checkoutResponse.body)}`)
  }

  return checkoutResponse.body.data
}

/**
 * Complete checkout to create order
 */
export const completeCheckout = async (checkoutSessionId: string, userJwt: string, sessionId?: string) => {
  const completeCheckoutResponse = await request(SERVER_URL)
    .post(`/api/checkout/${checkoutSessionId}/complete`)
    .set('Authorization', `Bearer ${userJwt}`)
    .send(sessionId ? { sessionId } : {})
    .timeout(10000)

  if (completeCheckoutResponse.status !== 200) {
    throw new Error(`Failed to complete checkout: ${completeCheckoutResponse.status} - ${JSON.stringify(completeCheckoutResponse.body)}`)
  }

  return completeCheckoutResponse.body.data
}

/**
 * Create a complete order (checkout + completion)
 */
export const createCompleteOrder = async (userJwt: string, orderData: any, sessionId?: string) => {
  const checkoutSession = await createCheckoutSession(userJwt, orderData, sessionId)
  const order = await completeCheckout(checkoutSession.documentId, userJwt, sessionId)
  return { checkoutSession, order }
}

/**
 * Create payment
 */
export const createPayment = async (orderId: string, paymentData: any, userJwt?: string, sessionId?: string) => {
  const requestBuilder = request(SERVER_URL)
    .post(`/api/payment/${orderId}`)
    .send({ data: paymentData })
    .timeout(10000)

  if (userJwt) {
    requestBuilder.set('Authorization', `Bearer ${userJwt}`)
  }

  if (sessionId) {
    requestBuilder.query({ sessionId })
  }

  const response = await requestBuilder

  if (response.status !== 200) {
    throw new Error(`Failed to create payment: ${response.status} - ${JSON.stringify(response.body)}`)
  }

  return response.body.data
}

/**
 * Confirm payment
 */
export const confirmPayment = async (paymentId: string, confirmationData: any, apiToken: string) => {
  const response = await request(SERVER_URL)
    .post(`/api/payment/${paymentId}/confirm`)
    .set('Authorization', `Bearer ${apiToken}`)
    .send({ data: confirmationData })
    .timeout(10000)

  if (response.status !== 200) {
    throw new Error(`Failed to confirm payment: ${response.status} - ${JSON.stringify(response.body)}`)
  }

  return response.body.data
}

/**
 * Setup complete test environment
 */
export const setupTestEnvironment = async (): Promise<{ context: TestContext, resources: TestResources }> => {
  const timestamp = Date.now()
  const resources: TestResources = {
    createdPayments: [],
    createdOrders: [],
    createdUsers: [],
    createdProducts: [],
    createdProductListings: [],
    createdCarts: [],
    createdAddresses: [],
    createdCheckoutSessions: [],
    createdCartItems: []
  }

  // Get admin token
  const apiToken = process.env.STRAPI_API_TOKEN as string
  if (!apiToken) {
    throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.')
  }

  // Create test user
  const { user: testUser, jwt: testUserJwt } = await createTestUser(timestamp)
  resources.createdUsers.push(testUser)
  // Create test user
  const { user: testUserAdmin, jwt: testUserAdminJwt } = await loginAsUser({
    email: 'admin-user@test.com',
    password: 'Admin123'
  })
  resources.createdUsers.push(testUser)

  // Create test product
  const testProduct = await createTestProduct(apiToken, timestamp)
  resources.createdProducts.push(testProduct)

  // Create test product listing
  const testProductListing = await createTestProductListing(apiToken, testProduct.documentId, timestamp)
  resources.createdProductListings.push(testProductListing)

  // Add items to cart
  const { cart: testCart, cartItem } = await addItemsToCart(testUserJwt, testProduct.documentId, testProductListing.documentId, 2)
  resources.createdCarts.push(testCart)
  resources.createdCartItems.push(cartItem)

  // Create test address
  const testAddress = await createTestAddress(testUserJwt, timestamp)
  resources.createdAddresses.push(testAddress)

  // Initialize payment methods
  await initializePaymentMethods(apiToken)

  // Get payment method
  const testPaymentMethod = await getPaymentMethods()

  // Create checkout session
  const checkoutData = {
    shippingAddress: testAddress.documentId,
    billingAddress: testAddress.documentId,
    shippingMethod: 'standard',
    paymentMethod: testPaymentMethod.documentId,
    cartItems: [cartItem.documentId]
  }

  const testCheckoutSession = await createCheckoutSession(testUserJwt, checkoutData)
  resources.createdCheckoutSessions.push(testCheckoutSession)

  // Complete checkout to create order
  const testOrder = await completeCheckout(testCheckoutSession.documentId, testUserJwt)
  resources.createdOrders.push(testOrder)

  const context: TestContext = {
    apiToken,
    testUser,
    testUserJwt,
    testUserAdmin,
    testUserAdminJwt,
    testProduct,
    testProductListing,
    testCart,
    testAddress,
    testCheckoutSession,
    testOrder,
    testPaymentMethod,
    testPayment: null,
    timestamp
  }

  return { context, resources }
}

/**
 * Cleanup test resources
 */
export const cleanupTestResources = async (resources: TestResources, apiToken: string) => {
  // Clean up created addresses
  for (const address of resources.createdAddresses) {
    try {
      await request(SERVER_URL)
        .delete(`/api/addresses/${address.documentId}`)
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(200)
        .timeout(5000)
    } catch (error) {
      console.warn(`Failed to cleanup address ${address.documentId}:`, error)
    }
  }

  // Clean up created cart items
  for (const cartItem of resources.createdCartItems) {
    try {
      await request(SERVER_URL)
        .delete(`/api/carts/items/${cartItem.documentId}`)
        .set('Authorization', `Bearer ${apiToken}`)
        .timeout(5000)
    } catch (error) {
      console.warn(`Failed to cleanup cart item ${cartItem.documentId}:`, error)
    }
  }

  // Clean up created carts
  for (const cart of resources.createdCarts) {
    try {
      await request(SERVER_URL)
        .delete(`/api/carts/${cart.documentId}`)
        .set('Authorization', `Bearer ${apiToken}`)
        .timeout(5000)
    } catch (error) {
      console.warn(`Failed to cleanup cart ${cart.documentId}:`, error)
    }
  }

  // Clean up created product listings
  for (const productListing of resources.createdProductListings) {
    try {
      await request(SERVER_URL)
        .delete(`/api/product-listings/${productListing.documentId}`)
        .set('Authorization', `Bearer ${apiToken}`)
        .timeout(5000)
    } catch (error) {
      console.warn(`Failed to cleanup product listing ${productListing.documentId}:`, error)
    }
  }

  // Clean up created products
  for (const product of resources.createdProducts) {
    try {
      await request(SERVER_URL)
        .delete(`/api/products/${product.documentId}`)
        .set('Authorization', `Bearer ${apiToken}`)
        .timeout(5000)
    } catch (error) {
      console.warn(`Failed to cleanup product ${product.documentId}:`, error)
    }
  }

  // Clean up created users
  for (const user of resources.createdUsers) {
    try {
      await request(SERVER_URL)
        .delete(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${apiToken}`)
        .timeout(5000)
    } catch (error) {
      console.warn(`Failed to cleanup user ${user.documentId}:`, error)
    }
  }
}

/**
 * Create a new order for testing
 */
export const createNewOrderForTest = async (
  context: TestContext, 
  resources: TestResources,
  sessionId?: string
) => {
  const newCartItem = await createNewCartItems(
    context.testUserJwt, 
    context.testProduct.documentId, 
    context.testProductListing.documentId,
    sessionId
  )
  resources.createdCartItems.push(newCartItem)

  const newOrderData = {
    shippingAddress: context.testAddress.documentId,
    billingAddress: context.testAddress.documentId,
    shippingMethod: 'standard',
    paymentMethod: context.testPaymentMethod.documentId,
    cartItems: [newCartItem.documentId]
  }

  const { checkoutSession, order } = await createCompleteOrder(context.testUserJwt, newOrderData, sessionId)
  resources.createdCheckoutSessions.push(checkoutSession)
  resources.createdOrders.push(order)

  return { checkoutSession, order, cartItem: newCartItem }
}
