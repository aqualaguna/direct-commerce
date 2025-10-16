/**
 * User Activity Integration Tests
 * 
 * Comprehensive integration tests for User Activity Tracking module covering:
 * - Activity creation and validation
 * - Activity retrieval and filtering
 * - Activity analytics and reporting
 * - Activity privacy and data retention
 * - Activity permissions and security
 * - Activity performance optimization
 * - Activity tracking middleware integration
 */

import request from 'supertest';

describe('User Activity Integration Tests', () => {
    const SERVER_URL = 'http://localhost:1337';
    let apiToken: string;
    let testUser: any;
    let testUserToken: string;
    let customerUser: any;
    let customerToken: string;

    // Generate unique test data with timestamp
    const timestamp = Date.now();

    beforeAll(async () => {
        // Get admin token for authenticated requests
        apiToken = process.env.STRAPI_API_TOKEN as string;

        if (!apiToken) {
            throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
        }

        // Create test users for activity tracking
        await createTestUsers();
    });

    async function createTestUsers() {
        // Create a test user for activity tracking
        const userData = {
            username: `activitytestuser${timestamp}`,
            email: `activitytest${timestamp}@example.com`,
            password: 'SecurePassword123!',
        };

        const userResponse = await request(SERVER_URL)
            .post('/api/auth/local/register')
            .send(userData)
            .timeout(10000);

        if (userResponse.status === 200 || userResponse.status === 201) {
            testUser = userResponse.body.user;
            testUserToken = userResponse.body.jwt;
        }

        // Create a customer user for permission testing
        const customerData = {
            username: `customeruser${timestamp}`,
            email: `customer${timestamp}@example.com`,
            password: 'CustomerPassword123!',
        };

        const customerResponse = await request(SERVER_URL)
            .post('/api/auth/local/register')
            .send(customerData)
            .timeout(10000);

        if (customerResponse.status === 200 || customerResponse.status === 201) {
            customerUser = customerResponse.body.user;
            customerToken = customerResponse.body.jwt;
        }
    }

    // Test data factories
    const createTestActivityData = (overrides = {}) => {
        if (!testUser || !testUser.id) {
            throw new Error('testUser is not properly initialized. Make sure the beforeAll setup completed successfully.');
        }
        return {
            user: testUser.id,
            activityType: 'page_view',
            activityData: {
                url: '/products',
                method: 'GET',
                timestamp: new Date().toISOString()
            },
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            location: 'New York, NY',
            deviceInfo: {
                type: 'desktop',
                os: 'Windows',
                browser: 'Chrome'
            },
            sessionId: `session_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
            sessionDuration: 300,
            success: true,
            metadata: {
                testRun: true,
                timestamp: timestamp
            },
            ...overrides,
        };
    };

    const createTestLoginActivity = (overrides = {}) => {
        if (!testUser || !testUser.id) {
            throw new Error('testUser is not properly initialized. Make sure the beforeAll setup completed successfully.');
        }
        return {
            user: testUser.id,
            activityType: 'login',
            activityData: {
                endpoint: '/api/auth/local',
                method: 'POST',
                timestamp: new Date().toISOString()
            },
            ipAddress: '192.168.1.101',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            location: 'San Francisco, CA',
            deviceInfo: {
                type: 'desktop',
                os: 'macOS',
                browser: 'Safari'
            },
            sessionId: `login_session_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
            success: true,
            metadata: {
                testRun: true,
                timestamp: timestamp
            },
            ...overrides,
        };
    };

    describe('API Health Check', () => {
        it('should be able to connect to the user-activity API', async () => {
            const response = await request(SERVER_URL)
                .get('/api/user-activities')
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(10000);

            // Should return 200 with pagination data
            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.meta.pagination).toBeDefined();
        });

        it('should handle invalid activity ID gracefully', async () => {
            const response = await request(SERVER_URL)
                .get('/api/user-activities/invalid-id')
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(10000);

            // Should return 404 (not found) for invalid ID
            expect(response.status).toBe(404);
        });

        it('should require authentication for all endpoints', async () => {
            const endpoints = [
                { method: 'GET', path: '/api/user-activities' },
                { method: 'POST', path: '/api/user-activities' },
                { method: 'GET', path: '/api/user-activities/analytics' }
            ];

            for (const endpoint of endpoints) {
                const response = await request(SERVER_URL)
                [endpoint.method.toLowerCase()](endpoint.path)
                    .timeout(10000);

                expect([401, 403]).toContain(response.status);
            }
        });
    });

    describe('Activity Creation and Validation', () => {
        it('should create user activity and verify response data', async () => {
            const activityData = createTestActivityData();

            // Create activity via API
            const response = await request(SERVER_URL)
                .post('/api/user-activities')
                .set('Authorization', `Bearer ${apiToken}`)
                .send({ data: activityData })
                .timeout(10000)
                .expect(201);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.documentId).toBeDefined();
            expect(response.body.data.activityType).toBe(activityData.activityType);
            expect(response.body.data.user.id).toBe(testUser.id);
            expect(response.body.data.success).toBe(activityData.success);
            expect(response.body.data.ipAddress).toBe('192.168.1.0'); // IP is anonymized
            expect(response.body.data.userAgent).toBe(activityData.userAgent);
            expect(response.body.data.location).toBe(activityData.location);
            expect(response.body.data.sessionId).toBe(activityData.sessionId);
            expect(response.body.data.sessionDuration).toBe(activityData.sessionDuration);
        });

        it('should create login activity with proper data structure', async () => {
            const loginActivity = createTestLoginActivity();

            const response = await request(SERVER_URL)
                .post('/api/user-activities')
                .set('Authorization', `Bearer ${apiToken}`)
                .send({ data: loginActivity })
                .timeout(10000)
                .expect(201);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.activityType).toBe('login');
            expect(response.body.data.user.id).toBe(testUser.id);
            expect(response.body.data.success).toBe(true);
            expect(response.body.data.activityData.endpoint).toBe('/api/auth/local');
        });

        it('should create failed activity with error message', async () => {
            const failedActivity = createTestActivityData({
                activityType: 'login',
                success: false,
                errorMessage: 'Invalid credentials provided',
                activityData: {
                    endpoint: '/api/auth/local',
                    method: 'POST',
                    attemptCount: 3,
                    timestamp: new Date().toISOString()
                }
            });

            const response = await request(SERVER_URL)
                .post('/api/user-activities')
                .set('Authorization', `Bearer ${apiToken}`)
                .send({ data: failedActivity })
                .timeout(10000)
                .expect(201);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.success).toBe(false);
            expect(response.body.data.errorMessage).toBe('Invalid credentials provided');
            expect(response.body.data.activityData.attemptCount).toBe(3);
        });

        it('should handle activity creation with validation errors', async () => {
            const invalidActivityData = {
                // Missing required activityType
                user: testUser.id,
                ipAddress: 'invalid-ip-address', // Invalid IP format
                sessionDuration: -1, // Invalid negative duration
            };

            const response = await request(SERVER_URL)
                .post('/api/user-activities')
                .set('Authorization', `Bearer ${apiToken}`)
                .send({ data: invalidActivityData })
                .timeout(10000)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('should create activity with different activity types', async () => {
            const activityTypes = [
                'logout',
                'profile_update',
                'preference_change',
                'product_interaction',
                'account_created',
                'password_change',
                'session_expired'
            ];

            for (const activityType of activityTypes) {
                const activityData = createTestActivityData({
                    activityType,
                    activityData: {
                        type: activityType,
                        timestamp: new Date().toISOString()
                    }
                });

                const response = await request(SERVER_URL)
                    .post('/api/user-activities')
                    .set('Authorization', `Bearer ${apiToken}`)
                    .send({ data: activityData })
                    .timeout(10000)
                    .expect(201);

                expect(response.body.data.activityType).toBe(activityType);
            }
        });

        it('should anonymize IP addresses automatically', async () => {
            const activityData = createTestActivityData({
                ipAddress: '192.168.1.100'
            });

            const response = await request(SERVER_URL)
                .post('/api/user-activities')
                .set('Authorization', `Bearer ${apiToken}`)
                .send({ data: activityData })
                .timeout(10000)
                .expect(201);

            expect(response.body.data.ipAddress).toBe('192.168.1.0'); // IP is anonymized
        });

        it('should generate session ID if not provided', async () => {
            const activityData = createTestActivityData();
            const { sessionId, ...activityDataWithoutSessionId } = activityData;

            const response = await request(SERVER_URL)
                .post('/api/user-activities')
                .set('Authorization', `Bearer ${apiToken}`)
                .send({ data: activityDataWithoutSessionId })
                .timeout(10000)
                .expect(201);

            expect(response.body.data.sessionId).toBeDefined();
            expect(typeof response.body.data.sessionId).toBe('string');
            expect(response.body.data.sessionId.length).toBeGreaterThan(0);
        });
    });

    describe('Activity Retrieval and Filtering', () => {
        let createdActivities: any[] = [];

        beforeAll(async () => {
            // Create multiple activities for testing retrieval
            const activityTypes = ['page_view', 'login', 'logout', 'profile_update'];

            for (let i = 0; i < activityTypes.length; i++) {
                const activityData = createTestActivityData({
                    activityType: activityTypes[i],
                    activityData: {
                        type: activityTypes[i],
                        index: i,
                        timestamp: new Date().toISOString()
                    }
                });

                const response = await request(SERVER_URL)
                    .post('/api/user-activities')
                    .set('Authorization', `Bearer ${apiToken}`)
                    .send({ data: activityData })
                    .timeout(10000);

                if (response.status === 201) {
                    createdActivities.push(response.body.data);
                }

                // Add delay between creations
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        });

        it('should retrieve all user activities with pagination', async () => {
            const response = await request(SERVER_URL)
                .get('/api/user-activities')
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(10000)
                .expect(200);

            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.meta.pagination).toBeDefined();
            expect(response.body.meta.pagination.page).toBe(1);
            expect(response.body.meta.pagination.pageSize).toBeDefined();
            expect(response.body.meta.pagination.total).toBeGreaterThanOrEqual(createdActivities.length);
        });

        it('should filter activities by user', async () => {
            const response = await request(SERVER_URL)
                .get(`/api/user-activities?filters[user][id][$eq]=${testUser.id}`)
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(10000)
                .expect(200);

            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);

            // All returned activities should belong to the test user
            response.body.data.forEach((activity: any) => {
                expect(activity.user.id).toBe(testUser.id);
            });
        });

        it('should filter activities by activity type', async () => {
            const response = await request(SERVER_URL)
                .get('/api/user-activities?filters[activityType][$eq]=login')
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(10000)
                .expect(200);

            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);

            // All returned activities should be login type
            response.body.data.forEach((activity: any) => {
                expect(activity.activityType).toBe('login');
            });
        });

        it('should filter activities by success status', async () => {
            const response = await request(SERVER_URL)
                .get('/api/user-activities?filters[success][$eq]=true')
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(10000)
                .expect(200);

            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);

            // All returned activities should be successful
            response.body.data.forEach((activity: any) => {
                expect(activity.success).toBe(true);
            });
        });

        it('should filter activities by date range', async () => {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const response = await request(SERVER_URL)
                .get(`/api/user-activities?filters[createdAt][$gte]=${yesterday.toISOString()}`)
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(10000)
                .expect(200);

            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);

            // All returned activities should be from yesterday or later
            response.body.data.forEach((activity: any) => {
                const activityDate = new Date(activity.createdAt);
                expect(activityDate.getTime()).toBeGreaterThanOrEqual(yesterday.getTime());
            });
        });

        it('should sort activities by creation date', async () => {
            const response = await request(SERVER_URL)
                .get('/api/user-activities?sort=createdAt:desc')
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(10000)
                .expect(200);

            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);

            // Verify activities are sorted by creation date (descending)
            for (let i = 0; i < response.body.data.length - 1; i++) {
                const current = new Date(response.body.data[i].createdAt);
                const next = new Date(response.body.data[i + 1].createdAt);
                expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
            }
        });

        it('should retrieve single activity by ID', async () => {
            if (createdActivities.length === 0) {
                console.warn('No activities created, skipping single activity test');
                return;
            }

            const activityId = createdActivities[0].documentId;

            const response = await request(SERVER_URL)
                .get(`/api/user-activities/${activityId}`)
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(10000)
                .expect(200);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.documentId).toBe(activityId);
            expect(response.body.data.user.id).toBe(testUser.id);
        });

        it('should handle pagination correctly', async () => {
            const response = await request(SERVER_URL)
                .get('/api/user-activities?pagination[page]=1&pagination[pageSize]=2')
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(10000)
                .expect(200);

            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeLessThanOrEqual(2);
            expect(response.body.meta.pagination.page).toBe(1);
            expect(response.body.meta.pagination.pageSize).toBe(2);
        });
    });

    describe('Activity Analytics and Reporting', () => {
        it('should provide analytics endpoint', async () => {
            const response = await request(SERVER_URL)
                .get('/api/user-activities/analytics')
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(10000)
                .expect(200);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.totalActivities).toBeDefined();
            expect(response.body.data.successRate).toBeDefined();
            expect(response.body.data.activityTypes).toBeDefined();
            expect(response.body.data.uniqueUsers).toBeDefined();
        });

        it('should calculate success rate for activities', async () => {
            const response = await request(SERVER_URL)
                .get('/api/user-activities/analytics')
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(10000)
                .expect(200);

            const analytics = response.body.data;
            expect(analytics.totalActivities).toBeGreaterThanOrEqual(0);
            expect(analytics.successRate).toBeGreaterThanOrEqual(0);
            expect(analytics.successRate).toBeLessThanOrEqual(100);
        });

        it('should count activities by type', async () => {
            const response = await request(SERVER_URL)
                .get('/api/user-activities/analytics')
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(10000)
                .expect(200);

            const analytics = response.body.data;
            expect(analytics.activityTypes).toBeDefined();
            expect(typeof analytics.activityTypes).toBe('object');
        });

        it('should provide date range information', async () => {
            const response = await request(SERVER_URL)
                .get('/api/user-activities/analytics')
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(10000)
                .expect(200);

            const analytics = response.body.data;
            if (analytics.totalActivities > 0) {
                expect(analytics.dateRange).toBeDefined();
                expect(analytics.dateRange.earliest).toBeDefined();
                expect(analytics.dateRange.latest).toBeDefined();
            }
        });
    });

    describe('Activity Permissions and Security', () => {
        it('should allow admin users to access all activities', async () => {
            const response = await request(SERVER_URL)
                .get('/api/user-activities')
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(10000)
                .expect(200);

            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should restrict customer users to their own activities', async () => {
            if (!customerToken) {
                console.warn('Customer token not available, skipping permission test');
                return;
            }

            const response = await request(SERVER_URL)
                .get('/api/user-activities')
                .set('Authorization', `Bearer ${customerToken}`)
                .timeout(10000)
                .expect(200);

            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);

            // All returned activities should belong to the customer user
            response.body.data.forEach((activity: any) => {
                expect(activity.user.id).toBe(customerUser.id);
            });
        });

        it('should prevent customer users from accessing other users activities', async () => {
            if (!customerToken || !testUser) {
                console.warn('Required tokens/users not available, skipping ownership test');
                return;
            }

            // Try to access test user's activities with customer token
            const response = await request(SERVER_URL)
                .get(`/api/user-activities?filters[user][id][$eq]=${testUser.id}`)
                .set('Authorization', `Bearer ${customerToken}`)
                .timeout(10000)
                .expect(200);

            // Should only return customer's own activities, not test user's
            response.body.data.forEach((activity: any) => {
                expect(activity.user.id).toBe(customerUser.id);
            });
        });

        it('should prevent unauthorized access to single activity', async () => {
            if (!customerToken || !testUser) {
                console.warn('Required tokens/users not available, skipping single activity test');
                return;
            }

            // First create an activity for test user
            const activityData = createTestActivityData();
            const createResponse = await request(SERVER_URL)
                .post('/api/user-activities')
                .set('Authorization', `Bearer ${apiToken}`)
                .send({ data: activityData })
                .timeout(10000);
            
            expect(createResponse.status).toBe(201);
            const activityId = createResponse.body.data.documentId;

            // Try to access it with customer token
            const response = await request(SERVER_URL)
                .get(`/api/user-activities/${activityId}`)
                .set('Authorization', `Bearer ${customerToken}`)
                .timeout(10000)
                .expect(403);

            expect(response.body.error).toBeDefined();
        });
    });

    describe('Activity Update and Delete Operations', () => {
        let testActivity: any;

        beforeAll(async () => {
            // Create a test activity for update/delete operations
            const activityData = createTestActivityData({
                activityType: 'profile_update',
                activityData: {
                    endpoint: '/api/users/me',
                    method: 'PUT',
                    timestamp: new Date().toISOString()
                }
            });

            const response = await request(SERVER_URL)
                .post('/api/user-activities')
                .set('Authorization', `Bearer ${apiToken}`)
                .send({ data: activityData })
                .timeout(10000);

            if (response.status === 201) {
                testActivity = response.body.data;
            }
        });

        it('should update activity with new data', async () => {
            if (!testActivity) {
                console.warn('Test activity not created, skipping update test');
                return;
            }

            const updateData = {
                activityData: {
                    endpoint: '/api/users/me',
                    method: 'PUT',
                    updated: true,
                    timestamp: new Date().toISOString()
                },
                metadata: {
                    updated: true,
                    timestamp: new Date().toISOString()
                }
            };

            const response = await request(SERVER_URL)
                .put(`/api/user-activities/${testActivity.documentId}`)
                .set('Authorization', `Bearer ${apiToken}`)
                .send({ data: updateData })
                .timeout(10000)
                .expect(200);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.activityData.updated).toBe(true);
            expect(response.body.data.metadata.updated).toBe(true);
        });

        it('should delete activity', async () => {
            if (!testActivity) {
                console.warn('Test activity not created, skipping delete test');
                return;
            }

            const response = await request(SERVER_URL)
                .delete(`/api/user-activities/${testActivity.documentId}`)
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(10000)
                .expect(204);

            // Verify activity is deleted
            const getResponse = await request(SERVER_URL)
                .get(`/api/user-activities/${testActivity.documentId}`)
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(10000)
                .expect(404);

            expect(getResponse.body.error).toBeDefined();
        });

        it('should prevent customer users from updating other users activities', async () => {
            if (!customerToken || !testUser) {
                console.warn('Required tokens/users not available, skipping update permission test');
                return;
            }

            // Create an activity for test user
            const activityData = createTestActivityData();
            const createResponse = await request(SERVER_URL)
                .post('/api/user-activities')
                .set('Authorization', `Bearer ${apiToken}`)
                .send({ data: activityData })
                .timeout(10000);

            if (createResponse.status === 201) {
                const activityId = createResponse.body.data.documentId;

                // Try to update it with customer token
                const response = await request(SERVER_URL)
                    .put(`/api/user-activities/${activityId}`)
                    .set('Authorization', `Bearer ${customerToken}`)
                    .send({ data: { activityData: { updated: true } } })
                    .timeout(10000)
                    .expect(403);

                expect(response.body.error).toBeDefined();
            }
        });
    });

    describe('Activity Tracking Middleware Integration', () => {
        it('should track login activities through auth endpoint', async () => {
            // Create a new user for login testing
            const loginUserData = {
                username: `logintestuser${timestamp}`,
                email: `logintest${timestamp}@example.com`,
                password: 'LoginTestPassword123!',
            };

            // Register user first
            const registerResponse = await request(SERVER_URL)
                .post('/api/auth/local/register')
                .send(loginUserData)
                .timeout(10000);
            expect(registerResponse.status).toBe(200);

            // Now test login
            const loginResponse = await request(SERVER_URL)
                .post('/api/auth/local')
                .send({
                    identifier: loginUserData.email,
                    password: loginUserData.password,
                })
                .timeout(10000);
            expect(loginResponse.status).toBe(200);
            expect(loginResponse.body.jwt).toBeDefined();
            expect(loginResponse.body.user).toBeDefined();

            // Wait for activity tracking to complete
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Verify login activity was tracked
            const activitiesResponse = await request(SERVER_URL)
                .get('/api/user-activities')
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(10000);

            const loginActivities = activitiesResponse.body.data.filter(
                (activity: any) =>
                    activity.activityType === 'login' &&
                    activity.user?.id === loginResponse.body.user.id &&
                    activity.success === true
            );

            expect(loginActivities.length).toBeGreaterThan(0);
            expect(loginActivities[0].activityData.endpoint).toBe('/api/auth/local');
            expect(loginActivities[0].activityData.method).toBe('POST');
        });

        it('should track failed login attempts', async () => {
            const failedLoginResponse = await request(SERVER_URL)
                .post('/api/auth/local')
                .send({
                    identifier: 'nonexistent@example.com',
                    password: 'wrongpassword',
                })
                .timeout(10000);

            expect(failedLoginResponse.status).toBe(400);

            // Wait for activity tracking to complete
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Verify failed login activity was tracked
            const activitiesResponse = await request(SERVER_URL)
                .get('/api/user-activities')
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(10000);

            const failedLoginActivities = activitiesResponse.body.data.filter(
                (activity: any) =>
                    activity.activityType === 'login' &&
                    activity.success === false
            );

            expect(failedLoginActivities.length).toBeGreaterThan(0);
            expect(failedLoginActivities[0].activityData.endpoint).toBe('/api/auth/local');
            expect(failedLoginActivities[0].activityData.method).toBe('POST');
        });
    });

    describe('Performance and Error Handling', () => {
        it('should handle large activity datasets efficiently', async () => {
            const startTime = Date.now();

            // Get all activities to test performance
            const response = await request(SERVER_URL)
                .get('/api/user-activities?pagination[pageSize]=100')
                .set('Authorization', `Bearer ${apiToken}`)
                .timeout(30000) // Longer timeout for performance test
                .expect(200);

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
        });

        it('should handle concurrent activity creation', async () => {
            const concurrentPromises: any[] = [];
            const activityCount = 5;

            // Create multiple activities concurrently
            for (let i = 0; i < activityCount; i++) {
                const activityData = createTestActivityData({
                    activityType: 'page_view',
                    activityData: {
                        concurrentIndex: i,
                        timestamp: new Date().toISOString()
                    }
                });

                const promise = request(SERVER_URL)
                    .post('/api/user-activities')
                    .set('Authorization', `Bearer ${apiToken}`)
                    .send({ data: activityData })
                    .timeout(10000);

                concurrentPromises.push(promise);
            }

            const startTime = Date.now();
            const responses = await Promise.all(concurrentPromises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Verify all activities were created successfully
            responses.forEach(response => {
                expect([200, 201]).toContain(response.status);
                if (response.status === 201) {
                    expect(response.body.data).toBeDefined();
                    expect(response.body.data.activityType).toBe('page_view');
                }
            });

            expect(duration).toBeLessThan(15000); // All concurrent operations should complete within 15 seconds
        });

        it('should handle malformed activity data gracefully', async () => {
            const malformedData = {
                user: testUser.id,
                activityType: 'page_view',
                activityData: {
                    invalidJson: '{ invalid json structure',
                    circularRef: null
                },
                // Missing required fields
            };

            const response = await request(SERVER_URL)
                .post('/api/user-activities')
                .set('Authorization', `Bearer ${apiToken}`)
                .send({ data: malformedData })
                .timeout(10000);

            // Should either succeed with sanitized data or return validation error
            expect([200, 201, 400]).toContain(response.status);
        });

        it('should handle very large activity data', async () => {
            const largeActivityData = createTestActivityData({
                activityData: {
                    largeData: 'x'.repeat(10000), // 10KB of data
                    timestamp: new Date().toISOString()
                },
                metadata: {
                    size: 'large',
                    timestamp: timestamp
                }
            });

            const response = await request(SERVER_URL)
                .post('/api/user-activities')
                .set('Authorization', `Bearer ${apiToken}`)
                .send({ data: largeActivityData })
                .timeout(15000)
                .expect(201);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.metadata.size).toBe('large');
        });
    });

    describe('Privacy and Data Retention', () => {
        it('should handle sensitive data appropriately', async () => {
            const sensitiveActivity = createTestActivityData({
                activityType: 'password_change',
                activityData: {
                    timestamp: new Date().toISOString(),
                    // Note: In real implementation, sensitive data should be hashed or excluded
                    previousPasswordHash: 'hashed_previous_password',
                    newPasswordHash: 'hashed_new_password'
                },
                metadata: {
                    securityLevel: 'high',
                    requiresAudit: true
                }
            });

            const response = await request(SERVER_URL)
                .post('/api/user-activities')
                .set('Authorization', `Bearer ${apiToken}`)
                .send({ data: sensitiveActivity })
                .timeout(10000)
                .expect(201);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.activityType).toBe('password_change');
            expect(response.body.data.metadata.securityLevel).toBe('high');
        });

        it('should anonymize IP addresses in old activities', async () => {
            // Create an activity with a specific IP
            const activityWithIP = createTestActivityData({
                ipAddress: '192.168.1.100',
                activityData: {
                    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
                }
            });

            const response = await request(SERVER_URL)
                .post('/api/user-activities')
                .set('Authorization', `Bearer ${apiToken}`)
                .send({ data: activityWithIP })
                .timeout(10000)
                .expect(201);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.ipAddress).toBe('192.168.1.0'); // IP is anonymized
        });

        it('should handle user consent for activity tracking', async () => {
            const consentActivity = createTestActivityData({
                activityType: 'preference_change',
                activityData: {
                    preference: 'activity_tracking_consent',
                    value: true,
                    timestamp: new Date().toISOString()
                },
                metadata: {
                    consentGiven: true,
                    consentDate: new Date().toISOString(),
                    gdprCompliant: true
                }
            });

            const response = await request(SERVER_URL)
                .post('/api/user-activities')
                .set('Authorization', `Bearer ${apiToken}`)
                .send({ data: consentActivity })
                .timeout(10000)
                .expect(201);

            expect(response.body.data).toBeDefined();
            expect(response.body.data.metadata.consentGiven).toBe(true);
            expect(response.body.data.metadata.gdprCompliant).toBe(true);
        });
    });
});
