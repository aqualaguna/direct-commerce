/**
 * hello service
 */

export default ({ strapi }: { strapi: any }) => ({
  async getHelloMessage(): Promise<string> {
    return 'Hello World!';
  },
});