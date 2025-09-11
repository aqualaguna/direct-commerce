/**
 * Category Integration Test Suite
 * 
 * This is the main integration test file that provides a high-level overview
 * of the category API functionality. For detailed tests, see the specialized
 * test files:
 * 
 * - category.crud.test.ts - Basic CRUD operations
 * - category.validation.test.ts - Input validation and error handling
 * - category.hierarchy.test.ts - Category hierarchy and tree structures
 * - category.products.test.ts - Product relationship management
 * - category.navigation.test.ts - Search, filtering, and navigation
 */

import request from 'supertest';

describe('Category Integration Tests - Overview', () => {
  const SERVER_URL = 'http://localhost:1337';
  let adminToken: string;

  // Generate unique test data with timestamp
  const timestamp = Date.now();
  const testCategory = {
    name: `Test Category ${timestamp}`,
    description: 'This is a test category for integration testing',
    slug: `test-category-${timestamp}`
  };

  beforeAll(async () => {
    // Get admin token for authenticated requests
    adminToken = process.env.STRAPI_API_TOKEN as string;

    if (!adminToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }
  });

  afterAll(async () => {
    // Global cleanup - delete all test categories that might have been left behind
    try {
      const response = await request(SERVER_URL)
        .get('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      if (response.status === 200 && response.body.data) {
        const categories = response.body.data;
        for (const category of categories) {
          // Only delete categories that match our test pattern
          if (category.name && category.name.includes('Test Category')) {
            try {
              await request(SERVER_URL)
                .delete(`/api/categories/${category.documentId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .timeout(10000);
            } catch (error) {
              console.warn(`Failed to delete category ${category.documentId}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to perform global cleanup:', error);
    }
  });

  describe('API Health Check', () => {
    it('should be able to connect to the category API', async () => {
      const response = await request(SERVER_URL)
        .get('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require authentication for protected endpoints', async () => {
      const response = await request(SERVER_URL)
        .post('/api/categories')
        .send({ data: testCategory })
        .timeout(10000);

      expect(response.status).toBe(403);
    });

    it('should handle invalid category ID gracefully', async () => {
      const response = await request(SERVER_URL)
        .get('/api/categories/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(404);
    });
  });

  describe('Basic Functionality Smoke Test', () => {
    let testCategoryId: string;

    afterEach(async () => {
      // Clean up test category
      if (testCategoryId) {
        try {
          await request(SERVER_URL)
            .delete(`/api/categories/${testCategoryId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .timeout(10000);
        } catch (error) {
          console.warn(`Failed to delete category ${testCategoryId}:`, error);
        }
        testCategoryId = '';
      }
    });

    it('should perform basic CRUD operations', async () => {
      // Create
      const createResponse = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: testCategory })
        .timeout(10000);

      expect([200, 201]).toContain(createResponse.status);
      expect(createResponse.body.data).toBeDefined();
      testCategoryId = createResponse.body.data.documentId;

      // Read
      const readResponse = await request(SERVER_URL)
        .get(`/api/categories/${testCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.data.documentId).toBe(testCategoryId);

      // Update
      const updateResponse = await request(SERVER_URL)
        .put(`/api/categories/${testCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { name: `Updated ${testCategory.name}` } })
        .timeout(10000);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.name).toBe(`Updated ${testCategory.name}`);

      // Delete
      const deleteResponse = await request(SERVER_URL)
        .delete(`/api/categories/${testCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(deleteResponse.status).toBe(200);
      testCategoryId = ''; // Mark as deleted
    });

    it('should support category hierarchy', async () => {
      // Create parent category
      const parentResponse = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { ...testCategory, name: `Parent ${testCategory.name}`, slug: `parent-${testCategory.slug}` } })
        .timeout(10000);

      expect([200, 201]).toContain(parentResponse.status);
      const parentId = parentResponse.body.data.documentId;

      // Create child category
      const childResponse = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          data: { 
            ...testCategory, 
            name: `Child ${testCategory.name}`, 
            slug: `child-${testCategory.slug}`,
            parent: parentId 
          } 
        })
        .timeout(10000);

      expect([200, 201]).toContain(childResponse.status);
      testCategoryId = childResponse.body.data.documentId;

      // Verify hierarchy
      const hierarchyResponse = await request(SERVER_URL)
        .get(`/api/categories/${testCategoryId}?populate=parent`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(hierarchyResponse.status).toBe(200);
      expect(hierarchyResponse.body.data.parent).toBeDefined();
      expect(hierarchyResponse.body.data.parent.documentId).toBe(parentId);

      // Clean up
      await request(SERVER_URL)
        .delete(`/api/categories/${testCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      await request(SERVER_URL)
        .delete(`/api/categories/${parentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      testCategoryId = '';
    });
  });
});