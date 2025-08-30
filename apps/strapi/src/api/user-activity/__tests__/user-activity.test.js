/**
 * User Activity tests
 * 
 * Tests for user activity tracking system including models, services, and middleware
 */

const { describe, it, expect, beforeEach } = require('@jest/globals');

// Mock Strapi instance
const mockStrapi = {
  documents: jest.fn((contentType) => ({
    findOne: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
    publish: jest.fn().mockResolvedValue({}),
    unpublish: jest.fn().mockResolvedValue({}),
    discardDraft: jest.fn().mockResolvedValue({}),
  })),
  service: jest.fn().mockReturnValue({
    aggregateActivitiesByPeriod: jest.fn().mockResolvedValue({}),
    aggregateActivitiesByType: jest.fn().mockResolvedValue({}),
    getUserActivitySummary: jest.fn().mockResolvedValue({}),
  }),
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
};

// Set global strapi for tests
global.strapi = mockStrapi;

describe('User Activity Tracking System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Activity Tracking Middleware', () => {
    it('should track page view for authenticated user', async () => {
      const mockCtx = {
        request: {
          method: 'GET',
          url: '/products',
          ip: '192.168.1.1',
          headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        },
        state: {
          user: { id: 1, username: 'testuser' }
        }
      };

      const mockNext = jest.fn().mockResolvedValue(undefined);

      // Mock successful activity creation
      mockStrapi.documents('api::user-activity.user-activity').create.mockResolvedValue({
        documentId: 'activity123',
        user: '1',
        activityType: 'page_view'
      });

      // Import and test the middleware
      const activityTracking = require('../../../middlewares/activity-tracking');
      
      await activityTracking({}, { strapi: mockStrapi })(mockCtx, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStrapi.documents).toHaveBeenCalledWith('api::user-activity.user-activity');
    });

    it('should not track page view for unauthenticated user', async () => {
      const mockCtx = {
        request: {
          method: 'GET',
          url: '/products',
          ip: '192.168.1.1',
          headers: {}
        },
        state: {
          user: null
        }
      };

      const mockNext = jest.fn().mockResolvedValue(undefined);

      const activityTracking = require('../../../middlewares/activity-tracking');
      
      await activityTracking({}, { strapi: mockStrapi })(mockCtx, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStrapi.documents).not.toHaveBeenCalled();
    });

    it('should handle middleware errors gracefully', async () => {
      const mockCtx = {
        request: {
          method: 'GET',
          url: '/products',
          ip: '192.168.1.1',
          headers: {}
        },
        state: {
          user: { id: 1, username: 'testuser' }
        }
      };

      const mockNext = jest.fn().mockResolvedValue(undefined);

      // Mock activity creation failure
      mockStrapi.documents('api::user-activity.user-activity').create.mockRejectedValue(
        new Error('Database error')
      );

      const activityTracking = require('../../../middlewares/activity-tracking');
      
      await activityTracking({}, { strapi: mockStrapi })(mockCtx, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Activity Aggregation Service', () => {
    it('should aggregate activities by time period', async () => {
      const mockActivities = [
        { documentId: '1', activityType: 'page_view', success: true, user: '1', createdAt: new Date() },
        { documentId: '2', activityType: 'login', success: true, user: '1', createdAt: new Date() }
      ];

      mockStrapi.documents('api::user-activity.user-activity').findMany.mockResolvedValue({
        data: mockActivities
      });

      const aggregationService = require('../../../services/activity-aggregation');
      
      const result = await aggregationService.aggregateActivitiesByPeriod('day');

      expect(result).toBeDefined();
      expect(mockStrapi.documents).toHaveBeenCalledWith('api::user-activity.user-activity');
    });

    it('should aggregate activities by type', async () => {
      const mockActivities = [
        { documentId: '1', activityType: 'page_view', success: true, user: '1', createdAt: new Date() },
        { documentId: '2', activityType: 'login', success: true, user: '1', createdAt: new Date() }
      ];

      mockStrapi.documents('api::user-activity.user-activity').findMany.mockResolvedValue({
        data: mockActivities
      });

      const aggregationService = require('../../../services/activity-aggregation');
      
      const result = await aggregationService.aggregateActivitiesByType();

      expect(result).toBeDefined();
    });

    it('should get user activity summary', async () => {
      const mockActivities = [
        { documentId: '1', activityType: 'page_view', success: true, user: '1', createdAt: new Date() }
      ];

      mockStrapi.documents('api::user-activity.user-activity').findMany.mockResolvedValue({
        data: mockActivities
      });

      const aggregationService = require('../../../services/activity-aggregation');
      
      const result = await aggregationService.getUserActivitySummary('1');

      expect(result).toBeDefined();
    });

    it('should handle empty activity data gracefully', async () => {
      mockStrapi.documents('api::user-activity.user-activity').findMany.mockResolvedValue({
        data: []
      });

      const aggregationService = require('../../../services/activity-aggregation');
      
      const result = await aggregationService.aggregateActivitiesByPeriod('day');

      expect(result).toBeDefined();
    });
  });

  describe('Data Retention Service', () => {
    it('should clean up old user activities', async () => {
      const mockOldActivities = [
        { documentId: '1' },
        { documentId: '2' }
      ];

      mockStrapi.documents('api::user-activity.user-activity').findMany.mockResolvedValue({
        data: mockOldActivities
      });
      mockStrapi.documents('api::user-activity.user-activity').delete.mockResolvedValue({});

      const retentionService = require('../../../services/data-retention');
      
      const result = await retentionService.cleanupUserActivities(30);

      expect(result).toBeDefined();
      expect(mockStrapi.documents).toHaveBeenCalledWith('api::user-activity.user-activity');
    });

    it('should anonymize old data', async () => {
      const mockOldActivities = [
        { documentId: '1', ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0...', metadata: {} }
      ];

      mockStrapi.documents('api::user-activity.user-activity').findMany.mockResolvedValue({
        data: mockOldActivities
      });
      mockStrapi.documents('api::user-activity.user-activity').update.mockResolvedValue({});

      const retentionService = require('../../../services/data-retention');
      
      const result = await retentionService.anonymizeOldData(90);

      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in activity tracking', async () => {
      const mockCtx = {
        request: {
          method: 'GET',
          url: '/products',
          ip: '192.168.1.1',
          headers: {}
        },
        state: {
          user: { id: 1, username: 'testuser' }
        }
      };

      const mockNext = jest.fn().mockResolvedValue(undefined);

      mockStrapi.documents('api::user-activity.user-activity').create.mockRejectedValue(
        new Error('Database error')
      );

      const activityTracking = require('../../../middlewares/activity-tracking');
      
      await activityTracking({}, { strapi: mockStrapi })(mockCtx, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle aggregation errors gracefully', async () => {
      mockStrapi.documents('api::user-activity.user-activity').findMany.mockRejectedValue(
        new Error('Database connection error')
      );

      const aggregationService = require('../../../services/activity-aggregation');
      
      const result = await aggregationService.aggregateActivitiesByPeriod('day');
      expect(result).toBeDefined();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockStrapi.documents('api::user-activity.user-activity').findMany.mockRejectedValue(
        new Error('Database connection error')
      );

      const retentionService = require('../../../services/data-retention');
      
      const result = await retentionService.cleanupUserActivities(30);
      expect(result).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete activity tracking flow', async () => {
      const mockActivity = {
        documentId: 'activity123',
        user: '1',
        activityType: 'page_view',
        success: true,
        createdAt: new Date()
      };

      mockStrapi.documents('api::user-activity.user-activity').create.mockResolvedValue(mockActivity);
      mockStrapi.documents('api::user-activity.user-activity').findMany.mockResolvedValue({
        data: [mockActivity]
      });

      const mockCtx = {
        request: {
          method: 'GET',
          url: '/products',
          ip: '192.168.1.1',
          headers: {}
        },
        state: {
          user: { id: 1, username: 'testuser' }
        }
      };

      const mockNext = jest.fn().mockResolvedValue(undefined);

      const activityTracking = require('../../../middlewares/activity-tracking');
      const aggregationService = require('../../../services/activity-aggregation');
      
      // Track activity
      await activityTracking({}, { strapi: mockStrapi })(mockCtx, mockNext);
      
      // Aggregate activities
      const result = await aggregationService.aggregateActivitiesByPeriod('day');

      expect(mockNext).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});