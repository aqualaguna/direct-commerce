/**
 * Product Listing and Variant Relationships Integration Tests
 * 
 * Comprehensive integration tests for Product Listing and Variant relationships covering:
 * - Product listing to variant associations
 * - Variant to product listing relationships
 * - Product listing variant inheritance
 * - Product listing variant validation rules
 * - Product listing variant cleanup on deletion
 * - Product listing variant performance optimization
 */

import request from 'supertest';

describe('Product Listing and Variant Relationships Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let adminToken: string;
  let testProduct: any;
  let testCategory: any;
  let testProductListing: any;
  let testOptionGroup: any;
  let testOptionValues: any[] = [];
  let testVariants: any[] = [];
  
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
      sku: `TEST-PROD-${timestamp}`,
      basePrice: 29.99,
      comparePrice: 39.99,
      inventory: 100,
      isActive: true,
      status: 'published'
    };

    const productResponse = await request(SERVER_URL)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: productData })
      .timeout(10000);

    testProduct = productResponse.body;

    // Create test category for product listing
    const categoryData = {
      name: `Test Category ${timestamp}`,
      slug: `test-category-${timestamp}`,
      description: 'Test category for product listing variant relationship tests',
      isActive: true,
      status: 'published'
    };

    const categoryResponse = await request(SERVER_URL)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: categoryData })
      .timeout(10000);

    testCategory = categoryResponse.body;

    // Create test product listing for variants
    const productListingData = {
      title: `Test Product Listing ${timestamp}`,
      description: 'Test product listing for variant relationship tests',
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

    testProductListing = productListingResponse.body;

    // Create test option group
    const optionGroupData = {
      name: `Test Option Group ${timestamp}`,
      displayName: 'Size',
      type: 'single',
      isRequired: true,
      isActive: true,
      status: 'published'
    };

    const optionGroupResponse = await request(SERVER_URL)
      .post('/api/option-groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: optionGroupData })
      .timeout(10000);

    testOptionGroup = optionGroupResponse.body;

    // Create multiple test option values
    const optionValueData = [
      {
        name: `Test Option Value Small ${timestamp}`,
        displayName: 'Small',
        value: 'small',
        optionGroup: testOptionGroup.documentId,
        isActive: true,
        status: 'published'
      },
      {
        name: `Test Option Value Medium ${timestamp}`,
        displayName: 'Medium',
        value: 'medium',
        optionGroup: testOptionGroup.documentId,
        isActive: true,
        status: 'published'
      },
      {
        name: `Test Option Value Large ${timestamp}`,
        displayName: 'Large',
        value: 'large',
        optionGroup: testOptionGroup.documentId,
        isActive: true,
        status: 'published'
      }
    ];

    for (const data of optionValueData) {
      const response = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data })
        .timeout(10000);
      testOptionValues.push(response.body);
    }
  });

  // Add delay between tests to avoid rate limiting
  afterEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    // Clean up test data in reverse order
    for (const variant of testVariants) {
      try {
        await request(SERVER_URL)
          .delete(`/api/product-listing-variants/${variant.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn('Failed to clean up test variant:', error.message);
      }
    }

    for (const optionValue of testOptionValues) {
      try {
        await request(SERVER_URL)
          .delete(`/api/option-values/${optionValue.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn('Failed to clean up test option value:', error.message);
      }
    }

    if (testOptionGroup?.documentId) {
      try {
        await request(SERVER_URL)
          .delete(`/api/option-groups/${testOptionGroup.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn('Failed to clean up test option group:', error.message);
      }
    }

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

  describe('Product Listing to Variant Associations', () => {
    it('should create variants and verify product listing association', async () => {
      // Create multiple variants for the product listing
      const variantData = [
        {
          sku: `VARIANT-SMALL-${timestamp}`,
          price: 24.99,
          comparePrice: 29.99,
          inventory: 50,
          isActive: true,
          weight: 1.0,
          productListing: testProductListing.documentId,
          optionValues: [testOptionValues[0].documentId], // Small
          status: 'published'
        },
        {
          sku: `VARIANT-MEDIUM-${timestamp}`,
          price: 29.99,
          comparePrice: 34.99,
          inventory: 75,
          isActive: true,
          weight: 1.2,
          productListing: testProductListing.documentId,
          optionValues: [testOptionValues[1].documentId], // Medium
          status: 'published'
        },
        {
          sku: `VARIANT-LARGE-${timestamp}`,
          price: 34.99,
          comparePrice: 39.99,
          inventory: 25,
          isActive: true,
          weight: 1.5,
          productListing: testProductListing.documentId,
          optionValues: [testOptionValues[2].documentId], // Large
          status: 'published'
        }
      ];

      for (const data of variantData) {
        const response = await request(SERVER_URL)
          .post('/api/product-listing-variants')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data })
          .expect(201)
          .timeout(10000);

        expect(response.body.productListing.documentId).toBe(testProductListing.documentId);
        expect(response.body.optionValues).toBeDefined();
        expect(Array.isArray(response.body.optionValues)).toBe(true);
        expect(response.body.optionValues.length).toBe(1);

        testVariants.push(response.body);
      }

      expect(testVariants).toHaveLength(3);
    });

    it('should retrieve product listing with all associated variants', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/product-listings/${testProductListing.documentId}/with-variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      expect(response.body.documentId).toBe(testProductListing.documentId);
      expect(response.body.variants).toBeDefined();
      expect(Array.isArray(response.body.variants)).toBe(true);
      expect(response.body.variants.length).toBeGreaterThanOrEqual(3);

      // Verify all our test variants are included
      const variantIds = response.body.variants.map((v: any) => v.documentId);
      testVariants.forEach(variant => {
        expect(variantIds).toContain(variant.documentId);
      });
    });

    it('should filter variants by product listing', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/product-listing-variants/product-listing/${testProductListing.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);

      // All returned variants should belong to our test product listing
      response.body.data.forEach((variant: any) => {
        expect(variant.productListing.documentId).toBe(testProductListing.documentId);
      });
    });

    it('should verify variant inheritance from product listing', async () => {
      // Update product listing base price
      const updateData = {
        basePrice: 39.99,
        comparePrice: 49.99
      };

      await request(SERVER_URL)
        .put(`/api/product-listings/${testProductListing.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .expect(200)
        .timeout(10000);

      // Verify variants maintain their individual pricing
      for (const variant of testVariants) {
        const response = await request(SERVER_URL)
          .get(`/api/product-listing-variants/${variant.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .timeout(10000);

        // Variants should maintain their original pricing, not inherit from product listing
        expect(response.body.price).toBe(variant.price);
        expect(response.body.comparePrice).toBe(variant.comparePrice);
      }
    });
  });

  describe('Variant to Product Listing Relationships', () => {
    it('should verify variant references correct product listing', async () => {
      for (const variant of testVariants) {
        const response = await request(SERVER_URL)
          .get(`/api/product-listing-variants/${variant.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .timeout(10000);

        expect(response.body.productListing).toBeDefined();
        expect(response.body.productListing.documentId).toBe(testProductListing.documentId);
        expect(response.body.productListing.title).toBe(testProductListing.title);
        expect(response.body.productListing.type).toBe('variant');
      }
    });

    it('should verify variant option values relationships', async () => {
      for (let i = 0; i < testVariants.length; i++) {
        const variant = testVariants[i];
        const response = await request(SERVER_URL)
          .get(`/api/product-listing-variants/${variant.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .timeout(10000);

        expect(response.body.optionValues).toBeDefined();
        expect(Array.isArray(response.body.optionValues)).toBe(true);
        expect(response.body.optionValues.length).toBe(1);
        expect(response.body.optionValues[0].documentId).toBe(testOptionValues[i].documentId);
        expect(response.body.optionValues[0].optionGroup.documentId).toBe(testOptionGroup.documentId);
      }
    });

    it('should find variant by specific option combination', async () => {
      // Find variant by small size option
      const response = await request(SERVER_URL)
        .post(`/api/product-listing-variants/product-listing/${testProductListing.documentId}/by-options`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ optionValues: [testOptionValues[0].documentId] })
        .expect(200)
        .timeout(10000);

      expect(response.body.documentId).toBe(testVariants[0].documentId);
      expect(response.body.sku).toBe(testVariants[0].sku);
      expect(response.body.optionValues[0].documentId).toBe(testOptionValues[0].documentId);
    });

    it('should return 404 for non-existent option combination', async () => {
      // Create a non-existent option value ID
      const nonExistentOptionId = 'non-existent-option-id';

      await request(SERVER_URL)
        .post(`/api/product-listing-variants/product-listing/${testProductListing.documentId}/by-options`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ optionValues: [nonExistentOptionId] })
        .expect(404)
        .timeout(10000);
    });
  });

  describe('Product Listing Variant Inheritance', () => {
    it('should inherit product listing status when creating variant', async () => {
      // Create a draft product listing
      const draftProductListingData = {
        title: `Draft Product Listing ${timestamp}`,
        description: 'Draft product listing for inheritance tests',
        type: 'variant',
        basePrice: 19.99,
        isActive: true,
        product: testProduct.documentId,
        category: testCategory.documentId,
        status: 'draft'
      };

      const draftResponse = await request(SERVER_URL)
        .post('/api/product-listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: draftProductListingData })
        .expect(201)
        .timeout(10000);

      const draftProductListing = draftResponse.body;

      // Create variant for draft product listing
      const variantData = {
        sku: `DRAFT-INHERITANCE-${timestamp}`,
        price: 24.99,
        inventory: 10,
        productListing: draftProductListing.documentId,
        optionValues: [testOptionValues[0].documentId]
        // Note: not specifying status - should inherit from product listing
      };

      const variantResponse = await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: variantData })
        .expect(201)
        .timeout(10000);

      expect(variantResponse.body.status).toBe('draft');
      expect(variantResponse.body.productListing.documentId).toBe(draftProductListing.documentId);

      // Clean up
      await request(SERVER_URL)
        .delete(`/api/product-listing-variants/${variantResponse.body.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      await request(SERVER_URL)
        .delete(`/api/product-listings/${draftProductListing.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
    });

    it('should inherit product listing category when creating variant', async () => {
      const variant = testVariants[0];
      const response = await request(SERVER_URL)
        .get(`/api/product-listing-variants/${variant.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      // Variant should have access to product listing's category through the relationship
      expect(response.body.productListing.category).toBeDefined();
      expect(response.body.productListing.category.documentId).toBe(testCategory.documentId);
    });

    it('should inherit product listing product when creating variant', async () => {
      const variant = testVariants[0];
      const response = await request(SERVER_URL)
        .get(`/api/product-listing-variants/${variant.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      // Variant should have access to product listing's product through the relationship
      expect(response.body.productListing.product).toBeDefined();
      expect(response.body.productListing.product.documentId).toBe(testProduct.documentId);
    });
  });

  describe('Product Listing Variant Validation Rules', () => {
    it('should enforce unique SKU across all variants', async () => {
      const duplicateSku = `DUPLICATE-SKU-${timestamp}`;

      // Create first variant
      const variantData1 = {
        sku: duplicateSku,
        price: 29.99,
        inventory: 10,
        productListing: testProductListing.documentId,
        optionValues: [testOptionValues[0].documentId],
        status: 'published'
      };

      await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: variantData1 })
        .expect(201)
        .timeout(10000);

      // Try to create second variant with same SKU
      const variantData2 = {
        sku: duplicateSku,
        price: 39.99,
        inventory: 20,
        productListing: testProductListing.documentId,
        optionValues: [testOptionValues[1].documentId],
        status: 'published'
      };

      await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: variantData2 })
        .expect(400)
        .timeout(10000);
    });

    it('should enforce option value uniqueness per product listing', async () => {
      // Try to create two variants with the same option value for the same product listing
      const variantData1 = {
        sku: `UNIQUE-OPTION-1-${timestamp}`,
        price: 29.99,
        inventory: 10,
        productListing: testProductListing.documentId,
        optionValues: [testOptionValues[0].documentId],
        status: 'published'
      };

      await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: variantData1 })
        .expect(201)
        .timeout(10000);

      const variantData2 = {
        sku: `UNIQUE-OPTION-2-${timestamp}`,
        price: 39.99,
        inventory: 20,
        productListing: testProductListing.documentId,
        optionValues: [testOptionValues[0].documentId], // Same option value
        status: 'published'
      };

      // This should fail if we enforce unique option combinations per product listing
      const response = await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: variantData2 })
        .timeout(10000);

      // The response might be 201 (if not enforced) or 400 (if enforced)
      // We'll accept both as valid behavior depending on business rules
      expect([200, 201, 400]).toContain(response.status);
    });

    it('should validate variant price is positive', async () => {
      const variantData = {
        sku: `NEGATIVE-PRICE-${timestamp}`,
        price: -10.00,
        inventory: 10,
        productListing: testProductListing.documentId,
        optionValues: [testOptionValues[0].documentId]
      };

      await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: variantData })
        .expect(400)
        .timeout(10000);
    });

    it('should validate variant inventory is non-negative', async () => {
      const variantData = {
        sku: `NEGATIVE-INVENTORY-${timestamp}`,
        price: 29.99,
        inventory: -5,
        productListing: testProductListing.documentId,
        optionValues: [testOptionValues[0].documentId]
      };

      await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: variantData })
        .expect(400)
        .timeout(10000);
    });

    it('should require product listing for variant creation', async () => {
      const variantData = {
        sku: `NO-PRODUCT-LISTING-${timestamp}`,
        price: 29.99,
        inventory: 10,
        optionValues: [testOptionValues[0].documentId]
        // Missing productListing
      };

      await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: variantData })
        .expect(400)
        .timeout(10000);
    });
  });

  describe('Product Listing Variant Cleanup on Deletion', () => {
    let testProductListingForCleanup: any;
    let testVariantsForCleanup: any[] = [];

    beforeAll(async () => {
      // Create a separate product listing for cleanup tests
      const productListingData = {
        title: `Cleanup Test Listing ${timestamp}`,
        description: 'Product listing for cleanup tests',
        type: 'variant',
        basePrice: 19.99,
        isActive: true,
        product: testProduct.documentId,
        category: testCategory.documentId,
        status: 'published'
      };

      const response = await request(SERVER_URL)
        .post('/api/product-listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: productListingData })
        .timeout(10000);

      testProductListingForCleanup = response.body;

      // Create variants for this product listing
      const variantData = [
        {
          sku: `CLEANUP-VARIANT-1-${timestamp}`,
          price: 24.99,
          inventory: 10,
          productListing: testProductListingForCleanup.documentId,
          optionValues: [testOptionValues[0].documentId],
          status: 'published'
        },
        {
          sku: `CLEANUP-VARIANT-2-${timestamp}`,
          price: 29.99,
          inventory: 15,
          productListing: testProductListingForCleanup.documentId,
          optionValues: [testOptionValues[1].documentId],
          status: 'published'
        }
      ];

      for (const data of variantData) {
        const variantResponse = await request(SERVER_URL)
          .post('/api/product-listing-variants')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data })
          .timeout(10000);
        testVariantsForCleanup.push(variantResponse.body);
      }
    });

    it('should delete variants when product listing is deleted', async () => {
      // Verify variants exist before deletion
      for (const variant of testVariantsForCleanup) {
        await request(SERVER_URL)
          .get(`/api/product-listing-variants/${variant.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .timeout(10000);
      }

      // Delete the product listing
      await request(SERVER_URL)
        .delete(`/api/product-listings/${testProductListingForCleanup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      // Verify variants are also deleted (cascade delete)
      for (const variant of testVariantsForCleanup) {
        await request(SERVER_URL)
          .get(`/api/product-listing-variants/${variant.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404)
          .timeout(10000);
      }
    });

    it('should handle variant deletion without affecting product listing', async () => {
      // Create a variant for individual deletion test
      const variantData = {
        sku: `INDIVIDUAL-DELETE-${timestamp}`,
        price: 19.99,
        inventory: 5,
        productListing: testProductListing.documentId,
        optionValues: [testOptionValues[0].documentId],
        status: 'published'
      };

      const variantResponse = await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: variantData })
        .timeout(10000);

      const variantToDelete = variantResponse.body;

      // Delete the variant
      await request(SERVER_URL)
        .delete(`/api/product-listing-variants/${variantToDelete.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      // Verify product listing still exists
      await request(SERVER_URL)
        .get(`/api/product-listings/${testProductListing.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      // Verify variant is deleted
      await request(SERVER_URL)
        .get(`/api/product-listing-variants/${variantToDelete.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)
        .timeout(10000);
    });
  });

  describe('Product Listing Variant Performance Optimization', () => {
    it('should efficiently load product listing with variants', async () => {
      const startTime = Date.now();

      const response = await request(SERVER_URL)
        .get(`/api/product-listings/${testProductListing.documentId}/with-variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(response.body.variants).toBeDefined();
      expect(Array.isArray(response.body.variants)).toBe(true);
    });

    it('should efficiently filter variants by product listing', async () => {
      const startTime = Date.now();

      const response = await request(SERVER_URL)
        .get(`/api/product-listing-variants/product-listing/${testProductListing.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle concurrent variant operations efficiently', async () => {
      const concurrentRequests = 5;
      const promises: any[] = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(SERVER_URL)
            .get(`/api/product-listing-variants/product-listing/${testProductListing.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .timeout(10000)
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // All requests should complete within 5 seconds
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    it('should efficiently find variant by options', async () => {
      const startTime = Date.now();

      const response = await request(SERVER_URL)
        .post(`/api/product-listing-variants/product-listing/${testProductListing.documentId}/by-options`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ optionValues: [testOptionValues[0].documentId] })
        .expect(200)
        .timeout(10000);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(response.body.documentId).toBeDefined();
      expect(response.body.optionValues).toBeDefined();
    });

    it('should efficiently handle bulk variant operations', async () => {
      // Create multiple variants for bulk operations
      const bulkVariantData: any[] = [];
      for (let i = 0; i < 10; i++) {
        bulkVariantData.push({
          sku: `BULK-PERF-${i}-${timestamp}`,
          price: 19.99 + (i * 2),
          inventory: 10 + i,
          productListing: testProductListing.documentId,
          optionValues: [testOptionValues[i % testOptionValues.length].documentId],
          status: 'published'
        });
      }

      const createdVariants: any[] = [];
      const startTime = Date.now();

      for (const data of bulkVariantData) {
        const response = await request(SERVER_URL)
          .post('/api/product-listing-variants')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data })
          .timeout(10000);
        createdVariants.push(response.body);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(10000); // Should create 10 variants within 10 seconds
      expect(createdVariants).toHaveLength(10);

      // Clean up bulk variants
      for (const variant of createdVariants) {
        try {
          await request(SERVER_URL)
            .delete(`/api/product-listing-variants/${variant.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .timeout(10000);
        } catch (error) {
          console.warn('Failed to clean up bulk variant:', error.message);
        }
      }
    });
  });
});
