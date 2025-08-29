/**
 * Inventory controller tests
 *
 * Tests for inventory management controller following Jest 30+ standards
 * and new test patterns for Document Service API migration
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Test data factories
const createTestUser = (overrides = {}) => ({
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  role: { id: '1', name: 'Authenticated', type: 'authenticated' },
  ...overrides,
});

const createTestProduct = (overrides = {}) => ({
  documentId: 'test-product-doc-id',
  title: 'Test Product',
  slug: 'test-product',
  description: 'Test description',
  price: 29.99,
  sku: 'TEST-001',
  inventory: 10,
  ...overrides,
});

const createTestInventory = (overrides = {}) => ({
  documentId: 'test-inventory-doc-id',
  product: createTestProduct(),
  quantity: 100,
  reserved: 0,
  available: 100,
  lowStockThreshold: 10,
  isLowStock: false,
  lastUpdated: new Date('2025-01-26T10:00:00.000Z'), // Fixed timestamp to avoid precision issues
  updatedBy: '1',
  ...overrides,
});

// Create mock document methods
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

// Create service mock methods
const mockServiceMethods = {
  initializeInventory: jest.fn() as jest.MockedFunction<any>,
  updateInventory: jest.fn() as jest.MockedFunction<any>,
  reserveStock: jest.fn() as jest.MockedFunction<any>,
  releaseReservation: jest.fn() as jest.MockedFunction<any>,
  getInventoryAnalytics: jest.fn() as jest.MockedFunction<any>,
};

// Mock Strapi with Document Service API support
const mockStrapi = {
  documents: jest.fn(() => mockDocumentMethods),
  service: jest.fn(() => mockServiceMethods),
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
};

// Context helper following new test standards
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

// Mock Strapi factories following new test standards
jest.mock('@strapi/strapi', () => ({
  factories: {
    createCoreController: jest.fn(
      (serviceName: string, controllerFunction: any) => {
        return controllerFunction({ strapi: mockStrapi });
      }
    ),
  },
}));

describe('Inventory Controller', () => {
  let inventoryController: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all mock methods
    Object.values(mockDocumentMethods).forEach(mock => mock.mockReset());
    Object.values(mockServiceMethods).forEach(mock => mock.mockReset());

    // Import the controller
    const controllerModule = require('./inventory').default;
    inventoryController = controllerModule;
  });

  describe('initializeInventory', () => {
    it('should initialize inventory for a product successfully', async () => {
      // Arrange
      const testUser = createTestUser();
      const testProduct = createTestProduct();
      const testInventory = createTestInventory();

      const ctx = createMockContext({
        request: {
          body: {
            productId: testProduct.documentId,
            initialQuantity: 100,
          },
        },
        state: { user: testUser },
      });

      // Mock Document Service API responses
      mockDocumentMethods.findOne.mockResolvedValue(testProduct);
      mockServiceMethods.initializeInventory.mockResolvedValue(testInventory);

      // Act
      await inventoryController.initializeInventory(ctx);

      // Assert
      expect(mockStrapi.documents).toHaveBeenCalled();
      expect(mockDocumentMethods.findOne).toHaveBeenCalledWith({
        documentId: testProduct.documentId,
      });
      expect(mockStrapi.service).toHaveBeenCalled();
      expect(mockServiceMethods.initializeInventory).toHaveBeenCalledWith(
        testProduct.documentId,
        100,
        testUser.id
      );
      expect(ctx.body).toEqual({
        data: testInventory,
        meta: { message: 'Inventory initialized successfully' },
      });
    });

    it('should return bad request when product ID is missing', async () => {
      // Arrange
      const testUser = createTestUser();
      const ctx = createMockContext({
        request: { body: { initialQuantity: 100 } },
        state: { user: testUser },
      });

      // Act
      await inventoryController.initializeInventory(ctx);

      // Assert
      expect(ctx.badRequest).toHaveBeenCalledWith('Product ID is required');
    });

    it('should return not found when product does not exist', async () => {
      // Arrange
      const testUser = createTestUser();
      const ctx = createMockContext({
        request: {
          body: { productId: 'non-existent-doc-id', initialQuantity: 100 },
        },
        state: { user: testUser },
      });

      // Mock Document Service API returning null
      mockDocumentMethods.findOne.mockResolvedValue(null);

      // Act
      await inventoryController.initializeInventory(ctx);

      // Assert
      expect(mockDocumentMethods.findOne).toHaveBeenCalledWith({
        documentId: 'non-existent-doc-id',
      });
      expect(ctx.notFound).toHaveBeenCalledWith('Product not found');
    });
  });

  describe('updateQuantity', () => {
    it('should update inventory quantity successfully', async () => {
      // Arrange
      const testUser = createTestUser();
      const testInventory = createTestInventory();
      const testProduct = createTestProduct();

      const ctx = createMockContext({
        params: { id: testInventory.documentId },
        request: {
          body: { quantityChange: 50, reason: 'Restock', source: 'manual' },
        },
        state: { user: testUser },
      });

      const updatedInventory = {
        ...testInventory,
        quantity: 150,
        available: 150,
      };

      // Mock Document Service API responses
      mockDocumentMethods.findOne.mockResolvedValue({
        ...testInventory,
        product: testProduct,
      });
      mockServiceMethods.updateInventory.mockResolvedValue(updatedInventory);

      // Act
      await inventoryController.updateQuantity(ctx);

      // Assert
      expect(mockDocumentMethods.findOne).toHaveBeenCalledWith({
        documentId: testInventory.documentId,
        populate: {
          product: {
            fields: ['documentId', 'title', 'sku'],
          },
        },
      });
      expect(mockServiceMethods.updateInventory).toHaveBeenCalledWith(
        testProduct.documentId,
        50,
        {
          reason: 'Restock',
          source: 'manual',
          orderId: undefined,
          userId: testUser.id,
          allowNegative: false,
        }
      );
      expect(ctx.body).toEqual({
        data: updatedInventory,
        meta: { message: 'Inventory updated successfully' },
      });
    });

    it('should return bad request when required fields are missing', async () => {
      // Arrange
      const testUser = createTestUser();
      const testInventory = createTestInventory();

      const ctx = createMockContext({
        params: { id: testInventory.documentId },
        request: { body: { quantityChange: 50 } }, // Missing reason
        state: { user: testUser },
      });

      // Act
      await inventoryController.updateQuantity(ctx);

      // Assert
      expect(ctx.badRequest).toHaveBeenCalledWith(
        'Quantity change and reason are required'
      );
    });
  });

  describe('reserveStock', () => {
    it('should reserve stock successfully', async () => {
      // Arrange
      const ctx = createMockContext({
        request: {
          body: {
            productId: createTestProduct().documentId,
            quantity: 25,
            orderId: 'ORDER-001',
            expirationMinutes: 30,
          },
        },
        state: { user: createTestUser() },
      });

      const reservation = {
        id: 1,
        product: createTestProduct(),
        quantity: 25,
        orderId: 'ORDER-001',
        status: 'active',
        expiresAt: new Date(),
      };

      mockServiceMethods.reserveStock.mockResolvedValue(reservation);

      // Act
      await inventoryController.reserveStock(ctx);

      // Assert
      expect(mockServiceMethods.reserveStock).toHaveBeenCalledWith(
        createTestProduct().documentId,
        25,
        {
          orderId: 'ORDER-001',
          customerId: createTestUser().id,
          expirationMinutes: 30,
        }
      );
      expect(ctx.body).toEqual({
        data: reservation,
        meta: { message: 'Stock reserved successfully' },
      });
    });

    it('should return bad request when required fields are missing', async () => {
      // Arrange
      const ctx = createMockContext({
        request: {
          body: { productId: createTestProduct().documentId, quantity: 25 },
        }, // Missing orderId
        state: { user: createTestUser() },
      });

      // Act
      await inventoryController.reserveStock(ctx);

      // Assert
      expect(ctx.badRequest).toHaveBeenCalledWith(
        'Product ID, quantity, and order ID are required'
      );
    });
  });

  describe('findByProduct', () => {
    it('should find inventory by product ID', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { productId: createTestProduct().documentId },
      });

      mockDocumentMethods.findMany.mockResolvedValue({
        data: [createTestInventory()],
      });

      // Act
      await inventoryController.findByProduct(ctx);

      // Assert
      expect(mockDocumentMethods.findMany).toHaveBeenCalledWith({
        filters: { product: createTestProduct().documentId },
        populate: {
          product: {
            fields: ['documentId', 'title', 'sku'],
          },
          updatedBy: {
            fields: ['id', 'username', 'email'],
          },
        },
        pagination: { page: 1, pageSize: 1 },
      });
      expect(ctx.body).toEqual({
        data: createTestInventory(),
        meta: {},
      });
    });

    it('should return 404 when inventory not found', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { productId: 'non-existent-id' },
      });

      mockDocumentMethods.findMany.mockResolvedValue({ data: [] });

      // Act
      await inventoryController.findByProduct(ctx);

      // Assert
      expect(ctx.notFound).toHaveBeenCalledWith(
        'Inventory record not found for this product'
      );
    });
  });

  describe('getLowStock', () => {
    it('should get low stock products', async () => {
      // Arrange
      const ctx = createMockContext({
        query: { page: 1, pageSize: 25 },
      });

      const lowStockInventory = [
        { ...createTestInventory(), isLowStock: true, quantity: 5 },
      ];

      mockDocumentMethods.findMany.mockResolvedValue(lowStockInventory);

      // Act
      await inventoryController.getLowStock(ctx);

      // Assert
      expect(mockDocumentMethods.findMany).toHaveBeenCalledWith({
        filters: { isLowStock: true },
        populate: {
          product: {
            fields: ['documentId', 'title', 'sku', 'price'],
          },
        },
        sort: { quantity: 'asc' },
        pagination: {
          page: 1,
          pageSize: 25,
        },
      });
      expect(ctx.body).toEqual(lowStockInventory);
    });
  });

  describe('getAnalytics', () => {
    it('should get inventory analytics', async () => {
      // Arrange
      const ctx = createMockContext({
        query: {},
      });

      const analyticsData = {
        totalProducts: 10,
        lowStockCount: 2,
        outOfStockCount: 1,
        totalQuantity: 500,
        totalReserved: 50,
        totalAvailable: 450,
        lowStockPercentage: 20,
        outOfStockPercentage: 10,
      };

      mockServiceMethods.getInventoryAnalytics.mockResolvedValue(analyticsData);

      // Act
      await inventoryController.getAnalytics(ctx);

      // Assert
      expect(mockServiceMethods.getInventoryAnalytics).toHaveBeenCalledWith({});
      expect(ctx.body).toEqual({
        data: analyticsData,
        meta: expect.objectContaining({
          generatedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('find', () => {
    it('should find all inventory records', async () => {
      // Arrange
      const ctx = createMockContext({
        query: { page: 1, pageSize: 25 },
      });

      const inventoryData = [createTestInventory()];

      mockDocumentMethods.findMany.mockResolvedValue(inventoryData);

      // Act
      await inventoryController.find(ctx);

      // Assert
      expect(mockDocumentMethods.findMany).toHaveBeenCalledWith({
        page: 1,
        pageSize: 25,
        populate: {
          product: {
            fields: ['documentId', 'title', 'sku', 'price', 'status'],
          },
          updatedBy: {
            fields: ['id', 'username', 'email'],
          },
        },
      });
      expect(ctx.body).toEqual(inventoryData);
    });
  });

  describe('findOne', () => {
    it('should find single inventory record', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: createTestInventory().documentId },
      });

      mockDocumentMethods.findOne.mockResolvedValue(createTestInventory());

      // Act
      await inventoryController.findOne(ctx);

      // Assert
      expect(mockDocumentMethods.findOne).toHaveBeenCalledWith({
        documentId: createTestInventory().documentId,
        populate: {
          product: {
            populate: {
              category: {
                fields: ['documentId', 'name'],
              },
              images: true,
            },
          },
          updatedBy: {
            fields: ['id', 'username', 'email'],
          },
        },
      });
      expect(ctx.body).toEqual({
        data: createTestInventory(),
        meta: {},
      });
    });

    it('should return 404 when inventory not found', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'non-existent-id' },
      });

      mockDocumentMethods.findOne.mockResolvedValue(null);

      // Act
      await inventoryController.findOne(ctx);

      // Assert
      expect(ctx.notFound).toHaveBeenCalledWith('Inventory record not found');
    });
  });
});
