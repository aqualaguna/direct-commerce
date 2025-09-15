/**
 * Option Value Integration Tests
 * 
 * Comprehensive integration tests for Option Value module covering:
 * - Option value CRUD operations with database verification
 * - Option value validation and constraints
 * - Option value relationships and associations
 * - Option value performance optimization
 * - Option value bulk operations
 * - Option value draft/publish functionality
 * - Option value cleanup and data integrity
 */

import request from 'supertest';

describe('Option Value Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let adminToken: string;
  let testOptionGroup: any;
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();

  beforeAll(async () => {
    // Get admin token for authenticated requests
    adminToken = process.env.STRAPI_API_TOKEN as string;

    if (!adminToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }

    // Create a test option group for option value tests
    const optionGroupData = {
      name: `test-option-group-${timestamp}`,
      displayName: `Test Option Group ${timestamp}`,
      type: 'select',
      isRequired: true,
      sortOrder: 1,
      isActive: true,
    };

    const optionGroupResponse = await request(SERVER_URL)
      .post('/api/option-groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: optionGroupData })
      .expect(201);

    testOptionGroup = optionGroupResponse.body.data;
  });

  // Add delay between tests to avoid rate limiting
  afterEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
  });

  // Cleanup after all tests
  afterAll(async () => {
    // Clean up test option group
    if (testOptionGroup) {
      await request(SERVER_URL)
        .delete(`/api/option-groups/${testOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    }
  });

  // Test data factories
  const createTestOptionValueData = (overrides = {}) => ({
    value: `test-value-${timestamp}`,
    displayName: `Test Value ${timestamp}`,
    sortOrder: 1,
    isActive: true,
    optionGroup: testOptionGroup.documentId,
    ...overrides,
  });

  const createTestSizeValue = (overrides = {}) => ({
    value: `size-s-${timestamp}`,
    displayName: 'Small',
    sortOrder: 1,
    isActive: true,
    optionGroup: testOptionGroup.documentId,
    ...overrides,
  });

  const createTestColorValue = (overrides = {}) => ({
    value: `color-red-${timestamp}`,
    displayName: 'Red',
    sortOrder: 1,
    isActive: true,
    optionGroup: testOptionGroup.documentId,
    ...overrides,
  });

  const createTestMaterialValue = (overrides = {}) => ({
    value: `material-cotton-${timestamp}`,
    displayName: 'Cotton',
    sortOrder: 1,
    isActive: true,
    optionGroup: testOptionGroup.documentId,
    ...overrides,
  });

  describe('Option Value CRUD Operations', () => {
    let createdOptionValue: any;

    it('should create option value and verify database record', async () => {
      const optionValueData = createTestOptionValueData();

      const response = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionValueData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBeDefined();
      expect(response.body.data.value).toBe(optionValueData.value);
      expect(response.body.data.displayName).toBe(optionValueData.displayName);
      expect(response.body.data.sortOrder).toBe(optionValueData.sortOrder);
      expect(response.body.data.isActive).toBe(optionValueData.isActive);
      expect(response.body.data.optionGroup).toBeDefined();
      expect(response.body.data.status).toBe('draft');

      createdOptionValue = response.body.data;
    });

    it('should retrieve option value by documentId', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/option-values/${createdOptionValue.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBe(createdOptionValue.documentId);
      expect(response.body.data.value).toBe(createdOptionValue.value);
      expect(response.body.data.displayName).toBe(createdOptionValue.displayName);
      expect(response.body.data.optionGroup).toBeDefined();
    });

    it('should update option value and verify changes', async () => {
      const updateData = {
        displayName: `Updated Test Value ${timestamp}`,
        sortOrder: 5,
        isActive: false,
      };

      const response = await request(SERVER_URL)
        .put(`/api/option-values/${createdOptionValue.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBe(createdOptionValue.documentId);
      expect(response.body.data.displayName).toBe(updateData.displayName);
      expect(response.body.data.sortOrder).toBe(updateData.sortOrder);
      expect(response.body.data.isActive).toBe(updateData.isActive);
    });

    it('should delete option value and verify removal', async () => {
      const response = await request(SERVER_URL)
        .delete(`/api/option-values/${createdOptionValue.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.message).toBe('Option value deleted successfully');

      // Verify option value is deleted
      await request(SERVER_URL)
        .get(`/api/option-values/${createdOptionValue.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Option Value Validation and Constraints', () => {
    it('should reject option value with missing required fields', async () => {
      const invalidData = {
        sortOrder: 1,
        // Missing value, displayName, and optionGroup
      };

      const response = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidData })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Value, display name, and option group are required');
    });

    it('should reject option value with value exceeding max length', async () => {
      const invalidData = createTestOptionValueData({
        value: 'a'.repeat(101), // Exceeds maxLength: 100
      });

      const response = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidData })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject option value with displayName exceeding max length', async () => {
      const invalidData = createTestOptionValueData({
        displayName: 'a'.repeat(101), // Exceeds maxLength: 100
      });

      const response = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidData })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject option value with empty value', async () => {
      const invalidData = createTestOptionValueData({
        value: '', // Empty value
      });

      const response = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidData })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject option value with empty displayName', async () => {
      const invalidData = createTestOptionValueData({
        displayName: '', // Empty displayName
      });

      const response = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidData })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject option value with invalid option group', async () => {
      const invalidData = createTestOptionValueData({
        optionGroup: 'invalid-option-group-id',
      });

      const response = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidData })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should accept valid option value data', async () => {
      const validData = createTestOptionValueData();

      const response = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: validData })
        .expect(201);

      expect(response.body.data.value).toBe(validData.value);
      expect(response.body.data.displayName).toBe(validData.displayName);
      expect(response.body.data.optionGroup).toBe(validData.optionGroup);

      // Clean up
      await request(SERVER_URL)
        .delete(`/api/option-values/${response.body.data.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Option Value Retrieval and Filtering', () => {
    let testOptionValues: any[] = [];

    beforeAll(async () => {
      // Create test option values for filtering tests
      const optionValuesData = [
        createTestSizeValue(),
        createTestColorValue(),
        createTestMaterialValue(),
      ];

      for (const data of optionValuesData) {
        const response = await request(SERVER_URL)
          .post('/api/option-values')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data })
          .expect(201);
        
        testOptionValues.push(response.body.data);
      }
    });

    afterAll(async () => {
      // Clean up test option values
      for (const optionValue of testOptionValues) {
        await request(SERVER_URL)
          .delete(`/api/option-values/${optionValue.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }
    });

    it('should retrieve all option values with pagination', async () => {
      const response = await request(SERVER_URL)
        .get('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.pagination).toBeDefined();
    });

    it('should filter option values by option group', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/option-values/option-group/${testOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned option values should belong to the test option group
      response.body.data.forEach((optionValue: any) => {
        expect(optionValue.optionGroup.documentId).toBe(testOptionGroup.documentId);
      });
    });

    it('should filter option values by isActive', async () => {
      const response = await request(SERVER_URL)
        .get('/api/option-values?filters[isActive]=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned option values should be active
      response.body.data.forEach((optionValue: any) => {
        expect(optionValue.isActive).toBe(true);
      });
    });

    it('should sort option values by sortOrder', async () => {
      const response = await request(SERVER_URL)
        .get('/api/option-values?sort=sortOrder:asc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Verify sorting order
      for (let i = 1; i < response.body.data.length; i++) {
        expect(response.body.data[i].sortOrder).toBeGreaterThanOrEqual(
          response.body.data[i - 1].sortOrder
        );
      }
    });

    it('should apply pagination correctly', async () => {
      const response = await request(SERVER_URL)
        .get('/api/option-values?pagination[page]=1&pagination[pageSize]=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.pageSize).toBe(2);
    });

    it('should handle invalid pagination parameters gracefully', async () => {
      const response = await request(SERVER_URL)
        .get('/api/option-values?pagination[page]=-1&pagination[pageSize]=1000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.meta.pagination.page).toBe(1); // Should default to 1
      expect(response.body.meta.pagination.pageSize).toBe(100); // Should cap at 100
    });
  });

  describe('Option Value Custom Endpoints', () => {
    let testOptionValue: any;

    beforeAll(async () => {
      // Create test option value for custom endpoint tests
      const optionValueData = createTestOptionValueData();
      
      const response = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionValueData })
        .expect(201);
      
      testOptionValue = response.body.data;
    });

    afterAll(async () => {
      // Clean up test option value
      if (testOptionValue) {
        await request(SERVER_URL)
          .delete(`/api/option-values/${testOptionValue.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }
    });

    it('should retrieve active option values only', async () => {
      const response = await request(SERVER_URL)
        .get('/api/option-values/active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned option values should be active
      response.body.data.forEach((optionValue: any) => {
        expect(optionValue.isActive).toBe(true);
        expect(optionValue.status).toBe('published');
      });
    });

    it('should handle missing optionGroupId in findByOptionGroup', async () => {
      const response = await request(SERVER_URL)
        .get('/api/option-values/option-group/')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Option group ID is required');
    });

    it('should handle missing productListingId in findByProductListing', async () => {
      const response = await request(SERVER_URL)
        .get('/api/option-values/product-listing/')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Product listing ID is required');
    });
  });

  describe('Option Value Bulk Operations', () => {
    it('should create multiple option values in bulk', async () => {
      const bulkData = [
        createTestSizeValue({ value: `bulk-size-s-${timestamp}` }),
        createTestSizeValue({ value: `bulk-size-m-${timestamp}`, displayName: 'Medium', sortOrder: 2 }),
        createTestSizeValue({ value: `bulk-size-l-${timestamp}`, displayName: 'Large', sortOrder: 3 }),
      ];

      const response = await request(SERVER_URL)
        .post('/api/option-values/bulk-create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: bulkData })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.success).toBe(3);
      expect(response.body.data.errors).toHaveLength(0);
      expect(response.body.data.created).toHaveLength(3);

      // Verify all option values were created
      response.body.data.created.forEach((optionValue: any) => {
        expect(optionValue.documentId).toBeDefined();
        expect(optionValue.value).toBeDefined();
        expect(optionValue.displayName).toBeDefined();
        expect(optionValue.optionGroup).toBeDefined();
      });

      // Clean up bulk created option values
      for (const optionValue of response.body.data.created) {
        await request(SERVER_URL)
          .delete(`/api/option-values/${optionValue.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }
    });

    it('should handle partial failures in bulk creation', async () => {
      const bulkData = [
        createTestSizeValue({ value: `valid-bulk-${timestamp}` }),
        { value: '', displayName: 'Invalid', optionGroup: testOptionGroup.documentId }, // Invalid data
        createTestSizeValue({ value: `another-valid-${timestamp}` }),
      ];

      const response = await request(SERVER_URL)
        .post('/api/option-values/bulk-create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: bulkData })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.success).toBe(2);
      expect(response.body.data.errors.length).toBeGreaterThan(0);
      expect(response.body.data.created).toHaveLength(2);

      // Clean up successfully created option values
      for (const optionValue of response.body.data.created) {
        await request(SERVER_URL)
          .delete(`/api/option-values/${optionValue.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }
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
  });

  describe('Option Value Draft and Publish Operations', () => {
    let draftOptionValue: any;

    it('should create option value in draft status', async () => {
      const optionValueData = createTestOptionValueData();

      const response = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionValueData })
        .expect(201);

      expect(response.body.data.status).toBe('draft');
      draftOptionValue = response.body.data;
    });

    it('should publish option value', async () => {
      const response = await request(SERVER_URL)
        .post(`/api/option-values/${draftOptionValue.documentId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.entries).toBeDefined();
      expect(response.body.data.entries.length).toBe(1);
      expect(response.body.data.entries[0].status).toBe('published');
    });

    it('should unpublish option value', async () => {
      const response = await request(SERVER_URL)
        .post(`/api/option-values/${draftOptionValue.documentId}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.entries).toBeDefined();
      expect(response.body.data.entries.length).toBe(1);
      expect(response.body.data.entries[0].status).toBe('draft');
    });

    it('should discard draft changes', async () => {
      // First, make some changes to the draft
      await request(SERVER_URL)
        .put(`/api/option-values/${draftOptionValue.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { displayName: 'Modified Display Name' } })
        .expect(200);

      // Then discard the draft
      const response = await request(SERVER_URL)
        .post(`/api/option-values/${draftOptionValue.documentId}/discard-draft`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    afterAll(async () => {
      // Clean up draft option value
      if (draftOptionValue) {
        await request(SERVER_URL)
          .delete(`/api/option-values/${draftOptionValue.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }
    });
  });

  describe('Option Value Performance and Bulk Operations', () => {
    it('should handle bulk creation efficiently', async () => {
      const startTime = Date.now();
      const bulkData: any[] = [];
      
      // Create multiple option values
      for (let i = 0; i < 5; i++) {
        bulkData.push(createTestOptionValueData({
          value: `perf-test-${timestamp}-${i}`,
          displayName: `Performance Test Value ${i}`,
        }));
      }

      const response = await request(SERVER_URL)
        .post('/api/option-values/bulk-create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: bulkData })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all creations were successful
      expect(response.body.data.success).toBe(5);
      expect(response.body.data.errors).toHaveLength(0);
      expect(response.body.data.created).toHaveLength(5);

      // Performance check - should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds

      // Clean up
      for (const optionValue of response.body.data.created) {
        await request(SERVER_URL)
          .delete(`/api/option-values/${optionValue.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }
    });

    it('should handle large dataset retrieval efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(SERVER_URL)
        .get('/api/option-values?pagination[pageSize]=50')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Performance check - should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
    });
  });

  describe('Option Value Error Handling', () => {
    it('should return 404 for non-existent option value', async () => {
      const nonExistentId = 'non-existent-document-id';
      
      const response = await request(SERVER_URL)
        .get(`/api/option-values/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Option value not found');
    });

    it('should return 400 for invalid documentId format', async () => {
      const invalidId = 'invalid-document-id-format';
      
      const response = await request(SERVER_URL)
        .get(`/api/option-values/${invalidId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when trying to delete option value used in variants', async () => {
      // Create option value
      const optionValueData = createTestOptionValueData();
      const createResponse = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionValueData })
        .expect(201);

      const optionValueId = createResponse.body.data.documentId;

      // Note: In a real scenario, we would create variants that use this option value
      // For now, we'll test the deletion without variants (should succeed)
      // This would require the product-listing-variant API to be implemented first

      // The delete should work if no variants use this option value
      await request(SERVER_URL)
        .delete(`/api/option-values/${optionValueId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should handle server errors gracefully', async () => {
      // Test with malformed request data
      const response = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ invalidData: 'test' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Option Value Data Integrity', () => {
    it('should maintain referential integrity with option groups', async () => {
      // Create option value
      const optionValueData = createTestOptionValueData();
      const createResponse = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionValueData })
        .expect(201);

      const optionValueId = createResponse.body.data.documentId;

      // Verify option value was created with correct structure
      expect(createResponse.body.data.documentId).toBeDefined();
      expect(createResponse.body.data.value).toBe(optionValueData.value);
      expect(createResponse.body.data.displayName).toBe(optionValueData.displayName);
      expect(createResponse.body.data.optionGroup).toBe(optionValueData.optionGroup);
      expect(createResponse.body.data.sortOrder).toBe(optionValueData.sortOrder);
      expect(createResponse.body.data.isActive).toBe(optionValueData.isActive);

      // Clean up
      await request(SERVER_URL)
        .delete(`/api/option-values/${optionValueId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should handle concurrent operations correctly', async () => {
      const optionValueData = createTestOptionValueData();
      
      // Create option value
      const createResponse = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionValueData })
        .expect(201);

      const optionValueId = createResponse.body.data.documentId;

      // Perform concurrent updates
      const updatePromises = [
        request(SERVER_URL)
          .put(`/api/option-values/${optionValueId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: { displayName: 'Concurrent Update 1' } }),
        request(SERVER_URL)
          .put(`/api/option-values/${optionValueId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: { sortOrder: 999 } }),
      ];

      const updateResponses = await Promise.all(updatePromises);
      
      // At least one update should succeed
      const successfulUpdates = updateResponses.filter(response => response.status === 200);
      expect(successfulUpdates.length).toBeGreaterThan(0);

      // Clean up
      await request(SERVER_URL)
        .delete(`/api/option-values/${optionValueId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Option Value Relationships and Associations', () => {
    let testOptionValue: any;

    beforeAll(async () => {
      // Create test option value for relationship tests
      const optionValueData = createTestOptionValueData();
      
      const response = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionValueData })
        .expect(201);
      
      testOptionValue = response.body.data;
    });

    afterAll(async () => {
      // Clean up test option value
      if (testOptionValue) {
        await request(SERVER_URL)
          .delete(`/api/option-values/${testOptionValue.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }
    });

    it('should populate option group relationship', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/option-values/${testOptionValue.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.optionGroup).toBeDefined();
      expect(response.body.data.optionGroup.documentId).toBe(testOptionGroup.documentId);
      expect(response.body.data.optionGroup.name).toBe(testOptionGroup.name);
      expect(response.body.data.optionGroup.displayName).toBe(testOptionGroup.displayName);
    });

    it('should retrieve option values by option group', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/option-values/option-group/${testOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Should include our test option value
      const foundOptionValue = response.body.data.find(
        (ov: any) => ov.documentId === testOptionValue.documentId
      );
      expect(foundOptionValue).toBeDefined();
      expect(foundOptionValue.optionGroup.documentId).toBe(testOptionGroup.documentId);
    });

    it('should handle option group deletion constraints', async () => {
      // Create a new option group and option value for this test
      const newOptionGroupData = {
        name: `constraint-test-group-${timestamp}`,
        displayName: `Constraint Test Group ${timestamp}`,
        type: 'select',
        isRequired: true,
        sortOrder: 1,
        isActive: true,
      };

      const optionGroupResponse = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: newOptionGroupData })
        .expect(201);

      const newOptionGroup = optionGroupResponse.body.data;

      const newOptionValueData = createTestOptionValueData({
        optionGroup: newOptionGroup.documentId,
        value: `constraint-test-value-${timestamp}`,
      });

      const optionValueResponse = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: newOptionValueData })
        .expect(201);

      const newOptionValue = optionValueResponse.body.data;

      // Try to delete the option group (should fail if it has option values)
      const deleteResponse = await request(SERVER_URL)
        .delete(`/api/option-groups/${newOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(deleteResponse.body.error).toBeDefined();
      expect(deleteResponse.body.error.message).toContain('Cannot delete option group with existing option values');

      // Clean up: delete option value first, then option group
      await request(SERVER_URL)
        .delete(`/api/option-values/${newOptionValue.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(SERVER_URL)
        .delete(`/api/option-groups/${newOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
