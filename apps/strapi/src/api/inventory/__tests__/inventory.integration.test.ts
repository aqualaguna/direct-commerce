/**
 * Inventory Integration Tests
 * 
 * Comprehensive integration tests for Inventory Management modules that verify
 * inventory tracking, history, and stock reservation functionality in a real environment.
 */

import request from 'supertest';

describe('Inventory Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let adminToken: string;
  let testProductId: string;
  let testInventoryId: string;
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();
  const testProduct = {
    name: `Test Product ${timestamp}`,
    brand: `Test Brand ${timestamp}`,
    description: 'This is a test product for inventory integration testing',
    sku: `INV-TEST-${timestamp}`,
    status: 'active',
    inventory: 0
  };

  beforeAll(async () => {
    // Get admin token for authenticated requests
    adminToken = process.env.STRAPI_API_TOKEN as string;

    if (!adminToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }

    // Create a test product for inventory operations
    const productResponse = await request(SERVER_URL)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: testProduct })
      .timeout(10000);
    
    expect([200, 201]).toContain(productResponse.status);
    testProductId = productResponse.body.data.documentId;
  });

  afterAll(async () => {
    // Global cleanup - delete test inventory and product
    try {
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
    it('should be able to connect to the inventory API', async () => {
      const response = await request(SERVER_URL)
        .get('/api/inventories')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require authentication for protected endpoints', async () => {
      const response = await request(SERVER_URL)
        .post('/api/inventories')
        .send({ data: { product: testProductId, quantity: 100 } })
        .timeout(10000);

      expect(response.status).toBe(403);
    });

    it('should handle invalid inventory ID gracefully', async () => {
      const response = await request(SERVER_URL)
        .get('/api/inventories/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(404);
    });
  });

  describe('Inventory CRUD Operations', () => {
    it('should initialize inventory for a product', async () => {
      const inventoryData = {
        productId: testProductId,
        initialQuantity: 100
      };

      const response = await request(SERVER_URL)
        .post('/api/inventories/initialize')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(inventoryData)
        .timeout(10000);

      expect([200, 201]).toContain(response.status);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.product.documentId).toBe(testProductId);
      expect(response.body.data.quantity).toBe(100);
      expect(response.body.data.available).toBe(100);
      expect(response.body.data.reserved).toBe(0);
      expect(response.body.data.isLowStock).toBe(false);
      
      testInventoryId = response.body.data.documentId;
    });

    it('should retrieve inventory by product ID', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventories/product/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.product.documentId).toBe(testProductId);
      expect(response.body.data.quantity).toBe(100);
    });

    it('should retrieve inventory by document ID', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventories/${testInventoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBe(testInventoryId);
      expect(response.body.data.product).toBeDefined();
      expect(response.body.data.product.documentId).toBe(testProductId);
    });

    it('should list all inventories with product information', async () => {
      const response = await request(SERVER_URL)
        .get('/api/inventories')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Find our test inventory in the list
      const testInventory = response.body.data.find((inv: any) => 
        inv.documentId === testInventoryId
      );
      expect(testInventory).toBeDefined();
      expect(testInventory.product).toBeDefined();
    });

    it('should update inventory quantity', async () => {
      const updateData = {
        quantityChange: 50,
        reason: 'Stock replenishment',
        source: 'manual'
      };

      const response = await request(SERVER_URL)
        .post(`/api/inventories/${testInventoryId}/update-quantity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.quantity).toBe(150); // 100 + 50
      expect(response.body.data.available).toBe(150);
    });

    it('should handle negative quantity changes', async () => {
      const updateData = {
        quantityChange: -30,
        reason: 'Stock adjustment',
        source: 'adjustment'
      };

      const response = await request(SERVER_URL)
        .post(`/api/inventories/${testInventoryId}/update-quantity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data.quantity).toBe(120); // 150 - 30
      expect(response.body.data.available).toBe(120);
    });

    it('should prevent negative inventory without allowNegative flag', async () => {
      const updateData = {
        quantityChange: -200, // More than current quantity (120)
        reason: 'Invalid reduction',
        source: 'manual'
      };

      const response = await request(SERVER_URL)
        .post(`/api/inventories/${testInventoryId}/update-quantity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .timeout(10000);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should allow negative inventory with allowNegative flag', async () => {
      const updateData = {
        quantityChange: -200,
        reason: 'Emergency stock reduction',
        source: 'adjustment',
        allowNegative: true
      };

      const response = await request(SERVER_URL)
        .post(`/api/inventories/${testInventoryId}/update-quantity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data.quantity).toBe(-80); // 120 - 200
      expect(response.body.data.available).toBe(0); // Available should not go negative
    });
  });

  describe('Inventory Validation and Constraints', () => {
    it('should reject inventory initialization for non-existent product', async () => {
      const inventoryData = {
        productId: 'non-existent-product-id',
        initialQuantity: 100
      };

      const response = await request(SERVER_URL)
        .post('/api/inventories/initialize')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(inventoryData)
        .timeout(10000);

      expect(response.status).toBe(404);
    });

    it('should reject duplicate inventory initialization', async () => {
      const inventoryData = {
        productId: testProductId,
        initialQuantity: 50
      };

      const response = await request(SERVER_URL)
        .post('/api/inventories/initialize')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(inventoryData)
        .timeout(10000);

      expect(response.status).toBe(409); // Conflict
    });

    it('should reject invalid quantity change', async () => {
      const updateData = {
        quantityChange: 'invalid', // Should be a number
        reason: 'Invalid change',
        source: 'manual'
      };

      const response = await request(SERVER_URL)
        .post(`/api/inventories/${testInventoryId}/update-quantity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .timeout(10000);

      expect(response.status).toBe(400);
    });

    it('should reject update without required fields', async () => {
      const updateData = {
        // Missing quantityChange and reason
        source: 'manual'
      };

      const response = await request(SERVER_URL)
        .post(`/api/inventories/${testInventoryId}/update-quantity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .timeout(10000);

      expect(response.status).toBe(400);
    });
  });

  describe('Stock Reservation Operations', () => {
    let reservationId: string;

    it('should reserve stock for an order', async () => {
      const reservationData = {
        productId: testProductId,
        quantity: 20,
        orderId: `ORDER-${timestamp}`,
        customerId: 'test-customer',
        expirationMinutes: 30
      };

      const response = await request(SERVER_URL)
        .post('/api/inventories/reserve-stock')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(reservationData)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.product.documentId).toBe(testProductId);
      expect(response.body.data.quantity).toBe(20);
      expect(response.body.data.orderId).toBe(reservationData.orderId);
      expect(response.body.data.status).toBe('active');
      
      reservationId = response.body.data.documentId;
    });

    it('should update inventory after stock reservation', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventories/${testInventoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data.reserved).toBe(20);
      expect(response.body.data.available).toBe(100); // -80 (current) + 20 (reserved) = 100 available
    });

    it('should reject reservation for insufficient stock', async () => {
      const reservationData = {
        productId: testProductId,
        quantity: 200, // More than available
        orderId: `ORDER-INSUFFICIENT-${timestamp}`,
        customerId: 'test-customer'
      };

      const response = await request(SERVER_URL)
        .post('/api/inventories/reserve-stock')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(reservationData)
        .timeout(10000);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should release stock reservation', async () => {
      const releaseData = {
        reason: 'Order cancelled'
      };

      const response = await request(SERVER_URL)
        .post(`/api/inventories/release-reservation/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(releaseData)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.status).toBe('completed');
    });

    it('should update inventory after reservation release', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventories/${testInventoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data.reserved).toBe(0);
      expect(response.body.data.available).toBe(100); // Should be back to original available amount
    });
  });

  describe('Low Stock Management', () => {
    it('should detect low stock condition', async () => {
      // Set low stock threshold to 50
      const updateData = {
        quantityChange: -70, // Reduce to 30 (below threshold of 50)
        reason: 'Stock reduction for low stock test',
        source: 'adjustment'
      };

      const response = await request(SERVER_URL)
        .post(`/api/inventories/${testInventoryId}/update-quantity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data.quantity).toBe(30);
      expect(response.body.data.isLowStock).toBe(true);
    });

    it('should get low stock products', async () => {
      const response = await request(SERVER_URL)
        .get('/api/inventories/low-stock')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Find our test inventory in low stock list
      const lowStockInventory = response.body.data.find((inv: any) => 
        inv.documentId === testInventoryId
      );
      expect(lowStockInventory).toBeDefined();
      expect(lowStockInventory.isLowStock).toBe(true);
    });

    it('should bulk update low stock thresholds', async () => {
      const bulkUpdateData = {
        updates: [
          {
            inventoryId: testInventoryId,
            lowStockThreshold: 20
          }
        ]
      };

      const response = await request(SERVER_URL)
        .post('/api/inventories/update-low-stock-thresholds')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkUpdateData)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data[0].status).toBe('success');
      expect(response.body.meta.successful).toBe(1);
    });

    it('should update low stock status after threshold change', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventories/${testInventoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data.lowStockThreshold).toBe(20);
      expect(response.body.data.isLowStock).toBe(false); // 30 > 20, so not low stock anymore
    });
  });

  describe('Inventory History and Analytics', () => {
    it('should get inventory history for a product', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventories/history/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Verify history record structure
      const historyRecord = response.body.data[0];
      expect(historyRecord.product).toBeDefined();
      expect(historyRecord.action).toBeDefined();
      expect(historyRecord.quantityBefore).toBeDefined();
      expect(historyRecord.quantityAfter).toBeDefined();
      expect(historyRecord.reason).toBeDefined();
      expect(historyRecord.timestamp).toBeDefined();
    });

    it('should filter inventory history by action', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventories/history/${testProductId}?action=decrease`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All records should be decrease actions
      response.body.data.forEach((record: any) => {
        expect(record.action).toBe('decrease');
      });
    });

    it('should get inventory analytics', async () => {
      const response = await request(SERVER_URL)
        .get('/api/inventories/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalProducts).toBeDefined();
      expect(response.body.data.lowStockCount).toBeDefined();
      expect(response.body.data.outOfStockCount).toBeDefined();
      expect(response.body.data.totalQuantity).toBeDefined();
      expect(response.body.data.totalReserved).toBeDefined();
      expect(response.body.data.totalAvailable).toBeDefined();
      expect(response.body.data.lowStockPercentage).toBeDefined();
      expect(response.body.data.outOfStockPercentage).toBeDefined();
    });

    it('should get inventory analytics with category filter', async () => {
      const response = await request(SERVER_URL)
        .get('/api/inventories/analytics?categoryId=non-existent-category')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalProducts).toBe(0);
      expect(response.body.data.lowStockCount).toBe(0);
      expect(response.body.data.outOfStockCount).toBe(0);
    });
  });

  describe('Inventory Bulk Operations', () => {
    it('should handle bulk threshold updates with mixed results', async () => {
      const bulkUpdateData = {
        updates: [
          {
            inventoryId: testInventoryId,
            lowStockThreshold: 25
          },
          {
            inventoryId: 'non-existent-inventory',
            lowStockThreshold: 10
          }
        ]
      };

      const response = await request(SERVER_URL)
        .post('/api/inventories/update-low-stock-thresholds')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkUpdateData)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(2);
      expect(response.body.meta.total).toBe(2);
      expect(response.body.meta.successful).toBe(1);
      expect(response.body.meta.failed).toBe(1);
      
      // Check success case
      const successResult = response.body.data.find((r: any) => r.status === 'success');
      expect(successResult).toBeDefined();
      expect(successResult.inventoryId).toBe(testInventoryId);
      
      // Check failure case
      const failureResult = response.body.data.find((r: any) => r.status === 'error');
      expect(failureResult).toBeDefined();
      expect(failureResult.inventoryId).toBe('non-existent-inventory');
    });

    it('should reject invalid bulk update data', async () => {
      const invalidBulkData = {
        updates: 'not-an-array'
      };

      const response = await request(SERVER_URL)
        .post('/api/inventories/update-low-stock-thresholds')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidBulkData)
        .timeout(10000);

      expect(response.status).toBe(400);
    });
  });

  describe('Inventory Performance Optimization', () => {
    it('should handle large inventory queries efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(SERVER_URL)
        .get('/api/inventories?page=1&pageSize=100')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent inventory updates', async () => {
      const updatePromises: Promise<any>[] = [];
      
      // Create multiple concurrent update requests
      for (let i = 0; i < 5; i++) {
        const updateData = {
          quantityChange: 1,
          reason: `Concurrent update ${i}`,
          source: 'system'
        };
        
        updatePromises.push(
          request(SERVER_URL)
            .post(`/api/inventories/${testInventoryId}/update-quantity`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(updateData)
            .timeout(10000)
        );
      }

      const responses = await Promise.all(updatePromises);
      
      // All requests should succeed
      responses.forEach((response: any) => {
        expect(response.status).toBe(200);
      });

      // Verify final quantity (should be 30 + 5 = 35)
      const finalResponse = await request(SERVER_URL)
        .get(`/api/inventories/${testInventoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(finalResponse.status).toBe(200);
      expect(finalResponse.body.data.quantity).toBe(35);
    });
  });

  describe('Database Record Verification', () => {
    it('should verify inventory record exists in database', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventories/${testInventoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBe(testInventoryId);
      expect(response.body.data.product).toBeDefined();
      expect(response.body.data.quantity).toBeDefined();
      expect(response.body.data.reserved).toBeDefined();
      expect(response.body.data.available).toBeDefined();
      expect(response.body.data.lowStockThreshold).toBeDefined();
      expect(response.body.data.isLowStock).toBeDefined();
      expect(response.body.data.lastUpdated).toBeDefined();
    });

    it('should verify inventory history records are created', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/inventories/history/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Verify each history record has required fields
      response.body.data.forEach((record: any) => {
        expect(record.documentId).toBeDefined();
        expect(record.product).toBeDefined();
        expect(record.action).toBeDefined();
        expect(record.quantityBefore).toBeDefined();
        expect(record.quantityAfter).toBeDefined();
        expect(record.quantityChanged).toBeDefined();
        expect(record.reason).toBeDefined();
        expect(record.timestamp).toBeDefined();
      });
    });

    it('should verify product inventory field is updated', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.inventory).toBe(35); // Should match current inventory quantity
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent inventory ID in updates', async () => {
      const updateData = {
        quantityChange: 10,
        reason: 'Test update',
        source: 'manual'
      };

      const response = await request(SERVER_URL)
        .post('/api/inventories/non-existent-id/update-quantity')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .timeout(10000);

      expect(response.status).toBe(404);
    });

    it('should handle malformed request data', async () => {
      const response = await request(SERVER_URL)
        .post('/api/inventories/initialize')
        .set('Authorization', `Bearer ${adminToken}`)
        .send('invalid-json')
        .timeout(10000);

      expect(response.status).toBe(400);
    });

    it('should handle server errors gracefully', async () => {
      // Test with invalid product ID format
      const response = await request(SERVER_URL)
        .get('/api/inventories/product/invalid-format')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(404);
    });
  });
});
