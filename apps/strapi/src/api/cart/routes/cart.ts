/**
 * cart router
 * 
 * Defines routes for cart management operations
 */

import { factories } from '@strapi/strapi';

// Custom cart routes
export default {
  routes: [
    // Get current user cart
    {
      method: 'GET',
      path: '/carts/current',
      handler: 'cart.getCurrentCart',
      config: {
        policies: ['global::is-public'],
        auth: {
          scope: ['customer', 'admin']
        }
      }
    },

    // Add item to cart
    {
      method: 'POST',
      path: '/carts/items',
      handler: 'cart.addItem',
      config: {
        policies: ['global::is-public'],
        auth: {
          scope: ['customer', 'admin']
        }
      }
    },

    // Update cart item quantity
    {
      method: 'PUT',
      path: '/carts/items/:documentId',
      handler: 'cart.updateItem',
      config: {
        policies: ['global::is-authenticated'],
        auth: {
          scope: ['customer', 'admin']
        }
      }
    },

    // Remove item from cart
    {
      method: 'DELETE',
      path: '/carts/items/:documentId',
      handler: 'cart.removeItem',
      config: {
        policies: ['global::is-authenticated'],
        auth: {
          scope: ['customer', 'admin']
        }
      }
    },

    // Clear all items from cart
    {
      method: 'POST',
      path: '/carts/clear',
      handler: 'cart.clearCart',
      config: {
        policies: ['global::is-authenticated'],
        auth: {
          scope: ['customer', 'admin']
        }
      }
    },

    // Calculate cart totals
    {
      method: 'POST',
      path: '/carts/calculate',
      handler: 'cart.calculateTotals',
      config: {
        policies: ['global::is-public'],
        auth: {
          scope: ['customer', 'admin']
        }
      }
    },

    // Migrate guest cart to user cart
    {
      method: 'POST',
      path: '/carts/migrate',
      handler: 'cart.migrateGuestCart',
      config: {
        policies: ['global::is-authenticated'],
        auth: {
          scope: ['customer', 'admin']
        }
      }
    }
  ]
};
