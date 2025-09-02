/**
 * Receipt Generation Service
 * Handles receipt generation, email templates, and confirmation processing
 */

interface ReceiptData {
  orderNumber: string;
  orderDate: Date;
  customerName: string;
  customerEmail: string;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  shippingAddress: any;
  billingAddress: any;
  paymentMethod: string;
}

interface ConfirmationRequest {
  orderId: string;
  confirmationType: 'automatic' | 'manual' | 'payment_triggered';
  emailTemplate?: string;
  customMessage?: string;
  promotionalContent?: string;
  socialSharingEnabled?: boolean;
  estimatedProcessingTime?: string;
  nextSteps?: string;
}

export default {
  /**
   * Generate order confirmation
   */
  async generateOrderConfirmation(request: ConfirmationRequest) {
    try {
      const { orderId, confirmationType, emailTemplate, customMessage, promotionalContent, socialSharingEnabled, estimatedProcessingTime, nextSteps } = request;

      // Get order details
      const order = await strapi.documents('api::order.order').findOne({
        documentId: orderId,
        populate: [
          'user',
          'items',
          'items.productListing',
          'items.productListingVariant',
          'shippingAddress',
          'billingAddress'
        ]
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Generate confirmation number
      const confirmationNumber = await this.generateConfirmationNumber();

      // Create confirmation record
      const confirmationData = {
        order: orderId,
        confirmationNumber,
        confirmationType,
        emailTemplate: emailTemplate || 'default',
        emailAddress: order.user?.email || '',
        phoneNumber: order.shippingAddress?.phone,
        customMessage,
        promotionalContent,
        socialSharingEnabled: socialSharingEnabled || false,
        estimatedProcessingTime,
        nextSteps
      };

      const confirmation = await strapi.documents('api::order-confirmation.order-confirmation').create({
        data: confirmationData
      });

      // Generate receipt
      const receiptUrl = await this.generateReceipt(order, confirmationNumber);

      // Update confirmation with receipt URL
      await strapi.documents('api::order-confirmation.order-confirmation').update({
        documentId: confirmation.documentId,
        data: {
          receiptGenerated: true,
          receiptUrl,
          receiptGeneratedAt: new Date()
        }
      });

      // Send confirmation email
      await this.sendConfirmationEmail(order, confirmation, receiptUrl);

      return {
        confirmation,
        receiptUrl
      };
    } catch (error) {
      strapi.log.error('Error generating order confirmation:', error);
      throw error;
    }
  },

  /**
   * Generate confirmation number
   */
  async generateConfirmationNumber(): Promise<string> {
    const prefix = 'CONF';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const confirmationNumber = `${prefix}${timestamp}${random}`;

    // Check if confirmation number already exists
    const existingConfirmation = await strapi.documents('api::order-confirmation.order-confirmation').findFirst({
      filters: { confirmationNumber }
    });

    if (existingConfirmation) {
      // Retry with different random suffix
      return this.generateConfirmationNumber();
    }

    return confirmationNumber;
  },

  /**
   * Generate receipt
   */
  async generateReceipt(order: any, confirmationNumber: string): Promise<string> {
    try {
      const receiptData: ReceiptData = {
        orderNumber: order.orderNumber,
        orderDate: order.createdAt,
        customerName: `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim(),
        customerEmail: order.user?.email || order.billingAddress?.email,
        items: order.items?.map(item => ({
          name: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.linePrice
        })) || [],
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        discount: order.discount,
        total: order.total,
        currency: order.currency,
        shippingAddress: order.shippingAddress,
        billingAddress: order.billingAddress,
        paymentMethod: order.paymentMethod
      };

      // Generate PDF receipt
      const pdfBuffer = await this.generatePDFReceipt(receiptData);
      
      // Save PDF to storage (simulate file upload)
      const fileName = `receipt-${order.orderNumber}-${confirmationNumber}.pdf`;
      const receiptUrl = `/receipts/${fileName}`;

      // TODO: Integrate with actual file storage service
      // For now, just return the URL
      strapi.log.info(`Receipt generated: ${receiptUrl}`);

      return receiptUrl;
    } catch (error) {
      strapi.log.error('Error generating receipt:', error);
      throw error;
    }
  },

  /**
   * Generate PDF receipt
   */
  async generatePDFReceipt(receiptData: ReceiptData): Promise<Buffer> {
    try {
      // TODO: Integrate with actual PDF generation library (e.g., Puppeteer, jsPDF)
      // For now, return a mock PDF buffer
      const mockPdfContent = `
        Receipt
        Order Number: ${receiptData.orderNumber}
        Date: ${receiptData.orderDate}
        Customer: ${receiptData.customerName}
        
        Items:
        ${receiptData.items.map(item => 
          `${item.name} (${item.sku}) x${item.quantity} - $${(item.total / 100).toFixed(2)}`
        ).join('\n')}
        
        Subtotal: $${(receiptData.subtotal / 100).toFixed(2)}
        Tax: $${(receiptData.tax / 100).toFixed(2)}
        Shipping: $${(receiptData.shipping / 100).toFixed(2)}
        Discount: $${(receiptData.discount / 100).toFixed(2)}
        Total: $${(receiptData.total / 100).toFixed(2)}
      `;

      // Convert to Buffer (simulate PDF generation)
      return Buffer.from(mockPdfContent, 'utf-8');
    } catch (error) {
      strapi.log.error('Error generating PDF receipt:', error);
      throw error;
    }
  },

  /**
   * Send confirmation email
   */
  async sendConfirmationEmail(order: any, confirmation: any, receiptUrl: string) {
    try {
      const emailData = {
        to: confirmation.emailAddress,
        subject: `Order Confirmation - ${order.orderNumber}`,
        template: confirmation.emailTemplate || 'order-confirmation',
        data: {
          orderNumber: order.orderNumber,
          confirmationNumber: confirmation.confirmationNumber,
          customerName: `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim(),
          orderDate: order.createdAt,
          total: (order.total / 100).toFixed(2),
          currency: order.currency,
          items: order.items?.map(item => ({
            name: item.productName,
            quantity: item.quantity,
            price: (item.unitPrice / 100).toFixed(2),
            total: (item.linePrice / 100).toFixed(2)
          })),
          receiptUrl,
          customMessage: confirmation.customMessage,
          promotionalContent: confirmation.promotionalContent,
          estimatedProcessingTime: confirmation.estimatedProcessingTime,
          nextSteps: confirmation.nextSteps,
          socialSharingEnabled: confirmation.socialSharingEnabled
        }
      };

      // TODO: Integrate with actual email service
      strapi.log.info('Confirmation email data:', emailData);

      // Update confirmation record
      await strapi.documents('api::order-confirmation.order-confirmation').update({
        documentId: confirmation.documentId,
        data: {
          emailSent: true,
          emailSentAt: new Date()
        }
      });

      strapi.log.info(`Confirmation email sent for order ${order.orderNumber}`);
    } catch (error) {
      strapi.log.error('Error sending confirmation email:', error);
    }
  },

  /**
   * Send SMS notification
   */
  async sendSMSNotification(phoneNumber: string, message: string) {
    try {
      // TODO: Integrate with actual SMS service
      strapi.log.info(`SMS notification sent to ${phoneNumber}: ${message}`);
    } catch (error) {
      strapi.log.error('Error sending SMS notification:', error);
    }
  },

  /**
   * Get confirmation by order ID
   */
  async getConfirmationByOrderId(orderId: string) {
    try {
      const confirmation = await strapi.documents('api::order-confirmation.order-confirmation').findFirst({
        filters: { order: orderId as any },
        populate: ['order']
      });

      return confirmation;
    } catch (error) {
      strapi.log.error('Error getting confirmation by order ID:', error);
      throw error;
    }
  },

  /**
   * Get confirmation by confirmation number
   */
  async getConfirmationByNumber(confirmationNumber: string) {
    try {
      const confirmation = await strapi.documents('api::order-confirmation.order-confirmation').findFirst({
        filters: { confirmationNumber },
        populate: ['order', 'order.items', 'order.user']
      });

      return confirmation;
    } catch (error) {
      strapi.log.error('Error getting confirmation by number:', error);
      throw error;
    }
  },

  /**
   * Resend confirmation email
   */
  async resendConfirmationEmail(confirmationId: string) {
    try {
      const confirmation = await strapi.documents('api::order-confirmation.order-confirmation').findOne({
        documentId: confirmationId,
        populate: ['order', 'order.user', 'order.shippingAddress']
      });

      if (!confirmation) {
        throw new Error('Confirmation not found');
      }

      await this.sendConfirmationEmail(confirmation.order, confirmation, confirmation.receiptUrl);

      return { success: true, message: 'Confirmation email resent successfully' };
    } catch (error) {
      strapi.log.error('Error resending confirmation email:', error);
      throw error;
    }
  },

  /**
   * Generate receipt in different formats
   */
  async generateReceiptInFormat(orderId: string, format: 'pdf' | 'html' | 'json') {
    try {
      const order = await strapi.documents('api::order.order').findOne({
        documentId: orderId,
        populate: [
          'user',
          'items',
          'items.productListing',
          'items.productListingVariant',
          'shippingAddress',
          'billingAddress'
        ]
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const confirmationNumber = await this.generateConfirmationNumber();
      const receiptData: ReceiptData = {
        orderNumber: order.orderNumber,
        orderDate: new Date(order.createdAt),
        customerName: `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim(),
        customerEmail: order.user?.email || '',
        items: order.items?.map(item => ({
          name: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.linePrice
        })) || [],
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        discount: order.discount,
        total: order.total,
        currency: order.currency,
        shippingAddress: order.shippingAddress,
        billingAddress: order.billingAddress,
        paymentMethod: order.paymentMethod
      };

      let receiptContent: string | Buffer;

      switch (format) {
        case 'pdf':
          receiptContent = await this.generatePDFReceipt(receiptData);
          break;
        case 'html':
          receiptContent = this.generateHTMLReceipt(receiptData);
          break;
        case 'json':
          receiptContent = JSON.stringify(receiptData, null, 2);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      return {
        format,
        content: receiptContent,
        fileName: `receipt-${order.orderNumber}-${confirmationNumber}.${format}`
      };
    } catch (error) {
      strapi.log.error('Error generating receipt in format:', error);
      throw error;
    }
  },

  /**
   * Generate HTML receipt
   */
  generateHTMLReceipt(receiptData: ReceiptData): string {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${receiptData.orderNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .receipt-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .receipt-table th, .receipt-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .receipt-table th { background-color: #f2f2f2; }
          .total { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Receipt</h1>
          <p>Order Number: ${receiptData.orderNumber}</p>
          <p>Date: ${receiptData.orderDate}</p>
          <p>Customer: ${receiptData.customerName}</p>
        </div>
        
        <table class="receipt-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>SKU</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${receiptData.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.sku}</td>
                <td>${item.quantity}</td>
                <td>$${(item.unitPrice / 100).toFixed(2)}</td>
                <td>$${(item.total / 100).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total">
          <p>Subtotal: $${(receiptData.subtotal / 100).toFixed(2)}</p>
          <p>Tax: $${(receiptData.tax / 100).toFixed(2)}</p>
          <p>Shipping: $${(receiptData.shipping / 100).toFixed(2)}</p>
          <p>Discount: $${(receiptData.discount / 100).toFixed(2)}</p>
          <p><strong>Total: $${(receiptData.total / 100).toFixed(2)}</strong></p>
        </div>
      </body>
      </html>
    `;

    return html;
  }
};
