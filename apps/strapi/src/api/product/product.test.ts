describe('Product API Configuration', () => {
  it('should have proper API configuration structure', () => {
    // Test that the API configuration is properly structured
    const apiConfig = require('../../../config/api.ts').default;
    
    expect(apiConfig.rest).toBeDefined();
    expect(apiConfig.rest.defaultLimit).toBe(25);
    expect(apiConfig.rest.maxLimit).toBe(100);
    expect(apiConfig.rest.withCount).toBe(true);
    expect(apiConfig.rest.prefix).toBe('/api');
    expect(apiConfig.rest.documentation.enabled).toBe(true);
  });

  it('should have proper CORS configuration', () => {
    // Test that the CORS configuration is properly structured
    const middlewaresConfig = require('../../../config/middlewares.ts').default;
    
    const corsMiddleware = middlewaresConfig.find(m => 
      typeof m === 'object' && m.name === 'strapi::cors'
    );
    
    expect(corsMiddleware).toBeDefined();
    expect(corsMiddleware.config.enabled).toBe(true);
    expect(corsMiddleware.config.credentials).toBe(true);
    expect(corsMiddleware.config.methods).toContain('GET');
    expect(corsMiddleware.config.methods).toContain('POST');
    expect(corsMiddleware.config.methods).toContain('PUT');
    expect(corsMiddleware.config.methods).toContain('DELETE');
  });

  it('should have security middleware configured', () => {
    // Test that the security middleware is included
    const middlewaresConfig = require('../../../config/middlewares.ts').default;
    
    const securityMiddleware = middlewaresConfig.find(m => 
      m === 'global::security'
    );
    
    expect(securityMiddleware).toBe('global::security');
  });
});
