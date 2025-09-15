/**
 * Custom auth routes with enhanced rate limiting for testing
 */
export default {
  routes: [
    {
      method: 'POST',
      path: '/auth/local',
      handler: 'auth.callback',
      config: {
        middlewares: process.env.NODE_ENV === 'test' 
          ? ['plugin::users-permissions.testRateLimit']
          : ['plugin::users-permissions.rateLimit'],
      },
    },
    {
      method: 'POST',
      path: '/auth/local/register',
      handler: 'auth.register',
      config: {
        middlewares: process.env.NODE_ENV === 'test' 
          ? ['plugin::users-permissions.testRateLimit']
          : ['plugin::users-permissions.rateLimit'],
      },
    },
    {
      method: 'POST',
      path: '/auth/change-password',
      handler: 'auth.changePassword',
      config: {
        middlewares: process.env.NODE_ENV === 'test' 
          ? ['plugin::users-permissions.testRateLimit']
          : ['plugin::users-permissions.rateLimit'],
      },
    },
    {
      method: 'POST',
      path: '/auth/forgot-password',
      handler: 'auth.forgotPassword',
      config: {
        middlewares: process.env.NODE_ENV === 'test' 
          ? ['plugin::users-permissions.testRateLimit']
          : ['plugin::users-permissions.rateLimit'],
      },
    },
    {
      method: 'POST',
      path: '/auth/reset-password',
      handler: 'auth.resetPassword',
      config: {
        middlewares: process.env.NODE_ENV === 'test' 
          ? ['plugin::users-permissions.testRateLimit']
          : ['plugin::users-permissions.rateLimit'],
      },
    },
  ],
};
