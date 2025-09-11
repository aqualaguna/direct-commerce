/**
 * Product search routes
 *
 * Defines routes for product search functionality
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/products/search',
      handler: 'search.search',
      config: {
        policies: ['is-public'],
        middlewares: [],
        description: 'Advanced product search with filtering and sorting',
        tags: ['Product', 'Search'],
        responses: {
          200: {
            description: 'Search results with pagination',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Product',
                      },
                    },
                    meta: {
                      type: 'object',
                      properties: {
                        pagination: {
                          $ref: '#/components/schemas/Pagination',
                        },
                        search: {
                          type: 'object',
                          properties: {
                            query: { type: 'string' },
                            totalResults: { type: 'integer' },
                            searchTime: { type: 'integer' },
                            sortBy: { type: 'string' },
                            sortOrder: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Bad request - invalid parameters',
          },
          500: {
            description: 'Internal server error',
          },
        },
      },
    },
    {
      method: 'GET',
      path: '/products/search/suggestions',
      handler: 'search.suggestions',
      config: {
        policies: ['is-public'],
        middlewares: [],
        description: 'Get search suggestions for autocomplete',
        tags: ['Product', 'Search'],
        responses: {
          200: {
            description: 'List of search suggestions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    suggestions: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
          500: {
            description: 'Internal server error',
          },
        },
      },
    },
    {
      method: 'GET',
      path: '/products/search/popular',
      handler: 'search.popular',
      config: {
        policies: ['is-public'],
        middlewares: [],
        description: 'Get popular search terms',
        tags: ['Product', 'Search'],
        responses: {
          200: {
            description: 'List of popular search terms',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    popularTerms: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
          500: {
            description: 'Internal server error',
          },
        },
      },
    },
    {
      method: 'GET',
      path: '/products/search/filters',
      handler: 'search.getFilterOptions',
      config: {
        policies: ['is-public'],
        middlewares: [],
        description: 'Get available filter options for product search',
        tags: ['Product', 'Search'],
        responses: {
          200: {
            description: 'Available filter options',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    categories: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' },
                          slug: { type: 'string' },
                        },
                      },
                    },
                    sortOptions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          value: { type: 'string' },
                          label: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          500: {
            description: 'Internal server error',
          },
        },
      },
    },
  ],
};
