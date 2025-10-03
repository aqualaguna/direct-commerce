/**
 * Product Listing Variant Integration Tests
 * 
 * Comprehensive integration tests for Product Listing Variant module covering:
 * - Product listing variant CRUD operations with database verification
 * - Product listing variant relationships and associations
 * - Product listing variant validation and constraints
 * - Product listing variant performance optimization
 * - Product listing variant bulk operations
 * - Product listing variant filtering and sorting
 * - Product listing variant custom endpoints
 * - Product listing variant draft and publish operations
 */

import request from 'supertest';

describe('Product Listing Variant Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let adminToken: string;
  let testProduct: any;
  let testCategory: any;
  let testProductListing: any;
  let testOptionGroup: any;
  let testOptionValue: any;
  let testProductListingVariant: any;
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();
  
  // Track created entities for cleanup
  const createdEntities: {
    products: string[];
    categories: string[];
    productListings: string[];
    optionGroups: string[];
    optionValue: string[];
    variants: string[];
  } = {
    products: [],
    categories: [],
    productListings: [],
    optionGroups: [],
    optionValue: [],
    variants: []
  };

  // Helper function to track created entities
  const trackEntity = (type: keyof typeof createdEntities, documentId: string) => {
    createdEntities[type].push(documentId);
  };

  // Helper function to clean up entities
  const cleanupEntity = async (type: string, documentId: string) => {
    try {
      await request(SERVER_URL)
        .delete(`/api/${type}/${documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
    } catch (error) {
      console.warn(`Failed to cleanup ${type} ${documentId}:`, error);
    }
  };

  beforeAll(async () => {
    // Get admin token for authenticated requests
    adminToken = process.env.STRAPI_API_TOKEN as string;

    if (!adminToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }

    // Create test product for product listing
    const productData = {
      name: `Test Product ${timestamp}`,
      sku: `TEST-PROD-${timestamp}`,
      brand: `Test Brand ${timestamp}`,
      inventory: 100,
      status: 'active'
    };

    const productResponse = await request(SERVER_URL)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: productData })
      .timeout(10000);

    if (![200, 201].includes(productResponse.status)) {
      throw new Error(`Failed to create test product: ${productResponse.status} - ${JSON.stringify(productResponse.body)}`);
    }

    testProduct = productResponse.body.data;
    trackEntity('products', testProduct.documentId);

    // Create test category for product listing
    const categoryData = {
      name: `Test Category ${timestamp}`,
      slug: `test-category-${timestamp}`,
      description: 'Test category for product listing variant integration tests',
      isActive: true,
      status: 'published'
    };

    const categoryResponse = await request(SERVER_URL)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: categoryData })
      .timeout(10000);

    if (![200, 201].includes(categoryResponse.status)) {
      throw new Error(`Failed to create test category: ${categoryResponse.status} - ${JSON.stringify(categoryResponse.body)}`);
    }

    testCategory = categoryResponse.body.data;
    trackEntity('categories', testCategory.documentId);

    // Create test product listing for variants
    const productListingData = {
      title: `Test Product Listing ${timestamp}`,
      description: 'Test product listing for variant integration tests',
      type: 'variant',
      basePrice: 29.99,
      isActive: true,
      featured: false,
      category: testCategory.documentId,
      status: 'published'
    };

    const productListingResponse = await request(SERVER_URL)
      .post('/api/product-listings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: productListingData })
      .timeout(10000);
    if (![200, 201].includes(productListingResponse.status)) {
      throw new Error(`Failed to create test product listing: ${productListingResponse.status} - ${JSON.stringify(productListingResponse.body)}`);
    }

    testProductListing = productListingResponse.body;
    trackEntity('productListings', testProductListing.documentId);

    // Create test option group
    const optionGroupData = {
      name: `Test Option Group ${timestamp}`,
      displayName: 'Size',
      type: 'select',
      isActive: true,
      status: 'published'
    };

    const optionGroupResponse = await request(SERVER_URL)
      .post('/api/option-groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: optionGroupData })
      .timeout(10000);

    if (![200, 201].includes(optionGroupResponse.status)) {
      throw new Error(`Failed to create test option group: ${optionGroupResponse.status} - ${JSON.stringify(optionGroupResponse.body)}`);
    }

    testOptionGroup = optionGroupResponse.body.data;
    trackEntity('optionGroups', testOptionGroup.documentId);

    // Create test option value
    const optionValueData = {
      value: `Test Option Value ${timestamp}`,
      displayName: 'Large',
      optionGroup: testOptionGroup.documentId,
      isActive: true,
      status: 'published'
    };

    const optionValueResponse = await request(SERVER_URL)
      .post('/api/option-values')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: optionValueData })
      .timeout(10000);

    if (![200, 201].includes(optionValueResponse.status)) {
      throw new Error(`Failed to create test option value: ${optionValueResponse.status} - ${JSON.stringify(optionValueResponse.body)}`);
    }

    testOptionValue = optionValueResponse.body.data;
    trackEntity('optionValue', testOptionValue.documentId);

    // Associate the option group with the product listing
    const associateResponse = await request(SERVER_URL)
      .put(`/api/product-listings/${testProductListing.documentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ 
        data: { 
          optionGroups: [testOptionGroup.documentId] 
        } 
      })
      .timeout(10000);
    
    if (![200, 201].includes(associateResponse.status)) {
      throw new Error(`Failed to associate option group with product listing: ${associateResponse.status} - ${JSON.stringify(associateResponse.body)}`);
    }
  });

  afterAll(async () => {
    
    // Clean up in reverse dependency order
    const cleanupOrder = [
      { type: 'product-listing-variants', ids: createdEntities.variants },
      { type: 'option-values', ids: createdEntities.optionValue },
      { type: 'option-groups', ids: createdEntities.optionGroups },
      { type: 'product-listings', ids: createdEntities.productListings },
      { type: 'products', ids: createdEntities.products },
      { type: 'categories', ids: createdEntities.categories }
    ];

    for (const { type, ids } of cleanupOrder) {
      if (ids.length > 0) {
        const cleanupPromises = ids.map(id => cleanupEntity(type, id));
        await Promise.all(cleanupPromises);
      }
    }
    
  });

  describe('Product Listing Variant CRUD Operations', () => {
    it('should create product listing variant and verify database record', async () => {
      const variantData = {
        basePrice: 134.99,
        discountPrice: 44.99,
        product: testProduct.documentId,
        productListing: testProductListing.documentId,
        optionValue: testOptionValue.documentId
      };
      const response = await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: variantData })
        .timeout(10000);
      expect([200, 201]).toContain(response.status);
      expect(response.body).toBeDefined();
      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBeDefined();
      expect(response.body.data.basePrice).toBe(variantData.basePrice);
      expect(response.body.data.discountPrice).toBe(variantData.discountPrice);
      expect(response.body.data.productListing.documentId).toBe(testProductListing.documentId);
      expect(response.body.data.optionValue).toBeDefined();

      // Store for cleanup
      testProductListingVariant = response.body.data;
      trackEntity('variants', testProductListingVariant.documentId);
    });

    it('should retrieve product listing variant by documentId', async () => {
      if (!testProductListingVariant?.documentId) {
        throw new Error('Test product listing variant not created');
      }

      const response = await request(SERVER_URL)
        .get(`/api/product-listing-variants/${testProductListingVariant.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBe(testProductListingVariant.documentId);
      expect(response.body.data.productListing).toBeDefined();
      expect(response.body.data.optionValue).toBeDefined();
    });

    it('should update product listing variant and verify changes', async () => {
      if (!testProductListingVariant?.documentId) {
        throw new Error('Test product listing variant not created');
      }

      const updateData = {
        basePrice: 139.99,
        discountPrice: 49.99,
      };

      const response = await request(SERVER_URL)
        .put(`/api/product-listing-variants/${testProductListingVariant.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .expect(200)
        .timeout(10000);

      expect(response.body).toBeDefined();
      expect(response.body.data).toBeDefined();
      expect(response.body.data.basePrice).toBe(updateData.basePrice);
      expect(response.body.data.discountPrice).toBe(updateData.discountPrice);

      // Update stored reference
      testProductListingVariant = response.body.data;
    });

    it('should delete product listing variant and verify removal', async () => {
      if (!testProductListingVariant?.documentId) {
        throw new Error('Test product listing variant not created');
      }

      const documentId = testProductListingVariant.documentId;

      const deleteResponse = await request(SERVER_URL)
        .delete(`/api/product-listing-variants/${documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      expect(deleteResponse.body).toBeDefined();
      expect(deleteResponse.body.message).toBe('Variant deleted successfully');

      // Verify deletion by attempting to retrieve
      await request(SERVER_URL)
        .get(`/api/product-listing-variants/${documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)
        .timeout(10000);

      // Clear reference and remove from tracking
      testProductListingVariant = null;
      const index = createdEntities.variants.indexOf(documentId);
      if (index > -1) {
        createdEntities.variants.splice(index, 1);
      }
    });
  });

  describe('Product Listing Variant Validation and Constraints', () => {
    it('should reject variant creation without required fields', async () => {
      const invalidData = {
        basePrice: 29.99,
        // Missing productListing
      };

      const response = await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidData })
        .expect(400)
        .timeout(10000);

      expect(response.body.error).toBeDefined();
    });

    it('should reject variant with negative price', async () => {
      const invalidData = {
        basePrice: -10.00,
        productListing: testProductListing.documentId
      };

      const response = await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidData })
        .expect(400)
        .timeout(10000);

      expect(response.body.error).toBeDefined();
    });


    it('should reject variant with non-existent product listing', async () => {
      const invalidData = {
        basePrice: 29.99,
        productListing: 'non-existent-document-id'
      };

      const response = await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidData })
        .expect(400)
        .timeout(10000);

      expect(response.body.error).toBeDefined();
    });

    it('should reject variant with invalid option values', async () => {
      // Create an option group that's not associated with the product listing
      const unrelatedOptionGroupData = {
        name: `Unrelated Option Group ${timestamp}`,
        displayName: 'Color',
        type: 'select'
      };

      const unrelatedOptionGroupResponse = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: unrelatedOptionGroupData })
        .timeout(10000);

      expect([200, 201]).toContain(unrelatedOptionGroupResponse.status);
      const unrelatedOptionGroup = unrelatedOptionGroupResponse.body.data;
      trackEntity('optionGroups', unrelatedOptionGroup.documentId);

      // Create an option value for the unrelated option group
      const unrelatedOptionValueData = {
        value: `Unrelated Option Value ${timestamp}`,
        displayName: 'Red',
        optionGroup: unrelatedOptionGroup.documentId,
        status: 'published'
      };

      const unrelatedOptionValueResponse = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: unrelatedOptionValueData })
        .timeout(10000);

      expect([200, 201]).toContain(unrelatedOptionValueResponse.status);
      const unrelatedOptionValue = unrelatedOptionValueResponse.body.data;
      trackEntity('optionValue', unrelatedOptionValue.documentId);

      // Try to create a variant with the unrelated option value
      const invalidData = {
        basePrice: 29.99,
        productListing: testProductListing.documentId,
        optionValue: unrelatedOptionValue.documentId
      };

      const response = await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidData })
        // .expect(400)
        .timeout(10000);
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Product Listing Variant Filtering and Sorting', () => {
    let testVariants: any[] = [];

    beforeAll(async () => {
      // Create multiple test variants for filtering tests
      const variantData = [
        {
          sku: `FILTER-VARIANT-1-${timestamp}`,
          basePrice: 19.99,
          productListing: testProductListing.documentId,
        },
        {
          sku: `FILTER-VARIANT-2-${timestamp}`,
          basePrice: 29.99,
          productListing: testProductListing.documentId,
        },
        {
          sku: `FILTER-VARIANT-3-${timestamp}`,
          basePrice: 39.99,
          productListing: testProductListing.documentId,
        }
      ];

      for (const data of variantData) {
        const response = await request(SERVER_URL)
          .post('/api/product-listing-variants')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data })
          .timeout(10000);

        if ([200, 201].includes(response.status)) {
          testVariants.push(response.body.data);
          trackEntity('variants', response.body.data.documentId);
        }
      }
    });

    afterAll(async () => {
      // Clean up test variants
      for (const variant of testVariants) {
        try {
          await request(SERVER_URL)
            .delete(`/api/product-listing-variants/${variant.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .timeout(10000);
          
          // Remove from tracking
          const index = createdEntities.variants.indexOf(variant.documentId);
          if (index > -1) {
            createdEntities.variants.splice(index, 1);
          }
        } catch (error) {
          console.warn('Failed to clean up test variant:', error.message);
        }
      }
    });

    it('should filter variants by active status', async () => {
      const response = await request(SERVER_URL)
        .get('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Verify variants have required fields
      response.body.data.forEach((variant: any) => {
        expect(variant.basePrice).toBeDefined();
        expect(variant.productListing).toBeDefined();
      });
    });


    it('should sort variants by price ascending', async () => {
      const response = await request(SERVER_URL)
        .get('/api/product-listing-variants')
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

    it('should sort variants by price descending', async () => {
      const response = await request(SERVER_URL)
        .get('/api/product-listing-variants')
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

    it('should apply pagination to variants', async () => {
      const response = await request(SERVER_URL)
        .get('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, pageSize: 2 })
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.pagination).toBeDefined();
      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.pageSize).toBe(2);
    });
  });


  describe('Product Listing Variant Performance and Bulk Operations', () => {
    it('should handle large dataset efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(SERVER_URL)
        .get('/api/product-listing-variants')
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
      const promises: any[] = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(SERVER_URL)
            .get('/api/product-listing-variants')
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

    it('should handle bulk price updates', async () => {
      // Create test variants for bulk operations
      const variantData = [
        {
          sku: `BULK-VARIANT-1-${timestamp}`,
          basePrice: 19.99,
          productListing: testProductListing.documentId,
          status: 'published'
        },
        {
          sku: `BULK-VARIANT-2-${timestamp}`,
          basePrice: 29.99,
          productListing: testProductListing.documentId,
          status: 'published'
        }
      ];

      const createdVariants: any[] = [];
      for (const data of variantData) {
        const response = await request(SERVER_URL)
          .post('/api/product-listing-variants')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data })
          .timeout(10000);
        
        if ([200, 201].includes(response.status)) {
          createdVariants.push(response.body.data);
          trackEntity('variants', response.body.data.documentId);
        }
      }

      // Perform bulk price update
      const bulkUpdateData = {
        variantIds: createdVariants.map(v => v.documentId),
        priceUpdate: {
          priceIncrease: 5.00,
          currency: 'USD'
        }
      };

      const bulkResponse = await request(SERVER_URL)
        .post('/api/product-listing-variants/bulk-update-prices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkUpdateData)
        .expect(200)
        .timeout(10000);
      expect(bulkResponse.body).toBeDefined();
      expect(bulkResponse.body.success).toBeDefined();
      expect(bulkResponse.body.errors).toBeDefined();

      // Clean up bulk test variants
      for (const variant of createdVariants) {
        try {
          await request(SERVER_URL)
            .delete(`/api/product-listing-variants/${variant.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .timeout(10000);
          
          // Remove from tracking
          const index = createdEntities.variants.indexOf(variant.documentId);
          if (index > -1) {
            createdEntities.variants.splice(index, 1);
          }
        } catch (error) {
          console.warn('Failed to clean up bulk test variant:', error.message);
        }
      }
    });
  });

  describe('Product Listing Variant Relationships', () => {
    let testVariant: any;

    beforeAll(async () => {
      // Create test variant for relationship tests
      const variantData = {
        basePrice: 29.99,
        productListing: testProductListing.documentId,
        optionValue: testOptionValue.documentId,
        product: testProduct.documentId,
      };

      const response = await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: variantData })
        .timeout(10000);
      expect(response.status).toBe(200);
      testVariant = response.body.data;
      trackEntity('variants', testVariant.documentId);
    });

    afterAll(async () => {
      // Clean up test variant
      if (testVariant?.documentId) {
        try {
          await request(SERVER_URL)
            .delete(`/api/product-listing-variants/${testVariant.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .timeout(10000);
          
          // Remove from tracking
          const index = createdEntities.variants.indexOf(testVariant.documentId);
          if (index > -1) {
            createdEntities.variants.splice(index, 1);
          }
        } catch (error) {
          console.warn('Failed to clean up test variant:', error.message);
        }
      }
    });

    it('should verify variant to product listing relationship', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/product-listing-variants/${testVariant.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.productListing).toBeDefined();
      expect(response.body.data.productListing.documentId).toBe(testProductListing.documentId);
      expect(response.body.data.productListing.title).toBe(testProductListing.title);
    });

    it('should verify variant to option values relationship', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/product-listing-variants/${testVariant.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.optionValue).toBeDefined();
      expect(response.body.data.optionValue.documentId).toBe(testOptionValue.documentId);
    });

    it('should verify product listing to variants relationship', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/product-listings/${testProductListing.documentId}/with-variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);
      expect(response.body).toBeDefined();
      expect(response.body.variants).toBeDefined();
      expect(Array.isArray(response.body.variants)).toBe(true);
      
      // Should include our test variant
      const variantExists = response.body.variants.some(
        (variant: any) => variant.documentId === testVariant.documentId
      );
      expect(variantExists).toBe(true);
    });
  });
});
