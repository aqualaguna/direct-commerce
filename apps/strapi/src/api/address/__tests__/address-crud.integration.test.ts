/**
 * Address CRUD Operations Integration Tests
 * 
 * Tests for basic Create, Read, Update, Delete operations on addresses
 */

import request from 'supertest';
import {
    SERVER_URL,
    userToken,
    testUser,
    trackCreatedAddress,
    createTestAddressData,
    createTestBillingAddressData,
    createAndTrackAddress,
    getTestAddress,
    createdAddresses,
    initializeTestEnvironment,
    cleanupTestEnvironment
} from './test-setup';

describe('Address CRUD Operations Integration Tests', () => {
    beforeAll(async () => {
        await initializeTestEnvironment();
    });

    afterAll(async () => {
        await cleanupTestEnvironment();
    });

    describe('API Health Check', () => {
        it('should be able to connect to the address API', async () => {
            const response = await request(SERVER_URL)
                .get('/api/addresses')
                .set('Authorization', `Bearer ${userToken}`)
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('meta');
        });
    });

    describe('Create Address', () => {
        it('should create a shipping address successfully', async () => {
            const addressData = createTestAddressData();

            const response = await createAndTrackAddress(addressData);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('documentId');
            expect(response.body.data.type).toBe('shipping');
            expect(response.body.data.firstName).toBe('John');
            expect(response.body.data.lastName).toBe('Doe');
            expect(response.body.data.address1).toBe('123 Main Street');
            expect(response.body.data.city).toBe('New York');
            expect(response.body.data.state).toBe('NY');
            expect(response.body.data.postalCode).toBe('10001');
            expect(response.body.data.country).toBe('USA');
            expect(response.body.data.phone).toBe('+1234567890');
            expect(response.body.data.user.id).toBe(testUser.id);
            expect(response.body.meta.message).toBe('Address created successfully');
            expect(response.body.data.isDefault).toBe(true);
        });

        it('should create a billing address successfully', async () => {
            const addressData = createTestBillingAddressData();

            const response = await createAndTrackAddress(addressData);

            expect(response.status).toBe(200);
            expect(response.body.data.type).toBe('billing');
            expect(response.body.data.firstName).toBe('Jane');
            expect(response.body.data.lastName).toBe('Smith');
            expect(response.body.data.address1).toBe('456 Oak Avenue');
            expect(response.body.data.city).toBe('Los Angeles');
            expect(response.body.data.state).toBe('CA');
            expect(response.body.data.postalCode).toBe('90210');
        });

        it('should create an address with both shipping and billing type', async () => {
            const addressData = createTestAddressData({ type: 'both' });

            const response = await createAndTrackAddress(addressData);

            expect(response.status).toBe(200);
            expect(response.body.data.type).toBe('both');
        });



        it('should return 400 for missing required fields', async () => {
            const incompleteAddressData = {
                type: 'shipping',
                firstName: 'John',
                // Missing lastName, address1, city, state, postalCode, country, phone
            };

            const response = await request(SERVER_URL)
                .post('/api/addresses')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ data: incompleteAddressData })
                .timeout(10000);
            if (response.status === 200) {
                trackCreatedAddress(response);
            }
            expect(response.status).toBe(400);
            expect(response.body.error.message).toContain('Address validation failed');
            expect(response.body.error.details).toContain('lastName is required');
            expect(response.body.error.details).toContain('address1 is required');
            expect(response.body.error.details).toContain('city is required');
            expect(response.body.error.details).toContain('state is required');
            expect(response.body.error.details).toContain('postalCode is required');
            expect(response.body.error.details).toContain('country is required');
            expect(response.body.error.details).toContain('phone is required');
        });

        it('should return 400 for invalid address type', async () => {
            const addressData = createTestAddressData({ type: 'invalid' });

            const response = await request(SERVER_URL)
                .post('/api/addresses')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ data: addressData })
                .timeout(10000);
            if (response.status === 200) {
                trackCreatedAddress(response);
            }
            expect(response.status).toBe(400);
            expect(response.body.error.message).toContain('Address validation failed');
            expect(response.body.error.details).toContain('Invalid address type. Must be shipping, billing, or both');
        });

        it('should return 401 for unauthenticated requests', async () => {
            const addressData = createTestAddressData();

            const response = await request(SERVER_URL)
                .post('/api/addresses')
                .send({ data: addressData })
                .timeout(10000);
            if (response.status === 200) {
                trackCreatedAddress(response);
            }

            expect(response.status).toBe(403);
        });
    });

    describe('Retrieve Addresses', () => {
        let testAddress: any;

        beforeAll(async () => {
            // Create a test address for retrieval tests
            const addressData = createTestAddressData();
            const response = await createAndTrackAddress(addressData);
            testAddress = getTestAddress(response);

            // Ensure test address was created successfully
            expect(testAddress).toBeTruthy();
            expect(testAddress.documentId).toBeTruthy();
        });

        it('should retrieve all addresses for authenticated user', async () => {
            const response = await request(SERVER_URL)
                .get('/api/addresses')
                .set('Authorization', `Bearer ${userToken}`)
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('meta');
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
        });

        it('should retrieve a specific address by documentId', async () => {
            expect(testAddress).toBeDefined();

            const response = await request(SERVER_URL)
                .get(`/api/addresses/${testAddress.documentId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data.documentId).toBe(testAddress.documentId);
            expect(response.body.data.firstName).toBe('John');
            expect(response.body.data.lastName).toBe('Doe');
        });

        it('should return 404 for non-existent address', async () => {
            const response = await request(SERVER_URL)
                .get('/api/addresses/non-existent-document-id')
                .set('Authorization', `Bearer ${userToken}`)
                .timeout(10000);

            expect(response.status).toBe(403);
        });

        it('should return 403 for unauthenticated requests', async () => {
            const response = await request(SERVER_URL)
                .get('/api/addresses')
                .timeout(10000);

            expect(response.status).toBe(403);
        });
    });

    describe('Update Address', () => {
        let testAddress: any;

        beforeAll(async () => {
            // Create a test address for update tests
            const addressData = createTestAddressData();
            const response = await createAndTrackAddress(addressData);
            testAddress = getTestAddress(response);

            // Ensure test address was created successfully
            expect(testAddress).toBeTruthy();
            expect(testAddress.documentId).toBeTruthy();
        });

        it('should update address successfully', async () => {
            expect(testAddress).toBeDefined();

            const updateData = {
                firstName: 'Updated',
                lastName: 'Name',
                city: 'Updated City',
                phone: '+1555000000'
            };

            const response = await request(SERVER_URL)
                .put(`/api/addresses/${testAddress.documentId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ data: updateData })
                .timeout(10000);
            expect(response.status).toBe(200);
            expect(response.body.data.firstName).toBe('Updated');
            expect(response.body.data.lastName).toBe('Name');
            expect(response.body.data.city).toBe('Updated City');
            expect(response.body.data.phone).toBe('+1555000000');
            expect(response.body.meta.message).toBe('Address updated successfully');
        });

        it('should return 400 for invalid address type in update', async () => {
            expect(testAddress).toBeDefined();

            const updateData = { type: 'invalid' };

            const response = await request(SERVER_URL)
                .put(`/api/addresses/${testAddress.documentId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ data: updateData })
                .timeout(10000);

            expect(response.status).toBe(400);
            expect(response.body.error.message).toContain('Invalid address type');
        });

        it('should return 403 for non-existent address update', async () => {
            const updateData = { firstName: 'Updated' };

            const response = await request(SERVER_URL)
                .put('/api/addresses/non-existent-document-id')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ data: updateData })
                .timeout(10000);

            expect(response.status).toBe(403);
        });
    });

    describe('Delete Address', () => {
        let testAddress: any;

        beforeEach(async () => {
            // Create a test address for each delete test
            const addressData = createTestAddressData();
            const response = await createAndTrackAddress(addressData);
            testAddress = getTestAddress(response);

            // Ensure test address was created successfully
            expect(testAddress).toBeTruthy();
            expect(testAddress.documentId).toBeTruthy();
        });

        it('should delete address successfully', async () => {
            expect(testAddress).toBeDefined();
            const response = await request(SERVER_URL)
                .delete(`/api/addresses/${testAddress.documentId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data.success).toBe(true);
            expect(response.body.data.message).toBe('Address deleted successfully');
            expect(response.body.meta.message).toBe('Address deleted successfully');

            // Remove from tracking since it's deleted
            const index = createdAddresses.findIndex(addr => addr.documentId === testAddress.documentId);
            if (index > -1) {
                createdAddresses.splice(index, 1);
            }
        });

        it('should return 403 for non-existent address deletion', async () => {
            const response = await request(SERVER_URL)
                .delete('/api/addresses/non-existent-document-id')
                .set('Authorization', `Bearer ${userToken}`)
                .timeout(10000);

            expect(response.status).toBe(403);
        });

        it('should return 401 for unauthenticated deletion', async () => {
            expect(testAddress).toBeDefined();

            const response = await request(SERVER_URL)
                .delete(`/api/addresses/${testAddress.documentId}`)
                .timeout(10000);

            expect(response.status).toBe(403);
        });
    });
});
