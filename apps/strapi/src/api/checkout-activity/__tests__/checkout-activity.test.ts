/**
 * Checkout Activity Tests
 * Unit tests for checkout activity tracking functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Strapi instance
const mockStrapi: any = {
  documents: jest.fn(),
  service: jest.fn(),
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
};

// Mock Strapi factories
jest.mock('@strapi/strapi', () => ({
  factories: {
    createCoreController: jest.fn((serviceName: string, controllerFunction: any) => {
      return controllerFunction({ strapi: mockStrapi });
    }),
    createCoreService: jest.fn((serviceName: string, serviceFunction: any) => {
      return serviceFunction({ strapi: mockStrapi });
    }),
  },
}));

describe('Checkout Activity Controller', () => {
  let controller: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Import the actual controller with strapi mock
    const controllerModule = require('../controllers/checkout-activity').default;
    controller = controllerModule({ strapi: mockStrapi });
  });

  describe('create', () => {
    it('should create a new checkout activity', async () => {
      const mockActivity = {
        documentId: 'test-doc-123',
        checkoutSessionId: 'session-123',
        activityType: 'step_enter',
        stepName: 'cart',
        timestamp: new Date(),
      };

      const mockContext = {
        request: {
          body: {
            data: {
              checkoutSessionId: 'session-123',
              activityType: 'step_enter',
              stepName: 'cart',
            }
          },
          ip: '127.0.0.1',
          headers: {
            'user-agent': 'test-agent',
            'x-session-id': 'session-123'
          }
        },
        state: { user: { id: 'user-123' } },
        badRequest: jest.fn(),
        throw: jest.fn(),
        ctx: {
          throw: jest.fn(),
        },
      };

      // Mock the validation service
      const mockValidationService = {
        sanitizeActivityData: (jest.fn() as any).mockResolvedValue({
          checkoutSessionId: 'session-123',
          activityType: 'step_enter',
          stepName: 'cart',
          userId: 'user-123',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          sessionId: 'session-123',
          timestamp: new Date()
        })
      };
      
      mockStrapi.service.mockImplementation((serviceName: string) => {
        if (serviceName === 'api::checkout-activity.checkout-activity-validation') {
          return mockValidationService;
        }
        return {};
      });

      // Mock the documents service
      const mockDocumentsService = {
        findOne: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: (jest.fn() as any).mockResolvedValue(mockActivity),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        publish: jest.fn(),
        unpublish: jest.fn(),
        discardDraft: jest.fn(),
      };

      mockStrapi.documents.mockReturnValue(mockDocumentsService);

      const result = await controller.create(mockContext);

      expect(result).toEqual(mockActivity);
      expect(mockStrapi.documents).toHaveBeenCalledWith('api::checkout-activity.checkout-activity');
      expect(mockStrapi.documents('api::checkout-activity.checkout-activity').create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          checkoutSessionId: 'session-123',
          activityType: 'step_enter',
          stepName: 'cart',
          userId: 'user-123',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          sessionId: 'session-123'
        })
      });
    });

    it('should return bad request for missing required fields', async () => {
      const mockContext = {
        request: {
          body: {
            data: {
              activityType: 'step_enter', // Missing checkoutSessionId
            }
          }
        },
        badRequest: jest.fn(),
      };

      await controller.create(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith('checkoutSessionId and activityType are required');
    });
  });

  describe('find', () => {
    it('should find checkout activities with filters', async () => {
      const mockActivities = [
        {
          documentId: 'doc-1',
          checkoutSessionId: 'session-123',
          activityType: 'step_enter',
          stepName: 'cart',
        }
      ];

      const mockContext = {
        query: {
          checkoutSessionId: 'session-123',
          activityType: 'step_enter',
          page: '1',
          pageSize: '25'
        }
      };

      const mockDocumentsService = {
        findOne: jest.fn(),
        findFirst: jest.fn(),
        findMany: (jest.fn() as any).mockResolvedValue(mockActivities),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        publish: jest.fn(),
        unpublish: jest.fn(),
        discardDraft: jest.fn(),
      };

      mockStrapi.documents.mockReturnValue(mockDocumentsService);

      const result = await controller.find(mockContext);

      expect(result).toEqual(mockActivities);
      expect(mockStrapi.documents('api::checkout-activity.checkout-activity').findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            checkoutSessionId: 'session-123',
            activityType: 'step_enter'
          },
          sort: { timestamp: 'desc' },
          pagination: { page: 1, pageSize: 25 },
          populate: ['userId']
        })
      );
    });
  });

  describe('bulkCreate', () => {
    it('should bulk create checkout activities', async () => {
      const mockActivities = [
        {
          documentId: 'doc-1',
          checkoutSessionId: 'session-123',
          activityType: 'step_enter',
        },
        {
          documentId: 'doc-2',
          checkoutSessionId: 'session-123',
          activityType: 'step_exit',
        }
      ];

      const mockContext = {
        request: {
          body: {
            activities: [
              { checkoutSessionId: 'session-123', activityType: 'step_enter' },
              { checkoutSessionId: 'session-123', activityType: 'step_exit' }
            ]
          },
          ip: '127.0.0.1',
          headers: {
            'user-agent': 'test-agent',
            'x-session-id': 'session-123'
          }
        },
        state: { user: { id: 'user-123' } },
        badRequest: jest.fn(),
        throw: jest.fn(),
      };

      // Mock the validation service
      mockStrapi.service.mockReturnValue({
        sanitizeActivityData: (jest.fn() as any).mockImplementation((data: any) => Promise.resolve({
          ...data,
          userId: 'user-123',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          sessionId: 'session-123',
          timestamp: new Date()
        }))
      });

      // Mock the documents service
      const mockDocumentsService = {
        findOne: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: (jest.fn() as any)
          .mockResolvedValueOnce(mockActivities[0])
          .mockResolvedValueOnce(mockActivities[1]),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        publish: jest.fn(),
        unpublish: jest.fn(),
        discardDraft: jest.fn(),
      };

      mockStrapi.documents.mockReturnValue(mockDocumentsService);

      const result = await controller.bulkCreate(mockContext);

      expect(result.message).toBe('Successfully created 2 activities');
      expect(result.count).toBe(2);
      expect(result.activities).toEqual(mockActivities);
    });

    it('should return bad request for empty activities array', async () => {
      const mockContext = {
        request: {
          body: { activities: [] }
        },
        badRequest: jest.fn(),
      };

      await controller.bulkCreate(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith('Activities array is required and must not be empty');
    });

    it('should return bad request for too many activities', async () => {
      const mockContext = {
        request: {
          body: {
            activities: Array(1001).fill({ checkoutSessionId: 'session-123', activityType: 'step_enter' })
          }
        },
        badRequest: jest.fn(),
      };

      await controller.bulkCreate(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith('Maximum 1000 activities per bulk create');
    });
  });

  describe('getSessionSummary', () => {
    it('should get session summary', async () => {
      const mockSummary = {
        sessionId: 'session-123',
        totalEvents: 5,
        stepProgression: { cart: 1, shipping: 1 },
        timeSpent: { cart: 5000, shipping: 3000 },
        formInteractions: {},
        validationErrors: {}
      };

      const mockContext = {
        params: { checkoutSessionId: 'session-123' },
        badRequest: jest.fn(),
      };

      mockStrapi.service.mockReturnValue({
        getSessionSummary: (jest.fn() as any).mockResolvedValue(mockSummary)
      });

      const result = await controller.getSessionSummary(mockContext);

      expect(result).toEqual(mockSummary);
      expect(mockStrapi.service).toHaveBeenCalledWith('api::checkout-activity.checkout-activity-analytics');
    });

    it('should return bad request for missing session ID', async () => {
      const mockContext = {
        params: {},
        badRequest: jest.fn(),
      };

      await controller.getSessionSummary(mockContext);

      expect(mockContext.badRequest).toHaveBeenCalledWith('checkoutSessionId is required');
    });
  });

  describe('cleanup', () => {
    it('should cleanup old activities for admin users', async () => {
      const mockResult = {
        deletedCount: 100,
        partitionsDropped: 2,
        errors: []
      };

      const mockContext = {
        query: { days: '90' },
        state: { user: { role: { type: 'admin' } } },
        forbidden: jest.fn(),
      };

      mockStrapi.service.mockReturnValue({
        cleanupOldActivities: (jest.fn() as any).mockResolvedValue(mockResult)
      });

      const result = await controller.cleanup(mockContext);

      expect(result.message).toBe('Cleanup completed successfully');
      expect(result.deletedCount).toBe(100);
      expect(result.daysRetained).toBe(90);
    });

    it('should forbid cleanup for non-admin users', async () => {
      const mockContext = {
        query: { days: '90' },
        state: { user: { role: { type: 'authenticated' } } },
        forbidden: jest.fn(),
      };

      await controller.cleanup(mockContext);

      expect(mockContext.forbidden).toHaveBeenCalledWith('Only administrators can perform cleanup');
    });
  });
});

describe('Checkout Activity Validation Service', () => {
  let validationService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const serviceModule = require('../services/checkout-activity-validation').default;
    validationService = serviceModule({ strapi: mockStrapi });
  });

  describe('sanitizeActivityData', () => {
    it('should sanitize valid activity data', async () => {
      const inputData = {
        checkoutSessionId: 'session-123',
        activityType: 'step_enter',
        stepName: 'cart',
        formField: 'email',
        activityData: {
          timeSpent: 5000,
          fieldValue: 'test@example.com'
        }
      };

      const result = await validationService.sanitizeActivityData(inputData);

      expect(result.checkoutSessionId).toBe('session-123');
      expect(result.activityType).toBe('step_enter');
      expect(result.stepName).toBe('cart');
      expect(result.formField).toBe('email');
      expect(result.activityData.timeSpent).toBe(5000);
    });

    it('should throw error for invalid activity type', async () => {
      const inputData = {
        checkoutSessionId: 'session-123',
        activityType: 'invalid_type'
      };

      await expect(validationService.sanitizeActivityData(inputData))
        .rejects.toThrow('Validation errors: Invalid activityType');
    });

    it('should sanitize string inputs', () => {
      const result = validationService.sanitizeString('  test@example.com  ', 50);
      expect(result).toBe('test@example.com');
    });

    it('should truncate long strings', () => {
      const longString = 'a'.repeat(100);
      const result = validationService.sanitizeString(longString, 50);
      expect(result.length).toBe(50);
    });

    it('should validate IP addresses', () => {
      expect(validationService.sanitizeIpAddress('192.168.1.1')).toBe('192.168.1.1');
      expect(validationService.sanitizeIpAddress('invalid-ip')).toBe('');
    });

    it('should validate GDPR compliance', () => {
      const compliantData = {
        activityData: {
          timeSpent: 5000,
          fieldValue: 'test'
        }
      };

      const nonCompliantData = {
        activityData: {
          fieldValue: '4111-1111-1111-1111' // Credit card pattern
        }
      };

      expect(validationService.validateGdprCompliance(compliantData)).toBe(true);
      expect(validationService.validateGdprCompliance(nonCompliantData)).toBe(false);
    });
  });
});

describe('Checkout Activity Analytics Service', () => {
  let analyticsService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const serviceModule = require('../services/checkout-activity-analytics').default;
    analyticsService = serviceModule({ strapi: mockStrapi });
  });

  describe('getSessionSummary', () => {
    it('should generate session summary from activities', async () => {
      const mockActivities = [
        {
          documentId: 'doc-1',
          checkoutSessionId: 'session-123',
          activityType: 'step_enter',
          stepName: 'cart',
          timestamp: new Date('2025-01-01T10:00:00Z')
        },
        {
          documentId: 'doc-2',
          checkoutSessionId: 'session-123',
          activityType: 'step_exit',
          stepName: 'cart',
          timestamp: new Date('2025-01-01T10:00:05Z')
        },
        {
          documentId: 'doc-3',
          checkoutSessionId: 'session-123',
          activityType: 'checkout_complete',
          timestamp: new Date('2025-01-01T10:01:00Z')
        }
      ];

      const mockDocumentsService = {
        findOne: jest.fn(),
        findFirst: jest.fn(),
        findMany: (jest.fn() as any).mockResolvedValue(mockActivities),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        publish: jest.fn(),
        unpublish: jest.fn(),
        discardDraft: jest.fn(),
      };

      mockStrapi.documents.mockReturnValue(mockDocumentsService);

      const result = await analyticsService.getSessionSummary('session-123');

      expect(result.sessionId).toBe('session-123');
      expect(result.totalEvents).toBe(3);
      expect(result.stepProgression.cart).toBe(1);
      expect(result.timeSpent.cart).toBe(5000); // 5 seconds
      expect(result.completionTime).toBe(60000); // 1 minute
    });
  });

  describe('getFunnelAnalytics', () => {
    it('should calculate funnel metrics', async () => {
      const mockStepEnterEvents = [
        { stepName: 'cart', checkoutSessionId: 'session-1' },
        { stepName: 'cart', checkoutSessionId: 'session-2' },
        { stepName: 'shipping', checkoutSessionId: 'session-1' }
      ];

      const mockStepExitEvents = [
        { stepName: 'cart', checkoutSessionId: 'session-1' },
        { stepName: 'shipping', checkoutSessionId: 'session-1' }
      ];

      const mockCompletionEvents: any[] = [];

      const mockDocumentsService = {
        findOne: jest.fn(),
        findFirst: jest.fn(),
        findMany: (jest.fn() as any)
          .mockResolvedValueOnce(mockStepEnterEvents)
          .mockResolvedValueOnce(mockStepExitEvents)
          .mockResolvedValueOnce(mockCompletionEvents),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        publish: jest.fn(),
        unpublish: jest.fn(),
        discardDraft: jest.fn(),
      };

      mockStrapi.documents.mockReturnValue(mockDocumentsService);

      const result = await analyticsService.getFunnelAnalytics('2025-01-01', '2025-01-31');

      expect(result).toHaveLength(6); // 6 steps
      expect(result[0].step).toBe('cart');
      expect(result[0].entered).toBe(2);
      expect(result[0].completed).toBe(1);
      expect(result[0].conversionRate).toBe(50);
    });
  });

  describe('getRealTimeMetrics', () => {
    it('should calculate real-time metrics', async () => {
      const mockRecentActivities = [
        { checkoutSessionId: 'session-1', activityType: 'checkout_complete' },
        { checkoutSessionId: 'session-2', activityType: 'checkout_abandon' },
        { checkoutSessionId: 'session-3', activityType: 'step_enter' }
      ];

      const mockDailyActivities = [
        { checkoutSessionId: 'session-1', activityType: 'checkout_complete' },
        { checkoutSessionId: 'session-2', activityType: 'checkout_complete' }
      ];

      const mockDocumentsService = {
        findOne: jest.fn(),
        findFirst: jest.fn(),
        findMany: (jest.fn() as any)
          .mockResolvedValueOnce(mockRecentActivities)
          .mockResolvedValueOnce(mockDailyActivities),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        publish: jest.fn(),
        unpublish: jest.fn(),
        discardDraft: jest.fn(),
      };

      mockStrapi.documents.mockReturnValue(mockDocumentsService);

      const result = await analyticsService.getRealTimeMetrics();

      expect(result.activeSessions).toBe(3);
      expect(result.hourlyCompletions).toBe(1);
      expect(result.dailyCompletions).toBe(2);
      expect(result.hourlyAbandonments).toBe(1);
      expect(result.dailyAbandonments).toBe(0);
      expect(result.hourlyConversionRate).toBe(50); // 1 completion / 2 total
      expect(result.dailyConversionRate).toBe(100); // 2 completions / 2 total
    });
  });
});
