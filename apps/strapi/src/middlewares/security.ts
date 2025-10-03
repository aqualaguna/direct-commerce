// Remove Strapi import as it's not needed
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

export default (config, { strapi }: { strapi: any }) => {
  return async (ctx, next) => {
    // Rate limiting configuration with proper IP detection
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: {
          status: 429,
          name: 'TooManyRequests',
          message: 'Too many requests from this IP, please try again later.',
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Use the proper ipKeyGenerator helper for IPv6 support
      keyGenerator: (req: any) => ipKeyGenerator(req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress),
      // Skip rate limiting for certain conditions
      skip: (req: any) => {
        // Skip rate limiting in test environment
        return process.env.NODE_ENV === 'test';
      },
    });

    // Apply rate limiting
    await new Promise(resolve => {
      limiter(ctx.req, ctx.res, resolve);
    });

    // Enhanced security headers
    ctx.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    });

    await next();
  };
};


