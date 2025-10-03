/**
 * Stock Reservation router
 *
 * Defines custom routes for stock reservation management operations including
 * reservation creation, status updates, expiration handling, and analytics.
 */

import { factories } from '@strapi/strapi';

// Create core routes with minimal configuration
const coreRoutes = factories.createCoreRouter('api::stock-reservation.stock-reservation', {
  config: {
    find: {
      policies: ['global::is-authenticated'],
    },
    findOne: {
      policies: ['global::is-authenticated'],
    },
    create: {
      policies: ['global::is-authenticated'],
    },
    update: {
      policies: ['global::is-authenticated'],
    },
    delete: {
      policies: ['global::is-authenticated'],
    },
  },
});

// Custom routes for stock reservation management
const extraRoutes = [
  // Reservation status management
  {
    method: 'POST',
    path: '/stock-reservations/:id/complete',
    handler: 'stock-reservation.completeReservation',
    config: {
      policies: ['global::is-authenticated'],
    },
  },
  {
    method: 'POST',
    path: '/stock-reservations/:id/cancel',
    handler: 'stock-reservation.cancelReservation',
    config: {
      policies: ['global::is-authenticated'],
    },
  },
  {
    method: 'POST',
    path: '/stock-reservations/:id/expire',
    handler: 'stock-reservation.expireReservation',
    config: {
      policies: ['global::is-authenticated'],
    },
  },
  // Bulk operations
  {
    method: 'POST',
    path: '/stock-reservations/bulk-complete',
    handler: 'stock-reservation.bulkComplete',
    config: {
      policies: ['global::is-authenticated'],
    },
  },
  {
    method: 'POST',
    path: '/stock-reservations/bulk-cancel',
    handler: 'stock-reservation.bulkCancel',
    config: {
      policies: ['global::is-authenticated'],
    },
  },
  // Analytics and reporting
  {
    method: 'GET',
    path: '/stock-reservations/analytics',
    handler: 'stock-reservation.getAnalytics',
    config: {
      policies: ['global::is-authenticated'],
    },
  },
  {
    method: 'GET',
    path: '/stock-reservations/expired',
    handler: 'stock-reservation.getExpired',
    config: {
      policies: ['global::is-authenticated'],
    },
  },
  {
    method: 'GET',
    path: '/stock-reservations/expiring-soon',
    handler: 'stock-reservation.getExpiringSoon',
    config: {
      policies: ['global::is-authenticated'],
    },
  },
  // Cleanup operations
  {
    method: 'DELETE',
    path: '/stock-reservations/cleanup/expired',
    handler: 'stock-reservation.cleanupExpired',
    config: {
      policies: ['global::is-authenticated'],
    },
  },
];

// Create a custom router that extends the core routes
const customRouter = {
  get prefix() {
    return coreRoutes.prefix;
  },
  get routes() {
    const coreRoutesArray = Array.isArray(coreRoutes.routes) ? coreRoutes.routes : [];
    const allRoutes = [...extraRoutes, ...coreRoutesArray];
    return allRoutes;
  },
};

export default customRouter;
