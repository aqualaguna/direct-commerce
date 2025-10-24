/**
 * Order Integration Tests - Authenticated Users
 * 
 * Comprehensive integration tests for Order module covering authenticated user scenarios:
 * - Order retrieval with pagination and filtering
 * - Order status filtering and management
 * - Order cancellation with validation
 * - Order refund processing
 * - Order access control and security
 * - Order history and status tracking
 * - Error handling and edge cases
 * - Performance and concurrent operations
 */

import request from 'supertest';
import { createTestAddressData } from '../../address/__tests__/test-setup';
import { initializePaymentMethods, getPaymentMethods } from '../../payment/__tests__/test-helpers';

describe('Order Integration Tests - Authenticated Users', () => {
    const SERVER_URL = 'http://localhost:1337';
    let apiToken: string;
    let testUser: any;
    let testUserToken: string;
    let testProduct: any;
    let testProductListing: any;
    let testAddress: any;
    let testOrder: any;
    let testCheckout: any;
    let testPaymentMethod: any;

    // Track all created resources for cleanup
    const createdUsers: any[] = [];
    const createdOrders: any[] = [];
    const createdCheckouts: any[] = [];
    const createdCartItems: any[] = [];

    // Generate unique test data with timestamp
    const timestamp = Date.now();

    beforeAll(async () => {
        // Get admin token for authenticated requests
        apiToken = process.env.STRAPI_API_TOKEN as string;

        if (!apiToken) {
            throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
        }

        // Create test user for order operations
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

        // Create test product for order operations
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

        // Create test product listing for order operations
        const productListingData = {
            title: `Test Product Listing ${timestamp}`,
            description: 'Test product listing for order integration tests',
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

        // Create test address for order operations
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

        // Initialize payment methods and get one for testing
        await initializePaymentMethods(apiToken);
        testPaymentMethod = await getPaymentMethods();

        // Create test order through checkout completion
        await createTestOrder();
    });

    afterAll(async () => {
        // Clean up all created orders (in reverse order to handle dependencies)
        // for (const order of createdOrders.reverse()) {
        //     if (order?.documentId) {
        //         try {
        //             await request(SERVER_URL)
        //                 .delete(`/api/orders/${order.documentId}`)
        //                 .set('Authorization', `Bearer ${apiToken}`)
        //                 .expect(200)
        //                 .timeout(10000);
        //         } catch (error) {
        //             console.warn(`Failed to clean up order ${order.documentId}:`, error.message);
        //         }
        //     }
        // }

        // Clean up all created checkouts
        // for (const checkout of createdCheckouts.reverse()) {
        //     if (checkout?.documentId) {
        //         try {
        //             await request(SERVER_URL)
        //                 .delete(`/api/checkout/${checkout.documentId}`)
        //                 .set('Authorization', `Bearer ${apiToken}`)
        //                 .expect(200)
        //                 .timeout(10000);
        //         } catch (error) {
        //             console.warn(`Failed to clean up checkout ${checkout.documentId}:`, error.message);
        //         }
        //     }
        // }

        // Clean up all created cart items
        // for (const cartItem of createdCartItems.reverse()) {
        //     if (cartItem?.documentId) {
        //         try {
        //             await request(SERVER_URL)
        //                 .delete(`/api/carts/items/${cartItem.documentId}`)
        //                 .set('Authorization', `Bearer ${apiToken}`)
        //                 .expect(200)
        //                 .timeout(10000);
        //         } catch (error) {
        //             console.warn(`Failed to clean up cart item ${cartItem.documentId}:`, error.message);
        //         }
        //     }
        // }

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

        // Note: Payment methods are initialized globally and don't need cleanup

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

    // Helper function to create test order
    async function createTestOrder() {
        // Authenticate user
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

        // Create cart with items
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
        const cartItem = addItemResponse.body.data.cartItem;
        createdCartItems.push(cartItem);

        // Create checkout
        const checkoutData = {
            shippingAddress: testAddress.documentId,
            billingAddress: testAddress.documentId,
            shippingMethod: 'standard',
            cartItems: [cartItem.documentId]
        };

        const checkoutResponse = await request(SERVER_URL)
            .post('/api/checkout')
            .set('Authorization', `Bearer ${userToken}`)
            .send(checkoutData)
            .timeout(10000);

        expect(checkoutResponse.status).toBe(200);
        const checkout = checkoutResponse.body.data;
        createdCheckouts.push(checkout);
        testCheckout = checkout;

        // Complete checkout to create order
        const completeResponse = await request(SERVER_URL)
            .post(`/api/checkout/${checkout.documentId}/complete`)
            .set('Authorization', `Bearer ${userToken}`)
            .expect(200)
            .timeout(10000);

        const order = completeResponse.body.data;
        createdOrders.push(order);
        testOrder = order;
    }

    describe('Order Retrieval and Pagination', () => {
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

        it('should retrieve user orders with pagination', async () => {
            const response = await request(SERVER_URL)
                .get('/api/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.meta.pagination).toBeDefined();
            expect(response.body.meta.pagination.page).toBe(1);
            expect(response.body.meta.pagination.pageSize).toBe(25);
            expect(response.body.meta.pagination.total).toBeGreaterThanOrEqual(1);
            expect(response.body.meta.statusCounts).toBeDefined();
        });

        it('should retrieve orders with custom pagination', async () => {
            const response = await request(SERVER_URL)
                .get('/api/orders?page=1&pageSize=10')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(response.body.meta.pagination.pageSize).toBe(10);
            expect(response.body.data.length).toBeLessThanOrEqual(10);
        });

        it('should reject order retrieval without authentication', async () => {
            await request(SERVER_URL)
                .get('/api/orders')
                .expect(403)
                .timeout(10000);
        });

        it('should handle invalid pagination parameters', async () => {
            const response = await request(SERVER_URL)
                .get('/api/orders?page=-1&pageSize=1000')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(400)
                .timeout(10000);
            expect(response.body.error).toBeDefined();
            expect(response.body.error.message).toBe('Validation errors ');
            expect(response.body.error.details).toBeDefined();
            expect(response.body.error.details.length).toBeGreaterThan(0);
            expect(response.body.error.details[0]).toBe('Invalid page value: -1. Must be a positive number');
        });
    });

    describe('Order Status Filtering', () => {
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

        it('should filter orders by status', async () => {
            const response = await request(SERVER_URL)
                .get('/api/orders/byStatus/pending')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.meta.pagination).toBeDefined();
        });

        it('should reject invalid status filter', async () => {
            await request(SERVER_URL)
                .get('/api/orders/byStatus/invalid-status')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(400)
                .timeout(10000);
        });

        it('should return empty results for non-existent status', async () => {
            const response = await request(SERVER_URL)
                .get('/api/orders/byStatus/delivered')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.length).toBe(0);
        });

        it('should reject status filtering without authentication', async () => {
            await request(SERVER_URL)
                .get('/api/orders/byStatus/pending')
                .expect(403)
                .timeout(10000);
        });
    });

    describe('Order Details and Access Control', () => {
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

        it('should retrieve specific order details', async () => {
            const response = await request(SERVER_URL)
                .get(`/api/orders/${testOrder.documentId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .timeout(10000);
            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.documentId).toBe(testOrder.documentId);
            expect(response.body.data.orderNumber).toBeDefined();
            expect(response.body.data.status).toBeDefined();
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.items).toBeDefined();
            expect(response.body.meta.message).toBe('Order found successfully');
        });

        it('should reject access to non-existent order', async () => {
            await request(SERVER_URL)
                .get('/api/orders/non-existent-document-id')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(404)
                .timeout(10000);
        });

        it('should reject access to other user\'s order', async () => {
            // Create a second user
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

            // User 2 should not be able to access User 1's order
            await request(SERVER_URL)
                .get(`/api/orders/${testOrder.documentId}`)
                .set('Authorization', `Bearer ${user2Token}`)
                .expect(403)
                .timeout(10000);
        });

        it('should reject order details access without authentication', async () => {
            await request(SERVER_URL)
                .get(`/api/orders/${testOrder.documentId}`)
                .expect(403)
                .timeout(10000);
        });
    });

    describe('Order Cancellation', () => {
        let userToken: string;
        let cancellableOrder: any;

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

            // Create a new order for cancellation tests
            await createTestOrder();
            cancellableOrder = testOrder;
        });

        it('should cancel order successfully', async () => {
            const cancelData = {
                cancelReason: 'Customer request'
            };

            const response = await request(SERVER_URL)
                .post(`/api/orders/${cancellableOrder.documentId}/cancel`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(cancelData)
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.status).toBe('cancelled');
            expect(response.body.meta.message).toBe('Order cancelled successfully');
        });

        it('should reject cancellation of non-existent order', async () => {
            const cancelData = {
                cancelReason: 'Customer request'
            };

            await request(SERVER_URL)
                .post('/api/orders/non-existent-document-id/cancel')
                .set('Authorization', `Bearer ${userToken}`)
                .send(cancelData)
                .expect(404)
                .timeout(10000);
        });

        it('should reject cancellation of already cancelled order', async () => {
            // Create a new order and cancel it first
            await createTestOrder();
            const newOrder = createdOrders[createdOrders.length - 1]; // Get the last created order

            await request(SERVER_URL)
                .post(`/api/orders/${newOrder.documentId}/cancel`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ cancelReason: 'Customer request' })
                .expect(200)
                .timeout(10000);

            // Try to cancel again
            await request(SERVER_URL)
                .post(`/api/orders/${newOrder.documentId}/cancel`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ cancelReason: 'Customer request' })
                .expect(400)
                .timeout(10000);
        });

        it('should reject cancellation without authentication', async () => {
            const cancelData = {
                cancelReason: 'Customer request'
            };

            await request(SERVER_URL)
                .post(`/api/orders/${cancellableOrder.documentId}/cancel`)
                .send(cancelData)
                .expect(403)
                .timeout(10000);
        });

        it('should reject cancellation of other user\'s order', async () => {
            // Create a second user
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

            // User 2 should not be able to cancel User 1's order
            const response = await request(SERVER_URL)
                .post(`/api/orders/${cancellableOrder.documentId}/cancel`)
                .set('Authorization', `Bearer ${user2Token}`)
                .send({ cancelReason: 'Customer request' })
                .expect(403)
                .timeout(10000);
        });
    });

    describe('Order Refund Processing', () => {
        let userToken: string;
        let refundableOrder: any;

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

            // Create a new order for refund tests
            await createTestOrder();
            refundableOrder = testOrder;
        });

        it('should refund order successfully', async () => {
            // First, create a payment for the order
            const paymentData = {
                paymentMethod: testPaymentMethod.documentId,
                amount: 100.00,
                currency: 'USD',
                paymentType: 'manual',
                paymentNotes: 'Test payment for refund test'
            };

            const paymentResponse = await request(SERVER_URL)
                .post(`/api/payment/${refundableOrder.documentId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ data: paymentData })
                .expect(200)
                .timeout(10000);

            const payment = paymentResponse.body.data;

            // Confirm the payment as admin
            const confirmationData = {
                confirmationNotes: 'Payment confirmed for refund test',
                confirmationEvidence: {
                    receipt: 'receipt-123',
                    verified: true
                }
            };

            await request(SERVER_URL)
                .post(`/api/payment/${payment.documentId}/confirm`)
                .set('Authorization', `Bearer ${apiToken}`)
                .send({ data: confirmationData })
                .expect(200)
                .timeout(10000);

            // Now attempt the refund
            const refundData = {
                refundReason: 'Customer request'
            };

            const response = await request(SERVER_URL)
                .post(`/api/orders/${refundableOrder.documentId}/refund`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(refundData)
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.status).toBe('refunded');
            expect(response.body.data.paymentStatus).toBe('refunded');
            expect(response.body.meta.message).toBe('Order refunded successfully');
        });

        it('should reject refund of non-existent order', async () => {
            const refundData = {
                refundReason: 'Customer request'
            };

            await request(SERVER_URL)
                .post('/api/orders/non-existent-document-id/refund')
                .set('Authorization', `Bearer ${userToken}`)
                .send(refundData)
                .expect(404)
                .timeout(10000);
        });

        it('should reject refund of already refunded order', async () => {
            // Create a new order and refund it first
            await createTestOrder();
            const newOrder = createdOrders[createdOrders.length - 1]; // Get the last created order

            // Create and confirm payment for the new order
            const paymentData = {
                paymentMethod: testPaymentMethod.documentId,
                amount: 100.00,
                currency: 'USD',
                paymentType: 'manual',
                paymentNotes: 'Test payment for double refund test'
            };

            const paymentResponse = await request(SERVER_URL)
                .post(`/api/payment/${newOrder.documentId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ data: paymentData })
                .expect(200)
                .timeout(10000);

            const payment = paymentResponse.body.data;

            // Confirm the payment as admin
            const confirmationData = {
                confirmedBy: 'admin-user-id',
                confirmationNotes: 'Payment confirmed for double refund test'
            };

            await request(SERVER_URL)
                .post(`/api/payment/${payment.documentId}/confirm`)
                .set('Authorization', `Bearer ${apiToken}`)
                .send({ data: confirmationData })
                .expect(200)
                .timeout(10000);

            // First refund
            await request(SERVER_URL)
                .post(`/api/orders/${newOrder.documentId}/refund`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ refundReason: 'Customer request' })
                .expect(200)
                .timeout(10000);

            // Try to refund again
            await request(SERVER_URL)
                .post(`/api/orders/${newOrder.documentId}/refund`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ refundReason: 'Customer request' })
                .expect(400)
                .timeout(10000);
        });

        it('should reject refund without authentication', async () => {
            const refundData = {
                refundReason: 'Customer request'
            };

            await request(SERVER_URL)
                .post(`/api/orders/${refundableOrder.documentId}/refund`)
                .send(refundData)
                .expect(403)
                .timeout(10000);
        });

        it('should reject refund of other user\'s order', async () => {
            // Create a second user
            const user2Data = {
                username: `testuser4${timestamp}`,
                email: `testuser4${timestamp}@example.com`,
                password: 'TestPassword123!',
            };

            const user2Response = await request(SERVER_URL)
                .post('/api/auth/local/register')
                .send(user2Data)
                .timeout(10000);

            const user2 = user2Response.body.user;
            createdUsers.push(user2);

            const user2Token = user2Response.body.jwt;

            // User 2 should not be able to refund User 1's order
            const response = await request(SERVER_URL)
                .post(`/api/orders/${refundableOrder.documentId}/refund`)
                .set('Authorization', `Bearer ${user2Token}`)
                .send({ refundReason: 'Customer request' })
                .expect(403)
                .timeout(10000);
        });
    });

    describe('Order Status Validation and Edge Cases', () => {
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

        it('should handle invalid order status transitions', async () => {
            // Create a new order
            await createTestOrder();
            const newOrder = createdOrders[createdOrders.length - 1]; // Get the last created order

            // Create and confirm payment for the new order
            const paymentData = {
                paymentMethod: testPaymentMethod.documentId,
                amount: 100.00,
                currency: 'USD',
                paymentType: 'manual',
                paymentNotes: 'Test payment for status transition test'
            };

            const paymentResponse = await request(SERVER_URL)
                .post(`/api/payment/${newOrder.documentId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ data: paymentData })
                .expect(200)
                .timeout(10000);

            const payment = paymentResponse.body.data;

            // Confirm the payment as admin
            const confirmationData = {
                confirmedBy: 'admin-user-id',
                confirmationNotes: 'Payment confirmed for status transition test'
            };

            await request(SERVER_URL)
                .post(`/api/payment/${payment.documentId}/confirm`)
                .set('Authorization', `Bearer ${apiToken}`)
                .send({ data: confirmationData })
                .expect(200)
                .timeout(10000);

            // Try to refund a paid order (should work)
            await request(SERVER_URL)
                .post(`/api/orders/${newOrder.documentId}/refund`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ refundReason: 'Customer request' })
                .expect(200)
                .timeout(10000);

            // Try to cancel a refunded order (should fail)
            await request(SERVER_URL)
                .post(`/api/orders/${newOrder.documentId}/cancel`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ cancelReason: 'Customer request' })
                .expect(400)
                .timeout(10000);
        });

        it('should handle malformed order IDs', async () => {
            const malformedIds = [
                'invalid-id',
                '123',
                'null',
                'undefined'
            ];

            for (const id of malformedIds) {
                await request(SERVER_URL)
                    .get(`/api/orders/${id}`)
                    .set('Authorization', `Bearer ${userToken}`)
                    .expect(404)
                    .timeout(10000);
            }
        });
    });

    describe('Order Performance and Analytics', () => {
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

        it('should retrieve orders efficiently', async () => {
            const startTime = Date.now();

            const response = await request(SERVER_URL)
                .get('/api/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200)
                .timeout(10000);

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
            expect(response.body.data).toBeDefined();
            expect(response.body.meta.statusCounts).toBeDefined();
        });

        it('should provide accurate status counts', async () => {
            const response = await request(SERVER_URL)
                .get('/api/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200)
                .timeout(10000);
            expect(response.body.meta.statusCounts).toBeDefined();
            expect(typeof response.body.meta.statusCounts.pending).toBe('number');
            expect(typeof response.body.meta.statusCounts.confirmed).toBe('number');
            expect(typeof response.body.meta.statusCounts.processing).toBe('number');
            expect(typeof response.body.meta.statusCounts.shipping).toBe('number');
            expect(typeof response.body.meta.statusCounts.delivered).toBe('number');
            expect(typeof response.body.meta.statusCounts.cancelled).toBe('number');
            expect(typeof response.body.meta.statusCounts.refunded).toBe('number');
            expect(typeof response.body.meta.statusCounts.returned).toBe('number');
        });

        it('should handle large result sets with pagination', async () => {
            // Test with small page size to ensure pagination works
            const response = await request(SERVER_URL)
                .get('/api/orders?pageSize=1')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200)
                .timeout(10000);

            expect(response.body.data.length).toBeLessThanOrEqual(1);
            expect(response.body.meta.pagination.pageSize).toBe(1);
            expect(response.body.meta.pagination.pageCount).toBeGreaterThanOrEqual(1);
        });
    });

});
