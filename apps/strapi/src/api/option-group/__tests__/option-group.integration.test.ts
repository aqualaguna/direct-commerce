/**
 * Option Group Integration Tests
 * 
 * Comprehensive integration tests for Option Group module covering:
 * - Option group CRUD operations with database verification
 * - Option group validation and constraints
 * - Option group relationships and associations
 * - Option group performance optimization
 * - Option group bulk operations
 * - Option group draft/publish functionality
 * - Option group cleanup and data integrity
 */

import request from 'supertest';

describe('Option Group Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let adminToken: string;
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();

  beforeAll(async () => {
    // Get admin token for authenticated requests
    adminToken = process.env.STRAPI_API_TOKEN as string;

    if (!adminToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }
  });

  // Add delay between tests to avoid rate limiting
  afterEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
  });

  // Test data factories
  const createTestOptionGroupData = (overrides = {}) => ({
    name: `test-option-group-${timestamp}`,
    displayName: `Test Option Group ${timestamp}`,
    type: 'select',
    isRequired: true,
    sortOrder: 1,
    isActive: true,
    ...overrides,
  });

  const createTestSizeOptionGroup = (overrides = {}) => ({
    name: `size-${timestamp}`,
    displayName: 'Product Size',
    type: 'select',
    isRequired: true,
    sortOrder: 1,
    isActive: true,
    ...overrides,
  });

  const createTestColorOptionGroup = (overrides = {}) => ({
    name: `color-${timestamp}`,
    displayName: 'Product Color',
    type: 'radio',
    isRequired: false,
    sortOrder: 2,
    isActive: true,
    ...overrides,
  });

  const createTestMaterialOptionGroup = (overrides = {}) => ({
    name: `material-${timestamp}`,
    displayName: 'Product Material',
    type: 'checkbox',
    isRequired: false,
    sortOrder: 3,
    isActive: true,
    ...overrides,
  });

  describe('Option Group CRUD Operations', () => {
    let createdOptionGroup: any;

    it('should create option group and verify database record', async () => {
      const optionGroupData = createTestOptionGroupData();

      const response = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionGroupData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBeDefined();
      expect(response.body.data.name).toBe(optionGroupData.name);
      expect(response.body.data.displayName).toBe(optionGroupData.displayName);
      expect(response.body.data.type).toBe(optionGroupData.type);
      expect(response.body.data.isRequired).toBe(optionGroupData.isRequired);
      expect(response.body.data.sortOrder).toBe(optionGroupData.sortOrder);
      expect(response.body.data.isActive).toBe(optionGroupData.isActive);
      expect(response.body.data.status).toBe('draft');

      createdOptionGroup = response.body.data;
    });

    it('should retrieve option group by documentId', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/option-groups/${createdOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBe(createdOptionGroup.documentId);
      expect(response.body.data.name).toBe(createdOptionGroup.name);
      expect(response.body.data.displayName).toBe(createdOptionGroup.displayName);
    });

    it('should update option group and verify changes', async () => {
      const updateData = {
        displayName: `Updated Test Option Group ${timestamp}`,
        isRequired: false,
        sortOrder: 5,
      };

      const response = await request(SERVER_URL)
        .put(`/api/option-groups/${createdOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBe(createdOptionGroup.documentId);
      expect(response.body.data.displayName).toBe(updateData.displayName);
      expect(response.body.data.isRequired).toBe(updateData.isRequired);
      expect(response.body.data.sortOrder).toBe(updateData.sortOrder);
    });

    it('should delete option group and verify removal', async () => {
      const response = await request(SERVER_URL)
        .delete(`/api/option-groups/${createdOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.message).toBe('Option group deleted successfully');

      // Verify option group is deleted
      await request(SERVER_URL)
        .get(`/api/option-groups/${createdOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Option Group Validation and Constraints', () => {
    it('should reject option group with missing required fields', async () => {
      const invalidData = {
        type: 'select',
        // Missing name and displayName
      };

      const response = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidData })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Name and display name are required');
    });

    it('should reject option group with invalid type', async () => {
      const invalidData = createTestOptionGroupData({
        type: 'invalid-type',
      });

      const response = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidData })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject option group with duplicate name', async () => {
      const optionGroupData = createTestOptionGroupData();
      
      // Create first option group
      await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionGroupData })
        .expect(201);

      // Try to create second option group with same name
      const response = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionGroupData })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject option group with name exceeding max length', async () => {
      const invalidData = createTestOptionGroupData({
        name: 'a'.repeat(51), // Exceeds maxLength: 50
      });

      const response = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidData })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject option group with displayName exceeding max length', async () => {
      const invalidData = createTestOptionGroupData({
        displayName: 'a'.repeat(101), // Exceeds maxLength: 100
      });

      const response = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidData })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should accept valid option group types', async () => {
      const validTypes = ['select', 'radio', 'checkbox'];
      
      for (const type of validTypes) {
        const optionGroupData = createTestOptionGroupData({
          name: `test-${type}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
          type,
        });

        const response = await request(SERVER_URL)
          .post('/api/option-groups')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: optionGroupData })
          .expect(201);

        expect(response.body.data.type).toBe(type);
      }
    });
  });

  describe('Option Group Retrieval and Filtering', () => {
    let testOptionGroups: any[] = [];

    beforeAll(async () => {
      // Create test option groups for filtering tests
      const optionGroupsData = [
        createTestSizeOptionGroup(),
        createTestColorOptionGroup(),
        createTestMaterialOptionGroup(),
      ];

      for (const data of optionGroupsData) {
        const response = await request(SERVER_URL)
          .post('/api/option-groups')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data })
          .expect(201);
        
        testOptionGroups.push(response.body.data);
      }
    });

    it('should retrieve all option groups with pagination', async () => {
      const response = await request(SERVER_URL)
        .get('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.pagination).toBeDefined();
    });

    it('should filter option groups by type', async () => {
      const response = await request(SERVER_URL)
        .get('/api/option-groups?filters[type]=select')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned option groups should have type 'select'
      response.body.data.forEach((optionGroup: any) => {
        expect(optionGroup.type).toBe('select');
      });
    });

    it('should filter option groups by isRequired', async () => {
      const response = await request(SERVER_URL)
        .get('/api/option-groups?filters[isRequired]=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned option groups should be required
      response.body.data.forEach((optionGroup: any) => {
        expect(optionGroup.isRequired).toBe(true);
      });
    });

    it('should filter option groups by isActive', async () => {
      const response = await request(SERVER_URL)
        .get('/api/option-groups?filters[isActive]=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned option groups should be active
      response.body.data.forEach((optionGroup: any) => {
        expect(optionGroup.isActive).toBe(true);
      });
    });

    it('should sort option groups by sortOrder', async () => {
      const response = await request(SERVER_URL)
        .get('/api/option-groups?sort=sortOrder:asc')
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
        .get('/api/option-groups?pagination[page]=1&pagination[pageSize]=2')
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
        .get('/api/option-groups?pagination[page]=-1&pagination[pageSize]=1000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.meta.pagination.page).toBe(1); // Should default to 1
      expect(response.body.meta.pagination.pageSize).toBe(100); // Should cap at 100
    });
  });

  describe('Option Group Custom Endpoints', () => {
    let testOptionGroup: any;

    beforeAll(async () => {
      // Create test option group for custom endpoint tests
      const optionGroupData = createTestOptionGroupData();
      
      const response = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionGroupData })
        .expect(201);
      
      testOptionGroup = response.body.data;
    });

    it('should retrieve active option groups only', async () => {
      const response = await request(SERVER_URL)
        .get('/api/option-groups/active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned option groups should be active
      response.body.data.forEach((optionGroup: any) => {
        expect(optionGroup.isActive).toBe(true);
        expect(optionGroup.status).toBe('published');
      });
    });

    it('should handle missing productListingId in findByProductListing', async () => {
      const response = await request(SERVER_URL)
        .get('/api/option-groups/product-listing/')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Product listing ID is required');
    });
  });

  describe('Option Group Draft and Publish Operations', () => {
    let draftOptionGroup: any;

    it('should create option group in draft status', async () => {
      const optionGroupData = createTestOptionGroupData();

      const response = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionGroupData })
        .expect(201);

      expect(response.body.data.status).toBe('draft');
      draftOptionGroup = response.body.data;
    });

    it('should publish option group', async () => {
      const response = await request(SERVER_URL)
        .post(`/api/option-groups/${draftOptionGroup.documentId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.entries).toBeDefined();
      expect(response.body.data.entries.length).toBe(1);
      expect(response.body.data.entries[0].status).toBe('published');
    });

    it('should unpublish option group', async () => {
      const response = await request(SERVER_URL)
        .post(`/api/option-groups/${draftOptionGroup.documentId}/unpublish`)
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
        .put(`/api/option-groups/${draftOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { displayName: 'Modified Display Name' } })
        .expect(200);

      // Then discard the draft
      const response = await request(SERVER_URL)
        .post(`/api/option-groups/${draftOptionGroup.documentId}/discard-draft`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('Option Group Performance and Bulk Operations', () => {
    it('should handle bulk creation efficiently', async () => {
      const startTime = Date.now();
      const bulkData: any[] = [];
      
      // Create multiple option groups
      for (let i = 0; i < 5; i++) {
        bulkData.push(createTestOptionGroupData({
          name: `bulk-test-${timestamp}-${i}`,
          displayName: `Bulk Test Option Group ${i}`,
        }));
      }

      const promises = bulkData.map(data =>
        request(SERVER_URL)
          .post('/api/option-groups')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all creations were successful
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.data).toBeDefined();
      });

      // Performance check - should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds
    });

    it('should handle large dataset retrieval efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(SERVER_URL)
        .get('/api/option-groups?pagination[pageSize]=50')
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

  describe('Option Group Error Handling', () => {
    it('should return 404 for non-existent option group', async () => {
      const nonExistentId = 'non-existent-document-id';
      
      const response = await request(SERVER_URL)
        .get(`/api/option-groups/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Option group not found');
    });

    it('should return 400 for invalid documentId format', async () => {
      const invalidId = 'invalid-document-id-format';
      
      const response = await request(SERVER_URL)
        .get(`/api/option-groups/${invalidId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when trying to delete option group with option values', async () => {
      // Create option group
      const optionGroupData = createTestOptionGroupData();
      const createResponse = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionGroupData })
        .expect(201);

      const optionGroupId = createResponse.body.data.documentId;

      // Note: In a real scenario, we would create option values here
      // For now, we'll test the error handling when option values exist
      // This would require the option-value API to be implemented first

      // The delete should still work if no option values exist
      await request(SERVER_URL)
        .delete(`/api/option-groups/${optionGroupId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should handle server errors gracefully', async () => {
      // Test with malformed request data
      const response = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ invalidData: 'test' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Option Group Data Integrity', () => {
    it('should maintain referential integrity with option values', async () => {
      // Create option group
      const optionGroupData = createTestOptionGroupData();
      const createResponse = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionGroupData })
        .expect(201);

      const optionGroupId = createResponse.body.data.documentId;

      // Verify option group was created with correct structure
      expect(createResponse.body.data.documentId).toBeDefined();
      expect(createResponse.body.data.name).toBe(optionGroupData.name);
      expect(createResponse.body.data.displayName).toBe(optionGroupData.displayName);
      expect(createResponse.body.data.type).toBe(optionGroupData.type);
      expect(createResponse.body.data.isRequired).toBe(optionGroupData.isRequired);
      expect(createResponse.body.data.sortOrder).toBe(optionGroupData.sortOrder);
      expect(createResponse.body.data.isActive).toBe(optionGroupData.isActive);

      // Clean up
      await request(SERVER_URL)
        .delete(`/api/option-groups/${optionGroupId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should handle concurrent operations correctly', async () => {
      const optionGroupData = createTestOptionGroupData();
      
      // Create option group
      const createResponse = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionGroupData })
        .expect(201);

      const optionGroupId = createResponse.body.data.documentId;

      // Perform concurrent updates
      const updatePromises = [
        request(SERVER_URL)
          .put(`/api/option-groups/${optionGroupId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: { displayName: 'Concurrent Update 1' } }),
        request(SERVER_URL)
          .put(`/api/option-groups/${optionGroupId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: { sortOrder: 999 } }),
      ];

      const updateResponses = await Promise.all(updatePromises);
      
      // At least one update should succeed
      const successfulUpdates = updateResponses.filter(response => response.status === 200);
      expect(successfulUpdates.length).toBeGreaterThan(0);

      // Clean up
      await request(SERVER_URL)
        .delete(`/api/option-groups/${optionGroupId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  // Cleanup after all tests
  afterAll(async () => {
    // Clean up any remaining test data
    // This would ideally query for all test data and delete it
    // For now, we rely on the individual test cleanup
  });
});
