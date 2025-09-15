/**
 * Custom rate limit middleware for testing environment
 * Provides more lenient rate limiting for integration tests
 */
import rateLimit from 'express-rate-limit';

export default (config, { strapi }: { strapi: any }) => {
  return async (ctx, next) => {
    // Only apply custom rate limiting in test environment
    if (process.env.NODE_ENV !== 'test') {
      return await next();
    }

    // Create a more lenient rate limiter for testing
    const testLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute window
      max: 1000, // Allow 1000 requests per minute in test environment
      message: {
        error: {
          status: 429,
          name: 'TooManyRequests',
          message: 'Rate limit exceeded in test environment',
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Skip rate limiting for localhost in test environment
      skip: (req) => {
        const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
        return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
      },
    });

    // Apply the test rate limiter
    await new Promise((resolve, reject) => {
      testLimiter(ctx.req, ctx.res, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(undefined);
        }
      });
    });

    await next();
  };
};
