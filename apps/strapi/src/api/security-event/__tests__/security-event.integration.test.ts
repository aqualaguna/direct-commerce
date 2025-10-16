/**
 * Security Event Integration Tests
 * 
 * Comprehensive integration tests for Security Event Management module covering:
 * - Security event logging and recording
 * - Security event analysis and alerting
 * - Security event correlation and patterns
 * - Security event response workflows
 * - Security event reporting and compliance
 * - Security event data retention
 * - Security event performance optimization
 */

import request from 'supertest';

describe('Security Event Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let apiToken: string;
  let testUser: any;
  let testUserToken: string;
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();

  beforeAll(async () => {
    // Get admin token for authenticated requests
    apiToken = process.env.STRAPI_API_TOKEN as string;

    if (!apiToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }

    // Create a test user for security event tests
    const userData = {
      username: `securityuser${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      email: `security${timestamp}_${Math.random().toString(36).substr(2, 9)}@example.com`,
      password: 'SecurePassword123!',
    };

    const userResponse = await request(SERVER_URL)
      .post('/api/auth/local/register')
      .send(userData)
      .expect(200);
    testUser = userResponse.body.user;
    testUserToken = userResponse.body.jwt;

  });

  beforeEach(async () => {
    // Clean up security events before each test to ensure isolation
    try {
      const response = await request(SERVER_URL)
        .get('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .query({ pagination: { page: 1, pageSize: 1000 } });

      if (response.body.data && Array.isArray(response.body.data)) {
        // Delete all security events
        for (const event of response.body.data) {
          await request(SERVER_URL)
            .delete(`/api/security-events/${event.documentId}`)
            .set('Authorization', `Bearer ${apiToken}`);
        }
      }
    } catch (error) {
      // Ignore cleanup errors - tests should still run
      console.warn('Failed to cleanup security events:', error.message);
    }
  });

  afterAll(async () => {
    // Clean up test users
    try {
      if (testUser?.id) {
        await request(SERVER_URL)
          .delete(`/api/users/${testUser.id}`)
          .set('Authorization', `Bearer ${apiToken}`);
      }
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Failed to cleanup test users:', error.message);
    }
  });

  // Test data factories
  const createTestSecurityEventData = (overrides = {}) => ({
    user: testUser.documentId,
    eventType: 'failed_login',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Test Browser)',
    location: 'Test Location',
    attemptCount: 1,
    reason: 'Invalid credentials',
    severity: 'medium',
    timestamp: new Date().toISOString(),
    eventData: {
      username: testUser.username,
      attemptTime: new Date().toISOString(),
      userAgent: 'Mozilla/5.0 (Test Browser)',
    },
    metadata: {
      source: 'login_form',
      sessionId: 'test-session-123',
    },
    ...overrides,
  });


  describe('Security Event Logging and Recording', () => {
    it('should create security event with all required fields', async () => {
      const eventData = createTestSecurityEventData();

      const response = await request(SERVER_URL)
        .post('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: eventData })

      expect(response.body.data).toBeDefined();
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.eventType).toBe('failed_login');
      expect(response.body.data.ipAddress).toBe('192.168.1.1');
      expect(response.body.data.severity).toBe('medium');
    });

    it('should create security event with minimal required fields', async () => {
      const eventData = {
        user: testUser.documentId,
        eventType: 'suspicious_activity',
        ipAddress: '192.168.1.2',
        severity: 'high',
        timestamp: new Date().toISOString(),
      };

      const response = await request(SERVER_URL)
        .post('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: eventData })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.eventType).toBe('suspicious_activity');
      expect(response.body.data.severity).toBe('high');
 // default value
    });

    it('should log different types of security events', async () => {
      const eventTypes = [
        'failed_login',
        'suspicious_activity',
        'password_change',
        'account_lockout',
        'admin_action',
        'data_access',
        'permission_change',
        'api_abuse',
        'brute_force_attempt',
        'unusual_location',
        'multiple_sessions',
        'account_deletion'
      ];

      for (const eventType of eventTypes) {
        const eventData = createTestSecurityEventData({
          eventType,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        });

        const response = await request(SERVER_URL)
          .post('/api/security-events')
          .set('Authorization', `Bearer ${apiToken}`)
          .send({ data: eventData })
          .expect(200);

        expect(response.body.data.eventType).toBe(eventType);
      }
    });

    it('should log security events with different severity levels', async () => {
      const severityLevels = ['low', 'medium', 'high', 'critical'];

      for (const severity of severityLevels) {
        const eventData = createTestSecurityEventData({
          eventType: 'suspicious_activity',
          severity,
          reason: `Test event with ${severity} severity`,
        });

        const response = await request(SERVER_URL)
          .post('/api/security-events')
          .set('Authorization', `Bearer ${apiToken}`)
          .send({ data: eventData })
          .expect(200);

        expect(response.body.data.severity).toBe(severity);
      }
    });

    it('should store event data and metadata as JSON', async () => {
      const eventData = createTestSecurityEventData({
        eventData: {
          username: testUser.username,
          attemptTime: new Date().toISOString(),
          userAgent: 'Mozilla/5.0 (Test Browser)',
          additionalInfo: {
            browser: 'Chrome',
            os: 'Windows',
            device: 'Desktop'
          }
        },
        metadata: {
          source: 'api_endpoint',
          sessionId: 'test-session-456',
          requestId: 'req-123',
          additionalContext: {
            endpoint: '/api/auth/local',
            method: 'POST'
          }
        }
      });

      const response = await request(SERVER_URL)
        .post('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: eventData })
        .expect(200);

      expect(response.body.data.eventData).toBeDefined();
      expect(response.body.data.eventData.username).toBe(testUser.username);
      expect(response.body.data.metadata).toBeDefined();
      expect(response.body.data.metadata.source).toBe('api_endpoint');
    });

    it('should handle IP address validation', async () => {
      const validIPs = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '2001:0db8:0000:0000:0000:0000:0000:0001'];

      for (const ip of validIPs) {
        const eventData = createTestSecurityEventData({
          ipAddress: ip,
        });

        const response = await request(SERVER_URL)
          .post('/api/security-events')
          .set('Authorization', `Bearer ${apiToken}`)
          .send({ data: eventData })
          .expect(200);

        expect(response.body.data.ipAddress).toBe(ip);
      }
    });

    it('should handle long user agent strings', async () => {
      const longUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      const eventData = createTestSecurityEventData({
        userAgent: longUserAgent,
      });

      const response = await request(SERVER_URL)
        .post('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: eventData })
        .expect(200);

      expect(response.body.data.userAgent).toBe(longUserAgent);
    });
  });

  describe('Security Event Analysis and Alerting', () => {
    it('should retrieve security events by event type', async () => {
      // Create multiple events of different types
      const eventTypes = ['failed_login', 'suspicious_activity', 'api_abuse'];
      
      for (const eventType of eventTypes) {
        const eventData = createTestSecurityEventData({
          eventType,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        });

        await request(SERVER_URL)
          .post('/api/security-events')
          .set('Authorization', `Bearer ${apiToken}`)
          .send({ data: eventData })
          .expect(200);
      }

      // Retrieve events by type
      const response = await request(SERVER_URL)
        .get('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .query({ 
          filters: { eventType: 'failed_login' },
          pagination: { page: 1, pageSize: 10 }
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should retrieve security events by severity level', async () => {
      // Create events with different severity levels
      const severityLevels = ['low', 'medium', 'high', 'critical'];
      
      for (const severity of severityLevels) {
        const eventData = createTestSecurityEventData({
          eventType: 'suspicious_activity',
          severity,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        });

        await request(SERVER_URL)
          .post('/api/security-events')
          .set('Authorization', `Bearer ${apiToken}`)
          .send({ data: eventData })
          .expect(200);
      }

      // Retrieve high severity events
      const response = await request(SERVER_URL)
        .get('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .query({ 
          filters: { severity: 'high' },
          pagination: { page: 1, pageSize: 10 }
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should retrieve security events by status', async () => {
      // Create multiple events
      const eventData1 = createTestSecurityEventData({
        eventType: 'failed_login',
        ipAddress: '192.168.1.10',
      });

      const eventData2 = createTestSecurityEventData({
        eventType: 'suspicious_activity',
        ipAddress: '192.168.1.11',
      });

      await request(SERVER_URL)
        .post('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: eventData1 })
        .expect(200);

      await request(SERVER_URL)
        .post('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: eventData2 })
        .expect(200);

      // Retrieve all events
      const response = await request(SERVER_URL)
        .get('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .query({ 
          pagination: { page: 1, pageSize: 10 }
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should retrieve security events by user', async () => {
      const eventData = createTestSecurityEventData({
        eventType: 'data_access',
        ipAddress: '192.168.1.20',
      });

      await request(SERVER_URL)
        .post('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: eventData })
        .expect(200);

      // Retrieve events by user
      const response = await request(SERVER_URL)
        .get('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .query({ 
          filters: { user: { id: testUser.id } },
          pagination: { page: 1, pageSize: 10 }
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should retrieve security events by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const eventData = createTestSecurityEventData({
        eventType: 'admin_action',
        timestamp: now.toISOString(),
        ipAddress: '192.168.1.30',
      });

      await request(SERVER_URL)
        .post('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: eventData })
        .expect(200);

      // Retrieve events by date range
      const response = await request(SERVER_URL)
        .get('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .query({ 
          filters: { 
            timestamp: { 
              $gte: yesterday.toISOString(),
              $lte: tomorrow.toISOString()
            }
          },
          pagination: { page: 1, pageSize: 10 }
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should count security events by type', async () => {
      // Create multiple events of the same type
      const eventType = 'brute_force_attempt';
      
      for (let i = 0; i < 3; i++) {
        const eventData = createTestSecurityEventData({
          eventType,
          attemptCount: i + 1,
          ipAddress: `192.168.1.${40 + i}`,
        });

        await request(SERVER_URL)
          .post('/api/security-events')
          .set('Authorization', `Bearer ${apiToken}`)
          .send({ data: eventData })
          .expect(200);
      }

      // Count events by type
      const response = await request(SERVER_URL)
        .get('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .query({ 
          filters: { eventType },
          pagination: { page: 1, pageSize: 10 }
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Security Event Correlation and Patterns', () => {
    it('should detect multiple failed login attempts from same IP', async () => {
      const ipAddress = '192.168.1.100';
      
      // Create multiple failed login events from same IP
      for (let i = 0; i < 5; i++) {
        const eventData = createTestSecurityEventData({
          eventType: 'failed_login',
          ipAddress,
          attemptCount: i + 1,
          reason: `Failed login attempt ${i + 1}`,
        });

        await request(SERVER_URL)
          .post('/api/security-events')
          .set('Authorization', `Bearer ${apiToken}`)
          .send({ data: eventData })
          .expect(200);
      }

      // Retrieve events from same IP
      const response = await request(SERVER_URL)
        .get('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .query({ 
          filters: { ipAddress },
          pagination: { page: 1, pageSize: 10 }
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(5);
    });

    it('should detect suspicious activity patterns', async () => {
      const suspiciousEvents = [
        { eventType: 'unusual_location', ipAddress: '192.168.1.101' },
        { eventType: 'multiple_sessions', ipAddress: '192.168.1.102' },
        { eventType: 'api_abuse', ipAddress: '192.168.1.103' },
      ];

      for (const event of suspiciousEvents) {
        const eventData = createTestSecurityEventData({
          eventType: event.eventType,
          ipAddress: event.ipAddress,
          severity: 'high',
          reason: `Suspicious ${event.eventType} detected`,
        });

        await request(SERVER_URL)
          .post('/api/security-events')
          .set('Authorization', `Bearer ${apiToken}`)
          .send({ data: eventData })
          .expect(200);
      }

      // Retrieve all suspicious activity events
      const response = await request(SERVER_URL)
        .get('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .query({ 
          filters: { 
            eventType: { $in: ['unusual_location', 'multiple_sessions', 'api_abuse'] }
          },
          pagination: { page: 1, pageSize: 10 }
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(3);
    });

    it('should track attempt counts for brute force detection', async () => {
      const eventData = createTestSecurityEventData({
        eventType: 'brute_force_attempt',
        attemptCount: 10,
        ipAddress: '192.168.1.110',
        severity: 'critical',
        reason: 'Multiple failed login attempts detected',
      });

      const response = await request(SERVER_URL)
        .post('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: eventData })
        .expect(200);

      expect(response.body.data.attemptCount).toBe(10);
      expect(response.body.data.severity).toBe('critical');
    });

    it('should correlate events by user and time', async () => {
      const userId = testUser.documentId;
      const baseTime = new Date();
      
      // Create events for same user within short time frame
      for (let i = 0; i < 3; i++) {
        const eventTime = new Date(baseTime.getTime() + i * 60000); // 1 minute apart
        const eventData = createTestSecurityEventData({
          eventType: 'data_access',
          user: userId,
          timestamp: eventTime.toISOString(),
          ipAddress: `192.168.1.${120 + i}`,
        });

        await request(SERVER_URL)
          .post('/api/security-events')
          .set('Authorization', `Bearer ${apiToken}`)
          .send({ data: eventData })
          .expect(200);
      }

      // Retrieve events by user and time range
      const startTime = new Date(baseTime.getTime() - 60000);
      const endTime = new Date(baseTime.getTime() + 5 * 60000);

      const response = await request(SERVER_URL)
        .get('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .query({ 
          filters: { 
            user: { id: userId },
            timestamp: { 
              $gte: startTime.toISOString(),
              $lte: endTime.toISOString()
            }
          },
          pagination: { page: 1, pageSize: 10 }
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(3);
    });
  });


  describe('Security Event Reporting and Compliance', () => {
    it('should generate security event summary report', async () => {
      // Create events with different types and severities
      const events = [
        { eventType: 'failed_login', severity: 'low' },
        { eventType: 'suspicious_activity', severity: 'high' },
        { eventType: 'api_abuse', severity: 'medium' },
        { eventType: 'brute_force_attempt', severity: 'critical' },
      ];

      for (const event of events) {
        const eventData = createTestSecurityEventData({
          eventType: event.eventType,
          severity: event.severity,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        });

        await request(SERVER_URL)
          .post('/api/security-events')
          .set('Authorization', `Bearer ${apiToken}`)
          .send({ data: eventData })
          .expect(200);
      }

      // Retrieve all events for reporting
      const response = await request(SERVER_URL)
        .get('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .query({ 
          pagination: { page: 1, pageSize: 100 }
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta.pagination).toBeDefined();
    });


    it('should handle compliance reporting requirements', async () => {
      // Create events for compliance reporting
      const complianceEvents = [
        { eventType: 'data_access', severity: 'medium', reason: 'Data access audit' },
        { eventType: 'permission_change', severity: 'high', reason: 'Permission modification' },
        { eventType: 'account_deletion', severity: 'critical', reason: 'Account deletion request' },
      ];

      for (const event of complianceEvents) {
        const eventData = createTestSecurityEventData({
          eventType: event.eventType,
          severity: event.severity,
          reason: event.reason,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        });

        await request(SERVER_URL)
          .post('/api/security-events')
          .set('Authorization', `Bearer ${apiToken}`)
          .send({ data: eventData })
          .expect(200);
      }

      // Retrieve compliance-related events
      const response = await request(SERVER_URL)
        .get('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .query({ 
          filters: { 
            eventType: { $in: ['data_access', 'permission_change', 'account_deletion'] }
          },
          pagination: { page: 1, pageSize: 10 }
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Security Event Data Retention', () => {
    it('should handle security event data retention policies', async () => {
      // Create events with different timestamps
      const now = new Date();
      const oldDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago

      const recentEventData = createTestSecurityEventData({
        eventType: 'failed_login',
        timestamp: now.toISOString(),
        ipAddress: '192.168.1.180',
      });

      const oldEventData = createTestSecurityEventData({
        eventType: 'suspicious_activity',
        timestamp: oldDate.toISOString(),
        ipAddress: '192.168.1.181',
      });

      await request(SERVER_URL)
        .post('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: recentEventData })
        .expect(200);

      await request(SERVER_URL)
        .post('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: oldEventData })
        .expect(200);

      // Retrieve events within retention period (last 6 months)
      const retentionDate = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);

      const response = await request(SERVER_URL)
        .get('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .query({ 
          filters: { 
            timestamp: { $gte: retentionDate.toISOString() }
          },
          pagination: { page: 1, pageSize: 10 }
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

  });

  describe('Security Event Performance Optimization', () => {
    it('should handle bulk security event creation', async () => {
      const bulkOperations: Promise<any>[] = [];
      
      // Create multiple security events
      for (let i = 0; i < 5; i++) {
        const eventData = createTestSecurityEventData({
          eventType: 'failed_login',
          ipAddress: `192.168.1.${200 + i}`,
          attemptCount: i + 1,
        });
        
        bulkOperations.push(
          request(SERVER_URL)
            .post('/api/security-events')
            .set('Authorization', `Bearer ${apiToken}`)
            .send({ data: eventData })
        );
      }

      const responses = await Promise.all(bulkOperations);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
      });
    });

    it('should handle concurrent security event updates', async () => {
      // Create a security event first
      const eventData = createTestSecurityEventData({
        eventType: 'suspicious_activity',
        severity: 'low',
        ipAddress: '192.168.1.210',
      });

      const createResponse = await request(SERVER_URL)
        .post('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: eventData })
        .expect(200);

      const eventId = createResponse.body.data.id;

      // Perform concurrent updates
      const updateOperations: Promise<any>[] = [];
      
      for (let i = 0; i < 3; i++) {
        const updateData = {
          severity: ['medium', 'high', 'critical'][i],
          reason: `Update ${i + 1}`,
        };
        
        updateOperations.push(
          request(SERVER_URL)
            .put(`/api/security-events/${eventId}`)
            .set('Authorization', `Bearer ${apiToken}`)
            .send({ data: updateData })
        );
      }

      const responses = await Promise.all(updateOperations);
      
      // At least one should succeed
      const successfulResponses = responses.filter(response => response.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });

    it('should handle large security event queries efficiently', async () => {
      // Create multiple events for performance testing
      const eventTypes = ['failed_login', 'suspicious_activity', 'api_abuse'];
      
      for (let i = 0; i < 10; i++) {
        const eventData = createTestSecurityEventData({
          eventType: eventTypes[i % eventTypes.length],
          ipAddress: `192.168.1.${220 + i}`,
        });

        await request(SERVER_URL)
          .post('/api/security-events')
          .set('Authorization', `Bearer ${apiToken}`)
          .send({ data: eventData })
          .expect(200);
      }

      // Query with complex filters
      const response = await request(SERVER_URL)
        .get('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .query({ 
          filters: { 
            eventType: { $in: ['failed_login', 'suspicious_activity'] },
            severity: { $in: ['medium', 'high'] }
          },
          sort: { timestamp: 'desc' },
          pagination: { page: 1, pageSize: 20 }
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta.pagination).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid event type', async () => {
      const eventData = createTestSecurityEventData({
        eventType: 'invalid_event_type',
      });

      await request(SERVER_URL)
        .post('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: eventData })
        .expect(400);
    });

    it('should handle invalid severity level', async () => {
      const eventData = createTestSecurityEventData({
        severity: 'invalid_severity',
      });

      await request(SERVER_URL)
        .post('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: eventData })
        .expect(400);
    });

    it('should handle missing required fields', async () => {
      const eventData = {
        user: testUser.id,
        // Missing required eventType, ipAddress, severity, timestamp
      };

      await request(SERVER_URL)
        .post('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: eventData })
        .expect(400);
    });

    it('should handle invalid IP address format', async () => {
      const eventData = createTestSecurityEventData({
        ipAddress: 'invalid-ip-address',
      });

      await request(SERVER_URL)
        .post('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: eventData })
        .expect(400);
    });


    it('should handle non-existent security event retrieval', async () => {
      await request(SERVER_URL)
        .get('/api/security-events/99999')
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(404);
    });

    it('should handle non-existent security event deletion', async () => {
      await request(SERVER_URL)
        .delete('/api/security-events/99999')
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(404);
    });

    it('should handle invalid user ID', async () => {
      const eventData = createTestSecurityEventData({
        user: 99999, // Non-existent user ID
      });

      await request(SERVER_URL)
        .post('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: eventData })
        .expect(400);
    });

    it('should handle invalid attempt count', async () => {
      const eventData = createTestSecurityEventData({
        attemptCount: -1, // Invalid negative count
      });

      await request(SERVER_URL)
        .post('/api/security-events')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: eventData })
        .expect(400);
    });
  });
});
