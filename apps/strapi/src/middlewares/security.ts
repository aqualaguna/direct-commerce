import { Strapi } from '@strapi/strapi';
import rateLimit from 'express-rate-limit';

export default (config, { strapi }: { strapi: Strapi }) => {
  return async (ctx, next) => {
    // Rate limiting configuration
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
