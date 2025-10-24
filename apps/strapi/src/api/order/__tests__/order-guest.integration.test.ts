/**
 * Order Integration Tests - Guest Users
 * 
 * Comprehensive integration tests for Order module covering guest user scenarios:
 * - Order retrieval with session-based authentication
 * - Order status filtering and management for guests
 * - Order cancellation with session validation
 * - Order refund processing for guests
 * - Guest order access control and security
 * - Order history and status tracking for guests
 * - Error handling and edge cases for guest users
 * - Performance and concurrent operations for guests
 */

import request from 'supertest';
import { createTestAddressData } from '../../address/__tests__/test-setup';
import { initializePaymentMethods, getPaymentMethods, createGuestAddress, createCompleteOrder } from '../../payment/__tests__/test-helpers';

describe('Order Integration Tests - Guest Users', () => {
    const SERVER_URL = 'http://localhost:1337';
    let apiToken: string;
    let testProduct: any;
    let testProductListing: any;
    let testAddress: any;
    let testOrder: any;
    let testCheckout: any;
    let testPaymentMethod: any;
    let sessionId: string;

    // Track all created resources for cleanup
    const createdOrders: any[] = [];
    const createdCheckouts: any[] = [];
    const createdCartItems: any[] = [];
    const createdAddresses: any[] = [];

    // Generate unique test data with timestamp
    const timestamp = Date.now();

    beforeAll(async () => {
        // Get admin token for authenticated requests
        apiToken = process.env.STRAPI_API_TOKEN as string;

        if (!apiToken) {
            throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
        }

        // Generate session ID for guest user
        sessionId = `guest-session-${timestamp}`;

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
            description: 'Test product listing for guest order integration tests',
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

        // Create test address for guest order operations
        const addressData = createTestAddressData({
            address1: '123 Guest Street',
            city: 'Guest City',
            firstName: 'Guest',
            lastName: 'User',
            state: 'GS',
            postalCode: '54321',
            country: 'US',
        });

        const addressResponse = await request(SERVER_URL)
            .post('/api/addresses')
            .query({ sessionId })
            .send({ data: addressData })
            .timeout(10000);

        if (addressResponse.status !== 200) {
            throw new Error(`Failed to create test address: ${addressResponse.status} - ${JSON.stringify(addressResponse.body)}`);
        }

        testAddress = addressResponse.body.data;
        createdAddresses.push(testAddress);

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

        // Clean up all created addresses
        for (const address of createdAddresses.reverse()) {
            if (address?.documentId) {
                try {
                    await request(SERVER_URL)
                        .delete(`/api/addresses/${address.documentId}`)
                        .set('Authorization', `Bearer ${apiToken}`)
                        .expect(200)
                        .timeout(10000);
                } catch (error) {
                    console.warn(`Failed to clean up address ${address.documentId}:`, error.message);
                }
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

    // Helper function to create test order for guest
    async function createTestOrder() {
        // Create cart with items for guest
        const addItemResponse = await request(SERVER_URL)
            .post('/api/carts/items')
            .query({ sessionId })
            .send({
                productId: testProduct.documentId,
                productListingId: testProductListing.documentId,
                quantity: 2
            })
            .timeout(10000);

        expect(addItemResponse.status).toBe(200);
        const cartItem = addItemResponse.body.data.cartItem;
        createdCartItems.push(cartItem);

        // Create checkout for guest
        const checkoutData = {
            shippingAddress: testAddress.documentId,
            billingAddress: testAddress.documentId,
            shippingMethod: 'standard',
            cartItems: [cartItem.documentId]
        };

        const checkoutResponse = await request(SERVER_URL)
            .post('/api/checkout')
            .query({ sessionId })
            .send(checkoutData)
            .timeout(10000);

        expect(checkoutResponse.status).toBe(200);
        const checkout = checkoutResponse.body.data;
        createdCheckouts.push(checkout);
        testCheckout = checkout;

        // Complete checkout to create order
        const completeResponse = await request(SERVER_URL)
            .post(`/api/checkout/${checkout.documentId}/complete`)
            .query({ sessionId })
            .expect(200)
            .timeout(10000);

        const order = completeResponse.body.data;
        createdOrders.push(order);
        testOrder = order;
    }

    describe('Guest Order Retrieval and Pagination', () => {
        it('should retrieve guest orders with pagination', async () => {
            const response = await request(SERVER_URL)
                .get('/api/orders')
                .query({ sessionId })
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

        it('should retrieve guest orders with custom pagination', async () => {
            const response = await request(SERVER_URL)
                .get('/api/orders?page=1&pageSize=10')
                .query({ sessionId })
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(response.body.meta.pagination.pageSize).toBe(10);
            expect(response.body.data.length).toBeLessThanOrEqual(10);
        });

        it('should reject order retrieval without session ID', async () => {
            await request(SERVER_URL)
                .get('/api/orders')
                .expect(403)
                .timeout(10000);
        });

        it('should handle invalid pagination parameters for guest', async () => {
            const response = await request(SERVER_URL)
                .get('/api/orders?page=-1&pageSize=1000')
                .query({ sessionId })
                .expect(400)
                .timeout(10000);
            expect(response.body.error).toBeDefined();
            expect(response.body.error.message).toBe('Validation errors ');
            expect(response.body.error.details).toBeDefined();
            expect(response.body.error.details.length).toBeGreaterThan(0);
            expect(response.body.error.details[0]).toBe('Invalid page value: -1. Must be a positive number');
        });
    });

    describe('Guest Order Status Filtering', () => {
        it('should filter guest orders by status', async () => {
            const response = await request(SERVER_URL)
                .get('/api/orders/byStatus/pending')
                .query({ sessionId })
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.meta.pagination).toBeDefined();
        });

        it('should reject invalid status filter for guest', async () => {
            await request(SERVER_URL)
                .get('/api/orders/byStatus/invalid-status')
                .query({ sessionId })
                .expect(400)
                .timeout(10000);
        });

        it('should return empty results for non-existent status for guest', async () => {
            const response = await request(SERVER_URL)
                .get('/api/orders/byStatus/delivered')
                .query({ sessionId })
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.length).toBe(0);
        });

        it('should reject status filtering without session ID', async () => {
            await request(SERVER_URL)
                .get('/api/orders/byStatus/pending')
                .expect(403)
                .timeout(10000);
        });
    });

    describe('Guest Order Details and Access Control', () => {
        it('should retrieve specific guest order details', async () => {
            const response = await request(SERVER_URL)
                .get(`/api/orders/${testOrder.documentId}`)
                .query({ sessionId })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.documentId).toBe(testOrder.documentId);
            expect(response.body.data.orderNumber).toBeDefined();
            expect(response.body.data.status).toBeDefined();
            expect(response.body.data.sessionId).toBe(sessionId);
            expect(response.body.data.items).toBeDefined();
            expect(response.body.meta.message).toBe('Order found successfully');
        });

        it('should reject access to non-existent order for guest', async () => {
            await request(SERVER_URL)
                .get('/api/orders/non-existent-document-id')
                .query({ sessionId })
                .expect(404)
                .timeout(10000);
        });

        it('should reject access to other session\'s order', async () => {
            const otherSessionId = `other-session-${timestamp}`;
            
            // User with different session should not be able to access this order
            await request(SERVER_URL)
                .get(`/api/orders/${testOrder.documentId}`)
                .query({ sessionId: otherSessionId })
                .expect(403)
                .timeout(10000);
        });

        it('should reject order details access without session ID', async () => {
            await request(SERVER_URL)
                .get(`/api/orders/${testOrder.documentId}`)
                .expect(403)
                .timeout(10000);
        });
    });

    describe('Guest Order Cancellation', () => {
        let cancellableOrder: any;

        beforeAll(async () => {
            // Create a new order for cancellation tests
            await createTestOrder();
            cancellableOrder = testOrder;
        });

        it('should cancel guest order successfully', async () => {
            const cancelData = {
                cancelReason: 'Customer request'
            };

            const response = await request(SERVER_URL)
                .post(`/api/orders/${cancellableOrder.documentId}/cancel`)
                .query({ sessionId })
                .send(cancelData)
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.status).toBe('cancelled');
            expect(response.body.meta.message).toBe('Order cancelled successfully');
        });

        it('should reject cancellation of non-existent order for guest', async () => {
            const cancelData = {
                cancelReason: 'Customer request'
            };

            await request(SERVER_URL)
                .post('/api/orders/non-existent-document-id/cancel')
                .query({ sessionId })
                .send(cancelData)
                .expect(404)
                .timeout(10000);
        });

        it('should reject cancellation of already cancelled order for guest', async () => {
            // Create a new order and cancel it first
            await createTestOrder();
            const newOrder = createdOrders[createdOrders.length - 1]; // Get the last created order

            await request(SERVER_URL)
                .post(`/api/orders/${newOrder.documentId}/cancel`)
                .query({ sessionId })
                .send({ cancelReason: 'Customer request' })
                .expect(200)
                .timeout(10000);

            // Try to cancel again
            await request(SERVER_URL)
                .post(`/api/orders/${newOrder.documentId}/cancel`)
                .query({ sessionId })
                .send({ cancelReason: 'Customer request' })
                .expect(400)
                .timeout(10000);
        });

        it('should reject cancellation without session ID', async () => {
            const cancelData = {
                cancelReason: 'Customer request'
            };

            await request(SERVER_URL)
                .post(`/api/orders/${cancellableOrder.documentId}/cancel`)
                .send(cancelData)
                .expect(403)
                .timeout(10000);
        });

        it('should reject cancellation of other session\'s order', async () => {
            const otherSessionId = `other-session-${timestamp}`;
            const cancelData = {
                cancelReason: 'Customer request'
            };

            // Different session should not be able to cancel this order
            await request(SERVER_URL)
                .post(`/api/orders/${cancellableOrder.documentId}/cancel`)
                .query({ sessionId: otherSessionId })
                .send(cancelData)
                .expect(403)
                .timeout(10000);
        });
    });

    describe('Guest Order Refund Processing', () => {
        let refundableOrder: any;

        beforeAll(async () => {
            // Create a new order for refund tests
            await createTestOrder();
            refundableOrder = testOrder;
        });

        it('should refund guest order successfully', async () => {
            // First, create a payment for the order
            const paymentData = {
                paymentMethod: testPaymentMethod.documentId,
                amount: 100.00,
                currency: 'USD',
                paymentType: 'manual',
                paymentNotes: 'Test payment for guest refund test'
            };

            const paymentResponse = await request(SERVER_URL)
                .post(`/api/payment/${refundableOrder.documentId}`)
                .query({ sessionId })
                .send({ data: paymentData })
                .expect(200)
                .timeout(10000);

            const payment = paymentResponse.body.data;

            // Confirm the payment as admin
            const confirmationData = {
                confirmationNotes: 'Payment confirmed for guest refund test',
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
                .query({ sessionId })
                .send(refundData)
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.status).toBe('refunded');
            expect(response.body.data.paymentStatus).toBe('refunded');
            expect(response.body.meta.message).toBe('Order refunded successfully');
        });

        it('should reject refund of non-existent order for guest', async () => {
            const refundData = {
                refundReason: 'Customer request'
            };

            await request(SERVER_URL)
                .post('/api/orders/non-existent-document-id/refund')
                .query({ sessionId })
                .send(refundData)
                .expect(404)
                .timeout(10000);
        });

        it('should reject refund of already refunded order for guest', async () => {
            // Create a new order and refund it first
            await createTestOrder();
            const newOrder = createdOrders[createdOrders.length - 1]; // Get the last created order

            // Create and confirm payment for the new order
            const paymentData = {
                paymentMethod: testPaymentMethod.documentId,
                amount: 100.00,
                currency: 'USD',
                paymentType: 'manual',
                paymentNotes: 'Test payment for guest double refund test'
            };

            const paymentResponse = await request(SERVER_URL)
                .post(`/api/payment/${newOrder.documentId}`)
                .query({ sessionId })
                .send({ data: paymentData })
                .expect(200)
                .timeout(10000);

            const payment = paymentResponse.body.data;

            // Confirm the payment as admin
            const confirmationData = {
                confirmedBy: 'admin-user-id',
                confirmationNotes: 'Payment confirmed for guest double refund test'
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
                .query({ sessionId })
                .send({ refundReason: 'Customer request' })
                .expect(200)
                .timeout(10000);

            // Try to refund again
            await request(SERVER_URL)
                .post(`/api/orders/${newOrder.documentId}/refund`)
                .query({ sessionId })
                .send({ refundReason: 'Customer request' })
                .expect(400)
                .timeout(10000);
        });

        it('should reject refund without session ID', async () => {
            const refundData = {
                refundReason: 'Customer request'
            };

            await request(SERVER_URL)
                .post(`/api/orders/${refundableOrder.documentId}/refund`)
                .send(refundData)
                .expect(403)
                .timeout(10000);
        });

        it('should reject refund of other session\'s order', async () => {
            const otherSessionId = `other-session-${timestamp}`;
            const refundData = {
                refundReason: 'Customer request'
            };

            // Different session should not be able to refund this order
            await request(SERVER_URL)
                .post(`/api/orders/${refundableOrder.documentId}/refund`)
                .query({ sessionId: otherSessionId })
                .send(refundData)
                .expect(403)
                .timeout(10000);
        });
    });

    describe('Guest Order Status Validation and Edge Cases', () => {
        it('should handle invalid order status transitions for guest', async () => {
            // Create a new order
            await createTestOrder();
            const newOrder = createdOrders[createdOrders.length - 1]; // Get the last created order

            // Create and confirm payment for the new order
            const paymentData = {
                paymentMethod: testPaymentMethod.documentId,
                amount: 100.00,
                currency: 'USD',
                paymentType: 'manual',
                paymentNotes: 'Test payment for guest status transition test'
            };

            const paymentResponse = await request(SERVER_URL)
                .post(`/api/payment/${newOrder.documentId}`)
                .query({ sessionId })
                .send({ data: paymentData })
                .expect(200)
                .timeout(10000);

            const payment = paymentResponse.body.data;

            // Confirm the payment as admin
            const confirmationData = {
                confirmedBy: 'admin-user-id',
                confirmationNotes: 'Payment confirmed for guest status transition test'
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
                .query({ sessionId })
                .send({ refundReason: 'Customer request' })
                .expect(200)
                .timeout(10000);

            // Try to cancel a refunded order (should fail)
            await request(SERVER_URL)
                .post(`/api/orders/${newOrder.documentId}/cancel`)
                .query({ sessionId })
                .send({ cancelReason: 'Customer request' })
                .expect(400)
                .timeout(10000);
        });

        it('should handle malformed order IDs for guest', async () => {
            const malformedIds = [
                'invalid-id',
                '123',
                'null',
                'undefined'
            ];

            for (const id of malformedIds) {
                await request(SERVER_URL)
                    .get(`/api/orders/${id}`)
                    .query({ sessionId })
                    .expect(404)
                    .timeout(10000);
            }
        });
    });

});
