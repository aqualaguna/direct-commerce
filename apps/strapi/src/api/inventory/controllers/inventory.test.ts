/**
 * Inventory controller tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock test data
const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: { id: 1, name: 'Authenticated', type: 'authenticated' }
};

const mockProduct = {
  id: 1,
  title: 'Test Product',
  slug: 'test-product',
  description: 'Test description',
  price: 29.99,
  sku: 'TEST-001',
  inventory: 10
};

const mockInventory = {
  id: 1,
  product: mockProduct,
  quantity: 100,
  reserved: 0,
  available: 100,
  lowStockThreshold: 10,
  isLowStock: false,
  lastUpdated: new Date(),
  updatedBy: mockUser.id
};

// Mock Strapi
const mockStrapi = {
  entityService: {
    findOne: jest.fn() as any,
    findMany: jest.fn() as any,
    create: jest.fn() as any,
    update: jest.fn() as any,
    delete: jest.fn() as any,
  },
  service: jest.fn() as any,
  log: {
    error: jest.fn() as any,
    warn: jest.fn() as any,
    info: jest.fn() as any,
    debug: jest.fn() as any,
  },
};

// Mock service
const mockInventoryService = {
  initializeInventory: jest.fn() as any,
  updateInventory: jest.fn() as any,
  reserveStock: jest.fn() as any,
  releaseReservation: jest.fn() as any,
  getInventoryAnalytics: jest.fn() as any,
};

// Mock context helper
const createMockContext = (overrides: any = {}) => ({
  state: { user: null },
  params: {},
  query: {},
  request: { body: {} },
  response: {},
  body: undefined,
  send: jest.fn(),
  badRequest: jest.fn(),
  unauthorized: jest.fn(),
  forbidden: jest.fn(),
  notFound: jest.fn(),
  internalServerError: jest.fn(),
  conflict: jest.fn(),
  throw: jest.fn(),
  set: jest.fn(),
  ...overrides,
});

// Mock the controller factory
jest.mock('@strapi/strapi', () => ({
  factories: {
    createCoreController: jest.fn((serviceName: string, controllerFunction: any) => {
      return controllerFunction({ strapi: mockStrapi });
    }),
  },
}));

describe('Inventory Controller', () => {
  let inventoryController: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock service
    mockStrapi.service.mockReturnValue(mockInventoryService);
    
    // Import the controller
    const controllerModule = require('./inventory').default;
    inventoryController = controllerModule;
  });

  describe('initializeInventory', () => {
    it('should initialize inventory for a product successfully', async () => {
      // Arrange
      const ctx = createMockContext({
        request: { body: { productId: mockProduct.id, initialQuantity: 100 } },
        state: { user: mockUser }
      });

      mockStrapi.entityService.findOne.mockResolvedValue(mockProduct);
      mockInventoryService.initializeInventory.mockResolvedValue(mockInventory);

      // Act
      await inventoryController.initializeInventory(ctx);

      // Assert
      expect(mockStrapi.entityService.findOne).toHaveBeenCalledWith('api::product.product', mockProduct.id);
      expect(mockInventoryService.initializeInventory).toHaveBeenCalledWith(
        mockProduct.id,
        100,
        mockUser.id
      );
      expect(ctx.body).toEqual({
        data: mockInventory,
        meta: { message: 'Inventory initialized successfully' }
      });
    });

    it('should return bad request when product ID is missing', async () => {
      // Arrange
      const ctx = createMockContext({
        request: { body: { initialQuantity: 100 } },
        state: { user: mockUser }
      });

      // Act
      await inventoryController.initializeInventory(ctx);

      // Assert
      expect(ctx.badRequest).toHaveBeenCalledWith('Product ID is required');
    });

    it('should return not found when product does not exist', async () => {
      // Arrange
      const ctx = createMockContext({
        request: { body: { productId: 'non-existent-id', initialQuantity: 100 } },
        state: { user: mockUser }
      });

      mockStrapi.entityService.findOne.mockResolvedValue(null);

      // Act
      await inventoryController.initializeInventory(ctx);

      // Assert
      expect(ctx.notFound).toHaveBeenCalledWith('Product not found');
    });
  });

  describe('updateQuantity', () => {
    it('should update inventory quantity successfully', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: mockInventory.id },
        request: { body: { quantityChange: 50, reason: 'Restock', source: 'manual' } },
        state: { user: mockUser }
      });

      const updatedInventory = { ...mockInventory, quantity: 150, available: 150 };
      
      mockStrapi.entityService.findOne.mockResolvedValue(mockInventory);
      mockInventoryService.updateInventory.mockResolvedValue(updatedInventory);

      // Act
      await inventoryController.updateQuantity(ctx);

      // Assert
      expect(mockInventoryService.updateInventory).toHaveBeenCalledWith(
        mockProduct.id,
        50,
        {
          reason: 'Restock',
          source: 'manual',
          orderId: undefined,
          userId: mockUser.id,
          allowNegative: false
        }
      );
      expect(ctx.body).toEqual({
        data: updatedInventory,
        meta: { message: 'Inventory updated successfully' }
      });
    });

    it('should return bad request when required fields are missing', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: mockInventory.id },
        request: { body: { quantityChange: 50 } }, // Missing reason
        state: { user: mockUser }
      });

      // Act
      await inventoryController.updateQuantity(ctx);

      // Assert
      expect(ctx.badRequest).toHaveBeenCalledWith('Quantity change and reason are required');
    });
  });

  describe('reserveStock', () => {
    it('should reserve stock successfully', async () => {
      // Arrange
      const ctx = createMockContext({
        request: {
          body: {
            productId: mockProduct.id,
            quantity: 25,
            orderId: 'ORDER-001',
            expirationMinutes: 30
          }
        },
        state: { user: mockUser }
      });

      const reservation = {
        id: 1,
        product: mockProduct,
        quantity: 25,
        orderId: 'ORDER-001',
        status: 'active',
        expiresAt: new Date()
      };

      mockInventoryService.reserveStock.mockResolvedValue(reservation);

      // Act
      await inventoryController.reserveStock(ctx);

      // Assert
      expect(mockInventoryService.reserveStock).toHaveBeenCalledWith(
        mockProduct.id,
        25,
        {
          orderId: 'ORDER-001',
          customerId: mockUser.id,
          expirationMinutes: 30
        }
      );
      expect(ctx.body).toEqual({
        data: reservation,
        meta: { message: 'Stock reserved successfully' }
      });
    });

    it('should return bad request when required fields are missing', async () => {
      // Arrange
      const ctx = createMockContext({
        request: { body: { productId: mockProduct.id, quantity: 25 } }, // Missing orderId
        state: { user: mockUser }
      });

      // Act
      await inventoryController.reserveStock(ctx);

      // Assert
      expect(ctx.badRequest).toHaveBeenCalledWith('Product ID, quantity, and order ID are required');
    });
  });

  describe('findByProduct', () => {
    it('should find inventory by product ID', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { productId: mockProduct.id }
      });

      mockStrapi.entityService.findMany.mockResolvedValue([mockInventory]);

      // Act
      await inventoryController.findByProduct(ctx);

      // Assert
      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::inventory.inventory',
        expect.objectContaining({
          filters: { product: mockProduct.id },
          limit: 1
        })
      );
      expect(ctx.body).toEqual({
        data: mockInventory,
        meta: {}
      });
    });

    it('should return 404 when inventory not found', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { productId: 'non-existent-id' }
      });

      mockStrapi.entityService.findMany.mockResolvedValue([]);

      // Act
      await inventoryController.findByProduct(ctx);

      // Assert
      expect(ctx.notFound).toHaveBeenCalledWith('Inventory record not found for this product');
    });
  });

  describe('getLowStock', () => {
    it('should get low stock products', async () => {
      // Arrange
      const ctx = createMockContext({
        query: { page: 1, pageSize: 25 }
      });

      const lowStockInventory = {
        data: [{ ...mockInventory, isLowStock: true, quantity: 5 }],
        meta: { pagination: { page: 1, pageSize: 25, total: 1 } }
      };

      mockStrapi.entityService.findMany.mockResolvedValue(lowStockInventory);

      // Act
      await inventoryController.getLowStock(ctx);

      // Assert
      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::inventory.inventory',
        expect.objectContaining({
          filters: { isLowStock: true },
          sort: ['quantity:asc'],
          pagination: { page: 1, pageSize: 25 }
        })
      );
      expect(ctx.body).toEqual(lowStockInventory);
    });
  });

  describe('getAnalytics', () => {
    it('should get inventory analytics', async () => {
      // Arrange
      const ctx = createMockContext({
        query: {}
      });

      const analyticsData = {
        totalProducts: 10,
        lowStockCount: 2,
        outOfStockCount: 1,
        totalQuantity: 500,
        totalReserved: 50,
        totalAvailable: 450,
        lowStockPercentage: 20,
        outOfStockPercentage: 10
      };

      mockInventoryService.getInventoryAnalytics.mockResolvedValue(analyticsData);

      // Act
      await inventoryController.getAnalytics(ctx);

      // Assert
      expect(mockInventoryService.getInventoryAnalytics).toHaveBeenCalledWith({});
      expect(ctx.body).toEqual({
        data: analyticsData,
        meta: expect.objectContaining({
          generatedAt: expect.any(Date)
        })
      });
    });
  });

  describe('find', () => {
    it('should find all inventory records', async () => {
      // Arrange
      const ctx = createMockContext({
        query: { page: 1, pageSize: 25 }
      });

      const inventoryData = {
        data: [mockInventory],
        meta: { pagination: { page: 1, pageSize: 25, total: 1 } }
      };

      mockStrapi.entityService.findMany.mockResolvedValue(inventoryData);

      // Act
      await inventoryController.find(ctx);

      // Assert
      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::inventory.inventory',
        expect.objectContaining({
          page: 1,
          pageSize: 25,
          populate: expect.objectContaining({
            product: expect.any(Object),
            updatedBy: expect.any(Object)
          })
        })
      );
      expect(ctx.body).toEqual(inventoryData);
    });
  });

  describe('findOne', () => {
    it('should find single inventory record', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: mockInventory.id }
      });

      mockStrapi.entityService.findOne.mockResolvedValue(mockInventory);

      // Act
      await inventoryController.findOne(ctx);

      // Assert
      expect(mockStrapi.entityService.findOne).toHaveBeenCalledWith(
        'api::inventory.inventory',
        mockInventory.id,
        expect.objectContaining({
          populate: expect.objectContaining({
            product: expect.any(Object),
            updatedBy: expect.any(Object)
          })
        })
      );
      expect(ctx.body).toEqual({
        data: mockInventory,
        meta: {}
      });
    });

    it('should return 404 when inventory not found', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'non-existent-id' }
      });

      mockStrapi.entityService.findOne.mockResolvedValue(null);

      // Act
      await inventoryController.findOne(ctx);

      // Assert
      expect(ctx.notFound).toHaveBeenCalledWith('Inventory record not found');
    });
  });
});