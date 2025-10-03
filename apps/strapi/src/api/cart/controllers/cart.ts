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
import { getPrice } from '../../../utils/price';

// Import global services directly

export default factories.createCoreController('api::cart.cart', ({ strapi }) => ({
  delete: async (ctx) => {
    const { documentId } = ctx.params;

    const cart = await strapi.documents('api::cart.cart').findOne({
      documentId,
    });

    if (!cart) {
      return ctx.notFound('Cart not found');
    }


    await strapi.documents('api::cart.cart').delete({
      documentId
    });

    return {
      message: 'Cart deleted successfully',
      data: null
    };
  },
  /**
   * Get current user cart
   */
  async getCurrentCart(ctx) {
    try {
      const { user } = ctx.state;
      const { sessionId } = ctx.query;
      const cartPersistenceService = strapi.service('api::cart.cart-persistence');
      const cartCalculationService = strapi.service('api::cart.cart-calculation');

      if (!user && !sessionId) {
        return ctx.unauthorized('User or session ID is required');
      }

      let cart = null;

      if (user) {
        // Get cart for authenticated user
        cart = await cartPersistenceService.getCartByUserId(user.id);
      } else if (sessionId) {
        // Get cart for guest user
        cart = await cartPersistenceService.getCartBySessionId(sessionId);
      }

      if (!cart) {
        return ctx.notFound('Cart not found');
      }

      // Calculate totals
      const calculation = await cartCalculationService.calculateCartTotals(cart);

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
      const { productId, productListingId, variantId, quantity } = ctx.request.body;
      const cartPersistenceService = strapi.service('api::cart.cart-persistence');
      const cartCalculationService = strapi.service('api::cart.cart-calculation');
      // Validate input
      if (!productId || !quantity || quantity < 1 || !productListingId) {
        return ctx.badRequest('Product ID, product listing ID, and valid quantity are required');
      }
      if (typeof quantity !== 'number' || Number.isNaN(Number(quantity))) {
        return ctx.badRequest('Quantity must be a number and finite');
      }

      if (!user && !sessionId) {
        return ctx.unauthorized('User or session ID is required');
      }

      // Get or create cart
      let cart = null;
      if (user) {
        cart = await cartPersistenceService.getCartByUserId(user.id);
        if (!cart) {
          cart = await cartPersistenceService.createUserCart(user.id);
        }
      } else if (sessionId) {
        cart = await cartPersistenceService.getCartBySessionId(sessionId);
        if (!cart) {
          cart = await cartPersistenceService.createGuestCart(sessionId);
        }
      } else {
        return ctx.badRequest('Session ID required for guest users');
      }

      // Get product listing (required for cart operations)
      let productListing = null;
      if (productListingId) {
        productListing = await strapi.documents('api::product-listing.product-listing').findOne({
          documentId: productListingId,
          filters: { isActive: true }
        });
      } else {
        // If no productListingId provided, find the first active listing for this product
        const listings = await strapi.documents('api::product-listing.product-listing').findMany({
          filters: { 
            product: productId,
            isActive: true 
          },
          sort: { createdAt: 'asc' }
        });
        productListing = listings.length > 0 ? listings[0] : null;
      }

      if (!productListing) {
        return ctx.notFound('Product listing not found or inactive');
      }

      // Validate base product exists and is active
      const product = await strapi.documents('api::product.product').findOne({
        documentId: productId,
        filters: { status: 'active' }
      });
      if (!product) {
        return ctx.notFound('Product not found or inactive');
      }

      // Get variant if provided
      let variant = null;
      if (variantId) {
        variant = await strapi.documents('api::product-listing-variant.product-listing-variant').findOne({
          documentId: variantId,
          filters: { },
          populate: {
            productListing: true,
            optionValue: true
          }
        });
      }
      // check if variant valid for the product listing
      if (variant && variant.productListing.documentId !== productListing.documentId) {
        return ctx.badRequest('Variant is not valid for the product listing');
      }
      // check if variant valid for the product listing
      if (productListing.type === 'variant' && !variant) {
        return ctx.badRequest('Variant is required for variant product listing');
      }
      // Check inventory availability before adding to cart
      let availableInventory = 0;
   
      // Check product inventory
      const productInventory = await strapi.documents('api::inventory.inventory').findFirst({
        filters: {
          product: { id: product.id },
        }
      });
      availableInventory = productInventory?.quantity || 0;

      // Check if requested quantity exceeds available inventory
      if (quantity > availableInventory) {
        return ctx.badRequest(`Insufficient inventory. Only ${availableInventory} items available.`);
      }

      // Check if item already exists in cart
      const existingItem = await strapi.documents('api::cart-item.cart-item').findFirst({
        filters: {
          cart: cart.id,
          productListing: productListing.id,
          ...(variant ? { variant: variant.id } : { variant: null })
        }
      });

      let cartItem;
      if (existingItem) {
        // Check if total quantity (existing + new) exceeds inventory
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > availableInventory) {
          return ctx.badRequest(`Insufficient inventory. Only ${availableInventory} items available. You already have ${existingItem.quantity} in your cart.`);
        }
        
        // Update existing item quantity
        const newTotal = parseFloat((newQuantity * existingItem.price).toString());

        cartItem = await strapi.documents('api::cart-item.cart-item').update({
          documentId: existingItem.documentId,
          data: {
            quantity: newQuantity,
            total: newTotal,
            updatedAt: new Date()
          },
          populate: {
            product: true,
            productListing: true,
            variant: true
          }
        });
      } else {
        // Create new cart item
        const price = productListing.type === 'variant' ? getPrice(variant) : getPrice(productListing);
        const total = parseFloat((price * quantity).toString());

        cartItem = await strapi.documents('api::cart-item.cart-item').create({
          data: {
            cart: cart.id,
            product: product.id,
            productListing: productListing.id,
            variant: variant?.id || null,
            quantity,
            price,
            total,
            addedAt: new Date(),
            updatedAt: new Date(),
            selectedOptions: variant ? variant.optionValue : null
          },
          populate: {
            product: true,
            productListing: true,
            variant: true
          }
        });
      }

      // Recalculate cart totals
      const updatedCart = await strapi.documents('api::cart.cart').findOne({
        documentId: cart.documentId,
        populate: {
          user: true,
          items: {
            populate: {
              product: true,
              productListing: true,
              variant: true
            }
          }
        }
      });

      const calculation = await cartCalculationService.calculateCartTotals(updatedCart);

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
      const { user } = ctx.state;
      const { sessionId } = ctx.query;
      const cartPersistenceService = strapi.service('api::cart.cart-persistence');
      const cartCalculationService = strapi.service('api::cart.cart-calculation');
      // Validate input
      if (!quantity || quantity < 1) {
        return ctx.badRequest('Valid quantity is required');
      }
      // Get cart item
      const cartItem = await strapi.documents('api::cart-item.cart-item').findOne({
        documentId,
        populate: {
          cart: {
            populate: {
              user: true,
            }
          },
          product: true,
          variant: true
        }
      });
      // check if user has access to the cart item
      if (!cartItem) {
        return ctx.notFound('Cart item not found');
      }

      if (cartItem.cart.user && cartItem.cart.user.id !== user.id) {
        return ctx.forbidden('Access denied');
      }
      if (cartItem.cart.sessionId && cartItem.cart.sessionId !== sessionId) {
        return ctx.forbidden('Access denied');
      }

      if (!user && !sessionId) {
        return ctx.forbidden('Access denied');
      }

      // Check inventory availability
      const product = cartItem.product;
      const variant = cartItem.variant;
      
      // Get current inventory
      let availableInventory = 0;
      // Check product inventory
      const productInventory = await strapi.documents('api::inventory.inventory').findFirst({
        filters: {
          product: { id: product.id },
        }
      });
      availableInventory = productInventory?.quantity || 0;

      // Check if requested quantity exceeds available inventory
      if (quantity > availableInventory) {
        return ctx.badRequest(`Insufficient inventory. Only ${availableInventory} items available.`);
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

      const calculation = await cartCalculationService.calculateCartTotals(cart);

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
      const { user } = ctx.state;
      const { sessionId } = ctx.query;
      const cartPersistenceService = strapi.service('api::cart.cart-persistence');
      const cartCalculationService = strapi.service('api::cart.cart-calculation');
      // Get cart item
      const cartItem = await strapi.documents('api::cart-item.cart-item').findOne({
        documentId,
        populate: {
          cart: {
            populate: {
              user: true,
            }
          }
        }
      });
      if (!cartItem) {
        return ctx.notFound('Cart item not found');
      }

      if (cartItem.cart.user && cartItem.cart.user.id !== user.id) {
        return ctx.forbidden('Access denied');
      }
      if (cartItem.cart.sessionId && cartItem.cart.sessionId !== sessionId) {
        return ctx.forbidden('Access denied');
      }
      if (!user && !sessionId) {
        return ctx.forbidden('Access denied');
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

      const calculation = await cartCalculationService.calculateCartTotals(cart);

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
      const cartPersistenceService = strapi.service('api::cart.cart-persistence');
      const cartCalculationService = strapi.service('api::cart.cart-calculation');

      let cart = null;
      if (user) {
        cart = await cartPersistenceService.getCartByUserId(user.id);
      } else if (sessionId) {
        cart = await cartPersistenceService.getCartBySessionId(sessionId);
      }

      if (!cart) {
        return ctx.notFound('Cart not found');
      }

      // Delete all cart items
      const cartItems = await strapi.documents('api::cart-item.cart-item').findMany({
        filters: {
          cart: cart.id
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
      const cartPersistenceService = strapi.service('api::cart.cart-persistence');
      const cartCalculationService = strapi.service('api::cart.cart-calculation');

      let cart = null;

      if (user) {
        cart = await cartPersistenceService.getCartByUserId(user.id);
      } else if (sessionId) {
        cart = await cartPersistenceService.getCartBySessionId(sessionId);
      }

      if (!cart) {
        return ctx.notFound('Cart not found');
      }

      // Calculate totals with options
      const calculation = await cartCalculationService.calculateCartTotals(cart, {
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
      const cartPersistenceService = strapi.service('api::cart.cart-persistence');
      const cartCalculationService = strapi.service('api::cart.cart-calculation');

      if (!user) {
        return ctx.unauthorized('User must be authenticated');
      }

      if (!sessionId) {
        return ctx.badRequest('Session ID is required');
      }
      // check if cart exists
      const cart = await cartPersistenceService.getCartBySessionId(sessionId);
      if (!cart) {
        return ctx.notFound('No guest cart found to migrate');
      }
      
      const migratedCart = await cartPersistenceService.migrateGuestToUserCart(sessionId, user.id);

      if (!migratedCart) {
        return ctx.notFound('No guest cart found to migrate');
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
