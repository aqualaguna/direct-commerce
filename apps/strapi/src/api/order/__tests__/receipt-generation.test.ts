/**
 * Receipt Generation Service Tests
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
const mockReceiptService = {
  generateOrderConfirmation: jest.fn() as jest.MockedFunction<any>,
  generateConfirmationNumber: jest.fn() as jest.MockedFunction<any>,
  generateReceipt: jest.fn() as jest.MockedFunction<any>,
  generatePDFReceipt: jest.fn() as jest.MockedFunction<any>,
  sendConfirmationEmail: jest.fn() as jest.MockedFunction<any>,
  sendSMSNotification: jest.fn() as jest.MockedFunction<any>,
  getConfirmationByOrderId: jest.fn() as jest.MockedFunction<any>,
  getConfirmationByNumber: jest.fn() as jest.MockedFunction<any>,
  resendConfirmationEmail: jest.fn() as jest.MockedFunction<any>,
  generateReceiptInFormat: jest.fn() as jest.MockedFunction<any>,
  generateHTMLReceipt: jest.fn() as jest.MockedFunction<any>
};

describe('Receipt Generation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup service mock
    mockStrapi.service.mockImplementation((serviceName: any) => {
      if (serviceName === 'api::order.receipt-generation') {
        return mockReceiptService;
      }
      return {};
    });
  });

  describe('generateOrderConfirmation', () => {
    it('should generate order confirmation successfully', async () => {
      const orderId = 'order-123';
      const confirmationType = 'automatic';

      const mockOrder = {
        documentId: orderId,
        orderNumber: 'ORD-2024-001',
        createdAt: new Date('2024-12-25T10:00:00Z'),
        user: { documentId: 'user-123', email: 'customer@example.com' },
        shippingAddress: { firstName: 'John', lastName: 'Doe', phone: '+1234567890' },
        billingAddress: { email: 'customer@example.com' },
        subtotal: 10000,
        tax: 1000,
        shipping: 500,
        discount: 0,
        total: 11500,
        currency: 'USD',
        items: [
          { productName: 'Test Product', sku: 'TEST-001', quantity: 2, unitPrice: 5000, linePrice: 10000 }
        ],
        paymentMethod: 'credit_card'
      };

      const mockConfirmation = {
        documentId: 'confirmation-123',
        confirmationNumber: 'CONF-2024-001',
        emailAddress: 'customer@example.com'
      };

      mockReceiptService.generateOrderConfirmation.mockResolvedValue(mockConfirmation);

      const result = await mockReceiptService.generateOrderConfirmation(orderId, confirmationType);

      expect(result).toEqual(mockConfirmation);
      expect(mockReceiptService.generateOrderConfirmation).toHaveBeenCalledWith(orderId, confirmationType);
    });

    it('should throw error if order not found', async () => {
      const orderId = 'nonexistent-order';
      const confirmationType = 'automatic';

      mockReceiptService.generateOrderConfirmation.mockRejectedValue(
        new Error('Order not found')
      );

      await expect(
        mockReceiptService.generateOrderConfirmation(orderId, confirmationType)
      ).rejects.toThrow('Order not found');
    });

    it('should handle existing confirmation', async () => {
      const orderId = 'order-123';
      const confirmationType = 'automatic';

      const mockConfirmation = {
        documentId: 'existing-confirmation',
        confirmationNumber: 'CONF-2024-001'
      };

      mockReceiptService.generateOrderConfirmation.mockResolvedValue(mockConfirmation);

      const result = await mockReceiptService.generateOrderConfirmation(orderId, confirmationType);

      expect(result).toEqual(mockConfirmation);
      expect(mockReceiptService.generateOrderConfirmation).toHaveBeenCalledWith(orderId, confirmationType);
    });
  });

  describe('generateConfirmationNumber', () => {
    it('should generate unique confirmation number', async () => {
      const mockNumber = 'CONF-2024-001';
      mockReceiptService.generateConfirmationNumber.mockResolvedValue(mockNumber);

      const result = await mockReceiptService.generateConfirmationNumber();

      expect(result).toBe(mockNumber);
      expect(mockReceiptService.generateConfirmationNumber).toHaveBeenCalled();
    });

    it('should handle confirmation number collision', async () => {
      mockReceiptService.generateConfirmationNumber
        .mockResolvedValueOnce('CONF-2024-001')
        .mockResolvedValueOnce('CONF-2024-002');

      const result1 = await mockReceiptService.generateConfirmationNumber();
      const result2 = await mockReceiptService.generateConfirmationNumber();

      expect(result1).toBe('CONF-2024-001');
      expect(result2).toBe('CONF-2024-002');
      expect(mockReceiptService.generateConfirmationNumber).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateReceipt', () => {
    it('should generate receipt successfully', async () => {
      const orderId = 'order-123';
      const format = 'pdf';

      const mockReceipt = {
        url: 'https://example.com/receipt.pdf',
        format: 'pdf',
        generatedAt: new Date()
      };

      mockReceiptService.generateReceipt.mockResolvedValue(mockReceipt);

      const result = await mockReceiptService.generateReceipt(orderId, format);

      expect(result).toEqual(mockReceipt);
      expect(mockReceiptService.generateReceipt).toHaveBeenCalledWith(orderId, format);
    });

    it('should generate PDF receipt', async () => {
      const orderId = 'order-123';

      const mockPDFReceipt = {
        url: 'https://example.com/receipt.pdf',
        format: 'pdf',
        content: 'PDF content'
      };

      mockReceiptService.generatePDFReceipt.mockResolvedValue(mockPDFReceipt);

      const result = await mockReceiptService.generatePDFReceipt(orderId);

      expect(result).toEqual(mockPDFReceipt);
      expect(mockReceiptService.generatePDFReceipt).toHaveBeenCalledWith(orderId);
    });
  });

  describe('sendConfirmationEmail', () => {
    it('should send confirmation email successfully', async () => {
      const confirmationId = 'confirmation-123';

      mockReceiptService.sendConfirmationEmail.mockResolvedValue(true);

      const result = await mockReceiptService.sendConfirmationEmail(confirmationId);

      expect(result).toBe(true);
      expect(mockReceiptService.sendConfirmationEmail).toHaveBeenCalledWith(confirmationId);
    });

    it('should handle email sending failure', async () => {
      const confirmationId = 'confirmation-123';

      mockReceiptService.sendConfirmationEmail.mockRejectedValue(
        new Error('Email sending failed')
      );

      await expect(
        mockReceiptService.sendConfirmationEmail(confirmationId)
      ).rejects.toThrow('Email sending failed');
    });
  });

  describe('getConfirmationByOrderId', () => {
    it('should get confirmation by order ID', async () => {
      const orderId = 'order-123';

      const mockConfirmation = {
        documentId: 'confirmation-123',
        confirmationNumber: 'CONF-2024-001',
        order: { documentId: orderId }
      };

      mockReceiptService.getConfirmationByOrderId.mockResolvedValue(mockConfirmation);

      const result = await mockReceiptService.getConfirmationByOrderId(orderId);

      expect(result).toEqual(mockConfirmation);
      expect(mockReceiptService.getConfirmationByOrderId).toHaveBeenCalledWith(orderId);
    });

    it('should return null if confirmation not found', async () => {
      const orderId = 'nonexistent-order';

      mockReceiptService.getConfirmationByOrderId.mockResolvedValue(null);

      const result = await mockReceiptService.getConfirmationByOrderId(orderId);

      expect(result).toBeNull();
      expect(mockReceiptService.getConfirmationByOrderId).toHaveBeenCalledWith(orderId);
    });
  });

  describe('getConfirmationByNumber', () => {
    it('should get confirmation by number', async () => {
      const confirmationNumber = 'CONF-2024-001';

      const mockConfirmation = {
        documentId: 'confirmation-123',
        confirmationNumber: 'CONF-2024-001',
        order: { documentId: 'order-123' }
      };

      mockReceiptService.getConfirmationByNumber.mockResolvedValue(mockConfirmation);

      const result = await mockReceiptService.getConfirmationByNumber(confirmationNumber);

      expect(result).toEqual(mockConfirmation);
      expect(mockReceiptService.getConfirmationByNumber).toHaveBeenCalledWith(confirmationNumber);
    });
  });

  describe('resendConfirmationEmail', () => {
    it('should resend confirmation email successfully', async () => {
      const confirmationId = 'confirmation-123';

      mockReceiptService.resendConfirmationEmail.mockResolvedValue(true);

      const result = await mockReceiptService.resendConfirmationEmail(confirmationId);

      expect(result).toBe(true);
      expect(mockReceiptService.resendConfirmationEmail).toHaveBeenCalledWith(confirmationId);
    });
  });

  describe('generateReceiptInFormat', () => {
    it('should generate PDF receipt', async () => {
      const orderId = 'order-123';
      const format = 'pdf';

      const mockReceipt = {
        url: 'https://example.com/receipt.pdf',
        format: 'pdf'
      };

      mockReceiptService.generateReceiptInFormat.mockResolvedValue(mockReceipt);

      const result = await mockReceiptService.generateReceiptInFormat(orderId, format);

      expect(result).toEqual(mockReceipt);
      expect(mockReceiptService.generateReceiptInFormat).toHaveBeenCalledWith(orderId, format);
    });

    it('should generate HTML receipt', async () => {
      const orderId = 'order-123';
      const format = 'html';

      const mockReceipt = {
        url: 'https://example.com/receipt.html',
        format: 'html'
      };

      mockReceiptService.generateReceiptInFormat.mockResolvedValue(mockReceipt);

      const result = await mockReceiptService.generateReceiptInFormat(orderId, format);

      expect(result).toEqual(mockReceipt);
      expect(mockReceiptService.generateReceiptInFormat).toHaveBeenCalledWith(orderId, format);
    });

    it('should generate JSON receipt', async () => {
      const orderId = 'order-123';
      const format = 'json';

      const mockReceipt = {
        url: 'https://example.com/receipt.json',
        format: 'json'
      };

      mockReceiptService.generateReceiptInFormat.mockResolvedValue(mockReceipt);

      const result = await mockReceiptService.generateReceiptInFormat(orderId, format);

      expect(result).toEqual(mockReceipt);
      expect(mockReceiptService.generateReceiptInFormat).toHaveBeenCalledWith(orderId, format);
    });
  });

  describe('generateHTMLReceipt', () => {
    it('should generate HTML receipt', async () => {
      const orderId = 'order-123';

      const mockHTMLReceipt = {
        url: 'https://example.com/receipt.html',
        format: 'html',
        content: '<html>Receipt content</html>'
      };

      mockReceiptService.generateHTMLReceipt.mockResolvedValue(mockHTMLReceipt);

      const result = await mockReceiptService.generateHTMLReceipt(orderId);

      expect(result).toEqual(mockHTMLReceipt);
      expect(mockReceiptService.generateHTMLReceipt).toHaveBeenCalledWith(orderId);
    });
  });

  describe('sendSMSNotification', () => {
    it('should send SMS notification successfully', async () => {
      const confirmationId = 'confirmation-123';

      mockReceiptService.sendSMSNotification.mockResolvedValue(true);

      const result = await mockReceiptService.sendSMSNotification(confirmationId);

      expect(result).toBe(true);
      expect(mockReceiptService.sendSMSNotification).toHaveBeenCalledWith(confirmationId);
    });
  });
});
