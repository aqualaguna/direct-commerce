import request from 'supertest';

describe('Category Validation Integration Tests', () => {
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
          if (category.name && category.name.includes('Test Category') ||
            category.name && category.name.includes('Duplicate Slug Category')) {
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

  describe('Category Validation', () => {
    it('should reject category with missing required fields', async () => {
      const invalidCategory = {
        description: 'Category without name'
      };

      const response = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidCategory })
        .timeout(10000);

      expect(response.status).toBe(400);
    });

    it('should reject category with duplicate slug', async () => {
      // First, create a category with a unique slug
      const uniqueSlug = `unique-slug-${timestamp}`;
      const response1 = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { ...testCategory, slug: uniqueSlug } })
        .timeout(10000);

      expect([200, 201]).toContain(response1.status);
      const firstCategoryId = response1.body.data.documentId;

      // Try to create another category with the same slug
      const duplicateCategory = {
        ...testCategory,
        name: `Duplicate Slug Category ${timestamp}`,
        slug: uniqueSlug // Same slug as the first category
      };

      const response2 = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: duplicateCategory })
        .timeout(10000);

      expect(response2.status).toBe(400);

      // Clean up
      try {
        await request(SERVER_URL)
          .delete(`/api/categories/${firstCategoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn(`Failed to delete category ${firstCategoryId}:`, error);
      }
    });

    it('should reject category with invalid parent reference', async () => {
      const invalidCategory = {
        ...testCategory,
        name: `Invalid Parent Category ${timestamp}`,
        slug: `invalid-parent-category-${timestamp}`,
        parent: 'invalid-parent-id'
      };

      const response = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidCategory })
        .timeout(10000);

      expect(response.status).toBe(400);
    });

    it('should reject category with circular reference', async () => {
      // Create a parent category
      const parentResponse = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { ...testCategory, name: `Parent Category ${timestamp}`, slug: `parent-category-${timestamp}` } })
        .timeout(10000);

      expect([200, 201]).toContain(parentResponse.status);
      const parentCategoryId = parentResponse.body.data.documentId;

      // Create a child category
      const childResponse = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { ...testCategory, name: `Child Category ${timestamp}`, slug: `child-category-${timestamp}`, parent: parentCategoryId } })
        .timeout(10000);

      expect([200, 201]).toContain(childResponse.status);
      const childCategoryId = childResponse.body.data.documentId;

      // Try to make parent a child of its child (circular reference)
      const updateResponse = await request(SERVER_URL)
        .put(`/api/categories/${parentCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { parent: childCategoryId } })
        .timeout(10000);

      expect(updateResponse.status).toBe(400);

      // Clean up
      try {
        await request(SERVER_URL)
          .delete(`/api/categories/${childCategoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
        await request(SERVER_URL)
          .delete(`/api/categories/${parentCategoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn('Failed to delete test categories:', error);
      }
    });
  });
});
