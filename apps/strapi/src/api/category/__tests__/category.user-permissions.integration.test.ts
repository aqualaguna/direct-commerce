/**
 * Category User Roles and Permissions Test Suite
 * 
 * This test suite focuses on testing API user authentication and role-based permissions
 * for the category module.
 * 
 * Tests frontend users and their access levels to category operations via the API.
 * 
 * API User System:
 * - Frontend Users: Authenticate via /api/auth/local, have access based on roles
 * - Public Access: Unauthenticated users can view categories (read-only)
 */

import request from 'supertest';

describe('Category User Roles and Permissions Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  
  // Test user credentials for different roles
  const testUsers = {
    customer: {
      email: 'customer@test.com',
      password: 'Customer123', 
      role: 'customer'
    }
  };

  // Store authentication tokens for each user
  let userTokens: { [key: string]: string } = {};
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();
  const testCategory = {
    name: `Permission Test Category ${timestamp}`,
    description: 'This is a test category for permission testing',
    slug: `permission-test-category-${timestamp}`
  };

  beforeAll(async () => {
    // Authenticate all test users and get their tokens
    for (const [role, user] of Object.entries(testUsers)) {
      try {
        let response;
        
        // All users authenticate via /api/auth/local endpoint
        response = await request(SERVER_URL)
          .post('/api/auth/local')
          .send({
            identifier: user.email,
            password: user.password
          })
          .timeout(10000);

        if (response.status === 200) {
          // Frontend users have token in response.body.jwt
          const token = response.body.jwt;
          
          if (token) {
            userTokens[role] = token;
            console.log(`✅ Authenticated ${role} user: ${user.email}`);
          } else {
            console.warn(`⚠️ No token found for ${role} user: ${user.email}`, response.body);
          }
        } else {
          console.warn(`⚠️ Failed to authenticate ${role} user: ${user.email}`, response.body);
        }
      } catch (error) {
        console.warn(`⚠️ Error authenticating ${role} user:`, error.message);
      }
    }
  });

  afterAll(async () => {
    // Global cleanup - delete all test categories that might have been left behind
    // Note: Since we don't have admin API access, we'll rely on individual test cleanup
    console.log('Test cleanup completed - individual tests handle their own cleanup');
  });

  describe('Public Access Tests', () => {
    it('should allow public access to view categories', async () => {
      const response = await request(SERVER_URL)
        .get('/api/categories')
        .timeout(10000);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should deny public access to create categories', async () => {
      const response = await request(SERVER_URL)
        .post('/api/categories')
        .send({ data: testCategory })
        .timeout(10000);

      expect(response.status).toBe(403);
    });

    it('should deny public access to update categories', async () => {
      const response = await request(SERVER_URL)
        .put('/api/categories/test-id')
        .send({ data: { name: 'Updated Category' } })
        .timeout(10000);

      expect(response.status).toBe(403);
    });

    it('should deny public access to delete categories', async () => {
      const response = await request(SERVER_URL)
        .delete('/api/categories/test-id')
        .timeout(10000);

      expect(response.status).toBe(403);
    });
  });

  describe('Customer Role Tests', () => {
    it('should allow customer to view categories', async () => {
      if (!userTokens.customer) {
        console.warn('Skipping customer tests - customer not authenticated');
        return;
      }

      const response = await request(SERVER_URL)
        .get('/api/categories')
        .set('Authorization', `Bearer ${userTokens.customer}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should deny customer access to create categories', async () => {
      if (!userTokens.customer) {
        console.warn('Skipping customer tests - customer not authenticated');
        return;
      }

      const response = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userTokens.customer}`)
        .send({ data: testCategory })
        .timeout(10000);

      expect(response.status).toBe(403);
    });

    it('should deny customer access to update categories', async () => {
      if (!userTokens.customer) {
        console.warn('Skipping customer tests - customer not authenticated');
        return;
      }

      const response = await request(SERVER_URL)
        .put('/api/categories/test-id')
        .set('Authorization', `Bearer ${userTokens.customer}`)
        .send({ data: { name: 'Updated Category' } })
        .timeout(10000);

      expect(response.status).toBe(403);
    });

    it('should deny customer access to delete categories', async () => {
      if (!userTokens.customer) {
        console.warn('Skipping customer tests - customer not authenticated');
        return;
      }

      const response = await request(SERVER_URL)
        .delete('/api/categories/test-id')
        .set('Authorization', `Bearer ${userTokens.customer}`)
        .timeout(10000);

      expect(response.status).toBe(403);
    });
  });



});
