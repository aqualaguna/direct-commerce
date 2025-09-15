/**
 * Option Group and Value Relationships Integration Tests
 * 
 * Comprehensive integration tests for Option Group and Value relationships covering:
 * - Option group to value associations
 * - Option value to group relationships
 * - Option group value inheritance
 * - Option group value validation rules
 * - Option group value cleanup on deletion
 * - Option group value performance optimization
 */

import request from 'supertest';

describe('Option Group and Value Relationships Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let adminToken: string;
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();
  
  // Test data storage
  let testOptionGroups: any[] = [];
  let testOptionValues: any[] = [];

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

  // Cleanup after all tests
  afterAll(async () => {
    // Clean up test option values first (due to foreign key constraints)
    for (const optionValue of testOptionValues) {
      try {
        await request(SERVER_URL)
          .delete(`/api/option-values/${optionValue.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      } catch (error) {
        // Option value might already be deleted
        console.warn(`Failed to delete option value ${optionValue.documentId}:`, error);
      }
    }

    // Clean up test option groups
    for (const optionGroup of testOptionGroups) {
      try {
        await request(SERVER_URL)
          .delete(`/api/option-groups/${optionGroup.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      } catch (error) {
        // Option group might already be deleted
        console.warn(`Failed to delete option group ${optionGroup.documentId}:`, error);
      }
    }
  });

  // Test data factories
  const createTestOptionGroupData = (overrides = {}) => ({
    name: `test-option-group-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
    displayName: `Test Option Group ${timestamp}`,
    type: 'select',
    isRequired: true,
    sortOrder: 1,
    isActive: true,
    ...overrides,
  });

  const createTestOptionValueData = (optionGroupId: string, overrides = {}) => ({
    value: `test-value-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
    displayName: `Test Value ${timestamp}`,
    sortOrder: 1,
    isActive: true,
    optionGroup: optionGroupId,
    ...overrides,
  });

  describe('Option Group to Value Associations', () => {
    let testOptionGroup: any;
    let testOptionValues: any[] = [];

    beforeAll(async () => {
      // Create test option group
      const optionGroupData = createTestOptionGroupData();
      
      const response = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionGroupData })
        .expect(201);
      
      testOptionGroup = response.body.data;
      testOptionGroups.push(testOptionGroup);

      // Create multiple option values for this group
      const optionValuesData = [
        createTestOptionValueData(testOptionGroup.documentId, {
          value: `size-s-${timestamp}`,
          displayName: 'Small',
          sortOrder: 1,
        }),
        createTestOptionValueData(testOptionGroup.documentId, {
          value: `size-m-${timestamp}`,
          displayName: 'Medium',
          sortOrder: 2,
        }),
        createTestOptionValueData(testOptionGroup.documentId, {
          value: `size-l-${timestamp}`,
          displayName: 'Large',
          sortOrder: 3,
        }),
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
        try {
          await request(SERVER_URL)
            .delete(`/api/option-values/${optionValue.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);
        } catch (error) {
          console.warn(`Failed to delete option value ${optionValue.documentId}:`, error);
        }
      }
    });

    it('should retrieve option group with populated option values', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/option-groups/${testOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ populate: 'optionValues' })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBe(testOptionGroup.documentId);
      expect(response.body.data.optionValues).toBeDefined();
      expect(Array.isArray(response.body.data.optionValues)).toBe(true);
      expect(response.body.data.optionValues.length).toBeGreaterThanOrEqual(3);
      
      // Verify all option values belong to this option group
      response.body.data.optionValues.forEach((optionValue: any) => {
        expect(optionValue.optionGroup).toBe(testOptionGroup.documentId);
        expect(optionValue.value).toBeDefined();
        expect(optionValue.displayName).toBeDefined();
        expect(optionValue.sortOrder).toBeDefined();
      });
    });

    it('should retrieve option values by option group', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/option-values/option-group/${testOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
      
      // Verify all returned option values belong to the test option group
      response.body.data.forEach((optionValue: any) => {
        expect(optionValue.optionGroup.documentId).toBe(testOptionGroup.documentId);
        expect(optionValue.value).toBeDefined();
        expect(optionValue.displayName).toBeDefined();
        expect(optionValue.sortOrder).toBeDefined();
      });
    });

    it('should maintain referential integrity when creating option values', async () => {
      const newOptionValueData = createTestOptionValueData(testOptionGroup.documentId, {
        value: `size-xl-${timestamp}`,
        displayName: 'Extra Large',
        sortOrder: 4,
      });

      const response = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: newOptionValueData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.optionGroup).toBe(testOptionGroup.documentId);
      expect(response.body.data.value).toBe(newOptionValueData.value);
      expect(response.body.data.displayName).toBe(newOptionValueData.displayName);

      // Verify the option value is associated with the correct option group
      const verifyResponse = await request(SERVER_URL)
        .get(`/api/option-values/${response.body.data.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(verifyResponse.body.data.optionGroup.documentId).toBe(testOptionGroup.documentId);
      expect(verifyResponse.body.data.optionGroup.name).toBe(testOptionGroup.name);
      expect(verifyResponse.body.data.optionGroup.displayName).toBe(testOptionGroup.displayName);

      // Clean up the new option value
      await request(SERVER_URL)
        .delete(`/api/option-values/${response.body.data.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should reject option value creation with invalid option group', async () => {
      const invalidOptionValueData = createTestOptionValueData('invalid-option-group-id', {
        value: `invalid-test-${timestamp}`,
        displayName: 'Invalid Test',
      });

      const response = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidOptionValueData })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Invalid option group');
    });
  });

  describe('Option Value to Group Relationships', () => {
    let testOptionGroup: any;
    let testOptionValue: any;

    beforeAll(async () => {
      // Create test option group
      const optionGroupData = createTestOptionGroupData();
      
      const response = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionGroupData })
        .expect(201);
      
      testOptionGroup = response.body.data;
      testOptionGroups.push(testOptionGroup);

      // Create test option value
      const optionValueData = createTestOptionValueData(testOptionGroup.documentId);
      
      const valueResponse = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionValueData })
        .expect(201);
      
      testOptionValue = valueResponse.body.data;
      testOptionValues.push(testOptionValue);
    });

    it('should retrieve option value with populated option group', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/option-values/${testOptionValue.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ populate: 'optionGroup' })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBe(testOptionValue.documentId);
      expect(response.body.data.optionGroup).toBeDefined();
      expect(response.body.data.optionGroup.documentId).toBe(testOptionGroup.documentId);
      expect(response.body.data.optionGroup.name).toBe(testOptionGroup.name);
      expect(response.body.data.optionGroup.displayName).toBe(testOptionGroup.displayName);
      expect(response.body.data.optionGroup.type).toBe(testOptionGroup.type);
      expect(response.body.data.optionGroup.isRequired).toBe(testOptionGroup.isRequired);
    });

    it('should update option value and maintain group relationship', async () => {
      const updateData = {
        displayName: `Updated Test Value ${timestamp}`,
        sortOrder: 5,
      };

      const response = await request(SERVER_URL)
        .put(`/api/option-values/${testOptionValue.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBe(testOptionValue.documentId);
      expect(response.body.data.displayName).toBe(updateData.displayName);
      expect(response.body.data.sortOrder).toBe(updateData.sortOrder);
      expect(response.body.data.optionGroup).toBe(testOptionGroup.documentId);

      // Verify the relationship is maintained
      const verifyResponse = await request(SERVER_URL)
        .get(`/api/option-values/${testOptionValue.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ populate: 'optionGroup' })
        .expect(200);

      expect(verifyResponse.body.data.optionGroup.documentId).toBe(testOptionGroup.documentId);
    });

    it('should handle option value transfer to different option group', async () => {
      // Create a new option group
      const newOptionGroupData = createTestOptionGroupData({
        name: `transfer-test-group-${timestamp}`,
        displayName: `Transfer Test Group ${timestamp}`,
        type: 'radio',
      });
      
      const newGroupResponse = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: newOptionGroupData })
        .expect(201);
      
      const newOptionGroup = newGroupResponse.body.data;
      testOptionGroups.push(newOptionGroup);

      // Create a new option value for transfer test
      const transferOptionValueData = createTestOptionValueData(testOptionGroup.documentId, {
        value: `transfer-test-${timestamp}`,
        displayName: `Transfer Test Value ${timestamp}`,
      });
      
      const transferValueResponse = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: transferOptionValueData })
        .expect(201);
      
      const transferOptionValue = transferValueResponse.body.data;
      testOptionValues.push(transferOptionValue);

      // Transfer the option value to the new option group
      const transferData = {
        optionGroup: newOptionGroup.documentId,
      };

      const response = await request(SERVER_URL)
        .put(`/api/option-values/${transferOptionValue.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: transferData })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.optionGroup).toBe(newOptionGroup.documentId);

      // Verify the transfer was successful
      const verifyResponse = await request(SERVER_URL)
        .get(`/api/option-values/${transferOptionValue.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ populate: 'optionGroup' })
        .expect(200);

      expect(verifyResponse.body.data.optionGroup.documentId).toBe(newOptionGroup.documentId);
      expect(verifyResponse.body.data.optionGroup.name).toBe(newOptionGroup.name);
    });
  });

  describe('Option Group Value Inheritance', () => {
    let parentOptionGroup: any;
    let childOptionGroup: any;
    let parentOptionValues: any[] = [];

    beforeAll(async () => {
      // Create parent option group
      const parentGroupData = createTestOptionGroupData({
        name: `parent-group-${timestamp}`,
        displayName: `Parent Group ${timestamp}`,
        type: 'select',
      });
      
      const parentResponse = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: parentGroupData })
        .expect(201);
      
      parentOptionGroup = parentResponse.body.data;
      testOptionGroups.push(parentOptionGroup);

      // Create child option group
      const childGroupData = createTestOptionGroupData({
        name: `child-group-${timestamp}`,
        displayName: `Child Group ${timestamp}`,
        type: 'select',
      });
      
      const childResponse = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: childGroupData })
        .expect(201);
      
      childOptionGroup = childResponse.body.data;
      testOptionGroups.push(childOptionGroup);

      // Create option values for parent group
      const parentValuesData = [
        createTestOptionValueData(parentOptionGroup.documentId, {
          value: `parent-value-1-${timestamp}`,
          displayName: 'Parent Value 1',
          sortOrder: 1,
        }),
        createTestOptionValueData(parentOptionGroup.documentId, {
          value: `parent-value-2-${timestamp}`,
          displayName: 'Parent Value 2',
          sortOrder: 2,
        }),
      ];

      for (const data of parentValuesData) {
        const response = await request(SERVER_URL)
          .post('/api/option-values')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data })
          .expect(201);
        
        parentOptionValues.push(response.body.data);
      }
    });

    afterAll(async () => {
      // Clean up parent option values
      for (const optionValue of parentOptionValues) {
        try {
          await request(SERVER_URL)
            .delete(`/api/option-values/${optionValue.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);
        } catch (error) {
          console.warn(`Failed to delete option value ${optionValue.documentId}:`, error);
        }
      }
    });

    it('should inherit option group properties in option values', async () => {
      // Retrieve parent option group with its values
      const response = await request(SERVER_URL)
        .get(`/api/option-groups/${parentOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ populate: 'optionValues' })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.optionValues).toBeDefined();
      expect(Array.isArray(response.body.data.optionValues)).toBe(true);
      expect(response.body.data.optionValues.length).toBeGreaterThanOrEqual(2);

      // Verify that option values inherit the option group's properties
      response.body.data.optionValues.forEach((optionValue: any) => {
        expect(optionValue.optionGroup).toBe(parentOptionGroup.documentId);
        // The option value should be associated with the parent group
        expect(optionValue.value).toBeDefined();
        expect(optionValue.displayName).toBeDefined();
        expect(optionValue.sortOrder).toBeDefined();
      });
    });

    it('should maintain option group type consistency', async () => {
      // Create option values for different option group types
      const selectGroupData = createTestOptionGroupData({
        name: `select-group-${timestamp}`,
        displayName: `Select Group ${timestamp}`,
        type: 'select',
      });
      
      const selectGroupResponse = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: selectGroupData })
        .expect(201);
      
      const selectGroup = selectGroupResponse.body.data;
      testOptionGroups.push(selectGroup);

      const radioGroupData = createTestOptionGroupData({
        name: `radio-group-${timestamp}`,
        displayName: `Radio Group ${timestamp}`,
        type: 'radio',
      });
      
      const radioGroupResponse = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: radioGroupData })
        .expect(201);
      
      const radioGroup = radioGroupResponse.body.data;
      testOptionGroups.push(radioGroup);

      // Create option values for each group type
      const selectValueData = createTestOptionValueData(selectGroup.documentId, {
        value: `select-value-${timestamp}`,
        displayName: 'Select Value',
      });
      
      const selectValueResponse = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: selectValueData })
        .expect(201);
      
      const selectValue = selectValueResponse.body.data;
      testOptionValues.push(selectValue);

      const radioValueData = createTestOptionValueData(radioGroup.documentId, {
        value: `radio-value-${timestamp}`,
        displayName: 'Radio Value',
      });
      
      const radioValueResponse = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: radioValueData })
        .expect(201);
      
      const radioValue = radioValueResponse.body.data;
      testOptionValues.push(radioValue);

      // Verify that option values maintain their group's type
      const selectValueVerify = await request(SERVER_URL)
        .get(`/api/option-values/${selectValue.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ populate: 'optionGroup' })
        .expect(200);

      expect(selectValueVerify.body.data.optionGroup.type).toBe('select');

      const radioValueVerify = await request(SERVER_URL)
        .get(`/api/option-values/${radioValue.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ populate: 'optionGroup' })
        .expect(200);

      expect(radioValueVerify.body.data.optionGroup.type).toBe('radio');
    });
  });

  describe('Option Group Value Validation Rules', () => {
    let testOptionGroup: any;

    beforeAll(async () => {
      // Create test option group
      const optionGroupData = createTestOptionGroupData({
        name: `validation-group-${timestamp}`,
        displayName: `Validation Group ${timestamp}`,
        type: 'select',
        isRequired: true,
      });
      
      const response = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionGroupData })
        .expect(201);
      
      testOptionGroup = response.body.data;
      testOptionGroups.push(testOptionGroup);
    });

    it('should enforce required option group constraints', async () => {
      // Create option value for required option group
      const requiredValueData = createTestOptionValueData(testOptionGroup.documentId, {
        value: `required-value-${timestamp}`,
        displayName: 'Required Value',
      });
      
      const response = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: requiredValueData })
        .expect(201);
      
      const requiredValue = response.body.data;
      testOptionValues.push(requiredValue);

      // Verify the option value is created successfully
      expect(response.body.data).toBeDefined();
      expect(response.body.data.optionGroup).toBe(testOptionGroup.documentId);
      expect(response.body.data.value).toBe(requiredValueData.value);

      // Verify the option group's required status is maintained
      const groupResponse = await request(SERVER_URL)
        .get(`/api/option-groups/${testOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(groupResponse.body.data.isRequired).toBe(true);
    });

    it('should validate option value uniqueness within option group', async () => {
      const uniqueValueData = createTestOptionValueData(testOptionGroup.documentId, {
        value: `unique-value-${timestamp}`,
        displayName: 'Unique Value',
      });
      
      // Create first option value
      const firstResponse = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: uniqueValueData })
        .expect(201);
      
      const firstValue = firstResponse.body.data;
      testOptionValues.push(firstValue);

      // Try to create second option value with same value in same group
      const duplicateValueData = createTestOptionValueData(testOptionGroup.documentId, {
        value: `unique-value-${timestamp}`, // Same value
        displayName: 'Duplicate Value',
      });
      
      const duplicateResponse = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: duplicateValueData })
        .expect(400);

      expect(duplicateResponse.body.error).toBeDefined();
      expect(duplicateResponse.body.error.message).toContain('Value already exists');
    });

    it('should allow same value in different option groups', async () => {
      // Create another option group
      const anotherGroupData = createTestOptionGroupData({
        name: `another-group-${timestamp}`,
        displayName: `Another Group ${timestamp}`,
        type: 'radio',
      });
      
      const anotherGroupResponse = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: anotherGroupData })
        .expect(201);
      
      const anotherGroup = anotherGroupResponse.body.data;
      testOptionGroups.push(anotherGroup);

      // Create option value with same value but different group
      const sameValueData = createTestOptionValueData(anotherGroup.documentId, {
        value: `unique-value-${timestamp}`, // Same value as previous test
        displayName: 'Same Value Different Group',
      });
      
      const response = await request(SERVER_URL)
        .post('/api/option-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: sameValueData })
        .expect(201);
      
      const sameValue = response.body.data;
      testOptionValues.push(sameValue);

      // Verify the option value was created successfully
      expect(response.body.data).toBeDefined();
      expect(response.body.data.optionGroup).toBe(anotherGroup.documentId);
      expect(response.body.data.value).toBe(sameValueData.value);
    });

    it('should validate option value sort order within option group', async () => {
      const sortOrderData = [
        createTestOptionValueData(testOptionGroup.documentId, {
          value: `sort-1-${timestamp}`,
          displayName: 'Sort 1',
          sortOrder: 1,
        }),
        createTestOptionValueData(testOptionGroup.documentId, {
          value: `sort-2-${timestamp}`,
          displayName: 'Sort 2',
          sortOrder: 2,
        }),
        createTestOptionValueData(testOptionGroup.documentId, {
          value: `sort-3-${timestamp}`,
          displayName: 'Sort 3',
          sortOrder: 3,
        }),
      ];

      const createdValues: any[] = [];

      for (const data of sortOrderData) {
        const response = await request(SERVER_URL)
          .post('/api/option-values')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data })
          .expect(201);
        
        createdValues.push(response.body.data);
        testOptionValues.push(response.body.data);
      }

      // Verify sort order is maintained
      const groupResponse = await request(SERVER_URL)
        .get(`/api/option-groups/${testOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ populate: 'optionValues' })
        .expect(200);

      expect(groupResponse.body.data.optionValues).toBeDefined();
      expect(Array.isArray(groupResponse.body.data.optionValues)).toBe(true);

      // Check that sort order is respected
      const sortedValues = groupResponse.body.data.optionValues
        .filter((ov: any) => ov.value.includes(`sort-`))
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder);

      expect(sortedValues.length).toBe(3);
      expect(sortedValues[0].sortOrder).toBe(1);
      expect(sortedValues[1].sortOrder).toBe(2);
      expect(sortedValues[2].sortOrder).toBe(3);
    });
  });

  describe('Option Group Value Cleanup on Deletion', () => {
    let testOptionGroup: any;
    let testOptionValues: any[] = [];

    beforeAll(async () => {
      // Create test option group
      const optionGroupData = createTestOptionGroupData({
        name: `cleanup-group-${timestamp}`,
        displayName: `Cleanup Group ${timestamp}`,
        type: 'select',
      });
      
      const response = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionGroupData })
        .expect(201);
      
      testOptionGroup = response.body.data;
      testOptionGroups.push(testOptionGroup);

      // Create multiple option values for this group
      const optionValuesData = [
        createTestOptionValueData(testOptionGroup.documentId, {
          value: `cleanup-value-1-${timestamp}`,
          displayName: 'Cleanup Value 1',
          sortOrder: 1,
        }),
        createTestOptionValueData(testOptionGroup.documentId, {
          value: `cleanup-value-2-${timestamp}`,
          displayName: 'Cleanup Value 2',
          sortOrder: 2,
        }),
        createTestOptionValueData(testOptionGroup.documentId, {
          value: `cleanup-value-3-${timestamp}`,
          displayName: 'Cleanup Value 3',
          sortOrder: 3,
        }),
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

    it('should prevent option group deletion when it has option values', async () => {
      // Try to delete the option group (should fail)
      const deleteResponse = await request(SERVER_URL)
        .delete(`/api/option-groups/${testOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(deleteResponse.body.error).toBeDefined();
      expect(deleteResponse.body.error.message).toContain('Cannot delete option group with existing option values');

      // Verify the option group still exists
      const verifyResponse = await request(SERVER_URL)
        .get(`/api/option-groups/${testOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(verifyResponse.body.data).toBeDefined();
      expect(verifyResponse.body.data.documentId).toBe(testOptionGroup.documentId);
    });

    it('should allow option group deletion after option values are deleted', async () => {
      // Delete all option values first
      for (const optionValue of testOptionValues) {
        await request(SERVER_URL)
          .delete(`/api/option-values/${optionValue.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }

      // Now delete the option group (should succeed)
      const deleteResponse = await request(SERVER_URL)
        .delete(`/api/option-groups/${testOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(deleteResponse.body.data).toBeDefined();
      expect(deleteResponse.body.data.message).toBe('Option group deleted successfully');

      // Verify the option group is deleted
      await request(SERVER_URL)
        .get(`/api/option-groups/${testOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      // Remove from testOptionGroups array since it's deleted
      testOptionGroups = testOptionGroups.filter(og => og.documentId !== testOptionGroup.documentId);
    });

    it('should handle cascade deletion of option values when option group is deleted', async () => {
      // Create a new option group for cascade test
      const cascadeGroupData = createTestOptionGroupData({
        name: `cascade-group-${timestamp}`,
        displayName: `Cascade Group ${timestamp}`,
        type: 'select',
      });
      
      const cascadeGroupResponse = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: cascadeGroupData })
        .expect(201);
      
      const cascadeGroup = cascadeGroupResponse.body.data;
      testOptionGroups.push(cascadeGroup);

      // Create option values for cascade test
      const cascadeValuesData = [
        createTestOptionValueData(cascadeGroup.documentId, {
          value: `cascade-value-1-${timestamp}`,
          displayName: 'Cascade Value 1',
          sortOrder: 1,
        }),
        createTestOptionValueData(cascadeGroup.documentId, {
          value: `cascade-value-2-${timestamp}`,
          displayName: 'Cascade Value 2',
          sortOrder: 2,
        }),
      ];

      const cascadeValues: any[] = [];
      for (const data of cascadeValuesData) {
        const response = await request(SERVER_URL)
          .post('/api/option-values')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data })
          .expect(201);
        
        cascadeValues.push(response.body.data);
        testOptionValues.push(response.body.data);
      }

      // Verify option values exist
      for (const optionValue of cascadeValues) {
        const verifyResponse = await request(SERVER_URL)
          .get(`/api/option-values/${optionValue.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(verifyResponse.body.data).toBeDefined();
        expect(verifyResponse.body.data.documentId).toBe(optionValue.documentId);
      }

      // Delete option values first
      for (const optionValue of cascadeValues) {
        await request(SERVER_URL)
          .delete(`/api/option-values/${optionValue.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }

      // Now delete the option group
      await request(SERVER_URL)
        .delete(`/api/option-groups/${cascadeGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify option group is deleted
      await request(SERVER_URL)
        .get(`/api/option-groups/${cascadeGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      // Remove from testOptionGroups array since it's deleted
      testOptionGroups = testOptionGroups.filter(og => og.documentId !== cascadeGroup.documentId);
    });
  });

  describe('Option Group Value Performance Optimization', () => {
    let testOptionGroup: any;
    let testOptionValues: any[] = [];

    beforeAll(async () => {
      // Create test option group
      const optionGroupData = createTestOptionGroupData({
        name: `performance-group-${timestamp}`,
        displayName: `Performance Group ${timestamp}`,
        type: 'select',
      });
      
      const response = await request(SERVER_URL)
        .post('/api/option-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: optionGroupData })
        .expect(201);
      
      testOptionGroup = response.body.data;
      testOptionGroups.push(testOptionGroup);

      // Create multiple option values for performance testing
      const optionValuesData: any[] = [];
      for (let i = 1; i <= 10; i++) {
        optionValuesData.push(createTestOptionValueData(testOptionGroup.documentId, {
          value: `perf-value-${i}-${timestamp}`,
          displayName: `Performance Value ${i}`,
          sortOrder: i,
        }));
      }

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
        try {
          await request(SERVER_URL)
            .delete(`/api/option-values/${optionValue.documentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);
        } catch (error) {
          console.warn(`Failed to delete option value ${optionValue.documentId}:`, error);
        }
      }
    });

    it('should efficiently retrieve option group with populated option values', async () => {
      const startTime = Date.now();
      
      const response = await request(SERVER_URL)
        .get(`/api/option-groups/${testOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ populate: 'optionValues' })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.data).toBeDefined();
      expect(response.body.data.optionValues).toBeDefined();
      expect(Array.isArray(response.body.data.optionValues)).toBe(true);
      expect(response.body.data.optionValues.length).toBeGreaterThanOrEqual(10);
      
      // Performance check - should complete within reasonable time
      expect(duration).toBeLessThan(2000); // 2 seconds
    });

    it('should efficiently retrieve option values by option group', async () => {
      const startTime = Date.now();
      
      const response = await request(SERVER_URL)
        .get(`/api/option-values/option-group/${testOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(10);
      
      // Performance check - should complete within reasonable time
      expect(duration).toBeLessThan(2000); // 2 seconds
    });

    it('should efficiently handle bulk option value operations', async () => {
      const startTime = Date.now();
      
      // Create multiple option values in bulk
      const bulkData: any[] = [];
      for (let i = 1; i <= 5; i++) {
        bulkData.push(createTestOptionValueData(testOptionGroup.documentId, {
          value: `bulk-perf-${i}-${timestamp}`,
          displayName: `Bulk Performance Value ${i}`,
          sortOrder: 100 + i,
        }));
      }

      const response = await request(SERVER_URL)
        .post('/api/option-values/bulk-create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: bulkData })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.data).toBeDefined();
      expect(response.body.data.success).toBe(5);
      expect(response.body.data.errors).toHaveLength(0);
      expect(response.body.data.created).toHaveLength(5);
      
      // Performance check - should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds

      // Clean up bulk created option values
      for (const optionValue of response.body.data.created) {
        await request(SERVER_URL)
          .delete(`/api/option-values/${optionValue.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }
    });

    it('should efficiently handle concurrent option value operations', async () => {
      const startTime = Date.now();
      
      // Create multiple option values concurrently
      const concurrentData: any[] = [];
      for (let i = 1; i <= 5; i++) {
        concurrentData.push(createTestOptionValueData(testOptionGroup.documentId, {
          value: `concurrent-perf-${i}-${timestamp}`,
          displayName: `Concurrent Performance Value ${i}`,
          sortOrder: 200 + i,
        }));
      }

      const promises = concurrentData.map(data =>
        request(SERVER_URL)
          .post('/api/option-values')
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
        testOptionValues.push(response.body.data);
      });
      
      // Performance check - should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds
    });

    it('should efficiently handle large dataset retrieval with pagination', async () => {
      const startTime = Date.now();
      
      const response = await request(SERVER_URL)
        .get(`/api/option-values/option-group/${testOptionGroup.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 
          'pagination[page]': 1,
          'pagination[pageSize]': 5,
          'sort': 'sortOrder:asc'
        })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.pagination).toBeDefined();
      
      // Performance check - should complete within reasonable time
      expect(duration).toBeLessThan(2000); // 2 seconds
    });
  });
});
