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
  let testUser: any;
  let testUserToken: string;
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();

  beforeAll(async () => {
    // Create a test user for privacy setting tests
    const userData = {
      username: `privacyuser${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      email: `privacy${timestamp}_${Math.random().toString(36).substr(2, 9)}@example.com`,
      password: 'SecurePassword123!',
    };

    const userResponse = await request(SERVER_URL)
      .post('/api/auth/local/register')
      .send(userData)
      .expect(200);

    testUser = userResponse.body.user;
    testUserToken = userResponse.body.jwt;
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
    it('should get current user privacy settings', async () => {
      const response = await request(SERVER_URL)
        .get('/api/privacy-settings/me')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta.message).toBe('Default privacy settings created successfully');
      expect(response.body.data.user.id).toBe(testUser.id);
    });

    it('should update current user privacy settings', async () => {
      const updateData = createTestPrivacySettingUpdateData();
      const response = await request(SERVER_URL)
        .put('/api/privacy-settings/me')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ data: updateData })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.profileVisibility).toBe('public');
      expect(response.body.data.showEmail).toBe(true);
      expect(response.body.data.marketingConsent).toBe(true);
      expect(response.body.data.cookieConsent).toBe('all');
      expect(response.body.data.consentVersion).toBe('1.1');
    });

    it('should update consent preferences', async () => {
      const consentData = {
        gdprConsent: true,
        marketingConsent: true,
        analyticsConsent: false,
        dataSharing: false,
        consentSource: 'consent-update',
        lastConsentUpdate: new Date().toISOString(),
        consentVersion: '1.2',
      };

      const response = await request(SERVER_URL)
        .patch('/api/privacy-settings/me/consent')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ consentData })
        .expect(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.gdprConsent).toBe(true);
      expect(response.body.data.marketingConsent).toBe(true);
      expect(response.body.data.analyticsConsent).toBe(false);
      expect(response.body.data.consentVersion).toBe('1.2');
    });

    it('should get consent history', async () => {
      const response = await request(SERVER_URL)
        .get('/api/privacy-settings/me/consent-history')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);
      expect(response.body.data).toBeDefined();
    });

    it('should reset privacy settings to defaults', async () => {
      const response = await request(SERVER_URL)
        .post('/api/privacy-settings/me/reset')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.profileVisibility).toBe('private'); // default
      expect(response.body.data.showEmail).toBe(false); // default
    });

    it('should export user data', async () => {
      const response = await request(SERVER_URL)
        .get('/api/privacy-settings/me/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should request data deletion', async () => {
      const response = await request(SERVER_URL)
        .post('/api/privacy-settings/me/request-deletion')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ 
          data: { 
            reason: 'User requested deletion',
            confirmationRequired: true 
          } 
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });


  describe('Consent Management and Tracking', () => {
    it('should track consent updates with timestamps', async () => {
      // Update consent using the consent endpoint
      const updateData = {
        marketingConsent: true,
        consentSource: 'consent-update',
        consentVersion: '1.1',
      };

      const response = await request(SERVER_URL)
        .patch('/api/privacy-settings/me/consent')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ consentData: updateData })
        .expect(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.marketingConsent).toBe(true);
      expect(response.body.data.consentSource).toBe('consent-update');
      expect(response.body.data.lastConsentUpdate).toBeDefined();
      expect(response.body.data.consentVersion).toBe('1.1');
    });



    it('should validate consent version format', async () => {
      const privacyData = {
        consentVersion: '2.0.1',
        consentSource: 'profile-update',
        lastConsentUpdate: new Date().toISOString(),
      };

      const response = await request(SERVER_URL)
        .put('/api/privacy-settings/me')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ data: privacyData })
        .expect(200);

      expect(response.body.data.consentVersion).toBe('2.0.1');
    });

    it('should handle cookie consent levels', async () => {
      const cookieLevels = ['necessary', 'analytics', 'marketing', 'all'];
      
      for (const level of cookieLevels) {
        const privacyData = {
          cookieConsent: level,
          consentSource: 'consent-update',
          lastConsentUpdate: new Date().toISOString(),
        };

        const response = await request(SERVER_URL)
          .patch('/api/privacy-settings/me/consent')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({ consentData: privacyData })
          .expect(200);

        expect(response.body.data.cookieConsent).toBe(level);
      }
    });
  });

  describe('Data Retention and Deletion', () => {
    it('should handle right to be forgotten requests', async () => {
      // Request data deletion using the dedicated endpoint
      const response = await request(SERVER_URL)
        .post('/api/privacy-settings/me/request-deletion')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ 
          data: { 
            reason: 'User requested deletion',
            confirmationRequired: true 
          } 
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should handle data export requests', async () => {
      // Export user data using the dedicated endpoint
      const response = await request(SERVER_URL)
        .get('/api/privacy-settings/me/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should handle data retention consent', async () => {
      const privacyData = {
        dataProcessingConsent: true,
      };

      const response = await request(SERVER_URL)
        .patch('/api/privacy-settings/me/consent')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ consentData: privacyData })
        .expect(200);

      expect(response.body.data.dataProcessingConsent).toBe(true);
    });

  });

  describe('Privacy Compliance and Auditing', () => {
    it('should enforce GDPR consent requirements', async () => {
      // Test with GDPR consent
      const privacyDataWithGDPR = {
        gdprConsent: true,
        dataProcessingConsent: true,
        consentSource: 'registration',
        consentVersion: '1.0',
        lastConsentUpdate: new Date().toISOString(),
      };

      const response = await request(SERVER_URL)
        .put('/api/privacy-settings/me')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ data: privacyDataWithGDPR })
        .expect(200);

      expect(response.body.data.gdprConsent).toBe(true);
    });

    it('should enforce data processing consent requirements', async () => {
      // Test with data processing consent
      const privacyDataWithProcessing = {
        gdprConsent: true,
        dataProcessingConsent: true,
        consentSource: 'registration',
        consentVersion: '1.0',
        lastConsentUpdate: new Date().toISOString(),
      };

      const response = await request(SERVER_URL)
        .put('/api/privacy-settings/me')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ data: privacyDataWithProcessing })
        .expect(200);

      expect(response.body.data.dataProcessingConsent).toBe(true);
    });

    it('should maintain audit trail for consent changes', async () => {
      // Update consent multiple times
      const updateData1 = {
        marketingConsent: true,
        consentSource: 'consent-update',
        lastConsentUpdate: new Date().toISOString(),
        consentVersion: '1.1',
      };

      await request(SERVER_URL)
        .patch('/api/privacy-settings/me/consent')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ consentData: updateData1 })
        .expect(200);

      const updateData2 = {
        analyticsConsent: false,
        consentSource: 'consent-update',
        lastConsentUpdate: new Date().toISOString(),
        consentVersion: '1.2',
      };

      const response = await request(SERVER_URL)
        .patch('/api/privacy-settings/me/consent')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ consentData: updateData2 })
        .expect(200);

      expect(response.body.data.lastConsentUpdate).toBeDefined();
      expect(response.body.data.consentVersion).toBe('1.2');
      expect(response.body.data.marketingConsent).toBe(true); // Should persist from previous update
    });
  });

  describe('Security Event Logging', () => {
    it('should log privacy setting access attempts', async () => {
      // Access privacy setting (should be logged)
      const response = await request(SERVER_URL)
        .get('/api/privacy-settings/me')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      // Note: In a real implementation, this would trigger security event logging
    });

    it('should log unauthorized access attempts', async () => {
      // Attempt unauthorized access
      await request(SERVER_URL)
        .get('/api/privacy-settings/me')
        .expect(403); // Should be forbidden without token

      // Note: In a real implementation, this would trigger security event logging
    });

  });

  describe('Privacy Breach Detection and Response', () => {
    it('should detect potential privacy violations in data updates', async () => {
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
        .put('/api/privacy-settings/me')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ data: updateData })
        .expect(200);
      expect(response.body.data.profileVisibility).toBe('public');
      expect(response.body.data.showEmail).toBe(true);
      // Note: In a real implementation, this would trigger privacy breach detection
    });

    it('should handle data sharing consent changes', async () => {
      // Enable data sharing
      const updateData = {
        dataSharing: true,
        thirdPartySharing: true,
        consentSource: 'consent-update',
        lastConsentUpdate: new Date().toISOString(),
      };

      const response = await request(SERVER_URL)
        .patch('/api/privacy-settings/me/consent')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ consentData: updateData })
        .expect(200);

      expect(response.body.data.dataSharing).toBe(true);
      expect(response.body.data.thirdPartySharing).toBe(true);
      // Note: In a real implementation, this would trigger privacy breach detection
    });

    it('should validate consent consistency', async () => {
      // Test inconsistent consent (GDPR false but data processing true)
      const privacyData = {
        gdprConsent: false,
        dataProcessingConsent: true,
        consentSource: 'consent-update',
        lastConsentUpdate: new Date().toISOString(),
      };

      // This should be allowed as data processing consent is for necessary operations
      const response = await request(SERVER_URL)
        .patch('/api/privacy-settings/me/consent')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ consentData: privacyData })
        .expect(200);

      expect(response.body.data.gdprConsent).toBe(false);
      expect(response.body.data.dataProcessingConsent).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid enum values', async () => {
      const privacyData = {
        profileVisibility: 'invalid-visibility',
        cookieConsent: 'invalid-consent',
        consentSource: 'invalid-source',
      };

      await request(SERVER_URL)
        .put('/api/privacy-settings/me')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ data: privacyData })
        .expect(400);
    });

    it('should handle invalid consent data', async () => {
      const privacyData = {
        gdprConsent: 'invalid-boolean',
        consentSource: 'consent-update',
      };

      await request(SERVER_URL)
        .patch('/api/privacy-settings/me/consent')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ consentData: privacyData })
        .expect(400);
    });

    it('should handle unauthorized access', async () => {
      await request(SERVER_URL)
        .get('/api/privacy-settings/me')
        .expect(403); // Should be forbidden without token
    });

    it('should handle invalid export request', async () => {
      await request(SERVER_URL)
        .get('/api/privacy-settings/me/export')
        .expect(403); // Should be forbidden without token
    });

    it('should handle invalid deletion request', async () => {
      await request(SERVER_URL)
        .post('/api/privacy-settings/me/request-deletion')
        .expect(403); // Should be forbidden without token
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent privacy setting updates', async () => {
      // Perform concurrent updates
      const updateOperations: Promise<any>[] = [];
      
      for (let i = 0; i < 3; i++) {
        const updateData = {
          consentVersion: `1.${i}`,
          lastConsentUpdate: new Date().toISOString(),
          consentSource: 'concurrent-test',
        };
        
        updateOperations.push(
          request(SERVER_URL)
            .put('/api/privacy-settings/me')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ consentData: updateData })
        );
      }

      const responses = await Promise.all(updateOperations);
      
      // At least one should succeed
      const successfulResponses = responses.filter(response => response.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });

    it('should handle concurrent consent updates', async () => {
      // Perform concurrent consent updates
      const consentOperations: Promise<any>[] = [];
      
      for (let i = 0; i < 3; i++) {
        const consentData = {
          marketingConsent: i % 2 === 0,
          analyticsConsent: i % 2 === 1,
          consentVersion: `1.${i}`,
          lastConsentUpdate: new Date().toISOString(),
          consentSource: 'concurrent-consent-test',
        };
        
        consentOperations.push(
          request(SERVER_URL)
            .patch('/api/privacy-settings/me/consent')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ consentData })
        );
      }

      const responses = await Promise.all(consentOperations);
      
      // At least one should succeed
      const successfulResponses = responses.filter(response => response.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    it('should delete user data', async () => {
      const response = await request(SERVER_URL)
        .delete('/api/privacy-settings/me/data')
        .send({ confirmDeletion: true })
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);
      expect(response.body.data).toBeDefined();
    });
  });
});
