/**
 * cart controller
 * 
 * Handles cart management operations including:
 * - Get current user cart
 * - Add items to cart
 * - Update cart item quantities
 * - Remove items from cart
 * - Clear cart
 * - Calculate cart totals
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::cart.cart', ({ strapi }) => ({
  /**
   * Get current user cart
   */
  async getCurrentCart(ctx) {
    try {
      const { user } = ctx.state;
      const { sessionId } = ctx.query;

      let cart = null;

      if (user) {
        // Get cart for authenticated user
        cart = await strapi.service('cart-persistence').getCartByUserId(user.id);
      } else if (sessionId) {
        // Get cart for guest user
        cart = await strapi.service('cart-persistence').getCartBySessionId(sessionId);
      }

      if (!cart) {
        return ctx.notFound('Cart not found');
      }

      // Calculate totals
      const calculation = await strapi.service('cart-calculation').calculateCartTotals(cart);

      return {
        data: {
          ...cart,
          calculation
        }
      };
    } catch (error) {
      strapi.log.error('Error getting current cart:', error);
      ctx.throw(500, 'Failed to get cart');
    }
  },

  /**
   * Add item to cart
   */
  async addItem(ctx) {
    try {
      const { user } = ctx.state;
      const { sessionId } = ctx.query;
      const { productId, productListingId, variantId, quantity = 1 } = ctx.request.body;

      // Validate input
      if (!productId || !quantity || quantity < 1) {
        return ctx.badRequest('Product ID and valid quantity are required');
      }

      // Get or create cart
      let cart = null;
      if (user) {
        cart = await strapi.service('cart-persistence').getCartByUserId(user.id);
        if (!cart) {
          cart = await strapi.service('cart-persistence').createUserCart(user.id);
        }
      } else if (sessionId) {
        cart = await strapi.service('cart-persistence').getCartBySessionId(sessionId);
        if (!cart) {
          cart = await strapi.service('cart-persistence').createGuestCart(sessionId);
        }
      } else {
        return ctx.badRequest('Session ID required for guest users');
      }

      // Validate product exists and is active
      const product = await strapi.documents('api::product.product').findOne({
        documentId: productId,
        filters: { status: 'active' }
      });

      if (!product) {
        return ctx.notFound('Product not found or inactive');
      }

      // Get product listing if provided
      let productListing = null;
      if (productListingId) {
        productListing = await strapi.documents('api::product-listing.product-listing').findOne({
          documentId: productListingId,
          filters: { status: 'published' }
        });
      }

      // Get variant if provided
      let variant = null;
      if (variantId) {
        variant = await strapi.documents('api::product-listing-variant.product-listing-variant').findOne({
          documentId: variantId,
          filters: { isActive: true }
        });
      }

      // Check if item already exists in cart
      const existingItem = await strapi.documents('api::cart-item.cart-item').findFirst({
        filters: {
          cart: cart.documentId,
          product: productId,
          variant: variantId || null
        }
      });

      let cartItem;
      if (existingItem) {
        // Update existing item quantity
        const newQuantity = existingItem.quantity + quantity;
        const newTotal = newQuantity * existingItem.price;

        cartItem = await strapi.documents('api::cart-item.cart-item').update({
          documentId: existingItem.documentId,
          data: {
            quantity: newQuantity,
            total: newTotal,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new cart item
        const price = variant?.price || product.basePrice || 0;
        const total = price * quantity;

        cartItem = await strapi.documents('api::cart-item.cart-item').create({
          data: {
            cart: cart.documentId,
            product: productId,
            productListing: productListingId || null,
            variant: variantId || null,
            quantity,
            price,
            total,
            addedAt: new Date(),
            updatedAt: new Date()
          }
        });
      }

      // Recalculate cart totals
      const updatedCart = await strapi.documents('api::cart.cart').findOne({
        documentId: cart.documentId,
        populate: {
          items: {
            populate: {
              product: true,
              productListing: true,
              variant: true
            }
          }
        }
      });

      const calculation = await strapi.service('cart-calculation').calculateCartTotals(updatedCart);

      // Update cart totals
      await strapi.documents('api::cart.cart').update({
        documentId: cart.documentId,
        data: {
          subtotal: calculation.subtotal,
          tax: calculation.tax,
          shipping: calculation.shipping,
          total: calculation.total
        }
      });

      return {
        data: {
          cartItem,
          cart: {
            ...updatedCart,
            calculation
          }
        }
      };
    } catch (error) {
      strapi.log.error('Error adding item to cart:', error);
      ctx.throw(500, 'Failed to add item to cart');
    }
  },

  /**
   * Update cart item quantity
   */
  async updateItem(ctx) {
    try {
      const { documentId } = ctx.params;
      const { quantity } = ctx.request.body;

      // Validate input
      if (!quantity || quantity < 1) {
        return ctx.badRequest('Valid quantity is required');
      }

      // Get cart item
      const cartItem = await strapi.documents('api::cart-item.cart-item').findOne({
        documentId,
        populate: {
          cart: true
        }
      });

      if (!cartItem) {
        return ctx.notFound('Cart item not found');
      }

      // Update item
      const total = cartItem.price * quantity;
      const updatedItem = await strapi.documents('api::cart-item.cart-item').update({
        documentId,
        data: {
          quantity,
          total,
          updatedAt: new Date()
        }
      });

      // Recalculate cart totals
      const cart = await strapi.documents('api::cart.cart').findOne({
        documentId: cartItem.cart.documentId,
        populate: {
          items: {
            populate: {
              product: true,
              productListing: true,
              variant: true
            }
          }
        }
      });

      const calculation = await strapi.service('cart-calculation').calculateCartTotals(cart);

      // Update cart totals
      await strapi.documents('api::cart.cart').update({
        documentId: cart.documentId,
        data: {
          subtotal: calculation.subtotal,
          tax: calculation.tax,
          shipping: calculation.shipping,
          total: calculation.total
        }
      });

      return {
        data: {
          cartItem: updatedItem,
          calculation
        }
      };
    } catch (error) {
      strapi.log.error('Error updating cart item:', error);
      ctx.throw(500, 'Failed to update cart item');
    }
  },

  /**
   * Remove item from cart
   */
  async removeItem(ctx) {
    try {
      const { documentId } = ctx.params;

      // Get cart item
      const cartItem = await strapi.documents('api::cart-item.cart-item').findOne({
        documentId,
        populate: {
          cart: true
        }
      });

      if (!cartItem) {
        return ctx.notFound('Cart item not found');
      }

      // Delete cart item
      await strapi.documents('api::cart-item.cart-item').delete({
        documentId
      });

      // Recalculate cart totals
      const cart = await strapi.documents('api::cart.cart').findOne({
        documentId: cartItem.cart.documentId,
        populate: {
          items: {
            populate: {
              product: true,
              productListing: true,
              variant: true
            }
          }
        }
      });

      const calculation = await strapi.service('cart-calculation').calculateCartTotals(cart);

      // Update cart totals
      await strapi.documents('api::cart.cart').update({
        documentId: cart.documentId,
        data: {
          subtotal: calculation.subtotal,
          tax: calculation.tax,
          shipping: calculation.shipping,
          total: calculation.total
        }
      });

      return {
        data: {
          message: 'Item removed from cart',
          calculation
        }
      };
    } catch (error) {
      strapi.log.error('Error removing cart item:', error);
      ctx.throw(500, 'Failed to remove cart item');
    }
  },

  /**
   * Clear all items from cart
   */
  async clearCart(ctx) {
    try {
      const { user } = ctx.state;
      const { sessionId } = ctx.query;

      let cart = null;

      if (user) {
        cart = await strapi.service('cart-persistence').getCartByUserId(user.id);
      } else if (sessionId) {
        cart = await strapi.service('cart-persistence').getCartBySessionId(sessionId);
      }

      if (!cart) {
        return ctx.notFound('Cart not found');
      }

      // Delete all cart items
      const cartItems = await strapi.documents('api::cart-item.cart-item').findMany({
        filters: {
          cart: cart.documentId
        }
      });

      for (const item of cartItems) {
        await strapi.documents('api::cart-item.cart-item').delete({
          documentId: item.documentId
        });
      }

      // Reset cart totals
      await strapi.documents('api::cart.cart').update({
        documentId: cart.documentId,
        data: {
          subtotal: 0,
          tax: 0,
          shipping: 0,
          total: 0
        }
      });

      return {
        data: {
          message: 'Cart cleared successfully'
        }
      };
    } catch (error) {
      strapi.log.error('Error clearing cart:', error);
      ctx.throw(500, 'Failed to clear cart');
    }
  },

  /**
   * Calculate cart totals
   */
  async calculateTotals(ctx) {
    try {
      const { user } = ctx.state;
      const { sessionId } = ctx.query;
      const { shippingAddress, shippingMethod, discountCode } = ctx.request.body;

      let cart = null;

      if (user) {
        cart = await strapi.service('cart-persistence').getCartByUserId(user.id);
      } else if (sessionId) {
        cart = await strapi.service('cart-persistence').getCartBySessionId(sessionId);
      }

      if (!cart) {
        return ctx.notFound('Cart not found');
      }

      // Calculate totals with options
      const calculation = await strapi.service('cart-calculation').calculateCartTotals(cart, {
        shippingAddress,
        shippingMethod,
        discountCode
      });

      // Update cart with new totals
      await strapi.documents('api::cart.cart').update({
        documentId: cart.documentId,
        data: {
          subtotal: calculation.subtotal,
          tax: calculation.tax,
          shipping: calculation.shipping,
          total: calculation.total,
          shippingAddress,
          shippingMethod,
          discountCode,
          discountAmount: calculation.discount
        }
      });

      return {
        data: calculation
      };
    } catch (error) {
      strapi.log.error('Error calculating cart totals:', error);
      ctx.throw(500, 'Failed to calculate cart totals');
    }
  },

  /**
   * Migrate guest cart to user cart
   */
  async migrateGuestCart(ctx) {
    try {
      const { user } = ctx.state;
      const { sessionId } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('User must be authenticated');
      }

      if (!sessionId) {
        return ctx.badRequest('Session ID is required');
      }

      const migratedCart = await strapi.service('cart-persistence').migrateGuestToUserCart(sessionId, user.id);

      if (!migratedCart) {
        return {
          data: {
            message: 'No guest cart found to migrate'
          }
        };
      }

      return {
        data: {
          message: 'Cart migrated successfully',
          cart: migratedCart
        }
      };
    } catch (error) {
      strapi.log.error('Error migrating guest cart:', error);
      ctx.throw(500, 'Failed to migrate guest cart');
    }
  }
}));
