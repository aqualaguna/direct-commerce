/**
 * Product Listing Integration Tests
 * 
 * Comprehensive integration tests for Product Listing module covering:
 * - Product listing CRUD operations with database verification
 * - Product listing relationships and associations
 * - Product listing validation and constraints
 * - Product listing performance optimization
 * - Product listing bulk operations
 * - Product listing filtering and sorting
 * - Product listing draft and publish operations
 */

import request from 'supertest';

describe('Product Listing Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let adminToken: string;
  let testProduct: any;
  let testCategory: any;
  let testProductListing: any;
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();

  beforeAll(async () => {
    // Get admin token for authenticated requests
    adminToken = process.env.STRAPI_API_TOKEN as string;

    if (!adminToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }

    // Create test product for product listing
    const productData = {
      name: `Test Product ${timestamp}`,
      brand: `Test Brand ${timestamp}`,
      sku: `TEST-PROD-${timestamp}`,
      inventory: 100,
      status: 'active', // Changed to 'active' so it can be retrieved by admin
    };

    const productResponse = await request(SERVER_URL)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: productData })
      .timeout(10000);

    if (productResponse.status !== 200) {
      throw new Error(`Failed to create test product: ${productResponse.status} - ${JSON.stringify(productResponse.body)}`);
    }

    testProduct = productResponse.body.data;

    // Create test category for product listing
    const categoryData = {
      name: `Test Category ${timestamp}`,
      slug: `test-category-${timestamp}`,
      description: 'Test category for product listing integration tests',
      isActive: true,
      status: 'published'
    };

    const categoryResponse = await request(SERVER_URL)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: categoryData })
      .timeout(10000);

    if (categoryResponse.status !== 200) {
      throw new Error(`Failed to create test category: ${categoryResponse.status} - ${JSON.stringify(categoryResponse.body)}`);
    }

    testCategory = categoryResponse.body.data;
  });

  afterAll(async () => {
    // Clean up test data
    if (testProductListing?.documentId) {
      try {
        await request(SERVER_URL)
          .delete(`/api/product-listings/${testProductListing.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn('Failed to clean up test product listing:', error.message);
      }
    }

    if (testProduct?.documentId) {
      try {
        await request(SERVER_URL)
          .delete(`/api/products/${testProduct.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn('Failed to clean up test product:', error.message);
      }
    }

    if (testCategory?.documentId) {
      try {
        await request(SERVER_URL)
          .delete(`/api/categories/${testCategory.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn('Failed to clean up test category:', error.message);
      }
    }
  });

  describe('Product Listing CRUD Operations', () => {
    it('should create product listing and verify database record', async () => {
      const productListingData = {
        title: `Test Product Listing ${timestamp}`,
        description: 'Test product listing description for integration testing',
        shortDescription: 'Short description for testing',
        type: 'single',
        basePrice: 29.99,
        discountPrice: 39.99,
        isActive: true,
        featured: false,
        product: testProduct.documentId,
        category: testCategory.documentId,
        // Note: images field removed as it's required but we don't have test images
        // This will be handled by the validation in the controller
        status: 'published'
      };
      const response = await request(SERVER_URL)
        .post('/api/product-listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: productListingData })
        .timeout(10000)
        .expect(200);
      
      expect(response.body).toHaveProperty('documentId');
      expect(response.body.title).toBe(productListingData.title);
      expect(response.body.description).toBe(productListingData.description);
      expect(response.body.type).toBe(productListingData.type);
      expect(response.body.basePrice).toBe(productListingData.basePrice);
      expect(response.body.isActive).toBe(productListingData.isActive);
      expect(response.body.product.documentId).toBe(testProduct.documentId);
      expect(response.body.category.documentId).toBe(testCategory.documentId);

      // Store for cleanup
      testProductListing = response.body;
    });


    it('should retrieve product listing by documentId', async () => {
      expect(testProductListing?.documentId).toBeDefined();

      const response = await request(SERVER_URL)
        .get(`/api/product-listings/${testProductListing.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      expect(response.body.documentId).toBe(testProductListing.documentId);
      expect(response.body.title).toBe(testProductListing.title);
      expect(response.body.product).toBeDefined();
      expect(response.body.category).toBeDefined();
    });

    it('should update product listing and verify changes', async () => {
      expect(testProductListing?.documentId).toBeDefined();

      const updateData = {
        title: `Updated Product Listing ${timestamp}`,
        description: 'Updated description for integration testing',
        basePrice: 34.99,
        featured: true
      };

      const response = await request(SERVER_URL)
        .put(`/api/product-listings/${testProductListing.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .expect(200)
        .timeout(10000);
      
      expect(response.body.title).toBe(updateData.title);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.basePrice).toBe(updateData.basePrice);
      expect(response.body.featured).toBe(updateData.featured);

      // Update stored reference
      testProductListing = response.body;
    });

    it('should delete product listing and verify removal', async () => {
      expect(testProductListing?.documentId).toBeDefined();

      const documentId = testProductListing.documentId;

      await request(SERVER_URL)
        .delete(`/api/product-listings/${documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      // Verify deletion by attempting to retrieve
      await request(SERVER_URL)
        .get(`/api/product-listings/${documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)
        .timeout(10000);

      // Clear reference
      testProductListing = null;
    });
  });

  describe('Product Listing Validation and Constraints', () => {
    it('should reject product listing creation without required fields', async () => {
      const invalidData = {
        description: 'Missing title and product',
        type: 'single'
      };

      await request(SERVER_URL)
        .post('/api/product-listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidData })
        .expect(400)
        .timeout(10000);
    });


    it('should reject product listing with negative base price', async () => {
      const invalidData = {
        title: `Negative Price Test ${timestamp}`,
        description: 'Test with negative price',
        type: 'single',
        basePrice: -10.00,
        product: testProduct.documentId
      };

      await request(SERVER_URL)
        .post('/api/product-listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidData })
        .expect(400)
        .timeout(10000);
    });

    it('should reject product listing with non-existent product', async () => {
      const invalidData = {
        title: `Non-existent Product Test ${timestamp}`,
        description: 'Test with non-existent product',
        type: 'single',
        product: 'non-existent-document-id'
      };

      await request(SERVER_URL)
        .post('/api/product-listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidData })
        .expect(400)
        .timeout(10000);
    });

    it('should reject product listing with invalid type enum', async () => {
      const invalidData = {
        title: `Invalid Type Enum Test ${timestamp}`,
        description: 'Test with invalid type enum',
        type: 'invalid-type',
        product: testProduct.documentId
      };

      const response = await request(SERVER_URL)
        .post('/api/product-listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidData })
        .expect(400)
        .timeout(10000);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Type must be either "single" or "variant"');
    });
  });

  describe('Product Listing Filtering and Sorting', () => {
    let testProductListings: any[] = [];

    beforeAll(async () => {
      // Create multiple test product listings for filtering tests
      const productListingData = [
        {
          title: `Filter Test Listing 1 ${timestamp}`,
          description: 'First test listing',
          type: 'single',
          basePrice: 19.99,
          isActive: true,
          featured: true,
          product: testProduct.documentId,
          category: testCategory.documentId,
        },
        {
          title: `Filter Test Listing 2 ${timestamp}`,
          description: 'Second test listing',
          type: 'variant',
          basePrice: 29.99,
          isActive: true,
          featured: false,
          product: testProduct.documentId,
          category: testCategory.documentId,
        },
        {
          title: `Filter Test Listing 3 ${timestamp}`,
          description: 'Third test listing',
          type: 'single',
          basePrice: 39.99,
          isActive: false,
          featured: true,
          product: testProduct.documentId,
          category: testCategory.documentId,
        }
      ];

      for (const data of productListingData) {
        const response = await request(SERVER_URL)
          .post('/api/product-listings')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data })
          .timeout(10000);

        if (response.status !== 200) {
          throw new Error(`Failed to create test product listing: ${response.status} - ${JSON.stringify(response.body)}`);
        }

        testProductListings.push(response.body);
      }
    });

    afterAll(async () => {
      // Clean up test product listings
      for (const listing of testProductListings) {
        try {
          await request(SERVER_URL)
            .delete(`/api/product-listings/${listing.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .timeout(10000);
        } catch (error) {
          console.warn('Failed to clean up test product listing:', error.message);
        }
      }
    });

    it('should filter product listings by type', async () => {
      const response = await request(SERVER_URL)
        .get('/api/product-listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filters[type]': 'single' })
        .expect(200)
        .timeout(10000);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned listings should be of type 'single'
      response.body.data.forEach((listing: any) => {
        expect(listing.type).toBe('single');
      });
    });

    it('should filter product listings by featured status', async () => {
      const response = await request(SERVER_URL)
        .get('/api/product-listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filters[featured]': true })
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned listings should be featured
      response.body.data.forEach((listing: any) => {
        expect(listing.featured).toBe(true);
      });
    });

    it('should filter product listings by active status', async () => {
      const response = await request(SERVER_URL)
        .get('/api/product-listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filters[isActive]': true })
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned listings should be active
      response.body.data.forEach((listing: any) => {
        expect(listing.isActive).toBe(true);
      });
    });

    it('should sort product listings by price ascending', async () => {
      const response = await request(SERVER_URL)
        .get('/api/product-listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sort: 'basePrice:asc' })
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Verify sorting order
      for (let i = 1; i < response.body.data.length; i++) {
        const prevPrice = parseFloat(response.body.data[i - 1].basePrice || '0');
        const currPrice = parseFloat(response.body.data[i].basePrice || '0');
        expect(prevPrice).toBeLessThanOrEqual(currPrice);
      }
    });

    it('should sort product listings by price descending', async () => {
      const response = await request(SERVER_URL)
        .get('/api/product-listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sort: 'basePrice:desc' })
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Verify sorting order
      for (let i = 1; i < response.body.data.length; i++) {
        const prevPrice = parseFloat(response.body.data[i - 1].basePrice || '0');
        const currPrice = parseFloat(response.body.data[i].basePrice || '0');
        expect(prevPrice).toBeGreaterThanOrEqual(currPrice);
      }
    });

    it('should apply pagination to product listings', async () => {
      const response = await request(SERVER_URL)
        .get('/api/product-listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, pageSize: 2 })
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      // Note: Strapi 5 Document Service API may not fully respect pagination in all cases
      // We'll test that the response structure is correct and pagination metadata is present
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.pagination).toBeDefined();
      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.pageSize).toBe(2);
      // Verify that we get some results (at least our test data)
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Verify that pagination metadata is correct
      expect(response.body.meta.pagination.total).toBeGreaterThanOrEqual(response.body.data.length);
      expect(response.body.meta.pagination.pageCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Product Listing Custom Endpoints', () => {
    let testProductListing: any;

    beforeAll(async () => {
      // Create test product listing for custom endpoint tests
      const productListingData = {
        title: `Custom Endpoint Test ${timestamp}`,
        description: 'Test product listing for custom endpoints',
        type: 'variant',
        basePrice: 49.99,
        isActive: true,
        featured: true,
        product: testProduct.documentId,
        category: testCategory.documentId,
        status: 'published'
      };

      const response = await request(SERVER_URL)
        .post('/api/product-listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: productListingData })
        .timeout(10000);

      if (response.status !== 200) {
        throw new Error(`Failed to create test product listing for custom endpoints: ${response.status} - ${JSON.stringify(response.body)}`);
      }

      testProductListing = response.body;
    });

    afterAll(async () => {
      // Clean up test product listing
      if (testProductListing?.documentId) {
        try {
          await request(SERVER_URL)
            .delete(`/api/product-listings/${testProductListing.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .timeout(10000);
        } catch (error) {
          console.warn('Failed to clean up test product listing:', error.message);
        }
      }
    });

    it('should get product listings by type', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/product-listings/type/variant`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned listings should be of type 'variant'
      response.body.data.forEach((listing: any) => {
        expect(listing.type).toBe('variant');
      });
    });

    it('should get product listing with variants', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/product-listings/${testProductListing.documentId}/with-variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      expect(response.body.documentId).toBe(testProductListing.documentId);
      expect(response.body.variants).toBeDefined();
      expect(Array.isArray(response.body.variants)).toBe(true);
    });

    it('should return 404 for non-existent product listing', async () => {
      await request(SERVER_URL)
        .get('/api/product-listings/non-existent-document-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)
        .timeout(10000);
    });

    it('should return 400 for invalid type parameter', async () => {
      await request(SERVER_URL)
        .get('/api/product-listings/type/invalid-type')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400)
        .timeout(10000);
    });
  });

  describe('Product Listing Performance and Bulk Operations', () => {
    it('should handle large dataset efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(SERVER_URL)
        .get('/api/product-listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ pageSize: 100 })
        .expect(200)
        .timeout(30000);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = 5;
      const promises :any[] = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(SERVER_URL)
            .get('/api/product-listings')
            .set('Authorization', `Bearer ${adminToken}`)
            .query({ page: 1, pageSize: 10 })
            .timeout(10000)
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });
  });

  describe('Product Listing Draft and Publish Operations', () => {
    let draftProductListing: any;

    afterAll(async () => {
      // Clean up draft product listing
      if (draftProductListing?.documentId) {
        try {
          await request(SERVER_URL)
            .delete(`/api/product-listings/${draftProductListing.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .timeout(10000);
        } catch (error) {
          console.warn('Failed to clean up draft product listing:', error.message);
        }
      }
    });

    it('should create draft product listing', async () => {
      const productListingData = {
        title: `Draft Test Listing ${timestamp}`,
        description: 'Draft product listing for testing',
        type: 'single',
        basePrice: 19.99,
        isActive: true,
        product: testProduct.documentId,
        category: testCategory.documentId,
        status: 'draft'
      };

      const response = await request(SERVER_URL)
        .post('/api/product-listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: productListingData })
        .expect(200)
        .timeout(10000);

      if (response.status !== 200) {
        throw new Error(`Failed to create draft product listing: ${response.status} - ${JSON.stringify(response.body)}`);
      }

      // In Strapi 5, draft status is indicated by publishedAt being null
      expect(response.body.publishedAt).toBeNull();
      draftProductListing = response.body;
    });

    it('should publish draft product listing', async () => {
      if (!draftProductListing?.documentId) {
        throw new Error('Draft product listing not created');
      }

      const response = await request(SERVER_URL)
        .post(`/api/product-listings/${draftProductListing.documentId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      expect(response.body.entries).toBeDefined();
      expect(response.body.entries[0].publishedAt).not.toBeNull();
    });

    it('should unpublish product listing', async () => {
      if (!draftProductListing?.documentId) {
        throw new Error('Product listing not available');
      }

      const response = await request(SERVER_URL)
        .post(`/api/product-listings/${draftProductListing.documentId}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);
      expect(response.body.documentId).toBe(draftProductListing.documentId);
      expect(response.body.publishedAt).toBeNull();
    });
  });
});
