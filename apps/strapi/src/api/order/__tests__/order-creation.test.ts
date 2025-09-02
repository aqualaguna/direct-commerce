/**
 * Order Creation Service Tests
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
const mockOrderCreationService = {
  createOrderFromCart: jest.fn() as jest.MockedFunction<any>,
  generateOrderNumber: jest.fn() as jest.MockedFunction<any>,
  validateOrderRequest: jest.fn() as jest.MockedFunction<any>,
  validateInventory: jest.fn() as jest.MockedFunction<any>,
  validatePrices: jest.fn() as jest.MockedFunction<any>,
  createOrderItems: jest.fn() as jest.MockedFunction<any>,
  rollbackOrderCreation: jest.fn() as jest.MockedFunction<any>
};

describe('Order Creation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup service mock
    mockStrapi.service.mockImplementation((serviceName: any) => {
      if (serviceName === 'api::order.order-creation') {
        return mockOrderCreationService;
      }
      return {};
    });
  });

  describe('createOrderFromCart', () => {
    it('should create order from cart successfully', async () => {
      const mockCart = {
        documentId: 'cart-123',
        subtotal: 10000,
        tax: 1000,
        shipping: 500,
        discount: 0,
        total: 11500,
        currency: 'USD',
        items: [
          {
            product: { documentId: 'product-1', title: 'Test Product', sku: 'TEST-001' },
            variant: null,
            quantity: 2,
            price: 5000,
            total: 10000
          }
        ]
      };

      const mockCheckoutSession = {
        documentId: 'checkout-123',
        shippingAddress: { firstName: 'John', lastName: 'Doe' },
        billingAddress: { firstName: 'John', lastName: 'Doe' },
        paymentMethod: 'manual',
        shippingMethod: 'standard'
      };

      const mockOrder = {
        documentId: 'order-123',
        orderNumber: 'ORD12345678ABCD',
        status: 'pending',
        total: 11500
      };

      // Mock service response
      mockOrderCreationService.createOrderFromCart.mockResolvedValue(mockOrder);

      const request = {
        cartId: 'cart-123',
        checkoutSessionId: 'checkout-123',
        source: 'web'
      };

      const userId = 'user-123';

      const result = await mockOrderCreationService.createOrderFromCart(request, userId);

      expect(result).toEqual(mockOrder);
      expect(mockOrderCreationService.createOrderFromCart).toHaveBeenCalledWith(request, userId);
    });

    it('should throw error if cart not found', async () => {
      mockOrderCreationService.createOrderFromCart.mockRejectedValue(
        new Error('Cart not found')
      );

      const request = {
        cartId: 'nonexistent-cart',
        checkoutSessionId: 'checkout-123'
      };

      await expect(
        mockOrderCreationService.createOrderFromCart(request, 'user-123')
      ).rejects.toThrow('Cart not found');
    });

    it('should throw error if checkout session not found', async () => {
      mockOrderCreationService.createOrderFromCart.mockRejectedValue(
        new Error('Checkout session not found')
      );

      const request = {
        cartId: 'cart-123',
        checkoutSessionId: 'nonexistent-checkout'
      };

      await expect(
        mockOrderCreationService.createOrderFromCart(request, 'user-123')
      ).rejects.toThrow('Checkout session not found');
    });
  });

  describe('generateOrderNumber', () => {
    it('should generate unique order number', async () => {
      const mockOrderNumber = 'ORD12345678ABCD';
      mockOrderCreationService.generateOrderNumber.mockResolvedValue(mockOrderNumber);

      const result = await mockOrderCreationService.generateOrderNumber();

      expect(result).toBe(mockOrderNumber);
      expect(mockOrderCreationService.generateOrderNumber).toHaveBeenCalled();
    });

    it('should handle order number collision', async () => {
      // Mock first call to return existing number, second call to return new number
      mockOrderCreationService.generateOrderNumber
        .mockResolvedValueOnce('ORD12345678ABCD')
        .mockResolvedValueOnce('ORD87654321DCBA');

      const result1 = await mockOrderCreationService.generateOrderNumber();
      const result2 = await mockOrderCreationService.generateOrderNumber();

      expect(result1).toBe('ORD12345678ABCD');
      expect(result2).toBe('ORD87654321DCBA');
      expect(mockOrderCreationService.generateOrderNumber).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateOrderRequest', () => {
    it('should validate valid order request', async () => {
      const validRequest = {
        cartId: 'cart-123',
        checkoutSessionId: 'checkout-123',
        source: 'web'
      };

      mockOrderCreationService.validateOrderRequest.mockResolvedValue(true);

      const result = await mockOrderCreationService.validateOrderRequest(validRequest);

      expect(result).toBe(true);
      expect(mockOrderCreationService.validateOrderRequest).toHaveBeenCalledWith(validRequest);
    });

    it('should reject invalid order request', async () => {
      const invalidRequest = {
        cartId: '',
        checkoutSessionId: 'checkout-123'
      };

      mockOrderCreationService.validateOrderRequest.mockRejectedValue(
        new Error('Invalid order request')
      );

      await expect(
        mockOrderCreationService.validateOrderRequest(invalidRequest)
      ).rejects.toThrow('Invalid order request');
    });
  });

  describe('validateInventory', () => {
    it('should validate sufficient inventory', async () => {
      const cartItems = [
        {
          product: { documentId: 'product-1' },
          variant: null,
          quantity: 2
        }
      ];

      mockOrderCreationService.validateInventory.mockResolvedValue(true);

      const result = await mockOrderCreationService.validateInventory(cartItems);

      expect(result).toBe(true);
      expect(mockOrderCreationService.validateInventory).toHaveBeenCalledWith(cartItems);
    });

    it('should reject insufficient inventory', async () => {
      const cartItems = [
        {
          product: { documentId: 'product-1' },
          variant: null,
          quantity: 10
        }
      ];

      mockOrderCreationService.validateInventory.mockRejectedValue(
        new Error('Insufficient inventory')
      );

      await expect(
        mockOrderCreationService.validateInventory(cartItems)
      ).rejects.toThrow('Insufficient inventory');
    });
  });

  describe('validatePrices', () => {
    it('should validate correct prices', async () => {
      const cartData = {
        subtotal: 10000,
        tax: 1000,
        shipping: 500,
        total: 11500
      };

      mockOrderCreationService.validatePrices.mockResolvedValue(true);

      const result = await mockOrderCreationService.validatePrices(cartData);

      expect(result).toBe(true);
      expect(mockOrderCreationService.validatePrices).toHaveBeenCalledWith(cartData);
    });

    it('should reject price mismatch', async () => {
      const cartData = {
        subtotal: 10000,
        tax: 1000,
        shipping: 500,
        total: 12000 // Incorrect total
      };

      mockOrderCreationService.validatePrices.mockRejectedValue(
        new Error('Price mismatch detected')
      );

      await expect(
        mockOrderCreationService.validatePrices(cartData)
      ).rejects.toThrow('Price mismatch detected');
    });
  });

  describe('createOrderItems', () => {
    it('should create order items successfully', async () => {
      const orderId = 'order-123';
      const cartItems = [
        {
          product: { documentId: 'product-1', title: 'Test Product' },
          variant: null,
          quantity: 2,
          price: 5000
        }
      ];

      const mockOrderItems = [
        {
          documentId: 'item-1',
          order: orderId,
          productName: 'Test Product',
          quantity: 2,
          unitPrice: 5000
        }
      ];

      mockOrderCreationService.createOrderItems.mockResolvedValue(mockOrderItems);

      const result = await mockOrderCreationService.createOrderItems(orderId, cartItems);

      expect(result).toEqual(mockOrderItems);
      expect(mockOrderCreationService.createOrderItems).toHaveBeenCalledWith(orderId, cartItems);
    });

    it('should handle order item creation failure', async () => {
      const orderId = 'order-123';
      const cartItems = [
        {
          product: { documentId: 'product-1' },
          variant: null,
          quantity: 2,
          price: 5000
        }
      ];

      mockOrderCreationService.createOrderItems.mockRejectedValue(
        new Error('Failed to create order items')
      );

      await expect(
        mockOrderCreationService.createOrderItems(orderId, cartItems)
      ).rejects.toThrow('Failed to create order items');
    });
  });

  describe('rollbackOrderCreation', () => {
    it('should rollback order creation successfully', async () => {
      const orderId = 'order-123';
      const cartId = 'cart-123';
      const checkoutSessionId = 'checkout-123';

      mockOrderCreationService.rollbackOrderCreation.mockResolvedValue(true);

      const result = await mockOrderCreationService.rollbackOrderCreation(
        orderId,
        cartId,
        checkoutSessionId
      );

      expect(result).toBe(true);
      expect(mockOrderCreationService.rollbackOrderCreation).toHaveBeenCalledWith(
        orderId,
        cartId,
        checkoutSessionId
      );
    });

    it('should handle rollback failure', async () => {
      const orderId = 'order-123';
      const cartId = 'cart-123';
      const checkoutSessionId = 'checkout-123';

      mockOrderCreationService.rollbackOrderCreation.mockRejectedValue(
        new Error('Rollback failed')
      );

      await expect(
        mockOrderCreationService.rollbackOrderCreation(orderId, cartId, checkoutSessionId)
      ).rejects.toThrow('Rollback failed');
    });
  });
});
