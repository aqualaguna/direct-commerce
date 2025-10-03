/**
 * Stock Reservation Integration Tests
 * 
 * Comprehensive integration tests for Stock Reservation API that verify
 * stock reservation creation, management, expiration, and status transitions
 * in a real environment with actual database operations.
 */

import request from 'supertest';

describe('Stock Reservation Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let adminToken: string;
  let testProductId: string;
  let testCustomerId: string;
  let testReservationIds: string[] = [];
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();
  const testProduct = {
    name: `Test Product ${timestamp}`,
    description: 'This is a test product for stock reservation integration testing',
    sku: `STOCK-TEST-${timestamp}`,
    status: 'active',
    price: 29.99,
    inventory: 100
  };

  const testCustomer = {
    username: `testcustomer${timestamp}`,
    email: `testcustomer${timestamp}@example.com`,
    password: 'TestPassword123!',
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

    // Create a test customer for stock reservation operations
    const customerResponse = await request(SERVER_URL)
      .post('/api/auth/local/register')
      .send(testCustomer)
      .timeout(10000);
    expect([200, 201]).toContain(customerResponse.status);
    testCustomerId = customerResponse.body.user.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testReservationIds.length > 0) {
      for (const reservationId of testReservationIds) {
        try {
          await request(SERVER_URL)
            .delete(`/api/stock-reservations/${reservationId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .timeout(5000);
        } catch (error) {
          console.warn(`Failed to clean up reservation ${reservationId}:`, error);
        }
      }
    }

    // Clean up test product
    if (testProductId) {
      try {
        await request(SERVER_URL)
          .delete(`/api/products/${testProductId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(5000);
      } catch (error) {
        console.warn(`Failed to clean up product ${testProductId}:`, error);
      }
    }

    // Clean up test customer
    if (testCustomerId) {
      try {
        await request(SERVER_URL)
          .delete(`/api/users/${testCustomerId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(5000);
      } catch (error) {
        console.warn(`Failed to clean up customer ${testCustomerId}:`, error);
      }
    }
  });

  describe('Stock Reservation CRUD Operations', () => {
    it('should create a new stock reservation', async () => {
      const reservationData = {
        product: testProductId,
        quantity: 5,
        orderId: `ORDER-${timestamp}-001`,
        customer: testCustomerId,
        status: 'active',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        reason: 'Test reservation for integration testing',
        metadata: {
          source: 'integration-test',
          testRun: timestamp
        }
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);
      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      
      const reservation = response.body.data;
      expect(reservation.quantity).toBe(5);
      expect(reservation.orderId).toBe(`ORDER-${timestamp}-001`);
      expect(reservation.status).toBe('active');
      // get the data from api findONe
      const getResponse = await request(SERVER_URL)
        .get(`/api/stock-reservations/${reservation.documentId}?populate[product]=true&populate[customer]=true`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data).toBeDefined();
      expect(getResponse.body.data.quantity).toBe(5);
      expect(getResponse.body.data.orderId).toBe(`ORDER-${timestamp}-001`);
      expect(getResponse.body.data.status).toBe('active');
      expect(getResponse.body.data.product).toBeDefined();
      expect(getResponse.body.data.customer).toBeDefined();
      expect(getResponse.body.data.product.documentId).toBe(testProductId);
      expect(getResponse.body.data.customer.id).toBe(testCustomerId);
      // Store reservation ID for cleanup
      testReservationIds.push(reservation.documentId);
    });

    it('should retrieve stock reservations with pagination', async () => {
      const response = await request(SERVER_URL)
        .get('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          pagination: { page: 1, pageSize: 10 },
          sort: 'createdAt:desc'
        })
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta.pagination).toBeDefined();
      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.pageSize).toBe(10);
    });

    it('should filter stock reservations by status', async () => {
      const response = await request(SERVER_URL)
        .get('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          filters: { status: 'active' },
          pagination: { page: 1, pageSize: 10 }
        })
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      
      // All returned reservations should have active status
      response.body.data.forEach((reservation: any) => {
        expect(reservation.status).toBe('active');
      });
    });

    it('should filter stock reservations by customer', async () => {
      const response = await request(SERVER_URL)
        .get('/api/stock-reservations?populate[customer]=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          filters: { customer: testCustomerId },
          pagination: { page: 1, pageSize: 10 }
        })
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      
      // All returned reservations should belong to the test customer
      // Note: customerId might be a relation object or ID depending on population
      response.body.data.forEach((reservation: any) => {
        if (typeof reservation.customer === 'object') {
          expect(reservation.customer.id).toBe(testCustomerId);
        } else {
          expect(reservation.customer).toBe(testCustomerId);
        }
      });
    });

    it('should retrieve a specific stock reservation by ID', async () => {
      // First create a reservation to retrieve
      const reservationData = {
        product: testProductId,
        quantity: 3,
        orderId: `ORDER-${timestamp}-002`,
        customer: testCustomerId,
        status: 'active',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        reason: 'Test reservation for retrieval testing'
      };

      const createResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect(createResponse.status).toBe(201);
      const reservationId = createResponse.body.data.documentId;
      testReservationIds.push(reservationId);

      // Now retrieve the specific reservation
      const response = await request(SERVER_URL)
        .get(`/api/stock-reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBe(reservationId);
      expect(response.body.data.quantity).toBe(3);
      expect(response.body.data.orderId).toBe(`ORDER-${timestamp}-002`);
    });

    it('should update a stock reservation', async () => {
      // First create a reservation to update
      const reservationData = {
        product: testProductId,
        quantity: 2,
        orderId: `ORDER-${timestamp}-003`,
        customer: testCustomerId,
        status: 'active',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        reason: 'Test reservation for update testing'
      };

      const createResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect(createResponse.status).toBe(201);
      const reservationId = createResponse.body.data.documentId;
      testReservationIds.push(reservationId);

      // Update the reservation
      const updateData = {
        quantity: 4,
        reason: 'Updated reservation for testing',
        metadata: {
          updatedBy: 'integration-test',
          updateReason: 'quantity-change'
        }
      };

      const response = await request(SERVER_URL)
        .put(`/api/stock-reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.quantity).toBe(4);
      expect(response.body.data.reason).toBe('Updated reservation for testing');
      expect(response.body.data.metadata.updatedBy).toBe('integration-test');
    });

    it('should delete a stock reservation', async () => {
      // First create a reservation to delete
      const reservationData = {
        product: testProductId,
        quantity: 1,
        orderId: `ORDER-${timestamp}-004`,
        customer: testCustomerId,
        status: 'active',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        reason: 'Test reservation for deletion testing'
      };

      const createResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect(createResponse.status).toBe(201);
      const reservationId = createResponse.body.data.documentId;

      // Delete the reservation
      const response = await request(SERVER_URL)
        .delete(`/api/stock-reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(204);

      // Verify the reservation is deleted
      const getResponse = await request(SERVER_URL)
        .get(`/api/stock-reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('Stock Reservation Status Management', () => {
    it('should transition reservation status from active to completed', async () => {
      // Create an active reservation
      const reservationData = {
        product: testProductId,
        quantity: 2,
        orderId: `ORDER-${timestamp}-005`,
        customer: testCustomerId,
        status: 'active',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        reason: 'Test reservation for status transition'
      };

      const createResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect(createResponse.status).toBe(201);
      const reservationId = createResponse.body.data.documentId;
      testReservationIds.push(reservationId);

      // Update status to completed
      const updateData = {
        status: 'completed',
        completedAt: new Date().toISOString(),
        reason: 'Order completed successfully'
      };

      const response = await request(SERVER_URL)
        .put(`/api/stock-reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.completedAt).toBeDefined();
    });

    it('should transition reservation status from active to cancelled', async () => {
      // Create an active reservation
      const reservationData = {
        product: testProductId,
        quantity: 1,
        orderId: `ORDER-${timestamp}-006`,
        customer: testCustomerId,
        status: 'active',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        reason: 'Test reservation for cancellation'
      };

      const createResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect(createResponse.status).toBe(201);
      const reservationId = createResponse.body.data.documentId;
      testReservationIds.push(reservationId);

      // Update status to cancelled
      const updateData = {
        status: 'cancelled',
        reason: 'Order cancelled by customer'
      };

      const response = await request(SERVER_URL)
        .put(`/api/stock-reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('cancelled');
    });

    it('should handle expired reservations', async () => {
      // Create a reservation with past expiration date
      const reservationData = {
        product: testProductId,
        quantity: 1,
        orderId: `ORDER-${timestamp}-007`,
        customer: testCustomerId,
        status: 'active',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        reason: 'Test reservation for expiration testing'
      };

      const createResponse = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect(createResponse.status).toBe(201);
      const reservationId = createResponse.body.data.documentId;
      testReservationIds.push(reservationId);

      // Update status to expired
      const updateData = {
        status: 'expired',
        reason: 'Reservation expired due to time limit'
      };

      const response = await request(SERVER_URL)
        .put(`/api/stock-reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: updateData })
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('expired');
    });
  });

  describe('Stock Reservation Validation', () => {
    it('should reject reservation with invalid quantity', async () => {
      const reservationData = {
        product: testProductId,
        quantity: 0, // Invalid: must be at least 1
        orderId: `ORDER-${timestamp}-008`,
        customer: testCustomerId,
        status: 'active',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        reason: 'Test reservation with invalid quantity'
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);
      expect(response.status).toBe(400);
    });

    it('should reject reservation with missing required fields', async () => {
      const reservationData = {
        // Missing product, quantity, orderId, expiresAt
        customer: testCustomerId,
        status: 'active',
        reason: 'Test reservation with missing fields'
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
        quantity: 1,
        orderId: `ORDER-${timestamp}-009`,
        customer: testCustomerId,
        status: 'invalid-status', // Invalid status
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        reason: 'Test reservation with invalid status'
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect(response.status).toBe(400);
    });

    it('should reject reservation with non-existent product', async () => {
      const reservationData = {
        product: 'non-existent-product-id',
        quantity: 1,
        orderId: `ORDER-${timestamp}-010`,
        customer: testCustomerId,
        status: 'active',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        reason: 'Test reservation with non-existent product'
      };

      const response = await request(SERVER_URL)
        .post('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: reservationData })
        .timeout(10000);

      expect(response.status).toBe(400);
    });
  });

  describe('Stock Reservation Search and Filtering', () => {
    beforeEach(async () => {
      // Create multiple test reservations for search testing
      const reservations = [
        {
          product: testProductId,
          quantity: 1,
          orderId: `ORDER-${timestamp}-SEARCH-001`,
          customer: testCustomerId,
          status: 'active',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          reason: 'Search test reservation 1'
        },
        {
          product: testProductId,
          quantity: 2,
          orderId: `ORDER-${timestamp}-SEARCH-002`,
          customer: testCustomerId,
          status: 'completed',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date().toISOString(),
          reason: 'Search test reservation 2'
        },
        {
          product: testProductId,
          quantity: 3,
          orderId: `ORDER-${timestamp}-SEARCH-003`,
          customer: testCustomerId,
          status: 'cancelled',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          reason: 'Search test reservation 3'
        }
      ];

      for (const reservationData of reservations) {
        const response = await request(SERVER_URL)
          .post('/api/stock-reservations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: reservationData })
          .timeout(10000);

        expect(response.status).toBe(201);
        testReservationIds.push(response.body.data.documentId);
      }
    });

    it('should search reservations by order ID', async () => {
      const response = await request(SERVER_URL)
        .get('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          filters: { orderId: { $containsi: 'SEARCH' } },
          pagination: { page: 1, pageSize: 10 }
        })
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
      
      // All returned reservations should contain 'SEARCH' in orderId
      response.body.data.forEach((reservation: any) => {
        expect(reservation.orderId).toContain('SEARCH');
      });
    });

    it('should filter reservations by multiple statuses', async () => {
      const response = await request(SERVER_URL)
        .get('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          filters: { 
            status: { $in: ['active', 'completed'] }
          },
          pagination: { page: 1, pageSize: 10 }
        })
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      
      // All returned reservations should have active or completed status
      response.body.data.forEach((reservation: any) => {
        expect(['active', 'completed']).toContain(reservation.status);
      });
    });

    it('should sort reservations by creation date', async () => {
      const response = await request(SERVER_URL)
        .get('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          sort: 'createdAt:desc',
          pagination: { page: 1, pageSize: 10 }
        })
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      
      // Verify sorting (most recent first)
      for (let i = 1; i < response.body.data.length; i++) {
        const current = new Date(response.body.data[i].createdAt);
        const previous = new Date(response.body.data[i - 1].createdAt);
        expect(current.getTime()).toBeLessThanOrEqual(previous.getTime());
      }
    });
  });

  describe('Stock Reservation Performance', () => {
    it('should handle bulk reservation creation efficiently', async () => {
      const startTime = Date.now();
      const bulkReservations: any[] = [];
      
      // Create multiple reservations
      for (let i = 0; i < 5; i++) {
        const reservationData = {
          product: testProductId,
          quantity: 1,
          orderId: `ORDER-${timestamp}-BULK-${i}`,
          customer: testCustomerId,
          status: 'active',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          reason: `Bulk test reservation ${i}`
        };

        const response = await request(SERVER_URL)
          .post('/api/stock-reservations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ data: reservationData })
          .timeout(10000);

        expect(response.status).toBe(201);
        testReservationIds.push(response.body.data.documentId);
        bulkReservations.push(response.body.data);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (5 seconds for 5 reservations)
      expect(duration).toBeLessThan(5000);
      expect(bulkReservations.length).toBe(5);
    });

    it('should handle large result sets with pagination', async () => {
      const response = await request(SERVER_URL)
        .get('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          pagination: { page: 1, pageSize: 100 },
          sort: 'createdAt:desc'
        })
        .timeout(15000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta.pagination).toBeDefined();
      expect(response.body.meta.pagination.pageSize).toBeLessThanOrEqual(100);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent reservation', async () => {
      const response = await request(SERVER_URL)
        .get('/api/stock-reservations/non-existent-reservation-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(404);
    });

    it('should return 404 for invalid reservation ID format', async () => {
      const response = await request(SERVER_URL)
        .get('/api/stock-reservations/invalid-id-format')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      expect(response.status).toBe(404);
    });

    it('should return 403 for unauthenticated requests', async () => {
      const response = await request(SERVER_URL)
        .get('/api/stock-reservations')
        .timeout(10000);

      expect(response.status).toBe(403);
    });

    it('should return 403 for unauthorized operations', async () => {
      // This would require setting up a non-admin user token
      // For now, we'll test with a malformed token
      const response = await request(SERVER_URL)
        .get('/api/stock-reservations')
        .set('Authorization', 'Bearer invalid-token')
        .timeout(10000);

      expect(response.status).toBe(401);
    });
  });
});
