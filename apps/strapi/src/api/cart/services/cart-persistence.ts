/**
 * Cart Persistence Service
 * 
 * Handles cart session management, guest to registered user migration,
 * and cart lifecycle operations.
 */

import { factories } from '@strapi/strapi';

interface CartPersistenceService {
  createGuestCart(sessionId: string): Promise<any>;
  createUserCart(userId: number): Promise<any>;
  getCartBySessionId(sessionId: string): Promise<any>;
  getCartByUserId(userId: number): Promise<any>;
  migrateGuestToUserCart(sessionId: string, userId: number): Promise<any>;
  updateCartExpiration(cartId: string, expiresAt: Date): Promise<any>;
  cleanupExpiredCarts(): Promise<number>;
  deleteCart(cartId: string): Promise<void>;
}

export default ({ strapi }: { strapi: any }): CartPersistenceService => ({
  /**
   * Create a new guest cart with session ID
   */
  async createGuestCart(sessionId: string) {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

      const cart = await strapi.documents('api::cart.cart').create({
        data: {
          sessionId,
          user: null,
          subtotal: 0,
          tax: 0,
          shipping: 0,
          total: 0,
          currency: 'USD',
          expiresAt,
          status: 'active'
        }
      });

      strapi.log.info(`Created guest cart for session: ${sessionId}`);
      return cart;
    } catch (error) {
      strapi.log.error('Error creating guest cart:', error);
      throw new Error('Failed to create guest cart');
    }
  },

  /**
   * Create a new cart for registered user
   */
  async createUserCart(userId: number) {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

      const cart = await strapi.documents('api::cart.cart').create({
        data: {
          sessionId: null,
          user: userId,
          subtotal: 0,
          tax: 0,
          shipping: 0,
          total: 0,
          currency: 'USD',
          expiresAt,
          status: 'active'
        }
      });

      strapi.log.info(`Created user cart for user: ${userId}`);
      return cart;
    } catch (error) {
      strapi.log.error('Error creating user cart:', error);
      throw new Error('Failed to create user cart');
    }
  },

  /**
   * Get cart by session ID (for guest users)
   */
  async getCartBySessionId(sessionId: string) {
    try {
      const cart = await strapi.documents('api::cart.cart').findFirst({
        filters: {
          sessionId,
          status: 'active',
          expiresAt: { $gt: new Date() }
        },
        populate: {
          items: {
            filters: {
              deletedAt: null
            },
            populate: {
              product: true,
              productListing: true,
              variant: true
            }
          }
        }
      });

      return cart;
    } catch (error) {
      strapi.log.error('Error getting cart by session ID:', error);
      throw new Error('Failed to get cart by session ID');
    }
  },

  /**
   * Get cart by user ID (for registered users)
   */
  async getCartByUserId(userId: number) {
    try {
      const cart = await strapi.documents('api::cart.cart').findFirst({
        filters: {
          user: userId,
          status: 'active',
          expiresAt: { $gt: new Date() }
        },
        populate: {
          user: {
            fields: ['id', 'email', 'username', 'documentId']
          },
          items: {
            filters: {
              deletedAt: null
            },
            populate: {
              product: true,
              productListing: true,
              variant: true
            },
          }
        }
      });

      return cart;
    } catch (error) {
      strapi.log.error('Error getting cart by user ID:', error);
      throw new Error('Failed to get cart by user ID');
    }
  },

  /**
   * Migrate guest cart to user cart when user logs in
   */
  async migrateGuestToUserCart(sessionId: string, userId: number) {
    try {
      // Get guest cart
      const guestCart = await this.getCartBySessionId(sessionId);
      if (!guestCart) {
        strapi.log.info(`No guest cart found for session: ${sessionId}`);
        return null;
      }

      // Get or create user cart
      let userCart = await this.getCartByUserId(userId);
      if (!userCart) {
        userCart = await this.createUserCart(userId);
      }

      // Migrate items from guest cart to user cart
      if (guestCart.items && guestCart.items.length > 0) {
        for (const item of guestCart.items) {
          // Check if item already exists in user cart
          const existingItem = await strapi.documents('api::cart.cart-item').findFirst({
            filters: {
              cart: userCart.id,
              product: item.product.id,
              variant: item.variant?.id || null
            }
          });

          if (existingItem) {
            // Update quantity
            await strapi.documents('api::cart.cart-item').update({
              documentId: existingItem.documentId,
              data: {
                quantity: existingItem.quantity + item.quantity,
                total: parseFloat(((existingItem.quantity + item.quantity) * existingItem.price).toString()),
                updatedAt: new Date()
              }
            });
          } else {
            // Create new item in user cart
            await strapi.documents('api::cart.cart-item').create({
              data: {
                cart: userCart.id,
                product: item.product.id,
                productListing: item.productListing?.id || null,
                variant: item.variant?.id || null,
                quantity: item.quantity,
                price: parseFloat(item.price.toString()),
                total: parseFloat(item.total.toString()),
                addedAt: new Date(),
                updatedAt: new Date(),
                notes: item.notes,
                selectedOptions: item.selectedOptions
              }
            });
          }
        }
      }

      // Mark guest cart as converted
      await strapi.documents('api::cart.cart').update({
        documentId: guestCart.documentId,
        data: {
          status: 'converted'
        }
      });

      strapi.log.info(`Successfully migrated guest cart to user cart. User: ${userId}`);
      // get latest user cart
      userCart = await this.getCartByUserId(userId);
      return userCart;
    } catch (error) {
      strapi.log.error('Error migrating guest to user cart:', error);
      throw new Error('Failed to migrate guest to user cart');
    }
  },

  /**
   * Update cart expiration date
   */
  async updateCartExpiration(cartId: string, expiresAt: Date) {
    try {
      const cart = await strapi.documents('api::cart.cart').update({
        documentId: cartId,
        data: {
          expiresAt
        }
      });

      strapi.log.info(`Updated cart expiration. Cart: ${cartId}`);
      return cart;
    } catch (error) {
      strapi.log.error('Error updating cart expiration:', error);
      throw new Error('Failed to update cart expiration');
    }
  },

  /**
   * Clean up expired carts
   */
  async cleanupExpiredCarts() {
    try {
      const expiredCarts = await strapi.documents('api::cart.cart').findMany({
        filters: {
          expiresAt: { $lt: new Date() },
          status: 'active'
        }
      });

      let deletedCount = 0;
      for (const cart of expiredCarts) {
        // Delete cart items first
        const cartItems = await strapi.documents('api::cart.cart-item').findMany({
          filters: {
            cart: cart.documentId
          }
        });

        for (const item of cartItems) {
          await strapi.documents('api::cart.cart-item').delete({
            documentId: item.documentId
          });
        }

        // Delete cart
        await strapi.documents('api::cart.cart').delete({
          documentId: cart.documentId
        });

        deletedCount++;
      }

      strapi.log.info(`Cleaned up ${deletedCount} expired carts`);
      return deletedCount;
    } catch (error) {
      strapi.log.error('Error cleaning up expired carts:', error);
      throw new Error('Failed to cleanup expired carts');
    }
  },

  /**
   * Delete cart and all its items
   */
  async deleteCart(cartId: string) {
    try {
      // Delete cart items first
      const cartItems = await strapi.documents('api::cart.cart-item').findMany({
        filters: {
          cart: cartId
        }
      });

      for (const item of cartItems) {
        await strapi.documents('api::cart.cart-item').delete({
          documentId: item.documentId
        });
      }

      // Delete cart
      await strapi.documents('api::cart.cart').delete({
        documentId: cartId
      });

      strapi.log.info(`Deleted cart: ${cartId}`);
    } catch (error) {
      strapi.log.error('Error deleting cart:', error);
      throw new Error('Failed to delete cart');
    }
  }
});
