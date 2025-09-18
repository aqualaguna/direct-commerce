/**
 * Activity tracking middleware tests
 * 
 * Tests for the activity tracking middleware functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
jest.mock('geoip-lite', () => ({
  lookup: jest.fn()
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123')
}));

// Mock Strapi instance
const mockStrapi = {
  documents: jest.fn((contentType) => ({
    create: jest.fn<any>()
  })),
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
};

// Mock geoip
const mockGeoip = require('geoip-lite');

describe('Activity Tracking Middleware', () => {
  let middleware: any;
  let mockContext: any;
  let mockNext: jest.Mock<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the mock functions
    mockStrapi.documents.mockReturnValue({
      create: jest.fn<any>().mockResolvedValue({})
    });
    
    // Import the middleware
    const middlewareModule = require('./activity-tracking').default;
    middleware = middlewareModule({}, { strapi: mockStrapi });
    
    // Create mock context
    mockContext = {
      state: { user: null },
      request: {
        url: '/api/auth/local',
        method: 'POST',
        ip: '192.168.1.1',
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'x-session-id': 'session-123'
        },
        socket: { remoteAddress: '192.168.1.1' }
      },
      response: {
        body: null
      },
      status: 200, // Set default status to 200 for successful requests
      query: {},
      method: 'POST'
    };
    
    mockNext = jest.fn<any>().mockResolvedValue(undefined);
    
    // Mock geoip response
    mockGeoip.lookup.mockReturnValue({
      city: 'New York',
      region: 'NY',
      country: 'US'
    });
  });

  describe('Middleware Function', () => {
    it('should call next() and continue request processing', async () => {
      await middleware(mockContext, mockNext);
      
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should track page views for authenticated users', async () => {
      const mockUser = {
        documentId: 'user-123',
        id: 1,
        username: 'testuser',
        email: 'test@example.com'
      };
      
      mockContext.state.user = mockUser;
      mockContext.request.url = '/api/products';
      mockContext.method = 'GET';
      
      await middleware(mockContext, mockNext);
      
      expect(mockStrapi.documents).toHaveBeenCalledWith('api::user-activity.user-activity');
      expect(mockStrapi.documents('api::user-activity.user-activity').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user: 'user-123',
          activityType: 'page_view',
          success: true,
          activityData: expect.objectContaining({
            url: '/api/products',
            method: 'GET',
            timestamp: expect.any(String)
          }),
          deviceInfo: expect.objectContaining({
            browser: null,
            device: null,
            mobile: false,
            os: 'Windows'
          }),
          ipAddress: '192.168.1.0',
          location: 'New York, NY, US',
          sessionId: 'session-123',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          sessionDuration: expect.any(Number),
          metadata: expect.objectContaining({
            timestamp: expect.any(String),
            serverTime: expect.any(Number)
          })
        })
      });
    });

    it('should track successful API activities', async () => {
      const mockUser = {
        documentId: 'user-123',
        id: 1,
        username: 'testuser',
        email: 'test@example.com'
      };
      
      mockContext.state.user = mockUser;
      mockContext.request.url = '/api/auth/local';
      mockContext.method = 'POST';
      
      await middleware(mockContext, mockNext);
      
      expect(mockStrapi.documents).toHaveBeenCalledWith('api::user-activity.user-activity');
      expect(mockStrapi.documents('api::user-activity.user-activity').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user: 'user-123',
          activityType: 'login',
          success: true,
          activityData: expect.objectContaining({
            action: 'login',
            endpoint: '/api/auth/local',
            method: 'POST',
            url: '/api/auth/local',
            timestamp: expect.any(String)
          }),
          deviceInfo: expect.objectContaining({
            browser: null,
            device: null,
            mobile: false,
            os: 'Windows'
          }),
          ipAddress: '192.168.1.0',
          location: 'New York, NY, US',
          sessionId: 'session-123',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          sessionDuration: expect.any(Number),
          metadata: expect.objectContaining({
            timestamp: expect.any(String),
            serverTime: expect.any(Number)
          })
        })
      });
    });

    it('should track failed activities', async () => {
      const mockUser = {
        documentId: 'user-123',
        id: 1,
        username: 'testuser',
        email: 'test@example.com'
      };
      
      mockContext.state.user = mockUser;
      mockContext.request.url = '/api/auth/local';
      mockContext.method = 'POST';
      mockContext.status = 401; // Set status to 401 for failed request
      
      const testError = new Error('Authentication failed');
      mockNext.mockRejectedValueOnce(testError);
      
      await expect(middleware(mockContext, mockNext)).rejects.toThrow('Authentication failed');
      
      expect(mockStrapi.documents).toHaveBeenCalledWith('api::user-activity.user-activity');
      expect(mockStrapi.documents('api::user-activity.user-activity').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user: 'user-123',
          activityType: 'login',
          success: false,
          errorMessage: 'Authentication failed',
          activityData: expect.objectContaining({
            action: 'login',
            endpoint: '/api/auth/local',
            method: 'POST',
            url: '/api/auth/local',
            timestamp: expect.any(String)
          }),
          deviceInfo: expect.objectContaining({
            browser: null,
            device: null,
            mobile: false,
            os: 'Windows'
          }),
          ipAddress: '192.168.1.0',
          location: 'New York, NY, US',
          sessionId: 'session-123',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          metadata: expect.objectContaining({
            timestamp: expect.any(String),
            serverTime: expect.any(Number)
          })
        })
      });
    });

    it('should not track admin endpoints', async () => {
      const mockUser = {
        documentId: 'user-123',
        id: 1,
        username: 'testuser',
        email: 'test@example.com'
      };
      
      mockContext.state.user = mockUser;
      mockContext.request.url = '/admin/users';
      mockContext.method = 'GET';
      
      await middleware(mockContext, mockNext);
      
      // Should not track admin endpoints
      expect(mockStrapi.documents('api::user-activity.user-activity').create).not.toHaveBeenCalled();
    });

    it('should not track analytics endpoints to avoid infinite loops', async () => {
      const mockUser = {
        documentId: 'user-123',
        id: 1,
        username: 'testuser',
        email: 'test@example.com'
      };
      
      mockContext.state.user = mockUser;
      mockContext.request.url = '/api/user-activities';
      mockContext.method = 'GET';
      
      await middleware(mockContext, mockNext);
      
      // Should not track analytics endpoints - the middleware should still be called but no activity should be created
      expect(mockStrapi.documents('api::user-activity.user-activity').create).not.toHaveBeenCalled();
    });
  });

  describe('Activity Type Detection', () => {
    it('should detect login activity', async () => {
      mockContext.request.url = '/api/auth/local';
      mockContext.method = 'POST';
      
      await middleware(mockContext, mockNext);
      
      expect(mockStrapi.documents('api::user-activity.user-activity').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          activityType: 'login',
          activityData: expect.objectContaining({
            action: 'login',
            endpoint: '/api/auth/local',
            method: 'POST',
            url: '/api/auth/local',
            timestamp: expect.any(String)
          }),
          sessionDuration: expect.any(Number),
          metadata: expect.objectContaining({
            timestamp: expect.any(String),
            serverTime: expect.any(Number)
          })
        })
      });
    });

    it('should detect account creation activity', async () => {
      mockContext.request.url = '/api/auth/local/register';
      mockContext.method = 'POST';
      
      await middleware(mockContext, mockNext);
      
      expect(mockStrapi.documents('api::user-activity.user-activity').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          activityType: 'account_created',
          activityData: expect.objectContaining({
            action: 'login',
            endpoint: '/api/auth/local/register',
            method: 'POST',
            url: '/api/auth/local/register',
            timestamp: expect.any(String)
          }),
          sessionDuration: expect.any(Number),
          metadata: expect.objectContaining({
            timestamp: expect.any(String),
            serverTime: expect.any(Number)
          })
        })
      });
    });

    it('should detect profile update activity', async () => {
      mockContext.request.url = '/api/users/me';
      mockContext.method = 'PUT';
      
      await middleware(mockContext, mockNext);
      
      expect(mockStrapi.documents('api::user-activity.user-activity').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          activityType: 'profile_update',
          activityData: expect.objectContaining({
            action: 'update_profile',
            endpoint: '/api/users/me',
            method: 'PUT',
            url: '/api/users/me',
            timestamp: expect.any(String)
          }),
          sessionDuration: expect.any(Number),
          metadata: expect.objectContaining({
            timestamp: expect.any(String),
            serverTime: expect.any(Number)
          })
        })
      });
    });

    it('should detect preference change activity', async () => {
      mockContext.request.url = '/api/user-preferences';
      mockContext.method = 'PUT';
      
      await middleware(mockContext, mockNext);
      
      expect(mockStrapi.documents('api::user-activity.user-activity').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          activityType: 'preference_change',
          activityData: expect.objectContaining({
            action: 'update_preferences',
            endpoint: '/api/user-preferences',
            method: 'PUT',
            url: '/api/user-preferences',
            timestamp: expect.any(String)
          }),
          sessionDuration: expect.any(Number),
          metadata: expect.objectContaining({
            timestamp: expect.any(String),
            serverTime: expect.any(Number)
          })
        })
      });
    });
  });

  describe('IP Address Handling', () => {
    it('should extract IP from request.ip', async () => {
      mockContext.request.ip = '192.168.1.100';
      
      await middleware(mockContext, mockNext);
      
      expect(mockStrapi.documents('api::user-activity.user-activity').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: '192.168.1.0' // Anonymized
        })
      });
    });

    it('should extract IP from x-forwarded-for header', async () => {
      mockContext.request.ip = null;
      mockContext.request.headers['x-forwarded-for'] = '203.0.113.1';
      
      await middleware(mockContext, mockNext);
      
      expect(mockStrapi.documents('api::user-activity.user-activity').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: '203.0.113.0' // Anonymized
        })
      });
    });

    it('should extract IP from socket remoteAddress', async () => {
      mockContext.request.ip = null;
      mockContext.request.headers['x-forwarded-for'] = null;
      mockContext.request.socket.remoteAddress = '10.0.0.1';
      
      await middleware(mockContext, mockNext);
      
      expect(mockStrapi.documents('api::user-activity.user-activity').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: '10.0.0.0' // Anonymized
        })
      });
    });
  });

  describe('Location Detection', () => {
    it('should get location from IP address', async () => {
      mockGeoip.lookup.mockReturnValue({
        city: 'San Francisco',
        region: 'CA',
        country: 'US'
      });
      
      await middleware(mockContext, mockNext);
      
      expect(mockStrapi.documents('api::user-activity.user-activity').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          location: 'San Francisco, CA, US'
        })
      });
    });

    it('should handle missing location data', async () => {
      mockGeoip.lookup.mockReturnValue(null);
      
      await middleware(mockContext, mockNext);
      
      expect(mockStrapi.documents('api::user-activity.user-activity').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          location: null
        })
      });
    });
  });

  describe('Device Information Parsing', () => {
    it('should parse Chrome browser', async () => {
      mockContext.request.headers['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      
      await middleware(mockContext, mockNext);
      
      expect(mockStrapi.documents('api::user-activity.user-activity').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deviceInfo: expect.objectContaining({
            browser: 'Chrome',
            os: 'Windows',
            mobile: false
          })
        })
      });
    });

    it('should parse mobile device', async () => {
      mockContext.request.headers['user-agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';
      
      await middleware(mockContext, mockNext);
      
      expect(mockStrapi.documents('api::user-activity.user-activity').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deviceInfo: expect.objectContaining({
            browser: 'Safari',
            os: 'iOS',
            mobile: true
          })
        })
      });
    });
  });

  describe('Session Management', () => {
    it('should use existing session ID from headers', async () => {
      mockContext.request.headers['x-session-id'] = 'existing-session-456';
      
      await middleware(mockContext, mockNext);
      
      expect(mockStrapi.documents('api::user-activity.user-activity').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: 'existing-session-456'
        })
      });
    });

    it('should generate new session ID if not provided', async () => {
      delete mockContext.request.headers['x-session-id'];
      
      await middleware(mockContext, mockNext);
      
      expect(mockStrapi.documents('api::user-activity.user-activity').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: 'test-uuid-123'
        })
      });
    });
  });

  describe('Error Handling', () => {
    it('should not break request flow when activity tracking fails', async () => {
      mockStrapi.documents('api::user-activity.user-activity').create.mockRejectedValueOnce(new Error('Database error'));
      
      await middleware(mockContext, mockNext);
      
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockStrapi.log.error).toHaveBeenCalledWith('Failed to track activity:', expect.any(Error));
    });

    it('should validate activity type', async () => {
      // Mock a scenario where invalid activity type is passed
      const mockUser = {
        documentId: 'user-123',
        id: 1,
        username: 'testuser',
        email: 'test@example.com'
      };
      
      mockContext.state.user = mockUser;
      mockContext.request.url = '/api/unknown-endpoint';
      mockContext.method = 'POST';
      
      await middleware(mockContext, mockNext);
      
      // Should not track unknown endpoints
      expect(mockStrapi.documents).not.toHaveBeenCalled();
    });
  });

  describe('Data Privacy', () => {
    it('should anonymize IPv4 addresses', async () => {
      mockContext.request.ip = '192.168.1.100';
      
      await middleware(mockContext, mockNext);
      
      expect(mockStrapi.documents('api::user-activity.user-activity').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: '192.168.1.0' // Last octet removed
        })
      });
    });

    it('should anonymize IPv6 addresses', async () => {
      mockContext.request.ip = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      
      await middleware(mockContext, mockNext);
      
      expect(mockStrapi.documents('api::user-activity.user-activity').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: '2001:0db8:85a3:0000::' // Last 64 bits removed
        })
      });
    });
  });
});
