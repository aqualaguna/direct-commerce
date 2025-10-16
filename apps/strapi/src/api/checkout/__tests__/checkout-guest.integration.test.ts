/**
 * Checkout Integration Tests - Guest Users
 * 
 * Comprehensive integration tests for Checkout module covering guest user scenarios:
 * - Guest checkout creation with session ID
 * - Guest checkout validation and updates
 * - Guest checkout completion with order creation
 * - Guest checkout abandonment and cleanup
 * - Guest cart items validation and processing
 * - Session-based authentication and security
 * - Guest to registered user conversion scenarios
 */

import request from 'supertest';
import { createTestAddressData } from '../../address/__tests__/test-setup';

describe('Checkout Integration Tests - Guest Users', () => {
    const SERVER_URL = 'http://localhost:1337';
    let apiToken: string;
    let testProduct: any;
    let testProductListing: any;
    let testGuestAddress: any;
    let testGuestCart: any;
    let testCheckout: any;

    // Generate unique test data with timestamp
    const timestamp = Date.now();
    const guestSessionId = `guest-session-${timestamp}`;

    beforeAll(async () => {
        // Get admin token for authenticated requests
        apiToken = process.env.STRAPI_API_TOKEN as string;

        if (!apiToken) {
            throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
        }

        // Create test product for guest checkout operations
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

        // Create test product listing for guest checkout operations
        const productListingData = {
            title: `Test Product Listing ${timestamp}`,
            description: 'Test product listing for guest checkout integration tests',
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

        // Create test guest address for checkout operations

        const addressData = createTestAddressData({
            address1: '123 Guest Street',
            city: 'Guest City',
            address2: 'Apt 4B',
            state: 'GS',
            postalCode: '54321',
            country: 'US',
            isDefault: true,
        });

        const addressResponse = await request(SERVER_URL)
            .post('/api/addresses')
            .query({ sessionId: guestSessionId })
            .send({ data: addressData })
            .timeout(10000);

        if (addressResponse.status !== 200) {
            throw new Error(`Failed to create test guest address: ${addressResponse.status} - ${JSON.stringify(addressResponse.body)}`);
        }

        testGuestAddress = addressResponse.body.data;


        // Create guest cart with items for checkout (similar to authenticated test)
        const addItemResponse = await request(SERVER_URL)
            .post('/api/carts/items')
            .query({ sessionId: guestSessionId })
            .send({
                productId: testProduct.documentId,
                productListingId: testProductListing.documentId,
                quantity: 2
            })
            .timeout(10000);

        if (addItemResponse.status !== 200) {
            throw new Error(`Failed to create test guest cart item: ${addItemResponse.status} - ${JSON.stringify(addItemResponse.body)}`);
        }

        testGuestCart = addItemResponse.body.data.cart;
        testGuestCart.cartItem = addItemResponse.body.data.cartItem;
    });

    afterAll(async () => {


        // Clean up test guest cart
        if (testGuestCart?.documentId) {
            try {
                await request(SERVER_URL)
                    .delete(`/api/carts/${testGuestCart.documentId}`)
                    .set('Authorization', `Bearer ${apiToken}`)
                    .expect(200)
                    .timeout(10000);
            } catch (error) {
                console.warn('Failed to clean up test guest cart:', error.message);
            }
        }

        // Clean up test guest address
        if (testGuestAddress?.documentId) {
            try {
                await request(SERVER_URL)
                    .delete(`/api/addresses/${testGuestAddress.documentId}`)
                    .query({ sessionId: guestSessionId })
                    .expect(200)
                    .timeout(10000);
            } catch (error) {
                console.warn('Failed to clean up test guest address:', error.message);
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
    });

    describe('Guest Checkout Creation and Database Verification', () => {
        it('should create checkout for guest user with session ID and verify database record', async () => {
            const checkoutData = {
                shippingAddress: testGuestAddress.documentId,
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [testGuestCart.cartItem.documentId],
                sessionId: guestSessionId
            };

            const response = await request(SERVER_URL)
                .post('/api/checkout')
                .send(checkoutData)
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.documentId).toBeDefined();
            expect(response.body.data.sessionId).toBe(guestSessionId);
            expect(response.body.data.user).toBeNull(); // Should be null for guest users
            expect(response.body.data.status).toBe('active');
            expect(response.body.data.shippingAddress).toBeDefined();
            expect(response.body.data.billingAddress).toBeDefined();
            expect(response.body.meta.message).toBe('Checkout created successfully');

            // Store checkout for cleanup
            testCheckout = response.body.data;
        });

        it('should reject guest checkout creation without session ID', async () => {
            const checkoutData = {
                shippingAddress: testGuestAddress.documentId,
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [testGuestCart.cartItem.documentId]
                // Missing sessionId
            };

            await request(SERVER_URL)
                .post('/api/checkout')
                .send(checkoutData)
                .expect(401)
                .timeout(10000);
        });

        it('should reject guest checkout creation with both session ID and user authentication', async () => {
            // Create a test user for this scenario
            const userData = {
                username: `testuser${timestamp}`,
                email: `testuser${timestamp}@example.com`,
                password: 'TestPassword123!',
            };

            const userResponse = await request(SERVER_URL)
                .post('/api/auth/local/register')
                .send(userData)
                .timeout(10000);

            const testUser = userResponse.body.user;
            const userToken = userResponse.body.jwt;

            const checkoutData = {
                shippingAddress: testGuestAddress.documentId,
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [testGuestCart.cartItem.documentId],
                sessionId: guestSessionId
            };

            await request(SERVER_URL)
                .post('/api/checkout')
                .set('Authorization', `Bearer ${userToken}`)
                .send(checkoutData)
                .expect(401)
                .timeout(10000);

            // Clean up test user
            await request(SERVER_URL)
                .delete(`/api/users/${testUser.id}`)
                .set('Authorization', `Bearer ${apiToken}`)
                .expect(200)
                .timeout(10000);
        });

        it('should reject guest checkout creation with invalid data', async () => {
            const invalidCheckoutData = {
                shippingAddress: 'non-existent-address-id',
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [testGuestCart.cartItem.documentId],
                sessionId: guestSessionId
            };

            await request(SERVER_URL)
                .post('/api/checkout')
                .send(invalidCheckoutData)
                .expect(400)
                .timeout(10000);
        });

        it('should reject guest checkout creation with empty cart', async () => {
            const checkoutData = {
                shippingAddress: testGuestAddress.documentId,
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [],
                sessionId: guestSessionId
            };

            await request(SERVER_URL)
                .post('/api/checkout')
                .send(checkoutData)
                .expect(400)
                .timeout(10000);
        });
    });

    describe('Guest Checkout Validation and Updates', () => {
        let checkout: any;

        beforeAll(async () => {
            // Create checkout for validation tests
            const checkoutData = {
                shippingAddress: testGuestAddress.documentId,
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [testGuestCart.cartItem.documentId],
                sessionId: guestSessionId
            };

            const createResponse = await request(SERVER_URL)
                .post('/api/checkout')
                .send(checkoutData)
                .timeout(10000);

            checkout = createResponse.body.data;
        });

        it('should validate guest checkout successfully', async () => {
            const validationData = {
                shippingAddress: testGuestAddress.documentId,
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'express',
                cartItems: [testGuestCart.cartItem.documentId],
                sessionId: guestSessionId
            };

            const response = await request(SERVER_URL)
                .post(`/api/checkout/${checkout.documentId}/validate`)
                .send(validationData)
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.documentId).toBe(checkout.documentId);
            expect(response.body.data.sessionId).toBe(guestSessionId);
            expect(response.body.data.shippingMethod).toBe('express');
            expect(response.body.meta.message).toBe('Checkout validated successfully');
        });

        it('should reject validation for non-existent guest checkout', async () => {
            const validationData = {
                shippingAddress: testGuestAddress.documentId,
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [testGuestCart.cartItem.documentId],
                sessionId: guestSessionId
            };

            await request(SERVER_URL)
                .post('/api/checkout/non-existent-document-id/validate')
                .send(validationData)
                .expect(404)
                .timeout(10000);
        });

        it('should reject validation for inactive guest checkout', async () => {
            // First abandon the checkout
            await request(SERVER_URL)
                .post(`/api/checkout/${checkout.documentId}/abandon`)
                .send({ sessionId: guestSessionId })
                .expect(200)
                .timeout(10000);

            const validationData = {
                shippingAddress: testGuestAddress.documentId,
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [testGuestCart.cartItem.documentId],
                sessionId: guestSessionId
            };

            await request(SERVER_URL)
                .post(`/api/checkout/${checkout.documentId}/validate`)
                .send(validationData)
                .expect(400)
                .timeout(10000);
        });

        it('should reject validation with wrong session ID', async () => {
            // Create a new checkout
            const checkoutData = {
                shippingAddress: testGuestAddress.documentId,
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [testGuestCart.cartItem.documentId],
                sessionId: guestSessionId
            };

            const createResponse = await request(SERVER_URL)
                .post('/api/checkout')
                .send(checkoutData)
                .timeout(10000);

            const newCheckout = createResponse.body.data;

            const validationData = {
                shippingAddress: testGuestAddress.documentId,
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [testGuestCart.cartItem.documentId],
                sessionId: 'wrong-session-id'
            };

            await request(SERVER_URL)
                .post(`/api/checkout/${newCheckout.documentId}/validate`)
                .send(validationData)
                .expect(404)
                .timeout(10000);
        });
    });

    describe('Guest Checkout Completion and Order Creation', () => {
        let checkout: any;

        beforeAll(async () => {
            // Create fresh checkout for completion tests
            const checkoutData = {
                shippingAddress: testGuestAddress.documentId,
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [testGuestCart.cartItem.documentId],
                sessionId: guestSessionId
            };

            const createResponse = await request(SERVER_URL)
                .post('/api/checkout')
                .send(checkoutData)
                .timeout(10000);

            checkout = createResponse.body.data;
        });

        it('should complete guest checkout and create order successfully', async () => {
            const response = await request(SERVER_URL)
                .post(`/api/checkout/${checkout.documentId}/complete`)
                .send({ sessionId: guestSessionId })
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.orderNumber).toBeDefined();
            expect(response.body.data.status).toBe('pending');
            expect(response.body.data.user).toBeNull(); // Should be null for guest orders
            expect(response.body.data.subtotal).toBeGreaterThan(0);
            expect(response.body.data.total).toBeGreaterThan(0);
            expect(response.body.data.items).toBeDefined();
            expect(response.body.data.items.length).toBeGreaterThan(0);
            expect(response.body.meta.message).toBe('Checkout completed successfully');

            expect(response.body.data.checkout.status).toBe('completed');

        });

        it('should reject completion for non-existent guest checkout', async () => {
            await request(SERVER_URL)
                .post('/api/checkout/non-existent-document-id/complete')
                .send({ sessionId: guestSessionId })
                .expect(404)
                .timeout(10000);
        });

        it('should reject completion for inactive guest checkout', async () => {
            // Create fresh cart item for this test
            const addItemResponse = await request(SERVER_URL)
                .post('/api/carts/items')
                .query({ sessionId: guestSessionId })
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
                shippingAddress: testGuestAddress.documentId,
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [cartItem.documentId],
                sessionId: guestSessionId
            };

            const createResponse = await request(SERVER_URL)
                .post('/api/checkout')
                .send(checkoutData)
                .timeout(10000);

            expect(createResponse.status).toBe(200);
            expect(createResponse.body.data).toBeDefined();
            expect(createResponse.body.data.documentId).toBeDefined();
            
            const abandonedCheckout = createResponse.body.data;

            await request(SERVER_URL)
                .post(`/api/checkout/${abandonedCheckout.documentId}/abandon`)
                .send({ sessionId: guestSessionId })
                .expect(200)
                .timeout(10000);

            await request(SERVER_URL)
                .post(`/api/checkout/${abandonedCheckout.documentId}/complete`)
                .send({ sessionId: guestSessionId })
                .expect(400)
                .timeout(10000);
        });

        it('should reject completion with wrong session ID', async () => {
            // Create fresh cart item for this test
            const addItemResponse = await request(SERVER_URL)
                .post('/api/carts/items')
                .query({ sessionId: guestSessionId })
                .send({
                    productId: testProduct.documentId,
                    productListingId: testProductListing.documentId,
                    quantity: 1
                })
                .timeout(10000);

            expect(addItemResponse.status).toBe(200);
            const cartItem = addItemResponse.body.data.cartItem;

            // Create a new checkout
            const checkoutData = {
                shippingAddress: testGuestAddress.documentId,
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [cartItem.documentId],
                sessionId: guestSessionId
            };

            const createResponse = await request(SERVER_URL)
                .post('/api/checkout')
                .send(checkoutData)
                .timeout(10000);

            expect(createResponse.status).toBe(200);
            expect(createResponse.body.data).toBeDefined();
            expect(createResponse.body.data.documentId).toBeDefined();
            
            const newCheckout = createResponse.body.data;

            await request(SERVER_URL)
                .post(`/api/checkout/${newCheckout.documentId}/complete`)
                .send({ sessionId: 'wrong-session-id' })
                .expect(404)
                .timeout(10000);
        });
    });

    describe('Guest Checkout Abandonment and Cleanup', () => {
        let checkout: any;

        beforeAll(async () => {
            // Create fresh cart item for abandonment tests
            const addItemResponse = await request(SERVER_URL)
                .post('/api/carts/items')
                .query({ sessionId: guestSessionId })
                .send({
                    productId: testProduct.documentId,
                    productListingId: testProductListing.documentId,
                    quantity: 1
                })
                .timeout(10000);

            expect(addItemResponse.status).toBe(200);
            const cartItem = addItemResponse.body.data.cartItem;

            // Create checkout for abandonment tests
            const checkoutData = {
                shippingAddress: testGuestAddress.documentId,
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [cartItem.documentId],
                sessionId: guestSessionId
            };

            const createResponse = await request(SERVER_URL)
                .post('/api/checkout')
                .send(checkoutData)
                .timeout(10000);

            expect(createResponse.status).toBe(200);
            expect(createResponse.body.data).toBeDefined();
            expect(createResponse.body.data.documentId).toBeDefined();
            
            checkout = createResponse.body.data;
        });

        it('should abandon guest checkout successfully', async () => {
            const response = await request(SERVER_URL)
                .post(`/api/checkout/${checkout.documentId}/abandon`)
                .send({ sessionId: guestSessionId })
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.documentId).toBe(checkout.documentId);
            expect(response.body.data.sessionId).toBe(guestSessionId);
            expect(response.body.data.status).toBe('abandoned');
            expect(response.body.meta.message).toBe('Checkout abandoned successfully');
        });

        it('should reject abandonment for non-existent guest checkout', async () => {
            await request(SERVER_URL)
                .post('/api/checkout/non-existent-document-id/abandon')
                .send({ sessionId: guestSessionId })
                .expect(404)
                .timeout(10000);
        });

        it('should reject abandonment for already completed guest checkout', async () => {
            // Create fresh cart item for this test
            const addItemResponse = await request(SERVER_URL)
                .post('/api/carts/items')
                .query({ sessionId: guestSessionId })
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
                shippingAddress: testGuestAddress.documentId,
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [cartItem.documentId],
                sessionId: guestSessionId
            };

            const createResponse = await request(SERVER_URL)
                .post('/api/checkout')
                .send(checkoutData)
                .timeout(10000);

            expect(createResponse.status).toBe(200);
            expect(createResponse.body.data).toBeDefined();
            expect(createResponse.body.data.documentId).toBeDefined();
            
            const completedCheckout = createResponse.body.data;

            await request(SERVER_URL)
                .post(`/api/checkout/${completedCheckout.documentId}/complete`)
                .send({ sessionId: guestSessionId })
                .expect(200)
                .timeout(10000);

            await request(SERVER_URL)
                .post(`/api/checkout/${completedCheckout.documentId}/abandon`)
                .send({ sessionId: guestSessionId })
                .expect(400)
                .timeout(10000);
        });

        it('should reject abandonment with wrong session ID', async () => {
            // Create fresh cart item for this test
            const addItemResponse = await request(SERVER_URL)
                .post('/api/carts/items')
                .query({ sessionId: guestSessionId })
                .send({
                    productId: testProduct.documentId,
                    productListingId: testProductListing.documentId,
                    quantity: 1
                })
                .timeout(10000);

            expect(addItemResponse.status).toBe(200);
            const cartItem = addItemResponse.body.data.cartItem;

            // Create a new checkout
            const checkoutData = {
                shippingAddress: testGuestAddress.documentId,
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [cartItem.documentId],
                sessionId: guestSessionId
            };

            const createResponse = await request(SERVER_URL)
                .post('/api/checkout')
                .send(checkoutData)
                .timeout(10000);

            expect(createResponse.status).toBe(200);
            expect(createResponse.body.data).toBeDefined();
            expect(createResponse.body.data.documentId).toBeDefined();
            
            const newCheckout = createResponse.body.data;

            await request(SERVER_URL)
                .post(`/api/checkout/${newCheckout.documentId}/abandon`)
                .send({ sessionId: 'wrong-session-id' })
                .expect(404)
                .timeout(10000);
        });
    });

    describe('Guest Checkout Validation and Error Handling', () => {
        it('should reject guest checkout with invalid address', async () => {
            const checkoutData = {
                shippingAddress: 'non-existent-address-id',
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [testGuestCart.cartItem.documentId],
                sessionId: guestSessionId
            };

            await request(SERVER_URL)
                .post('/api/checkout')
                .send(checkoutData)
                .expect(400)
                .timeout(10000);
        });


        it('should reject guest checkout with invalid cart items', async () => {
            const checkoutData = {
                shippingAddress: testGuestAddress.documentId,
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: ['non-existent-cart-item-id'],
                sessionId: guestSessionId
            };

            await request(SERVER_URL)
                .post('/api/checkout')
                .send(checkoutData)
                .expect(400)
                .timeout(10000);
        });

    });

    describe('Guest Checkout Performance and Concurrent Operations', () => {
        it('should handle multiple concurrent guest checkout operations', async () => {
            const concurrentRequests = 3;
            const promises: any[] = [];

            for (let i = 0; i < concurrentRequests; i++) {
                // Create fresh cart item for each concurrent request
                const addItemResponse = await request(SERVER_URL)
                    .post('/api/carts/items')
                    .query({ sessionId: guestSessionId })
                    .send({
                        productId: testProduct.documentId,
                        productListingId: testProductListing.documentId,
                        quantity: 1
                    })
                    .timeout(10000);

                expect(addItemResponse.status).toBe(200);
                const cartItem = addItemResponse.body.data.cartItem;

                const checkoutData = {
                    shippingAddress: testGuestAddress.documentId,
                    billingAddress: testGuestAddress.documentId,
                    shippingMethod: 'standard',
                    cartItems: [cartItem.documentId],
                    sessionId: guestSessionId
                };

                promises.push(
                    request(SERVER_URL)
                        .post('/api/checkout')
                        .send(checkoutData)
                        .timeout(10000)
                );
            }

            const responses = await Promise.all(promises);

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.data).toBeDefined();
                expect(response.body.data.documentId).toBeDefined();
                expect(response.body.data.sessionId).toBe(guestSessionId);
            });
        });

        it('should handle guest checkout operations efficiently', async () => {
            const startTime = Date.now();

            // Create fresh cart item for this test
            const addItemResponse = await request(SERVER_URL)
                .post('/api/carts/items')
                .query({ sessionId: guestSessionId })
                .send({
                    productId: testProduct.documentId,
                    productListingId: testProductListing.documentId,
                    quantity: 1
                })
                .timeout(10000);

            expect(addItemResponse.status).toBe(200);
            const cartItem = addItemResponse.body.data.cartItem;

            const checkoutData = {
                shippingAddress: testGuestAddress.documentId,
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [cartItem.documentId],
                sessionId: guestSessionId
            };

            const response = await request(SERVER_URL)
                .post('/api/checkout')
                .send(checkoutData)
                .expect(200)
                .timeout(10000);

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
            expect(response.body.data).toBeDefined();
            expect(response.body.data.sessionId).toBe(guestSessionId);
        });
    });

    describe('Guest to Registered User Conversion Scenarios', () => {
        let testUser: any;
        let userToken: string;

        beforeAll(async () => {
            // Create test user for conversion scenarios
            const userData = {
                username: `conversionuser${timestamp}`,
                email: `conversionuser${timestamp}@example.com`,
                password: 'TestPassword123!',
            };

            const userResponse = await request(SERVER_URL)
                .post('/api/auth/local/register')
                .send(userData)
                .timeout(10000);

            testUser = userResponse.body.user;
            userToken = userResponse.body.jwt;
        });

        afterAll(async () => {
            // Clean up test user
            if (testUser?.id) {
                try {
                    await request(SERVER_URL)
                        .delete(`/api/users/${testUser.id}`)
                        .set('Authorization', `Bearer ${apiToken}`)
                        .expect(200)
                        .timeout(10000);
                } catch (error) {
                    console.warn(`Failed to clean up test user ${testUser.id}:`, error.message);
                }
            }
        });

        it('should handle guest checkout with user authentication (ambiguous scenario)', async () => {
            const checkoutData = {
                shippingAddress: testGuestAddress.documentId,
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [testGuestCart.cartItem.documentId],
                sessionId: guestSessionId
            };

            // This should be rejected as ambiguous - can't have both user auth and session ID
            await request(SERVER_URL)
                .post('/api/checkout')
                .set('Authorization', `Bearer ${userToken}`)
                .send(checkoutData)
                .expect(401)
                .timeout(10000);
        });

        it('should handle user checkout with guest session ID (ambiguous scenario)', async () => {
            const checkoutData = {
                shippingAddress: testGuestAddress.documentId,
                billingAddress: testGuestAddress.documentId,
                shippingMethod: 'standard',
                cartItems: [testGuestCart.cartItem.documentId],
                sessionId: guestSessionId
            };

            // This should be rejected as ambiguous - can't have both user auth and session ID
            await request(SERVER_URL)
                .post('/api/checkout')
                .set('Authorization', `Bearer ${userToken}`)
                .send(checkoutData)
                .expect(401)
                .timeout(10000);
        });
    });
});
