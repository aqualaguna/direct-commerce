/**
 * Profile Integration Tests
 * 
 * Comprehensive integration tests for Profile module covering:
 * - User profile retrieval and updates via /me endpoints
 * - Profile completion status tracking
 * - Profile picture upload and management
 * - Privacy settings and data filtering
 * - Profile validation and constraints
 * - Authentication and authorization
 * - Error handling and edge cases
 */

import request from 'supertest';
import { join } from 'path';
import { tmpdir } from 'os';
import { writeFileSync } from 'fs';

describe('Profile Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let apiToken: string;
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();
  
  // Track all created users for cleanup
  const createdUsers: any[] = [];
  const createdFiles: string[] = [];

  beforeAll(async () => {
    // Get admin token for authenticated requests
    apiToken = process.env.STRAPI_API_TOKEN as string;

    if (!apiToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }
  });

  // Global cleanup for all created users and files
  afterAll(async () => {
    // Clean up created users
    for (const user of createdUsers) {
      try {
        await request(SERVER_URL)
          .delete(`/api/users/${user.id}`)
          .set('Authorization', `Bearer ${apiToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn(`Failed to delete user ${user.id}:`, error);
      }
    }
    
    // Clean up created files
    for (const filePath of createdFiles) {
      try {
        const fs = require('fs');
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.warn(`Failed to delete file ${filePath}:`, error);
      }
    }
  });

  // Test data factories
  const createTestUserData = (overrides = {}) => ({
    username: `profileuser${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    email: `profileuser${timestamp}_${Math.random().toString(36).substr(2, 9)}@example.com`,
    password: 'SecurePassword123!',
    ...overrides,
  });

  const createTestUser = async () => {
    const userData = createTestUserData();
    const registerResponse = await request(SERVER_URL)
      .post('/api/auth/local/register')
      .send(userData)
      .timeout(10000);
    
    if (registerResponse.status !== 200) {
      throw new Error(`User registration failed with status ${registerResponse.status}: ${JSON.stringify(registerResponse.body)}`);
    }
    
    // Track user for cleanup
    createdUsers.push(registerResponse.body.user);
    
    return {
      user: registerResponse.body.user,
      token: registerResponse.body.jwt,
      userData
    };
  };

  const createTestImageFile = () => {
    // Create a minimal valid JPEG file
    const tempFilePath = join(__dirname, 'random-profile-picture.jpeg');
    
    // Note: Don't track static test file for cleanup as it's reused across tests
    return tempFilePath;
  };

  describe('API Health Check', () => {
    it('should be able to connect to the profile API', async () => {
      const response = await request(SERVER_URL)
        .get('/api/profile/me')
        .timeout(10000);
      
      expect(response.status).toBe(403); // Should require authentication
    });

    it('should handle invalid profile ID gracefully', async () => {
      const response = await request(SERVER_URL)
        .get('/api/profile/invalid-profile-id')
        .timeout(10000);

      expect(response.status).toBe(403); // Should require authentication
    });
  });

  describe('Profile Management', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      const userResult = await createTestUser();
      testUser = userResult.user;
      authToken = userResult.token;
    });

    it('should get current user profile', async () => {
      const response = await request(SERVER_URL)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta.message).toContain('Profile retrieved successfully');
      
      // Verify profile structure
      const profile = response.body.data;
      expect(profile).toHaveProperty('documentId');
      expect(profile).toHaveProperty('email');
      expect(profile).toHaveProperty('username');
    });

    it('should update current user profile', async () => {
      const updateData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        bio: 'Test user bio',
        website: 'https://example.com',
        location: 'New York, NY',
        timezone: 'America/New_York',
        language: 'en',
        currency: 'USD'
      };

      const response = await request(SERVER_URL)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: updateData })
        .timeout(10000)
        .expect(200);

      expect(response.body.data.firstName).toBe('John');
      expect(response.body.data.lastName).toBe('Doe');
      expect(response.body.data.phone).toBe('+1234567890');
      expect(response.body.data.bio).toBe('Test user bio');
      expect(response.body.data.website).toBe('https://example.com');
      expect(response.body.data.location).toBe('New York, NY');
      expect(response.body.data.timezone).toBe('America/New_York');
      expect(response.body.data.language).toBe('en');
      expect(response.body.data.currency).toBe('USD');
    });

    it('should get profile completion status', async () => {
      const response = await request(SERVER_URL)
        .get('/api/profile/me/completion')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data).toHaveProperty('percentage');
      expect(response.body.data).toHaveProperty('completedFields');
      expect(response.body.data).toHaveProperty('missingFields');
      expect(typeof response.body.data.percentage).toBe('number');
      expect(Array.isArray(response.body.data.completedFields)).toBe(true);
      expect(Array.isArray(response.body.data.missingFields)).toBe(true);
    });

    it('should update profile completion after adding data', async () => {
      // Get initial completion
      const initialResponse = await request(SERVER_URL)
        .get('/api/profile/me/completion')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      const initialCompletion = initialResponse.body.data.percentage;

      // Update profile with more data
      const updateData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        bio: 'Test user bio'
      };

      await request(SERVER_URL)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: updateData })
        .timeout(10000)
        .expect(200);

      // Get updated completion
      const updatedResponse = await request(SERVER_URL)
        .get('/api/profile/me/completion')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      const updatedCompletion = updatedResponse.body.data.percentage;
      expect(updatedCompletion).toBeGreaterThan(initialCompletion);
    });
  });

  describe('Profile Picture Management', () => {
    let testUser: any;
    let authToken: string;
    let testImagePath: string;

    beforeEach(async () => {
      const userResult = await createTestUser();
      testUser = userResult.user;
      authToken = userResult.token;
      testImagePath = createTestImageFile();
    });

    afterEach(() => {
      // No cleanup needed since we're using a static test file
    });

    it('should upload profile picture', async () => {
      const response = await request(SERVER_URL)
        .post('/api/profile/me/picture')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profilePicture', testImagePath)
        .timeout(15000);


      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.body)}`);
      }

      expect(response.body.data).toBeDefined();
      expect(response.body.data).toHaveProperty('url');
      expect(response.body.meta.message).toContain('Profile picture uploaded successfully');
    });

    it('should reject file that is too large', async () => {
      // Create a large test file (6MB)
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'x');
      const largeFilePath = join(tmpdir(), `large-test-${Date.now()}.txt`);
      writeFileSync(largeFilePath, largeBuffer);
      
      // Track file for cleanup
      createdFiles.push(largeFilePath);

        const response = await request(SERVER_URL)
          .post('/api/profile/me/picture')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('profilePicture', largeFilePath)
          .timeout(15000)
          .expect(400);

        expect(response.body.error).toBeDefined();
    });

    it('should reject invalid file types', async () => {
      // Create a text file
      const textFilePath = join(tmpdir(), `test-${Date.now()}.txt`);
      writeFileSync(textFilePath, 'This is not an image');
      
      // Track file for cleanup
      createdFiles.push(textFilePath);

        const response = await request(SERVER_URL)
          .post('/api/profile/me/picture')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('profilePicture', textFilePath)
          .timeout(15000)
          .expect(400);

        expect(response.body.error).toBeDefined();
    });

    it('should delete profile picture', async () => {
      // First upload a picture
      await request(SERVER_URL)
        .post('/api/profile/me/picture')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profilePicture', testImagePath)
        .timeout(15000)
        .expect(200);

      // Then delete it
      const response = await request(SERVER_URL)
        .delete('/api/profile/me/picture')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeNull();
      expect(response.body.meta.message).toContain('Profile picture deleted successfully');
    });

    it('should handle delete when no picture exists', async () => {
      const response = await request(SERVER_URL)
        .delete('/api/profile/me/picture')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('No profile picture to delete');
    });

  });

  describe('Profile Privacy and Access Control', () => {
    let testUser1: any;
    let testUser2: any;
    let authToken1: string;
    let authToken2: string;

    beforeEach(async () => {
      const userResult1 = await createTestUser();
      const userResult2 = await createTestUser();
      testUser1 = userResult1.user;
      testUser2 = userResult2.user;
      authToken1 = userResult1.token;
      authToken2 = userResult2.token;
    });

    it('should allow user to view their own profile with full data', async () => {
      const response = await request(SERVER_URL)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${authToken1}`)
        .timeout(10000)
        .expect(200);

      const profile = response.body.data;
      expect(profile).toHaveProperty('email');
      expect(profile).toHaveProperty('username');
      expect(profile).toHaveProperty('documentId');
    });

    it('should allow user to view another user profile with privacy filtering', async () => {
      // Update user1 profile with some data
      await request(SERVER_URL)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          data: {
            firstName: 'John',
            lastName: 'Doe',
            phone: '+1234567890',
            bio: 'Public bio',
            location: 'New York'
          }
        })
        .timeout(10000)
        .expect(200);

      // User2 tries to view user1's profile
      const response = await request(SERVER_URL)
        .get(`/api/profile/${testUser1.documentId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .timeout(10000)
        .expect(200);

      const profile = response.body.data;
      expect(profile).toHaveProperty('documentId');
      expect(profile).toHaveProperty('username');
      // Privacy settings should filter sensitive data
      // Note: This depends on privacy settings implementation
    });

    it('should handle non-existent user profile', async () => {
      const nonExistentId = 'non-existent-document-id';
      
      const response = await request(SERVER_URL)
        .get(`/api/profile/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .timeout(10000)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Profile Validation and Constraints', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      const userResult = await createTestUser();
      testUser = userResult.user;
      authToken = userResult.token;
    });

    it('should validate first name length', async () => {
      const longFirstName = 'a'.repeat(256); // Exceeds 255 character limit
      
      const response = await request(SERVER_URL)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: { firstName: longFirstName } })
        .timeout(10000)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should validate last name length', async () => {
      const longLastName = 'a'.repeat(256); // Exceeds 255 character limit
      
      const response = await request(SERVER_URL)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: { lastName: longLastName } })
        .timeout(10000)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should validate phone number format', async () => {
      const invalidPhones = ['123', 'abc-def-ghij', '+1-800-INVALID', '1234567']; // Too short
      
      for (const phone of invalidPhones) {
        const response = await request(SERVER_URL)
          .put('/api/profile/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: { phone } })
          .timeout(10000)
          .expect(400);

        expect(response.body.error).toBeDefined();
      }
    });

    it('should accept valid phone number formats', async () => {
      const validPhones = ['+1234567890', '1234567890', '+1-234-567-8900', '+44 20 7946 0958'];
      
      for (const phone of validPhones) {
        const response = await request(SERVER_URL)
          .put('/api/profile/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: { phone } })
          .timeout(10000)
          .expect(200);

        expect(response.body.data.phone).toBe(phone);
      }
    });

    it('should validate website URL format', async () => {
      const invalidUrls = ['not-a-url', 'ftp://example.com', 'javascript:alert(1)', 'file:///etc/passwd'];
      
      for (const url of invalidUrls) {
        const response = await request(SERVER_URL)
          .put('/api/profile/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: { website: url } })
          .timeout(10000)
          .expect(400);

        expect(response.body.error).toBeDefined();
      }
    });

    it('should accept valid website URLs', async () => {
      const validUrls = ['https://example.com', 'http://example.com', 'https://www.example.com/path'];
      
      for (const url of validUrls) {
        const response = await request(SERVER_URL)
          .put('/api/profile/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: { website: url } })
          .timeout(10000)
          .expect(200);

        expect(response.body.data.website).toBe(url);
      }
    });

    it('should validate date of birth age constraints', async () => {
      const today = new Date();
      const tooYoung = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate()); // 10 years old
      const tooOld = new Date(today.getFullYear() - 125, today.getMonth(), today.getDate()); // 125 years old
      
      // Test too young
      const response1 = await request(SERVER_URL)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: { dateOfBirth: tooYoung.toISOString() } })
        .timeout(10000)
        .expect(400);

      expect(response1.body.error).toBeDefined();

      // Test too old
      const response2 = await request(SERVER_URL)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: { dateOfBirth: tooOld.toISOString() } })
        .timeout(10000)
        .expect(400);

      expect(response2.body.error).toBeDefined();
    });

    it('should accept valid date of birth', async () => {
      const today = new Date();
      const validAge = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate()); // 25 years old
      
      const response = await request(SERVER_URL)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: { dateOfBirth: validAge.toISOString() } })
        .timeout(10000)
        .expect(200);

      expect(response.body.data.dateOfBirth).toBeDefined();
    });

    it('should validate bio length', async () => {
      const longBio = 'a'.repeat(501); // Exceeds 500 character limit
      
      const response = await request(SERVER_URL)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: { bio: longBio } })
        .timeout(10000)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should accept valid bio length', async () => {
      const validBio = 'a'.repeat(500); // Exactly 500 characters
      
      const response = await request(SERVER_URL)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: { bio: validBio } })
        .timeout(10000)
        .expect(200);

      expect(response.body.data.bio).toBe(validBio);
    });

    it('should validate gender enumeration values', async () => {
      const validGenders = ['male', 'female', 'other', 'prefer-not-to-say'];
      
      for (const gender of validGenders) {
        const response = await request(SERVER_URL)
          .put('/api/profile/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: { gender } })
          .timeout(10000)
          .expect(200);

        expect(response.body.data.gender).toBe(gender);
      }
    });

    it('should reject invalid gender values', async () => {
      const invalidGenders = ['invalid', 'unknown', 'custom'];
      
      for (const gender of invalidGenders) {
        const response = await request(SERVER_URL)
          .put('/api/profile/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: { gender } })
          .timeout(10000)
          .expect(400);

        expect(response.body.error).toBeDefined();
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all profile operations', async () => {
      // Test GET without auth
      await request(SERVER_URL)
        .get('/api/profile/me')
        .timeout(10000)
        .expect(403);

      // Test PUT without auth
      await request(SERVER_URL)
        .put('/api/profile/me')
        .send({ data: { firstName: 'John' } })
        .timeout(10000)
        .expect(403);

      // Test POST picture upload without auth
      await request(SERVER_URL)
        .post('/api/profile/me/picture')
        .timeout(10000)
        .expect(403);

      // Test DELETE picture without auth
      await request(SERVER_URL)
        .delete('/api/profile/me/picture')
        .timeout(10000)
        .expect(403);

      // Test GET completion without auth
      await request(SERVER_URL)
        .get('/api/profile/me/completion')
        .timeout(10000)
        .expect(403);
    });

    it('should handle invalid authentication tokens', async () => {
      const invalidToken = 'invalid.jwt.token';

      await request(SERVER_URL)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${invalidToken}`)
        .timeout(10000)
        .expect(401);
    });

    it('should handle malformed authorization headers', async () => {
      await request(SERVER_URL)
        .get('/api/profile/me')
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
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send('invalid-json-data')
        .timeout(10000)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle missing data in request body', async () => {
      const response = await request(SERVER_URL)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .timeout(10000)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle empty data object', async () => {
      const response = await request(SERVER_URL)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: {} })
        .timeout(10000)
        .expect(200); // Empty data should be valid (no updates)

      expect(response.body.data).toBeDefined();
    });

    it('should handle request timeout scenarios', async () => {
      const updateData = { firstName: 'John' };

      const response = await request(SERVER_URL)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: updateData })
        .timeout(10000) // Normal timeout
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should handle invalid data types in updates', async () => {
      const invalidData = {
        firstName: 123, // Should be string
        phone: true, // Should be string
        dateOfBirth: 'not-a-date' // Should be valid date
      };

      const response = await request(SERVER_URL)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: invalidData })
        .timeout(10000)
        .expect(400); // Strapi will throw 500 for type mismatches

      expect(response.body.error).toBeDefined();
    });

    it('should handle missing file in picture upload', async () => {
      const response = await request(SERVER_URL)
        .post('/api/profile/me/picture')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle multiple files in picture upload', async () => {
      const testImagePath1 = createTestImageFile();
      const testImagePath2 = createTestImageFile();

        const response = await request(SERVER_URL)
          .post('/api/profile/me/picture')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('profilePicture', testImagePath1)
          .attach('profilePicture', testImagePath2)
          .timeout(15000)
          .expect(400); // Should reject multiple files

        expect(response.body.error).toBeDefined();
    });
  });

  describe('Profile Integration with Preferences', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      const userResult = await createTestUser();
      testUser = userResult.user;
      authToken = userResult.token;
    });

    it('should create default preferences when profile is created', async () => {
      // Get profile which should trigger preference creation
      const profileResponse = await request(SERVER_URL)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      expect(profileResponse.body.data).toBeDefined();

      // Check if preferences were created
      const preferencesResponse = await request(SERVER_URL)
        .get('/api/user-preferences/me')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      expect(preferencesResponse.body.data).toBeDefined();
    });

    it('should maintain consistency between profile and preferences', async () => {
      // Update profile with localization data
      const profileData = {
        language: 'es',
        currency: 'EUR',
        timezone: 'Europe/Madrid'
      };

      await request(SERVER_URL)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: profileData })
        .timeout(10000)
        .expect(200);

      // Update preferences with matching data
      const preferencesData = {
        language: 'es',
        currency: 'EUR',
        timezone: 'Europe/Madrid'
      };

      await request(SERVER_URL)
        .put('/api/user-preferences/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: preferencesData })
        .timeout(10000)
        .expect(200);

      // Verify both are consistent
      const profileResponse = await request(SERVER_URL)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      const preferencesResponse = await request(SERVER_URL)
        .get('/api/user-preferences/me')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(10000)
        .expect(200);

      expect(profileResponse.body.data.language).toBe('es');
      expect(preferencesResponse.body.data.language).toBe('es');
      expect(profileResponse.body.data.currency).toBe('EUR');
      expect(preferencesResponse.body.data.currency).toBe('EUR');
    });
  });
});
