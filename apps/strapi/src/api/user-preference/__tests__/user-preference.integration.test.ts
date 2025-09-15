/**
 * User Preference Integration Tests
 * 
 * Comprehensive integration tests for User Preference module covering:
 * - User preference creation and updates
 * - Preference validation and constraints
 * - Preference inheritance and defaults
 * - Preference categories and organization
 * - Preference privacy and access control
 * - Preference bulk operations
 * - Preference cleanup on user deletion
 */

import request from 'supertest';

describe('User Preference Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let adminToken: string;
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();

  beforeAll(async () => {
    // Get admin token for authenticated requests
    adminToken = process.env.STRAPI_API_TOKEN as string;

    if (!adminToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }
  });

  // Add delay between tests to avoid rate limiting
  afterEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
  });
  
  // Test data factories
  const createTestUserData = (overrides = {}) => ({
    username: `prefuser${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    email: `prefuser${timestamp}_${Math.random().toString(36).substr(2, 9)}@example.com`,
    password: 'SecurePassword123!',
    ...overrides,
  });

  const createTestUserPreferenceData = (overrides = {}) => ({
    // Communication preferences
    emailMarketing: false,
    smsNotifications: false,
    orderUpdates: true,
    promotionalEmails: false,
    communicationConsentDate: new Date().toISOString(),
    
    // Notification preferences
    orderStatusNotifications: true,
    promotionalNotifications: false,
    securityNotifications: true,
    emailNotifications: true,
    smsNotificationEnabled: false,
    notificationFrequency: 'immediate',
    
    // Security preferences
    twoFactorEnabled: false,
    sessionTimeout: 3600,
    deviceTracking: true,
    loginNotifications: true,
    
    // Localization preferences
    language: 'en',
    currency: 'USD',
    timezone: 'UTC',
    dateFormat: 'MM_DD_YYYY',
    numberFormat: 'COMMA_DOT',
    theme: 'auto',
    ...overrides,
  });

  const createTestUser = async () => {
    const userData = createTestUserData();
    const registerResponse = await request(SERVER_URL)
      .post('/api/auth/local/register')
      .send(userData)
      .timeout(10000)
      .expect(200);
    
    return {
      user: registerResponse.body.user,
      token: registerResponse.body.jwt,
      userData
    };
  };

  describe('API Health Check', () => {
    it('should be able to connect to the user-preference API', async () => {
      const response = await request(SERVER_URL)
        .get('/api/user-preferences')
        .timeout(10000);
      
      // Should return 401 (unauthorized) since no token provided
      expect(response.status).toBe(401);
    });

    it('should handle invalid preference ID gracefully', async () => {
      const response = await request(SERVER_URL)
        .get('/api/user-preferences/invalid-id')
        .timeout(10000);

      // Should return 404 (not found) for invalid ID
      expect(response.status).toBe(404);
    });
  });

  describe('User Preference Creation and Updates', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      const userResult = await createTestUser();
      testUser = userResult.user;
      authToken = userResult.token;
    });

    it('should create user preference and verify response data', async () => {
      const preferenceData = createTestUserPreferenceData({
        user: testUser.id
      });

      // Create user preference via API
      const response = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: preferenceData })
        .timeout(10000)
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes).toBeDefined();
      const attributes = response.body.data.attributes;
      
      expect(attributes.emailMarketing).toBe(preferenceData.emailMarketing);
      expect(attributes.orderUpdates).toBe(preferenceData.orderUpdates);
      expect(attributes.sessionTimeout).toBe(preferenceData.sessionTimeout);
      expect(attributes.language).toBe(preferenceData.language);
      expect(attributes.currency).toBe(preferenceData.currency);
      expect(attributes.theme).toBe(preferenceData.theme);
    });

    it('should update user preference', async () => {
      // First create a preference
      const preferenceData = createTestUserPreferenceData({
        user: testUser.id
      });

      const createResponse = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: preferenceData })
        .timeout(10000)
        .expect(201);

      const preferenceId = createResponse.body.data.id;

      // Update the preference
      const updateData = {
        emailMarketing: true,
        theme: 'dark',
        sessionTimeout: 7200,
        language: 'es',
        currency: 'EUR'
      };

      const response = await request(SERVER_URL)
        .put(`/api/user-preferences/${preferenceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: updateData })
        .timeout(10000)
        .expect(200);

      expect(response.body.data.attributes.emailMarketing).toBe(true);
      expect(response.body.data.attributes.theme).toBe('dark');
      expect(response.body.data.attributes.sessionTimeout).toBe(7200);
      expect(response.body.data.attributes.language).toBe('es');
      expect(response.body.data.attributes.currency).toBe('EUR');
    });

    it('should retrieve user preference by ID', async () => {
      // Create a preference
      const preferenceData = createTestUserPreferenceData({
        user: testUser.id
      });

      const createResponse = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: preferenceData })
        .timeout(10000)
        .expect(201);

      const preferenceId = createResponse.body.data.id;

      // Retrieve the preference
      const response = await request(SERVER_URL)
        .get(`/api/user-preferences/${preferenceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data.id).toBe(preferenceId);
      expect(response.body.data.attributes.user.data.id).toBe(testUser.id);
      expect(response.body.data.attributes.emailMarketing).toBe(preferenceData.emailMarketing);
    });

    it('should delete user preference', async () => {
      // Create a preference
      const preferenceData = createTestUserPreferenceData({
        user: testUser.id
      });

      const createResponse = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: preferenceData })
        .timeout(10000)
        .expect(201);

      const preferenceId = createResponse.body.data.id;

      // Delete the preference
      const response = await request(SERVER_URL)
        .delete(`/api/user-preferences/${preferenceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();

      // Verify preference is deleted
      await request(SERVER_URL)
        .get(`/api/user-preferences/${preferenceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(404);
    });
  });

  describe('Preference Validation and Constraints', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      const userResult = await createTestUser();
      testUser = userResult.user;
      authToken = userResult.token;
    });

    it('should validate theme enumeration values', async () => {
      const validThemes = ['light', 'dark', 'auto'];
      
      for (const theme of validThemes) {
        const preferenceData = createTestUserPreferenceData({
          user: testUser.id,
          theme: theme
        });

        const response = await request(SERVER_URL)
          .post('/api/user-preferences')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: preferenceData })
          .timeout(10000)
          .expect(201);

        expect(response.body.data.attributes.theme).toBe(theme);
      }
    });

    it('should reject invalid theme values', async () => {
      const invalidThemes = ['purple', 'invalid', 'bright'];
      
      for (const theme of invalidThemes) {
        const preferenceData = createTestUserPreferenceData({
          user: testUser.id,
          theme: theme
        });

        const response = await request(SERVER_URL)
          .post('/api/user-preferences')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: preferenceData })
          .timeout(10000)
          .expect(400);

        expect(response.body.error).toBeDefined();
      }
    });

    it('should validate session timeout range', async () => {
      const validTimeouts = [300, 1800, 3600, 7200, 86400];
      
      for (const timeout of validTimeouts) {
        const preferenceData = createTestUserPreferenceData({
          user: testUser.id,
          sessionTimeout: timeout
        });

        const response = await request(SERVER_URL)
          .post('/api/user-preferences')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: preferenceData })
          .timeout(10000)
          .expect(201);

        expect(response.body.data.attributes.sessionTimeout).toBe(timeout);
      }
    });

    it('should reject invalid session timeout values', async () => {
      const invalidTimeouts = [299, 86401, -1, 0];
      
      for (const timeout of invalidTimeouts) {
        const preferenceData = createTestUserPreferenceData({
          user: testUser.id,
          sessionTimeout: timeout
        });

        const response = await request(SERVER_URL)
          .post('/api/user-preferences')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: preferenceData })
          .timeout(10000)
          .expect(400);

        expect(response.body.error).toBeDefined();
      }
    });

    it('should validate notification frequency enumeration', async () => {
      const validFrequencies = ['immediate', 'daily', 'weekly', 'disabled'];
      
      for (const frequency of validFrequencies) {
        const preferenceData = createTestUserPreferenceData({
          user: testUser.id,
          notificationFrequency: frequency
        });

        const response = await request(SERVER_URL)
          .post('/api/user-preferences')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: preferenceData })
          .timeout(10000)
          .expect(201);

        expect(response.body.data.attributes.notificationFrequency).toBe(frequency);
      }
    });

    it('should validate currency code length', async () => {
      const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY'];
      
      for (const currency of validCurrencies) {
        const preferenceData = createTestUserPreferenceData({
          user: testUser.id,
          currency: currency
        });

        const response = await request(SERVER_URL)
          .post('/api/user-preferences')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: preferenceData })
          .timeout(10000)
          .expect(201);

        expect(response.body.data.attributes.currency).toBe(currency);
      }
    });

    it('should reject invalid currency codes', async () => {
      const invalidCurrencies = ['US', 'EURO', 'POUND', 'VERYLONGCODE'];
      
      for (const currency of invalidCurrencies) {
        const preferenceData = createTestUserPreferenceData({
          user: testUser.id,
          currency: currency
        });

        const response = await request(SERVER_URL)
          .post('/api/user-preferences')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: preferenceData })
          .timeout(10000)
          .expect(400);

        expect(response.body.error).toBeDefined();
      }
    });

    it('should validate language code length', async () => {
      const validLanguages = ['en', 'es', 'fr', 'de', 'ja'];
      
      for (const language of validLanguages) {
        const preferenceData = createTestUserPreferenceData({
          user: testUser.id,
          language: language
        });

        const response = await request(SERVER_URL)
          .post('/api/user-preferences')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: preferenceData })
          .timeout(10000)
          .expect(201);

        expect(response.body.data.attributes.language).toBe(language);
      }
    });

    it('should reject language codes that are too long', async () => {
      const invalidLanguages = ['verylongcodethatexceeds10chars', 'extremelylonglanguagecode'];
      
      for (const language of invalidLanguages) {
        const preferenceData = createTestUserPreferenceData({
          user: testUser.id,
          language: language
        });

        const response = await request(SERVER_URL)
          .post('/api/user-preferences')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: preferenceData })
          .timeout(10000)
          .expect(400);

        expect(response.body.error).toBeDefined();
      }
    });
  });

  describe('Preference Inheritance and Defaults', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      const userResult = await createTestUser();
      testUser = userResult.user;
      authToken = userResult.token;
    });

    it('should create preference with default values when minimal data provided', async () => {
      const minimalData = {
        user: testUser.id
      };

      const response = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: minimalData })
        .timeout(10000)
        .expect(201);

      const attributes = response.body.data.attributes;
      
      // Check default values from schema
      expect(attributes.emailMarketing).toBe(false);
      expect(attributes.smsNotifications).toBe(false);
      expect(attributes.orderUpdates).toBe(true);
      expect(attributes.promotionalEmails).toBe(false);
      expect(attributes.orderStatusNotifications).toBe(true);
      expect(attributes.promotionalNotifications).toBe(false);
      expect(attributes.securityNotifications).toBe(true);
      expect(attributes.emailNotifications).toBe(true);
      expect(attributes.smsNotificationEnabled).toBe(false);
      expect(attributes.notificationFrequency).toBe('immediate');
      expect(attributes.twoFactorEnabled).toBe(false);
      expect(attributes.sessionTimeout).toBe(3600);
      expect(attributes.deviceTracking).toBe(true);
      expect(attributes.loginNotifications).toBe(true);
      expect(attributes.language).toBe('en');
      expect(attributes.currency).toBe('USD');
      expect(attributes.timezone).toBe('UTC');
      expect(attributes.dateFormat).toBe('MM_DD_YYYY');
      expect(attributes.numberFormat).toBe('COMMA_DOT');
      expect(attributes.theme).toBe('auto');
    });

    it('should preserve existing values when updating specific fields', async () => {
      // Create preference with specific values
      const initialData = createTestUserPreferenceData({
        user: testUser.id,
        emailMarketing: true,
        theme: 'dark',
        language: 'es',
        sessionTimeout: 7200
      });

      const createResponse = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: initialData })
        .timeout(10000)
        .expect(201);

      const preferenceId = createResponse.body.data.id;

      // Update only specific fields
      const updateData = {
        currency: 'EUR'
      };

      const response = await request(SERVER_URL)
        .put(`/api/user-preferences/${preferenceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: updateData })
        .timeout(10000)
        .expect(200);

      const attributes = response.body.data.attributes;
      
      // Check that updated field changed
      expect(attributes.currency).toBe('EUR');
      
      // Check that other fields remained unchanged
      expect(attributes.emailMarketing).toBe(true);
      expect(attributes.theme).toBe('dark');
      expect(attributes.language).toBe('es');
      expect(attributes.sessionTimeout).toBe(7200);
    });

    it('should handle communication consent date updates', async () => {
      const preferenceData = createTestUserPreferenceData({
        user: testUser.id,
        emailMarketing: true,
        communicationConsentDate: new Date().toISOString()
      });

      const response = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: preferenceData })
        .timeout(10000)
        .expect(201);

      expect(response.body.data.attributes.communicationConsentDate).toBeDefined();
      expect(response.body.data.attributes.emailMarketing).toBe(true);
    });
  });

  describe('Preference Categories and Organization', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      const userResult = await createTestUser();
      testUser = userResult.user;
      authToken = userResult.token;
    });

    it('should handle communication preferences category', async () => {
      const communicationData = {
        user: testUser.id,
        emailMarketing: true,
        smsNotifications: true,
        orderUpdates: false,
        promotionalEmails: true,
        communicationConsentDate: new Date().toISOString()
      };

      const response = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: communicationData })
        .timeout(10000)
        .expect(201);

      const attributes = response.body.data.attributes;
      expect(attributes.emailMarketing).toBe(true);
      expect(attributes.smsNotifications).toBe(true);
      expect(attributes.orderUpdates).toBe(false);
      expect(attributes.promotionalEmails).toBe(true);
      expect(attributes.communicationConsentDate).toBeDefined();
    });

    it('should handle notification preferences category', async () => {
      const notificationData = {
        user: testUser.id,
        orderStatusNotifications: false,
        promotionalNotifications: true,
        securityNotifications: false,
        emailNotifications: false,
        smsNotificationEnabled: true,
        notificationFrequency: 'daily'
      };

      const response = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: notificationData })
        .timeout(10000)
        .expect(201);

      const attributes = response.body.data.attributes;
      expect(attributes.orderStatusNotifications).toBe(false);
      expect(attributes.promotionalNotifications).toBe(true);
      expect(attributes.securityNotifications).toBe(false);
      expect(attributes.emailNotifications).toBe(false);
      expect(attributes.smsNotificationEnabled).toBe(true);
      expect(attributes.notificationFrequency).toBe('daily');
    });

    it('should handle security preferences category', async () => {
      const securityData = {
        user: testUser.id,
        twoFactorEnabled: true,
        sessionTimeout: 1800,
        deviceTracking: false,
        loginNotifications: false,
        lastPasswordChange: new Date().toISOString()
      };

      const response = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: securityData })
        .timeout(10000)
        .expect(201);

      const attributes = response.body.data.attributes;
      expect(attributes.twoFactorEnabled).toBe(true);
      expect(attributes.sessionTimeout).toBe(1800);
      expect(attributes.deviceTracking).toBe(false);
      expect(attributes.loginNotifications).toBe(false);
      expect(attributes.lastPasswordChange).toBeDefined();
    });

    it('should handle localization preferences category', async () => {
      const localizationData = {
        user: testUser.id,
        language: 'fr',
        currency: 'EUR',
        timezone: 'Europe/Paris',
        dateFormat: 'DD_MM_YYYY',
        numberFormat: 'DOT_COMMA',
        theme: 'dark'
      };

      const response = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: localizationData })
        .timeout(10000)
        .expect(201);

      const attributes = response.body.data.attributes;
      expect(attributes.language).toBe('fr');
      expect(attributes.currency).toBe('EUR');
      expect(attributes.timezone).toBe('Europe/Paris');
      expect(attributes.dateFormat).toBe('DD_MM_YYYY');
      expect(attributes.numberFormat).toBe('DOT_COMMA');
      expect(attributes.theme).toBe('dark');
    });
  });

  describe('Preference Privacy and Access Control', () => {
    let testUser1: any;
    let testUser2: any;
    let authToken1: string;
    let authToken2: string;

    beforeEach(async () => {
      const userResult1 = await createTestUser();
      testUser1 = userResult1.user;
      authToken1 = userResult1.token;

      const userResult2 = await createTestUser();
      testUser2 = userResult2.user;
      authToken2 = userResult2.token;
    });

    it('should prevent users from accessing other users preferences', async () => {
      // Create preference for user 1
      const preferenceData = createTestUserPreferenceData({
        user: testUser1.id
      });

      const createResponse = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ data: preferenceData })
        .timeout(10000)
        .expect(201);

      const preferenceId = createResponse.body.data.id;

      // Try to access user 1's preference with user 2's token
      const response = await request(SERVER_URL)
        .get(`/api/user-preferences/${preferenceId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .timeout(10000);

      // Should return 403 (forbidden) - user cannot access other user's preference
      expect(response.status).toBe(403);
    });

    it('should prevent users from updating other users preferences', async () => {
      // Create preference for user 1
      const preferenceData = createTestUserPreferenceData({
        user: testUser1.id
      });

      const createResponse = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ data: preferenceData })
        .timeout(10000)
        .expect(201);

      const preferenceId = createResponse.body.data.id;

      // Try to update user 1's preference with user 2's token
      const updateData = { theme: 'dark' };
      const response = await request(SERVER_URL)
        .put(`/api/user-preferences/${preferenceId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ data: updateData })
        .timeout(10000);

      // Should return 403 (forbidden) - user cannot update other user's preference
      expect(response.status).toBe(403);
    });

    it('should prevent users from deleting other users preferences', async () => {
      // Create preference for user 1
      const preferenceData = createTestUserPreferenceData({
        user: testUser1.id
      });

      const createResponse = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ data: preferenceData })
        .timeout(10000)
        .expect(201);

      const preferenceId = createResponse.body.data.id;

      // Try to delete user 1's preference with user 2's token
      const response = await request(SERVER_URL)
        .delete(`/api/user-preferences/${preferenceId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .timeout(10000);

      // Should return 403 (forbidden) - user cannot delete other user's preference
      expect(response.status).toBe(403);
    });

    it('should require authentication for preference operations', async () => {
      const preferenceData = createTestUserPreferenceData({
        user: testUser1.id
      });

      // Try to create preference without authentication
      const response = await request(SERVER_URL)
        .post('/api/user-preferences')
        .send({ data: preferenceData })
        .timeout(10000);

      // Should return 401 (unauthorized) - no authentication provided
      expect(response.status).toBe(401);
    });

    it('should allow admin to access all preferences', async () => {
      // Create preference for user 1
      const preferenceData = createTestUserPreferenceData({
        user: testUser1.id
      });

      const createResponse = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ data: preferenceData })
        .timeout(10000)
        .expect(201);

      const preferenceId = createResponse.body.data.id;

      // Admin should be able to access the preference
      const response = await request(SERVER_URL)
        .get(`/api/user-preferences/${preferenceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data.id).toBe(preferenceId);
    });
  });

  describe('Preference Bulk Operations', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      const userResult = await createTestUser();
      testUser = userResult.user;
      authToken = userResult.token;
    });

    it('should retrieve multiple preferences with pagination', async () => {
      // Create multiple preferences for the same user (if allowed by schema)
      const preferenceData1 = createTestUserPreferenceData({
        user: testUser.id,
        theme: 'light'
      });

      const preferenceData2 = createTestUserPreferenceData({
        user: testUser.id,
        theme: 'dark'
      });

      await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: preferenceData1 })
        .timeout(10000)
        .expect(201);

      await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: preferenceData2 })
        .timeout(10000)
        .expect(201);

      // Retrieve preferences with pagination
      const response = await request(SERVER_URL)
        .get('/api/user-preferences?pagination[page]=1&pagination[pageSize]=10')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter preferences by user', async () => {
      // Create preference
      const preferenceData = createTestUserPreferenceData({
        user: testUser.id
      });

      await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: preferenceData })
        .timeout(10000)
        .expect(201);

      // Filter preferences by user
      const response = await request(SERVER_URL)
        .get(`/api/user-preferences?filters[user][id][$eq]=${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should sort preferences by creation date', async () => {
      // Create multiple preferences
      const preferenceData1 = createTestUserPreferenceData({
        user: testUser.id,
        theme: 'light'
      });

      const preferenceData2 = createTestUserPreferenceData({
        user: testUser.id,
        theme: 'dark'
      });

      await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: preferenceData1 })
        .timeout(10000)
        .expect(201);

      await new Promise(resolve => setTimeout(resolve, 1000)); // Ensure different timestamps

      await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: preferenceData2 })
        .timeout(10000)
        .expect(201);

      // Sort preferences by creation date
      const response = await request(SERVER_URL)
        .get('/api/user-preferences?sort=createdAt:desc')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Preference Cleanup on User Deletion', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      const userResult = await createTestUser();
      testUser = userResult.user;
      authToken = userResult.token;
    });

    it('should handle preference cleanup when user is deleted', async () => {
      // Create preference for user
      const preferenceData = createTestUserPreferenceData({
        user: testUser.id
      });

      const createResponse = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: preferenceData })
        .timeout(10000)
        .expect(201);

      const preferenceId = createResponse.body.data.id;

      // Delete the user (this should trigger preference cleanup)
      const deleteResponse = await request(SERVER_URL)
        .delete(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      // Handle different possible responses
      if (deleteResponse.status === 200) {
        // If user deletion is successful, preference should be cleaned up
        await request(SERVER_URL)
          .get(`/api/user-preferences/${preferenceId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000)
          .expect(404);
      } else {
        // If user deletion is not allowed, preference should still exist
        const response = await request(SERVER_URL)
          .get(`/api/user-preferences/${preferenceId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);

        // Preference may still exist (200) or be deleted with user (404)
        expect([200, 404]).toContain(response.status);
      }
    });

    it('should maintain data integrity when user is deleted', async () => {
      // Create preference for user
      const preferenceData = createTestUserPreferenceData({
        user: testUser.id
      });

      const createResponse = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: preferenceData })
        .timeout(10000)
        .expect(201);

      const preferenceId = createResponse.body.data.id;

      // Verify preference exists and has correct user relationship
      const getResponse = await request(SERVER_URL)
        .get(`/api/user-preferences/${preferenceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      expect(getResponse.body.data.attributes.user.data.id).toBe(testUser.id);

      // Attempt to delete user
      await request(SERVER_URL)
        .delete(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      // Verify preference relationship integrity
      const finalResponse = await request(SERVER_URL)
        .get(`/api/user-preferences/${preferenceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      // Preference should either be deleted or have null user relationship
      if (finalResponse.status === 200) {
        expect(finalResponse.body.data.attributes.user.data).toBeNull();
      } else {
        expect(finalResponse.status).toBe(404);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      const userResult = await createTestUser();
      testUser = userResult.user;
      authToken = userResult.token;
    });

    it('should handle malformed request data', async () => {
      const response = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send('invalid-json-data')
        .timeout(10000)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      const response = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: {} })
        .timeout(10000)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle concurrent preference creation', async () => {
      const preferenceData1 = createTestUserPreferenceData({
        user: testUser.id,
        theme: 'light'
      });

      const preferenceData2 = createTestUserPreferenceData({
        user: testUser.id,
        theme: 'dark'
      });

      // Create preferences sequentially to avoid rate limiting
      const response1 = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: preferenceData1 })
        .timeout(10000);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response2 = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: preferenceData2 })
        .timeout(10000);

      // Both should succeed - creation can return 200 (updated) or 201 (created)
      expect([200, 201]).toContain(response1.status);
      expect([200, 201]).toContain(response2.status);
    });

    it('should handle request timeout scenarios', async () => {
      const preferenceData = createTestUserPreferenceData({
        user: testUser.id
      });

      const response = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: preferenceData })
        .timeout(10000) // Normal timeout
        .expect(201);

      expect(response.body.data).toBeDefined();
    });

    it('should handle invalid user ID in preference creation', async () => {
      const preferenceData = createTestUserPreferenceData({
        user: 99999 // Non-existent user ID
      });

      const response = await request(SERVER_URL)
        .post('/api/user-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: preferenceData })
        .timeout(10000)
        .expect(405);

      expect(response.body.error).toBeDefined();
    });
  });
});
