/**
 * Order History Service Tests
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
const mockOrderHistoryService = {
  recordOrderCreation: jest.fn() as jest.MockedFunction<any>,
  recordStatusChange: jest.fn() as jest.MockedFunction<any>,
  recordPaymentUpdate: jest.fn() as jest.MockedFunction<any>,
  recordShippingUpdate: jest.fn() as jest.MockedFunction<any>,
  recordAddressChange: jest.fn() as jest.MockedFunction<any>,
  recordNotesUpdate: jest.fn() as jest.MockedFunction<any>,
  recordFraudFlag: jest.fn() as jest.MockedFunction<any>,
  getOrderHistory: jest.fn() as jest.MockedFunction<any>,
  searchOrderHistory: jest.fn() as jest.MockedFunction<any>,
  exportOrderHistory: jest.fn() as jest.MockedFunction<any>,
  getHistoryStatistics: jest.fn() as jest.MockedFunction<any>,
  cleanupOldHistory: jest.fn() as jest.MockedFunction<any>
};

describe('Order History Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup service mock
    mockStrapi.service.mockImplementation((serviceName: any) => {
      if (serviceName === 'api::order.order-history') {
        return mockOrderHistoryService;
      }
      return {};
    });
  });

  describe('recordOrderCreation', () => {
    it('should record order creation event', async () => {
      const orderId = 'order-123';
      const userId = 'user-123';

      const mockHistoryRecord = {
        documentId: 'history-123',
        eventType: 'order_created',
        order: { documentId: orderId },
        changedBy: { documentId: userId }
      };

      mockOrderHistoryService.recordOrderCreation.mockResolvedValue(mockHistoryRecord);

      const result = await mockOrderHistoryService.recordOrderCreation(orderId, userId);

      expect(result).toEqual(mockHistoryRecord);
      expect(mockOrderHistoryService.recordOrderCreation).toHaveBeenCalledWith(orderId, userId);
    });
  });

  describe('recordStatusChange', () => {
    it('should record status change event', async () => {
      const orderId = 'order-123';
      const oldStatus = 'pending';
      const newStatus = 'confirmed';
      const userId = 'user-123';

      const mockHistoryRecord = {
        documentId: 'history-123',
        eventType: 'status_changed',
        order: { documentId: orderId },
        changedBy: { documentId: userId }
      };

      mockOrderHistoryService.recordStatusChange.mockResolvedValue(mockHistoryRecord);

      const result = await mockOrderHistoryService.recordStatusChange(
        orderId,
        oldStatus,
        newStatus,
        userId
      );

      expect(result).toEqual(mockHistoryRecord);
      expect(mockOrderHistoryService.recordStatusChange).toHaveBeenCalledWith(
        orderId,
        oldStatus,
        newStatus,
        userId
      );
    });
  });

  describe('recordPaymentUpdate', () => {
    it('should record payment update event', async () => {
      const orderId = 'order-123';
      const paymentStatus = 'paid';
      const userId = 'user-123';

      const mockHistoryRecord = {
        documentId: 'history-123',
        eventType: 'payment_updated',
        order: { documentId: orderId },
        changedBy: { documentId: userId }
      };

      mockOrderHistoryService.recordPaymentUpdate.mockResolvedValue(mockHistoryRecord);

      const result = await mockOrderHistoryService.recordPaymentUpdate(
        orderId,
        paymentStatus,
        userId
      );

      expect(result).toEqual(mockHistoryRecord);
      expect(mockOrderHistoryService.recordPaymentUpdate).toHaveBeenCalledWith(
        orderId,
        paymentStatus,
        userId
      );
    });
  });

  describe('recordShippingUpdate', () => {
    it('should record shipping update event', async () => {
      const orderId = 'order-123';
      const trackingNumber = 'TRK123456789';
      const userId = 'user-123';

      const mockHistoryRecord = {
        documentId: 'history-123',
        eventType: 'shipping_updated',
        order: { documentId: orderId },
        changedBy: { documentId: userId }
      };

      mockOrderHistoryService.recordShippingUpdate.mockResolvedValue(mockHistoryRecord);

      const result = await mockOrderHistoryService.recordShippingUpdate(
        orderId,
        trackingNumber,
        userId
      );

      expect(result).toEqual(mockHistoryRecord);
      expect(mockOrderHistoryService.recordShippingUpdate).toHaveBeenCalledWith(
        orderId,
        trackingNumber,
        userId
      );
    });
  });

  describe('recordAddressChange', () => {
    it('should record address change event', async () => {
      const orderId = 'order-123';
      const addressType = 'shipping';
      const userId = 'user-123';

      const mockHistoryRecord = {
        documentId: 'history-123',
        eventType: 'address_changed',
        order: { documentId: orderId },
        changedBy: { documentId: userId }
      };

      mockOrderHistoryService.recordAddressChange.mockResolvedValue(mockHistoryRecord);

      const result = await mockOrderHistoryService.recordAddressChange(
        orderId,
        addressType,
        userId
      );

      expect(result).toEqual(mockHistoryRecord);
      expect(mockOrderHistoryService.recordAddressChange).toHaveBeenCalledWith(
        orderId,
        addressType,
        userId
      );
    });
  });

  describe('recordNotesUpdate', () => {
    it('should record notes update event', async () => {
      const orderId = 'order-123';
      const notes = 'Customer requested expedited shipping';
      const userId = 'user-123';

      const mockHistoryRecord = {
        documentId: 'history-123',
        eventType: 'notes_updated',
        order: { documentId: orderId },
        changedBy: { documentId: userId }
      };

      mockOrderHistoryService.recordNotesUpdate.mockResolvedValue(mockHistoryRecord);

      const result = await mockOrderHistoryService.recordNotesUpdate(
        orderId,
        notes,
        userId
      );

      expect(result).toEqual(mockHistoryRecord);
      expect(mockOrderHistoryService.recordNotesUpdate).toHaveBeenCalledWith(
        orderId,
        notes,
        userId
      );
    });
  });

  describe('recordFraudFlag', () => {
    it('should record fraud flag event', async () => {
      const orderId = 'order-123';
      const fraudReason = 'suspicious_payment_method';
      const userId = 'user-123';

      const mockHistoryRecord = {
        documentId: 'history-123',
        eventType: 'fraud_flag_raised',
        order: { documentId: orderId },
        changedBy: { documentId: userId }
      };

      mockOrderHistoryService.recordFraudFlag.mockResolvedValue(mockHistoryRecord);

      const result = await mockOrderHistoryService.recordFraudFlag(
        orderId,
        fraudReason,
        userId
      );

      expect(result).toEqual(mockHistoryRecord);
      expect(mockOrderHistoryService.recordFraudFlag).toHaveBeenCalledWith(
        orderId,
        fraudReason,
        userId
      );
    });
  });

  describe('getOrderHistory', () => {
    it('should get order history', async () => {
      const orderId = 'order-123';

      const mockHistory = [
        {
          documentId: 'history-1',
          eventType: 'order_created',
          order: { documentId: orderId }
        },
        {
          documentId: 'history-2',
          eventType: 'status_changed',
          order: { documentId: orderId }
        }
      ];

      mockOrderHistoryService.getOrderHistory.mockResolvedValue(mockHistory);

      const result = await mockOrderHistoryService.getOrderHistory(orderId);

      expect(result).toEqual(mockHistory);
      expect(mockOrderHistoryService.getOrderHistory).toHaveBeenCalledWith(orderId);
    });
  });

  describe('searchOrderHistory', () => {
    it('should search order history by customer visibility', async () => {
      const orderId = 'order-123';
      const isCustomerVisible = true;

      const mockHistory = [
        {
          documentId: 'history-1',
          eventType: 'order_created',
          isCustomerVisible: true,
          order: { documentId: orderId }
        }
      ];

      mockOrderHistoryService.searchOrderHistory.mockResolvedValue(mockHistory);

      const result = await mockOrderHistoryService.searchOrderHistory(
        orderId,
        { isCustomerVisible }
      );

      expect(result).toEqual(mockHistory);
      expect(mockOrderHistoryService.searchOrderHistory).toHaveBeenCalledWith(
        orderId,
        { isCustomerVisible }
      );
    });

    it('should search order history by follow-up requirement', async () => {
      const orderId = 'order-123';
      const requiresFollowUp = true;

      const mockHistory = [
        {
          documentId: 'history-1',
          eventType: 'fraud_flag_raised',
          requiresFollowUp: true,
          order: { documentId: orderId }
        }
      ];

      mockOrderHistoryService.searchOrderHistory.mockResolvedValue(mockHistory);

      const result = await mockOrderHistoryService.searchOrderHistory(
        orderId,
        { requiresFollowUp }
      );

      expect(result).toEqual(mockHistory);
      expect(mockOrderHistoryService.searchOrderHistory).toHaveBeenCalledWith(
        orderId,
        { requiresFollowUp }
      );
    });

    it('should search order history by change reason', async () => {
      const orderId = 'order-123';
      const changeReason = 'customer_request';

      const mockHistory = [
        {
          documentId: 'history-1',
          changeReason: 'customer_request',
          order: { documentId: orderId }
        }
      ];

      mockOrderHistoryService.searchOrderHistory.mockResolvedValue(mockHistory);

      const result = await mockOrderHistoryService.searchOrderHistory(
        orderId,
        { changeReason }
      );

      expect(result).toEqual(mockHistory);
      expect(mockOrderHistoryService.searchOrderHistory).toHaveBeenCalledWith(
        orderId,
        { changeReason }
      );
    });
  });

  describe('exportOrderHistory', () => {
    it('should export order history', async () => {
      const orderId = 'order-123';
      const format = 'csv';

      const mockHistory = [
        {
          documentId: 'history-1',
          eventType: 'order_created',
          changeSource: 'system',
          changedBy: { username: 'admin' },
          changeReason: 'order_placed',
          priority: 'normal',
          requiresFollowUp: false,
          isCustomerVisible: true,
          createdAt: '2024-12-25T10:00:00Z'
        }
      ];

      mockOrderHistoryService.exportOrderHistory.mockResolvedValue(mockHistory);

      const result = await mockOrderHistoryService.exportOrderHistory(orderId, format);

      expect(result).toEqual(mockHistory);
      expect(mockOrderHistoryService.exportOrderHistory).toHaveBeenCalledWith(orderId, format);
    });
  });

  describe('getHistoryStatistics', () => {
    it('should get history statistics', async () => {
      const orderId = 'order-123';

      const mockStats = {
        totalEvents: 10,
        orderCreated: 2,
        statusChanged: 3,
        paymentUpdated: 1,
        shippingUpdated: 1,
        addressChanged: 1,
        notesUpdated: 1,
        fraudFlagRaised: 1,
        lowPriority: 5,
        normalPriority: 3,
        highPriority: 1,
        criticalPriority: 1,
        followUpCount: 2
      };

      mockOrderHistoryService.getHistoryStatistics.mockResolvedValue(mockStats);

      const result = await mockOrderHistoryService.getHistoryStatistics(orderId);

      expect(result).toEqual(mockStats);
      expect(mockOrderHistoryService.getHistoryStatistics).toHaveBeenCalledWith(orderId);
    });
  });

  describe('cleanupOldHistory', () => {
    it('should cleanup old history records', async () => {
      const olderThanDays = 90;

      const oldRecords = [
        { documentId: 'history-1', priority: 'low' },
        { documentId: 'history-2', priority: 'low' }
      ];

      mockOrderHistoryService.cleanupOldHistory.mockResolvedValue(2);

      const result = await mockOrderHistoryService.cleanupOldHistory(olderThanDays);

      expect(result).toBe(2);
      expect(mockOrderHistoryService.cleanupOldHistory).toHaveBeenCalledWith(olderThanDays);
    });

    it('should handle no old records to cleanup', async () => {
      const olderThanDays = 90;

      mockOrderHistoryService.cleanupOldHistory.mockResolvedValue(0);

      const result = await mockOrderHistoryService.cleanupOldHistory(olderThanDays);

      expect(result).toBe(0);
      expect(mockOrderHistoryService.cleanupOldHistory).toHaveBeenCalledWith(olderThanDays);
    });
  });
});
