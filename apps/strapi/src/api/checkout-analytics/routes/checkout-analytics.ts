/**
 * Checkout Analytics Routes
 * API routes for checkout analytics and reporting
 */

export default {
  routes: [
    // Activity data endpoint
    {
      method: 'GET',
      path: '/checkout-analytics/activity',
      handler: 'checkout-analytics.getActivity',
      config: {
        policies: ['global::is-authenticated'],
        auth: {
          scope: ['checkout-analytics.read']
        },
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 100 // limit each IP to 100 requests per windowMs
        }
      }
    },

    // Funnel analytics endpoint
    {
      method: 'GET',
      path: '/checkout-analytics/funnel',
      handler: 'checkout-analytics.getFunnel',
      config: {
        policies: ['global::is-authenticated'],
        auth: {
          scope: ['checkout-analytics.read']
        },
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 50 // limit each IP to 50 requests per windowMs
        }
      }
    },

    // Abandonment analysis endpoint
    {
      method: 'GET',
      path: '/checkout-analytics/abandonment',
      handler: 'checkout-analytics.getAbandonment',
      config: {
        policies: ['global::is-authenticated'],
        auth: {
          scope: ['checkout-analytics.read']
        },
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 50 // limit each IP to 50 requests per windowMs
        }
      }
    },

    // Real-time metrics endpoint
    {
      method: 'GET',
      path: '/checkout-analytics/realtime',
      handler: 'checkout-analytics.getRealTimeMetrics',
      config: {
        policies: ['global::is-authenticated'],
        auth: {
          scope: ['checkout-analytics.read']
        },
        rateLimit: {
          windowMs: 1 * 60 * 1000, // 1 minute
          max: 30 // limit each IP to 30 requests per windowMs
        }
      }
    },

    // Data export endpoint
    {
      method: 'GET',
      path: '/checkout-analytics/export',
      handler: 'checkout-analytics.exportData',
      config: {
        policies: ['global::is-admin'],
        auth: {
          scope: ['checkout-analytics.export']
        },
        rateLimit: {
          windowMs: 60 * 60 * 1000, // 1 hour
          max: 10 // limit each IP to 10 exports per hour
        }
      }
    }
  ]
};
