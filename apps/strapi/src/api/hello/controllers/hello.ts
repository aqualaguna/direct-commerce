/**
 * hello controller
 */

export default ({ strapi }: { strapi: any }) => ({
  async find(ctx: any) {
    try {
      // Return a simple hello world response
      ctx.send('Hello World!');
    } catch (error) {
      strapi.log.error('Error in hello controller:', error);
      ctx.throw(500, 'Internal server error');
    }
  },
});