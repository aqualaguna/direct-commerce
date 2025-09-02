/**
 * Order Creation Service
 * Handles order creation from cart, validation, and inventory checks
 */

interface OrderCreationRequest {
  cartId: string;
  checkoutSessionId: string;
  paymentIntentId?: string;
  customerNotes?: string;
  giftOptions?: {
    isGift: boolean;
    giftMessage?: string;
    giftWrapping?: boolean;
  };
  promoCode?: string;
  source: 'web' | 'mobile' | 'admin' | 'api';
  metadata?: object;
}

interface OrderValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  inventoryCheck: boolean;
  priceValidation: boolean;
  paymentValidation: boolean;
  shippingValidation: boolean;
}

export default {
  /**
   * Create order from cart
   */
  async createOrderFromCart(request: OrderCreationRequest, userId?: string) {
    try {
      // Validate request
      const validation = await this.validateOrderRequest(request);
      if (!validation.isValid) {
        throw new Error(`Order validation failed: ${validation.errors.join(', ')}`);
      }

      // Get cart and checkout session
      const cart = await strapi.documents('api::cart.cart').findOne({
        documentId: request.cartId,
        populate: ['items', 'items.product', 'items.variant']
      });

      if (!cart) {
        throw new Error('Cart not found');
      }

      const checkoutSession = await strapi.documents('api::checkout.checkout-session').findOne({
        documentId: request.checkoutSessionId,
        populate: ['shippingAddress', 'billingAddress']
      });

      if (!checkoutSession) {
        throw new Error('Checkout session not found');
      }

      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      // Create order
      const orderData = {
        orderNumber,
        user: userId,
        cart: request.cartId,
        checkoutSession: request.checkoutSessionId,
        status: 'pending' as const,
        subtotal: cart.subtotal,
        tax: cart.tax,
        shipping: cart.shipping,
        discount: cart.discountAmount || 0,
        total: cart.total,
        currency: cart.currency,
        shippingAddress: checkoutSession.shippingAddress,
        billingAddress: checkoutSession.billingAddress,
        paymentStatus: 'pending',
        paymentMethod: checkoutSession.paymentMethod || 'manual',
        shippingMethod: checkoutSession.shippingMethod,
        orderSource: request.source,
        customerNotes: request.customerNotes,
        isGift: request.giftOptions?.isGift || false,
        giftMessage: request.giftOptions?.giftMessage,
        referralCode: request.promoCode,
        metadata: request.metadata
      };

      const order = await strapi.documents('api::order.order').create({
        data: orderData as any,
        populate: ['user', 'cart', 'checkoutSession']
      });

      // Create order items from cart items
      await this.createOrderItems(order.documentId, cart.items);

      // Update cart status
      await strapi.documents('api::cart.cart').update({
        documentId: request.cartId,
        data: { status: 'converted' }
      });

      // Update checkout session status
      await strapi.documents('api::checkout.checkout-session').update({
        documentId: request.checkoutSessionId,
        data: { status: 'completed' }
      });

      return order;
    } catch (error) {
      strapi.log.error('Error creating order from cart:', error);
      throw error;
    }
  },

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

  /**
   * Validate order creation request
   */
  async validateOrderRequest(request: OrderCreationRequest): Promise<OrderValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!request.cartId) {
      errors.push('Cart ID is required');
    }

    if (!request.checkoutSessionId) {
      errors.push('Checkout session ID is required');
    }

    if (!request.source) {
      errors.push('Order source is required');
    }

    // Cart validation
    if (request.cartId) {
      const cart = await strapi.documents('api::cart.cart').findOne({
        documentId: request.cartId,
        populate: ['items']
      });

      if (!cart) {
        errors.push('Cart not found');
      } else {
        if (!cart.items || cart.items.length === 0) {
          errors.push('Cart is empty');
        }

        if (cart.total <= 0) {
          errors.push('Cart total must be greater than 0');
        }
      }
    }

    // Checkout session validation
    if (request.checkoutSessionId) {
      const checkoutSession = await strapi.documents('api::checkout.checkout-session').findOne({
        documentId: request.checkoutSessionId
      });

      if (!checkoutSession) {
        errors.push('Checkout session not found');
      } else {
        if (checkoutSession.status !== 'active') {
          errors.push('Checkout session is not active');
        }
      }
    }

    // Inventory validation
    const inventoryCheck = await this.validateInventory(request.cartId);
    if (!inventoryCheck) {
      errors.push('Some items are out of stock');
    }

    // Price validation
    const priceValidation = await this.validatePrices(request.cartId);
    if (!priceValidation) {
      warnings.push('Prices may have changed since cart creation');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      inventoryCheck,
      priceValidation,
      paymentValidation: true, // Will be validated during payment processing
      shippingValidation: true // Will be validated during shipping calculation
    };
  },

  /**
   * Validate inventory availability
   */
  async validateInventory(cartId: string): Promise<boolean> {
    try {
      const cart = await strapi.documents('api::cart.cart').findOne({
        documentId: cartId,
        populate: ['items', 'items.product', 'items.variant']
      });

      if (!cart || !cart.items) {
        return false;
      }

      for (const item of cart.items) {
        if (item.variant) {
          // Check variant inventory
          const variant = await strapi.documents('api::product-listing-variant.product-listing-variant').findOne({
            documentId: item.variant.documentId
          });

          if (!variant || variant.inventory < item.quantity) {
            return false;
          }
        } else {
          // TODO: Check product inventory
          // const product = await strapi.documents('api::product-listing.product-listing').findOne({
          //   documentId: item.product.documentId,
          //   populate: ['variants', 'variants.inventory']
          // });

          // if (!product || product.inventory < item.quantity) {
          //   return false;
          // }
        }
      }

      return true;
    } catch (error) {
      strapi.log.error('Error validating inventory:', error);
      return false;
    }
  },

  /**
   * Validate prices haven't changed
   */
  async validatePrices(cartId: string): Promise<boolean> {
    try {
      const cart = await strapi.documents('api::cart.cart').findOne({
        documentId: cartId,
        populate: ['items', 'items.product', 'items.variant']
      });

      if (!cart || !cart.items) {
        return false;
      }

      for (const item of cart.items) {
        let currentPrice = 0;

        if (item.variant) {
          const variant = await strapi.documents('api::product-listing-variant.product-listing-variant').findOne({
            documentId: item.variant.documentId
          });
          currentPrice = variant?.price || 0;
        } else {
          const product = await strapi.documents('api::product-listing.product-listing').findOne({
            documentId: item.product.documentId
          });
          currentPrice = product?.basePrice || 0;
        }

        // Allow 5% price difference
        const priceDifference = Math.abs(currentPrice - item.price) / item.price;
        if (priceDifference > 0.05) {
          return false;
        }
      }

      return true;
    } catch (error) {
      strapi.log.error('Error validating prices:', error);
      return false;
    }
  },

  /**
   * Create order items from cart items
   */
  async createOrderItems(orderId: string, cartItems: any[]) {
    try {
      for (const cartItem of cartItems) {
        const orderItemData = {
          order: orderId,
          productListing: cartItem.product.documentId,
          productListingVariant: cartItem.variant?.documentId,
          sku: cartItem.variant?.sku || cartItem.product.sku,
          productName: cartItem.product.title,
          productDescription: cartItem.product.description,
          quantity: cartItem.quantity,
          unitPrice: cartItem.price,
          linePrice: cartItem.total,
          originalPrice: cartItem.originalPrice,
          discountAmount: cartItem.discountAmount || 0,
          taxAmount: cartItem.taxAmount || 0,
          weight: cartItem.variant?.weight || cartItem.product.weight,
          dimensions: cartItem.variant?.dimensions || cartItem.product.dimensions,
          isDigital: cartItem.product.isDigital || false,
          digitalDeliveryStatus: cartItem.product.isDigital ? 'pending' : null,
          customizations: cartItem.customizations,
          giftWrapping: cartItem.giftWrapping || false,
          returnEligible: cartItem.product.returnEligible !== false,
          warrantyInfo: cartItem.product.warrantyInfo
        };

        await strapi.documents('api::order-item.order-item').create({
          data: orderItemData as any
        });
      }
    } catch (error) {
      strapi.log.error('Error creating order items:', error);
      throw error;
    }
  },

  /**
   * Rollback order creation on error
   */
  async rollbackOrderCreation(orderId: string, cartId: string, checkoutSessionId: string) {
    try {
      // Delete order items
      const orderItems = await strapi.documents('api::order-item.order-item').findMany({
        filters: { order: orderId as any }
      });

      for (const item of orderItems) {
        await strapi.documents('api::order-item.order-item').delete({
          documentId: item.documentId
        });
      }

      // Delete order
      await strapi.documents('api::order.order').delete({
        documentId: orderId
      });

      // Restore cart status
      await strapi.documents('api::cart.cart').update({
        documentId: cartId,
        data: { status: 'active' }
      });

      // Restore checkout session status
      await strapi.documents('api::checkout.checkout-session').update({
        documentId: checkoutSessionId,
        data: { status: 'active' }
      });

      strapi.log.info('Order creation rollback completed');
    } catch (error) {
      strapi.log.error('Error during order creation rollback:', error);
    }
  }
};
