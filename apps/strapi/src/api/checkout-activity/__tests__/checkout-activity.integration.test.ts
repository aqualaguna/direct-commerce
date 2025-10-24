/**
 * Checkout Activity Integration Tests
 * 
 * Comprehensive integration tests for Checkout Activity module covering:
 * - Activity creation and validation
 * - Bulk activity operations
 * - Session analytics and summaries
 * - Data filtering and pagination
 * - Cleanup operations (admin only)
 * - Error handling and edge cases
 * - Performance and concurrent operations
 */

import request from 'supertest';

describe('Checkout Activity Integration Tests', () => {
    const SERVER_URL = 'http://localhost:1337';
    let apiToken: string;
    let testUser: any;
    let testUserToken: string;
    let testCheckout: any;
    let testAddress: any;
    let testProduct: any;
    let testProductListing: any;
    let testCart: any;

    // Track all created users for cleanup
    const createdUsers: any[] = [];

    // Generate unique test data with timestamp
    const timestamp = Date.now();
    const testSessionId = `test-session-${timestamp}`;

    beforeAll(async () => {
        // Get admin token for authenticated requests
        apiToken = process.env.STRAPI_API_TOKEN as string;

        if (!apiToken) {
            throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
        }

        // Create test user for activity operations
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

        // Create test product listing
        const productListingData = {
            title: `Test Product Listing ${timestamp}`,
            description: 'Test product listing for checkout activity tests',
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

        // Create test address
        const addressData = {
            type: 'shipping',
            firstName: 'Test',
            lastName: 'User',
            address1: '123 Test Street',
            city: 'Test City',
            state: 'TS',
            postalCode: '12345',
            country: 'US',
            phone: '+1234567890',
        };
        const addressResponse = await request(SERVER_URL)
            .post('/api/addresses')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ data: addressData })
            .timeout(10000);

        if (addressResponse.status !== 200) {
            throw new Error(`Failed to create test address: ${addressResponse.status} - ${JSON.stringify(addressResponse.body)}`);
        }

        testAddress = addressResponse.body.data;

        // Create test cart with items
        const addItemResponse = await request(SERVER_URL)
            .post('/api/carts/items')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({
                productId: testProduct.documentId,
                productListingId: testProductListing.documentId,
                quantity: 2
            })
            .timeout(10000);

        expect(addItemResponse.status).toBe(200);
        testCart = addItemResponse.body.data.cart;

        // Create test checkout
        const checkoutData = {
            shippingAddress: testAddress.documentId,
            billingAddress: testAddress.documentId,
            shippingMethod: 'standard',
            cartItems: [testCart.items[0].documentId]
        };

        const checkoutResponse = await request(SERVER_URL)
            .post('/api/checkout')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send(checkoutData)
            .timeout(10000);

        expect(checkoutResponse.status).toBe(200);
        testCheckout = checkoutResponse.body.data;
    });

    afterAll(async () => {
        // Clean up test checkout
        // if (testCheckout?.documentId) {
        //     try {
        //         await request(SERVER_URL)
        //             .delete(`/api/checkout/${testCheckout.documentId}`)
        //             .set('Authorization', `Bearer ${apiToken}`)
        //             .expect(200)
        //             .timeout(10000);
        //     } catch (error) {
        //         console.warn('Failed to clean up test checkout:', error.message);
        //     }
        // }

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

    describe('Activity Creation and Validation', () => {
        it('should create checkout activity successfully', async () => {
            const activityData = {
                checkout: testCheckout.documentId,
                activityType: 'step_enter',
                stepName: 'cart',
                timestamp: new Date().toISOString(),
                deviceType: 'desktop',
                browser: 'Chrome',
                os: 'Windows',
                screenResolution: '1920x1080',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ipAddress: '127.0.0.1'
            };

            const response = await request(SERVER_URL)
                .post('/api/checkout-activities')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ data: activityData })
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.documentId).toBeDefined();
            expect(response.body.data.checkout).toBeDefined();
            expect(response.body.data.activityType).toBe('step_enter');
            expect(response.body.data.stepName).toBe('cart');
            expect(response.body.data.user?.id).toBe(testUser.id);
            expect(response.body.data.timestamp).toBeDefined();
        });

        it('should create form field interaction activity', async () => {
            const activityData = {
                checkout: testCheckout.documentId,
                activityType: 'form_field_focus',
                stepName: 'shipping',
                formField: 'firstName',
                formType: 'shipping',
                fieldType: 'text',
                interactionType: 'focus',
                timestamp: new Date().toISOString()
            };

            const response = await request(SERVER_URL)
                .post('/api/checkout-activities')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ data: activityData })
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.activityType).toBe('form_field_focus');
            expect(response.body.data.formField).toBe('firstName');
            expect(response.body.data.formType).toBe('shipping');
            expect(response.body.data.interactionType).toBe('focus');
        });

        it('should create validation error activity', async () => {
            const activityData = {
                checkout: testCheckout.documentId,
                activityType: 'validation_error',
                stepName: 'billing',
                formField: 'email',
                formType: 'billing',
                fieldType: 'email',
                interactionType: 'validation_error',
                activityData: {
                    errorMessage: 'Invalid email format',
                    fieldValue: 'invalid-email'
                },
                timestamp: new Date().toISOString()
            };

            const response = await request(SERVER_URL)
                .post('/api/checkout-activities')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ data: activityData })
                .expect(200)
                .timeout(10000);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.activityType).toBe('validation_error');
            expect(response.body.data.activityData).toBeDefined();
            expect(response.body.data.activityData.errorMessage).toBe('Invalid email format');
        });

        it('should reject activity creation without authentication', async () => {
            const activityData = {
                checkout: testCheckout.documentId,
                activityType: 'step_enter',
                stepName: 'cart'
            };

            await request(SERVER_URL)
                .post('/api/checkout-activities')
                .send({ data: activityData })
                .expect(403)
                .timeout(10000);
        });

        it('should reject activity creation with missing required fields', async () => {
            const invalidActivityData = {
                stepName: 'cart'
                // Missing checkout and activityType
            };

            await request(SERVER_URL)
                .post('/api/checkout-activities')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ data: invalidActivityData })
                .expect(400)
                .timeout(10000);
        });

        it('should reject activity creation with invalid activity type', async () => {
            const invalidActivityData = {
                checkout: testCheckout.documentId,
                activityType: 'invalid_type',
                stepName: 'cart'
            };

            await request(SERVER_URL)
                .post('/api/checkout-activities')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ data: invalidActivityData })
                .expect(400)
                .timeout(10000);
        });
    });

    describe('Bulk Activity Operations', () => {
        it('should create multiple activities in bulk', async () => {
            const activities = [
                {
                    checkout: testCheckout.documentId,
                    activityType: 'step_enter',
                    stepName: 'shipping',
                    timestamp: new Date().toISOString()
                },
                {
                    checkout: testCheckout.documentId,
                    activityType: 'form_field_focus',
                    stepName: 'shipping',
                    formField: 'address1',
                    formType: 'shipping',
                    fieldType: 'text',
                    interactionType: 'focus',
                    timestamp: new Date().toISOString()
                },
                {
                    checkout: testCheckout.documentId,
                    activityType: 'step_exit',
                    stepName: 'shipping',
                    stepDuration: 30000,
                    timestamp: new Date().toISOString()
                }
            ];

            const response = await request(SERVER_URL)
                .post('/api/checkout-activities/bulk')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ activities })
                .expect(200)
                .timeout(10000);

            expect(response.body.meta.message).toBeDefined();
            expect(response.body.count).toBe(3);
            expect(response.body.activities).toHaveLength(3);
            expect(response.body.activities[0].activityType).toBe('step_enter');
            expect(response.body.activities[1].activityType).toBe('form_field_focus');
            expect(response.body.activities[2].activityType).toBe('step_exit');
        });

        it('should reject bulk creation with too many activities', async () => {
            const activities = Array(1001).fill(null).map((_, index) => ({
                checkout: testCheckout.documentId,
                activityType: 'step_enter',
                stepName: 'cart',
                timestamp: new Date().toISOString()
            }));

            await request(SERVER_URL)
                .post('/api/checkout-activities/bulk')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ activities })
                .expect(400)
                .timeout(10000);
        });

        it('should reject bulk creation with empty activities array', async () => {
            await request(SERVER_URL)
                .post('/api/checkout-activities/bulk')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ activities: [] })
                .expect(400)
                .timeout(10000);
        });
    });

    describe('Activity Retrieval and Filtering', () => {
        let testActivities: any[] = [];

        beforeAll(async () => {
            // Create test activities for retrieval tests
            const activities = [
                {
                    checkout: testCheckout.documentId,
                    activityType: 'step_enter',
                    stepName: 'cart',
                    timestamp: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
                },
                {
                    checkout: testCheckout.documentId,
                    activityType: 'form_field_focus',
                    stepName: 'shipping',
                    formField: 'firstName',
                    timestamp: new Date(Date.now() - 240000).toISOString() // 4 minutes ago
                },
                {
                    checkout: testCheckout.documentId,
                    activityType: 'step_exit',
                    stepName: 'shipping',
                    timestamp: new Date(Date.now() - 180000).toISOString() // 3 minutes ago
                },
                {
                    checkout: testCheckout.documentId,
                    activityType: 'checkout_complete',
                    stepName: 'confirmation',
                    timestamp: new Date().toISOString()
                }
            ];

            for (const activityData of activities) {
                const response = await request(SERVER_URL)
                    .post('/api/checkout-activities')
                    .set('Authorization', `Bearer ${testUserToken}`)
                    .send({ data: activityData })
                    .timeout(10000);
                
                if (response.status === 200) {
                    testActivities.push(response.body.data);
                }
            }
        });

        it('should retrieve all activities for a checkout', async () => {
            const response = await request(SERVER_URL)
                .get(`/api/checkout-activities?checkout=${testCheckout.documentId}`)
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.length).toBeGreaterThanOrEqual(4);
        });

        it('should filter activities by activity type', async () => {
            const response = await request(SERVER_URL)
                .get(`/api/checkout-activities?activityType=step_enter`)
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            response.body.data.forEach((activity: any) => {
                expect(activity.activityType).toBe('step_enter');
            });
        });

        it('should filter activities by step name', async () => {
            const response = await request(SERVER_URL)
                .get(`/api/checkout-activities?stepName=shipping`)
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            response.body.data.forEach((activity: any) => {
                expect(activity.stepName).toBe('shipping');
            });
        });

        it('should filter activities by date range', async () => {
            const startDate = new Date(Date.now() - 400000).toISOString(); // 6.67 minutes ago
            const endDate = new Date(Date.now() - 200000).toISOString(); // 3.33 minutes ago

            const response = await request(SERVER_URL)
                .get(`/api/checkout-activities?startDate=${startDate}&endDate=${endDate}`)
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            response.body.data.forEach((activity: any) => {
                const activityDate = new Date(activity.timestamp);
                expect(activityDate.getTime()).toBeGreaterThanOrEqual(new Date(startDate).getTime());
                expect(activityDate.getTime()).toBeLessThanOrEqual(new Date(endDate).getTime());
            });
        });

        it('should paginate activities correctly', async () => {
            const response = await request(SERVER_URL)
                .get(`/api/checkout-activities?page=1&pageSize=2`)
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.length).toBeLessThanOrEqual(2);
        });

        it('should retrieve single activity by ID', async () => {
            if (testActivities.length > 0) {
                const activityId = testActivities[0].documentId;
                
                const response = await request(SERVER_URL)
                    .get(`/api/checkout-activities/${activityId}`)
                    .set('Authorization', `Bearer ${testUserToken}`)
                    .expect(200)
                    .timeout(10000);

                expect(response.body.data).toBeDefined();
                expect(response.body.data.documentId).toBe(activityId);
            }
        });

        it('should return 404 for non-existent activity', async () => {
            await request(SERVER_URL)
                .get('/api/checkout-activities/non-existent-id')
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(404)
                .timeout(10000);
        });
    });

    describe('Session Analytics and Summaries', () => {
        it('should get session summary for checkout session', async () => {
            // First create some activities with sessionId for analytics
            const sessionActivities = [
                {
                    checkout: testCheckout.documentId,
                    activityType: 'step_enter',
                    stepName: 'cart',
                    sessionId: testSessionId,
                    timestamp: new Date().toISOString()
                },
                {
                    checkout: testCheckout.documentId,
                    activityType: 'step_exit',
                    stepName: 'cart',
                    sessionId: testSessionId,
                    timestamp: new Date().toISOString()
                }
            ];

            // Create activities for session analytics
            for (const activityData of sessionActivities) {
                await request(SERVER_URL)
                    .post('/api/checkout-activities')
                    .set('Authorization', `Bearer ${testUserToken}`)
                    .send({ data: activityData })
                    .timeout(10000);
            }

            const response = await request(SERVER_URL)
                .get(`/api/checkout-activities/session/${testCheckout.documentId}/summary`)
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.sessionId).toBe(testCheckout.documentId);
            expect(response.body.data.totalEvents).toBeGreaterThan(0);
            expect(response.body.data.stepProgression).toBeDefined();
            expect(response.body.data.timeSpent).toBeDefined();
        });

        it('should return 404 for non-existent session summary', async () => {
            await request(SERVER_URL)
                .get('/api/checkout-activities/session/non-existent-session/summary')
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(404)
                .timeout(10000);
        });
    });

    describe('Activity Updates and Management', () => {
        let testActivity: any;

        beforeAll(async () => {
            // Create a test activity for update tests
            const activityData = {
                checkout: testCheckout.documentId,
                activityType: 'step_enter',
                stepName: 'payment',
                timestamp: new Date().toISOString()
            };

            const response = await request(SERVER_URL)
                .post('/api/checkout-activities')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ data: activityData })
                .timeout(10000);

            testActivity = response.body.data;
        });

        it('should update activity successfully', async () => {
            const updateData = {
                checkout: testCheckout.documentId,
                activityType: 'step_enter',
                stepDuration: 45000,
                activityData: {
                    updated: true,
                    reason: 'User spent more time on payment step'
                }
            };

            const response = await request(SERVER_URL)
                .put(`/api/checkout-activities/${testActivity.documentId}`)
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ data: updateData })
                .timeout(10000);
            expect(response.status).toBe(200);
            expect(response.body.meta.message).toBeDefined();
            expect(response.body.data.stepDuration).toBe(45000);
            expect(response.body.data.activityData.updated).toBe(true);
        });

        it('should reject update for non-existent activity', async () => {
            const updateData = {
                stepDuration: 30000
            };

            await request(SERVER_URL)
                .put('/api/checkout-activities/non-existent-id')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ data: updateData })
                .expect(404)
                .timeout(10000);
        });
    });

    describe('Admin Cleanup Operations', () => {
        it('should perform cleanup as admin user', async () => {
            const response = await request(SERVER_URL)
                .post('/api/checkout-activities/cleanup?days=1')
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(10000);
            expect(response.status).toBe(200);  
            expect(response.body.meta.message).toBeDefined();
            expect(response.body.data.deletedCount).toBeGreaterThanOrEqual(0);
            expect(response.body.data.daysRetained).toBe(1);
            expect(response.body.data.deletedCount).toBeGreaterThanOrEqual(0);
            expect(response.body.data.daysRetained).toBe(1);
        });

        it('should reject cleanup for non-admin users', async () => {
            await request(SERVER_URL)
                .post('/api/checkout-activities/cleanup?days=1')
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(403)
                .timeout(10000);
        });

        it('should reject cleanup without authentication', async () => {
            await request(SERVER_URL)
                .post('/api/checkout-activities/cleanup?days=1')
                .expect(403)
                .timeout(10000);
        });
    });

    describe('Performance and Concurrent Operations', () => {
        it('should handle multiple concurrent activity creations', async () => {
            const concurrentRequests = 5;
            const promises: any[] = [];

            for (let i = 0; i < concurrentRequests; i++) {
                const activityData = {
                    checkout: testCheckout.documentId,
                    activityType: 'step_enter',
                    stepName: 'cart',
                    timestamp: new Date().toISOString()
                };

                promises.push(
                    request(SERVER_URL)
                        .post('/api/checkout-activities')
                        .set('Authorization', `Bearer ${testUserToken}`)
                        .send({ data: activityData })
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

        it('should handle bulk operations efficiently', async () => {
            const startTime = Date.now();
            const activities = Array(100).fill(null).map((_, index) => ({
                checkout: testCheckout.documentId,
                activityType: 'step_enter',
                stepName: 'cart',
                timestamp: new Date().toISOString()
            }));

            const response = await request(SERVER_URL)
                .post('/api/checkout-activities/bulk')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ activities })
                .expect(200)
                .timeout(30000);

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
            expect(response.body.count).toBe(100);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle malformed activity data gracefully', async () => {
            const malformedData = {
                checkout: testCheckout.documentId,
                activityType: 'step_enter',
                stepName: 'cart',
                timestamp: 'invalid-date',
                stepDuration: -1000
            };

            await request(SERVER_URL)
                .post('/api/checkout-activities')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ data: malformedData })
                .expect(400)
                .timeout(10000);
        });

        it('should handle very large activity data objects', async () => {
            const largeActivityData = {
                checkout: testCheckout.documentId,
                activityType: 'form_submit',
                stepName: 'review',
                activityData: {
                    formData: Array(1000).fill('x').join(''),
                    metadata: {
                        largeObject: Array(100).fill({ key: 'value' })
                    }
                },
                timestamp: new Date().toISOString()
            };

            const response = await request(SERVER_URL)
                .post('/api/checkout-activities')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ data: largeActivityData })
                .timeout(10000);

            // Should either succeed or fail gracefully with appropriate error
            expect([200, 400, 413]).toContain(response.status);
        });

        it('should handle special characters in activity data', async () => {
            const specialCharData = {
                checkout: testCheckout.documentId,
                activityType: 'form_field_focus',
                stepName: 'shipping',
                formField: 'address1',
                activityData: {
                    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
                    unicode: '🚀🌟💫✨',
                    quotes: 'He said "Hello" and \'Goodbye\''
                },
                timestamp: new Date().toISOString()
            };

            const response = await request(SERVER_URL)
                .post('/api/checkout-activities')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ data: specialCharData })
                .expect(200)
                .timeout(10000);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.activityData.specialChars).toBe('!@#$%^&*()_+-=[]{}|;:,.<>?');
        });
    });
});
