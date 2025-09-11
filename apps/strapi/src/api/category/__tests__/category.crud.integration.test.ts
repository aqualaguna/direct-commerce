import request from 'supertest';

describe('Category CRUD Integration Tests', () => {
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
            category.name && category.name.includes('Retrieve Test Category') ||
            category.name && category.name.includes('Update Test Category') ||
            category.name && category.name.includes('List Test Category') ||
            category.name && category.name.includes('Delete Test Category') ||
            category.name && category.name.includes('404 Test Category')) {
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

  describe('Category CRUD Operations', () => {
    let createdCategoryId: string;

    it('should create a new category', async () => {
      const response = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: testCategory })
        .timeout(10000);

      expect([200, 201]).toContain(response.status);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(testCategory.name);
      expect(response.body.data.slug).toBe(testCategory.slug);

      createdCategoryId = response.body.data.documentId;

      // Clean up immediately after test
      try {
        await request(SERVER_URL)
          .delete(`/api/categories/${createdCategoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn(`Failed to delete category ${createdCategoryId}:`, error);
      }
    });

    it('should retrieve the created category', async () => {
      // Create a fresh category for this test
      const createResponse = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { ...testCategory, name: `Retrieve Test Category ${timestamp}`, slug: `retrieve-test-category-${timestamp}` } })
        .timeout(10000);

      expect([200, 201]).toContain(createResponse.status);
      const categoryId = createResponse.body.data.documentId;
      const response = await request(SERVER_URL)
        .get(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBe(categoryId);
      expect(response.body.data.name).toBe(`Retrieve Test Category ${timestamp}`);

      // Clean up immediately after test
      try {
        await request(SERVER_URL)
          .delete(`/api/categories/${categoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn(`Failed to delete category ${categoryId}:`, error);
      }
    });

    it('should update the category', async () => {
      // Create a fresh category for this test
      const createResponse = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { ...testCategory, name: `Update Test Category ${timestamp}`, slug: `update-test-category-${timestamp}` } })
        .timeout(10000);

      expect([200, 201]).toContain(createResponse.status);
      const categoryId = createResponse.body.data.documentId;

      const updateData = {
        name: `Updated Test Category ${timestamp}`,
        description: 'Updated description'
      };

      const response = await request(SERVER_URL)
        .put(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .timeout(10000);
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);

      // Clean up immediately after test
      try {
        await request(SERVER_URL)
          .delete(`/api/categories/${categoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn(`Failed to delete category ${categoryId}:`, error);
      }
    });

    it('should list categories', async () => {
      // Create a fresh category for this test
      const createResponse = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { ...testCategory, name: `List Test Category ${timestamp}`, slug: `list-test-category-${timestamp}` } })
        .timeout(10000);

      expect([200, 201]).toContain(createResponse.status);
      const categoryId = createResponse.body.data.documentId;
      const response = await request(SERVER_URL)
        .get('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Clean up
      await request(SERVER_URL)
        .delete(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
    });

    it('should delete the category', async () => {
      // Create a fresh category for this test
      const createResponse = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { ...testCategory, name: `Delete Test Category ${timestamp}`, slug: `delete-test-category-${timestamp}` } })
        .timeout(10000);

      expect([200, 201]).toContain(createResponse.status);
      const categoryId = createResponse.body.data.documentId;

      const response = await request(SERVER_URL)
        .delete(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      expect(response.status).toBe(200);
      // Category is already deleted in this test, no cleanup needed
    });

    it('should return 404 for deleted category', async () => {
      // Create a fresh category for this test
      const createResponse = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { ...testCategory, name: `404 Test Category ${timestamp}`, slug: `404-test-category-${timestamp}` } })
        .timeout(10000);

      expect([200, 201]).toContain(createResponse.status);
      const categoryId = createResponse.body.data.documentId;

      // Delete the category
      await request(SERVER_URL)
        .delete(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      // Try to retrieve the deleted category
      const response = await request(SERVER_URL)
        .get(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(404);
      // Category is already deleted in this test, no cleanup needed
    });
  });
});
