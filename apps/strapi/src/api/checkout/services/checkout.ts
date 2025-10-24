import { Core } from "@strapi/strapi"
import { UserType } from "../../../../config/constant";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  
  /**
   * Validates authentication for checkout operations
   * @param user - User from context state
   * @param sessionId - Session ID from query or body
   * @returns Object with authentication details
   */
  async validateAuthentication(user: any, sessionId: string | undefined) {
    const isUser = !!user;
    const isGuest = !!sessionId;
    
    if (!isUser && !isGuest) {
      throw new Error('Authentication required - provide either user authentication or session ID');
    }
    
    if (isUser && isGuest) {
      throw new Error('Ambiguous request - provide either user authentication or session ID, not both');
    }

    return {
      isUser,
      isGuest,
      userId: isGuest ? sessionId : user.id
    };
  },

  /**
   * Retrieves and validates checkout session
   * @param documentId - Checkout session document ID
   * @param populate - Fields to populate
   * @returns Checkout session data
   */
  async getCheckout(documentId: string, populate: any = {}, auth: any = {}) {
    const checkout = await strapi.documents('api::checkout.checkout').findOne({
      documentId,
      populate
    });

    if (!checkout) {
      throw new Error('Checkout not found');
    }
    if (auth.isGuest && checkout.sessionId !== auth.userId) {
      throw new Error('Checkout not found');
    }
    return checkout;
  },

  /**
   * Validates checkout session status
   * @param checkoutSession - Checkout session data
   * @param allowedStatuses - Array of allowed statuses
   * @param checkExpiration - Whether to check expiration
   */
  async validateCheckoutStatus(checkout: any, allowedStatuses: string[] = ['active'], checkExpiration: boolean = false) {
    if (!allowedStatuses.includes(checkout.status)) {
      throw new Error(`Checkout is not ${allowedStatuses.join(' or ')}`);
    }

    if (checkExpiration && checkout.expiresAt < new Date()) {
      throw new Error('Checkout has expired');
    }
  },

  /**
   * Creates a new checkout
   * @param checkoutData - Checkout data
   * @param userId - User or session ID
   * @param isGuest - Whether this is a guest session
   * @returns Created checkout
   */
  async createCheckout(checkoutData: any, userId: string, isGuest: boolean) {
    const validationService = strapi.service('api::checkout.validation');
    const result = await validationService.validateCheckoutData(checkoutData, userId, isGuest);
    
    if (!result.isValid) {
      throw new Error(`Checkout data validation failed: ${result.errors.join(', ')}`);
    }

    const checkout = await strapi.documents('api::checkout.checkout').create({
      data: result.data,
      populate: {
        shippingAddress: true,
        billingAddress: true,
        user: true
      }
    });

    return checkout;
  },

  /**
   * Updates checkout  with validation
   * @param documentId - Checkout document ID
   * @param checkoutData - Updated checkout data
   * @param userId - User or session ID
   * @param isGuest - Whether this is a guest session
   * @returns Updated checkout
   */
  async updateCheckout(documentId: string, checkoutData: any, userId: string, isGuest: boolean) {
    const validationService = strapi.service('api::checkout.validation');
    const result = await validationService.validateCheckoutData(checkoutData, userId, isGuest);
    
    if (!result.isValid) {
      throw new Error(`Checkout data validation failed: ${result.errors.join(', ')}`);
    }

    const checkoutUpdated = await strapi.documents('api::checkout.checkout').update({
      documentId,
      data: result.data
    });

    return checkoutUpdated;
  },

  /**
   * Creates an order from checkout
   * @param checkout - Checkout  data
   * @param userId - User ID (null for guests)
   * @returns Created order
   */
  async createOrderFromCheckout(checkout: any, userId: string | null, userType: UserType) {
    const cartItems = (checkout.metadata as any).cartItems;
    const orderNumber = await strapi.service('api::order.order-creation').generateOrderNumber();
    
    const orderData = {
      orderNumber,
      user: userType === UserType.AUTHENTICATED ? userId : null,
      sessionId: userType === UserType.GUEST ? userId : null,
      checkout: checkout.documentId,
      status: 'pending' as const,
      subtotal: cartItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0),
      tax: 0,
      shipping: 0,
      discount: 0,
      total: cartItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0),
      currency: 'USD',
      shippingAddress: checkout.shippingAddress.id,
      billingAddress: checkout.billingAddress.id,
      paymentStatus: 'pending' as const,
      shippingMethod: checkout.shippingMethod,
      trackingNumber: '',
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      orderSource: 'web' as const,
      customerNotes: '',
      adminNotes: '',
      fraudScore: 0,
      isGift: false,
      giftMessage: '',
      metadata: {}
    };

    const order = await strapi.documents('api::order.order').create({
      data: orderData
    });
    // inventory service
    const inventoryService = await strapi.service('api::inventory.inventory');
    // Create order items
    for (const item of cartItems) {
      await strapi.documents('api::order.order-item').create({
        data: {
          order: order.documentId,
          product: item.product,
          productListing: item.productListing,
          variant: item.variant,
          price: item.price,
          subtotal: item.price * item.quantity,
          quantity: item.quantity,
          tax: 0
        }
      });
      await inventoryService.reserveStock(item.product.documentId, item.quantity, {
        orderId: order.documentId,
        customerId: userType === UserType.AUTHENTICATED ? userId : null,
        sessionId: userType === UserType.GUEST ? userId : null,
      });
      // create order history
      await strapi.service('api::order.order-history').recordOrderCreation(order.documentId, orderData, userType === UserType.AUTHENTICATED ? userId : null, 'customer');
      await strapi.service('api::order.order-history').recordStatusChange(order.documentId, 'pending', 'pending', userType === UserType.AUTHENTICATED ? userId : null, 'Order created from checkout');
    }
    return order;
  },

  /**
   * Completes checkout process with order creation
   * @param checkout - Checkout data
   * @param userId - User ID (null for guests)
   * @returns Created order with populated data
   */
  async completeCheckoutProcess(checkout: any, userId: string | null, userType: UserType) {
    // Lock checkout session
    await strapi.documents('api::checkout.checkout').update({
      documentId: checkout.documentId,
      data: { status: 'locked' }
    });

    const order = await strapi.db.transaction(async ({ commit }) => {
      // Create order
      const order = await this.createOrderFromCheckout(checkout, userId, userType);
      
      // Update checkout session to completed
      await strapi.documents('api::checkout.checkout').update({
        documentId: checkout.documentId,
        data: { status: 'completed' }
      });
      // soft delete cart items
      const cartItems = (checkout.metadata as any).cartItems;
      const cart = (checkout.metadata as any).cartItems[0].cart;
      for (const item of cartItems) {
        await strapi.documents('api::cart.cart-item').update({
          documentId: item.documentId,
          data: {
            deletedAt: new Date()
          }
        });
      }
      // recalculate cart totals
      const calculation = await strapi.service('api::cart.cart-calculation').calculateCartTotals(cart);
      await strapi.documents('api::cart.cart').update({
        documentId: cart.documentId,
        data: {
          subtotal: calculation.subtotal,
          tax: calculation.tax,
          shipping: calculation.shipping,
          total: calculation.total
        }
      });
      
      await commit();
      
      // Get latest order with populated data
      const latestOrder = await strapi.documents('api::order.order').findOne({
        documentId: order.documentId,
        populate: {
          items: true,
          shippingAddress: true,
          billingAddress: true,
          user: true,
          checkout: true,
        }
      });
      
      return latestOrder;
    });

    return order;
  },

  /**
   * Updates checkout status
   * @param documentId - Checkout document ID
   * @param status - New status
   * @returns Updated checkout
   */
  async updateCheckoutStatus(documentId: string, status: 'active' | 'expired' | 'abandoned' | 'locked' | 'completed') {
    const updatedCheckout = await strapi.documents('api::checkout.checkout').update({
      documentId,
      data: { status }
    });

    return updatedCheckout;
  }

})