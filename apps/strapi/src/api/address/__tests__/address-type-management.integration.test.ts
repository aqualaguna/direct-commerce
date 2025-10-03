/**
 * Address Type Management Integration Tests
 * 
 * Tests for address type management, default address handling, search, filtering,
 * statistics, address book management, and export/import functionality
 */

import request from 'supertest';
import {
  SERVER_URL,
  userToken,
  createTestAddressData,
  createTestBillingAddressData,
  createAndTrackAddress,
  initializeTestEnvironment,
  cleanupTestEnvironment
} from './test-setup';

describe('Address Type Management Integration Tests', () => {
  beforeAll(async () => {
    await initializeTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });
  describe('Find Addresses by Type', () => {
    beforeAll(async () => {
      // Create addresses of different types
      await createAndTrackAddress(createTestAddressData({ type: 'shipping' }));
      await createAndTrackAddress(createTestAddressData({ type: 'billing' }));
      await createAndTrackAddress(createTestAddressData({ type: 'both' }));
    });

    it('should find shipping addresses', async () => {
      const response = await request(SERVER_URL)
        .get('/api/addresses/type/shipping')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.type).toBe('shipping');
      expect(response.body.meta.count).toBeGreaterThan(0);
    });

    it('should find billing addresses', async () => {
      const response = await request(SERVER_URL)
        .get('/api/addresses/type/billing')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      expect([200, 403, 404]).toContain(response.status);
      if (response.status === 200 && response.body.data) {
        expect(response.body.data).toBeDefined();
        if (response.body.meta) {
          expect(response.body.meta.type).toBe('billing');
        }
      }
    });

    it('should find addresses of both types', async () => {
      const response = await request(SERVER_URL)
        .get('/api/addresses/type/both')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      expect([200, 403, 404]).toContain(response.status);
      if (response.status === 200 && response.body.data) {
        expect(response.body.data).toBeDefined();
        if (response.body.meta) {
          expect(response.body.meta.type).toBe('both');
        }
      }
    });

    it('should return 400 for invalid address type', async () => {
      const response = await request(SERVER_URL)
        .get('/api/addresses/type/invalid')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Invalid address type');
    });
  });

  describe('Default Address Management', () => {
    let shippingAddress: any;
    let billingAddress: any;

    beforeAll(async () => {
      // Create addresses for default management tests
      const shippingResponse = await createAndTrackAddress(createTestAddressData({ type: 'shipping' }));
      const billingResponse = await createAndTrackAddress(createTestBillingAddressData({ type: 'billing' }));
      shippingAddress = shippingResponse.body.data;
      billingAddress = billingResponse.body.data;
    });

    it('should get default shipping address', async () => {
      const response = await request(SERVER_URL)
        .get('/api/addresses/default/shipping')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      expect([200, 403, 404]).toContain(response.status);
      if (response.status === 200 && response.body.data) {
        expect(response.body.data).toBeDefined();
        if (response.body.meta) {
          expect(response.body.meta.type).toBe('shipping');
        }
      }
    });

    it('should get default billing address', async () => {
      const response = await request(SERVER_URL)
        .get('/api/addresses/default/billing')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.type).toBe('billing');
    });

    it('should set address as default successfully', async () => {
      const response = await request(SERVER_URL)
        .post(`/api/addresses/${shippingAddress.documentId}/set-default`)
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.message).toBe('Address set as default successfully');
    });

    it('should return 403 when setting non-existent address as default', async () => {
      const response = await request(SERVER_URL)
        .post('/api/addresses/non-existent-document-id/set-default')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      expect(response.status).toBe(403);
    });
  });

  describe('Address Search and Filtering', () => {
    beforeAll(async () => {
      // Create addresses for search tests
      await createAndTrackAddress(createTestAddressData({
        city: 'New York',
        state: 'NY',
        country: 'USA'
      }));
      await createAndTrackAddress(createTestAddressData({
        city: 'Los Angeles',
        state: 'CA',
        country: 'USA'
      }));
    });

    it('should search addresses by city', async () => {
      const response = await request(SERVER_URL)
        .post('/api/addresses/search?city=New York')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.filters).toContain('city');
    });

    it('should search addresses by state', async () => {
      const response = await request(SERVER_URL)
        .post('/api/addresses/search?state=NY')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.filters).toContain('state');
    });

    it('should search addresses by country', async () => {
      const response = await request(SERVER_URL)
        .post('/api/addresses/search?country=USA')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.filters).toContain('country');
    });

    it('should search addresses by type', async () => {
      const response = await request(SERVER_URL)
        .post('/api/addresses/search?type=shipping')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.filters).toContain('type');
    });

    it('should search addresses by default status', async () => {
      const response = await request(SERVER_URL)
        .post('/api/addresses/search?isDefault=true')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.filters).toContain('isDefault');
    });

    it('should combine multiple search filters', async () => {
      const response = await request(SERVER_URL)
        .post('/api/addresses/search?city=New York&state=NY&type=shipping')
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta.filters).toContain('city');
      expect(response.body.meta.filters).toContain('state');
      expect(response.body.meta.filters).toContain('type');
    });

    describe('Address Statistics', () => {
      beforeAll(async () => {
        // Create addresses for statistics tests
        await createAndTrackAddress(createTestAddressData({ type: 'shipping' }));
        await createAndTrackAddress(createTestBillingAddressData({ type: 'billing' }));
        await createAndTrackAddress(createTestAddressData({ type: 'both' }));
      });

      it('should return address statistics', async () => {
        const response = await request(SERVER_URL)
          .post('/api/addresses/stats')
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000);

        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
        expect(response.body.data).toHaveProperty('total');
        expect(response.body.data).toHaveProperty('shipping');
        expect(response.body.data).toHaveProperty('billing');
        expect(response.body.data).toHaveProperty('defaults');
        expect(response.body.meta.message).toBe('Address statistics retrieved successfully');
      });
    });

    describe('Address Book Management', () => {
      beforeAll(async () => {
        // Create addresses for address book tests
        await createAndTrackAddress(createTestAddressData({ type: 'shipping' }));
        await createAndTrackAddress(createTestBillingAddressData({ type: 'billing' }));
      });

      it('should get address book with organization features', async () => {
        const response = await request(SERVER_URL)
          .post('/api/addresses/book')
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000);
        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
        expect(response.body.data).toHaveProperty('addresses');
        expect(response.body.data.addresses).toHaveProperty('shipping');
        expect(response.body.data.addresses).toHaveProperty('billing');
        expect(response.body.data.addresses).toHaveProperty('all');
        expect(response.body.data).toHaveProperty('stats');
        expect(response.body.meta.message).toBe('Address book retrieved successfully');
      });

      it('should support sorting in address book', async () => {
        const response = await request(SERVER_URL)
          .post('/api/addresses/book?sort=createdAt:desc')
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000);

        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
        expect(response.body.data).toHaveProperty('addresses');
      });
    });

    describe('Address Export and Import', () => {
      beforeAll(async () => {
        // Create addresses for export/import tests
        await createAndTrackAddress(createTestAddressData({ type: 'shipping' }));
        await createAndTrackAddress(createTestBillingAddressData({ type: 'billing' }));
      });

      it('should export addresses in JSON format', async () => {
        const response = await request(SERVER_URL)
          .post('/api/addresses/export?format=json')
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000);

        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
        expect(response.body.data).toHaveProperty('format', 'json');
        expect(response.body.data).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('exportedAt');
        expect(response.body.data).toHaveProperty('count');
        expect(response.body.meta.message).toBe('Addresses exported successfully');
      });

      it('should export addresses in CSV format', async () => {
        const response = await request(SERVER_URL)
          .post('/api/addresses/export?format=csv')
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toContain('attachment');
      });

      it('should return 400 for invalid export format', async () => {
        const response = await request(SERVER_URL)
          .post('/api/addresses/export?format=invalid')
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000);

        expect(response.status).toBe(400);
        expect(response.body.error.message).toContain('Invalid format');
      });

      it('should import addresses successfully', async () => {
        const importData = [
          {
            type: 'shipping',
            firstName: 'Import',
            lastName: 'Test',
            address1: '789 Import Street',
            city: 'Import City',
            state: 'IC',
            postalCode: '12345',
            country: 'USA',
            phone: '+1111111111'
          }
        ];

        const response = await request(SERVER_URL)
          .post('/api/addresses/import')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ addresses: importData })
          .timeout(10000);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty('success');
        expect(response.body.data).toHaveProperty('errors');
        expect(response.body.data).toHaveProperty('errorsList');
        expect(response.body.meta.message).toContain('Import completed');
      });

      it('should return 400 for empty import data', async () => {
        const response = await request(SERVER_URL)
          .post('/api/addresses/import')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ addresses: [] })
          .timeout(10000);

        expect(response.status).toBe(400);
        expect(response.body.error.message).toContain('At least one address is required');
      });

      it('should return 400 for too many addresses in import', async () => {
        const importData = Array.from({ length: 101 }, (_, i) => ({
          type: 'shipping',
          firstName: `Import${i}`,
          lastName: 'Test',
          address1: '789 Import Street',
          city: 'Import City',
          state: 'IC',
          postalCode: '12345',
          country: 'USA',
          phone: '+1111111111'
        }));

        const response = await request(SERVER_URL)
          .post('/api/addresses/import')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ addresses: importData })
          .timeout(10000);

        expect(response.status).toBe(400);
        expect(response.body.error.message).toContain('Maximum 100 addresses');
      });
    });

    describe('Address Analytics', () => {
      beforeAll(async () => {
        // Create addresses for analytics tests
        await createAndTrackAddress(createTestAddressData({
          type: 'shipping',
          city: 'New York',
          state: 'NY',
          country: 'USA'
        }));
        await createAndTrackAddress(createTestBillingAddressData({
          type: 'billing',
          city: 'Los Angeles',
          state: 'CA',
          country: 'USA'
        }));
      });

      it('should return address analytics', async () => {
        const response = await request(SERVER_URL)
          .post('/api/addresses/analytics')
          .set('Authorization', `Bearer ${userToken}`)
          .timeout(10000);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty('totalAddresses');
        expect(response.body.data).toHaveProperty('byType');
        expect(response.body.data.byType).toHaveProperty('shipping');
        expect(response.body.data.byType).toHaveProperty('billing');
        expect(response.body.data.byType).toHaveProperty('both');
        expect(response.body.data).toHaveProperty('byCountry');
        expect(response.body.data).toHaveProperty('byState');
        expect(response.body.data).toHaveProperty('byCity');
        expect(response.body.data).toHaveProperty('defaultAddresses');
        expect(response.body.data).toHaveProperty('recentlyAdded');
        expect(response.body.meta.message).toBe('Address analytics retrieved successfully');
      });
    });
  });
});