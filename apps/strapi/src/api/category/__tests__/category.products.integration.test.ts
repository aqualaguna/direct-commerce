import request from 'supertest';

describe('Category Product Management Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let apiToken: string;

  // Generate unique test data with timestamp
  const timestamp = Date.now();
  const testCategory = {
    name: `Test Category ${timestamp}`,
    description: 'This is a test category for integration testing',
    slug: `test-category-${timestamp}`
  };

  beforeAll(async () => {
    // Get admin token for authenticated requests
    apiToken = process.env.STRAPI_API_TOKEN as string;

    if (!apiToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }
  });

  afterAll(async () => {
    // Global cleanup - delete all test categories that might have been left behind
    try {
      const response = await request(SERVER_URL)
        .get('/api/categories')
        .set('Authorization', `Bearer ${apiToken}`)
        .timeout(10000);

      if (response.status === 200 && response.body.data) {
        const categories = response.body.data;
        for (const category of categories) {
          // Only delete categories that match our test pattern
          if (category.name && category.name.includes('Product Test Category') ||
            category.name && category.name.includes('Target Category')) {
            try {
              await request(SERVER_URL)
                .delete(`/api/categories/${category.documentId}`)
                .set('Authorization', `Bearer ${apiToken}`)
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

  describe('Category Product Management', () => {
    let testCategoryId: string;
    let testProductIds: string[] = [];

    beforeAll(async () => {
      // Create a test category
      const categoryResponse = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: { ...testCategory, name: `Product Test Category ${timestamp}`, slug: `product-test-category-${timestamp}` } })
        .timeout(10000);

      expect(categoryResponse.status).toBe(201);
      testCategoryId = categoryResponse.body.data.documentId;

      // Create test products (using correct product schema) - without category initially
      const testProducts = [
        { 
          sku: `TEST-PROD-1-${timestamp}`, 
          name: `Test Product 1 ${timestamp}`,
          description: 'This is a test product for category testing',
          brand: 'Test Brand',
          inventory: 10,
          status: 'active'
        },
        { 
          sku: `TEST-PROD-2-${timestamp}`, 
          name: `Test Product 2 ${timestamp}`,
          description: 'This is another test product for category testing',
          brand: 'Test Brand',
          inventory: 5,
          status: 'active'
        }
      ];

      for (const product of testProducts) {
        try {
          const productResponse = await request(SERVER_URL)
            .post('/api/products')
            .set('Authorization', `Bearer ${apiToken}`)
            .send({ data: product })
            .timeout(10000);


          if (productResponse.status === 200 || productResponse.status === 201) {
            testProductIds.push(productResponse.body.data.documentId);
          } else {
            console.warn(`Failed to create product ${product.sku}:`, productResponse.body);
          }
        } catch (error) {
          console.warn('Failed to create test product:', error);
        }
      }

      if (testProductIds.length === 0) {
        throw new Error('No test products were created successfully. Cannot proceed with category product tests.');
      } else {
        // Assign products to the category for testing
        try {
          await request(SERVER_URL)
            .post(`/api/categories/${testCategoryId}/products/assign`)
            .set('Authorization', `Bearer ${apiToken}`)
            .send({ productIds: testProductIds })
            .timeout(10000);
          
        } catch (error) {
          console.warn('Failed to assign products to category initially:', error);
        }
      }
    });

    afterAll(async () => {
      // Clean up products
      for (const productId of testProductIds) {
        try {
          await request(SERVER_URL)
            .delete(`/api/products/${productId}`)
            .set('Authorization', `Bearer ${apiToken}`)
            .timeout(10000);
        } catch (error) {
          console.warn(`Failed to delete product ${productId}:`, error);
        }
      }

      // Clean up category
      if (testCategoryId) {
        try {
          await request(SERVER_URL)
            .delete(`/api/categories/${testCategoryId}`)
            .set('Authorization', `Bearer ${apiToken}`)
            .timeout(10000);
        } catch (error) {
          console.warn(`Failed to delete category ${testCategoryId}:`, error);
        }
      }
    });

    it('should get products in category', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/categories/${testCategoryId}/products`)
        .set('Authorization', `Bearer ${apiToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should assign products to category', async () => {
      if (testProductIds.length === 0) {
        console.warn('No test products available for assignment test');
        expect(testProductIds.length).toBeGreaterThan(0);
        return;
      }

      const response = await request(SERVER_URL)
        .post(`/api/categories/${testCategoryId}/products/assign`)
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ productIds: testProductIds })
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.message).toBe('Products assigned successfully');
    });

    it('should remove products from category', async () => {
      if (testProductIds.length === 0) {
        console.warn('No test products available for removal test');
        expect(testProductIds.length).toBeGreaterThan(0);
        return;
      }

      const response = await request(SERVER_URL)
        .post(`/api/categories/${testCategoryId}/products/remove`)
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ productIds: testProductIds })
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.message).toBe('Products removed successfully');
    });

    it('should move products between categories', async () => {
      if (testProductIds.length === 0) {
        console.warn('No test products available for move test');
        expect(testProductIds.length).toBeGreaterThan(0);
        return;
      }

      // Create a target category
      const targetCategoryResponse = await request(SERVER_URL)
        .post('/api/categories')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: { ...testCategory, name: `Target Category ${timestamp}`, slug: `target-category-${timestamp}` } })
        .timeout(10000);

      expect(targetCategoryResponse.status).toBe(201);
      const targetCategoryId = targetCategoryResponse.body.data.documentId;

      try {
        const response = await request(SERVER_URL)
          .post(`/api/categories/${testCategoryId}/products/move`)
          .set('Authorization', `Bearer ${apiToken}`)
          .send({ 
            targetCategoryId: targetCategoryId,
            productIds: testProductIds 
          })
          .timeout(10000);

        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.message).toBe('Products moved successfully');
      } finally {
        // Clean up target category
        try {
          await request(SERVER_URL)
            .delete(`/api/categories/${targetCategoryId}`)
            .set('Authorization', `Bearer ${apiToken}`)
            .timeout(10000);
        } catch (error) {
          console.warn(`Failed to delete target category ${targetCategoryId}:`, error);
        }
      }
    });

    it('should handle invalid product assignment', async () => {
      const response = await request(SERVER_URL)
        .post(`/api/categories/${testCategoryId}/products/assign`)
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ productIds: ['invalid-product-id'] })
        .timeout(10000);

      // Should handle gracefully - either succeed or fail with proper error
      expect([200, 400, 404]).toContain(response.status);
      
      if (response.status === 400 || response.status === 404) {
        expect(response.body.error).toBeDefined();
      }
    });

    it('should handle empty product list for assignment', async () => {
      const response = await request(SERVER_URL)
        .post(`/api/categories/${testCategoryId}/products/assign`)
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ productIds: [] })
        .timeout(10000);

      expect(response.status).toBe(400);
    });

    it('should handle missing productIds in assignment request', async () => {
      const response = await request(SERVER_URL)
        .post(`/api/categories/${testCategoryId}/products/assign`)
        .set('Authorization', `Bearer ${apiToken}`)
        .send({})
        .timeout(10000);

      expect(response.status).toBe(200);
    });

    it('should handle non-existent category for product operations', async () => {
      const nonExistentCategoryId = 'non-existent-category-id';
      
      const response = await request(SERVER_URL)
        .get(`/api/categories/${nonExistentCategoryId}/products`)
        .set('Authorization', `Bearer ${apiToken}`)
        .timeout(10000);

      expect(response.status).toBe(404);
    });

    it('should handle unauthorized access to category product operations', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/categories/${testCategoryId}/products`)
        .timeout(10000);

      expect(response.status).toBe(401);
    });
  });
});
