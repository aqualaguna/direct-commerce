/**
 * Order Creation Service
 * Handles order creation from cart, validation, and inventory checks
 */


export default {

  /**
   * Generate unique order number
   */
  async generateOrderNumber(): Promise<string> {
    const prefix = 'ORD';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderNumber = `${prefix}${timestamp}${random}`;

    // Check if order number already exists
    const existingOrder = await strapi.documents('api::order.order').findFirst({
      filters: { orderNumber }
    });

    if (existingOrder) {
      // Retry with different random suffix
      return this.generateOrderNumber();
    }

    return orderNumber;
  },

};
