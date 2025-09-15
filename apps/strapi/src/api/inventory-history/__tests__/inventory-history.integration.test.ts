/**
 * Inventory History Integration Tests
 * 
 * Comprehensive integration tests for Inventory History modules that verify
 * inventory history tracking, audit trails, analytics, and data management
 * functionality in a real environment.
 */

import request from 'supertest';

describe('Inventory History Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let adminToken: string;
  let testProductId: string;
  let testInventoryId: string;
  let testHistoryRecords: string[] = [];
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();
  const testProduct = {
    name: `Test Product ${timestamp}`,
    brand: `Test Brand ${timestamp}`,
    description: 'This is a test product for inventory history integration testing',
    sku: `HIST-TEST-${timestamp}`,
    status: 'active',
    inventory: 0
  };

  beforeAll(async () => {
    // Get admin token for authenticated requests
    adminToken = process.env.STRAPI_API_TOKEN as string;

    if (!adminToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }

    // Create a test product for inventory history operations
    const productResponse = await request(SERVER_URL)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: testProduct })
      .timeout(10000);
    
    expect([200, 201]).toContain(productResponse.status);
    testProductId = productResponse.body.data.documentId;

    // Initialize inventory to create initial history record
    const inventoryResponse = await request(SERVER_URL)
      .post('/api/inventories/initialize')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ productId: testProductId, initialQuantity: 100 })
      .timeout(10000);
    
    expect([200, 201]).toContain(inventoryResponse.status);
    testInventoryId = inventoryResponse.body.data.documentId;
  });

  afterAll(async () => {
    // Global cleanup - delete test inventory history, inventory, and product
    try {
      // Clean up history records
      for (const historyId of testHistoryRecords) {
        try {
          await request(SERVER_URL)
            .delete(`/api/inventory-histories/${historyId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .timeout(10000);
        } catch (error) {
          console.warn(`Failed to delete history record ${historyId}:`, error);
        }
      }
      
      if (testInventoryId) {
        await request(SERVER_URL)
          .delete(`/api/inventories/${testInventoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
      }
      
      if (testProductId) {
        await request(SERVER_URL)
          .delete(`/api/products/${testProductId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
      }
    } catch (error) {
      console.warn('Failed to perform global cleanup:', error);
    }
  });

  describe('API Health Check', () => {
    it('should be able to connect to the inventory history API', async () => {
      const response = await request(SERVER_URL)
        .get('/api/inventory-histories')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require authentication for protected endpoints', async () => {
      const response = await request(SERVER_URL)
        .post('/api/inventory-histories')
        .send({ data: { product: testProductId, action: 'increase' } })
        .timeout(10000);

      expect(response.status).toBe(403);
    });

    it('should handle invalid history ID gracefully', async () => {
      const response = await request(SERVER_URL)
        .get('/api/inventory-histories/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(404);
    });
  });

  describe('Inventory History Creation and Recording', () => {
    it('should create inventory history record for quantity increase', async () => {
      // First, perform an inventory operation that creates history
      const updateData = {
        quantityChange: 50,
        reason: 'Stock replenishment',
        source: 'manual'
      };

      const inventoryResponse = await request(SERVER_URL)
        .post(`/api/inventories/${testInventoryId}/update-quantity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .timeout(10000);

      expect(inventoryResponse.status).toBe(200);

      // Verify history record was created
      const historyResponse = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.data).toBeDefined();
      expect(Array.isArray(historyResponse.body.data)).toBe(true);
      expect(historyResponse.body.data.length).toBeGreaterThan(0);

      // Find the increase action record
      const increaseRecord = historyResponse.body.data.find((record: any) => 
        record.action === 'increase' && record.quantityChanged === 50
      );
      expect(increaseRecord).toBeDefined();
      expect(increaseRecord.quantityBefore).toBe(100);
      expect(increaseRecord.quantityAfter).toBe(150);
      expect(increaseRecord.reason).toBe('Stock replenishment');
      expect(increaseRecord.source).toBe('manual');
      expect(increaseRecord.timestamp).toBeDefined();

      if (increaseRecord) {
        testHistoryRecords.push(increaseRecord.documentId);
      }
    });

    it('should create inventory history record for quantity decrease', async () => {
      const updateData = {
        quantityChange: -25,
        reason: 'Stock adjustment',
        source: 'adjustment'
      };

      const inventoryResponse = await request(SERVER_URL)
        .post(`/api/inventories/${testInventoryId}/update-quantity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .timeout(10000);

      expect(inventoryResponse.status).toBe(200);

      // Verify history record was created
      const historyResponse = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(historyResponse.status).toBe(200);
      
      const decreaseRecord = historyResponse.body.data.find((record: any) => 
        record.action === 'decrease' && record.quantityChanged === -25
      );
      expect(decreaseRecord).toBeDefined();
      expect(decreaseRecord.quantityBefore).toBe(150);
      expect(decreaseRecord.quantityAfter).toBe(125);
      expect(decreaseRecord.reason).toBe('Stock adjustment');
      expect(decreaseRecord.source).toBe('adjustment');

      if (decreaseRecord) {
        testHistoryRecords.push(decreaseRecord.documentId);
      }
    });

    it('should create inventory history record for stock reservation', async () => {
      const reservationData = {
        productId: testProductId,
        quantity: 10,
        orderId: `ORDER-${timestamp}`,
        customerId: 'test-customer',
        expirationMinutes: 30
      };

      const reservationResponse = await request(SERVER_URL)
        .post('/api/inventories/reserve-stock')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(reservationData)
        .timeout(10000);

      expect(reservationResponse.status).toBe(200);

      // Verify history record was created for reservation
      const historyResponse = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(historyResponse.status).toBe(200);
      
      const reserveRecord = historyResponse.body.data.find((record: any) => 
        record.action === 'reserve' && record.quantityChanged === 0
      );
      expect(reserveRecord).toBeDefined();
      expect(reserveRecord.reservedBefore).toBe(0);
      expect(reserveRecord.reservedAfter).toBe(10);
      expect(reserveRecord.orderId).toBe(reservationData.orderId);

      if (reserveRecord) {
        testHistoryRecords.push(reserveRecord.documentId);
      }
    });

    it('should create inventory history record for reservation release', async () => {
      // First get the reservation ID from the previous test
      const reservationResponse = await request(SERVER_URL)
        .get('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(reservationResponse.status).toBe(200);
      const reservation = reservationResponse.body.data.find((r: any) => 
        r.product.documentId === testProductId && r.status === 'active'
      );
      expect(reservation).toBeDefined();

      // Release the reservation
      const releaseResponse = await request(SERVER_URL)
        .post(`/api/inventories/release-reservation/${reservation.documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Order cancelled' })
        .timeout(10000);

      expect(releaseResponse.status).toBe(200);

      // Verify history record was created for release
      const historyResponse = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(historyResponse.status).toBe(200);
      
      const releaseRecord = historyResponse.body.data.find((record: any) => 
        record.action === 'release' && record.quantityChanged === 0
      );
      expect(releaseRecord).toBeDefined();
      expect(releaseRecord.reservedBefore).toBe(10);
      expect(releaseRecord.reservedAfter).toBe(0);
      expect(releaseRecord.reason).toBe('Order cancelled');

      if (releaseRecord) {
        testHistoryRecords.push(releaseRecord.documentId);
      }
    });

    it('should create inventory history record with metadata', async () => {
      const updateData = {
        quantityChange: 15,
        reason: 'Bulk import',
        source: 'system',
        orderId: `BULK-${timestamp}`
      };

      const inventoryResponse = await request(SERVER_URL)
        .post(`/api/inventories/${testInventoryId}/update-quantity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .timeout(10000);

      expect(inventoryResponse.status).toBe(200);

      // Verify history record was created with metadata
      const historyResponse = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(historyResponse.status).toBe(200);
      
      const metadataRecord = historyResponse.body.data.find((record: any) => 
        record.action === 'increase' && record.quantityChanged === 15
      );
      expect(metadataRecord).toBeDefined();
      expect(metadataRecord.source).toBe('system');
      expect(metadataRecord.orderId).toBe(updateData.orderId);

      if (metadataRecord) {
        testHistoryRecords.push(metadataRecord.documentId);
      }
    });
  });

  describe('Inventory History Retrieval and Filtering', () => {
    it('should retrieve all inventory history for a product', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify each record has required fields
      response.body.data.forEach((record: any) => {
        expect(record.documentId).toBeDefined();
        expect(record.product).toBeDefined();
        expect(record.action).toBeDefined();
        expect(record.quantityBefore).toBeDefined();
        expect(record.quantityAfter).toBeDefined();
        expect(record.quantityChanged).toBeDefined();
        expect(record.reason).toBeDefined();
        expect(record.source).toBeDefined();
        expect(record.timestamp).toBeDefined();
      });
    });

    it('should filter inventory history by action type', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}&filters[action][$eq]=increase`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All records should be increase actions
      response.body.data.forEach((record: any) => {
        expect(record.action).toBe('increase');
      });
    });

    it('should filter inventory history by source', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}&filters[source][$eq]=manual`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All records should be manual source
      response.body.data.forEach((record: any) => {
        expect(record.source).toBe('manual');
      });
    });

    it('should filter inventory history by date range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      const response = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}&filters[timestamp][$gte]=${oneHourAgo.toISOString()}&filters[timestamp][$lte]=${oneHourFromNow.toISOString()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All records should be within the date range
      response.body.data.forEach((record: any) => {
        const recordDate = new Date(record.timestamp);
        expect(recordDate.getTime()).toBeGreaterThanOrEqual(oneHourAgo.getTime());
        expect(recordDate.getTime()).toBeLessThanOrEqual(oneHourFromNow.getTime());
      });
    });

    it('should filter inventory history by order ID', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}&filters[orderId][$eq]=BULK-${timestamp}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All records should have the specified order ID
      response.body.data.forEach((record: any) => {
        expect(record.orderId).toBe(`BULK-${timestamp}`);
      });
    });

    it('should sort inventory history by timestamp', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}&sort=timestamp:desc`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(1);
      
      // Verify records are sorted by timestamp descending
      for (let i = 0; i < response.body.data.length - 1; i++) {
        const current = new Date(response.body.data[i].timestamp);
        const next = new Date(response.body.data[i + 1].timestamp);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    it('should paginate inventory history results', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}&pagination[page]=1&pagination[pageSize]=2`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta.pagination).toBeDefined();
      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.pageSize).toBe(2);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Inventory History Analytics and Reporting', () => {
    it('should get inventory history summary statistics', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Calculate summary statistics
      const records = response.body.data;
      const totalRecords = records.length;
      const increaseRecords = records.filter((r: any) => r.action === 'increase');
      const decreaseRecords = records.filter((r: any) => r.action === 'decrease');
      const reserveRecords = records.filter((r: any) => r.action === 'reserve');
      const releaseRecords = records.filter((r: any) => r.action === 'release');

      expect(totalRecords).toBeGreaterThan(0);
      expect(increaseRecords.length).toBeGreaterThan(0);
      expect(decreaseRecords.length).toBeGreaterThan(0);
      expect(reserveRecords.length).toBeGreaterThan(0);
      expect(releaseRecords.length).toBeGreaterThan(0);
    });

    it('should analyze inventory movement patterns', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();

      const records = response.body.data;
      
      // Analyze quantity changes
      const totalIncrease = records
        .filter((r: any) => r.action === 'increase')
        .reduce((sum: number, r: any) => sum + r.quantityChanged, 0);
      
      const totalDecrease = records
        .filter((r: any) => r.action === 'decrease')
        .reduce((sum: number, r: any) => sum + Math.abs(r.quantityChanged), 0);

      expect(totalIncrease).toBeGreaterThan(0);
      expect(totalDecrease).toBeGreaterThan(0);
    });

    it('should track inventory changes by source', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();

      const records = response.body.data;
      const sources = [...new Set(records.map((r: any) => r.source))];
      
      expect(sources).toContain('manual');
      expect(sources).toContain('adjustment');
      expect(sources).toContain('system');
      expect(sources).toContain('order');
    });

    it('should identify high-frequency inventory changes', async () => {
      // Create multiple rapid inventory changes
      const rapidChanges: any[] = [];
      for (let i = 0; i < 5; i++) {
        const updateData = {
          quantityChange: 1,
          reason: `Rapid change ${i}`,
          source: 'system'
        };

        const response = await request(SERVER_URL)
          .post(`/api/inventories/${testInventoryId}/update-quantity`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .timeout(10000);

        expect(response.status).toBe(200);
        rapidChanges.push(response.body.data);
      }

      // Analyze the rapid changes
      const historyResponse = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}&filters[source][$eq]=system`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.data).toBeDefined();

      const systemRecords = historyResponse.body.data;
      expect(systemRecords.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Inventory History Data Retention', () => {
    it('should maintain data integrity over time', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();

      const records = response.body.data;
      
      // Verify data integrity
      records.forEach((record: any) => {
        // Quantity after should equal quantity before + quantity changed
        expect(record.quantityAfter).toBe(record.quantityBefore + record.quantityChanged);
        
        // Reserved values should be non-negative
        expect(record.reservedBefore).toBeGreaterThanOrEqual(0);
        expect(record.reservedAfter).toBeGreaterThanOrEqual(0);
        
        // Timestamp should be valid
        expect(new Date(record.timestamp).getTime()).toBeGreaterThan(0);
      });
    });

    it('should preserve audit trail completeness', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();

      const records = response.body.data;
      
      // Verify audit trail completeness
      records.forEach((record: any) => {
        expect(record.product).toBeDefined();
        expect(record.action).toBeDefined();
        expect(record.reason).toBeDefined();
        expect(record.source).toBeDefined();
        expect(record.timestamp).toBeDefined();
        expect(record.changedBy).toBeDefined();
      });
    });

    it('should handle large volume of history records', async () => {
      // Create multiple history records to test volume handling
      const volumePromises: Promise<any>[] = [];
      for (let i = 0; i < 10; i++) {
        const updateData = {
          quantityChange: 1,
          reason: `Volume test ${i}`,
          source: 'system'
        };
        
        volumePromises.push(
          request(SERVER_URL)
            .post(`/api/inventories/${testInventoryId}/update-quantity`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(updateData)
            .timeout(10000)
        );
      }

      const responses = await Promise.all(volumePromises);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify all records were created
      const historyResponse = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.data.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Inventory History Cleanup and Archiving', () => {
    it('should support selective history record deletion', async () => {
      // Get a specific history record
      const historyResponse = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}&pagination[pageSize]=1`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.data.length).toBeGreaterThan(0);

      const recordToDelete = historyResponse.body.data[0];
      const recordId = recordToDelete.documentId;

      // Delete the record
      const deleteResponse = await request(SERVER_URL)
        .delete(`/api/inventory-histories/${recordId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(deleteResponse.status).toBe(200);

      // Verify record is deleted
      const verifyResponse = await request(SERVER_URL)
        .get(`/api/inventory-histories/${recordId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(verifyResponse.status).toBe(404);
    });

    it('should handle bulk history record operations', async () => {
      // Get multiple history records
      const historyResponse = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}&pagination[pageSize]=5`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.data.length).toBeGreaterThan(0);

      const records = historyResponse.body.data;
      
      // Test bulk operations by deleting multiple records
      const deletePromises = records.slice(0, 2).map((record: any) =>
        request(SERVER_URL)
          .delete(`/api/inventory-histories/${record.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000)
      );

      const deleteResponses = await Promise.all(deletePromises);
      deleteResponses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should maintain referential integrity during cleanup', async () => {
      // Verify that deleting history records doesn't affect inventory records
      const inventoryResponse = await request(SERVER_URL)
        .get(`/api/inventories/${testInventoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(inventoryResponse.status).toBe(200);
      expect(inventoryResponse.body.data).toBeDefined();
      expect(inventoryResponse.body.data.product).toBeDefined();
      expect(inventoryResponse.body.data.product.documentId).toBe(testProductId);
    });
  });

  describe('Inventory History Performance Optimization', () => {
    it('should handle large history queries efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}&pagination[pageSize]=100`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent history record creation', async () => {
      const concurrentPromises: Promise<any>[] = [];
      
      // Create multiple concurrent history records
      for (let i = 0; i < 5; i++) {
        const updateData = {
          quantityChange: 1,
          reason: `Concurrent history test ${i}`,
          source: 'system'
        };
        
        concurrentPromises.push(
          request(SERVER_URL)
            .post(`/api/inventories/${testInventoryId}/update-quantity`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(updateData)
            .timeout(10000)
        );
      }

      const responses = await Promise.all(concurrentPromises);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify all history records were created
      const historyResponse = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.data.length).toBeGreaterThanOrEqual(5);
    });

    it('should optimize history queries with proper indexing', async () => {
      // Test various query patterns that should benefit from indexing
      const queryPatterns = [
        `filters[product][documentId][$eq]=${testProductId}`,
        `filters[action][$eq]=increase`,
        `filters[source][$eq]=manual`,
        `filters[timestamp][$gte]=${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`
      ];

      for (const pattern of queryPatterns) {
        const startTime = Date.now();
        
        const response = await request(SERVER_URL)
          .get(`/api/inventory-histories?${pattern}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);

        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(response.status).toBe(200);
        expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      }
    });

    it('should handle pagination efficiently for large datasets', async () => {
      const pageSizes = [10, 25, 50, 100];
      
      for (const pageSize of pageSizes) {
        const startTime = Date.now();
        
        const response = await request(SERVER_URL)
          .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}&pagination[pageSize]=${pageSize}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);

        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeLessThanOrEqual(pageSize);
        expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      }
    });
  });

  describe('Database Record Verification', () => {
    it('should verify inventory history records exist in database', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Verify each record has required database fields
      response.body.data.forEach((record: any) => {
        expect(record.documentId).toBeDefined();
        expect(record.product).toBeDefined();
        expect(record.action).toBeDefined();
        expect(record.quantityBefore).toBeDefined();
        expect(record.quantityAfter).toBeDefined();
        expect(record.quantityChanged).toBeDefined();
        expect(record.reservedBefore).toBeDefined();
        expect(record.reservedAfter).toBeDefined();
        expect(record.reason).toBeDefined();
        expect(record.source).toBeDefined();
        expect(record.timestamp).toBeDefined();
        expect(record.changedBy).toBeDefined();
      });
    });

    it('should verify history record relationships are maintained', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}&populate=product`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      
      // Verify product relationships
      response.body.data.forEach((record: any) => {
        expect(record.product).toBeDefined();
        expect(record.product.documentId).toBe(testProductId);
        expect(record.product.name).toBeDefined();
        expect(record.product.sku).toBeDefined();
      });
    });

    it('should verify history record data consistency', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      
      // Verify data consistency
      response.body.data.forEach((record: any) => {
        // Quantity calculations should be consistent
        expect(record.quantityAfter).toBe(record.quantityBefore + record.quantityChanged);
        
        // Reserved values should be non-negative
        expect(record.reservedBefore).toBeGreaterThanOrEqual(0);
        expect(record.reservedAfter).toBeGreaterThanOrEqual(0);
        
        // Action should be valid enum value
        const validActions = ['increase', 'decrease', 'reserve', 'release', 'adjust', 'initialize'];
        expect(validActions).toContain(record.action);
        
        // Source should be valid enum value
        const validSources = ['manual', 'order', 'return', 'adjustment', 'system'];
        expect(validSources).toContain(record.source);
        
        // Timestamp should be valid date
        expect(new Date(record.timestamp).getTime()).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent product in history queries', async () => {
      const response = await request(SERVER_URL)
        .get('/api/inventory-histories?filters[product][documentId][$eq]=non-existent-product')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });

    it('should handle invalid date range filters', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}&filters[timestamp][$gte]=invalid-date`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(400);
    });

    it('should handle malformed query parameters', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[invalid][field]=value`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should handle large page size requests gracefully', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventory-histories?filters[product][documentId][$eq]=${testProductId}&pagination[pageSize]=10000`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
