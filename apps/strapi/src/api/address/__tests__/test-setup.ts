/**
 * Address Integration Tests - Base Setup and Shared Utilities
 * 
 * This file contains shared test setup, utilities, and helper functions
 * used across all address integration test files.
 */

import request from 'supertest';
import { retryApiRequest } from '../../../utils/test-helpers';

export const SERVER_URL = 'http://localhost:1337';

// Global test state
export let userToken: string;
export let testUser: any;
export let adminToken: string;

// Generate unique test data with timestamp
export const timestamp = Date.now();

// Track all created addresses and users for cleanup
export const createdAddresses: any[] = [];
export const createdUsers: any[] = [];
export const createdGuestAddresses: any[] = [];

/**
 * Initialize test environment and create test user
 */
export const initializeTestEnvironment = async () => {
  adminToken = process.env.STRAPI_API_TOKEN as string;

  if (!adminToken) {
    throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
  }

  // Create test user for address operations
  const userData = {
    username: `testuser${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    email: `test${timestamp}_${Math.random().toString(36).substr(2, 9)}@example.com`,
    password: 'SecurePassword123!',
  };

  const userResponse = await retryApiRequest(
    () => request(SERVER_URL)
      .post('/api/auth/local/register')
      .send(userData)
      .timeout(10000),
    {
      maxRetries: 30,
      baseDelayMs: 2000,
      retryCondition: (response) => response.status === 429
    }
  );

  if (userResponse.status === 200 && userResponse.body.user) {
    testUser = userResponse.body.user;
    userToken = userResponse.body.jwt;
    createdUsers.push(testUser);
  } else {
    throw new Error('Failed to create test user for address tests');
  }
};

/**
 * Clean up all created addresses and users
 */
export const cleanupTestEnvironment = async () => {
  // Clean up addresses
  for (const address of createdAddresses) {
    try {
      await request(SERVER_URL)
        .delete(`/api/addresses/${address.documentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .timeout(10000);
    } catch (error) {
      // Failed to delete address during cleanup - this is expected in some test scenarios
    }
  }

  // Clean up guest addresses
  for (const address of createdGuestAddresses) {
    try {
      await request(SERVER_URL)
        .delete(`/api/addresses/${address.documentId}`)
        .query({ sessionId: address.sessionId })
        .timeout(10000);
    } catch (error) {
      // Failed to delete address during cleanup - this is expected in some test scenarios
    }
  }

  // Clean up users
  for (const user of createdUsers) {
    try {
      await request(SERVER_URL)
        .delete(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
    } catch (error) {
      // Failed to delete user during cleanup - this is expected in some test scenarios
    }
  }
};

/**
 * Test data factories
 */
export const createTestAddressData = (overrides = {}) => ({
  type: 'shipping',
  firstName: 'John',
  lastName: 'Doe',
  company: 'Test Company',
  address1: '123 Main Street',
  address2: 'Apt 4B',
  city: 'New York',
  state: 'NY',
  postalCode: '10001',
  country: 'USA',
  phone: '+1234567890',
  isDefault: false,
  ...overrides,
});

export const createTestBillingAddressData = (overrides = {}) => ({
  type: 'billing',
  firstName: 'Jane',
  lastName: 'Smith',
  address1: '456 Oak Avenue',
  city: 'Los Angeles',
  state: 'CA',
  postalCode: '90210',
  country: 'USA',
  phone: '+1987654321',
  isDefault: false,
  ...overrides,
});

/**
 * Helper function to create address and track for cleanup
 */
export const createAndTrackAddress = async (addressData: any) => {
  const response = await retryApiRequest(
    () => request(SERVER_URL)
      .post('/api/addresses')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ data: addressData })
      .timeout(10000),
    {
      maxRetries: 30,
      baseDelayMs: 2000,
      retryCondition: (response) => response.status === 429
    }
  );

  // Ensure address was created successfully
  if (response.status !== 200) {
    throw new Error(`Address creation failed with status ${response.status}: ${JSON.stringify(response.body)}`);
  }

  if (!response.body || !response.body.data) {
    throw new Error('Address creation response missing data');
  }

  // Track created address for cleanup after tests
  createdAddresses.push(response.body.data);
  return response;
};

