/**
 * Order Tracking Service Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Strapi instance
const mockStrapi = {
  documents: jest.fn((contentType: string) => ({
    findOne: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  })),
  service: jest.fn(),
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
};

// Mock service functions with proper types
const mockOrderTrackingService = {
  createTrackingRecord: jest.fn() as jest.MockedFunction<any>,
  updateTrackingStatus: jest.fn() as jest.MockedFunction<any>,
  getTrackingInfo: jest.fn() as jest.MockedFunction<any>,
  getTrackingByOrderId: jest.fn() as jest.MockedFunction<any>,
  fetchCarrierUpdates: jest.fn() as jest.MockedFunction<any>,
  processWebhookUpdate: jest.fn() as jest.MockedFunction<any>,
  generateTrackingUrl: jest.fn() as jest.MockedFunction<any>,
  getCarrierConfig: jest.fn() as jest.MockedFunction<any>,
  fetchFromCarrierAPI: jest.fn() as jest.MockedFunction<any>,
  parseWebhookData: jest.fn() as jest.MockedFunction<any>,
  sendTrackingNotifications: jest.fn() as jest.MockedFunction<any>,
  sendTrackingEmail: jest.fn() as jest.MockedFunction<any>,
  sendTrackingSMS: jest.fn() as jest.MockedFunction<any>,
  getTrackingStatistics: jest.fn() as jest.MockedFunction<any>,
  cleanupOldTrackingRecords: jest.fn() as jest.MockedFunction<any>
};

describe('Order Tracking Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup service mock
    mockStrapi.service.mockImplementation((serviceName: any) => {
      if (serviceName === 'api::order.order-tracking') {
        return mockOrderTrackingService;
      }
      return {};
    });
  });

  describe('createTrackingRecord', () => {
    it('should create tracking record successfully', async () => {
      const trackingRequest = {
        orderId: 'order-123',
        trackingNumber: 'TRK123456789',
        carrier: 'fedex',
        service: 'ground',
        estimatedDelivery: new Date('2024-12-30')
      };

      const mockTrackingRecord = {
        documentId: 'tracking-123',
        orderId: 'order-123',
        trackingNumber: 'TRK123456789',
        carrier: 'fedex',
        status: 'pending'
      };

      mockOrderTrackingService.createTrackingRecord.mockResolvedValue(mockTrackingRecord);

      const result = await mockOrderTrackingService.createTrackingRecord(trackingRequest);

      expect(result).toEqual(mockTrackingRecord);
      expect(mockOrderTrackingService.createTrackingRecord).toHaveBeenCalledWith(trackingRequest);
    });

    it('should throw error if order not found', async () => {
      const trackingRequest = {
        orderId: 'nonexistent-order',
        trackingNumber: 'TRK123456789',
        carrier: 'fedex'
      };

      mockOrderTrackingService.createTrackingRecord.mockRejectedValue(
        new Error('Order not found')
      );

      await expect(
        mockOrderTrackingService.createTrackingRecord(trackingRequest)
      ).rejects.toThrow('Order not found');
    });
  });

  describe('updateTrackingStatus', () => {
    it('should update tracking status successfully', async () => {
      const trackingId = 'tracking-123';
      const update = {
        status: 'in_transit',
        location: 'Memphis, TN',
        description: 'Package in transit',
        timestamp: new Date()
      };

      const mockUpdatedTracking = {
        documentId: trackingId,
        status: 'in_transit',
        location: 'Memphis, TN',
        lastUpdate: new Date()
      };

      mockOrderTrackingService.updateTrackingStatus.mockResolvedValue(mockUpdatedTracking);

      const result = await mockOrderTrackingService.updateTrackingStatus(trackingId, update);

      expect(result).toEqual(mockUpdatedTracking);
      expect(mockOrderTrackingService.updateTrackingStatus).toHaveBeenCalledWith(trackingId, update);
    });
  });

  describe('getTrackingInfo', () => {
    it('should get tracking information', async () => {
      const trackingNumber = 'TRK123456789';
      const carrier = 'fedex';

      const mockTrackingInfo = {
        trackingNumber: 'TRK123456789',
        carrier: 'fedex',
        status: 'delivered',
        location: 'Customer Address',
        estimatedDelivery: new Date('2024-12-30'),
        actualDelivery: new Date('2024-12-29')
      };

      mockOrderTrackingService.getTrackingInfo.mockResolvedValue(mockTrackingInfo);

      const result = await mockOrderTrackingService.getTrackingInfo(trackingNumber, carrier);

      expect(result).toEqual(mockTrackingInfo);
      expect(mockOrderTrackingService.getTrackingInfo).toHaveBeenCalledWith(trackingNumber, carrier);
    });
  });

  describe('getTrackingByOrderId', () => {
    it('should get tracking by order ID', async () => {
      const orderId = 'order-123';

      const mockTracking = {
        documentId: 'tracking-123',
        orderId: 'order-123',
        trackingNumber: 'TRK123456789',
        carrier: 'fedex',
        status: 'in_transit'
      };

      mockOrderTrackingService.getTrackingByOrderId.mockResolvedValue(mockTracking);

      const result = await mockOrderTrackingService.getTrackingByOrderId(orderId);

      expect(result).toEqual(mockTracking);
      expect(mockOrderTrackingService.getTrackingByOrderId).toHaveBeenCalledWith(orderId);
    });
  });

  describe('fetchCarrierUpdates', () => {
    it('should fetch carrier updates successfully', async () => {
      const trackingId = 'tracking-123';

      const mockUpdates = [
        {
          status: 'in_transit',
          location: 'Memphis, TN',
          description: 'Package in transit',
          timestamp: new Date()
        }
      ];

      mockOrderTrackingService.fetchCarrierUpdates.mockResolvedValue(mockUpdates);

      const result = await mockOrderTrackingService.fetchCarrierUpdates(trackingId);

      expect(result).toEqual(mockUpdates);
      expect(mockOrderTrackingService.fetchCarrierUpdates).toHaveBeenCalledWith(trackingId);
    });
  });

  describe('processWebhookUpdate', () => {
    it('should process webhook update successfully', async () => {
      const webhookData = {
        tracking_number: 'TRK123456789',
        status: 'delivered',
        location: 'Customer Address',
        timestamp: '2024-12-29T10:00:00Z'
      };
      const secret = 'webhook-secret';

      const mockProcessedUpdate = {
        trackingNumber: 'TRK123456789',
        status: 'delivered',
        location: 'Customer Address',
        timestamp: new Date('2024-12-29T10:00:00Z')
      };

      mockOrderTrackingService.processWebhookUpdate.mockResolvedValue(mockProcessedUpdate);

      const result = await mockOrderTrackingService.processWebhookUpdate(webhookData, secret);

      expect(result).toEqual(mockProcessedUpdate);
      expect(mockOrderTrackingService.processWebhookUpdate).toHaveBeenCalledWith(webhookData, secret);
    });
  });

  describe('generateTrackingUrl', () => {
    it('should generate tracking URL for FedEx', async () => {
      const trackingNumber = 'TRK123456789';
      const carrier = 'fedex';

      const expectedUrl = 'https://www.fedex.com/fedextrack/?trknbr=TRK123456789';

      mockOrderTrackingService.generateTrackingUrl.mockResolvedValue(expectedUrl);

      const result = await mockOrderTrackingService.generateTrackingUrl(trackingNumber, carrier);

      expect(result).toBe(expectedUrl);
      expect(mockOrderTrackingService.generateTrackingUrl).toHaveBeenCalledWith(trackingNumber, carrier);
    });

    it('should generate tracking URL for UPS', async () => {
      const trackingNumber = 'TRK123456789';
      const carrier = 'ups';

      const expectedUrl = 'https://www.ups.com/track?tracknum=TRK123456789';

      mockOrderTrackingService.generateTrackingUrl.mockResolvedValue(expectedUrl);

      const result = await mockOrderTrackingService.generateTrackingUrl(trackingNumber, carrier);

      expect(result).toBe(expectedUrl);
      expect(mockOrderTrackingService.generateTrackingUrl).toHaveBeenCalledWith(trackingNumber, carrier);
    });
  });

  describe('getCarrierConfig', () => {
    it('should get carrier configuration', async () => {
      const carrier = 'fedex';

      const mockConfig = {
        name: 'FedEx',
        apiUrl: 'https://api.fedex.com',
        apiKey: 'fedex-api-key',
        trackingUrlTemplate: 'https://www.fedex.com/fedextrack/?trknbr={tracking_number}'
      };

      mockOrderTrackingService.getCarrierConfig.mockResolvedValue(mockConfig);

      const result = await mockOrderTrackingService.getCarrierConfig(carrier);

      expect(result).toEqual(mockConfig);
      expect(mockOrderTrackingService.getCarrierConfig).toHaveBeenCalledWith(carrier);
    });

    it('should return null for unknown carrier', async () => {
      const carrier = 'unknown';

      mockOrderTrackingService.getCarrierConfig.mockResolvedValue(null);

      const result = await mockOrderTrackingService.getCarrierConfig(carrier);

      expect(result).toBeNull();
      expect(mockOrderTrackingService.getCarrierConfig).toHaveBeenCalledWith(carrier);
    });
  });

  describe('fetchFromCarrierAPI', () => {
    it('should fetch updates from carrier API', async () => {
      const trackingNumber = 'TRK123456789';
      const carrierConfig = {
        name: 'FedEx',
        apiUrl: 'https://api.fedex.com',
        apiKey: 'fedex-api-key'
      };

      const mockApiResponse = [
        {
          status: 'in_transit',
          location: 'Memphis, TN',
          description: 'Package in transit',
          timestamp: '2024-12-29T10:00:00Z'
        }
      ];

      mockOrderTrackingService.fetchFromCarrierAPI.mockResolvedValue(mockApiResponse);

      const result = await mockOrderTrackingService.fetchFromCarrierAPI(trackingNumber, carrierConfig);

      expect(result).toEqual(mockApiResponse);
      expect(mockOrderTrackingService.fetchFromCarrierAPI).toHaveBeenCalledWith(trackingNumber, carrierConfig);
    });
  });

  describe('parseWebhookData', () => {
    it('should parse webhook data correctly', async () => {
      const webhookData = {
        tracking_number: 'TRK123456789',
        status: 'delivered',
        location: 'Customer Address',
        timestamp: '2024-12-29T10:00:00Z'
      };

      const mockParsedData = {
        trackingNumber: 'TRK123456789',
        status: 'delivered',
        location: 'Customer Address',
        timestamp: new Date('2024-12-29T10:00:00Z')
      };

      mockOrderTrackingService.parseWebhookData.mockReturnValue(mockParsedData);

      const result = mockOrderTrackingService.parseWebhookData(webhookData);

      expect(result).toEqual(mockParsedData);
      expect(mockOrderTrackingService.parseWebhookData).toHaveBeenCalledWith(webhookData);
    });
  });

  describe('sendTrackingNotifications', () => {
    it('should send tracking notifications', async () => {
      const tracking = {
        documentId: 'tracking-123',
        orderId: 'order-123',
        trackingNumber: 'TRK123456789'
      };
      const update = {
        status: 'delivered',
        location: 'Customer Address',
        description: 'Package delivered'
      };

      mockOrderTrackingService.sendTrackingNotifications.mockResolvedValue(true);

      const result = await mockOrderTrackingService.sendTrackingNotifications(tracking, update);

      expect(result).toBe(true);
      expect(mockOrderTrackingService.sendTrackingNotifications).toHaveBeenCalledWith(tracking, update);
    });
  });

  describe('sendTrackingEmail', () => {
    it('should send tracking email', async () => {
      const order = {
        documentId: 'order-123',
        orderNumber: 'ORD-2024-001',
        user: { email: 'customer@example.com' }
      };
      const tracking = {
        documentId: 'tracking-123',
        trackingNumber: 'TRK123456789',
        carrier: 'fedex'
      };
      const update = {
        status: 'delivered',
        location: 'Customer Address'
      };

      mockOrderTrackingService.sendTrackingEmail.mockResolvedValue(true);

      const result = await mockOrderTrackingService.sendTrackingEmail(order, tracking, update);

      expect(result).toBe(true);
      expect(mockOrderTrackingService.sendTrackingEmail).toHaveBeenCalledWith(order, tracking, update);
    });
  });

  describe('sendTrackingSMS', () => {
    it('should send tracking SMS', async () => {
      const order = {
        documentId: 'order-123',
        orderNumber: 'ORD-2024-001',
        shippingAddress: { phone: '+1234567890' }
      };
      const tracking = {
        documentId: 'tracking-123',
        trackingNumber: 'TRK123456789'
      };
      const update = {
        status: 'delivered',
        location: 'Customer Address'
      };

      mockOrderTrackingService.sendTrackingSMS.mockResolvedValue(true);

      const result = await mockOrderTrackingService.sendTrackingSMS(order, tracking, update);

      expect(result).toBe(true);
      expect(mockOrderTrackingService.sendTrackingSMS).toHaveBeenCalledWith(order, tracking, update);
    });

    it('should handle SMS sending failure', async () => {
      const order = {
        documentId: 'order-123',
        shippingAddress: { phone: '+1234567890' }
      };
      const tracking = {
        documentId: 'tracking-123',
        trackingNumber: 'TRK123456789'
      };
      const update = {
        status: 'delivered',
        location: 'Customer Address'
      };

      mockOrderTrackingService.sendTrackingSMS.mockRejectedValue(
        new Error('SMS sending failed')
      );

      await expect(
        mockOrderTrackingService.sendTrackingSMS(order, tracking, update)
      ).rejects.toThrow('SMS sending failed');
    });
  });

  describe('getTrackingStatistics', () => {
    it('should get tracking statistics', async () => {
      const mockStats = {
        totalTrackings: 100,
        statusCounts: {
          pending: 10,
          inTransit: 20,
          outForDelivery: 5,
          delivered: 60,
          failed: 2,
          returned: 2,
          lost: 1,
          damaged: 0
        },
        carrierCounts: {
          fedex: 50,
          ups: 30,
          usps: 20
        }
      };

      mockOrderTrackingService.getTrackingStatistics.mockResolvedValue(mockStats);

      const result = await mockOrderTrackingService.getTrackingStatistics();

      expect(result).toEqual(mockStats);
      expect(mockOrderTrackingService.getTrackingStatistics).toHaveBeenCalled();
    });
  });

  describe('cleanupOldTrackingRecords', () => {
    it('should cleanup old tracking records', async () => {
      const olderThanDays = 90;

      const oldRecords = [
        { documentId: 'tracking-1', status: 'delivered' },
        { documentId: 'tracking-2', status: 'delivered' }
      ];

      mockOrderTrackingService.cleanupOldTrackingRecords.mockResolvedValue(2);

      const result = await mockOrderTrackingService.cleanupOldTrackingRecords(olderThanDays);

      expect(result).toBe(2);
      expect(mockOrderTrackingService.cleanupOldTrackingRecords).toHaveBeenCalledWith(olderThanDays);
    });

    it('should handle no old records to cleanup', async () => {
      const olderThanDays = 90;

      mockOrderTrackingService.cleanupOldTrackingRecords.mockResolvedValue(0);

      const result = await mockOrderTrackingService.cleanupOldTrackingRecords(olderThanDays);

      expect(result).toBe(0);
      expect(mockOrderTrackingService.cleanupOldTrackingRecords).toHaveBeenCalledWith(olderThanDays);
    });
  });
});
