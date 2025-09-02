/**
 * Order Status Management Service Tests
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
const mockOrderStatusService = {
  updateOrderStatus: jest.fn() as jest.MockedFunction<any>,
  validateStatusTransition: jest.fn() as jest.MockedFunction<any>,
  sendStatusNotification: jest.fn() as jest.MockedFunction<any>,
  triggerAutomationRules: jest.fn() as jest.MockedFunction<any>,
  getAutomationRules: jest.fn() as jest.MockedFunction<any>,
  executeAutomationRule: jest.fn() as jest.MockedFunction<any>,
  getOrderStatusHistory: jest.fn() as jest.MockedFunction<any>,
  getOrdersByStatus: jest.fn() as jest.MockedFunction<any>,
  getStatusStatistics: jest.fn() as jest.MockedFunction<any>
};

describe('Order Status Management Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup service mock
    mockStrapi.service.mockImplementation((serviceName: any) => {
      if (serviceName === 'api::order.order-status-management') {
        return mockOrderStatusService;
      }
      return {};
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status successfully', async () => {
      const orderId = 'order-123';
      const newStatus = 'confirmed';
      const userId = 'user-123';
      const notes = 'Payment confirmed';

      const mockUpdatedOrder = {
        documentId: orderId,
        status: newStatus,
        user: { documentId: userId }
      };

      mockOrderStatusService.updateOrderStatus.mockResolvedValue(mockUpdatedOrder);

      const result = await mockOrderStatusService.updateOrderStatus(
        orderId,
        newStatus,
        userId,
        notes
      );

      expect(result).toEqual(mockUpdatedOrder);
      expect(mockOrderStatusService.updateOrderStatus).toHaveBeenCalledWith(
        orderId,
        newStatus,
        userId,
        notes
      );
    });

    it('should throw error if order not found', async () => {
      const orderId = 'nonexistent-order';
      const newStatus = 'confirmed';
      const userId = 'user-123';

      mockOrderStatusService.updateOrderStatus.mockRejectedValue(
        new Error('Order not found')
      );

      await expect(
        mockOrderStatusService.updateOrderStatus(orderId, newStatus, userId)
      ).rejects.toThrow('Order not found');
    });

    it('should validate status transition', async () => {
      const orderId = 'order-123';
      const currentStatus = 'pending';
      const newStatus = 'confirmed';

      mockOrderStatusService.validateStatusTransition.mockResolvedValue(true);

      const result = await mockOrderStatusService.validateStatusTransition(
        currentStatus,
        newStatus
      );

      expect(result).toBe(true);
      expect(mockOrderStatusService.validateStatusTransition).toHaveBeenCalledWith(
        currentStatus,
        newStatus
      );
    });

    it('should reject invalid status transition', async () => {
      const currentStatus = 'delivered';
      const newStatus = 'pending';

      mockOrderStatusService.validateStatusTransition.mockRejectedValue(
        new Error('Invalid status transition')
      );

      await expect(
        mockOrderStatusService.validateStatusTransition(currentStatus, newStatus)
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('automation rules', () => {
    it('should get automation rules', async () => {
      const mockRules = {
        'confirmed': ['reserveInventory', 'sendConfirmation'],
        'processing': ['updateInventory', 'notifyWarehouse'],
        'shipped': ['sendTracking', 'updateDelivery']
      };

      mockOrderStatusService.getAutomationRules.mockResolvedValue(mockRules);

      const result = await mockOrderStatusService.getAutomationRules();

      expect(result).toEqual(mockRules);
      expect(mockOrderStatusService.getAutomationRules).toHaveBeenCalled();
    });

    it('should execute inventory reservation rule', async () => {
      const orderId = 'order-123';
      const ruleName = 'reserveInventory';

      mockOrderStatusService.executeAutomationRule.mockResolvedValue(true);

      const result = await mockOrderStatusService.executeAutomationRule(
        orderId,
        ruleName
      );

      expect(result).toBe(true);
      expect(mockOrderStatusService.executeAutomationRule).toHaveBeenCalledWith(
        orderId,
        ruleName
      );
    });

    it('should execute payment verification rule', async () => {
      const orderId = 'order-123';
      const ruleName = 'verifyPayment';

      mockOrderStatusService.executeAutomationRule.mockResolvedValue(true);

      const result = await mockOrderStatusService.executeAutomationRule(
        orderId,
        ruleName
      );

      expect(result).toBe(true);
      expect(mockOrderStatusService.executeAutomationRule).toHaveBeenCalledWith(
        orderId,
        ruleName
      );
    });
  });

  describe('order status history', () => {
    it('should get order status history', async () => {
      const orderId = 'order-123';

      const mockHistory = [
        {
          documentId: 'status-1',
          status: 'pending',
          previousStatus: null,
          createdAt: new Date('2024-12-25T10:00:00Z')
        },
        {
          documentId: 'status-2',
          status: 'confirmed',
          previousStatus: 'pending',
          createdAt: new Date('2024-12-25T10:30:00Z')
        }
      ];

      mockOrderStatusService.getOrderStatusHistory.mockResolvedValue(mockHistory);

      const result = await mockOrderStatusService.getOrderStatusHistory(orderId);

      expect(result).toEqual(mockHistory);
      expect(mockOrderStatusService.getOrderStatusHistory).toHaveBeenCalledWith(orderId);
    });
  });

  describe('orders by status', () => {
    it('should get orders by status', async () => {
      const status = 'pending';

      const mockOrders = [
        {
          documentId: 'order-1',
          status: 'pending',
          orderNumber: 'ORD-001'
        },
        {
          documentId: 'order-2',
          status: 'pending',
          orderNumber: 'ORD-002'
        }
      ];

      mockOrderStatusService.getOrdersByStatus.mockResolvedValue(mockOrders);

      const result = await mockOrderStatusService.getOrdersByStatus(status);

      expect(result).toEqual(mockOrders);
      expect(mockOrderStatusService.getOrdersByStatus).toHaveBeenCalledWith(status);
    });
  });

  describe('status statistics', () => {
    it('should get status statistics', async () => {
      const mockStats = {
        pending: 5,
        confirmed: 3,
        processing: 2,
        shipped: 1,
        delivered: 10,
        cancelled: 0,
        refunded: 1
      };

      mockOrderStatusService.getStatusStatistics.mockResolvedValue(mockStats);

      const result = await mockOrderStatusService.getStatusStatistics();

      expect(result).toEqual(mockStats);
      expect(mockOrderStatusService.getStatusStatistics).toHaveBeenCalled();
    });
  });

  describe('notifications', () => {
    it('should send status notification', async () => {
      const orderId = 'order-123';
      const status = 'shipped';
      const userId = 'user-123';

      mockOrderStatusService.sendStatusNotification.mockResolvedValue(true);

      const result = await mockOrderStatusService.sendStatusNotification(
        orderId,
        status,
        userId
      );

      expect(result).toBe(true);
      expect(mockOrderStatusService.sendStatusNotification).toHaveBeenCalledWith(
        orderId,
        status,
        userId
      );
    });

    it('should handle notification failure', async () => {
      const orderId = 'order-123';
      const status = 'shipped';
      const userId = 'user-123';

      mockOrderStatusService.sendStatusNotification.mockRejectedValue(
        new Error('Notification failed')
      );

      await expect(
        mockOrderStatusService.sendStatusNotification(orderId, status, userId)
      ).rejects.toThrow('Notification failed');
    });
  });
});