/**
 * Helper function to track created address for cleanup after tests
 * @param response - The response from the createAndTrackAddress function
 * @returns 
 */
export const trackCreatedAddress = (response: any) => {
  createdAddresses.push(response.body.data);
};

/**
 * Helper function to get test address from response
 */
export const getTestAddress = (response: any) => {
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}: ${JSON.stringify(response.body)}`);
  }
  
  if (!response.body || !response.body.data) {
    throw new Error('Response missing data field');
  }
  
  return response.body.data;
};

/**
 * Helper function to create another test user
 */
export const createTestUser = async (userPrefix: string = 'testuser') => {
  const userData = {
    username: `${userPrefix}${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    email: `${userPrefix}${timestamp}_${Math.random().toString(36).substr(2, 9)}@example.com`,
    password: 'SecurePassword123!',
  };

  const userResponse = await retryApiRequest(
    () => request(SERVER_URL)
      .post('/api/auth/local/register')
      .send(userData)
      .timeout(10000),
    {
      maxRetries: 30,
      baseDelayMs: 2000,
      retryCondition: (response) => response.status === 429
    }
  );

  if (userResponse.status === 200 && userResponse.body.user) {
    const user = userResponse.body.user;
    const token = userResponse.body.jwt;
    createdUsers.push(user);
    return { user, token };
  } else {
    throw new Error(`Failed to create ${userPrefix} for tests`);
  }
};

/**
 * Common test assertions for API responses
 */
export const expectApiResponse = (response: any, expectedStatus: number | number[]) => {
  if (Array.isArray(expectedStatus)) {
    expect(expectedStatus).toContain(response.status);
  } else {
    expect(response.status).toBe(expectedStatus);
  }
};

/**
 * Common test assertions for address data
 */
export const expectAddressData = (address: any, expectedData: any) => {
  expect(address).toHaveProperty('documentId');
  expect(address.user).toBe(testUser.id);
  
  Object.keys(expectedData).forEach(key => {
    if (expectedData[key] !== undefined) {
      expect(address[key]).toBe(expectedData[key]);
    }
  });
};

/**
 * Guest-specific test utilities
 */

/**
 * Generate a unique guest session ID
 */
export const generateGuestSessionId = (prefix: string = 'guest_session') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Helper function to create and track guest address
 */
export const createAndTrackGuestAddress = async (addressData: any, sessionId: string) => {
  const response = await retryApiRequest(
    () => request(SERVER_URL)
      .post('/api/addresses')
      .query({ sessionId })
      .send({ data: addressData })
      .timeout(10000),
    {
      maxRetries: 30,
      baseDelayMs: 2000,
      retryCondition: (response) => response.status === 429
    }
  );

  if (response.status === 200 && response.body.data) {
    createdGuestAddresses.push(response.body.data);
  }
  return response;
};

/**
 * Helper function to get guest address from response
 */
export const getGuestAddress = (response: any) => {
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}: ${JSON.stringify(response.body)}`);
  }
  
  if (!response.body || !response.body.data) {
    throw new Error('Response missing data field');
  }
  
  return response.body.data;
};

/**
 * Helper function to track created guest address for cleanup
 */
export const trackCreatedGuestAddress = (response: any) => {
  if (response.status === 200 && response.body.data) {
    createdGuestAddresses.push(response.body.data);
  }
};

/**
 * Common test assertions for guest address data
 */
export const expectGuestAddressData = (address: any, expectedData: any, sessionId: string) => {
  expect(address).toHaveProperty('documentId');
  expect(address.sessionId).toBe(sessionId);
  expect(address.user).toBeNull();
  
  Object.keys(expectedData).forEach(key => {
    if (expectedData[key] !== undefined) {
      expect(address[key]).toBe(expectedData[key]);
    }
  });
};
