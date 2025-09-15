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
      console.warn('STRAPI_API_TOKEN not set, attempting to use public access');
      // For public endpoints, we can proceed without token
    }
  });

  afterAll(async () => {
    // Global cleanup - delete all test categories that might have been left behind
    try {
      const requestBuilder = request(SERVER_URL)
        .get('/api/categories')
        .timeout(10000);
      
      if (adminToken) {
        requestBuilder.set('Authorization', `Bearer ${adminToken}`);
      }
      
      const response = await requestBuilder;

      if (response.status === 200 && response.body.data) {
        const categories = response.body.data;
        for (const category of categories) {
          // Only delete categories that match our test pattern
          if (category.name && category.name.includes('Test Category') ||
            category.name && category.name.includes('Duplicate Slug Category')) {
            try {
              const deleteRequestBuilder = request(SERVER_URL)
                .delete(`/api/categories/${category.documentId}`)
                .timeout(10000);
              
              if (adminToken) {
                deleteRequestBuilder.set('Authorization', `Bearer ${adminToken}`);
              }
              
              await deleteRequestBuilder;
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

      const requestBuilder = request(SERVER_URL)
        .post('/api/categories')
        .send({ data: invalidCategory })
        .timeout(10000);
      
      if (adminToken) {
        requestBuilder.set('Authorization', `Bearer ${adminToken}`);
      }
      
      const response = await requestBuilder;

      expect(response.status).toBe(400);
    });

    it('should reject category with duplicate slug', async () => {
      // First, create a category with a unique slug
      const uniqueSlug = `unique-slug-${timestamp}`;
      const requestBuilder1 = request(SERVER_URL)
        .post('/api/categories')
        .send({ data: { ...testCategory, slug: uniqueSlug } })
        .timeout(10000);
      
      if (adminToken) {
        requestBuilder1.set('Authorization', `Bearer ${adminToken}`);
      }
      
      const response1 = await requestBuilder1;

      expect([200, 201]).toContain(response1.status);
      const firstCategoryId = response1.body.data.documentId;

      // Try to create another category with the same slug
      const duplicateCategory = {
        ...testCategory,
        name: `Duplicate Slug Category ${timestamp}`,
        slug: uniqueSlug // Same slug as the first category
      };

      const requestBuilder2 = request(SERVER_URL)
        .post('/api/categories')
        .send({ data: duplicateCategory })
        .timeout(10000);
      
      if (adminToken) {
        requestBuilder2.set('Authorization', `Bearer ${adminToken}`);
      }
      
      const response2 = await requestBuilder2;

      expect(response2.status).toBe(400);

      // Clean up
      try {
        const deleteRequestBuilder = request(SERVER_URL)
          .delete(`/api/categories/${firstCategoryId}`)
          .timeout(10000);
        
        if (adminToken) {
          deleteRequestBuilder.set('Authorization', `Bearer ${adminToken}`);
        }
        
        await deleteRequestBuilder;
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

      const requestBuilder = request(SERVER_URL)
        .post('/api/categories')
        .send({ data: invalidCategory })
        .timeout(10000);
      
      if (adminToken) {
        requestBuilder.set('Authorization', `Bearer ${adminToken}`);
      }
      
      const response = await requestBuilder;

      expect(response.status).toBe(400);
    });

    it('should reject category with circular reference', async () => {
      // Create a parent category
      const parentRequestBuilder = request(SERVER_URL)
        .post('/api/categories')
        .send({ data: { ...testCategory, name: `Parent Category ${timestamp}`, slug: `parent-category-${timestamp}` } })
        .timeout(10000);
      
      if (adminToken) {
        parentRequestBuilder.set('Authorization', `Bearer ${adminToken}`);
      }
      
      const parentResponse = await parentRequestBuilder;

      expect([200, 201]).toContain(parentResponse.status);
      const parentCategoryId = parentResponse.body.data.documentId;

      // Create a child category
      const childRequestBuilder = request(SERVER_URL)
        .post('/api/categories')
        .send({ data: { ...testCategory, name: `Child Category ${timestamp}`, slug: `child-category-${timestamp}`, parent: parentCategoryId } })
        .timeout(10000);
      
      if (adminToken) {
        childRequestBuilder.set('Authorization', `Bearer ${adminToken}`);
      }
      
      const childResponse = await childRequestBuilder;

      expect([200, 201]).toContain(childResponse.status);
      const childCategoryId = childResponse.body.data.documentId;

      // Try to make parent a child of its child (circular reference)
      const updateRequestBuilder = request(SERVER_URL)
        .put(`/api/categories/${parentCategoryId}`)
        .send({ data: { parent: childCategoryId } })
        .timeout(10000);
      
      if (adminToken) {
        updateRequestBuilder.set('Authorization', `Bearer ${adminToken}`);
      }
      
      const updateResponse = await updateRequestBuilder;

      expect(updateResponse.status).toBe(400);

      // Clean up
      try {
        const deleteChildRequestBuilder = request(SERVER_URL)
          .delete(`/api/categories/${childCategoryId}`)
          .timeout(10000);
        
        if (adminToken) {
          deleteChildRequestBuilder.set('Authorization', `Bearer ${adminToken}`);
        }
        
        await deleteChildRequestBuilder;
        
        const deleteParentRequestBuilder = request(SERVER_URL)
          .delete(`/api/categories/${parentCategoryId}`)
          .timeout(10000);
        
        if (adminToken) {
          deleteParentRequestBuilder.set('Authorization', `Bearer ${adminToken}`);
        }
        
        await deleteParentRequestBuilder;
      } catch (error) {
        console.warn('Failed to delete test categories:', error);
      }
    });
  });
});
