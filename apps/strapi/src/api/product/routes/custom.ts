/**
 * Custom product routes for wishlist management
 */

export default {
  routes: [
    // Custom wishlist routes
    {
      method: 'POST',
      path: '/products/:productId/wishlist',
      handler: 'product.addToWishlist',
      config: {
        policies: ['api::product.can-manage-wishlist'],
      },
    },
    {
      method: 'DELETE',
      path: '/products/:productId/wishlist',
      handler: 'product.removeFromWishlist',
      config: {
        policies: ['api::product.can-manage-wishlist'],
      },
    },
    {
      method: 'GET',
      path: '/products/wishlist',
      handler: 'product.getWishlist',
      config: {
        policies: ['api::product.can-manage-wishlist'],
      },
    },
  ],
};
