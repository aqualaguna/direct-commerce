/**
 * Product search controller
 *
 * Handles search requests and provides advanced product search functionality
 */

// Strapi imports
import { factories } from '@strapi/strapi';

// Interfaces
interface SearchQuery {
  q?: string;
  page?: string | number;
  pageSize?: string | number;
  categoryId?: string | number;
  sortBy?:
    | 'relevance'
    | 'title'
    | 'newest'
    | 'oldest';
  sortOrder?: 'asc' | 'desc';
  includeInactive?: boolean | string;
  inStockOnly?: boolean | string;
  minStock?: string | number;
  [key: string]: any;
}

interface SearchOptions {
  page: number;
  pageSize: number;
  categoryId?: number;
  attributes?: Record<string, any>;
  sortBy: string;
  sortOrder: string;
  includeInactive: boolean;
  inStockOnly?: boolean;
  minStock?: number;
}

interface SearchResponse {
  data: any[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
    search: {
      query: string;
      totalResults: number;
      searchTime: number;
      sortBy: string;
      sortOrder: string;
    };
  };
}

export default factories.createCoreController(
  'api::product.product',
  ({ strapi }) => ({
    /**
     * Advanced product search endpoint
     * GET /api/products/search
     */
    async search(ctx: any): Promise<void> {
      try {
        const query = ctx.query as SearchQuery;
        const {
          q: searchQuery = '',
          page = 1,
          pageSize = 25,
          categoryId,
          sortBy = 'relevance',
          sortOrder = 'desc',
          includeInactive = false,
          inStockOnly = false,
          minStock,
          ...additionalFilters
        } = query;

        // Validate pagination parameters
        const validatedPage = Math.max(1, parseInt(String(page)) || 1);
        const validatedPageSize = Math.min(
          Math.max(1, parseInt(String(pageSize)) || 25),
          100
        );


        // Validate category ID
        let validatedCategoryId: number | undefined;
        if (categoryId) {
          const parsedCategoryId = parseInt(String(categoryId));
          if (isNaN(parsedCategoryId) || parsedCategoryId <= 0) {
            return ctx.badRequest('Invalid category ID');
          }
          validatedCategoryId = parsedCategoryId;
        }

        // Validate sort options
        const validSortOptions = [
          'relevance',
          'title',
          'newest',
          'oldest',
        ];
        if (!validSortOptions.includes(String(sortBy))) {
          return ctx.badRequest('Invalid sort option');
        }

        const validSortOrders = ['asc', 'desc'];
        if (!validSortOrders.includes(String(sortOrder))) {
          return ctx.badRequest('Invalid sort order');
        }

        // Validate additional filter parameters
        const filterService = strapi.service('api::product.filter');
        const filterParams = filterService.validateFilterParams({
          categoryId: validatedCategoryId,
          inStockOnly,
          minStock,
          ...additionalFilters,
        });

        // Build search options
        const searchOptions: SearchOptions = {
          page: validatedPage,
          pageSize: validatedPageSize,
          categoryId: filterParams.categoryId,
          attributes: filterParams.attributes,
          sortBy: String(sortBy),
          sortOrder: String(sortOrder),
          includeInactive:
            includeInactive === 'true' || includeInactive === true,
          inStockOnly: filterParams.inStockOnly,
          minStock: filterParams.minStock,
        };

        // Perform search using the search service
        const searchService = strapi.service('api::product.search');
        const results = await searchService.fullTextSearch(
          searchQuery,
          searchOptions
        );

        // Add search metadata
        const responseData: SearchResponse = {
          ...results,
          meta: {
            ...results.meta,
            search: {
              query: String(searchQuery),
              totalResults: results.meta.pagination.total,
              searchTime: Date.now(), // In a real implementation, you'd measure actual search time
              sortBy: String(sortBy),
              sortOrder: String(sortOrder),
            },
          },
        };

        ctx.send(responseData);
      } catch (error) {
        strapi.log.error('Error in product search controller:', error);
        ctx.internalServerError('Failed to perform product search');
      }
    },

    /**
     * Get search suggestions endpoint
     * GET /api/products/search/suggestions
     */
    async suggestions(ctx: any): Promise<void> {
      try {
        const { q: query = '', limit = 10 } = ctx.query as {
          q?: string;
          limit?: string | number;
        };

        if (!query || String(query).trim().length < 2) {
          return ctx.send({ suggestions: [] });
        }

        const validatedLimit = Math.min(
          Math.max(1, parseInt(String(limit)) || 10),
          20
        );

        const searchService = strapi.service('api::product.search');
        const suggestions: string[] = await searchService.getSearchSuggestions(
          String(query),
          validatedLimit
        );

        ctx.send({ suggestions });
      } catch (error) {
        strapi.log.error('Error getting search suggestions:', error);
        ctx.internalServerError('Failed to get search suggestions');
      }
    },

    /**
     * Get popular search terms endpoint
     * GET /api/products/search/popular
     */
    async popular(ctx: any): Promise<void> {
      try {
        const { limit = 10 } = ctx.query as { limit?: string | number };
        const validatedLimit = Math.min(
          Math.max(1, parseInt(String(limit)) || 10),
          20
        );

        const searchService = strapi.service('api::product.search');
        const popularTerms: string[] =
          await searchService.getPopularSearchTerms(validatedLimit);

        ctx.send({ popularTerms });
      } catch (error) {
        strapi.log.error('Error getting popular search terms:', error);
        ctx.internalServerError('Failed to get popular search terms');
      }
    },

    /**
     * Advanced filter options endpoint
     * GET /api/products/search/filters
     */
    async getFilterOptions(ctx: any): Promise<void> {
      try {
        // Use filter service to get available filter options
        const filterService = strapi.service('api::product.filter');
        const filterOptions = await filterService.getAvailableFilters();

        // Get available sort options
        const sortOptions = [
          { value: 'relevance', label: 'Most Relevant' },
          { value: 'title', label: 'Name: A to Z' },
          { value: 'newest', label: 'Newest First' },
          { value: 'oldest', label: 'Oldest First' },
        ];

        ctx.send({
          ...filterOptions,
          sortOptions,
        });
      } catch (error) {
        strapi.log.error('Error getting filter options:', error);
        ctx.internalServerError('Failed to get filter options');
      }
    },
  })
);
