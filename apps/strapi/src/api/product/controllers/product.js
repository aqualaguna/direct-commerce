/**
 * product controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::product.product', ({ strapi }) => ({
  // Custom method to add product to user's wishlist
  async addToWishlist(ctx) {
    const { user } = ctx.state;
    const { productId } = ctx.params;

    if (!user) {
      return ctx.unauthorized('User must be authenticated');
    }

    try {
      // Get the product
      const product = await strapi.entityService.findOne(
        'api::product.product',
        productId
      );
      if (!product) {
        return ctx.notFound('Product not found');
      }

      // Add product to user's wishlist
      await strapi.entityService.update(
        'plugin::users-permissions.user',
        user.id,
        {
          data: {
            wishlist: {
              connect: [productId],
            },
          },
        }
      );

      return ctx.send({ message: 'Product added to wishlist' });
    } catch {
      return ctx.badRequest('Failed to add product to wishlist');
    }
  },

  // Custom method to remove product from user's wishlist
  async removeFromWishlist(ctx) {
    const { user } = ctx.state;
    const { productId } = ctx.params;

    if (!user) {
      return ctx.unauthorized('User must be authenticated');
    }

    try {
      // Remove product from user's wishlist
      await strapi.entityService.update(
        'plugin::users-permissions.user',
        user.id,
        {
          data: {
            wishlist: {
              disconnect: [productId],
            },
          },
        }
      );

      return ctx.send({ message: 'Product removed from wishlist' });
    } catch {
      return ctx.badRequest('Failed to remove product from wishlist');
    }
  },

  // Custom method to get user's wishlist
  async getWishlist(ctx) {
    const { user } = ctx.state;

    if (!user) {
      return ctx.unauthorized('User must be authenticated');
    }

    try {
      const userWithWishlist = await strapi.entityService.findOne(
        'plugin::users-permissions.user',
        user.id,
        {
          populate: {
            wishlist: {
              populate: ['images', 'category'],
            },
          },
        }
      );

      return ctx.send(userWithWishlist.wishlist || []);
    } catch {
      return ctx.badRequest('Failed to get wishlist');
    }
  },
}));
