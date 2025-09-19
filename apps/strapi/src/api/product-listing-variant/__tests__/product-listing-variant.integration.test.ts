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
    optionValues: string[];
    variants: string[];
  } = {
    products: [],
    categories: [],
    productListings: [],
    optionGroups: [],
    optionValues: [],
    variants: []
  };

  // Helper function to track created entities
  const trackEntity = (type: keyof typeof createdEntities, documentId: string) => {
    createdEntities[type].push(documentId);
  };

  // Helper function to clean up entities
  const cleanupEntity = async (type: string, documentId: string) => {
    try {
      const response = await request(SERVER_URL)
        .delete(`/api/${type}/${documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      
      if (response.status !== 404) {
        console.log(`Cleaned up ${type} ${documentId} (status: ${response.status})`);
      }
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
      product: testProduct.documentId,
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
    trackEntity('optionValues', testOptionValue.documentId);

    // Associate the option group with the product listing
    const associateResponse = await request(SERVER_URL)
      .put(`/api/option-groups/${testOptionGroup.documentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ 
        data: { 
          productListings: [testProductListing.documentId] 
        } 
      })
      .timeout(10000);

    if (![200, 201].includes(associateResponse.status)) {
      throw new Error(`Failed to associate option group with product listing: ${associateResponse.status} - ${JSON.stringify(associateResponse.body)}`);
    }
  });

  // Add delay between tests to avoid rate limiting
  afterEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    console.log('Starting comprehensive cleanup...');
    
    // Clean up in reverse dependency order
    const cleanupOrder = [
      { type: 'product-listing-variants', ids: createdEntities.variants },
      { type: 'option-values', ids: createdEntities.optionValues },
      { type: 'option-groups', ids: createdEntities.optionGroups },
      { type: 'product-listings', ids: createdEntities.productListings },
      { type: 'products', ids: createdEntities.products },
      { type: 'categories', ids: createdEntities.categories }
    ];

    for (const { type, ids } of cleanupOrder) {
      if (ids.length > 0) {
        console.log(`Cleaning up ${ids.length} ${type}...`);
        const cleanupPromises = ids.map(id => cleanupEntity(type, id));
        await Promise.all(cleanupPromises);
      }
    }
    
    console.log('Comprehensive cleanup completed');
  });

  describe.only('Product Listing Variant CRUD Operations', () => {
    it.only('should create product listing variant and verify database record', async () => {
      const variantData = {
        sku: `TEST-VARIANT-${timestamp}`,
        basePrice: 134.99,
        discountPrice: 44.99,
        inventory: 50,
        isActive: true,
        weight: 1.5,
        length: 10.0,
        width: 8.0,
        height: 2.0,
        productListing: testProductListing.documentId,
        optionValues: [testOptionValue.documentId],
        status: 'published'
      };
      console.log('variantData', variantData);
      const response = await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: variantData })
        .timeout(10000);
      console.log('response', response.body);
      expect([200, 201]).toContain(response.status);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBeDefined();
      expect(response.body.data.sku).toBe(variantData.sku);
      expect(response.body.data.basePrice).toBe(variantData.basePrice);
      expect(response.body.data.discountPrice).toBe(variantData.discountPrice);
      expect(response.body.data.inventory).toBe(variantData.inventory);
      expect(response.body.data.isActive).toBe(variantData.isActive);
      expect(response.body.data.weight).toBe(variantData.weight);
      expect(response.body.data.productListing.documentId).toBe(testProductListing.documentId);
      expect(response.body.data.optionValues).toBeDefined();
      expect(Array.isArray(response.body.data.optionValues)).toBe(true);

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
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBe(testProductListingVariant.documentId);
      expect(response.body.data.sku).toBe(testProductListingVariant.sku);
      expect(response.body.data.productListing).toBeDefined();
      expect(response.body.data.optionValues).toBeDefined();
    });

    it('should update product listing variant and verify changes', async () => {
      if (!testProductListingVariant?.documentId) {
        throw new Error('Test product listing variant not created');
      }

      const updateData = {
        basePrice: 139.99,
        discountPrice: 49.99,
        inventory: 75,
        weight: 2.0
      };

      const response = await request(SERVER_URL)
        .put(`/api/product-listing-variants/${testProductListingVariant.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.basePrice).toBe(updateData.basePrice);
      expect(response.body.data.discountPrice).toBe(updateData.discountPrice);
      expect(response.body.data.inventory).toBe(updateData.inventory);
      expect(response.body.data.weight).toBe(updateData.weight);

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

      expect(deleteResponse.body.data).toBeDefined();

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
        inventory: 10
        // Missing sku and productListing
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
        sku: `INVALID-PRICE-${timestamp}`,
        basePrice: -10.00,
        inventory: 10,
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

    it('should reject variant with negative inventory', async () => {
      const invalidData = {
        sku: `INVALID-INVENTORY-${timestamp}`,
        basePrice: 29.99,
        inventory: -5,
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

    it('should reject variant with duplicate SKU', async () => {
      // First create a variant
      const variantData = {
        sku: `DUPLICATE-SKU-${timestamp}`,
        basePrice: 29.99,
        inventory: 10,
        productListing: testProductListing.documentId,
        status: 'published'
      };

      const firstResponse = await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: variantData })
        .timeout(10000);

      expect([200, 201]).toContain(firstResponse.status);
      const firstVariant = firstResponse.body.data;
      trackEntity('variants', firstVariant.documentId);

      // Try to create another variant with the same SKU
      const duplicateData = {
        sku: `DUPLICATE-SKU-${timestamp}`,
        basePrice: 39.99,
        inventory: 20,
        productListing: testProductListing.documentId
      };

      const response = await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: duplicateData })
        .expect(400)
        .timeout(10000);

      expect(response.body.error).toBeDefined();
    });

    it('should reject variant with non-existent product listing', async () => {
      const invalidData = {
        sku: `NON-EXISTENT-PL-${timestamp}`,
        basePrice: 29.99,
        inventory: 10,
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
  });

  describe('Product Listing Variant Filtering and Sorting', () => {
    let testVariants: any[] = [];

    beforeAll(async () => {
      // Create multiple test variants for filtering tests
      const variantData = [
        {
          sku: `FILTER-VARIANT-1-${timestamp}`,
          basePrice: 19.99,
          inventory: 100,
          isActive: true,
          productListing: testProductListing.documentId,
          status: 'published'
        },
        {
          sku: `FILTER-VARIANT-2-${timestamp}`,
          basePrice: 29.99,
          inventory: 50,
          isActive: true,
          productListing: testProductListing.documentId,
          status: 'published'
        },
        {
          sku: `FILTER-VARIANT-3-${timestamp}`,
          basePrice: 39.99,
          inventory: 0,
          isActive: false,
          productListing: testProductListing.documentId,
          status: 'published'
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
        .query({ 'filters[isActive]': true })
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned variants should be active
      response.body.data.forEach((variant: any) => {
        expect(variant.isActive).toBe(true);
      });
    });

    it('should filter variants by inventory level', async () => {
      const response = await request(SERVER_URL)
        .get('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 'filters[inventory][$gt]': 0 })
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned variants should have inventory > 0
      response.body.data.forEach((variant: any) => {
        expect(variant.inventory).toBeGreaterThan(0);
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

  describe('Product Listing Variant Custom Endpoints', () => {
    let testVariant: any;

    beforeAll(async () => {
      // Create test variant for custom endpoint tests
      const variantData = {
        sku: `CUSTOM-ENDPOINT-${timestamp}`,
        basePrice: 49.99,
        inventory: 25,
        isActive: true,
        productListing: testProductListing.documentId,
        optionValues: [testOptionValue.documentId],
        status: 'published'
      };

      const response = await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: variantData })
        .timeout(10000);

      if ([200, 201].includes(response.status)) {
        testVariant = response.body.data;
        trackEntity('variants', testVariant.documentId);
      }
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

    it('should get variants by product listing', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/product-listing-variants/product-listing/${testProductListing.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned variants should belong to the specified product listing
      response.body.data.forEach((variant: any) => {
        expect(variant.productListing.documentId).toBe(testProductListing.documentId);
      });
    });

    it('should find variant by options', async () => {
      const response = await request(SERVER_URL)
        .post(`/api/product-listing-variants/product-listing/${testProductListing.documentId}/by-options`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ optionValues: [testOptionValue.documentId] })
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBe(testVariant.documentId);
      expect(response.body.data.optionValues).toBeDefined();
      expect(Array.isArray(response.body.data.optionValues)).toBe(true);
    });

    it('should update variant inventory', async () => {
      const newInventory = 100;

      const response = await request(SERVER_URL)
        .put(`/api/product-listing-variants/${testVariant.documentId}/inventory`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ inventory: newInventory })
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.inventory).toBe(newInventory);
    });

    it('should get variant by SKU', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/product-listing-variants/sku/${testVariant.sku}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBe(testVariant.documentId);
      expect(response.body.data.sku).toBe(testVariant.sku);
    });

    it('should get low stock variants', async () => {
      const response = await request(SERVER_URL)
        .get('/api/product-listing-variants/low-stock')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ threshold: 50 })
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned variants should have inventory <= threshold
      response.body.data.forEach((variant: any) => {
        expect(variant.inventory).toBeLessThanOrEqual(50);
      });
    });

    it('should get out of stock variants', async () => {
      const response = await request(SERVER_URL)
        .get('/api/product-listing-variants/out-of-stock')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned variants should have inventory = 0
      response.body.data.forEach((variant: any) => {
        expect(variant.inventory).toBe(0);
      });
    });

    it('should return 404 for non-existent variant', async () => {
      await request(SERVER_URL)
        .get('/api/product-listing-variants/non-existent-document-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)
        .timeout(10000);
    });

    it('should return 400 for invalid inventory update', async () => {
      await request(SERVER_URL)
        .put(`/api/product-listing-variants/${testVariant.documentId}/inventory`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ inventory: -10 })
        .expect(400)
        .timeout(10000);
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
          inventory: 10,
          productListing: testProductListing.documentId,
          status: 'published'
        },
        {
          sku: `BULK-VARIANT-2-${timestamp}`,
          basePrice: 29.99,
          inventory: 20,
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

      expect(bulkResponse.body.data).toBeDefined();
      expect(bulkResponse.body.data.success).toBeDefined();
      expect(bulkResponse.body.data.errors).toBeDefined();

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

  describe('Product Listing Variant Draft and Publish Operations', () => {
    let draftVariant: any;

    afterAll(async () => {
      // Clean up draft variant
      if (draftVariant?.documentId) {
        try {
          await request(SERVER_URL)
            .delete(`/api/product-listing-variants/${draftVariant.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .timeout(10000);
          
          // Remove from tracking
          const index = createdEntities.variants.indexOf(draftVariant.documentId);
          if (index > -1) {
            createdEntities.variants.splice(index, 1);
          }
        } catch (error) {
          console.warn('Failed to clean up draft variant:', error.message);
        }
      }
    });

    it('should create draft variant', async () => {
      const variantData = {
        sku: `DRAFT-VARIANT-${timestamp}`,
        basePrice: 19.99,
        inventory: 10,
        productListing: testProductListing.documentId,
        status: 'draft'
      };

      const response = await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: variantData })
        .timeout(10000);

      expect([200, 201]).toContain(response.status);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.status).toBe('draft');
      draftVariant = response.body.data;
      trackEntity('variants', draftVariant.documentId);
    });

    it('should publish draft variant', async () => {
      if (!draftVariant?.documentId) {
        throw new Error('Draft variant not created');
      }

      const response = await request(SERVER_URL)
        .post(`/api/product-listing-variants/${draftVariant.documentId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.entries).toBeDefined();
      expect(response.body.data.entries[0].status).toBe('published');
    });

    it('should unpublish variant', async () => {
      if (!draftVariant?.documentId) {
        throw new Error('Variant not available');
      }

      const response = await request(SERVER_URL)
        .post(`/api/product-listing-variants/${draftVariant.documentId}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.entries).toBeDefined();
      expect(response.body.data.entries[0].status).toBe('draft');
    });
  });

  describe('Product Listing Variant Relationships', () => {
    let testVariant: any;

    beforeAll(async () => {
      // Create test variant for relationship tests
      const variantData = {
        sku: `RELATIONSHIP-VARIANT-${timestamp}`,
        basePrice: 29.99,
        inventory: 15,
        isActive: true,
        productListing: testProductListing.documentId,
        optionValues: [testOptionValue.documentId],
        status: 'published'
      };

      const response = await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: variantData })
        .timeout(10000);

      if ([200, 201].includes(response.status)) {
        testVariant = response.body.data;
        trackEntity('variants', testVariant.documentId);
      }
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
      expect(response.body.data.optionValues).toBeDefined();
      expect(Array.isArray(response.body.data.optionValues)).toBe(true);
      expect(response.body.data.optionValues.length).toBeGreaterThan(0);
      expect(response.body.data.optionValues[0].documentId).toBe(testOptionValue.documentId);
    });

    it('should verify product listing to variants relationship', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/product-listings/${testProductListing.documentId}/with-variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.variants).toBeDefined();
      expect(Array.isArray(response.body.data.variants)).toBe(true);
      
      // Should include our test variant
      const variantExists = response.body.data.variants.some(
        (variant: any) => variant.documentId === testVariant.documentId
      );
      expect(variantExists).toBe(true);
    });
  });
});
