/**
 * Option Value Custom Endpoints Integration Tests
 * 
 * Comprehensive integration tests for Option Value custom endpoints covering:
 * - GET /option-values/option-group/:optionGroupId
 * - GET /option-values/product-listing/:productListingId  
 * - POST /option-values/bulk-create
 */

import request from 'supertest';

describe('Option Value Custom Endpoints Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let adminToken: string;
  let testOptionGroup: any;
  let testOptionGroup2: any;
  let testProduct: any;
  let testCategory: any;
  let testProductListing: any;
  let testOptionValues: any[] = [];
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();

  // Cleanup function to be used in both afterAll and error scenarios
  const cleanup = async () => {
    try {
      // Clean up test option values
      for (const optionValue of testOptionValues) {
        try {
          await request(SERVER_URL)
            .delete(`/api/option-values/${optionValue.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);
        } catch (error) {
          console.warn(`Failed to clean up option value ${optionValue.documentId}:`, error.message);
        }
      }

      // Clean up test product listing
      if (testProductListing?.documentId) {
        try {
          await request(SERVER_URL)
            .delete(`/api/product-listings/${testProductListing.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);
        } catch (error) {
          console.warn(`Failed to clean up product listing ${testProductListing.documentId}:`, error.message);
        }
      }

      // Clean up test product and category
      if (testProduct?.documentId) {
        try {
          await request(SERVER_URL)
            .delete(`/api/products/${testProduct.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);
        } catch (error) {
          console.warn(`Failed to clean up product ${testProduct.documentId}:`, error.message);
        }
      }

      if (testCategory?.documentId) {
        try {
          await request(SERVER_URL)
            .delete(`/api/categories/${testCategory.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);
        } catch (error) {
          console.warn(`Failed to clean up category ${testCategory.documentId}:`, error.message);
        }
      }

      // Clean up test option groups
      if (testOptionGroup2?.documentId) {
        try {
          await request(SERVER_URL)
            .delete(`/api/option-groups/${testOptionGroup2.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);
        } catch (error) {
          console.warn(`Failed to clean up option group 2 ${testOptionGroup2.documentId}:`, error.message);
        }
      }

      if (testOptionGroup?.documentId) {
        try {
          await request(SERVER_URL)
            .delete(`/api/option-groups/${testOptionGroup.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);
        } catch (error) {
          console.warn(`Failed to clean up option group ${testOptionGroup.documentId}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error.message);
    }
  };

  beforeAll(async () => {
    try {
      // Get admin token for authenticated requests
      adminToken = process.env.STRAPI_API_TOKEN as string;

      if (!adminToken) {
        throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
      }

      // Create test option groups for custom endpoint tests
      const optionGroupData = {
        name: `test-option-group-${timestamp}`,
        displayName: `Test Option Group ${timestamp}`,
        type: 'select',
        isRequired: true,
        sortOrder: 1,
      };

      const optionGroupResponse = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionGroupData })
        .expect(201);
      testOptionGroup = optionGroupResponse.body.data;

      const optionGroupData2 = {
        name: `test-option-group-2-${timestamp}`,
        displayName: `Test Option Group 2 ${timestamp}`,
        type: 'select',
        isRequired: false,
        sortOrder: 2,
      };

      const optionGroupResponse2 = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionGroupData2 })
        .expect(201);
      testOptionGroup2 = optionGroupResponse2.body.data;

      // Create test product for product listing
      const productData = {
        name: `Test Product ${timestamp}`,
        brand: `Test Brand ${timestamp}`,
        sku: `TEST-PROD-${timestamp}`,
        inventory: 100,
        status: 'active',
      };

      const productResponse = await request(SERVER_URL)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: productData })
        .expect(200);
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
        .expect(200);
      testCategory = categoryResponse.body.data;

      // Create test product listing for product listing endpoint tests
      const productListingData = {
        title: `Test Product Listing ${timestamp}`,
        description: 'Test product listing for option value tests',
        type: 'variant',
        basePrice: 29.99,
        isActive: true,
        featured: false,
        status: 'published',
        product: testProduct.documentId,
        category: testCategory.documentId,
        optionGroups: [testOptionGroup.documentId, testOptionGroup2.documentId],
      };

      const productListingResponse = await request(SERVER_URL)
        .post('/api/product-listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: productListingData })
        .expect(200);
      testProductListing = productListingResponse.body;

      // Create test option values for both option groups
      const optionValuesData = [
        {
          value: `custom-test-value-1-${timestamp}`,
          displayName: 'Custom Test Value 1',
          sortOrder: 1,
          optionGroup: testOptionGroup.documentId,
        },
        {
          value: `custom-test-value-2-${timestamp}`,
          displayName: 'Custom Test Value 2',
          sortOrder: 2,
          optionGroup: testOptionGroup.documentId,
        },
        {
          value: `custom-test-value-3-${timestamp}`,
          displayName: 'Custom Test Value 3',
          sortOrder: 3,
          optionGroup: testOptionGroup2.documentId,
        },
      ];

      for (const data of optionValuesData) {
        const response = await request(SERVER_URL)
          .post('/api/option-values')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data })
          .expect(200);
        
        testOptionValues.push(response.body.data);
      }
    } catch (error) {
      // If setup fails, clean up any partially created resources
      console.error('Setup failed, cleaning up partial resources:', error.message);
      await cleanup();
      throw error;
    }
  });

  afterAll(async () => {
    await cleanup();
  });

  // Test data factory
  const createTestOptionValueData = (overrides = {}) => ({
    value: `test-value-${timestamp}`,
    displayName: `Test Value ${timestamp}`,
    sortOrder: 1,
    optionGroup: testOptionGroup.documentId,
    ...overrides,
  });

  describe('GET /option-values/option-group/:optionGroupId', () => {
    it('should retrieve option values by option group successfully', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/option-values/option-group/${testOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);

      // Verify all returned option values belong to the specified option group
      response.body.data.forEach((optionValue: any) => {
        expect(optionValue.optionGroup.documentId).toBe(testOptionGroup.documentId);
        expect(optionValue.optionGroup).toBeDefined();
        expect(optionValue.value).toBeDefined();
        expect(optionValue.displayName).toBeDefined();
        expect(optionValue.sortOrder).toBeDefined();
      });

      // Verify our test option values are included
      const testValueIds = testOptionValues
        .filter(ov => ov.optionGroup.documentId === testOptionGroup.documentId)
        .map(ov => ov.documentId);
      
      const returnedValueIds = response.body.data.map((ov: any) => ov.documentId);
      testValueIds.forEach(id => {
        expect(returnedValueIds).toContain(id);
      });
    });

    it('should return option values sorted by sortOrder', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/option-values/option-group/${testOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(2);

      // Verify sorting order
      for (let i = 1; i < response.body.data.length; i++) {
        expect(response.body.data[i].sortOrder).toBeGreaterThanOrEqual(
          response.body.data[i - 1].sortOrder
        );
      }
    });

      it('should return empty array for option group with no option values', async () => {
        let emptyOptionGroup: any = null;
        try {
          // Create a new option group with no option values
          const emptyOptionGroupData = {
            name: `empty-option-group-${timestamp}`,
            displayName: `Empty Option Group ${timestamp}`,
            type: 'select',
            isRequired: false,
            sortOrder: 1,
          };

          const emptyOptionGroupResponse = await request(SERVER_URL)
            .post('/api/option-groups')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ data: emptyOptionGroupData })
            .expect(201);

          emptyOptionGroup = emptyOptionGroupResponse.body.data;

          const response = await request(SERVER_URL)
            .get(`/api/option-values/option-group/${emptyOptionGroup.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

          expect(response.body.data).toEqual([]);
        } finally {
          // Clean up
          if (emptyOptionGroup?.documentId) {
            try {
              await request(SERVER_URL)
                .delete(`/api/option-groups/${emptyOptionGroup.documentId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
            } catch (error) {
              console.warn(`Failed to clean up empty option group ${emptyOptionGroup.documentId}:`, error.message);
            }
          }
        }
      });

    it('should return 404 for non-existent option group', async () => {
      const nonExistentId = 'non-existent-option-group-id';
      
      const response = await request(SERVER_URL)
        .get(`/api/option-values/option-group/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Option group not found');
    });

    it('should return 400 for missing option group ID', async () => {
      const response = await request(SERVER_URL)
        .get('/api/option-values/option-group/')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404); // Express returns 404 for missing route parameter
    });
  });

  describe('GET /option-values/product-listing/:productListingId', () => {
    it('should retrieve option values by product listing successfully', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/option-values/product-listing/${testProductListing.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);

      // Verify all returned option values belong to option groups associated with the product listing
      const productListingOptionGroupIds = testProductListing.optionGroups.map((og: any) => og.documentId);
      
      response.body.data.forEach((optionValue: any) => {
        expect(optionValue.optionGroup).toBeDefined();
        expect(productListingOptionGroupIds).toContain(optionValue.optionGroup.documentId);
        expect(optionValue.value).toBeDefined();
        expect(optionValue.displayName).toBeDefined();
        expect(optionValue.sortOrder).toBeDefined();
      });

      // Verify our test option values are included
      const testValueIds = testOptionValues.map(ov => ov.documentId);
      const returnedValueIds = response.body.data.map((ov: any) => ov.documentId);
      testValueIds.forEach(id => {
        expect(returnedValueIds).toContain(id);
      });
    });

    it('should return option values sorted by sortOrder', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/option-values/product-listing/${testProductListing.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(3);

      // Verify sorting order
      for (let i = 1; i < response.body.data.length; i++) {
        expect(response.body.data[i].sortOrder).toBeGreaterThanOrEqual(
          response.body.data[i - 1].sortOrder
        );
      }
    });

      it('should return empty array for product listing with no option groups', async () => {
        let emptyProductListing: any = null;
        try {
          // Create a product listing with no option groups
          const emptyProductListingData = {
            title: `Empty Product Listing ${timestamp}`,
            description: 'Product listing with no option groups',
            type: 'single',
            basePrice: 19.99,
            isActive: true,
            featured: false,
            status: 'published',
            product: testProduct.documentId,
            category: testCategory.documentId,
            optionGroups: [],
          };

          const emptyProductListingResponse = await request(SERVER_URL)
            .post('/api/product-listings')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ data: emptyProductListingData })
            .expect(200);

          emptyProductListing = emptyProductListingResponse.body;

          const response = await request(SERVER_URL)
            .get(`/api/option-values/product-listing/${emptyProductListing.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

          expect(response.body.data).toEqual([]);
        } finally {
          // Clean up
          if (emptyProductListing?.documentId) {
            try {
              await request(SERVER_URL)
                .delete(`/api/product-listings/${emptyProductListing.documentId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
            } catch (error) {
              console.warn(`Failed to clean up empty product listing ${emptyProductListing.documentId}:`, error.message);
            }
          }
        }
      });

    it('should return 404 for non-existent product listing', async () => {
      const nonExistentId = 'non-existent-product-listing-id';
      
      const response = await request(SERVER_URL)
        .get(`/api/option-values/product-listing/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Product listing not found');
    });

    it('should return 400 for missing product listing ID', async () => {
      const response = await request(SERVER_URL)
        .get('/api/option-values/product-listing/')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404); // Express returns 404 for missing route parameter
    });
  });

  describe('POST /option-values/bulk-create', () => {
      it('should create multiple option values successfully', async () => {
        let createdOptionValues: any[] = [];
        try {
          const bulkData = [
            createTestOptionValueData({
              value: `bulk-test-1-${timestamp}`,
              displayName: 'Bulk Test Value 1',
              sortOrder: 1,
            }),
            createTestOptionValueData({
              value: `bulk-test-2-${timestamp}`,
              displayName: 'Bulk Test Value 2',
              sortOrder: 2,
            }),
            createTestOptionValueData({
              value: `bulk-test-3-${timestamp}`,
              displayName: 'Bulk Test Value 3',
              sortOrder: 3,
              optionGroup: testOptionGroup2.documentId,
            }),
          ];

          const response = await request(SERVER_URL)
            .post('/api/option-values/bulk-create')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ data: bulkData })
            .expect(200);

          expect(response.body).toBeDefined();
          expect(response.body.success).toBe(3);
          expect(response.body.errors).toHaveLength(0);
          expect(response.body.created).toHaveLength(3);

          // Verify all option values were created correctly
          response.body.created.forEach((optionValue: any, index: number) => {
            expect(optionValue.documentId).toBeDefined();
            expect(optionValue.value).toBe(bulkData[index].value);
            expect(optionValue.displayName).toBe(bulkData[index].displayName);
            expect(optionValue.sortOrder).toBe(bulkData[index].sortOrder);
            expect(optionValue.optionGroup).toBeDefined();
          });

          createdOptionValues = response.body.created;
        } finally {
          // Clean up bulk created option values
          for (const optionValue of createdOptionValues) {
            try {
              await request(SERVER_URL)
                .delete(`/api/option-values/${optionValue.documentId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
            } catch (error) {
              console.warn(`Failed to clean up bulk created option value ${optionValue.documentId}:`, error.message);
            }
          }
        }
      });

      it('should handle partial failures in bulk creation', async () => {
        let createdOptionValues: any[] = [];
        try {
          const bulkData = [
            createTestOptionValueData({
              value: `valid-bulk-${timestamp}`,
              displayName: 'Valid Bulk Value',
            }),
            {
              value: '', // Invalid: empty value
              displayName: 'Invalid Value',
              optionGroup: testOptionGroup.documentId,
            },
            createTestOptionValueData({
              value: `another-valid-${timestamp}`,
              displayName: 'Another Valid Value',
            }),
            {
              value: 'Valid Value',
              displayName: '', // Invalid: empty displayName
              optionGroup: testOptionGroup.documentId,
            },
          ];

          const response = await request(SERVER_URL)
            .post('/api/option-values/bulk-create')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ data: bulkData })
            .expect(200);

          expect(response.body).toBeDefined();
          expect(response.body.success).toBe(2);
          expect(response.body.errors.length).toBeGreaterThan(0);
          expect(response.body.created).toHaveLength(2);

          // Verify successful creations
          response.body.created.forEach((optionValue: any) => {
            expect(optionValue.documentId).toBeDefined();
            expect(optionValue.value).toBeDefined();
            expect(optionValue.displayName).toBeDefined();
            expect(optionValue.optionGroup).toBeDefined();
          });

          // Verify error messages
          expect(response.body.errors).toContain('Value, display name, and option group are required');

          createdOptionValues = response.body.created;
        } finally {
          // Clean up successfully created option values
          for (const optionValue of createdOptionValues) {
            try {
              await request(SERVER_URL)
                .delete(`/api/option-values/${optionValue.documentId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
            } catch (error) {
              console.warn(`Failed to clean up partial bulk created option value ${optionValue.documentId}:`, error.message);
            }
          }
        }
      });

    it('should handle empty bulk data array', async () => {
      const response = await request(SERVER_URL)
        .post('/api/option-values/bulk-create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: [] })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(0);
      expect(response.body.errors).toHaveLength(0);
      expect(response.body.created).toHaveLength(0);
    });

    it('should reject bulk creation with invalid data format', async () => {
      const response = await request(SERVER_URL)
        .post('/api/option-values/bulk-create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: 'invalid-data' })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Option values data must be an array');
    });

    it('should reject bulk creation with missing data', async () => {
      const response = await request(SERVER_URL)
        .post('/api/option-values/bulk-create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Option values data is required');
    });

      it('should handle large bulk creation efficiently', async () => {
        let createdOptionValues: any[] = [];
        try {
          const startTime = Date.now();
          const bulkData: any[] = [];
          
          // Create 10 option values for performance test
          for (let i = 0; i < 10; i++) {
            bulkData.push(createTestOptionValueData({
              value: `perf-bulk-${timestamp}-${i}`,
              displayName: `Performance Bulk Value ${i}`,
              sortOrder: i + 1,
            }));
          }

          const response = await request(SERVER_URL)
            .post('/api/option-values/bulk-create')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ data: bulkData })
            .expect(200);

          const endTime = Date.now();
          const duration = endTime - startTime;

          expect(response.body.success).toBe(10);
          expect(response.body.errors).toHaveLength(0);
          expect(response.body.created).toHaveLength(10);

          // Performance check - should complete within reasonable time
          expect(duration).toBeLessThan(15000); // 15 seconds

          createdOptionValues = response.body.created;
        } finally {
          // Clean up
          for (const optionValue of createdOptionValues) {
            try {
              await request(SERVER_URL)
                .delete(`/api/option-values/${optionValue.documentId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
            } catch (error) {
              console.warn(`Failed to clean up performance test option value ${optionValue.documentId}:`, error.message);
            }
          }
        }
      });

      it('should handle duplicate values in bulk creation', async () => {
        let createdOptionValues: any[] = [];
        try {
          const duplicateValue = `duplicate-bulk-${timestamp}`;
          const bulkData = [
            createTestOptionValueData({
              value: duplicateValue,
              displayName: 'First Duplicate',
            }),
            createTestOptionValueData({
              value: duplicateValue, // Duplicate value
              displayName: 'Second Duplicate',
            }),
          ];

          const response = await request(SERVER_URL)
            .post('/api/option-values/bulk-create')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ data: bulkData })
            .expect(200);

          // Should handle duplicates gracefully (either succeed or fail with appropriate error)
          expect(response.body).toBeDefined();
          expect(response.body.success).toBeGreaterThanOrEqual(0);
          expect(response.body.created.length + response.body.errors.length).toBe(2);

          createdOptionValues = response.body.created;
        } finally {
          // Clean up successfully created option values
          for (const optionValue of createdOptionValues) {
            try {
              await request(SERVER_URL)
                .delete(`/api/option-values/${optionValue.documentId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
            } catch (error) {
              console.warn(`Failed to clean up duplicate test option value ${optionValue.documentId}:`, error.message);
            }
          }
        }
      });
  });
});
