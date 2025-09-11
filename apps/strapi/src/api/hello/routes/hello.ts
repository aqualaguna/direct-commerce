/**
 * hello router
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/hello',
      handler: 'api::hello.hello.find',
      config: {
        auth: false, // Make this endpoint public
      },
    },
  ],
};