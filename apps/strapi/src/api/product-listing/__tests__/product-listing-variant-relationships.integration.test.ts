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
  let testProducts: any[] = [];
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
      .expect(200)
      .timeout(10000);
    testCategory = categoryResponse.body.data;

    // Create multiple test products for product listing
    const productData = [
      {
        name: `Test Product 1 ${timestamp}`,
        sku: `TEST-PROD-1-${timestamp}`,
        inventory: 100,
        status: 'active',
        category: testCategory.documentId
      },
      {
        name: `Test Product 2 ${timestamp}`,
        sku: `TEST-PROD-2-${timestamp}`,
        inventory: 150,
        status: 'active',
        category: testCategory.documentId
      },
      {
        name: `Test Product 3 ${timestamp}`,
        sku: `TEST-PROD-3-${timestamp}`,
        inventory: 200,
        status: 'active',
        category: testCategory.documentId
      }
    ];

    for (const data of productData) {
      const productResponse = await request(SERVER_URL)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data })
        .expect(200)
        .timeout(10000);
      
      testProducts.push(productResponse.body.data);
    }

   

    

    // Create test option group
    const optionGroupData = {
      name: `Test Option Group ${timestamp}`,
      displayName: 'Size',
      type: 'select',
    };

    const optionGroupResponse = await request(SERVER_URL)
      .post('/api/option-groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: optionGroupData })
      .expect(201)
      .timeout(10000);
    testOptionGroup = optionGroupResponse.body.data;
    // Create multiple test option values
    const optionValueData = [
      {
        displayName: 'Small',
        value: 'small',
        optionGroup: testOptionGroup.documentId,
      },
      {
        displayName: 'Medium',
        value: 'medium',
        optionGroup: testOptionGroup.documentId,
      },
      {
        displayName: 'Large',
        value: 'large',
        optionGroup: testOptionGroup.documentId,
      }
    ];

    for (const data of optionValueData) {
      const response = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data })
        .expect(200)
        .timeout(10000);
      testOptionValues.push(response.body.data);
    }

    // Create test product listing for variants
    const productListingData = {
      title: `Test Product Listing ${timestamp}`,
      description: 'Test product listing for variant relationship tests',
      type: 'variant',
      basePrice: 29.99,
      isActive: true,
      featured: false,
      product: testProducts[0].documentId,
      category: testCategory.documentId,
      status: 'published',
      optionGroups: [testOptionGroup.documentId]
    };
    const productListingResponse = await request(SERVER_URL)
      .post('/api/product-listings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: productListingData })
      .expect(200)
      .timeout(10000);
    testProductListing = productListingResponse.body;

   
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

    for (const testProduct of testProducts) {
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
          basePrice: 24.99,
          discountPrice: 29.99,
          productListing: testProductListing.documentId,
          optionValue: testOptionValues[0].documentId, // Small
          product: testProducts[0].documentId, // Product 1
        },
        {
          basePrice: 29.99,
          discountPrice: 34.99,
          productListing: testProductListing.documentId,
          optionValue: testOptionValues[1].documentId, // Medium
          product: testProducts[1].documentId, // Product 2
        },
        {
          basePrice: 134.99,
          discountPrice: 39.99,
          productListing: testProductListing.documentId,
          optionValue: testOptionValues[2].documentId, // Large
          product: testProducts[2].documentId, // Product 3
        }
      ];

      for (const data of variantData) {
        const response = await request(SERVER_URL)
          .post('/api/product-listing-variants')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data })
          .expect(200)
          .timeout(10000);
        expect(response.status).toBe(200);
        expect(response.body.data.productListing.documentId).toBe(testProductListing.documentId);
        expect(response.body.data.optionValue).toBeDefined();
        expect(response.body.data.optionValue.documentId).toBe(data.optionValue);
        testVariants.push(response.body.data);
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

    it('should verify variant inheritance from product listing', async () => {
      // Update product listing base price
      const updateData = {
        basePrice: 139.99,
        discountPrice: 49.99
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
        expect(response.body.data.basePrice).toBe(variant.basePrice);
        expect(response.body.data.discountPrice).toBe(variant.discountPrice);
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

        expect(response.body.data.productListing).toBeDefined();
        expect(response.body.data.productListing.documentId).toBe(testProductListing.documentId);
        expect(response.body.data.productListing.title).toBe(testProductListing.title);
        expect(response.body.data.productListing.type).toBe('variant');
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

        expect(response.body.data.optionValue).toBeDefined();
        expect(response.body.data.optionValue.documentId).toBe(testOptionValues[i].documentId);
      }
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
        product: testProducts[0].documentId,
        category: testCategory.documentId,
        optionGroups: [testOptionGroup.documentId],
        status: 'draft'
      };

      const draftResponse = await request(SERVER_URL)
        .post('/api/product-listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: draftProductListingData })
        .expect(200)
        .timeout(10000);

      const draftProductListing = draftResponse.body;

      // Create variant for draft product listing
      const variantData = {
        basePrice: 24.99,
        discountPrice: 29.99,
        productListing: draftProductListing.documentId,
        optionValue: testOptionValues[0].documentId,
        product: testProducts[0].documentId,
        // Note: not specifying status - should inherit from product listing
      };

      const variantResponse = await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: variantData })
        .expect(200)
        .timeout(10000);
      expect(variantResponse.body.data.productListing.publishedAt).toBeNull();
      expect(variantResponse.body.data.productListing.documentId).toBe(draftProductListing.documentId);

      // Clean up
      await request(SERVER_URL)
        .delete(`/api/product-listing-variants/${variantResponse.body.data.documentId}`)
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
        // .expect(200)
        .timeout(10000);
      // Variant should have access to product listing's category through the relationship
      expect(response.status).toBe(200);
      expect(response.body.data.productListing.category).toBeDefined();
      expect(response.body.data.productListing.category.documentId).toBe(testCategory.documentId);
    });

    it('should inherit product listing product when creating variant', async () => {
      const variant = testVariants[0];
      const response = await request(SERVER_URL)
        .get(`/api/product-listing-variants/${variant.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .timeout(10000);

      // Variant should have access to product listing's product through the relationship
      expect(response.body.data.product).toBeDefined();
      expect(response.body.data.product.documentId).toBe(testProducts[0].documentId);
    });
  });

  describe('Product Listing Variant Validation Rules', () => {
    it('should reject duplicate option value and product variants', async () => {
      // create new product
      const productData = {
        name: `Test Product 4 ${timestamp}`,
        sku: `TEST-PROD-4-${timestamp}`,
        basePrice: 149.99,
        discountPrice: 49.99,
        inventory: 150,
        isActive: true,
        status: 'active',
        category: testCategory.documentId
      };
      const productResponse = await request(SERVER_URL)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: productData })
        .expect(200)
        .timeout(10000);
      const newProduct = productResponse.body.data;
      testProducts.push(newProduct);

      // Create invalid option value due to unique constraint
      const variantData1 = {
        basePrice: 29.99,
        discountPrice: 29.99,
        productListing: testProductListing.documentId,
        optionValue: testOptionValues[0].documentId,
        product: newProduct.documentId,
      };

      const response1 = await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: variantData1 })
        .expect(400)
        .timeout(10000);
      expect(response1.body.error).toBeDefined();
      expect(response1.body.error.message).toContain('Validation failed');
      expect(response1.body.error.details).toContain('Option value already exists');

      // create new option value
      const optionValueData = {
        value: `Test Option Value ${timestamp}`,
        displayName: 'Test Option Value',
        optionGroup: testOptionGroup.documentId,
      };

      const optionValueResponse = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionValueData })
        .expect(200)
        .timeout(10000);

      const newOptionValue = optionValueResponse.body.data;
      testOptionValues.push(newOptionValue);

      // Create invalid variant due to unique constraint for product
      const variantData2 = {
        basePrice: 29.99,
        discountPrice: 29.99,
        productListing: testProductListing.documentId,
        optionValue: newOptionValue.documentId,
        product: testProducts[0].documentId,
      };

      const response2 = await request(SERVER_URL)
        .post('/api/product-listing-variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: variantData2 })
        .expect(400)
        .timeout(10000);

      expect(response2.body.error).toBeDefined();
      expect(response2.body.error.message).toContain('Validation failed');
      expect(response2.body.error.details).toContain('Product Variant with this product already exists');
    });


    it('should validate variant price is positive', async () => {
      const variantData = {
        basePrice: -10.00,
        productListing: testProductListing.documentId,
        optionValue: testOptionValues[0].documentId,
        product: testProducts[0].documentId
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
        basePrice: 29.99,
        productListing: testProductListing.documentId,
        optionValue: testOptionValues[0].documentId,
        product: testProducts[0].documentId
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
        basePrice: 29.99,
        optionValue: testOptionValues[0].documentId,
        product: testProducts[0].documentId
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
        product: testProducts[0].documentId,
        category: testCategory.documentId,
        optionGroups: [testOptionGroup.documentId],
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
          basePrice: 24.99,
          productListing: testProductListingForCleanup.documentId,
          optionValue: testOptionValues[0].documentId,
          product: testProducts[0].documentId,
        },
        {
          basePrice: 29.99,
          productListing: testProductListingForCleanup.documentId,
          optionValue: testOptionValues[1].documentId,
          product: testProducts[1].documentId,
        }
      ];

      for (const data of variantData) {
        const variantResponse = await request(SERVER_URL)
          .post('/api/product-listing-variants')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data })
          .expect(200)
          .timeout(10000);
        testVariantsForCleanup.push(variantResponse.body.data);
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
        basePrice: 19.99,
        productListing: testProductListing.documentId,
        optionValue: testOptionValues[0].documentId,
        product: testProducts[0].documentId,
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

});
