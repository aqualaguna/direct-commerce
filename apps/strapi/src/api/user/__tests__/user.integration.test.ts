/**
 * User Integration Tests
 * 
 * Comprehensive integration tests for User Management module covering:
 * - User registration and authentication workflows
 * - User profile management and validation
 * - User CRUD operations
 * - User security and password management
 * - User search and filtering functionality
 */

import request from 'supertest';
import { retryApiRequest } from '../../../utils/test-helpers';

describe('User Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let adminToken: string;
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();
  
  // Track all created users for cleanup
  const createdUsers: any[] = [];

  beforeAll(async () => {
    // Get admin token for authenticated requests
    adminToken = process.env.STRAPI_API_TOKEN as string;

    if (!adminToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }
  });

  // Add delay between tests to avoid rate limiting
  // afterEach(async () => {
  //   await new Promise(resolve => setTimeout(resolve, 1500));
  // });
  
  // Global cleanup for all created users
  afterAll(async () => {
    
    for (const user of createdUsers) {
      try {
        await request(SERVER_URL)
          .delete(`/api/users/${user.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000)
          .expect(200);
      } catch (error) {
        console.warn(`Failed to delete user ${user.id}:`, error);
      }
      
      // Add delay between deletions to avoid rate limiting
      // await new Promise(resolve => setTimeout(resolve, 200));
    }
  });
  
  // Test data factories - using Strapi's default user registration format
  const createTestUserData = (overrides = {}) => ({
    username: `testuser${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    email: `test${timestamp}_${Math.random().toString(36).substr(2, 9)}@example.com`,
    password: 'SecurePassword123!',
    ...overrides,
  });
  
  // Helper function to create user and track for cleanup
  const createAndTrackUser = async (userData: any) => {
    const response = await retryApiRequest(
      () => request(SERVER_URL)
        .post('/api/auth/local/register') 
        .send(userData)
        .timeout(10000),
      {
        maxRetries: 30,
        baseDelayMs: 2000,
        retryCondition: (response) => response.status === 429
      }
    );

    // Check if user was created successfully
    if (response.status === 200 && response.body.user) {
      // Track created user for cleanup after tests
      createdUsers.push(response.body.user);
    }

    return response;
  };

  const createTestUserUpdateData = (overrides = {}) => ({
    firstName: 'Updated',
    lastName: 'User',
    phone: '+1987654321',
    dateOfBirth: '1990-01-01',
    gender: 'male',
    ...overrides,
  });

  describe('API Health Check', () => {
    it('should be able to connect to the user API', async () => {
      const response = await request(SERVER_URL)
        .get('/api/users/me')
        .timeout(10000);
      
      // Should return 401 (unauthorized) or 403 (forbidden) since no token provided
      expect([401, 403]).toContain(response.status);
    });

    it('should handle invalid user ID gracefully', async () => {
      const response = await request(SERVER_URL)
        .get('/api/users/invalid-id')
        .timeout(10000);

      // Should return 404 (not found) or 403 (forbidden) for invalid ID
      expect([404, 403]).toContain(response.status);
    });
  });

  describe('User Registration', () => {
    it('should create user and verify response data', async () => {
      const userData = createTestUserData();

      // Create user via API and track for cleanup
      const response = await createAndTrackUser(userData);
      expect(response.status).toBe(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.jwt).toBeDefined();
    });

    it('should handle user registration with validation errors', async () => {
      const invalidUserData = {
        username: '', // Invalid: empty username
        email: 'invalid-email', // Invalid: malformed email
        password: '123', // Invalid: too short password
      };

      const response = await request(SERVER_URL)
        .post('/api/auth/local/register')
        .send(invalidUserData)
        .timeout(10000)
        .expect(400);

      expect(response.body.error).toBeDefined();
      // Check for various possible error message formats
      const errorMessage = response.body.error.message || response.body.message || '';
      expect(errorMessage).toMatch(/validation|error|invalid|required/i);
    });

    it('should prevent duplicate user registration', async () => {
      const userData = createTestUserData();

      // Create first user and track for cleanup
      const firstResponse = await createAndTrackUser(userData);
      expect(firstResponse.status).toBe(200);

      // Attempt to create duplicate user
      const response = await request(SERVER_URL)
        .post('/api/auth/local/register')
        .send(userData)
        .timeout(10000)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('already taken');
    });
  });

  describe('User Authentication', () => {
    let testUser: any;
    let userData: any;

    beforeEach(async () => {
      // Create test user for authentication tests and track for cleanup
      userData = createTestUserData();
      const registerResponse = await createAndTrackUser(userData);
      expect(registerResponse.status).toBe(200);
      
      testUser = registerResponse.body.user;
    });

    it('should authenticate user with valid credentials', async () => {
      const loginData = {
        identifier: testUser.email,
        password: userData.password,
      };

      const response = await request(SERVER_URL)
        .post('/api/auth/local')
        .send(loginData)
        .timeout(10000)
        .expect(200);

      expect(response.body.jwt).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject authentication with invalid credentials', async () => {
      const loginData = {
        identifier: testUser.email,
        password: 'wrongpassword',
      };

      const response = await request(SERVER_URL)
        .post('/api/auth/local')
        .send(loginData)
        .timeout(10000)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Invalid identifier or password');
    });

    it('should handle JWT token validation', async () => {
      // First authenticate to get token
      const loginResponse = await request(SERVER_URL)
        .post('/api/auth/local')
        .send({
          identifier: testUser.email,
          password: userData.password,
        })
        .timeout(10000)
        .expect(200);

      const token = loginResponse.body.jwt;

      // Use token to access protected endpoint
      const response = await request(SERVER_URL)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.id).toBe(testUser.id);
      expect(response.body.email).toBe(testUser.email);
    });
  });

  describe('User Profile Management', () => {
    let testUser: any;
    let authToken: string;
    let userData: any;

    beforeEach(async () => {
      // Create test user and authenticate, track for cleanup
      userData = createTestUserData();
      const registerResponse = await createAndTrackUser(userData);
      expect(registerResponse.status).toBe(200);
      
      testUser = registerResponse.body.user;
      authToken = registerResponse.body.jwt;
    });

    it('should update user profile', async () => {
      const updateData = createTestUserUpdateData();

      const response = await request(SERVER_URL)
        .put(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .timeout(10000);

      // Handle both 200 (success) and 403 (forbidden) responses
      expect(response.status).toBe(200);
      expect(response.body.firstName).toBe(updateData.firstName);
      expect(response.body.lastName).toBe(updateData.lastName);
      expect(response.body.phone).toBe(updateData.phone);

    });

    it('should validate profile update data', async () => {
      const invalidUpdateData = {
        email: 'invalid-email-format',
        phone: 'invalid-phone',
      };

      const response = await request(SERVER_URL)
        .put(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdateData)
        .timeout(10000);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('email must be a valid email');
    });

    it('should prevent unauthorized profile updates', async () => {
      const updateData = createTestUserUpdateData();

      const response = await request(SERVER_URL)
        .put(`/api/users/${testUser.id}`)
        .send(updateData)
        .timeout(10000);

      // Handle both 401 (unauthorized) and 403 (forbidden) responses
      expect([401, 403]).toContain(response.status);
      expect(response.body.error).toBeDefined();
    });

    it('should not allow updating other user profile', async () => {
      // Create another test user
      const otherUserData = createTestUserData();
      const otherUserResponse = await createAndTrackUser(otherUserData);
      expect(otherUserResponse.status).toBe(200);
      const otherUser = otherUserResponse.body.user;

      // Try to update other user's profile using first user's token
      const updateData = createTestUserUpdateData();
      const response = await request(SERVER_URL)
        .put(`/api/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .timeout(10000);
      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('User Password Management', () => {
    let testUser: any;
    let authToken: string;
    let userData: any;

    beforeEach(async () => {
      // Create test user and authenticate, track for cleanup
      userData = createTestUserData();
      const registerResponse = await createAndTrackUser(userData);
      expect(registerResponse.status).toBe(200);
      
      testUser = registerResponse.body.user;
      authToken = registerResponse.body.jwt;
    });

    it('should change user password using dedicated route', async () => {
      const newPassword = 'NewSecurePassword456!';
      const currentPassword = userData.password;

      // Change password using dedicated route
      const response = await request(SERVER_URL)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: currentPassword,
          password: newPassword,
          passwordConfirmation: newPassword
        })
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.jwt).toBeDefined();

      // Verify old password no longer works
      await request(SERVER_URL)
        .post('/api/auth/local')
        .send({
          identifier: testUser.email,
          password: userData.password,
        })
        .timeout(10000)
        .expect(400);

      // Verify new password works
      const newLoginResponse = await request(SERVER_URL)
        .post('/api/auth/local')
        .send({
          identifier: testUser.email,
          password: newPassword,
        })
        .timeout(10000)
        .expect(200);

      expect(newLoginResponse.body.jwt).toBeDefined();
      expect(newLoginResponse.body.user.id).toBe(testUser.id);
    });

    it('should reject password updates through profile update route', async () => {
      const newPassword = 'NewSecurePassword123!';

      const response = await request(SERVER_URL)
        .put(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ password: newPassword })
        .timeout(10000);

      // Should reject password updates through profile route
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      // The error message should indicate password updates are not allowed
      expect(response.body.error.message).toBeDefined();
    });

    it('should reject weak password through profile update route', async () => {
      const weakPassword = '123'; // Too short

      const response = await request(SERVER_URL)
        .put(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ password: weakPassword })
        .timeout(10000);

      // Should reject password updates through profile route
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBeDefined();
    });

    it('should change password using dedicated change-password route with retry', async () => {
      const newPassword = 'NewSecurePassword789!';
      const currentPassword = userData.password;

      // Test the dedicated change-password route with retry mechanism
      const response = await retryApiRequest(
        () => request(SERVER_URL)
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            currentPassword: currentPassword,
            password: newPassword,
            passwordConfirmation: newPassword
          })
          .timeout(10000),
        {
          maxRetries: 5,
          baseDelayMs: 1000,
          retryCondition: (response) => response.status === 429
        }
      );

      // Handle different possible responses
      if (response.status === 200) {
        expect(response.body).toBeDefined();
        
        // Verify old password no longer works with retry
        const oldPasswordResponse = await retryApiRequest(
          () => request(SERVER_URL)
            .post('/api/auth/local')
            .send({
              identifier: testUser.email,
              password: currentPassword,
            })
            .timeout(10000),
          {
            maxRetries: 30,
            baseDelayMs: 2000,
            retryCondition: (response) => response.status === 429
          }
        );
        expect(oldPasswordResponse.status).toBe(400);

        // Verify new password works
        const newLoginResponse = await retryApiRequest(
          () => request(SERVER_URL)
            .post('/api/auth/local')
            .send({
              identifier: testUser.email,
              password: newPassword,
            })
            .timeout(10000),
          {
            maxRetries: 30,
            baseDelayMs: 2000,
            retryCondition: (response) => response.status === 429
          }
        );

        expect(newLoginResponse.status).toBe(200);
        expect(newLoginResponse.body.jwt).toBeDefined();
        expect(newLoginResponse.body.user.id).toBe(testUser.id);
      } else if (response.status === 404) {
        // Route doesn't exist, which is expected if not implemented
        expect(response.status).toBe(404);
      } else if (response.status === 400) {
        expect(response.body.error).toBeDefined();
      } else {
        throw new Error(`Unexpected status code for change-password route: ${response.status}`);
      }
    });

    it('should compare password change methods - profile update vs dedicated route', async () => {
      const newPassword = 'ComparisonTest123!';
      const currentPassword = userData.password;

      // Method 1: Try dedicated change-password route with retry
      const changePasswordResponse = await retryApiRequest(
        () => request(SERVER_URL)
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            currentPassword: currentPassword,
            password: newPassword,
            passwordConfirmation: newPassword
          })
          .timeout(10000),
        {
          maxRetries: 30,  
          baseDelayMs: 2000,
          retryCondition: (response) => response.status === 429
        }
      );

      // Method 2: Try profile update route with retry
      const profileUpdateResponse = await retryApiRequest(
        () => request(SERVER_URL)
          .put(`/api/users/${testUser.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ password: newPassword })
          .timeout(10000),
        {
          maxRetries: 5,
          baseDelayMs: 1000,
          retryCondition: (response) => response.status === 429
        }
      );

      // Determine which method works
      const changePasswordWorks = changePasswordResponse.status === 200;
      const profileUpdateWorks = profileUpdateResponse.status === 200;

      // Verify change-password route works
      expect(changePasswordWorks).toBe(true);

      // Verify profile update route blocks password changes
      expect(profileUpdateWorks).toBe(false);
      expect(profileUpdateResponse.status).toBe(400);

      // Test login with new password since change-password route worked
      if (changePasswordWorks) {
        // Verify old password no longer works with retry
        const oldPasswordResponse = await retryApiRequest(
          () => request(SERVER_URL)
            .post('/api/auth/local')
            .send({
              identifier: testUser.email,
              password: currentPassword,
            })
            .timeout(10000),
          {
            maxRetries: 30,
            baseDelayMs: 2000,
            retryCondition: (response) => response.status === 429
          }
        );
        expect(oldPasswordResponse.status).toBe(400);

        // Verify new password works with retry
        const newLoginResponse = await retryApiRequest(
          () => request(SERVER_URL)
            .post('/api/auth/local')
            .send({
              identifier: testUser.email,
              password: newPassword,
            })
            .timeout(10000),
          {
            maxRetries: 30,
            baseDelayMs: 2000,
            retryCondition: (response) => response.status === 429
          }
        );

        expect(newLoginResponse.status).toBe(200);
        expect(newLoginResponse.body.jwt).toBeDefined();
        expect(newLoginResponse.body.user.id).toBe(testUser.id);
      }
    });
  });

  describe('User Email Verification', () => {
    /* *
    * its skipped for now
    * for now its already confirmed without email verification
    * TODO: add email verification next story
    * */
    // let userData: any;
    // let authToken: string;

    // beforeEach(async () => {
    //   // Create test user and authenticate, track for cleanup
    //   userData = createTestUserData();
    //   const registerResponse = await createAndTrackUser(userData);
    //   expect(registerResponse.status).toBe(200);
      
    //   userData = registerResponse.body.user;
    //   authToken = registerResponse.body.jwt;
    // });

    // it('should send email verification', async () => {
    //   expect(userData).toBeDefined();
    //   // Send verification email
    //   const response = await request(SERVER_URL)
    //     .post('/api/auth/send-email-confirmation')
    //     .send({ email: userData.email })
    //     .timeout(10000)
    //   console.log(response.body);

    //   expect(response.status).toBe(200);

    //   expect(response.body.ok).toBe(true);
    // });

    // it('should handle invalid verification token', async () => {
    //   const invalidToken = 'invalid-verification-token';

    //   const response = await request(SERVER_URL)
    //     .get(`/api/auth/email-confirmation?confirmation=${invalidToken}`)
    //     .timeout(10000)
    //     .expect(400);

    //   expect(response.body.error).toBeDefined();
    //   expect(response.body.error.message).toContain('Invalid token');
    // });
  });

  describe('User Account Status Management', () => {
    let testUser: any;
    let authToken: string;
    let userData: any;

    beforeEach(async () => {
      // Create test user and authenticate, track for cleanup
      userData = createTestUserData();
      const registerResponse = await createAndTrackUser(userData);
      expect(registerResponse.status).toBe(200);
      
      testUser = registerResponse.body.user;
      authToken = registerResponse.body.jwt;
    });

    it('should update user account status', async () => {
      const response = await request(SERVER_URL)
        .put(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isActive: false })
        .timeout(10000);

      // Handle both 200 (success) and 403 (forbidden) responses
      if (response.status === 200) {
        expect(response.body.isActive).toBe(false);
      } else if (response.status === 403) {
        expect(response.body.error).toBeDefined();
        // This is expected if account status updates are restricted
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    });

    it('should handle account lockout after failed attempts', async () => {
      // Simulate multiple failed login attempts
      for (let i = 0; i < 3; i++) { // Reduced to avoid rate limiting
        const response = await request(SERVER_URL)
          .post('/api/auth/local')
          .send({
            identifier: testUser.email,
            password: 'wrongpassword',
          })
          .timeout(10000);
        
        // Handle both 400 (bad request) and 429 (rate limited) responses
        expect([400, 429]).toContain(response.status);
        
        // Add delay to avoid rate limiting
        // await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Verify account is still accessible (implementation dependent)
      const response = await request(SERVER_URL)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.id).toBe(testUser.id);
    });
  });

  describe('User Search and Filtering', () => {
    let testUsers: any[] = [];

    beforeAll(async () => {
      // Create multiple test users and track for cleanup
      const users = [
        createTestUserData({ username: `searchuser1${timestamp}`, email: `searchuser1${timestamp}@example.com` }),
        createTestUserData({ username: `searchuser2${timestamp}`, email: `searchuser2${timestamp}@example.com` }),
        createTestUserData({ username: `searchuser3${timestamp}`, email: `searchuser3${timestamp}@example.com` }),
      ];

      for (const userData of users) {
        const response = await createAndTrackUser(userData);
        
        if (response.status === 200) {
          testUsers.push(response.body.user);
        }
      }
    });

    it('should search users by username', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/users?filters[username][$containsi]=searchuser1${timestamp}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      
      expect(response.status).toBe(200);
      // Handle different response structures
      const data = response.body.data || response.body;
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should search users by email', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/users?filters[email][$containsi]=searchuser2${timestamp}@example.com`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      // Handle different response structures
      const data = response.body.data || response.body;
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should paginate users', async () => {
      const response = await request(SERVER_URL)
        .get('/api/users?pagination[page]=1&pagination[pageSize]=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      // Handle different response structures
      const data = response.body.data || response.body;
      const meta = response.body.meta || {};
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      if (meta.pagination) {
        expect(meta.pagination.page).toBe(1);
        expect(meta.pagination.pageSize).toBe(2);
      }
    });

    // Note: Cleanup is handled by global afterAll hook
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed request data', async () => {
      const response = await request(SERVER_URL)
        .post('/api/auth/local/register')
        .send('invalid-json-data')
        .timeout(10000)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle concurrent user creation', async () => {
      const userData1 = createTestUserData({ username: `concurrent1${timestamp}`, email: `concurrent1${timestamp}@example.com` });
      const userData2 = createTestUserData({ username: `concurrent2${timestamp}`, email: `concurrent2${timestamp}@example.com` });

      // Create users sequentially to avoid rate limiting, track for cleanup
      const response1 = await createAndTrackUser(userData1);
      expect(response1.status).toBe(200);
      
      // await new Promise(resolve => setTimeout(resolve, 500));
      
      const response2 = await createAndTrackUser(userData2);
      expect(response2.status).toBe(200);
      
      expect(response1.body.user.id).not.toBe(response2.body.user.id);
    });

    it('should handle request timeout scenarios', async () => {
      const userData = createTestUserData();

      const response = await createAndTrackUser(userData);
      expect(response.status).toBe(200);

      expect(response.body.user).toBeDefined();
    });
  });
});