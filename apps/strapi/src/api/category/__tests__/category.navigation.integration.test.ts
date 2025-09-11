import request from 'supertest';

describe('Category Navigation and Search Integration Tests', () => {
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
          if (category.name && category.name.includes('Electronics') ||
            category.name && category.name.includes('Clothing') ||
            category.name && category.name.includes('Books') ||
            category.name && category.name.includes('Search Test Category')) {
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

  describe('Category Filtering and Search', () => {
    let testCategories: string[] = [];

    beforeAll(async () => {
      // Create multiple test categories with unique timestamps
      const testTimestamp = Date.now();
      const categories = [
        { ...testCategory, name: `Electronics ${testTimestamp}`, slug: `electronics-${testTimestamp}` },
        { ...testCategory, name: `Clothing ${testTimestamp}`, slug: `clothing-${testTimestamp}` },
        { ...testCategory, name: `Books ${testTimestamp}`, slug: `books-${testTimestamp}` }
      ];

      for (const category of categories) {
        const response = await request(SERVER_URL)
          .post('/api/categories')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: category })
          .timeout(10000);

        if (response.status === 200 || response.status === 201) {
          testCategories.push(response.body.data.documentId);
        }
      }
    });

    afterAll(async () => {
      // Clean up test categories
      for (const categoryId of testCategories) {
        try {
          await request(SERVER_URL)
            .delete(`/api/categories/${categoryId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .timeout(10000);
        } catch (error) {
          console.warn(`Failed to delete category ${categoryId}:`, error);
        }
      }
      testCategories = [];
    });

    it('should search categories by name', async () => {
      const response = await request(SERVER_URL)
        .get('/api/categories?filters[name][$containsi]=Electronics')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should paginate categories', async () => {
      const response = await request(SERVER_URL)
        .get('/api/categories?pagination[page]=1&pagination[pageSize]=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta.pagination).toBeDefined();
      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.pageSize).toBe(2);
    });

    it('should search categories with search endpoint', async () => {
      const response = await request(SERVER_URL)
        .post('/api/categories/search?q=Electronics')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle search with empty query', async () => {
      const response = await request(SERVER_URL)
        .post('/api/categories/search?q=')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(400);
    });

    it('should handle search with missing query parameter', async () => {
      const response = await request(SERVER_URL)
        .post('/api/categories/search')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(400);
    });

    it('should filter categories by slug', async () => {
      const response = await request(SERVER_URL)
        .get('/api/categories?filters[slug][$containsi]=electronics')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should sort categories by name', async () => {
      const response = await request(SERVER_URL)
        .get('/api/categories?sort=name:asc')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should sort categories by creation date', async () => {
      const response = await request(SERVER_URL)
        .get('/api/categories?sort=createdAt:desc')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should limit search results', async () => {
      const response = await request(SERVER_URL)
        .post('/api/categories/search?q=Test&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should handle pagination with large page size', async () => {
      const response = await request(SERVER_URL)
        .get('/api/categories?pagination[page]=1&pagination[pageSize]=100')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta.pagination).toBeDefined();
      expect(response.body.meta.pagination.pageSize).toBeLessThanOrEqual(100);
    });

    it('should handle pagination with invalid page number', async () => {
      const response = await request(SERVER_URL)
        .get('/api/categories?pagination[page]=0&pagination[pageSize]=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta.pagination.page).toBeGreaterThanOrEqual(1);
    });
  });
});
