/**
 * Address Guest CRUD Operations Integration Tests
 * 
 * Tests for all address API endpoints specifically for guest users (sessionId-based)
 * Covers Create, Read, Update, Delete operations and advanced features for guests
 */

import request from 'supertest';
import {
    SERVER_URL,
    createTestAddressData,
    createTestBillingAddressData,
    initializeTestEnvironment,
    cleanupTestEnvironment,
    generateGuestSessionId,
    createAndTrackGuestAddress,
    getGuestAddress,
    createdGuestAddresses
} from './test-setup';

describe('Address Guest CRUD Operations Integration Tests', () => {
    let guestSessionId: string;

    beforeAll(async () => {
        await initializeTestEnvironment();
        // Generate a unique session ID for guest user
        guestSessionId = generateGuestSessionId();
    });

    afterAll(async () => {
        await cleanupTestEnvironment();
    });


    describe('API Health Check for Guests', () => {
        it('should be able to connect to the address API as guest', async () => {
            const response = await request(SERVER_URL)
                .get('/api/addresses')
                .query({ sessionId: guestSessionId })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('meta');
        });
    });

    describe('Guest Address Creation', () => {
        it('should create a shipping address successfully for guest', async () => {
            const addressData = createTestAddressData();

            const response = await createAndTrackGuestAddress(addressData, guestSessionId);

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
            expect(response.body.data.sessionId).toBe(guestSessionId);
            expect(response.body.data.user).toBeNull();
            expect(response.body.meta.message).toBe('Address created successfully');
            expect(response.body.data.isDefault).toBe(true);
        });

        it('should create a billing address successfully for guest', async () => {
            const addressData = createTestBillingAddressData();

            const response = await createAndTrackGuestAddress(addressData, guestSessionId);

            expect(response.status).toBe(200);
            expect(response.body.data.type).toBe('billing');
            expect(response.body.data.firstName).toBe('Jane');
            expect(response.body.data.lastName).toBe('Smith');
            expect(response.body.data.address1).toBe('456 Oak Avenue');
            expect(response.body.data.city).toBe('Los Angeles');
            expect(response.body.data.state).toBe('CA');
            expect(response.body.data.postalCode).toBe('90210');
            expect(response.body.data.sessionId).toBe(guestSessionId);
            expect(response.body.data.user).toBeNull();
        });

        it('should create an address with both shipping and billing type for guest', async () => {
            const addressData = createTestAddressData({ type: 'both' });

            const response = await createAndTrackGuestAddress(addressData, guestSessionId);

            expect(response.status).toBe(200);
            expect(response.body.data.type).toBe('both');
            expect(response.body.data.sessionId).toBe(guestSessionId);
            expect(response.body.data.user).toBeNull();
        });

        it('should return 400 for missing required fields for guest', async () => {
            const incompleteAddressData = {
                type: 'shipping',
                firstName: 'John',
                // Missing lastName, address1, city, state, postalCode, country, phone
            };

            const response = await request(SERVER_URL)
                .post('/api/addresses')
                .query({ sessionId: guestSessionId })
                .send({ data: incompleteAddressData })
                .timeout(10000);

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

        it('should return 400 for invalid address type for guest', async () => {
            const addressData = createTestAddressData({ type: 'invalid' });

            const response = await request(SERVER_URL)
                .post('/api/addresses')
                .query({ sessionId: guestSessionId })
                .send({ data: addressData })
                .timeout(10000);

            expect(response.status).toBe(400);
            expect(response.body.error.message).toContain('Address validation failed');
            expect(response.body.error.details).toContain('Invalid address type. Must be shipping, billing, or both');
        });

    });

    describe('Guest Address Retrieval', () => {
        let testAddress: any;

        beforeAll(async () => {
            // Create a test address for retrieval tests
            const addressData = createTestAddressData();
            const response = await createAndTrackGuestAddress(addressData, guestSessionId);
            testAddress = getGuestAddress(response);

            // Ensure test address was created successfully
            expect(testAddress).toBeTruthy();
            expect(testAddress.documentId).toBeTruthy();
        });

        it('should retrieve all addresses for guest session', async () => {
            const response = await request(SERVER_URL)
                .get('/api/addresses')
                .query({ sessionId: guestSessionId })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('meta');
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            
            // Verify all addresses belong to the guest session
            response.body.data.forEach((address: any) => {
                expect(address.sessionId).toBe(guestSessionId);
                expect(address.user).toBeUndefined();
            });
        });

        it('should retrieve a specific address by documentId for guest', async () => {
            expect(testAddress).toBeDefined();

            const response = await request(SERVER_URL)
                .get(`/api/addresses/${testAddress.documentId}`)
                .query({ sessionId: guestSessionId })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data.documentId).toBe(testAddress.documentId);
            expect(response.body.data.firstName).toBe('John');
            expect(response.body.data.lastName).toBe('Doe');
            expect(response.body.data.sessionId).toBe(guestSessionId);
            expect(response.body.data.user).toBeUndefined();
        });

        it('should return 404 for non-existent address for guest', async () => {
            const response = await request(SERVER_URL)
                .get('/api/addresses/non-existent-document-id')
                .query({ sessionId: guestSessionId })
                .timeout(10000);

            expect(response.status).toBe(404);
        });

        it('should return 403 for guest trying to access another session\'s address', async () => {
            const otherSessionId = `other_session_${Date.now()}`;
            
            const response = await request(SERVER_URL)
                .get(`/api/addresses/${testAddress.documentId}`)
                .query({ sessionId: otherSessionId })
                .timeout(10000);

            expect(response.status).toBe(403);
        });

        it('should return 403 for guest requests without sessionId', async () => {
            const response = await request(SERVER_URL)
                .get('/api/addresses')
                .timeout(10000);

            expect(response.status).toBe(403);
        });
    });

    describe('Guest Address Update', () => {
        let testAddress: any;

        beforeAll(async () => {
            // Create a test address for update tests
            const addressData = createTestAddressData();
            const response = await createAndTrackGuestAddress(addressData, guestSessionId);
            testAddress = getGuestAddress(response);

            // Ensure test address was created successfully
            expect(testAddress).toBeTruthy();
            expect(testAddress.documentId).toBeTruthy();
        });

        it('should update address successfully for guest', async () => {
            expect(testAddress).toBeDefined();

            const updateData = {
                firstName: 'Updated',
                lastName: 'Name',
                city: 'Updated City',
                phone: '+1555000000'
            };

            const response = await request(SERVER_URL)
                .put(`/api/addresses/${testAddress.documentId}`)
                .query({ sessionId: guestSessionId })
                .send({ data: updateData })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data.firstName).toBe('Updated');
            expect(response.body.data.lastName).toBe('Name');
            expect(response.body.data.city).toBe('Updated City');
            expect(response.body.data.phone).toBe('+1555000000');
            expect(response.body.data.sessionId).toBe(guestSessionId);
            expect(response.body.data.user).toBeNull();
            expect(response.body.meta.message).toBe('Address updated successfully');
        });

        it('should return 400 for invalid address type in update for guest', async () => {
            expect(testAddress).toBeDefined();

            const updateData = { type: 'invalid' };

            const response = await request(SERVER_URL)
                .put(`/api/addresses/${testAddress.documentId}`)
                .query({ sessionId: guestSessionId })
                .send({ data: updateData })
                .timeout(10000);

            expect(response.status).toBe(400);
            expect(response.body.error.message).toContain('Invalid address type');
        });

        it('should return 404 for non-existent address update for guest', async () => {
            const updateData = { firstName: 'Updated' };

            const response = await request(SERVER_URL)
                .put('/api/addresses/non-existent-document-id')
                .query({ sessionId: guestSessionId })
                .send({ data: updateData })
                .timeout(10000);

            expect(response.status).toBe(404);
        });

        it('should return 403 for guest trying to update another session\'s address', async () => {
            const otherSessionId = `other_session_${Date.now()}`;
            const updateData = { firstName: 'Updated' };

            const response = await request(SERVER_URL)
                .put(`/api/addresses/${testAddress.documentId}`)
                .query({ sessionId: otherSessionId })
                .send({ data: updateData })
                .timeout(10000);

            expect(response.status).toBe(403);
        });
    });

    describe('Guest Address Deletion', () => {
        let testAddress: any;

        beforeEach(async () => {
            // Create a test address for each delete test
            const addressData = createTestAddressData();
            const response = await createAndTrackGuestAddress(addressData, guestSessionId);
            testAddress = getGuestAddress(response);

            // Ensure test address was created successfully
            expect(testAddress).toBeTruthy();
            expect(testAddress.documentId).toBeTruthy();
        });

        it('should delete address successfully for guest', async () => {
            expect(testAddress).toBeDefined();
            const response = await request(SERVER_URL)
                .delete(`/api/addresses/${testAddress.documentId}`)
                .query({ sessionId: guestSessionId })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data.success).toBe(true);
            expect(response.body.data.message).toBe('Address deleted successfully');
            expect(response.body.meta.message).toBe('Address deleted successfully');

            // Remove from tracking since it's deleted
            const index = createdGuestAddresses.findIndex(addr => addr.documentId === testAddress.documentId);
            if (index > -1) {
                createdGuestAddresses.splice(index, 1);
            }
        });

        it('should return 404 for non-existent address deletion for guest', async () => {
            const response = await request(SERVER_URL)
                .delete('/api/addresses/non-existent-document-id')
                .query({ sessionId: guestSessionId })
                .timeout(10000);

            expect(response.status).toBe(404);
        });

        it('should return 403 for guest trying to delete another session\'s address', async () => {
            const otherSessionId = `other_session_${Date.now()}`;

            const response = await request(SERVER_URL)
                .delete(`/api/addresses/${testAddress.documentId}`)
                .query({ sessionId: otherSessionId })
                .timeout(10000);

            expect(response.status).toBe(403);
        });

        it('should return 403 for guest deletion without sessionId', async () => {
            expect(testAddress).toBeDefined();

            const response = await request(SERVER_URL)
                .delete(`/api/addresses/${testAddress.documentId}`)
                .timeout(10000);

            expect(response.status).toBe(403);
        });
    });

    describe('Guest Address Type Management', () => {
        let shippingAddress: any;
        let billingAddress: any;

        beforeAll(async () => {
            // Create shipping address
            const shippingData = createTestAddressData({ type: 'shipping' });
            const shippingResponse = await createAndTrackGuestAddress(shippingData, guestSessionId);
            shippingAddress = getGuestAddress(shippingResponse);

            // Create billing address
            const billingData = createTestBillingAddressData({ type: 'billing' });
            const billingResponse = await createAndTrackGuestAddress(billingData, guestSessionId);
            billingAddress = getGuestAddress(billingResponse);
        });

        it('should find addresses by type for guest', async () => {
            const response = await request(SERVER_URL)
                .get('/api/addresses/type/shipping')
                .query({ sessionId: guestSessionId })
                .timeout(10000);
            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.meta.type).toBe('shipping');
            
            // Verify all returned addresses are shipping type
            response.body.data.forEach((address: any) => {
                expect(['shipping', 'both']).toContain(address.type);
                expect(address.sessionId).toBe(guestSessionId);
                expect(address.user).toBeNull();
            });
        });

        it('should find addresses by billing type for guest', async () => {
            const response = await request(SERVER_URL)
                .get('/api/addresses/type/billing')
                .query({ sessionId: guestSessionId })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.meta.type).toBe('billing');
            
            // Verify all returned addresses are billing type
            response.body.data.forEach((address: any) => {
                expect(['billing', 'both']).toContain(address.type);
                expect(address.sessionId).toBe(guestSessionId);
                expect(address.user).toBeNull();
            });
        });

        it('should find addresses by both type for guest', async () => {
            const response = await request(SERVER_URL)
                .get('/api/addresses/type/both')
                .query({ sessionId: guestSessionId })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.meta.type).toBe('both');
            
            // Verify all returned addresses are both type
            response.body.data.forEach((address: any) => {
                // can be shipping or billing or both
                expect(['shipping', 'billing', 'both']).toContain(address.type);
                expect(address.sessionId).toBe(guestSessionId);
                expect(address.user).toBeNull();
            });
        });

        it('should return 400 for invalid address type for guest', async () => {
            const response = await request(SERVER_URL)
                .get('/api/addresses/type/invalid')
                .query({ sessionId: guestSessionId })
                .timeout(10000);

            expect(response.status).toBe(400);
            expect(response.body.error.message).toContain('Invalid address type');
        });

        it('should get default address by type for guest', async () => {
            const response = await request(SERVER_URL)
                .get('/api/addresses/default/shipping')
                .query({ sessionId: guestSessionId })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.meta.type).toBe('shipping');
            
            if (response.body.data) {
                expect(['shipping', 'both']).toContain(response.body.data.type);
                expect(response.body.data.sessionId).toBe(guestSessionId);
                expect(response.body.data.user).toBeNull();
            }
        });

        it('should set address as default for guest', async () => {
            expect(shippingAddress).toBeDefined();

            const response = await request(SERVER_URL)
                .post(`/api/addresses/${shippingAddress.documentId}/set-default`)
                .query({ sessionId: guestSessionId })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.meta.message).toContain('set as default successfully');
        });
    });

    describe('Guest Address Search and Filtering', () => {
        beforeAll(async () => {
            // Create multiple addresses for search tests
            await createAndTrackGuestAddress(createTestAddressData({ 
                city: 'New York', 
                state: 'NY', 
                country: 'USA' 
            }), guestSessionId);
            await createAndTrackGuestAddress(createTestAddressData({ 
                city: 'Los Angeles', 
                state: 'CA', 
                country: 'USA' 
            }), guestSessionId);
            await createAndTrackGuestAddress(createTestBillingAddressData({ 
                city: 'Chicago', 
                state: 'IL', 
                country: 'USA' 
            }), guestSessionId);
        });

        it('should search addresses with filters for guest', async () => {
            const response = await request(SERVER_URL)
                .post('/api/addresses/search')
                .query({ 
                    sessionId: guestSessionId,
                    city: 'New York',
                    type: 'shipping'
                })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
            
            // Verify all returned addresses match the search criteria
            response.body.data.forEach((address: any) => {
                expect(address.sessionId).toBe(guestSessionId);
                expect(address.user).toBeNull();
                expect(address.city).toContain('New York');
                expect(['shipping', 'both']).toContain(address.type);
            });
        });

        it('should search addresses by state for guest', async () => {
            const response = await request(SERVER_URL)
                .post('/api/addresses/search')
                .query({ 
                    sessionId: guestSessionId,
                    state: 'CA'
                })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
            
            response.body.data.forEach((address: any) => {
                expect(address.sessionId).toBe(guestSessionId);
                expect(address.user).toBeNull();
                expect(address.state).toContain('CA');
            });
        });

        it('should search addresses by country for guest', async () => {
            const response = await request(SERVER_URL)
                .post('/api/addresses/search')
                .query({ 
                    sessionId: guestSessionId,
                    country: 'USA'
                })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
            
            response.body.data.forEach((address: any) => {
                expect(address.sessionId).toBe(guestSessionId);
                expect(address.user).toBeNull();
                expect(address.country).toContain('USA');
            });
        });
    });

    describe('Guest Address Statistics', () => {
        beforeAll(async () => {
            // Create various addresses for statistics tests
            await createAndTrackGuestAddress(createTestAddressData({ type: 'shipping' }), guestSessionId);
            await createAndTrackGuestAddress(createTestBillingAddressData({ type: 'billing' }), guestSessionId);
            await createAndTrackGuestAddress(createTestAddressData({ type: 'both' }), guestSessionId);
        });

        it('should get address statistics for guest', async () => {
            const response = await request(SERVER_URL)
                .post('/api/addresses/stats')
                .query({ sessionId: guestSessionId })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.data).toHaveProperty('total');
            expect(response.body.data).toHaveProperty('shipping');
            expect(response.body.data).toHaveProperty('billing');
            expect(response.body.data).toHaveProperty('defaults');
            expect(response.body.meta.message).toContain('statistics retrieved successfully');
        });
    });

    describe('Guest Address Validation', () => {
        it('should validate address data for guest', async () => {
            const addressData = createTestAddressData();

            const response = await request(SERVER_URL)
                .post('/api/addresses/validate')
                .query({ sessionId: guestSessionId })
                .send({ data: addressData })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.isValid).toBe(true);
            expect(response.body.meta.message).toContain('Address is valid');
        });

        it('should validate address for specific country for guest', async () => {
            const addressData = createTestAddressData({ country: 'USA' });

            const response = await request(SERVER_URL)
                .post('/api/addresses/validate/USA')
                .query({ sessionId: guestSessionId })
                .send({ data: addressData })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.meta.country).toBe('USA');
        });

        it('should return 400 for invalid address data for guest', async () => {
            const invalidAddressData = {
                type: 'shipping',
                firstName: 'John',
                // Missing required fields
            };

            const response = await request(SERVER_URL)
                .post('/api/addresses/validate')
                .query({ sessionId: guestSessionId })
                .send({ data: invalidAddressData })
                .timeout(10000);

            expect(response.status).toBe(400);
            expect(response.body.data.isValid).toBe(false);
            expect(response.body.meta.message).toContain('Address validation failed');
        });
    });

    describe('Guest Address Book', () => {
        beforeAll(async () => {
            // Create multiple addresses for address book tests
            await createAndTrackGuestAddress(createTestAddressData({ type: 'shipping' }), guestSessionId);
            await createAndTrackGuestAddress(createTestBillingAddressData({ type: 'billing' }), guestSessionId);
            await createAndTrackGuestAddress(createTestAddressData({ type: 'both' }), guestSessionId);
        });

        it('should get address book for guest', async () => {
            const response = await request(SERVER_URL)
                .post('/api/addresses/book')
                .query({ sessionId: guestSessionId })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.addresses).toHaveProperty('shipping');
            expect(response.body.data.addresses).toHaveProperty('billing');
            expect(response.body.data.addresses).toHaveProperty('all');
            expect(response.body.data).toHaveProperty('stats');
            expect(response.body.meta.message).toContain('Address book retrieved successfully');

        });
    });

    describe('Guest Address Export/Import', () => {
        it('should export addresses as JSON for guest', async () => {
            const response = await request(SERVER_URL)
                .post('/api/addresses/export')
                .query({ 
                    sessionId: guestSessionId,
                    format: 'json'
                })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.meta.message).toContain('exported successfully');
        });

        it('should export addresses as CSV for guest', async () => {
            const response = await request(SERVER_URL)
                .post('/api/addresses/export')
                .query({ 
                    sessionId: guestSessionId,
                    format: 'csv'
                })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('text/csv');
            expect(response.headers['content-disposition']).toContain('attachment');
        });

        it('should import addresses for guest', async () => {
            const addressesToImport = [
                createTestAddressData({ firstName: 'Imported', lastName: 'User1' }),
                createTestBillingAddressData({ firstName: 'Imported', lastName: 'User2' })
            ];

            const response = await request(SERVER_URL)
                .post('/api/addresses/import')
                .query({ sessionId: guestSessionId })
                .send({ addresses: addressesToImport })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.success).toBeGreaterThan(0);
            expect(response.body.meta.message).toContain('Import completed');
        });

        it('should return 400 for invalid import format for guest', async () => {
            const response = await request(SERVER_URL)
                .post('/api/addresses/import')
                .query({ sessionId: guestSessionId })
                .send({ addresses: 'invalid' })
                .timeout(10000);

            expect(response.status).toBe(400);
            expect(response.body.error.message).toContain('Addresses array is required');
        });

        it('should return 400 for too many addresses in import for guest', async () => {
            const tooManyAddresses = Array(101).fill(createTestAddressData());

            const response = await request(SERVER_URL)
                .post('/api/addresses/import')
                .query({ sessionId: guestSessionId })
                .send({ addresses: tooManyAddresses })
                .timeout(10000);

            expect(response.status).toBe(400);
            expect(response.body.error.message).toContain('Maximum 100 addresses');
        });
    });

    describe('Guest Address Analytics', () => {
        it('should get address analytics for guest', async () => {
            const response = await request(SERVER_URL)
                .post('/api/addresses/analytics')
                .query({ sessionId: guestSessionId })
                .timeout(10000);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.meta.message).toContain('analytics retrieved successfully');
        });
    });

    describe('Guest Session Isolation', () => {
        it('should isolate addresses between different guest sessions', async () => {
            const otherSessionId = `other_guest_session_${Date.now()}`;
            
            // Create address for first session
            const addressData1 = createTestAddressData({ firstName: 'Session1' });
            const response1 = await createAndTrackGuestAddress(addressData1, guestSessionId);
            const address1 = getGuestAddress(response1);

            // Create address for second session
            const addressData2 = createTestAddressData({ firstName: 'Session2' });
            const response2 = await request(SERVER_URL)
                .post('/api/addresses')
                .query({ sessionId: otherSessionId })
                .send({ data: addressData2 })
                .timeout(10000);
            
            expect(response2.status).toBe(200);
            const address2 = response2.body.data;

            // Verify first session can only see its own addresses
            const session1Response = await request(SERVER_URL)
                .get('/api/addresses')
                .query({ sessionId: guestSessionId })
                .timeout(10000);

            expect(session1Response.status).toBe(200);
            session1Response.body.data.forEach((address: any) => {
                expect(address.sessionId).toBe(guestSessionId);
                expect(address.documentId).not.toBe(address2.documentId);
            });

            // Verify second session can only see its own addresses
            const session2Response = await request(SERVER_URL)
                .get('/api/addresses')
                .query({ sessionId: otherSessionId })
                .timeout(10000);

            expect(session2Response.status).toBe(200);
            session2Response.body.data.forEach((address: any) => {
                expect(address.sessionId).toBe(otherSessionId);
                expect(address.documentId).not.toBe(address1.documentId);
            });

            // Clean up second session address
            try {
                await request(SERVER_URL)
                    .delete(`/api/addresses/${address2.documentId}`)
                    .query({ sessionId: otherSessionId })
                    .timeout(10000);
            } catch (error) {
                // Cleanup failed, but test is still valid
            }
        });
    });
});
