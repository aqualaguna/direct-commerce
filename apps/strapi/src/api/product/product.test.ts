import apiConfig from '../../../config/api';
import middlewaresConfig from '../../../config/middlewares';

describe('Product API Configuration', () => {
  it('should have proper API configuration structure', () => {
    // Test that the API configuration is properly structured
    expect(apiConfig.rest).toBeDefined();
    expect(apiConfig.rest.defaultLimit).toBe(25);
    expect(apiConfig.rest.maxLimit).toBe(100);
    expect(apiConfig.rest.withCount).toBe(true);
    expect(apiConfig.rest.prefix).toBe('/api');
    expect(apiConfig.rest.documentation.enabled).toBe(true);
  });

  it('should have proper CORS configuration', () => {
    // Test that the CORS middleware is included in the configuration
    const corsMiddleware = middlewaresConfig.find(
      (m): m is string => typeof m === 'string' && m === 'strapi::cors'
    );

    expect(corsMiddleware).toBeDefined();
    expect(corsMiddleware).toBe('strapi::cors');
  });

  it('should have security middleware configured', () => {
    // Test that the security middleware is included
    const securityMiddleware = middlewaresConfig.find(
      m => m === 'global::security'
    );

    expect(securityMiddleware).toBe('global::security');
  });
});
