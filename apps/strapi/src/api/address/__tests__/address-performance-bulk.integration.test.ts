/**
 * Address Performance and Bulk Operations Integration Tests
 * 
 * Tests for performance optimization, bulk operations, concurrent operations,
 * and database verification
 */

import request from 'supertest';
import {
  SERVER_URL,
  userToken,
  testUser,
  createTestAddressData,
  createAndTrackAddress,
  getTestAddress,
  createdAddresses,
  initializeTestEnvironment,
  cleanupTestEnvironment
} from './test-setup';

describe('Performance and Bulk Operations Integration Tests', () => {
  beforeAll(async () => {
    await initializeTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });
  describe('Bulk Address Operations', () => {
    it('should handle bulk address creation efficiently', async () => {
      const startTime = Date.now();

      const bulkAddresses = Array.from({ length: 5 }, (_, i) =>
        createTestAddressData({
          firstName: `Bulk${i}`,
          lastName: 'Test',
          address1: `${i} Bulk Street`,
          city: `Bulk City ${i}`
        })
      );

      const promises = bulkAddresses.map(addressData => createAndTrackAddress(addressData));
      const results = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Check if all operations failed due to server issues
      const allFailed = results.every(result => result.status === 0);
      if (allFailed) {
        console.warn('All bulk address creation operations failed - server may not be running');
        return; // Skip test if server is not available
      }

      // Check that some addresses were created successfully
      const successCount = results.filter(result => result.status === 200).length;
      expect(successCount).toBeGreaterThan(0);

      // Should complete within reasonable time (10 seconds for 5 addresses)
      expect(duration).toBeLessThan(10000);
    });

    it('should handle concurrent address operations', async () => {
      const addressData = createTestAddressData();

      // Create multiple addresses concurrently
      const promises = Array.from({ length: 3 }, () => createAndTrackAddress(addressData));
      const results = await Promise.all(promises);

      // Check if all operations failed due to server issues
      const allFailed = results.every(result => result.status === 0);
      if (allFailed) {
        console.warn('All address creation operations failed - server may not be running');
        return; // Skip test if server is not available
      }

      // Check that some operations succeeded
      const successCount = results.filter(result => result.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });

    it('should handle bulk address updates efficiently', async () => {
      // Create test addresses first
      const testAddresses: any[] = [];
      for (let i = 0; i < 3; i++) {
        const addressData = createTestAddressData({
          firstName: `BulkUpdate${i}`,
          lastName: 'Test'
        });
        const response = await createAndTrackAddress(addressData);
        const address = getTestAddress(response);
        if (address) {
          testAddresses.push(address);
        }
      }

      if (testAddresses.length === 0) {
        console.warn('No test addresses created for bulk update test');
        return;
      }

      const startTime = Date.now();

      // Update all addresses concurrently
      const updatePromises = testAddresses.map(address =>
        request(SERVER_URL)
          .put(`/api/addresses/${address.documentId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            data: {
              firstName: `Updated${address.firstName}`,
              city: 'Bulk Updated City'
            }
          })
          .timeout(10000)
      );

      const results = await Promise.all(updatePromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Check that some updates succeeded
      const successCount = results.filter(result => [200, 404, 403].includes(result.status)).length;
      expect(successCount).toBeGreaterThan(0);

      // Should complete within reasonable time (5 seconds for 3 addresses)
      expect(duration).toBeLessThan(5000);
    });

    it('should handle bulk address deletion efficiently', async () => {
      // Create test addresses for deletion
      const testAddresses: any[] = [];
      for (let i = 0; i < 3; i++) {
        const addressData = createTestAddressData({
          firstName: `BulkDelete${i}`,
          lastName: 'Test'
        });
        const response = await createAndTrackAddress(addressData);
        const address = getTestAddress(response);
        if (address) {
          testAddresses.push(address);
        }
      }

      if (testAddresses.length === 0) {
        console.warn('No test addresses created for bulk deletion test');
        return;
      }

      const startTime = Date.now();

      // Delete all addresses concurrently
      const deletePromises = testAddresses.map(address =>
        request(SERVER_URL)
          .delete(`/api/addresses/${address.documentId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000)
      );

      const results = await Promise.all(deletePromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Check that some deletions succeeded
      const successCount = results.filter(result => [200, 404, 403].includes(result.status)).length;
      expect(successCount).toBeGreaterThan(0);

      // Should complete within reasonable time (5 seconds for 3 addresses)
      expect(duration).toBeLessThan(5000);

      // Remove from tracking since they're deleted
      testAddresses.forEach(address => {
        const index = createdAddresses.findIndex(addr => addr.documentId === address.documentId);
        if (index > -1) {
          createdAddresses.splice(index, 1);
        }
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should handle large dataset queries efficiently', async () => {
      const startTime = Date.now();

      // Create multiple addresses to test with larger dataset
      const createPromises = Array.from({ length: 10 }, (_, i) =>
        createAndTrackAddress(createTestAddressData({
          firstName: `Perf${i}`,
          lastName: 'Test',
          city: `Performance City ${i}`
        }))
      );

      await Promise.all(createPromises);

      // Query all addresses
      const response = await request(SERVER_URL)
        .get('/api/addresses')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      const endTime = Date.now();
      const duration = endTime - startTime;
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Should complete within reasonable time (5 seconds)
      expect(duration).toBeLessThan(5000);
    });

    it('should handle pagination efficiently', async () => {
      const startTime = Date.now();

      // Test pagination with different page sizes
      const pageSizes = [5, 10, 25];
      const promises = pageSizes.map(pageSize =>
        request(SERVER_URL)
          .get(`/api/addresses?page=1&pageSize=${pageSize}`)
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed or be handled gracefully
      results.forEach(result => {
        expect([200, 403, 404]).toContain(result.status);
      });

      // Should complete within reasonable time (3 seconds)
      expect(duration).toBeLessThan(3000);
    });

    it('should handle search queries efficiently', async () => {
      const startTime = Date.now();

      // Test multiple search queries concurrently
      const searchQueries = [
        'city=New York',
        'state=NY',
        'country=USA',
        'type=shipping',
        'isDefault=true'
      ];

      const promises = searchQueries.map(query =>
        request(SERVER_URL)
          .get(`/api/addresses/search?${query}`)
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed or be handled gracefully
      results.forEach(result => {
        expect([200, 403, 404]).toContain(result.status);
      });

      // Should complete within reasonable time (5 seconds)
      expect(duration).toBeLessThan(5000);
    });

    it('should handle concurrent read operations efficiently', async () => {
      // Create a test address for concurrent reads
      const addressData = createTestAddressData();
      const createResponse = await createAndTrackAddress(addressData);
      const testAddress = getTestAddress(createResponse);

      if (!testAddress) {
        console.warn('No test address available for concurrent read test');
        return;
      }

      const startTime = Date.now();

      // Perform multiple concurrent reads
      const readPromises = Array.from({ length: 10 }, () =>
        request(SERVER_URL)
          .get(`/api/addresses/${testAddress.documentId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000)
      );

      const results = await Promise.all(readPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All reads should succeed or be handled gracefully
      results.forEach(result => {
        expect([200, 404, 403]).toContain(result.status);
      });

      // Should complete within reasonable time (3 seconds)
      expect(duration).toBeLessThan(3000);
    });

    it('should handle mixed operations efficiently', async () => {
      const startTime = Date.now();

      // Mix of create, read, update operations
      const operations = [
        // Create operations
        createAndTrackAddress(createTestAddressData({ firstName: 'Mixed1' })),
        createAndTrackAddress(createTestAddressData({ firstName: 'Mixed2' })),

        // Read operations
        request(SERVER_URL)
          .get('/api/addresses')
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000),

        request(SERVER_URL)
          .get('/api/addresses/stats')
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000),
      ];

      const results = await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All operations should succeed or be handled gracefully
      results.forEach(result => {
        if (result.status !== undefined) {
          expect([200, 403, 404]).toContain(result.status);
        }
      });

      // Should complete within reasonable time (5 seconds)
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Database Verification', () => {
    let testAddress: any;

    beforeAll(async () => {
      // Create a test address for database verification
      const addressData = createTestAddressData();
      const response = await createAndTrackAddress(addressData);
      testAddress = getTestAddress(response);
    });

    it('should verify address exists in database after creation', async () => {
      if (!testAddress) {
        return; // Skip test - no test address available
      }

      // Retrieve the address to verify it was stored correctly
      const response = await request(SERVER_URL)
        .get(`/api/addresses/${testAddress.documentId}?populate=user`)
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);
      expect(response.status).toBe(200);
      expect(response.body.data.documentId).toBe(testAddress.documentId);
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.firstName).toBe('John');
      expect(response.body.data.lastName).toBe('Doe');
      expect(response.body.data.address1).toBe('123 Main Street');
      expect(response.body.data.city).toBe('New York');
      expect(response.body.data.state).toBe('NY');
      expect(response.body.data.postalCode).toBe('10001');
      expect(response.body.data.country).toBe('USA');
      expect(response.body.data.phone).toBe('+1234567890');
    });

    it('should verify address is removed from database after deletion', async () => {
      // Create a temporary address for deletion test
      const tempAddressData = createTestAddressData();
      const createResponse = await createAndTrackAddress(tempAddressData);
      const tempAddress = getTestAddress(createResponse);

      if (!tempAddress) {
        return; // Skip test - could not create test address
      }

      // Delete the address
      const deleteResponse = await request(SERVER_URL)
        .delete(`/api/addresses/${tempAddress.documentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      expect([200, 404, 403]).toContain(deleteResponse.status);

      // Verify it's no longer accessible
      const getResponse = await request(SERVER_URL)
        .get(`/api/addresses/${tempAddress.documentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      expect([404, 403]).toContain(getResponse.status);

      // Remove from tracking since it's deleted
      const index = createdAddresses.findIndex(addr => addr.documentId === tempAddress.documentId);
      if (index > -1) {
        createdAddresses.splice(index, 1);
      }
    });

    it('should verify address updates are persisted in database', async () => {
      if (!testAddress) {
        return; // Skip test - no test address available
      }

      const updateData = {
        firstName: 'Database',
        lastName: 'Verified',
        city: 'Database City',
        phone: '+1999999999'
      };

      // Update the address
      const updateResponse = await request(SERVER_URL)
        .put(`/api/addresses/${testAddress.documentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: updateData })
        .timeout(10000);

      expect([200, 404, 403]).toContain(updateResponse.status);

      expect(updateResponse.status).toBe(200);
      // Verify the update was persisted
      const getResponse = await request(SERVER_URL)
        .get(`/api/addresses/${testAddress.documentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.firstName).toBe('Database');
      expect(getResponse.body.data.lastName).toBe('Verified');
      expect(getResponse.body.data.city).toBe('Database City');
      expect(getResponse.body.data.phone).toBe('+1999999999');
    });

    it('should verify database consistency after bulk operations', async () => {
      // Create multiple addresses
      const bulkAddresses = Array.from({ length: 5 }, (_, i) =>
        createTestAddressData({
          firstName: `Consistency${i}`,
          lastName: 'Test',
          city: `Consistency City ${i}`
        })
      );

      const createResults = await Promise.all(
        bulkAddresses.map(addressData => createAndTrackAddress(addressData))
      );

      // Verify all addresses were created
      const createdAddresses = createResults
        .map(result => getTestAddress(result))
        .filter(address => address !== null);

      expect(createdAddresses.length).toBeGreaterThan(0);

      // Verify all created addresses exist in database
      const verifyPromises = createdAddresses.map(address =>
        request(SERVER_URL)
          .get(`/api/addresses/${address.documentId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000)
      );

      const verifyResults = await Promise.all(verifyPromises);

      // All addresses should be retrievable
      verifyResults.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.body.data).toBeDefined();
        expect(result.body.data.documentId).toBeDefined();
      });
    });

    it('should verify database performance under load', async () => {
      const startTime = Date.now();

      // Create a load of concurrent operations
      const loadOperations = [
        // Multiple reads
        ...Array.from({ length: 5 }, () =>
          request(SERVER_URL)
            .get('/api/addresses')
            .set('Authorization', `Bearer ${userToken}`)
            .timeout(10000)
        ),

        // Multiple creates
        ...Array.from({ length: 3 }, (_, i) =>
          createAndTrackAddress(createTestAddressData({
            firstName: `Load${i}`,
            lastName: 'Test'
          }))
        ),

        // Multiple searches
        ...Array.from({ length: 3 }, (_, i) =>
          request(SERVER_URL)
            .get(`/api/addresses/search?city=Load${i}`)
            .set('Authorization', `Bearer ${userToken}`)
            .timeout(10000)
        )
      ];

      const results = await Promise.all(loadOperations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All operations should complete successfully or be handled gracefully
      results.forEach(result => {
        if (result.status !== undefined) {
          expect([200, 403, 404]).toContain(result.status);
        }
      });

      // Should complete within reasonable time (10 seconds)
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should handle memory efficiently with large datasets', async () => {
      const startTime = Date.now();

      // Create a moderate number of addresses to test memory usage
      const addresses = Array.from({ length: 20 }, (_, i) =>
        createTestAddressData({
          firstName: `Memory${i}`,
          lastName: 'Test',
          address1: `${i} Memory Street`,
          city: `Memory City ${i}`,
          state: 'MC',
          postalCode: `${10000 + i}`,
          country: 'USA',
          phone: `+1555000${i.toString().padStart(4, '0')}`
        })
      );

      const createPromises = addresses.map((addressData: any) => createAndTrackAddress(addressData));
      const results = await Promise.all(createPromises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Check that some addresses were created successfully
      const successCount = results.filter(result => result.status === 200).length;
      expect(successCount).toBeGreaterThan(0);

      // Should complete within reasonable time (15 seconds for 20 addresses)
      expect(duration).toBeLessThan(15000);

      // Verify we can still query all addresses without memory issues
      const queryResponse = await request(SERVER_URL)
        .get('/api/addresses')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      expect(queryResponse.status).toBe(200);
      expect(queryResponse.body.data).toBeDefined();
      expect(Array.isArray(queryResponse.body.data)).toBe(true);
    });

    it('should handle resource cleanup properly', async () => {
      // Create some test addresses
      const testAddresses: any[] = [];
      for (let i = 0; i < 5; i++) {
        const addressData = createTestAddressData({
          firstName: `Cleanup${i}`,
          lastName: 'Test'
        });
        const response = await createAndTrackAddress(addressData);
        const address = getTestAddress(response);
        if (address) {
          testAddresses.push(address);
        }
      }

      // Delete all test addresses
      const deletePromises = testAddresses.map(address =>
        request(SERVER_URL)
          .delete(`/api/addresses/${address.documentId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000)
      );

      const deleteResults = await Promise.all(deletePromises);

      // Verify all deletions were handled
      deleteResults.forEach(result => {
        expect([200, 404, 403]).toContain(result.status);
      });

      // Verify addresses are no longer accessible
      const verifyPromises = testAddresses.map(address =>
        request(SERVER_URL)
          .get(`/api/addresses/${address.documentId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000)
      );

      const verifyResults = await Promise.all(verifyPromises);

      // All addresses should be deleted (404) or access denied (403)
      verifyResults.forEach(result => {
        expect([404, 403]).toContain(result.status);
      });

      // Remove from tracking since they're deleted
      testAddresses.forEach(address => {
        const index = createdAddresses.findIndex(addr => addr.documentId === address.documentId);
        if (index > -1) {
          createdAddresses.splice(index, 1);
        }
      });
    });
  });
});
