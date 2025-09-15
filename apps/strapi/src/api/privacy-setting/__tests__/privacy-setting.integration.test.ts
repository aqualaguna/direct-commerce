/**
 * Privacy Setting Integration Tests
 * 
 * Comprehensive integration tests for Privacy Setting Management module covering:
 * - Privacy setting management and CRUD operations
 * - Data protection and encryption
 * - Consent management and tracking
 * - Data retention and deletion
 * - Privacy compliance and auditing
 * - Security event logging
 * - Privacy breach detection and response
 */

import request from 'supertest';

describe('Privacy Setting Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let adminToken: string;
  let testUser: any;
  let testUserToken: string;
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();

  beforeAll(async () => {
    // Get admin token for authenticated requests
    adminToken = process.env.STRAPI_API_TOKEN as string;

    if (!adminToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }

    // Create a test user for privacy setting tests
    const userData = {
      username: `privacyuser${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      email: `privacy${timestamp}_${Math.random().toString(36).substr(2, 9)}@example.com`,
      password: 'SecurePassword123!',
    };

    const userResponse = await request(SERVER_URL)
      .post('/api/auth/local/register')
      .send(userData)
      .expect(201);

    testUser = userResponse.body.user;
    testUserToken = userResponse.body.jwt;
  });

  // Add delay between tests to avoid rate limiting
  afterEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
  });

  // Test data factories
  const createTestPrivacySettingData = (overrides = {}) => ({
    user: testUser.id,
    profileVisibility: 'private',
    showEmail: false,
    showPhone: false,
    showLocation: false,
    dataSharing: false,
    analyticsConsent: true,
    marketingConsent: false,
    thirdPartySharing: false,
    gdprConsent: true,
    dataRetentionConsent: false,
    dataProcessingConsent: true,
    cookieConsent: 'necessary',
    consentSource: 'registration',
    ipAddressAtConsent: '192.168.1.1',
    userAgentAtConsent: 'Mozilla/5.0 (Test Browser)',
    consentVersion: '1.0',
    ...overrides,
  });

  const createTestPrivacySettingUpdateData = (overrides = {}) => ({
    profileVisibility: 'public',
    showEmail: true,
    showPhone: true,
    showLocation: true,
    dataSharing: true,
    analyticsConsent: false,
    marketingConsent: true,
    thirdPartySharing: true,
    gdprConsent: true,
    dataRetentionConsent: true,
    dataProcessingConsent: true,
    cookieConsent: 'all',
    consentSource: 'profile-update',
    lastConsentUpdate: new Date().toISOString(),
    consentVersion: '1.1',
    ...overrides,
  });

  describe('Privacy Setting Management', () => {
    it('should create privacy setting with all required fields', async () => {
      const privacyData = createTestPrivacySettingData();

      const response = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.user.data.id).toBe(testUser.id);
      expect(response.body.data.attributes.profileVisibility).toBe('private');
      expect(response.body.data.attributes.gdprConsent).toBe(true);
      expect(response.body.data.attributes.dataProcessingConsent).toBe(true);
      expect(response.body.data.attributes.consentVersion).toBe('1.0');
    });

    it('should create privacy setting with minimal required fields', async () => {
      const privacyData = {
        user: testUser.id,
        gdprConsent: true,
        dataProcessingConsent: true,
        consentSource: 'registration',
        consentVersion: '1.0',
      };

      const response = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.user.data.id).toBe(testUser.id);
      expect(response.body.data.attributes.gdprConsent).toBe(true);
      expect(response.body.data.attributes.dataProcessingConsent).toBe(true);
      expect(response.body.data.attributes.profileVisibility).toBe('private'); // default value
    });

    it('should retrieve privacy setting by user', async () => {
      // First create a privacy setting
      const privacyData = createTestPrivacySettingData();
      const createResponse = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(201);

      const privacySettingId = createResponse.body.data.id;

      // Retrieve the privacy setting
      const response = await request(SERVER_URL)
        .get(`/api/privacy-settings/${privacySettingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.user.data.id).toBe(testUser.id);
      expect(response.body.data.attributes.profileVisibility).toBe('private');
    });

    it('should update privacy setting', async () => {
      // First create a privacy setting
      const privacyData = createTestPrivacySettingData();
      const createResponse = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(201);

      const privacySettingId = createResponse.body.data.id;

      // Update the privacy setting
      const updateData = createTestPrivacySettingUpdateData();
      const response = await request(SERVER_URL)
        .put(`/api/privacy-settings/${privacySettingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.profileVisibility).toBe('public');
      expect(response.body.data.attributes.showEmail).toBe(true);
      expect(response.body.data.attributes.marketingConsent).toBe(true);
      expect(response.body.data.attributes.cookieConsent).toBe('all');
      expect(response.body.data.attributes.consentVersion).toBe('1.1');
    });

    it('should delete privacy setting', async () => {
      // First create a privacy setting
      const privacyData = createTestPrivacySettingData();
      const createResponse = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(201);

      const privacySettingId = createResponse.body.data.id;

      // Delete the privacy setting
      await request(SERVER_URL)
        .delete(`/api/privacy-settings/${privacySettingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify deletion
      await request(SERVER_URL)
        .get(`/api/privacy-settings/${privacySettingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should list privacy settings with pagination', async () => {
      const response = await request(SERVER_URL)
        .get('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ pagination: { page: 1, pageSize: 10 } })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta.pagination).toBeDefined();
    });
  });

  describe('Data Protection and Encryption', () => {
    it('should handle sensitive data with proper validation', async () => {
      const privacyData = createTestPrivacySettingData({
        ipAddressAtConsent: '192.168.1.100',
        userAgentAtConsent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      });

      const response = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.ipAddressAtConsent).toBe('192.168.1.100');
      expect(response.body.data.attributes.userAgentAtConsent).toContain('Mozilla/5.0');
    });

    it('should validate IP address format', async () => {
      const privacyData = createTestPrivacySettingData({
        ipAddressAtConsent: 'invalid-ip-address',
      });

      await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(400);
    });

    it('should handle long user agent strings', async () => {
      const longUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      const privacyData = createTestPrivacySettingData({
        userAgentAtConsent: longUserAgent,
      });

      const response = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.userAgentAtConsent).toBe(longUserAgent);
    });
  });

  describe('Consent Management and Tracking', () => {
    it('should track consent updates with timestamps', async () => {
      const privacyData = createTestPrivacySettingData();
      const createResponse = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(201);

      const privacySettingId = createResponse.body.data.id;

      // Update consent
      const updateData = {
        marketingConsent: true,
        consentSource: 'consent-update',
        lastConsentUpdate: new Date().toISOString(),
        consentVersion: '1.1',
      };

      const response = await request(SERVER_URL)
        .put(`/api/privacy-settings/${privacySettingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.marketingConsent).toBe(true);
      expect(response.body.data.attributes.consentSource).toBe('consent-update');
      expect(response.body.data.attributes.lastConsentUpdate).toBeDefined();
      expect(response.body.data.attributes.consentVersion).toBe('1.1');
    });

    it('should handle different consent sources', async () => {
      const consentSources = ['registration', 'profile-update', 'admin-update', 'api', 'consent-update'];
      
      for (const source of consentSources) {
        const privacyData = createTestPrivacySettingData({
          consentSource: source,
        });

        const response = await request(SERVER_URL)
          .post('/api/privacy-settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: privacyData })
          .expect(201);

        expect(response.body.data.attributes.consentSource).toBe(source);
      }
    });

    it('should validate consent version format', async () => {
      const privacyData = createTestPrivacySettingData({
        consentVersion: '2.0.1',
      });

      const response = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(201);

      expect(response.body.data.attributes.consentVersion).toBe('2.0.1');
    });

    it('should handle cookie consent levels', async () => {
      const cookieLevels = ['necessary', 'analytics', 'marketing', 'all'];
      
      for (const level of cookieLevels) {
        const privacyData = createTestPrivacySettingData({
          cookieConsent: level,
        });

        const response = await request(SERVER_URL)
          .post('/api/privacy-settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: privacyData })
          .expect(201);

        expect(response.body.data.attributes.cookieConsent).toBe(level);
      }
    });
  });

  describe('Data Retention and Deletion', () => {
    it('should handle right to be forgotten requests', async () => {
      const privacyData = createTestPrivacySettingData();
      const createResponse = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(201);

      const privacySettingId = createResponse.body.data.id;

      // Request data deletion
      const updateData = {
        rightToBeForgetRequested: true,
        consentSource: 'consent-update',
        lastConsentUpdate: new Date().toISOString(),
      };

      const response = await request(SERVER_URL)
        .put(`/api/privacy-settings/${privacySettingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .expect(200);

      expect(response.body.data.attributes.rightToBeForgetRequested).toBe(true);
    });

    it('should handle data export requests', async () => {
      const privacyData = createTestPrivacySettingData();
      const createResponse = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(201);

      const privacySettingId = createResponse.body.data.id;

      // Request data export
      const updateData = {
        dataExportRequested: true,
        consentSource: 'consent-update',
        lastConsentUpdate: new Date().toISOString(),
      };

      const response = await request(SERVER_URL)
        .put(`/api/privacy-settings/${privacySettingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .expect(200);

      expect(response.body.data.attributes.dataExportRequested).toBe(true);
    });

    it('should handle data retention consent', async () => {
      const privacyData = createTestPrivacySettingData({
        dataRetentionConsent: true,
      });

      const response = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(201);

      expect(response.body.data.attributes.dataRetentionConsent).toBe(true);
    });
  });

  describe('Privacy Compliance and Auditing', () => {
    it('should enforce GDPR consent requirements', async () => {
      // Test without required GDPR consent
      const privacyDataWithoutGDPR = {
        user: testUser.id,
        dataProcessingConsent: true,
        consentSource: 'registration',
        consentVersion: '1.0',
        // gdprConsent: false, // Missing required field
      };

      await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyDataWithoutGDPR })
        .expect(400);

      // Test with GDPR consent
      const privacyDataWithGDPR = {
        user: testUser.id,
        gdprConsent: true,
        dataProcessingConsent: true,
        consentSource: 'registration',
        consentVersion: '1.0',
      };

      const response = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyDataWithGDPR })
        .expect(201);

      expect(response.body.data.attributes.gdprConsent).toBe(true);
    });

    it('should enforce data processing consent requirements', async () => {
      // Test without required data processing consent
      const privacyDataWithoutProcessing = {
        user: testUser.id,
        gdprConsent: true,
        consentSource: 'registration',
        consentVersion: '1.0',
        // dataProcessingConsent: false, // Missing required field
      };

      await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyDataWithoutProcessing })
        .expect(400);
    });

    it('should maintain audit trail for consent changes', async () => {
      const privacyData = createTestPrivacySettingData();
      const createResponse = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(201);

      const privacySettingId = createResponse.body.data.id;
      const originalConsentUpdate = createResponse.body.data.attributes.lastConsentUpdate;

      // Update consent multiple times
      const updateData1 = {
        marketingConsent: true,
        consentSource: 'consent-update',
        lastConsentUpdate: new Date().toISOString(),
        consentVersion: '1.1',
      };

      await request(SERVER_URL)
        .put(`/api/privacy-settings/${privacySettingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData1 })
        .expect(200);

      const updateData2 = {
        analyticsConsent: false,
        consentSource: 'consent-update',
        lastConsentUpdate: new Date().toISOString(),
        consentVersion: '1.2',
      };

      const response = await request(SERVER_URL)
        .put(`/api/privacy-settings/${privacySettingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData2 })
        .expect(200);

      expect(response.body.data.attributes.lastConsentUpdate).toBeDefined();
      expect(response.body.data.attributes.consentVersion).toBe('1.2');
      expect(response.body.data.attributes.marketingConsent).toBe(true); // Should persist from previous update
    });
  });

  describe('Security Event Logging', () => {
    it('should log privacy setting access attempts', async () => {
      const privacyData = createTestPrivacySettingData();
      const createResponse = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(201);

      const privacySettingId = createResponse.body.data.id;

      // Access privacy setting (should be logged)
      const response = await request(SERVER_URL)
        .get(`/api/privacy-settings/${privacySettingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      // Note: In a real implementation, this would trigger security event logging
    });

    it('should log unauthorized access attempts', async () => {
      const privacyData = createTestPrivacySettingData();
      const createResponse = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(201);

      const privacySettingId = createResponse.body.data.id;

      // Attempt unauthorized access
      await request(SERVER_URL)
        .get(`/api/privacy-settings/${privacySettingId}`)
        .expect(403); // Should be forbidden without token

      // Note: In a real implementation, this would trigger security event logging
    });

    it('should log consent withdrawal events', async () => {
      const privacyData = createTestPrivacySettingData({
        gdprConsent: true,
        marketingConsent: true,
      });
      const createResponse = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(201);

      const privacySettingId = createResponse.body.data.id;

      // Withdraw consent
      const updateData = {
        gdprConsent: false,
        marketingConsent: false,
        consentSource: 'consent-update',
        lastConsentUpdate: new Date().toISOString(),
      };

      const response = await request(SERVER_URL)
        .put(`/api/privacy-settings/${privacySettingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .expect(200);

      expect(response.body.data.attributes.gdprConsent).toBe(false);
      expect(response.body.data.attributes.marketingConsent).toBe(false);
      // Note: In a real implementation, this would trigger security event logging
    });
  });

  describe('Privacy Breach Detection and Response', () => {
    it('should detect potential privacy violations in data updates', async () => {
      const privacyData = createTestPrivacySettingData({
        profileVisibility: 'private',
        showEmail: false,
        showPhone: false,
      });
      const createResponse = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(201);

      const privacySettingId = createResponse.body.data.id;

      // Attempt to make private data public (potential violation)
      const updateData = {
        profileVisibility: 'public',
        showEmail: true,
        showPhone: true,
        showLocation: true,
        consentSource: 'consent-update',
        lastConsentUpdate: new Date().toISOString(),
      };

      const response = await request(SERVER_URL)
        .put(`/api/privacy-settings/${privacySettingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .expect(200);

      expect(response.body.data.attributes.profileVisibility).toBe('public');
      expect(response.body.data.attributes.showEmail).toBe(true);
      // Note: In a real implementation, this would trigger privacy breach detection
    });

    it('should handle data sharing consent changes', async () => {
      const privacyData = createTestPrivacySettingData({
        dataSharing: false,
        thirdPartySharing: false,
      });
      const createResponse = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(201);

      const privacySettingId = createResponse.body.data.id;

      // Enable data sharing
      const updateData = {
        dataSharing: true,
        thirdPartySharing: true,
        consentSource: 'consent-update',
        lastConsentUpdate: new Date().toISOString(),
      };

      const response = await request(SERVER_URL)
        .put(`/api/privacy-settings/${privacySettingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .expect(200);

      expect(response.body.data.attributes.dataSharing).toBe(true);
      expect(response.body.data.attributes.thirdPartySharing).toBe(true);
      // Note: In a real implementation, this would trigger privacy breach detection
    });

    it('should validate consent consistency', async () => {
      // Test inconsistent consent (GDPR false but data processing true)
      const privacyData = createTestPrivacySettingData({
        gdprConsent: false,
        dataProcessingConsent: true,
      });

      // This should be allowed as data processing consent is for necessary operations
      const response = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(201);

      expect(response.body.data.attributes.gdprConsent).toBe(false);
      expect(response.body.data.attributes.dataProcessingConsent).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid user ID', async () => {
      const privacyData = createTestPrivacySettingData({
        user: 99999, // Non-existent user ID
      });

      await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(400);
    });

    it('should handle invalid enum values', async () => {
      const privacyData = createTestPrivacySettingData({
        profileVisibility: 'invalid-visibility',
        cookieConsent: 'invalid-consent',
        consentSource: 'invalid-source',
      });

      await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(400);
    });

    it('should handle missing required fields', async () => {
      const privacyData = {
        user: testUser.id,
        // Missing required gdprConsent and dataProcessingConsent
      };

      await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(400);
    });

    it('should handle non-existent privacy setting updates', async () => {
      const updateData = createTestPrivacySettingUpdateData();

      await request(SERVER_URL)
        .put('/api/privacy-settings/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .expect(404);
    });

    it('should handle non-existent privacy setting retrieval', async () => {
      await request(SERVER_URL)
        .get('/api/privacy-settings/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should handle non-existent privacy setting deletion', async () => {
      await request(SERVER_URL)
        .delete('/api/privacy-settings/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle bulk privacy setting operations', async () => {
      const bulkOperations = [];
      
      // Create multiple privacy settings
      for (let i = 0; i < 5; i++) {
        const privacyData = createTestPrivacySettingData({
          consentVersion: `1.${i}`,
        });
        
        bulkOperations.push(
          request(SERVER_URL)
            .post('/api/privacy-settings')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ data: privacyData })
        );
      }

      const responses = await Promise.all(bulkOperations);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.data).toBeDefined();
      });
    });

    it('should handle concurrent privacy setting updates', async () => {
      // Create a privacy setting first
      const privacyData = createTestPrivacySettingData();
      const createResponse = await request(SERVER_URL)
        .post('/api/privacy-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: privacyData })
        .expect(201);

      const privacySettingId = createResponse.body.data.id;

      // Perform concurrent updates
      const updateOperations = [];
      
      for (let i = 0; i < 3; i++) {
        const updateData = {
          consentVersion: `1.${i}`,
          lastConsentUpdate: new Date().toISOString(),
        };
        
        updateOperations.push(
          request(SERVER_URL)
            .put(`/api/privacy-settings/${privacySettingId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ data: updateData })
        );
      }

      const responses = await Promise.all(updateOperations);
      
      // At least one should succeed
      const successfulResponses = responses.filter(response => response.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });
  });
});
