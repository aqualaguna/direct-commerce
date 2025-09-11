import request from 'supertest';

describe('Product Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let adminToken: string;
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();
  const testProduct = {
    title: `Test Product ${timestamp}`,
    description: 'This is a test product for integration testing',
    sku: `TEST-${timestamp}`,
    status: 'draft',
    inventory: 0
  };

  beforeAll(async () => {
    // Get admin token for authenticated requests
    adminToken = process.env.STRAPI_API_TOKEN as string;

    if (!adminToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }
  });

  afterAll(async () => {
    // Global cleanup - delete all test products that might have been left behind
    try {
      const response = await request(SERVER_URL)
        .get('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      if (response.status === 200 && response.body.data) {
        const products = response.body.data;
        for (const product of products) {
          // Only delete products that match our test pattern
          if (product.title && product.title.includes('Test Product')) {
            try {
              await request(SERVER_URL)
                .delete(`/api/products/${product.documentId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .timeout(10000);
            } catch (error) {
              console.warn(`Failed to delete product ${product.documentId}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to perform global cleanup:', error);
    }
  });

  describe('API Health Check', () => {
    it('should be able to connect to the product API', async () => {
      const response = await request(SERVER_URL)
        .get('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require authentication for protected endpoints', async () => {
      const response = await request(SERVER_URL)
        .post('/api/products')
        .send({ data: testProduct })
        .timeout(10000);

      expect(response.status).toBe(403);
    });

    it('should handle invalid product ID gracefully', async () => {
      const response = await request(SERVER_URL)
        .get('/api/products/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(404);
    });
  });

  describe('Product CRUD Operations', () => {
    let createdProductId: string;

    it.only('should create a new product', async () => {
      const response = await request(SERVER_URL)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: testProduct })
        .timeout(10000);
      console.log(response.body);
      expect([200, 201]).toContain(response.status);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.title).toBe(testProduct.title);
      expect(response.body.data.sku).toBe(testProduct.sku);
      
      createdProductId = response.body.data.documentId;
    });

    it('should retrieve the created product', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBe(createdProductId);
      expect(response.body.data.title).toBe(testProduct.title);
    });

    it('should update the product', async () => {
      const updateData = {
        title: `Updated ${testProduct.title}`,
      };

      const response = await request(SERVER_URL)
        .put(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .timeout(10000);
      
      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe(updateData.title);
    });

    it('should list products', async () => {
      const response = await request(SERVER_URL)
        .get('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should delete the product', async () => {
      const response = await request(SERVER_URL)
        .delete(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      
      expect(response.status).toBe(200);
    });

    it('should return 404 for deleted product', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      
      expect(response.status).toBe(404);
    });
  });

  describe('Product Validation', () => {
    it('should reject product with missing required fields', async () => {
      const invalidProduct = {
        description: 'Product without title'
      };

      const response = await request(SERVER_URL)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidProduct })
        .timeout(10000);
      
      expect(response.status).toBe(400);
    });

    it('should reject product with duplicate SKU', async () => {
      // First, create a product
      const response1 = await request(SERVER_URL)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: testProduct })
        .timeout(10000);
      
      expect([200, 201]).toContain(response1.status);
      const firstProductId = response1.body.data.documentId;

      // Try to create another product with the same SKU
      const duplicateProduct = {
        ...testProduct,
        title: `Duplicate SKU Product ${timestamp}`
      };

      const response2 = await request(SERVER_URL)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: duplicateProduct })
        .timeout(10000);
      
      expect(response2.status).toBe(400);

      // Clean up
      await request(SERVER_URL)
        .delete(`/api/products/${firstProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
    });
  });

  describe('Product Status Management', () => {
    let draftProductId: string;

    beforeEach(async () => {
      // Create a draft product for each test
      const response = await request(SERVER_URL)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { ...testProduct, status: 'draft' } })
        .timeout(10000);
      
      expect([200, 201]).toContain(response.status);
      draftProductId = response.body.data.documentId;
    });

    afterEach(async () => {
      // Clean up the test product
      if (draftProductId) {
        try {
          await request(SERVER_URL)
            .delete(`/api/products/${draftProductId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .timeout(10000);
        } catch (error) {
          console.warn(`Failed to delete product ${draftProductId}:`, error);
        }
        draftProductId = '';
      }
    });

  });

  describe('Product Filtering and Search', () => {
    let testProducts: string[] = [];

    beforeAll(async () => {
      // Create multiple test products
      const products = [
        { ...testProduct, title: `Electronics Product ${timestamp}`, sku: `ELEC-${timestamp}` },
        { ...testProduct, title: `Clothing Product ${timestamp}`, sku: `CLOTH-${timestamp}` },
        { ...testProduct, title: `Book Product ${timestamp}`, sku: `BOOK-${timestamp}` }
      ];

      for (const product of products) {
        const response = await request(SERVER_URL)
          .post('/api/products')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: product })
          .timeout(10000);
        
        if ([200, 201].includes(response.status)) {
          testProducts.push(response.body.data.documentId);
        }
      }
    });

    afterAll(async () => {
      // Clean up test products
      for (const productId of testProducts) {
        try {
          await request(SERVER_URL)
            .delete(`/api/products/${productId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .timeout(10000);
        } catch (error) {
          console.warn(`Failed to delete product ${productId}:`, error);
        }
      }
    });

    it('should filter products by status', async () => {
      const response = await request(SERVER_URL)
        .get('/api/products?status=draft')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should search products by title', async () => {
      const response = await request(SERVER_URL)
        .get('/api/products?filters[title][$containsi]=Electronics')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should paginate products', async () => {
      const response = await request(SERVER_URL)
        .get('/api/products?pagination[page]=1&pagination[pageSize]=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta.pagination).toBeDefined();
      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.pageSize).toBe(2);
    });
  });
});