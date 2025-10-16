/**
 * Checkout Integration Tests - Authenticated Users
 * 
 * Comprehensive integration tests for Checkout module covering authenticated user scenarios:
 * - Checkout creation with database verification
 * - Checkout validation and updates
 * - Checkout completion with order creation
 * - Checkout abandonment and cleanup
 * - Address and payment method validation
 * - Cart items validation and processing
 * - Order creation and database transactions
 * - Error handling and edge cases
 */

import request from 'supertest';
import { createTestAddressData } from '../../address/__tests__/test-setup';

describe('Checkout Integration Tests - Authenticated Users', () => {
    const SERVER_URL = 'http://localhost:1337';
    let apiToken: string;
    let testUser: any;
    let testUserToken: string;
    let testProduct: any;
    let testProductListing: any;
    let testCart: any;
    let testAddress: any;
    let testCheckout: any;

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

        // Create test user for checkout operations
        const userData = {
            username: `testuser${timestamp}`,
            email: `testuser${timestamp}@example.com`,
            password: 'TestPassword123!',
        };

        const userResponse = await request(SERVER_URL)
            .post('/api/auth/local/register')
            .send(userData)
            .timeout(10000);
        testUserToken = userResponse.body.jwt;

        if (userResponse.status !== 200) {
            throw new Error(`Failed to create test user: ${userResponse.status} - ${JSON.stringify(userResponse.body)}`);
        }

        testUser = userResponse.body.user;
        createdUsers.push(testUser);

        // Create test product for checkout operations
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

        // Create test product listing for checkout operations
        const productListingData = {
            title: `Test Product Listing ${timestamp}`,
            description: 'Test product listing for checkout integration tests',
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

        // Create test address for checkout operations
        const addressData = createTestAddressData({
            address1: '123 Test Street',
            city: 'Test City',
            firstName: 'Test',
            lastName: 'User',
            state: 'TS',
            postalCode: '12345',
            country: 'US',
        });
        const addressResponse = await request(SERVER_URL)
            .post('/api/addresses')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ data: addressData })
            .timeout(10000);

        if (addressResponse.status !== 200) {
            throw new Error(`Failed to create test address: ${addressResponse.status} - ${JSON.stringify(addressResponse.body)}`);
        }

        testAddress = addressResponse.body.data;

      
    });

    afterAll(async () => {

        // Clean up test cart
        if (testCart?.documentId) {
            try {
                await request(SERVER_URL)
                    .delete(`/api/carts/${testCart.documentId}`)
                    .set('Authorization', `Bearer ${apiToken}`)
                    .expect(200)
                    .timeout(10000);
            } catch (error) {
                console.warn('Failed to clean up test cart:', error.message);
            }
        }

        // Clean up test address
        if (testAddress?.documentId) {
            try {
                await request(SERVER_URL)
                    .delete(`/api/addresses/${testAddress.documentId}`)
                    .set('Authorization', `Bearer ${testUserToken}`)
                    .expect(200)
                    .timeout(10000);
            } catch (error) {
                console.warn('Failed to clean up test address:', error.message);
            }
        }

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
    });

    describe('Checkout Creation and Database Verification', () => {
        let userToken: string;
        let cartItem: any;

        beforeAll(async () => {
            // Authenticate the test user to get their JWT token
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

            userToken = loginResponse.body.jwt;

            // Create cart with items for checkout
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
            testCart = addItemResponse.body.data.cart;
            cartItem = addItemResponse.body.data.cartItem;
        });

        it('should create checkout for authenticated user and verify database record', async () => {
            const checkoutData = {
                shippingAddress: testAddress.documentId,
                billingAddress: testAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [cartItem.documentId]
            };

            const response = await request(SERVER_URL)
                .post('/api/checkout')
                .set('Authorization', `Bearer ${userToken}`)
                .send(checkoutData)
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.documentId).toBeDefined();
            expect(response.body.data.user.id).toBe(testUser.id);
            expect(response.body.data.status).toBe('active');
            expect(response.body.data.shippingAddress).toBeDefined();
            expect(response.body.data.billingAddress).toBeDefined();
            expect(response.body.meta.message).toBe('Checkout created successfully');

            // Store checkout for cleanup
            testCheckout = response.body.data;
        });

        it('should reject checkout creation without authentication', async () => {
            const checkoutData = {
                shippingAddress: testAddress.documentId,
                billingAddress: testAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [cartItem.documentId]
            };

            await request(SERVER_URL)
                .post('/api/checkout')
                .send(checkoutData)
                .expect(401)
                .timeout(10000);
        });

        it('should reject checkout creation with invalid data', async () => {
            const invalidCheckoutData = {
                shippingAddress: 'non-existent-address-id',
                billingAddress: testAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [cartItem.documentId]
            };

            await request(SERVER_URL)
                .post('/api/checkout')
                .set('Authorization', `Bearer ${userToken}`)
                .send(invalidCheckoutData)
                .expect(400)
                .timeout(10000);
        });

        it('should reject checkout creation with empty cart', async () => {
            const checkoutData = {
                shippingAddress: testAddress.documentId,
                billingAddress: testAddress.documentId,
                shippingMethod: 'standard',
                cartItems: []
            };

            await request(SERVER_URL)
                .post('/api/checkout')
                .set('Authorization', `Bearer ${userToken}`)
                .send(checkoutData)
                .expect(400)
                .timeout(10000);
        });
    });

    describe('Checkout Validation and Updates', () => {
        let userToken: string;
        let checkout: any;

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

            // Create checkout for validation tests
            const checkoutData = {
                shippingAddress: testAddress.documentId,
                billingAddress: testAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [testCart.items[0].documentId]
            };

            const createResponse = await request(SERVER_URL)
                .post('/api/checkout')
                .set('Authorization', `Bearer ${userToken}`)
                .send(checkoutData)
                .timeout(10000);

            checkout = createResponse.body.data;
        });

        it('should validate checkout successfully', async () => {
            const validationData = {
                shippingAddress: testAddress.documentId,
                billingAddress: testAddress.documentId,
                shippingMethod: 'express',
                cartItems: [testCart.items[0].documentId]
            };

            const response = await request(SERVER_URL)
                .post(`/api/checkout/${checkout.documentId}/validate`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(validationData)
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.documentId).toBe(checkout.documentId);
            expect(response.body.data.shippingMethod).toBe('express');
            expect(response.body.meta.message).toBe('Checkout validated successfully');
        });

        it('should reject validation for non-existent checkout', async () => {
            const validationData = {
                shippingAddress: testAddress.documentId,
                billingAddress: testAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [testCart.items[0].documentId]
            };

            await request(SERVER_URL)
                .post('/api/checkout/non-existent-document-id/validate')
                .set('Authorization', `Bearer ${userToken}`)
                .send(validationData)
                .expect(404)
                .timeout(10000);
        });

        it('should reject validation for inactive checkout', async () => {
            // First abandon the checkout
            await request(SERVER_URL)
                .post(`/api/checkout/${checkout.documentId}/abandon`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200)
                .timeout(10000);

            const validationData = {
                shippingAddress: testAddress.documentId,
                billingAddress: testAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [testCart.items[0].documentId]
            };

            await request(SERVER_URL)
                .post(`/api/checkout/${checkout.documentId}/validate`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(validationData)
                .expect(400)
                .timeout(10000);
        });
    });

    describe('Checkout Completion and Order Creation', () => {
        let userToken: string;
        let checkout: any;

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

            // Create fresh checkout for completion tests
            const checkoutData = {
                shippingAddress: testAddress.documentId,
                billingAddress: testAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [testCart.items[0].documentId]
            };

            const createResponse = await request(SERVER_URL)
                .post('/api/checkout')
                .set('Authorization', `Bearer ${userToken}`)
                .send(checkoutData)
                .timeout(10000);

            checkout = createResponse.body.data;
        });

        it('should complete checkout and create order successfully', async () => {
            // Verify cart has items before checkout completion
            const cartBeforeResponse = await request(SERVER_URL)
                .get('/api/carts/current')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200)
                .timeout(10000);

            expect(cartBeforeResponse.body.data.items).toBeDefined();
            expect(cartBeforeResponse.body.data.items.length).toBeGreaterThan(0);

            const response = await request(SERVER_URL)
                .post(`/api/checkout/${checkout.documentId}/complete`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.orderNumber).toBeDefined();
            expect(response.body.data.status).toBe('pending');
            expect(response.body.data.user.id).toBe(testUser.id);
            expect(response.body.data.subtotal).toBeGreaterThan(0);
            expect(response.body.data.total).toBeGreaterThan(0);
            expect(response.body.data.items).toBeDefined();
            expect(response.body.data.items.length).toBeGreaterThan(0);
            expect(response.body.meta.message).toBe('Checkout completed successfully');
            expect(response.body.data.checkout.status).toBe('completed');

            // Verify cart items are deleted and not showing in cart API after checkout completion
            const cartAfterResponse = await request(SERVER_URL)
                .get('/api/carts/current')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200)
                .timeout(10000);
            expect(cartAfterResponse.body.data.items).toBeDefined();
            expect(cartAfterResponse.body.data.items).toHaveLength(0);
            expect(cartAfterResponse.body.data.subtotal).toBe(0);
            expect(cartAfterResponse.body.data.total).toBe(0);
        });

        it('should reject completion for non-existent checkout', async () => {
            await request(SERVER_URL)
                .post('/api/checkout/non-existent-document-id/complete')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(404)
                .timeout(10000);
        });

        it('should reject completion for inactive checkout', async () => {
            // Create fresh cart item for this test
            const addItemResponse = await request(SERVER_URL)
                .post('/api/carts/items')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    productId: testProduct.documentId,
                    productListingId: testProductListing.documentId,
                    quantity: 1
                })
                .timeout(10000);

            expect(addItemResponse.status).toBe(200);
            const cartItem = addItemResponse.body.data.cartItem;

            // Create and abandon a checkout
            const checkoutData = {  
                shippingAddress: testAddress.documentId,
                billingAddress: testAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [cartItem.documentId]
            };

            const createResponse = await request(SERVER_URL)
                .post('/api/checkout')
                .set('Authorization', `Bearer ${userToken}`)
                .send(checkoutData)
                .timeout(10000);
            
            expect(createResponse.status).toBe(200);
            expect(createResponse.body.data).toBeDefined();
            expect(createResponse.body.data.documentId).toBeDefined();
            
            const abandonedCheckout = createResponse.body.data;

            await request(SERVER_URL)
                .post(`/api/checkout/${abandonedCheckout.documentId}/abandon`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200)
                .timeout(10000);

            await request(SERVER_URL)
                .post(`/api/checkout/${abandonedCheckout.documentId}/complete`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(400)
                .timeout(10000);
        });

    });

    describe('Checkout Abandonment and Cleanup', () => {
        let userToken: string;
        let checkout: any;
        let cartItem: any;
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
            
            // Always add a fresh item to cart for this test
            const addItemResponse = await request(SERVER_URL)
                .post('/api/carts/items')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    productId: testProduct.documentId,
                    productListingId: testProductListing.documentId,
                    quantity: 1
                })
                .timeout(10000);
            
            expect(addItemResponse.status).toBe(200);
            cartItem = addItemResponse.body.data.cartItem;

            // Create checkout for abandonment tests
            const checkoutData = {
                shippingAddress: testAddress.documentId,
                billingAddress: testAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [cartItem.documentId]
            };

            const createResponse = await request(SERVER_URL)
                .post('/api/checkout')
                .set('Authorization', `Bearer ${userToken}`)
                .send(checkoutData)
                .timeout(10000);

            expect(createResponse.status).toBe(200);
            checkout = createResponse.body.data;
        });

        it('should abandon checkout successfully', async () => {
            // Verify cart has items before abandonment
            const cartBeforeResponse = await request(SERVER_URL)
                .get('/api/carts/current')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200)
                .timeout(10000);

            expect(cartBeforeResponse.body.data.items).toBeDefined();
            expect(cartBeforeResponse.body.data.items.length).toBeGreaterThan(0);
            const originalItemCount = cartBeforeResponse.body.data.items.length;

            const response = await request(SERVER_URL)
                .post(`/api/checkout/${checkout.documentId}/abandon`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.documentId).toBe(checkout.documentId);
            expect(response.body.data.status).toBe('abandoned');
            expect(response.body.meta.message).toBe('Checkout abandoned successfully');

            // Verify cart items are preserved after abandonment (not deleted)
            const cartAfterResponse = await request(SERVER_URL)
                .get('/api/carts/current')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200)
                .timeout(10000);

            expect(cartAfterResponse.body.data.items).toBeDefined();
            expect(cartAfterResponse.body.data.items.length).toBe(originalItemCount);
            expect(cartAfterResponse.body.data.subtotal).toBeGreaterThan(0);
            expect(cartAfterResponse.body.data.total).toBeGreaterThan(0);
        });

        it('should reject abandonment for non-existent checkout', async () => {
            await request(SERVER_URL)
                .post('/api/checkout/non-existent-document-id/abandon')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(404)
                .timeout(10000);
        });

        it('should reject abandonment for already completed checkout', async () => {
            // Create fresh cart item for this test
            const addItemResponse = await request(SERVER_URL)
                .post('/api/carts/items')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    productId: testProduct.documentId,
                    productListingId: testProductListing.documentId,
                    quantity: 1
                })
                .timeout(10000);

            expect(addItemResponse.status).toBe(200);
            const cartItem = addItemResponse.body.data.cartItem;

            // Create and complete a checkout
            const checkoutData = {
                shippingAddress: testAddress.documentId,
                billingAddress: testAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [cartItem.documentId]
            };

            const createResponse = await request(SERVER_URL)
                .post('/api/checkout')
                .set('Authorization', `Bearer ${userToken}`)
                .send(checkoutData)
                .timeout(10000);

            expect(createResponse.status).toBe(200);
            expect(createResponse.body.data).toBeDefined();
            expect(createResponse.body.data.documentId).toBeDefined();
            
            const completedCheckout = createResponse.body.data;

            await request(SERVER_URL)
                .post(`/api/checkout/${completedCheckout.documentId}/complete`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200)
                .timeout(10000);

            await request(SERVER_URL)
                .post(`/api/checkout/${completedCheckout.documentId}/abandon`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(400)
                .timeout(10000);
        });
    });

    describe('Checkout Validation and Error Handling', () => {
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

        it('should reject checkout with invalid address', async () => {
            const checkoutData = {
                shippingAddress: 'non-existent-address-id',
                billingAddress: testAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [testCart.items[0].documentId]
            };

            await request(SERVER_URL)
                .post('/api/checkout')
                .set('Authorization', `Bearer ${userToken}`)
                .send(checkoutData)
                .expect(400)
                .timeout(10000);
        });

        it('should reject checkout with invalid cart items', async () => {
            const checkoutData = {
                shippingAddress: testAddress.documentId,
                billingAddress: testAddress.documentId,
                shippingMethod: 'standard',
                cartItems: ['non-existent-cart-item-id']
            };

            await request(SERVER_URL)
                .post('/api/checkout')
                .set('Authorization', `Bearer ${userToken}`)
                .send(checkoutData)
                .expect(400)
                .timeout(10000);
        });

        it('should reject checkout with other user\'s cart items', async () => {
            // Create a second user and their cart
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

            // User 1 should not be able to use User 2's cart items
            const checkoutData = {
                shippingAddress: testAddress.documentId,
                billingAddress: testAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [user2CartItemId]
            };

            await request(SERVER_URL)
                .post('/api/checkout')
                .set('Authorization', `Bearer ${userToken}`)
                .send(checkoutData)
                .expect(400)
                .timeout(10000);
        });
    });

    describe('Checkout Performance and Concurrent Operations', () => {
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

        it('should handle multiple concurrent checkout operations', async () => {
            const concurrentRequests = 3;
            const promises: any[] = [];

            for (let i = 0; i < concurrentRequests; i++) {
                // Create fresh cart items for each concurrent request
                const addItemResponse = await request(SERVER_URL)
                    .post('/api/carts/items')
                    .set('Authorization', `Bearer ${userToken}`)
                    .send({
                        productId: testProduct.documentId,
                        productListingId: testProductListing.documentId,
                        quantity: 1
                    })
                    .timeout(10000);

                expect(addItemResponse.status).toBe(200);
                const cartItem = addItemResponse.body.data.cartItem;

                const checkoutData = {
                    shippingAddress: testAddress.documentId,
                    billingAddress: testAddress.documentId,
                    shippingMethod: 'standard',
                    cartItems: [cartItem.documentId]
                };

                promises.push(
                    request(SERVER_URL)
                        .post('/api/checkout')
                        .set('Authorization', `Bearer ${userToken}`)
                        .send(checkoutData)
                        .timeout(10000)
                );
            }

            const responses = await Promise.all(promises);

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.data).toBeDefined();
                expect(response.body.data.documentId).toBeDefined();
            });
        });

        it('should handle checkout operations efficiently', async () => {
            const startTime = Date.now();

            // Create fresh cart item for this test
            const addItemResponse = await request(SERVER_URL)
                .post('/api/carts/items')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    productId: testProduct.documentId,
                    productListingId: testProductListing.documentId,
                    quantity: 1
                })
                .timeout(10000);

            expect(addItemResponse.status).toBe(200);
            const cartItem = addItemResponse.body.data.cartItem;

            const checkoutData = {
                shippingAddress: testAddress.documentId,
                billingAddress: testAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [cartItem.documentId]
            };

            const response = await request(SERVER_URL)
                .post('/api/checkout')
                .set('Authorization', `Bearer ${userToken}`)
                .send(checkoutData)
                .expect(200)
                .timeout(10000);

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
            expect(response.body.data).toBeDefined();
        });
    });
});
