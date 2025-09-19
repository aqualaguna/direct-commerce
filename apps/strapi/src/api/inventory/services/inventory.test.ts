/**
 * Inventory Service tests
 *
 * Tests for inventory management service operations following Jest 30+ standards
 * and Document Service API patterns
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Create mock document service methods with proper typing
const mockDocumentMethods = {
  findOne: jest.fn() as jest.MockedFunction<any>,
  findFirst: jest.fn() as jest.MockedFunction<any>,
  findMany: jest.fn() as jest.MockedFunction<any>,
  create: jest.fn() as jest.MockedFunction<any>,
  update: jest.fn() as jest.MockedFunction<any>,
  delete: jest.fn() as jest.MockedFunction<any>,
  count: jest.fn() as jest.MockedFunction<any>,
  publish: jest.fn() as jest.MockedFunction<any>,
  unpublish: jest.fn() as jest.MockedFunction<any>,
  discardDraft: jest.fn() as jest.MockedFunction<any>,
};

// Create mock DB query methods with proper typing
const mockDbQueryMethods = {
  findOne: jest.fn() as jest.MockedFunction<any>,
  findMany: jest.fn() as jest.MockedFunction<any>,
  create: jest.fn() as jest.MockedFunction<any>,
  update: jest.fn() as jest.MockedFunction<any>,
  delete: jest.fn() as jest.MockedFunction<any>,
};

// Mock Strapi instance with Document Service API
const mockStrapi: any = {
  documents: jest.fn(() => mockDocumentMethods),
  db: {
    query: jest.fn(() => mockDbQueryMethods),
  },
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
};

// Mock Strapi factories with proper service context
jest.mock('@strapi/strapi', () => ({
  factories: {
    createCoreService: jest.fn((serviceName: any, serviceFunction?: any) => {
      if (serviceFunction) {
        const serviceInstance = serviceFunction({ strapi: mockStrapi });
        // Bind methods to service instance for proper `this` context
        Object.keys(serviceInstance).forEach(key => {
          if (typeof serviceInstance[key] === 'function') {
            serviceInstance[key] = serviceInstance[key].bind(serviceInstance);
          }
        });
        return serviceInstance;
      }
      return mockStrapi;
    }),
  },
}));

describe('Inventory Service', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all mock document methods
    Object.values(mockDocumentMethods).forEach(mock => mock.mockReset());
    Object.values(mockDbQueryMethods).forEach(mock => mock.mockReset());

    // Import the actual service
    const serviceModule = require('./inventory').default;
    service = serviceModule;
  });

  describe('initializeInventory', () => {
    it('should initialize inventory for a product successfully', async () => {
      const productId = 'product-doc-123';
      const initialQuantity = 100;
      const userId = 'user-123';

      // Mock no existing inventory using Document Service API
      mockDocumentMethods.findMany.mockResolvedValue({
        data: [],
      });

      const mockInventory = {
        documentId: 'inventory-doc-123',
        product: productId,
        quantity: initialQuantity,
        reserved: 0,
        available: initialQuantity,
        lowStockThreshold: 10,
        isLowStock: false,
      };

      mockDocumentMethods.create.mockResolvedValue(mockInventory);

      const result = await service.initializeInventory(
        productId,
        initialQuantity,
        userId
      );

      expect(result).toEqual(mockInventory);
      expect(mockStrapi.documents).toHaveBeenCalledWith(
        'api::inventory.inventory'
      );
      expect(mockDocumentMethods.findMany).toHaveBeenCalledWith({
        filters: { product: productId },
        limit: 1,
        start: 0,
      });
    });

    it('should throw error if inventory already exists', async () => {
      const productId = 'product-doc-123';

      // Mock existing inventory using Document Service API
      mockDocumentMethods.findMany.mockResolvedValue({
        data: [{ documentId: 'existing-doc-id' }],
      });

      await expect(service.initializeInventory(productId)).rejects.toThrow(
        'Inventory record already exists for this product'
      );
    });
  });

  describe('updateInventory', () => {
    it('should update inventory quantity successfully', async () => {
      const productId = 'product-doc-123';
      const quantityChange = 50;
      const options = {
        reason: 'Stock replenishment',
        source: 'manual' as const,
        userId: 'user-123',
      };

      const mockInventory = {
        documentId: 'inventory-doc-123',
        product: productId,
        quantity: 100,
        reserved: 10,
        lowStockThreshold: 20,
        isLowStock: false,
      };

      // Mock DB query for atomic operations
      mockDbQueryMethods.findOne.mockResolvedValue(mockInventory);

      const updatedInventory = {
        ...mockInventory,
        quantity: 150,
        available: 140, // 150 - 10 reserved
        isLowStock: false,
      };

      // Mock Document Service API update calls
      mockDocumentMethods.update.mockResolvedValue(updatedInventory);

      const result = await service.updateInventory(
        productId,
        quantityChange,
        options
      );

      expect(result).toEqual(updatedInventory);
      expect(mockStrapi.db.query).toHaveBeenCalledWith(
        'api::inventory.inventory'
      );
      expect(mockDocumentMethods.update).toHaveBeenCalled();
    });

    it('should throw error for insufficient inventory', async () => {
      const productId = 'product-doc-123';
      const quantityChange = -150; // Trying to reduce by more than available
      const options = {
        reason: 'Order fulfillment',
        allowNegative: false,
      };

      const mockInventory = {
        documentId: 'inventory-doc-123',
        product: productId,
        quantity: 100,
        reserved: 10,
      };

      mockDbQueryMethods.findOne.mockResolvedValue(mockInventory);

      await expect(
        service.updateInventory(productId, quantityChange, options)
      ).rejects.toThrow('Insufficient inventory. Cannot reduce below zero.');
    });

    it('should throw error if inventory not found', async () => {
      const productId = 'product-doc-123';
      const quantityChange = 50;
      const options = { reason: 'Test' };

      mockDbQueryMethods.findOne.mockResolvedValue(null);

      await expect(
        service.updateInventory(productId, quantityChange, options)
      ).rejects.toThrow('Inventory record not found for product');
    });
  });

  describe('reserveStock', () => {
    it('should reserve stock successfully', async () => {
      const productId = 'product-doc-123';
      const quantity = 5;
      const options = {
        orderId: 'order-123',
        customerId: 'customer-123',
        expirationMinutes: 30,
      };

      const mockInventory = {
        documentId: 'inventory-doc-123',
        product: productId,
        quantity: 100,
        reserved: 10,
        available: 90,
      };

      const mockReservation = {
        documentId: 'reservation-doc-123',
        product: productId,
        quantity,
        orderId: options.orderId,
        status: 'active',
        expiresAt: new Date(),
      };

      mockDbQueryMethods.findOne.mockResolvedValue(mockInventory);
      mockDocumentMethods.create.mockResolvedValue(mockReservation);
      mockDocumentMethods.update.mockResolvedValue({});

      const result = await service.reserveStock(productId, quantity, options);

      expect(result).toEqual(mockReservation);
      expect(mockDocumentMethods.create).toHaveBeenCalled();
      expect(mockDocumentMethods.update).toHaveBeenCalled();
    });

    it('should throw error for insufficient available stock', async () => {
      const productId = 'product-doc-123';
      const quantity = 100; // More than available
      const options = {
        orderId: 'order-123',
      };

      const mockInventory = {
        documentId: 'inventory-doc-123',
        product: productId,
        quantity: 100,
        reserved: 10,
        available: 90,
      };

      mockDbQueryMethods.findOne.mockResolvedValue(mockInventory);

      await expect(
        service.reserveStock(productId, quantity, options)
      ).rejects.toThrow('Insufficient available inventory for reservation');
    });
  });

  describe('getInventoryAnalytics', () => {
    it('should return inventory analytics', async () => {
      const mockInventories = [
        {
          quantity: 100,
          available: 90,
          reserved: 10,
          isLowStock: false,
          product: { price: 10.99 },
        },
        {
          quantity: 50,
          available: 45,
          reserved: 5,
          isLowStock: false,
          product: { price: 25.99 },
        },
        {
          quantity: 5,
          available: 5,
          reserved: 0,
          isLowStock: true,
          lowStockThreshold: 10,
          product: {
            documentId: 'prod-1',
            title: 'Low Stock Product',
            sku: 'SKU-001',
            price: 15.99,
          },
        },
      ];

      mockDocumentMethods.findMany.mockResolvedValue({
        data: mockInventories,
      });

      const result = await service.getInventoryAnalytics();

      expect(result).toMatchObject({
        totalProducts: 3,
        totalQuantity: 155,
        totalAvailable: 140,
        totalReserved: 15,
        lowStockCount: 1,
        outOfStockCount: 0,
      });
      expect(mockStrapi.documents).toHaveBeenCalledWith(
        'api::inventory.inventory'
      );
    });
  });

  describe('createHistoryRecord', () => {
    it('should create inventory history record', async () => {
      const historyData = {
        productId: 'product-doc-123',
        action: 'increase' as const,
        quantityBefore: 50,
        quantityAfter: 100,
        quantityChanged: 50,
        reservedBefore: 0,
        reservedAfter: 0,
        reason: 'Stock replenishment',
        source: 'manual' as const,
        changedBy: 'user-123',
      };

      const mockHistoryRecord = {
        documentId: 'history-doc-123',
        ...historyData,
        timestamp: new Date(),
      };

      mockDocumentMethods.create.mockResolvedValue(mockHistoryRecord);

      const result = await service.createHistoryRecord(historyData);

      expect(result).toEqual(mockHistoryRecord);
      expect(mockDocumentMethods.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            product: historyData.productId,
            action: historyData.action,
            reason: historyData.reason,
          }),
        })
      );
    });
  });
});
