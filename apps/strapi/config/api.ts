export default {
  rest: {
    defaultLimit: 25,
    maxLimit: 100,
    withCount: true,
    prefix: '/api',
    defaultSortBy: 'id',
    defaultSortOrder: 'ASC',
    // Configure response format
    responseFormat: {
      data: true,
      meta: true,
      error: {
        status: true,
        name: true,
        message: true,
        details: true,
      },
    },
    // Configure error handling
    errorHandler: {
      includeStack: process.env.NODE_ENV === 'development',
    },
    // Configure API documentation
    documentation: {
      enabled: true,
      path: '/documentation',
      info: {
        title: 'E-commerce API',
        description: 'REST API for e-commerce platform',
        version: '1.0.0',
        contact: {
          name: 'API Support',
          email: 'support@ecommerce.com',
        },
      },
      servers: [
        {
          url: process.env.API_URL || 'http://localhost:1337',
          description: 'Development server',
        },
      ],
    },
  },
};
