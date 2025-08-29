/**
 * Product search controller
 * 
 * Handles search requests and provides advanced product search functionality
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::product.product', ({ strapi }) => ({
  /**
   * Advanced product search endpoint
   * GET /api/products/search
   */
  async search(ctx) {
    try {
      const {
        q: searchQuery = '',
        page = 1,
        pageSize = 25,
        categoryId,
        minPrice,
        maxPrice,
        sortBy = 'relevance',
        sortOrder = 'desc',
        includeInactive = false,
        inStockOnly = false,
        minStock,
        ...additionalFilters
      } = ctx.query;

      // Validate pagination parameters
      const validatedPage = Math.max(1, parseInt(String(page)) || 1);
      const validatedPageSize = Math.min(Math.max(1, parseInt(String(pageSize)) || 25), 100);

      // Validate price range
      let priceRange;
      if (minPrice !== undefined || maxPrice !== undefined) {
        const min = minPrice ? parseFloat(String(minPrice)) : undefined;
        const max = maxPrice ? parseFloat(String(maxPrice)) : undefined;

        if ((min !== undefined && isNaN(min)) || (max !== undefined && isNaN(max))) {
          return ctx.badRequest('Invalid price range values');
        }

        if (min !== undefined && max !== undefined && min > max) {
          return ctx.badRequest('Minimum price cannot be greater than maximum price');
        }

        priceRange = { min, max };
      }

      // Validate category ID
      if (categoryId && isNaN(parseInt(String(categoryId)))) {
        return ctx.badRequest('Invalid category ID');
      }

      // Validate sort options
      const validSortOptions = ['relevance', 'price_asc', 'price_desc', 'title', 'newest', 'oldest'];
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
        categoryId,
        minPrice,
        maxPrice,
        inStockOnly,
        minStock,
        ...additionalFilters,
      });

      // Build search options
      const searchOptions = {
        page: validatedPage,
        pageSize: validatedPageSize,
        categoryId: filterParams.categoryId,
        priceRange: filterParams.priceRange,
        attributes: filterParams.attributes,
        sortBy,
        sortOrder,
        includeInactive: includeInactive === 'true',
        inStockOnly: filterParams.inStockOnly,
        minStock: filterParams.minStock,
      };

      // Perform search using the search service
      const searchService = strapi.service('api::product.search');
      const results = await searchService.fullTextSearch(searchQuery, searchOptions);

      // Add search metadata
      const responseData = {
        ...results,
        meta: {
          ...results.meta,
          search: {
            query: searchQuery,
            totalResults: results.meta.pagination.total,
            searchTime: Date.now(), // In a real implementation, you'd measure actual search time
            sortBy,
            sortOrder,
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
  async suggestions(ctx) {
    try {
      const { q: query = '', limit = 10 } = ctx.query;

      if (!query || String(query).trim().length < 2) {
        return ctx.send({ suggestions: [] });
      }

      const validatedLimit = Math.min(Math.max(1, parseInt(String(limit)) || 10), 20);

      const searchService = strapi.service('api::product.search');
      const suggestions = await searchService.getSearchSuggestions(query, validatedLimit);

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
  async popular(ctx) {
    try {
      const { limit = 10 } = ctx.query;
      const validatedLimit = Math.min(Math.max(1, parseInt(String(limit)) || 10), 20);

      const searchService = strapi.service('api::product.search');
      const popularTerms = await searchService.getPopularSearchTerms(validatedLimit);

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
  async getFilterOptions(ctx) {
    try {
      // Use filter service to get available filter options
      const filterService = strapi.service('api::product.filter');
      const filterOptions = await filterService.getAvailableFilters();

      // Get available sort options
      const sortOptions = [
        { value: 'relevance', label: 'Most Relevant' },
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' },
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
}));
