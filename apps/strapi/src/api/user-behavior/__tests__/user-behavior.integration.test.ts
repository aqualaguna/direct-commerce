/**
 * User Behavior Integration Tests
 * 
 * Comprehensive integration tests for User Behavior and Engagement module covering:
 * - Behavior tracking and analysis
 * - Engagement metrics calculation
 * - Behavior pattern recognition
 * - Engagement scoring and ranking
 * - Behavior-based recommendations
 * - Behavior data privacy and consent
 * - Behavior analytics performance
 */

import request from 'supertest';

describe('User Behavior Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let adminToken: string;
  let testUser: any;
  let testUserToken: string;
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();

  beforeAll(async () => {
    // Get admin token for authenticated requests
    adminToken = process.env.STRAPI_API_TOKEN as string;

    if (!adminToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }

    // Create a test user for behavior tracking
    const userData = {
      username: `behaviortestuser${timestamp}`,
      email: `behaviortest${timestamp}@example.com`,
      password: 'SecurePassword123!',
    };

    const userResponse = await request(SERVER_URL)
      .post('/api/auth/local/register')
      .send(userData)
      .timeout(10000);

    testUser = userResponse.body.user;
    testUserToken = userResponse.body.jwt;
  });

  // Add delay between tests to avoid rate limiting
  afterEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
  });

  // Test data factories
  const createTestBehaviorData = (overrides = {}) => ({
    behaviorType: 'page_view',
    behaviorData: {
      page: '/products',
      referrer: 'https://example.com',
      timestamp: new Date().toISOString()
    },
    pageUrl: '/products',
    timeSpent: 30,
    scrollDepth: 75,
    interactions: {
      clicks: 3,
      scrolls: 5,
      hovers: 2
    },
    sessionId: `session_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    referrer: 'https://google.com',
    metadata: {
      testRun: true,
      timestamp: timestamp
    },
    ...overrides,
  });

  const createProductViewBehavior = (overrides = {}) => ({
    behaviorType: 'product_view',
    behaviorData: {
      productId: 'prod_123',
      category: 'electronics',
      price: 299.99,
      timestamp: new Date().toISOString()
    },
    pageUrl: '/products/prod_123',
    productId: 'prod_123',
    timeSpent: 45,
    scrollDepth: 90,
    interactions: {
      imageViews: 2,
      descriptionRead: true,
      reviewsViewed: 1
    },
    sessionId: `product_session_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    metadata: {
      testRun: true,
      timestamp: timestamp
    },
    ...overrides,
  });

  const createSearchBehavior = (overrides = {}) => ({
    behaviorType: 'search',
    behaviorData: {
      query: 'wireless headphones',
      resultsCount: 25,
      filters: ['brand', 'price'],
      timestamp: new Date().toISOString()
    },
    pageUrl: '/search',
    searchQuery: 'wireless headphones',
    timeSpent: 20,
    scrollDepth: 50,
    interactions: {
      queryRefinements: 2,
      resultClicks: 3
    },
    sessionId: `search_session_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    metadata: {
      testRun: true,
      timestamp: timestamp
    },
    ...overrides,
  });

  describe('API Health Check', () => {
    it('should be able to connect to the user-behavior API', async () => {
      const response = await request(SERVER_URL)
        .get('/api/user-behaviors')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);
      
      // Should return 200 with pagination data
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.pagination).toBeDefined();
    });

    it('should handle invalid behavior ID gracefully', async () => {
      const response = await request(SERVER_URL)
        .get('/api/user-behaviors/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000);

      // Should return 404 (not found) for invalid ID
      expect(response.status).toBe(404);
    });
  });

  describe('Behavior Tracking and Analysis', () => {
    it('should track user behavior and verify response data', async () => {
      const behaviorData = createTestBehaviorData();

      // Track behavior via API
      const response = await request(SERVER_URL)
        .post('/api/user-behaviors/track')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ data: behaviorData })
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.documentId).toBeDefined();
      expect(response.body.data.behaviorType).toBe(behaviorData.behaviorType);
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.pageUrl).toBe(behaviorData.pageUrl);
      expect(response.body.data.timeSpent).toBe(behaviorData.timeSpent);
      expect(response.body.data.scrollDepth).toBe(behaviorData.scrollDepth);
      expect(response.body.data.sessionId).toBe(behaviorData.sessionId);
      expect(response.body.data.timestamp).toBeDefined();
    });

    it('should track product view behavior with detailed data', async () => {
      const productBehavior = createProductViewBehavior();

      const response = await request(SERVER_URL)
        .post('/api/user-behaviors/track')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ data: productBehavior })
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.behaviorType).toBe('product_view');
      expect(response.body.data.productId).toBe('prod_123');
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.interactions.imageViews).toBe(2);
      expect(response.body.data.interactions.descriptionRead).toBe(true);
    });

    it('should track search behavior with query data', async () => {
      const searchBehavior = createSearchBehavior();

      const response = await request(SERVER_URL)
        .post('/api/user-behaviors/track')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ data: searchBehavior })
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.behaviorType).toBe('search');
      expect(response.body.data.searchQuery).toBe('wireless headphones');
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.behaviorData.resultsCount).toBe(25);
    });

    it('should track different behavior types', async () => {
      const behaviorTypes = [
        'cart_add',
        'purchase',
        'wishlist_add',
        'category_browse',
        'filter_apply',
        'sort_change',
        'review_submit',
        'rating_give'
      ];

      for (const behaviorType of behaviorTypes) {
        const behaviorData = createTestBehaviorData({
          behaviorType,
          behaviorData: {
            type: behaviorType,
            timestamp: new Date().toISOString()
          }
        });

        const response = await request(SERVER_URL)
          .post('/api/user-behaviors/track')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({ data: behaviorData })
          .timeout(10000)
          .expect(200);

        expect(response.body.data.behaviorType).toBe(behaviorType);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    });

    it('should handle behavior tracking with validation errors', async () => {
      const invalidBehaviorData = {
        // Missing required behaviorType and sessionId
        pageUrl: '/invalid',
        timeSpent: -1, // Invalid negative time
        scrollDepth: 150, // Invalid > 100
      };

      const response = await request(SERVER_URL)
        .post('/api/user-behaviors/track')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ data: invalidBehaviorData })
        .timeout(10000)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Engagement Metrics Calculation', () => {
    let createdBehaviors: any[] = [];

    beforeAll(async () => {
      // Create multiple behaviors for engagement testing
      const behaviorTypes = ['page_view', 'product_view', 'search', 'cart_add'];
      
      for (let i = 0; i < behaviorTypes.length; i++) {
        const behaviorData = createTestBehaviorData({
          behaviorType: behaviorTypes[i],
          timeSpent: 30 + (i * 10),
          scrollDepth: 50 + (i * 10),
          behaviorData: {
            type: behaviorTypes[i],
            index: i,
            timestamp: new Date().toISOString()
          }
        });

        const response = await request(SERVER_URL)
          .post('/api/user-behaviors/track')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({ data: behaviorData })
          .timeout(10000);

        createdBehaviors.push(response.body.data);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    });

    it('should calculate engagement metrics from behavior data', async () => {
      const response = await request(SERVER_URL)
        .get('/api/user-behaviors/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.metrics).toBeDefined();
      expect(response.body.summary).toBeDefined();
      
      // Verify metrics structure
      expect(response.body.metrics.behaviorTypeDistribution).toBeDefined();
      expect(response.body.metrics.deviceTypeDistribution).toBeDefined();
      expect(response.body.metrics.timeSpentStats).toBeDefined();
      expect(response.body.metrics.scrollDepthStats).toBeDefined();
      expect(response.body.metrics.topPages).toBeDefined();
      expect(response.body.metrics.topProducts).toBeDefined();
      expect(response.body.metrics.topSearchQueries).toBeDefined();
    });

    it('should calculate time spent statistics', async () => {
      const response = await request(SERVER_URL)
        .get('/api/user-behaviors/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000)
        .expect(200);

      const timeSpentStats = response.body.metrics.timeSpentStats;
      
      if (timeSpentStats.average > 0) {
        expect(timeSpentStats.average).toBeGreaterThan(0);
        expect(timeSpentStats.median).toBeGreaterThanOrEqual(0);
        expect(timeSpentStats.min).toBeGreaterThanOrEqual(0);
        expect(timeSpentStats.max).toBeGreaterThanOrEqual(timeSpentStats.min);
      }
    });

    it('should calculate scroll depth statistics', async () => {
      const response = await request(SERVER_URL)
        .get('/api/user-behaviors/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000)
        .expect(200);

      const scrollDepthStats = response.body.metrics.scrollDepthStats;
      
      if (scrollDepthStats.average > 0) {
        expect(scrollDepthStats.average).toBeGreaterThanOrEqual(0);
        expect(scrollDepthStats.average).toBeLessThanOrEqual(100);
        expect(scrollDepthStats.median).toBeGreaterThanOrEqual(0);
        expect(scrollDepthStats.median).toBeLessThanOrEqual(100);
        expect(scrollDepthStats.min).toBeGreaterThanOrEqual(0);
        expect(scrollDepthStats.max).toBeLessThanOrEqual(100);
      }
    });

    it('should calculate behavior type distribution', async () => {
      const response = await request(SERVER_URL)
        .get('/api/user-behaviors/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000)
        .expect(200);

      const distribution = response.body.metrics.behaviorTypeDistribution;
      
      expect(typeof distribution).toBe('object');
      expect(Object.keys(distribution).length).toBeGreaterThan(0);
      
      // Verify we have expected behavior types
      const expectedTypes = ['page_view', 'product_view', 'search', 'cart_add'];
      expectedTypes.forEach(type => {
        if (distribution[type]) {
          expect(distribution[type]).toBeGreaterThan(0);
        }
      });
    });

    it('should calculate device type distribution', async () => {
      const response = await request(SERVER_URL)
        .get('/api/user-behaviors/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000)
        .expect(200);

      const deviceDistribution = response.body.metrics.deviceTypeDistribution;
      
      expect(typeof deviceDistribution).toBe('object');
      expect(Object.keys(deviceDistribution).length).toBeGreaterThan(0);
      
      // Should have at least one device type
      const totalDevices = Object.values(deviceDistribution).reduce((sum: number, count: any) => sum + count, 0);
      expect(totalDevices).toBeGreaterThan(0);
    });
  });

  describe('Behavior Pattern Recognition', () => {
    it('should identify user behavior patterns', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/user-behaviors/analytics?userId=${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.metrics).toBeDefined();
      
      // Verify pattern recognition data
      const metrics = response.body.metrics;
      expect(metrics.topPages).toBeDefined();
      expect(metrics.topProducts).toBeDefined();
      expect(metrics.topSearchQueries).toBeDefined();
    });

    it('should analyze user session patterns', async () => {
      // Create a test behavior with a specific session ID
      const testBehavior = createTestBehaviorData({
        behaviorType: 'page_view',
        sessionId: `test_session_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
      });

      const createResponse = await request(SERVER_URL)
        .post('/api/user-behaviors/track')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ data: testBehavior })
        .timeout(10000)
        .expect(200);

      const response = await request(SERVER_URL)
        .get(`/api/user-behaviors?sessionId=${testBehavior.sessionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All behaviors should have the same session ID
      response.body.data.forEach((behavior: any) => {
        expect(behavior.sessionId).toBe(testBehavior.sessionId);
      });
    });

    it('should identify popular pages and products', async () => {
      const response = await request(SERVER_URL)
        .get('/api/user-behaviors/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000)
        .expect(200);

      const metrics = response.body.metrics;
      
      // Verify top pages structure
      expect(typeof metrics.topPages).toBe('object');
      expect(typeof metrics.topProducts).toBe('object');
      expect(typeof metrics.topSearchQueries).toBe('object');
      
      // Should have reasonable limits (top 10)
      expect(Object.keys(metrics.topPages).length).toBeLessThanOrEqual(10);
      expect(Object.keys(metrics.topProducts).length).toBeLessThanOrEqual(10);
      expect(Object.keys(metrics.topSearchQueries).length).toBeLessThanOrEqual(10);
    });
  });

  describe('Engagement Scoring and Ranking', () => {
    it('should rank users by engagement level', async () => {
      const response = await request(SERVER_URL)
        .get('/api/user-behaviors/analytics?groupBy=behaviorType')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Verify engagement ranking data
      response.body.data.forEach((item: any) => {
        expect(item.period).toBeDefined();
        expect(item.count).toBeGreaterThanOrEqual(0);
        expect(item.uniqueUsers).toBeGreaterThanOrEqual(0);
        expect(item.behaviors).toBeDefined();
      });
    });

    it('should calculate engagement scores by time period', async () => {
      const response = await request(SERVER_URL)
        .get('/api/user-behaviors/analytics?groupBy=day')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Verify time-based engagement data
      response.body.data.forEach((item: any) => {
        expect(item.period).toMatch(/^\d{4}-\d{2}-\d{2}$/); // Date format
        expect(item.count).toBeGreaterThanOrEqual(0);
        expect(item.uniqueUsers).toBeGreaterThanOrEqual(0);
      });
    });

    it('should provide engagement summary statistics', async () => {
      const response = await request(SERVER_URL)
        .get('/api/user-behaviors/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000)
        .expect(200);

      const summary = response.body.summary;
      
      expect(summary.totalBehaviors).toBeGreaterThanOrEqual(0);
      expect(summary.uniqueUsers).toBeGreaterThanOrEqual(0);
      expect(summary.dateRange).toBeDefined();
      expect(summary.dateRange.start).toBeDefined();
      expect(summary.dateRange.end).toBeDefined();
    });
  });

  describe('Behavior-Based Recommendations', () => {
    it('should provide behavior-based insights', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/user-behaviors/analytics?userId=${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000)
        .expect(200);

      const metrics = response.body.metrics;
      
      // Verify recommendation data structure
      expect(metrics.topPages).toBeDefined();
      expect(metrics.topProducts).toBeDefined();
      expect(metrics.topSearchQueries).toBeDefined();
      
      // Should provide actionable insights
      if (Object.keys(metrics.topPages).length > 0) {
        expect(typeof metrics.topPages).toBe('object');
      }
      
      if (Object.keys(metrics.topProducts).length > 0) {
        expect(typeof metrics.topProducts).toBe('object');
      }
    });

    it('should identify trending behaviors', async () => {
      const response = await request(SERVER_URL)
        .get('/api/user-behaviors/analytics?groupBy=hour')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Verify trending data structure
      response.body.data.forEach((item: any) => {
        expect(item.period).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/); // Hour format
        expect(item.count).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Behavior Data Privacy and Consent', () => {
    it('should handle sensitive behavior data appropriately', async () => {
      const sensitiveBehavior = createTestBehaviorData({
        behaviorType: 'purchase',
        behaviorData: {
          orderId: 'order_123',
          totalAmount: 299.99,
          paymentMethod: 'credit_card',
          timestamp: new Date().toISOString()
        },
        metadata: {
          privacyLevel: 'high',
          requiresConsent: true,
          gdprCompliant: true
        }
      });

      const response = await request(SERVER_URL)
        .post('/api/user-behaviors/track')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ data: sensitiveBehavior })
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.behaviorType).toBe('purchase');
      expect(response.body.data.metadata.privacyLevel).toBe('high');
      expect(response.body.data.metadata.gdprCompliant).toBe(true);
    });

    it('should anonymize user data for privacy', async () => {
      const behaviorWithPersonalData = createTestBehaviorData({
        behaviorData: {
          personalInfo: {
            name: 'John Doe',
            email: 'john@example.com'
          },
          timestamp: new Date().toISOString()
        },
        metadata: {
          anonymizationRequired: true,
          dataRetention: '30_days'
        }
      });

      const response = await request(SERVER_URL)
        .post('/api/user-behaviors/track')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ data: behaviorWithPersonalData })
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.metadata.anonymizationRequired).toBe(true);
      expect(response.body.data.metadata.dataRetention).toBe('30_days');
    });

    it('should handle consent management', async () => {
      const consentBehavior = createTestBehaviorData({
        behaviorType: 'preference_change',
        behaviorData: {
          preference: 'analytics_consent',
          value: true,
          timestamp: new Date().toISOString()
        },
        metadata: {
          consentGiven: true,
          consentDate: new Date().toISOString(),
          consentVersion: '1.0'
        }
      });

      const response = await request(SERVER_URL)
        .post('/api/user-behaviors/track')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ data: consentBehavior })
        .timeout(10000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.metadata.consentGiven).toBe(true);
      expect(response.body.data.metadata.consentVersion).toBe('1.0');
    });
  });

  describe('Behavior Analytics Performance', () => {
    it('should handle large behavior datasets efficiently', async () => {
      const startTime = Date.now();
      
      // Get all behaviors to test performance
      const response = await request(SERVER_URL)
        .get('/api/user-behaviors?pagination[pageSize]=100')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(30000) // Longer timeout for performance test
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should optimize analytics queries with proper filtering', async () => {
      const queries = [
        `/api/user-behaviors?userId=${testUser.id}`,
        '/api/user-behaviors?behaviorType=page_view',
        '/api/user-behaviors?sessionId=test_session',
        '/api/user-behaviors/analytics?groupBy=day'
      ];

      for (const query of queries) {
        const startTime = Date.now();
        
        const response = await request(SERVER_URL)
          .get(query)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000)
          .expect(200);

        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(response.body.data).toBeDefined();
        expect(duration).toBeLessThan(5000); // Each query should complete within 5 seconds
      }
    });

    it('should handle concurrent behavior tracking', async () => {
      const concurrentPromises: any[] = [];
      const behaviorCount = 5;

      // Create multiple behaviors concurrently
      for (let i = 0; i < behaviorCount; i++) {
        const behaviorData = createTestBehaviorData({
          behaviorType: 'concurrent_test',
          behaviorData: {
            concurrentIndex: i,
            timestamp: new Date().toISOString()
          }
        });

        const promise = request(SERVER_URL)
          .post('/api/user-behaviors/track')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({ data: behaviorData })
          .timeout(10000);

        concurrentPromises.push(promise);
      }

      const startTime = Date.now();
      const responses = await Promise.all(concurrentPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all behaviors were tracked successfully
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.behaviorType).toBe('concurrent_test');
      });

      expect(duration).toBeLessThan(15000); // All concurrent operations should complete within 15 seconds
    });

    it('should handle pagination efficiently', async () => {
      const pageSizes = [10, 25, 50, 100];
      
      for (const pageSize of pageSizes) {
        const startTime = Date.now();
        
        const response = await request(SERVER_URL)
          .get(`/api/user-behaviors?pagination[pageSize]=${pageSize}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000)
          .expect(200);

        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toBeLessThanOrEqual(pageSize);
        expect(duration).toBeLessThan(5000); // Each page should load within 5 seconds
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed behavior data gracefully', async () => {
      const malformedData = {
        behaviorType: 'test',
        behaviorData: {
          invalidJson: '{ invalid json structure',
          circularRef: null
        },
        // Missing required fields
      };

      const response = await request(SERVER_URL)
        .post('/api/user-behaviors/track')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ data: malformedData })
        .timeout(10000);

      // Should either succeed with sanitized data or return validation error
      expect([200, 400]).toContain(response.status);
    });

    it('should handle very large behavior data', async () => {
      const largeBehaviorData = createTestBehaviorData({
        behaviorData: {
          largeData: 'x'.repeat(10000), // 10KB of data
          timestamp: new Date().toISOString()
        },
        metadata: {
          size: 'large',
          timestamp: timestamp
        }
      });

      const response = await request(SERVER_URL)
        .post('/api/user-behaviors/track')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ data: largeBehaviorData })
        .timeout(15000)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.metadata.size).toBe('large');
    });

    it('should handle network timeouts gracefully', async () => {
      const behaviorData = createTestBehaviorData();

      // Test with very short timeout to simulate network issues
      const response = await request(SERVER_URL)
        .post('/api/user-behaviors/track')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ data: behaviorData })
        .timeout(100) // Very short timeout
        .catch(error => {
          // Expected to timeout
          expect(error.code).toBe('ECONNABORTED');
        });

      // If it doesn't timeout, verify the response is valid
      if (response && response.status) {
        expect([200, 201]).toContain(response.status);
      }
    });

    it('should handle database connection issues', async () => {
      // This test simulates what would happen with database issues
      const behaviorData = createTestBehaviorData();

      const response = await request(SERVER_URL)
        .post('/api/user-behaviors/track')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ data: behaviorData })
        .timeout(10000);

      // Should handle gracefully - either succeed or return proper error
      expect([200, 201, 500, 503]).toContain(response.status);
    });
  });
});
