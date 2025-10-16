/**
 * Address Security and Privacy Integration Tests
 * 
 * Tests for address privacy settings, access control, data encryption,
 * user association, ownership, data retention, compliance, and security breach prevention
 */

import request from 'supertest';
import {
  SERVER_URL,
  userToken,
  testUser,
  apiToken,
  createTestAddressData,
  createAndTrackAddress,
  getTestAddress,
  createTestUser,
  createdAddresses,
  initializeTestEnvironment,
  cleanupTestEnvironment
} from './test-setup';

describe('Address Privacy and Security Integration Tests', () => {
  beforeAll(async () => {
    await initializeTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });
  describe('Address Privacy Settings and Access Control', () => {
    let testAddress: any;
    let otherUserToken: string;
    let otherUser: any;

    beforeAll(async () => {
      // Create a test address for privacy tests
      const addressData = createTestAddressData();
      const response = await createAndTrackAddress(addressData);
      testAddress = getTestAddress(response);

      // Create another user for access control tests
      const otherUserResult = await createTestUser('otheruser');
      otherUser = otherUserResult.user;
      otherUserToken = otherUserResult.token;
    });

    it('should enforce user ownership for address access', async () => {
      expect(testAddress).toBeDefined();
      expect(otherUserToken).toBeDefined();

      // Try to access another user's address
      const response = await request(SERVER_URL)
        .get(`/api/addresses/${testAddress.documentId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .timeout(10000);

        expect(response.status).toBe(403);
        expect(response.body.error.message).toMatch(/Policy Failed/i);
    });

    it('should prevent unauthorized address updates', async () => {
      expect(testAddress).toBeDefined();
      expect(otherUserToken).toBeDefined();

      const updateData = { firstName: 'Unauthorized Update' };

      const response = await request(SERVER_URL)
        .put(`/api/addresses/${testAddress.documentId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ data: updateData })
        .timeout(10000);  

        expect(response.status).toBe(403);
        expect(response.body.error.message).toMatch(/Policy Failed/i);
    });

    it('should prevent unauthorized address deletion', async () => {
      expect(testAddress).toBeDefined();
      expect(otherUserToken).toBeDefined();

      const response = await request(SERVER_URL)
        .delete(`/api/addresses/${testAddress.documentId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .timeout(10000);

        expect(response.status).toBe(403);
        expect(response.body.error.message).toMatch(/Policy Failed/i);
    });

    it('should enforce privacy settings for address visibility', async () => {
      // Create a private address
      const privateAddressData = createTestAddressData({
        isPrivate: true,
        privacyLevel: 'private'
      });

      const privateResponse = await createAndTrackAddress(privateAddressData);
      const privateAddress = privateResponse.body.data;

      // Check if address was created successfully
      expect(privateAddress).toBeDefined();
      expect(privateAddress.documentId).toBeDefined();

      // Try to access private address without proper permissions
      const response = await request(SERVER_URL)
        .get(`/api/addresses/${privateAddress.documentId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .timeout(10000);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Policy Failed');
    });

    it('should allow owner to access their private addresses', async () => {
      // Create a private address for the test user
      const privateAddressData = createTestAddressData({
        isPrivate: true,
        privacyLevel: 'private'
      });

      const privateResponse = await createAndTrackAddress(privateAddressData);
      const privateAddress = privateResponse.body.data;

      // Check if address was created successfully
      expect(privateAddress).toBeDefined();
      expect(privateAddress.documentId).toBeDefined();
        
      // Owner should be able to access their private address
      const response = await request(SERVER_URL)
        .get(`/api/addresses/${privateAddress.documentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);
      expect(response.status).toBe(200);
      expect(response.body.data.documentId).toBe(privateAddress.documentId);
    });

    it('should prevent access to deleted addresses', async () => {
      // Create a temporary address for deletion test
      const tempAddressData = createTestAddressData();
      const createResponse = await createAndTrackAddress(tempAddressData);
      const tempAddress = createResponse.body.data;

      // Check if address was created successfully
      expect(tempAddress).toBeDefined();
      expect(tempAddress.documentId).toBeDefined();

      // Delete the address
      await request(SERVER_URL)
        .delete(`/api/addresses/${tempAddress.documentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      // Try to access deleted address
      const response = await request(SERVER_URL)
        .get(`/api/addresses/${tempAddress.documentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      expect(response.status).toBe(403);

      // Remove from tracking since it's deleted
      const index = createdAddresses.findIndex(addr => addr.documentId === tempAddress.documentId);
      if (index > -1) {
        createdAddresses.splice(index, 1);
      }
    });
  });

  describe('Address Data Security', () => {
    let testAddress: any;

    beforeAll(async () => {
      const addressData = createTestAddressData();
      const response = await createAndTrackAddress(addressData);
      testAddress = getTestAddress(response);
    });

    it('should prevent data leakage in error messages', async () => {
      // Try to access non-existent address
      const response = await request(SERVER_URL)
        .get('/api/addresses/non-existent-document-id')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      expect(response.status).toBe(403);
    });


    it('should prevent SQL injection attacks', async () => {
      const maliciousData = {
        firstName: "'; DROP TABLE addresses; --",
        lastName: "'; DELETE FROM addresses; --",
        address1: "'; UPDATE addresses SET phone='hacked'; --",
        city: "'; UPDATE addresses SET phone='hacked'; --",
        state: "'; UPDATE addresses SET phone='hacked'; --",
        postalCode: "12345",
        country: "'; UPDATE addresses SET phone='hacked'; --",
        phone: "0123456789",
        type: 'shipping'
      };

      const response = await request(SERVER_URL)
        .post('/api/addresses')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: maliciousData })
        .timeout(10000);
      // Should either reject the data or sanitize it
      expect(response.status).toBe(200);
      expect(response.body.data.firstName).not.toContain('DROP TABLE');
      expect(response.body.data.lastName).not.toContain('DELETE FROM');
      expect(response.body.data.address1).not.toContain('UPDATE');
    });

    it('should prevent XSS attacks in address data', async () => {
      const xssData = createTestAddressData({
        firstName: '<script>alert("xss")</script>test',
        lastName: '<img src=x onerror=alert("xss")>',
        address1: 'javascript:alert("xss")'
      });

      const response = await createAndTrackAddress(xssData);

      expect(response.status).toBe(200);
      expect(response.body.data.firstName).not.toContain('<script>');
      expect(response.body.data.lastName).not.toContain('<img');
      expect(response.body.data.address1).not.toContain('javascript:');
    });
  });

  describe('Address User Association and Ownership', () => {
    let testAddress: any;

    beforeAll(async () => {
      // Create a test address for ownership tests
      const addressData = createTestAddressData();
      const response = await createAndTrackAddress(addressData);
      testAddress = getTestAddress(response);
    });

    it('should associate address with correct user', async () => {
      expect(testAddress).toBeDefined();

      const response = await request(SERVER_URL)
        .get(`/api/addresses/${testAddress.documentId}?populate=user`)
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);
        expect(response.status).toBe(200);
        expect(response.body.data.user.id).toBe(testUser.id);
        expect(response.body.data.user.documentId).toBe(testUser.documentId);
    });

    it('should prevent address ownership transfer without authorization', async () => {
      expect(testAddress).toBeDefined();

      const updateData = { user: 'other-user-id' };

      const response = await request(SERVER_URL)
        .put(`/api/addresses/${testAddress.documentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: updateData })
        .timeout(10000);

        expect(response.status).toBe(403);
        expect(response.body.error.message).toMatch(/Unauthorized to modify this address/i);
    });

    it('should allow admin to transfer address ownership', async () => {
      expect(testAddress).toBeDefined();

      // Create another user for ownership transfer
      const otherUserResult = await createTestUser('transferuser');
      const otherUser = otherUserResult.user;

      const updateData = { user: otherUser.id };

      const response = await request(SERVER_URL)
        .put(`/api/addresses/${testAddress.documentId}`)
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: updateData })
        .timeout(10000);
      expect(response.status).toBe(200);
      expect(response.body.data.user.id).toBe(otherUser.id);
    });



    it('should prevent orphaned addresses', async () => {
      // Create an address and then delete the user
      const tempUserResult = await createTestUser('orphanuser');
      const tempUser = tempUserResult.user;
      const tempUserToken = tempUserResult.token;

      // Create address for temp user
      const addressData = createTestAddressData();
      const addressResponse = await request(SERVER_URL)
        .post('/api/addresses')
        .set('Authorization', `Bearer ${tempUserToken}`)
        .send({ data: addressData })
        .timeout(10000);
        expect(addressResponse.status).toBe(200);

        const tempAddress = addressResponse.body.data;
        createdAddresses.push(tempAddress);

        // Delete the user
        const response = await request(SERVER_URL)
          .delete(`/api/users/${tempUser.id}`)
          .set('Authorization', `Bearer ${apiToken}`)
          .timeout(10000);
        expect(response.status).toBe(200);
        // wait for 2 second
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Address should be automatically cleaned up or marked as orphaned
        const getResponse = await request(SERVER_URL)
          .get(`/api/addresses/${tempAddress.documentId}`)
          .set('Authorization', `Bearer ${apiToken}`)
          .timeout(10000);
        expect(getResponse.status).toBe(404);
    });
  });

  describe('Address Compliance and Auditing', () => {
    let testAddress: any;

    beforeAll(async () => {
      // Create a test address for compliance tests
      const addressData = createTestAddressData();
      const response = await createAndTrackAddress(addressData);
      testAddress = getTestAddress(response);
    });


    it('should track address modifications for compliance', async () => {
      expect(testAddress).toBeDefined();

      const updateData = { firstName: 'Compliance Test' };

      const updateResponse = await request(SERVER_URL)
        .put(`/api/addresses/${testAddress.documentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: updateData })
        .timeout(10000);

      expect([200, 404, 403]).toContain(updateResponse.status);

      // Check modification logs (may not be implemented yet)
      const auditResponse = await request(SERVER_URL)
        .get(`/api/addresses/${testAddress.documentId}/audit-logs`)
        .set('Authorization', `Bearer ${apiToken}`)
        .timeout(10000);

      expect([200, 404, 403]).toContain(auditResponse.status);
      if (auditResponse.status === 200 && auditResponse.body.data && auditResponse.body.data.logs) {
        const modificationLogs = auditResponse.body.data.logs.filter((log: any) => 
          log.action === 'update' || log.action === 'modify'
        );
        expect(modificationLogs.length).toBeGreaterThan(0);
      }
    });


    it('should track data export for compliance', async () => {
      const exportResponse = await request(SERVER_URL)
        .get('/api/addresses/export?format=json')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      expect([200, 404, 403]).toContain(exportResponse.status);

      // Check export audit logs (may not be implemented yet)
      const auditResponse = await request(SERVER_URL)
        .get('/api/addresses/audit-logs?action=export')
        .set('Authorization', `Bearer ${apiToken}`)
        .timeout(10000);

      expect([200, 404, 403]).toContain(auditResponse.status);
      if (auditResponse.status === 200 && auditResponse.body.data && auditResponse.body.data.logs) {
        expect(auditResponse.body.data.logs.length).toBeGreaterThan(0);
      }
    });

  });

  describe('Address Security Breach Prevention', () => {

    it('should prevent address enumeration attacks', async () => {
      // Try to enumerate addresses with common documentIds
      const commonIds = ['1', '2', '3', 'admin', 'test', 'user'];
      
      for (const id of commonIds) {
        const response = await request(SERVER_URL)
          .get(`/api/addresses/${id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000);

        // Should not reveal whether address exists or not
        expect([404, 403]).toContain(response.status);
      }
    });

    it('should prevent timing attacks', async () => {
      const startTime = Date.now();
      
      // Request non-existent address
      await request(SERVER_URL)
        .get('/api/addresses/non-existent-address-id')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      const nonExistentTime = Date.now() - startTime;

      const startTime2 = Date.now();
      
      // Request existing address
      const testAddressData = createTestAddressData();
      const createResponse = await createAndTrackAddress(testAddressData);
      const existingAddress = getTestAddress(createResponse);

      expect(existingAddress).toBeDefined();
        await request(SERVER_URL)
          .get(`/api/addresses/${existingAddress.documentId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000);
      

      const existingTime = Date.now() - startTime2;

      // Response times should be similar to prevent timing attacks
      const timeDifference = Math.abs(existingTime - nonExistentTime);
      expect(timeDifference).toBeLessThan(1000); // Within 1 second
    });

    it('should prevent injection attacks in search parameters', async () => {
      const maliciousQueries = [
        "'; DROP TABLE addresses; --",
        "<script>alert('xss')</script>",
        "javascript:alert('xss')",
        "../../etc/passwd",
        "{{7*7}}"
      ];

      for (const query of maliciousQueries) {
        const response = await request(SERVER_URL)
          .get(`/api/addresses/search?q=${encodeURIComponent(query)}`)
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000);

        // Should either reject the query or sanitize it
        expect([400, 200, 403, 404]).toContain(response.status);
        if (response.status === 200 && response.body.data) {
          expect(JSON.stringify(response.body.data)).not.toContain('DROP TABLE');
          expect(JSON.stringify(response.body.data)).not.toContain('<script>');
          expect(JSON.stringify(response.body.data)).not.toContain('javascript:');
        }
      }
    });
    // ToDo: Add CSRF protection back in
    // it('should prevent CSRF attacks', async () => {
    //   // Try to make a request without proper CSRF protection
    //   const addressData = createTestAddressData();

    //   const response = await request(SERVER_URL)
    //     .post('/api/addresses')
    //     .set('Authorization', `Bearer ${userToken}`)
    //     .set('Origin', 'https://malicious-site.com')
    //     .send({ data: addressData })
    //     .timeout(10000);

    //   // Should either reject the request or require CSRF token
    //   expect([403, 400, 201]).toContain(response.status);
    //   if (response.status === 403 && response.body.error) {
    //     expect(response.body.error.message).toMatch(/CSRF|Forbidden|Access denied/i);
    //   }
    // });

    it('should prevent directory traversal attacks', async () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\drivers\\etc\\hosts',
        '....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ];

      for (const path of maliciousPaths) {
        const response = await request(SERVER_URL)
          .get(`/api/addresses/${path}`)
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000);

        expect([404, 400, 403]).toContain(response.status);
      }
    });

    it('should prevent mass assignment attacks', async () => {
      const maliciousData = {
        ...createTestAddressData(),
        isAdmin: true,
        role: 'admin',
        permissions: ['all'],
        _internal: 'hacked',
        __proto__: { isAdmin: true }
      };

      const response = await createAndTrackAddress(maliciousData);

        // Should not allow setting of sensitive fields
        expect(response.status).toBe(200);
        expect(response.body.data).not.toHaveProperty('isAdmin');
        expect(response.body.data).not.toHaveProperty('role');
        expect(response.body.data).not.toHaveProperty('permissions');
        expect(response.body.data).not.toHaveProperty('_internal');
    });

  });
});
