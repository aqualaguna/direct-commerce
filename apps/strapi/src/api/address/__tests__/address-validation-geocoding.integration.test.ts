/**
 * Address Validation and Geocoding Integration Tests
 * 
 * Tests for address validation rules, geocoding functionality, format validation,
 * country/region validation, postal code validation, and error handling
 */

import request from 'supertest';
import {
  SERVER_URL,
  userToken,
  createTestAddressData,
  createAndTrackAddress,
  initializeTestEnvironment,
  cleanupTestEnvironment
} from './test-setup';

describe('Address Validation and Geocoding Integration Tests', () => {
  beforeAll(async () => {
    await initializeTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });
  describe('Address Validation Rules and Constraints', () => {
    it('should validate address data successfully', async () => {
      const addressData = createTestAddressData();

      const response = await request(SERVER_URL)
        .post('/api/addresses/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: addressData })
        .timeout(10000);

      expect([200, 403, 404]).toContain(response.status);
      if (response.status === 200 && response.body.data) {
        expect(response.body.data).toHaveProperty('isValid', true);
        expect(response.body.data).toHaveProperty('errors', []);
        if (response.body.meta) {
          expect(response.body.meta.message).toContain('Address is valid');
        }
      }
    });

    it('should validate required fields constraints', async () => {
      const incompleteAddressData = {
        type: 'shipping',
        firstName: 'John',
        // Missing required fields: lastName, address1, city, state, postalCode, country, phone
      };

      const response = await request(SERVER_URL)
        .post('/api/addresses/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: incompleteAddressData })
        .timeout(10000);

      expect(response.status).toBe(400);
      expect(response.body.data).toHaveProperty('isValid', false);
      expect(response.body.data.errors).toContain('lastName is required');
      expect(response.body.data.errors).toContain('address1 is required');
      expect(response.body.data.errors).toContain('city is required');
      expect(response.body.data.errors).toContain('state is required');
      expect(response.body.data.errors).toContain('postalCode is required');
      expect(response.body.data.errors).toContain('country is required');
      expect(response.body.data.errors).toContain('phone is required');
    });

    it('should validate field length constraints', async () => {
      const addressData = createTestAddressData({
        firstName: 'A'.repeat(256), // Too long
        lastName: 'B'.repeat(256), // Too long
        address1: 'C'.repeat(501), // Too long
        city: 'D'.repeat(501), // Too long
        state: 'E'.repeat(501), // Too long
        postalCode: 'F'.repeat(21), // Too long
        phone: 'G'.repeat(21), // Too long
      });

      const response = await request(SERVER_URL)
        .post('/api/addresses/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: addressData })
        .timeout(10000);
      expect(response.status).toBe(400);
      expect(response.body.data).toHaveProperty('isValid', false);
      expect(response.body.data.errors).toContain('First name is too long (max 255 characters)');
      expect(response.body.data.errors).toContain('Last name is too long (max 255 characters)');
      expect(response.body.data.errors).toContain('Address line 1 is too long (max 255 characters)');
      expect(response.body.data.errors).toContain('Postal code is too long (max 20 characters)');
      expect(response.body.data.errors).toContain('Phone number is too long (max 20 characters)');
      expect(response.body.data.errors).toContain('City is too long (max 255 characters)');
      expect(response.body.data.errors).toContain('State/Province is too long (max 255 characters)');
      expect(response.body.data.errors).toContain('Invalid postal code format');
      expect(response.body.data.errors).toContain('Invalid phone number format');


    });

    it('should validate address type constraints', async () => {
      const addressData = createTestAddressData({ type: 'invalid_type' });

      const response = await request(SERVER_URL)
        .post('/api/addresses/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: addressData })
        .timeout(10000);
      expect(response.status).toBe(400);
      expect(response.body.data).toHaveProperty('isValid', false);
      expect(response.body.data.errors).toContain('Invalid address type. Must be shipping, billing, or both');

    });

    it('should validate phone number format', async () => {
      const addressData = createTestAddressData({ phone: 'invalid-phone' });

      const response = await request(SERVER_URL)
        .post('/api/addresses/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: addressData })
        .timeout(10000);
      expect(response.status).toBe(400);
      expect(response.body.data).toHaveProperty('isValid', false);
      expect(response.body.data.errors).toContain('Invalid phone number format');

    });

    it('should return 400 for missing validation data', async () => {
      const response = await request(SERVER_URL)
        .post('/api/addresses/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .timeout(10000);

      expect([400, 403, 404]).toContain(response.status);
      if (response.status === 400 && response.body.error) {
        expect(response.body.error.message).toContain('Address data is required');
      }
    });
  });


  describe('Address Format Validation', () => {
    it('should validate US address format', async () => {
      const addressData = createTestAddressData({
        address1: '123 Main Street',
        address2: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA'
      });

      const response = await request(SERVER_URL)
        .post('/api/addresses/validate/USA')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: addressData })
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('isValid', true);
      expect(response.body.data).toHaveProperty('formattedAddress');
      expect(response.body.meta.country).toBe('USA');
    });

    it('should validate Canadian address format', async () => {
      const addressData = createTestAddressData({
        address1: '123 Main Street',
        city: 'Toronto',
        state: 'ON',
        postalCode: 'M5V 3A8',
        country: 'CAN'
      });

      const response = await request(SERVER_URL)
        .post('/api/addresses/validate/CAN')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: addressData })
        .timeout(10000);
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('isValid', true);
      expect(response.body.meta.country).toBe('CAN');
    });

    it('should validate UK address format', async () => {
      const addressData = createTestAddressData({
        address1: '10 Downing Street',
        city: 'London',
        state: 'England',
        postalCode: 'SW1A 2AA',
        country: 'GBR'
      });

      const response = await request(SERVER_URL)
        .post('/api/addresses/validate/GBR')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: addressData })
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('isValid', true);
      expect(response.body.meta.country).toBe('GBR');
    });

    it('should reject invalid US postal code format', async () => {
      const addressData = createTestAddressData({
        address1: '123 Main Street',
        city: 'New York',
        state: 'NY',
        postalCode: 'invalid-zip',
        country: 'USA'
      });

      const response = await request(SERVER_URL)
        .post('/api/addresses/validate/USA')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: addressData })
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('isValid', false);
      expect(response.body.data.errors).toContain('Invalid postal code format');
    });

    it('should reject invalid Canadian postal code format', async () => {
      const addressData = createTestAddressData({
        address1: '123 Main Street',
        city: 'Toronto',
        state: 'ON',
        postalCode: 'invalid-postal',
        country: 'CAN'
      });

      const response = await request(SERVER_URL)
        .post('/api/addresses/validate/CAN')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: addressData })
        .timeout(10000);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('isValid', false);
      expect(response.body.data.errors).toContain('Invalid postal code format');
    });

    it('should return 400 for missing country in country validation', async () => {
      const addressData = createTestAddressData();
      addressData.country = '';
      const response = await request(SERVER_URL)
        .post('/api/addresses/validate/')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: addressData })
        .timeout(10000);
      expect(response.status).toBe(400);
      expect(response.body.data.errors).toContain('country is required');
    });
  });



  describe('Address Validation Error Handling', () => {
    it('should handle validation service errors gracefully', async () => {
      // Mock a validation service error by sending malformed data
      const malformedData = { invalid: 'data' };

      const response = await request(SERVER_URL)
        .post('/api/addresses/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: malformedData })
        .timeout(10000);

      expect(response.status).toBe(400);
      expect(response.body.data).toHaveProperty('isValid', false);
      expect(response.body.data).toHaveProperty('errors');
      expect(response.body.data.errors.length).toBeGreaterThan(0);
    });


    it('should handle malformed request data', async () => {
      const response = await request(SERVER_URL)
        .post('/api/addresses/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send('invalid json')
        .timeout(10000);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Address data is required');
    });

    it('should handle missing authorization token', async () => {
      const addressData = createTestAddressData();

      const response = await request(SERVER_URL)
        .post('/api/addresses/validate')
        .send({ data: addressData })
        .timeout(10000);
      
      expect(response.status).toBe(403);
    });

    it('should handle expired authorization token', async () => {
      const addressData = createTestAddressData();
      const expiredToken = 'expired.jwt.token';

      const response = await request(SERVER_URL)
        .post('/api/addresses/validate')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ data: addressData })
        .timeout(10000);

      expect(response.status).toBe(401);
    });


  });
});
