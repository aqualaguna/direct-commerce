/**
 * User Preference Integration Tests
 * 
 * Comprehensive integration tests for User Preference module covering:
 * - User preference retrieval and updates via /me endpoints
 * - Category-specific preference management
 * - Preference validation and constraints
 * - Default preference creation
 * - Preference reset functionality
 * - GDPR compliance (export functionality)
 * - Authentication and authorization
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

  // Test data factories
  const createTestUserData = (overrides = {}) => ({
    username: `prefuser${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    email: `prefuser${timestamp}_${Math.random().toString(36).substr(2, 9)}@example.com`,
    password: 'SecurePassword123!',
    ...overrides,
  });

  const createTestUser = async () => {
    const userData = createTestUserData();
    const registerResponse = await request(SERVER_URL)
      .post('/api/auth/local/register')
      .send(userData)
      .timeout(10000);
    
    // Debug: Log the response to see what's happening
    
    if (registerResponse.status !== 200) {
      throw new Error(`User registration failed with status ${registerResponse.status}: ${JSON.stringify(registerResponse.body)}`);
    }
    
    return {
      user: registerResponse.body.user,
      token: registerResponse.body.jwt,
      userData
    };
  };

  describe('API Health Check', () => {
    it('should be able to connect to the user-preference API', async () => {
      const response = await request(SERVER_URL)
        .get('/api/user-preferences/me')
        .timeout(10000);
      
      expect(response.status).toBe(403);
    });

    it('should handle invalid category gracefully', async () => {
      const response = await request(SERVER_URL)
        .get('/api/user-preferences/me/invalid-category')
        .timeout(10000);

      expect(response.status).toBe(403);
    });
  });

  describe('User Preference Management', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      const userResult = await createTestUser();
      testUser = userResult.user;
      authToken = userResult.token;
    });

    it('should verify authentication is working', async () => {
      // Test authentication by calling a simple endpoint that requires auth
      const response = await request(SERVER_URL)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000);
      
      
      // This should work if authentication is working
      expect(response.status).toBe(200);
    });

    it('should get user preferences and create defaults if none exist', async () => {
      
      const response = await request(SERVER_URL)
        .get('/api/user-preferences/me')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000);
      
      expect(response.status).toBe(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.meta.message).toContain('Default preferences created successfully');
      
      // Verify default values
      const preferences = response.body.data;
      expect(preferences.emailMarketing).toBe(false);
      expect(preferences.orderUpdates).toBe(true);
      expect(preferences.sessionTimeout).toBe(3600);
      expect(preferences.language).toBe('en');
      expect(preferences.currency).toBe('USD');
      expect(preferences.theme).toBe('auto');
    });

    it('should update user preferences', async () => {
      // First get/create preferences
      await request(SERVER_URL)
        .get('/api/user-preferences/me')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      // Update preferences
      const updateData = {
        emailMarketing: true,
        theme: 'dark',
        sessionTimeout: 7200,
        language: 'es',
        currency: 'EUR'
      };

      const response = await request(SERVER_URL)
        .put('/api/user-preferences/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: updateData })
        .timeout(10000)
        .expect(200);

      expect(response.body.data.emailMarketing).toBe(true);
      expect(response.body.data.theme).toBe('dark');
      expect(response.body.data.sessionTimeout).toBe(7200);
      expect(response.body.data.language).toBe('es');
      expect(response.body.data.currency).toBe('EUR');
    });

    it('should retrieve updated preferences', async () => {
      // Update preferences first
      const updateData = {
        emailMarketing: true,
        theme: 'dark'
      };

      await request(SERVER_URL)
        .put('/api/user-preferences/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: updateData })
        .timeout(10000)
        .expect(200);

      // Retrieve preferences
      const response = await request(SERVER_URL)
        .get('/api/user-preferences/me')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data.emailMarketing).toBe(true);
      expect(response.body.data.theme).toBe('dark');
    });

    it('should reset preferences to defaults', async () => {
      // First update preferences
      const updateData = {
        emailMarketing: true,
        theme: 'dark',
        sessionTimeout: 7200
      };

      await request(SERVER_URL)
        .put('/api/user-preferences/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: updateData })
        .timeout(10000)
        .expect(200);

      // Reset to defaults
      const response = await request(SERVER_URL)
        .post('/api/user-preferences/me/reset')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data.emailMarketing).toBe(false);
      expect(response.body.data.theme).toBe('auto');
      expect(response.body.data.sessionTimeout).toBe(3600);
    });

    it('should export user preferences', async () => {
      // Update preferences first
      const updateData = {
        emailMarketing: true,
        theme: 'dark'
      };

      await request(SERVER_URL)
        .put('/api/user-preferences/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: updateData })
        .timeout(10000)
        .expect(200);

      // Export preferences
      const response = await request(SERVER_URL)
        .get('/api/user-preferences/me/export')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.emailMarketing).toBe(true);
      expect(response.body.data.theme).toBe('dark');
      expect(response.body.meta.exportDate).toBeDefined();
      expect(response.body.meta.userId).toBeDefined();
    });
  });

  describe('Category-Specific Preference Management', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      const userResult = await createTestUser();
      testUser = userResult.user;
      authToken = userResult.token;
    });

    it('should get communication preferences category', async () => {
      // First create preferences
      await request(SERVER_URL)
        .get('/api/user-preferences/me')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      const response = await request(SERVER_URL)
        .get('/api/user-preferences/me/communication')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.meta.category).toBe('communication');
      expect(response.body.data).toHaveProperty('emailMarketing');
      expect(response.body.data).toHaveProperty('smsNotifications');
      expect(response.body.data).toHaveProperty('orderUpdates');
      expect(response.body.data).toHaveProperty('promotionalEmails');
    });

    it('should update communication preferences category', async () => {
      // First create preferences
      await request(SERVER_URL)
        .get('/api/user-preferences/me')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      const updateData = {
        emailMarketing: true,
        smsNotifications: true,
        orderUpdates: false,
        promotionalEmails: true
      };

      const response = await request(SERVER_URL)
        .patch('/api/user-preferences/me/communication')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: updateData })
        .timeout(10000)
        .expect(200);

      expect(response.body.data.emailMarketing).toBe(true);
      expect(response.body.data.smsNotifications).toBe(true);
      expect(response.body.data.orderUpdates).toBe(false);
      expect(response.body.data.promotionalEmails).toBe(true);
    });

    it('should get notification preferences category', async () => {
      // First create preferences
      await request(SERVER_URL)
        .get('/api/user-preferences/me')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      const response = await request(SERVER_URL)
        .get('/api/user-preferences/me/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.meta.category).toBe('notifications');
      expect(response.body.data).toHaveProperty('orderStatusNotifications');
      expect(response.body.data).toHaveProperty('promotionalNotifications');
      expect(response.body.data).toHaveProperty('securityNotifications');
      expect(response.body.data).toHaveProperty('notificationFrequency');
    });

    it('should update notification preferences category', async () => {
      const updateData = {
        orderStatusNotifications: false,
        promotionalNotifications: true,
        notificationFrequency: 'daily'
      };

      const response = await request(SERVER_URL)
        .patch('/api/user-preferences/me/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: updateData })
        .timeout(10000)
        .expect(200);

      expect(response.body.data.orderStatusNotifications).toBe(false);
      expect(response.body.data.promotionalNotifications).toBe(true);
      expect(response.body.data.notificationFrequency).toBe('daily');
    });

    it('should get security preferences category', async () => {
      // First create preferences
      await request(SERVER_URL)
        .get('/api/user-preferences/me')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      const response = await request(SERVER_URL)
        .get('/api/user-preferences/me/security')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.meta.category).toBe('security');
      expect(response.body.data).toHaveProperty('twoFactorEnabled');
      expect(response.body.data).toHaveProperty('sessionTimeout');
      expect(response.body.data).toHaveProperty('deviceTracking');
      expect(response.body.data).toHaveProperty('loginNotifications');
    });

    it('should update security preferences category', async () => {
      const updateData = {
        twoFactorEnabled: true,
        sessionTimeout: 1800,
        deviceTracking: false
      };

      const response = await request(SERVER_URL)
        .patch('/api/user-preferences/me/security')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: updateData })
        .timeout(10000)
        .expect(200);

      expect(response.body.data.twoFactorEnabled).toBe(true);
      expect(response.body.data.sessionTimeout).toBe(1800);
      expect(response.body.data.deviceTracking).toBe(false);
    });

    it('should get localization preferences category', async () => {
      // First create preferences
      await request(SERVER_URL)
        .get('/api/user-preferences/me')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      const response = await request(SERVER_URL)
        .get('/api/user-preferences/me/localization')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.meta.category).toBe('localization');
      expect(response.body.data).toHaveProperty('language');
      expect(response.body.data).toHaveProperty('currency');
      expect(response.body.data).toHaveProperty('timezone');
      expect(response.body.data).toHaveProperty('theme');
    });

    it('should update localization preferences category', async () => {
      const updateData = {
        language: 'fr',
        currency: 'EUR',
        timezone: 'Europe/Paris',
        theme: 'dark'
      };

      const response = await request(SERVER_URL)
        .patch('/api/user-preferences/me/localization')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: updateData })
        .timeout(10000)
        .expect(200);

      expect(response.body.data.language).toBe('fr');
      expect(response.body.data.currency).toBe('EUR');
      expect(response.body.data.timezone).toBe('Europe/Paris');
      expect(response.body.data.theme).toBe('dark');
    });

    it('should reject invalid category', async () => {
      const response = await request(SERVER_URL)
        .get('/api/user-preferences/me/invalid-category')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(400);

      expect(response.body.error).toBeDefined();
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
        const updateData = { theme };

        const response = await request(SERVER_URL)
          .put('/api/user-preferences/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: updateData })
          .timeout(10000)
          .expect(200);

        expect(response.body.data.theme).toBe(theme);
      }
    });

    it('should reject invalid theme values', async () => {
      const invalidThemes = ['purple', 'invalid', 'bright'];
      
      for (const theme of invalidThemes) {
        const updateData = { theme };

        const response = await request(SERVER_URL)
          .put('/api/user-preferences/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: updateData })
          .timeout(10000)
          .expect(400);

        expect(response.body.error).toBeDefined();
      }
    });

    it('should validate session timeout range', async () => {
      const validTimeouts = [300, 1800, 3600, 7200, 86400];
      
      for (const timeout of validTimeouts) {
        const updateData = { sessionTimeout: timeout };

        const response = await request(SERVER_URL)
          .put('/api/user-preferences/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: updateData })
          .timeout(10000)
          .expect(200);

        expect(response.body.data.sessionTimeout).toBe(timeout);
      }
    });

    it('should reject invalid session timeout values', async () => {
      const invalidTimeouts = [299, 86401, -1, 0];
      
      for (const timeout of invalidTimeouts) {
        const updateData = { sessionTimeout: timeout };

        const response = await request(SERVER_URL)
          .put('/api/user-preferences/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: updateData })
          .timeout(10000)
          .expect(400);

        expect(response.body.error).toBeDefined();
      }
    });

    it('should validate notification frequency enumeration', async () => {
      const validFrequencies = ['immediate', 'daily', 'weekly', 'disabled'];
      
      for (const frequency of validFrequencies) {
        const updateData = { notificationFrequency: frequency };

        const response = await request(SERVER_URL)
          .put('/api/user-preferences/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: updateData })
          .timeout(10000)
          .expect(200);

        expect(response.body.data.notificationFrequency).toBe(frequency);
      }
    });

    it('should validate currency code length', async () => {
      const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY'];
      
      for (const currency of validCurrencies) {
        const updateData = { currency };

        const response = await request(SERVER_URL)
          .put('/api/user-preferences/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: updateData })
          .timeout(10000)
          .expect(200);

        expect(response.body.data.currency).toBe(currency);
      }
    });

    it('should reject invalid currency codes', async () => {
      const invalidCurrencies = ['US', 'EURO', 'POUND', 'VERYLONGCODE'];
      
      for (const currency of invalidCurrencies) {
        const updateData = { currency };

        const response = await request(SERVER_URL)
          .put('/api/user-preferences/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: updateData })
          .timeout(10000)
          .expect(400);

        expect(response.body.error).toBeDefined();
      }
    });

    it('should validate language code length', async () => {
      const validLanguages = ['en', 'es', 'fr', 'de', 'ja'];
      
      for (const language of validLanguages) {
        const updateData = { language };

        const response = await request(SERVER_URL)
          .put('/api/user-preferences/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: updateData })
          .timeout(10000)
          .expect(200);

        expect(response.body.data.language).toBe(language);
      }
    });

    it('should reject language codes that are too long', async () => {
      const invalidLanguages = ['verylongcodethatexceeds10chars', 'extremelylonglanguagecode'];
      
      for (const language of invalidLanguages) {
        const updateData = { language };

        const response = await request(SERVER_URL)
          .put('/api/user-preferences/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: updateData })
          .timeout(10000)
          .expect(400);

        expect(response.body.error).toBeDefined();
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all preference operations', async () => {
      // Test GET without auth
      await request(SERVER_URL)
        .get('/api/user-preferences/me')
        .timeout(10000)
        .expect(403);

      // Test PUT without auth
      await request(SERVER_URL)
        .put('/api/user-preferences/me')
        .send({ data: { theme: 'dark' } })
        .timeout(10000)
        .expect(403);

      // Test PATCH without auth
      await request(SERVER_URL)
        .patch('/api/user-preferences/me/communication')
        .send({ data: { emailMarketing: true } })
        .timeout(10000)
        .expect(403);

      // Test POST reset without auth
      await request(SERVER_URL)
        .post('/api/user-preferences/me/reset')
        .timeout(10000)
        .expect(403);

      // Test GET export without auth
      await request(SERVER_URL)
        .get('/api/user-preferences/me/export')
        .timeout(10000)
        .expect(403);
    });

    it('should handle invalid authentication tokens', async () => {
      const invalidToken = 'invalid.jwt.token';

      await request(SERVER_URL)
        .get('/api/user-preferences/me')
        .set('Authorization', `Bearer ${invalidToken}`)
        .timeout(10000)
        .expect(401);
    });

    it('should handle malformed authorization headers', async () => {
      await request(SERVER_URL)
        .get('/api/user-preferences/me')
        .set('Authorization', 'InvalidFormat')
        .timeout(10000)
        .expect(403);
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
        .put('/api/user-preferences/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send('invalid-json-data')
        .timeout(10000)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle missing data in request body', async () => {
      const response = await request(SERVER_URL)
        .put('/api/user-preferences/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .timeout(10000)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle empty data object', async () => {
      const response = await request(SERVER_URL)
        .put('/api/user-preferences/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: {} })
        .timeout(10000)
        .expect(200); // Empty data should be valid (no updates)

      expect(response.body.data).toBeDefined();
    });

    it('should handle request timeout scenarios', async () => {
      const updateData = { theme: 'dark' };

      const response = await request(SERVER_URL)
        .put('/api/user-preferences/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: updateData })
        .timeout(10000) // Normal timeout
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should handle invalid category in category-specific endpoints', async () => {
      const response = await request(SERVER_URL)
        .get('/api/user-preferences/me/invalid-category')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle invalid data types in updates', async () => {
      const invalidData = {
        sessionTimeout: 'not-a-number',
        theme: 123,
        emailMarketing: 'not-a-boolean'
      };

      const response = await request(SERVER_URL)
        .put('/api/user-preferences/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: invalidData })
        .timeout(10000)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
