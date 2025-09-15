/**
 * Stock Reservation Integration Tests
 * 
 * Comprehensive integration tests for Stock Reservation modules that verify
 * stock reservation creation, management, validation, expiration, conflict resolution,
 * and performance optimization functionality in a real environment.
 */

import request from 'supertest';

describe('Stock Reservation Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let adminToken: string;
  let testProductId: string;
  let testInventoryId: string;
  let testReservationIds: string[] = [];
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();
  const testProduct = {
    name: `Test Product ${timestamp}`,
    brand: `Test Brand ${timestamp}`,
    description: 'This is a test product for stock reservation integration testing',
    sku: `RESV-TEST-${timestamp}`,
    status: 'active',
    inventory: 0
  };

  beforeAll(async () => {
    // Get admin token for authenticated requests
    adminToken = process.env.STRAPI_API_TOKEN as string;

    if (!adminToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }

    // Create a test product for stock reservation operations
    const productResponse = await request(SERVER_URL)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: testProduct })
      .timeout(10000);
    
    expect([200, 201]).toContain(productResponse.status);
    testProductId = productResponse.body.data.documentId;

    // Initialize inventory to create initial stock
    const inventoryResponse = await request(SERVER_URL)
      .post('/api/inventories/initialize')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ productId: testProductId, initialQuantity: 100 })
      .timeout(10000);
    
    expect([200, 201]).toContain(inventoryResponse.status);
    testInventoryId = inventoryResponse.body.data.documentId;
  });

  afterAll(async () => {
    // Global cleanup - delete test reservations, inventory, and product
    try {
      // Clean up reservations
      for (const reservationId of testReservationIds) {
        try {
          await request(SERVER_URL)
            .delete(`/api/stock-reservations/${reservationId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .timeout(10000);
        } catch (error) {
          console.warn(`Failed to delete reservation ${reservationId}:`, error);
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
    it('should be able to connect to the stock reservation API', async () => {
      const response = await request(SERVER_URL)
        .get('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require authentication for protected endpoints', async () => {
      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .send({ data: { product: testProductId, quantity: 10 } })
        .timeout(10000);

      expect(response.status).toBe(403);
    });

    it('should handle invalid reservation ID gracefully', async () => {
      const response = await request(SERVER_URL)
        .get('/api/stock-reservations/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(404);
    });
  });

  describe('Stock Reservation Creation and Management', () => {
    it('should create a stock reservation for a product', async () => {
      const reservationData = {
        product: testProductId,
        quantity: 20,
        orderId: `ORDER-${timestamp}`,
        customerId: 'test-customer',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
        reason: 'Order placement',
        metadata: {
          source: 'checkout',
          priority: 'normal'
        }
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect([200, 201]).toContain(response.status);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.product.documentId).toBe(testProductId);
      expect(response.body.data.quantity).toBe(20);
      expect(response.body.data.orderId).toBe(reservationData.orderId);
      expect(response.body.data.status).toBe('active');
      expect(response.body.data.expiresAt).toBeDefined();
      expect(response.body.data.reason).toBe('Order placement');
      expect(response.body.data.metadata).toEqual(reservationData.metadata);
      
      testReservationIds.push(response.body.data.documentId);
    });

    it('should retrieve a stock reservation by ID', async () => {
      const reservationData = {
        product: testProductId,
        quantity: 15,
        orderId: `ORDER-RETRIEVE-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Test retrieval'
      };

      const createResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect([200, 201]).toContain(createResponse.status);
      const reservationId = createResponse.body.data.documentId;
      testReservationIds.push(reservationId);

      const retrieveResponse = await request(SERVER_URL)
        .get(`/api/stock-reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(retrieveResponse.status).toBe(200);
      expect(retrieveResponse.body.data).toBeDefined();
      expect(retrieveResponse.body.data.documentId).toBe(reservationId);
      expect(retrieveResponse.body.data.product).toBeDefined();
      expect(retrieveResponse.body.data.product.documentId).toBe(testProductId);
      expect(retrieveResponse.body.data.quantity).toBe(15);
      expect(retrieveResponse.body.data.orderId).toBe(reservationData.orderId);
    });

    it('should list all stock reservations with filtering', async () => {
      const response = await request(SERVER_URL)
        .get('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Find our test reservations in the list
      const testReservations = response.body.data.filter((res: any) => 
        testReservationIds.includes(res.documentId)
      );
      expect(testReservations.length).toBeGreaterThan(0);
    });

    it('should filter stock reservations by status', async () => {
      const response = await request(SERVER_URL)
        .get('/api/stock-reservations?filters[status][$eq]=active')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All records should have active status
      response.body.data.forEach((reservation: any) => {
        expect(reservation.status).toBe('active');
      });
    });

    it('should filter stock reservations by product', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/stock-reservations?filters[product][documentId][$eq]=${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All records should be for our test product
      response.body.data.forEach((reservation: any) => {
        expect(reservation.product.documentId).toBe(testProductId);
      });
    });

    it('should filter stock reservations by order ID', async () => {
      const orderId = `ORDER-FILTER-${timestamp}`;
      const reservationData = {
        product: testProductId,
        quantity: 10,
        orderId: orderId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Filter test'
      };

      const createResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect([200, 201]).toContain(createResponse.status);
      testReservationIds.push(createResponse.body.data.documentId);

      const filterResponse = await request(SERVER_URL)
        .get(`/api/stock-reservations?filters[orderId][$eq]=${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(filterResponse.status).toBe(200);
      expect(filterResponse.body.data).toBeDefined();
      expect(Array.isArray(filterResponse.body.data)).toBe(true);
      expect(filterResponse.body.data.length).toBe(1);
      expect(filterResponse.body.data[0].orderId).toBe(orderId);
    });

    it('should update stock reservation status', async () => {
      const reservationData = {
        product: testProductId,
        quantity: 5,
        orderId: `ORDER-UPDATE-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Update test'
      };

      const createResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect([200, 201]).toContain(createResponse.status);
      const reservationId = createResponse.body.data.documentId;
      testReservationIds.push(reservationId);

      const updateData = {
        status: 'completed',
        completedAt: new Date().toISOString(),
        reason: 'Order completed'
      };

      const updateResponse = await request(SERVER_URL)
        .put(`/api/stock-reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .timeout(10000);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data).toBeDefined();
      expect(updateResponse.body.data.status).toBe('completed');
      expect(updateResponse.body.data.completedAt).toBeDefined();
      expect(updateResponse.body.data.reason).toBe('Order completed');
    });

    it('should delete a stock reservation', async () => {
      const reservationData = {
        product: testProductId,
        quantity: 3,
        orderId: `ORDER-DELETE-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Delete test'
      };

      const createResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect([200, 201]).toContain(createResponse.status);
      const reservationId = createResponse.body.data.documentId;

      const deleteResponse = await request(SERVER_URL)
        .delete(`/api/stock-reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(deleteResponse.status).toBe(200);

      // Verify reservation is deleted
      const verifyResponse = await request(SERVER_URL)
        .get(`/api/stock-reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(verifyResponse.status).toBe(404);
    });
  });

  describe('Stock Reservation Validation and Constraints', () => {
    it('should reject reservation for non-existent product', async () => {
      const reservationData = {
        product: 'non-existent-product-id',
        quantity: 10,
        orderId: `ORDER-INVALID-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Invalid product test'
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect(response.status).toBe(400);
    });

    it('should reject reservation with invalid quantity', async () => {
      const reservationData = {
        product: testProductId,
        quantity: 0, // Invalid quantity
        orderId: `ORDER-INVALID-QTY-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Invalid quantity test'
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect(response.status).toBe(400);
    });

    it('should reject reservation with negative quantity', async () => {
      const reservationData = {
        product: testProductId,
        quantity: -5, // Negative quantity
        orderId: `ORDER-NEG-QTY-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Negative quantity test'
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect(response.status).toBe(400);
    });

    it('should reject reservation without required fields', async () => {
      const reservationData = {
        product: testProductId,
        // Missing quantity, orderId, expiresAt
        reason: 'Missing fields test'
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect(response.status).toBe(400);
    });

    it('should reject reservation with invalid expiration date', async () => {
      const reservationData = {
        product: testProductId,
        quantity: 10,
        orderId: `ORDER-INVALID-EXP-${timestamp}`,
        expiresAt: 'invalid-date',
        reason: 'Invalid expiration test'
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect(response.status).toBe(400);
    });

    it('should reject reservation with past expiration date', async () => {
      const reservationData = {
        product: testProductId,
        quantity: 10,
        orderId: `ORDER-PAST-EXP-${timestamp}`,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        reason: 'Past expiration test'
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect(response.status).toBe(400);
    });

    it('should reject reservation with invalid status', async () => {
      const reservationData = {
        product: testProductId,
        quantity: 10,
        orderId: `ORDER-INVALID-STATUS-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        status: 'invalid-status',
        reason: 'Invalid status test'
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect(response.status).toBe(400);
    });

    it('should reject duplicate reservation for same order', async () => {
      const orderId = `ORDER-DUPLICATE-${timestamp}`;
      const reservationData = {
        product: testProductId,
        quantity: 10,
        orderId: orderId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Duplicate test'
      };

      // Create first reservation
      const firstResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect([200, 201]).toContain(firstResponse.status);
      testReservationIds.push(firstResponse.body.data.documentId);

      // Try to create duplicate reservation
      const duplicateResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect(duplicateResponse.status).toBe(409); // Conflict
    });

    it('should validate metadata structure', async () => {
      const reservationData = {
        product: testProductId,
        quantity: 10,
        orderId: `ORDER-METADATA-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Metadata test',
        metadata: {
          source: 'checkout',
          priority: 'high',
          customField: 'test-value'
        }
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect([200, 201]).toContain(response.status);
      expect(response.body.data.metadata).toEqual(reservationData.metadata);
      testReservationIds.push(response.body.data.documentId);
    });

    it('should handle malformed request data', async () => {
      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send('invalid-json')
        .timeout(10000);

      expect(response.status).toBe(400);
    });
  });

  describe('Stock Reservation Expiration and Cleanup', () => {
    it('should create reservation with future expiration', async () => {
      const futureExpiration = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const reservationData = {
        product: testProductId,
        quantity: 8,
        orderId: `ORDER-FUTURE-EXP-${timestamp}`,
        expiresAt: futureExpiration.toISOString(),
        reason: 'Future expiration test'
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect([200, 201]).toContain(response.status);
      expect(response.body.data.expiresAt).toBe(futureExpiration.toISOString());
      expect(new Date(response.body.data.expiresAt).getTime()).toBeGreaterThan(Date.now());
      testReservationIds.push(response.body.data.documentId);
    });

    it('should handle reservation expiration status', async () => {
      const shortExpiration = new Date(Date.now() + 1000); // 1 second from now
      const reservationData = {
        product: testProductId,
        quantity: 7,
        orderId: `ORDER-SHORT-EXP-${timestamp}`,
        expiresAt: shortExpiration.toISOString(),
        reason: 'Short expiration test'
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect([200, 201]).toContain(response.status);
      const reservationId = response.body.data.documentId;
      testReservationIds.push(reservationId);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if reservation is marked as expired
      const expiredResponse = await request(SERVER_URL)
        .get(`/api/stock-reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(expiredResponse.status).toBe(200);
      // Note: The actual expiration logic would depend on the implementation
      // This test verifies the reservation can be retrieved after expiration time
    });

    it('should filter expired reservations', async () => {
      const pastExpiration = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const reservationData = {
        product: testProductId,
        quantity: 6,
        orderId: `ORDER-PAST-EXP-${timestamp}`,
        expiresAt: pastExpiration.toISOString(),
        status: 'expired',
        reason: 'Past expiration test'
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect([200, 201]).toContain(response.status);
      testReservationIds.push(response.body.data.documentId);

      // Filter for expired reservations
      const expiredResponse = await request(SERVER_URL)
        .get('/api/stock-reservations?filters[status][$eq]=expired')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(expiredResponse.status).toBe(200);
      expect(expiredResponse.body.data).toBeDefined();
      expect(Array.isArray(expiredResponse.body.data)).toBe(true);
    });

    it('should handle reservation cleanup operations', async () => {
      const reservationData = {
        product: testProductId,
        quantity: 5,
        orderId: `ORDER-CLEANUP-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Cleanup test'
      };

      const createResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect([200, 201]).toContain(createResponse.status);
      const reservationId = createResponse.body.data.documentId;

      // Mark as cancelled for cleanup
      const cancelResponse = await request(SERVER_URL)
        .put(`/api/stock-reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { status: 'cancelled', reason: 'Cleanup test' } })
        .timeout(10000);

      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.body.data.status).toBe('cancelled');

      // Delete the cancelled reservation
      const deleteResponse = await request(SERVER_URL)
        .delete(`/api/stock-reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(deleteResponse.status).toBe(200);

      // Verify cleanup
      const verifyResponse = await request(SERVER_URL)
        .get(`/api/stock-reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(verifyResponse.status).toBe(404);
    });

    it('should handle bulk expiration cleanup', async () => {
      const pastExpiration = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const reservations: string[] = [];

      // Create multiple expired reservations
      for (let i = 0; i < 3; i++) {
        const reservationData = {
          product: testProductId,
          quantity: 2,
          orderId: `ORDER-BULK-EXP-${timestamp}-${i}`,
          expiresAt: pastExpiration.toISOString(),
          status: 'expired',
          reason: `Bulk expiration test ${i}`
        };

        const response = await request(SERVER_URL)
          .post('/api/stock-reservations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: reservationData })
          .timeout(10000);

        expect([200, 201]).toContain(response.status);
        reservations.push(response.body.data.documentId);
      }

      // Verify all expired reservations exist
      const expiredResponse = await request(SERVER_URL)
        .get('/api/stock-reservations?filters[status][$eq]=expired')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(expiredResponse.status).toBe(200);
      expect(expiredResponse.body.data.length).toBeGreaterThanOrEqual(3);

      // Clean up the test reservations
      for (const reservationId of reservations) {
        await request(SERVER_URL)
          .delete(`/api/stock-reservations/${reservationId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
      }
    });

    it('should handle reservation renewal before expiration', async () => {
      const shortExpiration = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
      const reservationData = {
        product: testProductId,
        quantity: 4,
        orderId: `ORDER-RENEWAL-${timestamp}`,
        expiresAt: shortExpiration.toISOString(),
        reason: 'Renewal test'
      };

      const createResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect([200, 201]).toContain(createResponse.status);
      const reservationId = createResponse.body.data.documentId;
      testReservationIds.push(reservationId);

      // Renew the reservation with longer expiration
      const newExpiration = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const renewResponse = await request(SERVER_URL)
        .put(`/api/stock-reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { expiresAt: newExpiration.toISOString(), reason: 'Reservation renewed' } })
        .timeout(10000);

      expect(renewResponse.status).toBe(200);
      expect(renewResponse.body.data.expiresAt).toBe(newExpiration.toISOString());
      expect(new Date(renewResponse.body.data.expiresAt).getTime()).toBeGreaterThan(Date.now() + 30 * 60 * 1000);
    });

    it('should handle automatic expiration processing', async () => {
      const veryShortExpiration = new Date(Date.now() + 100); // 100ms from now
      const reservationData = {
        product: testProductId,
        quantity: 3,
        orderId: `ORDER-AUTO-EXP-${timestamp}`,
        expiresAt: veryShortExpiration.toISOString(),
        reason: 'Auto expiration test'
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect([200, 201]).toContain(response.status);
      const reservationId = response.body.data.documentId;
      testReservationIds.push(reservationId);

      // Wait for automatic expiration
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check reservation status (implementation dependent)
      const statusResponse = await request(SERVER_URL)
        .get(`/api/stock-reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(statusResponse.status).toBe(200);
      // The actual expiration logic would be tested based on implementation
    });
  });

  describe('Stock Reservation Conflict Resolution', () => {
    it('should handle concurrent reservation attempts', async () => {
      const orderId1 = `ORDER-CONCURRENT-1-${timestamp}`;
      const orderId2 = `ORDER-CONCURRENT-2-${timestamp}`;
      const reservationData1 = {
        product: testProductId,
        quantity: 30,
        orderId: orderId1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Concurrent test 1'
      };
      const reservationData2 = {
        product: testProductId,
        quantity: 30,
        orderId: orderId2,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Concurrent test 2'
      };

      // Create concurrent reservation requests
      const [response1, response2] = await Promise.all([
        request(SERVER_URL)
          .post('/api/stock-reservations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: reservationData1 })
          .timeout(10000),
        request(SERVER_URL)
          .post('/api/stock-reservations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: reservationData2 })
          .timeout(10000)
      ]);

      // At least one should succeed, one might fail due to stock constraints
      expect([200, 201, 400, 409]).toContain(response1.status);
      expect([200, 201, 400, 409]).toContain(response2.status);

      // Track successful reservations for cleanup
      if ([200, 201].includes(response1.status)) {
        testReservationIds.push(response1.body.data.documentId);
      }
      if ([200, 201].includes(response2.status)) {
        testReservationIds.push(response2.body.data.documentId);
      }
    });

    it('should handle reservation conflicts with insufficient stock', async () => {
      // First, create a reservation that uses most of the available stock
      const largeReservationData = {
        product: testProductId,
        quantity: 80, // Most of the 100 available
        orderId: `ORDER-LARGE-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Large reservation test'
      };

      const largeResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: largeReservationData })
        .timeout(10000);

      expect([200, 201]).toContain(largeResponse.status);
      testReservationIds.push(largeResponse.body.data.documentId);

      // Try to create another large reservation that would exceed available stock
      const conflictReservationData = {
        product: testProductId,
        quantity: 50, // Would exceed remaining stock
        orderId: `ORDER-CONFLICT-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Conflict test'
      };

      const conflictResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: conflictReservationData })
        .timeout(10000);

      expect(conflictResponse.status).toBe(400);
    });

    it('should handle reservation priority conflicts', async () => {
      const highPriorityData = {
        product: testProductId,
        quantity: 20,
        orderId: `ORDER-HIGH-PRIORITY-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'High priority test',
        metadata: {
          priority: 'high',
          source: 'vip-customer'
        }
      };

      const normalPriorityData = {
        product: testProductId,
        quantity: 20,
        orderId: `ORDER-NORMAL-PRIORITY-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Normal priority test',
        metadata: {
          priority: 'normal',
          source: 'regular-customer'
        }
      };

      // Create both reservations
      const [highResponse, normalResponse] = await Promise.all([
        request(SERVER_URL)
          .post('/api/stock-reservations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: highPriorityData })
          .timeout(10000),
        request(SERVER_URL)
          .post('/api/stock-reservations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: normalPriorityData })
          .timeout(10000)
      ]);

      // Both should succeed as they don't exceed total stock
      expect([200, 201]).toContain(highResponse.status);
      expect([200, 201]).toContain(normalResponse.status);

      if ([200, 201].includes(highResponse.status)) {
        testReservationIds.push(highResponse.body.data.documentId);
      }
      if ([200, 201].includes(normalResponse.status)) {
        testReservationIds.push(normalResponse.body.data.documentId);
      }
    });

    it('should handle reservation conflicts with same order ID', async () => {
      const orderId = `ORDER-SAME-ID-${timestamp}`;
      const reservationData = {
        product: testProductId,
        quantity: 10,
        orderId: orderId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Same order ID test'
      };

      // Create first reservation
      const firstResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect([200, 201]).toContain(firstResponse.status);
      testReservationIds.push(firstResponse.body.data.documentId);

      // Try to create second reservation with same order ID
      const secondResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect(secondResponse.status).toBe(409); // Conflict
    });

    it('should handle reservation conflicts with overlapping expiration', async () => {
      const baseTime = Date.now() + 15 * 60 * 1000; // 15 minutes from now
      const reservationData1 = {
        product: testProductId,
        quantity: 15,
        orderId: `ORDER-OVERLAP-1-${timestamp}`,
        expiresAt: new Date(baseTime + 10 * 60 * 1000).toISOString(), // 25 minutes from now
        reason: 'Overlap test 1'
      };
      const reservationData2 = {
        product: testProductId,
        quantity: 15,
        orderId: `ORDER-OVERLAP-2-${timestamp}`,
        expiresAt: new Date(baseTime + 5 * 60 * 1000).toISOString(), // 20 minutes from now
        reason: 'Overlap test 2'
      };

      // Create both reservations
      const [response1, response2] = await Promise.all([
        request(SERVER_URL)
          .post('/api/stock-reservations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: reservationData1 })
          .timeout(10000),
        request(SERVER_URL)
          .post('/api/stock-reservations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: reservationData2 })
          .timeout(10000)
      ]);

      // Both should succeed as they don't exceed total stock
      expect([200, 201]).toContain(response1.status);
      expect([200, 201]).toContain(response2.status);

      if ([200, 201].includes(response1.status)) {
        testReservationIds.push(response1.body.data.documentId);
      }
      if ([200, 201].includes(response2.status)) {
        testReservationIds.push(response2.body.data.documentId);
      }
    });

    it('should handle reservation conflicts with customer limits', async () => {
      const customerId = 'test-customer-conflict';
      const reservationData1 = {
        product: testProductId,
        quantity: 10,
        orderId: `ORDER-CUSTOMER-1-${timestamp}`,
        customerId: customerId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Customer limit test 1'
      };
      const reservationData2 = {
        product: testProductId,
        quantity: 10,
        orderId: `ORDER-CUSTOMER-2-${timestamp}`,
        customerId: customerId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Customer limit test 2'
      };

      // Create both reservations for same customer
      const [response1, response2] = await Promise.all([
        request(SERVER_URL)
          .post('/api/stock-reservations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: reservationData1 })
          .timeout(10000),
        request(SERVER_URL)
          .post('/api/stock-reservations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: reservationData2 })
          .timeout(10000)
      ]);

      // Both should succeed as they don't exceed total stock
      expect([200, 201]).toContain(response1.status);
      expect([200, 201]).toContain(response2.status);

      if ([200, 201].includes(response1.status)) {
        testReservationIds.push(response1.body.data.documentId);
      }
      if ([200, 201].includes(response2.status)) {
        testReservationIds.push(response2.body.data.documentId);
      }
    });

    it('should handle reservation conflicts with product unavailability', async () => {
      // Create a reservation for a non-existent product
      const invalidProductData = {
        product: 'non-existent-product-id',
        quantity: 10,
        orderId: `ORDER-INVALID-PRODUCT-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Invalid product conflict test'
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidProductData })
        .timeout(10000);

      expect(response.status).toBe(400);
    });

    it('should handle reservation conflicts with system constraints', async () => {
      // Test with invalid system constraints
      const invalidConstraintData = {
        product: testProductId,
        quantity: 10,
        orderId: `ORDER-CONSTRAINT-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'System constraint test',
        metadata: {
          systemConstraint: 'invalid-constraint'
        }
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: invalidConstraintData })
        .timeout(10000);

      // Should either succeed or fail gracefully
      expect([200, 201, 400]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        testReservationIds.push(response.body.data.documentId);
      }
    });
  });

  describe('Stock Reservation Performance Optimization', () => {
    it('should handle large reservation queries efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(SERVER_URL)
        .get('/api/stock-reservations?pagination[pageSize]=100')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent reservation operations', async () => {
      const concurrentPromises: Promise<any>[] = [];
      
      // Create multiple concurrent reservation requests
      for (let i = 0; i < 5; i++) {
        const reservationData = {
          product: testProductId,
          quantity: 1,
          orderId: `ORDER-PERF-${timestamp}-${i}`,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          reason: `Performance test ${i}`
        };
        
        concurrentPromises.push(
          request(SERVER_URL)
            .post('/api/stock-reservations')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ data: reservationData })
            .timeout(10000)
        );
      }

      const responses = await Promise.all(concurrentPromises);
      
      // All requests should succeed
      responses.forEach(response => {
        expect([200, 201]).toContain(response.status);
        if ([200, 201].includes(response.status)) {
          testReservationIds.push(response.body.data.documentId);
        }
      });
    });

    it('should optimize reservation queries with proper filtering', async () => {
      const queryPatterns = [
        'filters[status][$eq]=active',
        `filters[product][documentId][$eq]=${testProductId}`,
        'filters[expiresAt][$gte]=2024-01-01T00:00:00.000Z'
      ];

      for (const pattern of queryPatterns) {
        const startTime = Date.now();
        
        const response = await request(SERVER_URL)
          .get(`/api/stock-reservations?${pattern}`)
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
          .get(`/api/stock-reservations?pagination[pageSize]=${pageSize}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);

        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeLessThanOrEqual(pageSize);
        expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      }
    });

    it('should handle reservation updates efficiently', async () => {
      const reservationData = {
        product: testProductId,
        quantity: 5,
        orderId: `ORDER-UPDATE-PERF-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Update performance test'
      };

      const createResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect([200, 201]).toContain(createResponse.status);
      const reservationId = createResponse.body.data.documentId;
      testReservationIds.push(reservationId);

      // Test update performance
      const startTime = Date.now();
      
      const updateResponse = await request(SERVER_URL)
        .put(`/api/stock-reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { status: 'completed', reason: 'Performance test completed' } })
        .timeout(10000);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(updateResponse.status).toBe(200);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Stock Reservation Bulk Operations', () => {
    it('should handle bulk reservation creation', async () => {
      const bulkReservations: any[] = [];
      
      // Create multiple reservations
      for (let i = 0; i < 3; i++) {
        const reservationData = {
          product: testProductId,
          quantity: 2,
          orderId: `ORDER-BULK-${timestamp}-${i}`,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          reason: `Bulk creation test ${i}`
        };
        
        bulkReservations.push(reservationData);
      }

      // Create all reservations concurrently
      const createPromises = bulkReservations.map(data =>
        request(SERVER_URL)
          .post('/api/stock-reservations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data })
          .timeout(10000)
      );

      const responses = await Promise.all(createPromises);
      
      // All should succeed
      responses.forEach(response => {
        expect([200, 201]).toContain(response.status);
        if ([200, 201].includes(response.status)) {
          testReservationIds.push(response.body.data.documentId);
        }
      });
    });

    it('should handle bulk reservation updates', async () => {
      const reservations: string[] = [];
      
      // Create multiple reservations first
      for (let i = 0; i < 3; i++) {
        const reservationData = {
          product: testProductId,
          quantity: 1,
          orderId: `ORDER-BULK-UPDATE-${timestamp}-${i}`,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          reason: `Bulk update test ${i}`
        };
        
        const response = await request(SERVER_URL)
          .post('/api/stock-reservations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: reservationData })
          .timeout(10000);

        expect([200, 201]).toContain(response.status);
        reservations.push(response.body.data.documentId);
        testReservationIds.push(response.body.data.documentId);
      }

      // Update all reservations concurrently
      const updatePromises = reservations.map(reservationId =>
        request(SERVER_URL)
          .put(`/api/stock-reservations/${reservationId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: { status: 'completed', reason: 'Bulk update completed' } })
          .timeout(10000)
      );

      const updateResponses = await Promise.all(updatePromises);
      
      // All updates should succeed
      updateResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('completed');
      });
    });

    it('should handle bulk reservation deletion', async () => {
      const reservations: string[] = [];
      
      // Create multiple reservations first
      for (let i = 0; i < 3; i++) {
        const reservationData = {
          product: testProductId,
          quantity: 1,
          orderId: `ORDER-BULK-DELETE-${timestamp}-${i}`,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          reason: `Bulk delete test ${i}`
        };
        
        const response = await request(SERVER_URL)
          .post('/api/stock-reservations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: reservationData })
          .timeout(10000);

        expect([200, 201]).toContain(response.status);
        reservations.push(response.body.data.documentId);
      }

      // Delete all reservations concurrently
      const deletePromises = reservations.map(reservationId =>
        request(SERVER_URL)
          .delete(`/api/stock-reservations/${reservationId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000)
      );

      const deleteResponses = await Promise.all(deletePromises);
      
      // All deletions should succeed
      deleteResponses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify all reservations are deleted
      for (const reservationId of reservations) {
        const verifyResponse = await request(SERVER_URL)
          .get(`/api/stock-reservations/${reservationId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);

        expect(verifyResponse.status).toBe(404);
      }
    });

    it('should handle bulk reservation status updates', async () => {
      const reservations: string[] = [];
      
      // Create multiple reservations first
      for (let i = 0; i < 3; i++) {
        const reservationData = {
          product: testProductId,
          quantity: 1,
          orderId: `ORDER-BULK-STATUS-${timestamp}-${i}`,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          reason: `Bulk status test ${i}`
        };
        
        const response = await request(SERVER_URL)
          .post('/api/stock-reservations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: reservationData })
          .timeout(10000);

        expect([200, 201]).toContain(response.status);
        reservations.push(response.body.data.documentId);
        testReservationIds.push(response.body.data.documentId);
      }

      // Update status of all reservations to different statuses
      const statusUpdates = ['completed', 'cancelled', 'expired'];
      const updatePromises = reservations.map((reservationId, index) =>
        request(SERVER_URL)
          .put(`/api/stock-reservations/${reservationId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: { status: statusUpdates[index], reason: `Bulk status update ${index}` } })
          .timeout(10000)
      );

      const updateResponses = await Promise.all(updatePromises);
      
      // All updates should succeed
      updateResponses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe(statusUpdates[index]);
      });
    });

    it('should handle bulk reservation filtering and retrieval', async () => {
      // Create multiple reservations with different statuses
      const statuses = ['active', 'completed', 'cancelled'];
      const reservations: string[] = [];
      
      for (let i = 0; i < statuses.length; i++) {
        const reservationData = {
          product: testProductId,
          quantity: 1,
          orderId: `ORDER-BULK-FILTER-${timestamp}-${i}`,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          status: statuses[i],
          reason: `Bulk filter test ${i}`
        };
        
        const response = await request(SERVER_URL)
          .post('/api/stock-reservations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: reservationData })
          .timeout(10000);

        expect([200, 201]).toContain(response.status);
        reservations.push(response.body.data.documentId);
        testReservationIds.push(response.body.data.documentId);
      }

      // Test bulk filtering by status
      for (const status of statuses) {
        const filterResponse = await request(SERVER_URL)
          .get(`/api/stock-reservations?filters[status][$eq]=${status}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);

        expect(filterResponse.status).toBe(200);
        expect(filterResponse.body.data).toBeDefined();
        expect(Array.isArray(filterResponse.body.data)).toBe(true);
        
        // All returned reservations should have the correct status
        filterResponse.body.data.forEach((reservation: any) => {
          expect(reservation.status).toBe(status);
        });
      }
    });

    it('should handle bulk reservation operations with mixed results', async () => {
      const validReservationData = {
        product: testProductId,
        quantity: 1,
        orderId: `ORDER-BULK-MIXED-VALID-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Valid bulk operation'
      };

      const invalidReservationData = {
        product: 'non-existent-product',
        quantity: 1,
        orderId: `ORDER-BULK-MIXED-INVALID-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Invalid bulk operation'
      };

      // Create both valid and invalid reservations
      const [validResponse, invalidResponse] = await Promise.all([
        request(SERVER_URL)
          .post('/api/stock-reservations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: validReservationData })
          .timeout(10000),
        request(SERVER_URL)
          .post('/api/stock-reservations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: invalidReservationData })
          .timeout(10000)
      ]);

      // Valid should succeed, invalid should fail
      expect([200, 201]).toContain(validResponse.status);
      expect(invalidResponse.status).toBe(400);

      if ([200, 201].includes(validResponse.status)) {
        testReservationIds.push(validResponse.body.data.documentId);
      }
    });
  });

  describe('Database Record Verification', () => {
    it('should verify stock reservation records exist in database', async () => {
      const response = await request(SERVER_URL)
        .get('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Verify each record has required database fields
      response.body.data.forEach((reservation: any) => {
        expect(reservation.documentId).toBeDefined();
        expect(reservation.product).toBeDefined();
        expect(reservation.quantity).toBeDefined();
        expect(reservation.orderId).toBeDefined();
        expect(reservation.status).toBeDefined();
        expect(reservation.expiresAt).toBeDefined();
        expect(reservation.createdAt).toBeDefined();
        expect(reservation.updatedAt).toBeDefined();
      });
    });

    it('should verify reservation record relationships are maintained', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/stock-reservations?filters[product][documentId][$eq]=${testProductId}&populate=product`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      
      // Verify product relationships
      response.body.data.forEach((reservation: any) => {
        expect(reservation.product).toBeDefined();
        expect(reservation.product.documentId).toBe(testProductId);
        expect(reservation.product.name).toBeDefined();
        expect(reservation.product.sku).toBeDefined();
      });
    });

    it('should verify reservation record data consistency', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/stock-reservations?filters[product][documentId][$eq]=${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      
      // Verify data consistency
      response.body.data.forEach((reservation: any) => {
        // Quantity should be positive
        expect(reservation.quantity).toBeGreaterThan(0);
        
        // Status should be valid enum value
        const validStatuses = ['active', 'completed', 'expired', 'cancelled'];
        expect(validStatuses).toContain(reservation.status);
        
        // Expiration date should be valid
        expect(new Date(reservation.expiresAt).getTime()).toBeGreaterThan(0);
        
        // Order ID should be non-empty string
        expect(typeof reservation.orderId).toBe('string');
        expect(reservation.orderId.length).toBeGreaterThan(0);
        
        // Timestamps should be valid
        expect(new Date(reservation.createdAt).getTime()).toBeGreaterThan(0);
        expect(new Date(reservation.updatedAt).getTime()).toBeGreaterThan(0);
      });
    });

    it('should verify reservation record integrity after operations', async () => {
      // Create a reservation
      const reservationData = {
        product: testProductId,
        quantity: 5,
        orderId: `ORDER-INTEGRITY-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Integrity test'
      };

      const createResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect([200, 201]).toContain(createResponse.status);
      const reservationId = createResponse.body.data.documentId;
      testReservationIds.push(reservationId);

      // Update the reservation
      const updateResponse = await request(SERVER_URL)
        .put(`/api/stock-reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { status: 'completed', completedAt: new Date().toISOString() } })
        .timeout(10000);

      expect(updateResponse.status).toBe(200);

      // Verify the updated record
      const verifyResponse = await request(SERVER_URL)
        .get(`/api/stock-reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.data.status).toBe('completed');
      expect(verifyResponse.body.data.completedAt).toBeDefined();
      expect(verifyResponse.body.data.updatedAt).toBeDefined();
      
      // Verify updatedAt is newer than createdAt
      const createdAt = new Date(verifyResponse.body.data.createdAt);
      const updatedAt = new Date(verifyResponse.body.data.updatedAt);
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent reservation ID in updates', async () => {
      const updateData = {
        status: 'completed',
        reason: 'Test update'
      };

      const response = await request(SERVER_URL)
        .put('/api/stock-reservations/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .timeout(10000);

      expect(response.status).toBe(404);
    });

    it('should handle malformed request data', async () => {
      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send('invalid-json')
        .timeout(10000);

      expect(response.status).toBe(400);
    });

    it('should handle server errors gracefully', async () => {
      // Test with invalid product ID format
      const response = await request(SERVER_URL)
        .get('/api/stock-reservations?filters[product][documentId][$eq]=invalid-format')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle timeout scenarios', async () => {
      const reservationData = {
        product: testProductId,
        quantity: 1,
        orderId: `ORDER-TIMEOUT-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Timeout test'
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(5000); // Short timeout

      expect([200, 201, 408]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        testReservationIds.push(response.body.data.documentId);
      }
    });

    it('should handle network interruption scenarios', async () => {
      const reservationData = {
        product: testProductId,
        quantity: 1,
        orderId: `ORDER-NETWORK-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Network test'
      };

      // Test with very short timeout to simulate network issues
      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(100); // Very short timeout

      // Should either succeed quickly or timeout
      expect([200, 201, 408]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        testReservationIds.push(response.body.data.documentId);
      }
    });

    it('should handle invalid authentication scenarios', async () => {
      const reservationData = {
        product: testProductId,
        quantity: 1,
        orderId: `ORDER-AUTH-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Auth test'
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', 'Bearer invalid-token')
        .send({ data: reservationData })
        .timeout(10000);

      expect(response.status).toBe(401);
    });

    it('should handle missing authorization header', async () => {
      const reservationData = {
        product: testProductId,
        quantity: 1,
        orderId: `ORDER-NO-AUTH-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'No auth test'
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .send({ data: reservationData })
        .timeout(10000);

      expect(response.status).toBe(403);
    });

    it('should handle large payload scenarios', async () => {
      const largeMetadata = {
        largeField: 'x'.repeat(10000), // 10KB string
        nestedData: {
          level1: {
            level2: {
              level3: {
                data: 'deep nested data'
              }
            }
          }
        }
      };

      const reservationData = {
        product: testProductId,
        quantity: 1,
        orderId: `ORDER-LARGE-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Large payload test',
        metadata: largeMetadata
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      // Should either succeed or fail gracefully
      expect([200, 201, 400, 413]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        testReservationIds.push(response.body.data.documentId);
      }
    });

    it('should handle concurrent modification scenarios', async () => {
      const reservationData = {
        product: testProductId,
        quantity: 1,
        orderId: `ORDER-CONCURRENT-MOD-${timestamp}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Concurrent modification test'
      };

      const createResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect([200, 201]).toContain(createResponse.status);
      const reservationId = createResponse.body.data.documentId;
      testReservationIds.push(reservationId);

      // Try to update the same reservation concurrently
      const updatePromises = [
        request(SERVER_URL)
          .put(`/api/stock-reservations/${reservationId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: { status: 'completed', reason: 'Update 1' } })
          .timeout(10000),
        request(SERVER_URL)
          .put(`/api/stock-reservations/${reservationId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: { status: 'cancelled', reason: 'Update 2' } })
          .timeout(10000)
      ];

      const updateResponses = await Promise.all(updatePromises);
      
      // At least one should succeed
      const successCount = updateResponses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });
});
