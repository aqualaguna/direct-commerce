/**
 * Test Setup Utilities for Guest Integration Tests
 * 
 * Common utilities and helper functions for guest API testing
 */

import request from 'supertest';

export const SERVER_URL = 'http://localhost:1337';

/**
 * Generate a unique guest session ID for testing
 */
export function generateGuestSessionId(): string {
  return `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique email for testing
 */
export function generateTestEmail(): string {
  return `testguest${Date.now()}@example.com`;
}

/**
 * Create test guest data with default values
 */
export function createTestGuestData(overrides: Partial<{
  sessionId: string;
  email: string;
  cartId: string;
  metadata: any;
}> = {}): {
  sessionId: string;
  email: string;
  cartId: string;
  metadata?: any;
} {
  return {
    sessionId: overrides.sessionId || generateGuestSessionId(),
    email: overrides.email || generateTestEmail(),
    cartId: overrides.cartId || 'test-cart-id',
    metadata: overrides.metadata || {}
  };
}

/**
 * Create test user data for guest conversion
 */
export function createTestUserData(overrides: Partial<{
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
}> = {}): {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
} {
  const timestamp = Date.now();
  return {
    username: overrides.username || `testuser${timestamp}`,
    password: overrides.password || 'TestPassword123!',
    email: overrides.email || `testuser${timestamp}@example.com`,
    firstName: overrides.firstName || 'John',
    lastName: overrides.lastName || 'Doe'
  };
}

/**
 * Create a test cart for guest operations
 */
export async function createTestCart(
  sessionId: string,
  productId: string,
  productListingId: string,
  quantity: number = 1
): Promise<any> {
  const response = await request(SERVER_URL)
    .post('/api/carts/items')
    .query({ sessionId })
    .send({
      productId,
      productListingId,
      quantity
    })
    .timeout(10000);

  if (response.status !== 200) {
    throw new Error(`Failed to create test cart: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  return response.body.data.cart;
}

/**
 * Create a test guest
 */
export async function createTestGuest(
  sessionId: string,
  email: string,
  cartId: string,
  metadata: any = {}
): Promise<any> {
  const guestData = {
    sessionId,
    email,
    cartId,
    metadata
  };

  const response = await request(SERVER_URL)
    .post('/api/guests')
    .send(guestData)
    .timeout(10000);

  if (response.status !== 200) {
    throw new Error(`Failed to create test guest: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  return response.body.data;
}

/**
 * Get guest by session ID
 */
export async function getGuest(sessionId: string): Promise<any> {
  const response = await request(SERVER_URL)
    .get(`/api/guests/${sessionId}`)
    .timeout(10000);

  if (response.status !== 200) {
    throw new Error(`Failed to get guest: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  return response.body.data;
}

/**
 * Update guest data
 */
export async function updateGuest(sessionId: string, updateData: any): Promise<any> {
  const response = await request(SERVER_URL)
    .put(`/api/guests/${sessionId}`)
    .send(updateData)
    .timeout(10000);

  if (response.status !== 200) {
    throw new Error(`Failed to update guest: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  return response.body.data;
}

/**
 * Convert guest to user
 */
export async function convertGuestToUser(sessionId: string, userData: any): Promise<any> {
  const response = await request(SERVER_URL)
    .post(`/api/guests/${sessionId}/convert`)
    .send(userData)
    .timeout(10000);

  if (response.status !== 200) {
    throw new Error(`Failed to convert guest to user: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  return response.body.data;
}

/**
 * Get guest analytics
 */
export async function getGuestAnalytics(adminToken: string): Promise<any> {
  const response = await request(SERVER_URL)
    .post('/api/guests/analytics')
    .set('Authorization', `Bearer ${adminToken}`)
    .timeout(10000);

  if (response.status !== 200) {
    throw new Error(`Failed to get guest analytics: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  return response.body.data;
}

/**
 * Clean up test data
 */
export async function cleanupTestData(
  guests: any[],
  carts: any[],
  users: any[],
  adminToken: string
): Promise<void> {
  // Clean up guests
  for (const guest of guests) {
    if (guest?.documentId) {
      try {
        await request(SERVER_URL)
          .delete(`/api/guests/${guest.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn(`Failed to clean up guest ${guest.documentId}:`, error.message);
      }
    }
  }

  // Clean up carts
  for (const cart of carts) {
    if (cart?.documentId) {
      try {
        await request(SERVER_URL)
          .delete(`/api/carts/${cart.documentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn(`Failed to clean up cart ${cart.documentId}:`, error.message);
      }
    }
  }

  // Clean up users
  for (const user of users) {
    if (user?.id) {
      try {
        await request(SERVER_URL)
          .delete(`/api/users/${user.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
      } catch (error) {
        console.warn(`Failed to clean up user ${user.id}:`, error.message);
      }
    }
  }
}

/**
 * Wait for a specified amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate guest data structure
 */
export function validateGuestData(guest: any): boolean {
  return (
    guest &&
    typeof guest.documentId === 'string' &&
    typeof guest.sessionId === 'string' &&
    typeof guest.status === 'string' &&
    ['active', 'converted'].includes(guest.status)
  );
}

/**
 * Validate user data structure
 */
export function validateUserData(user: any): boolean {
  return (
    user &&
    typeof user.id === 'number' &&
    typeof user.documentId === 'string' &&
    typeof user.username === 'string' &&
    typeof user.email === 'string' &&
    typeof user.firstName === 'string' &&
    typeof user.lastName === 'string'
  );
}

/**
 * Validate analytics data structure
 */
export function validateAnalyticsData(analytics: any): boolean {
  return (
    analytics &&
    typeof analytics.totalGuest === 'number' &&
    typeof analytics.activeGuest === 'number' &&
    typeof analytics.convertedGuest === 'number' &&
    typeof analytics.conversionRate === 'number' &&
    typeof analytics.completionRate === 'number'
  );
}
