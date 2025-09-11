/**
 * Product search service
 *
 * Provides full-text search functionality across product fields with advanced filtering capabilities
 */

// Strapi imports
import { factories } from '@strapi/strapi';

// Type definitions for search functionality
export interface SearchOptions {
  page?: number;
  pageSize?: number;
  categoryId?: number;
  attributes?: Record<string, any>;
  sortBy?:
    | 'relevance'
    | 'title'
    | 'newest'
    | 'oldest';
  sortOrder?: 'asc' | 'desc';
  inStockOnly?: boolean;
  minStock?: number;
}

export interface SearchResult {
  data: any[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface ProductWithScore {
  documentId: string;
  name?: string;
  brand?: string;
  description?: string;
  sku?: string;
  inventory?: number;
  _relevanceScore?: number;
  [key: string]: any;
}

export default factories.createCoreService(
  'api::product.product',
  ({ strapi }) => ({
    /**
     * Performs full-text search across product fields
     * @param searchQuery - The search term to query
     * @param options - Search options including pagination, filters, and sorting
     * @returns Promise<{ data: Product[], meta: PaginationMeta }>
     */
    async fullTextSearch(
      searchQuery: string,
      options: SearchOptions = {}
    ): Promise<SearchResult> {
      const {
        page = 1,
        pageSize = 25,
        categoryId,
        attributes,
        sortBy = 'relevance',
        sortOrder = 'desc',
        inStockOnly = false,
        minStock,
      } = options;

      try {
        // Base filters for active and active products using new Document Service API
        const baseFilters: any = {
          status: 'active',
        };


        // Full-text search filters
        let searchFilters: any = {};
        if (searchQuery && searchQuery.trim()) {
          const trimmedQuery = searchQuery.trim();

          // Search across multiple fields with OR condition
          searchFilters = {
            $or: [
              { name: { $containsi: trimmedQuery } },
              { brand: { $containsi: trimmedQuery } },
              { description: { $containsi: trimmedQuery } },
              { sku: { $containsi: trimmedQuery } },
            ],
          };
        }

        // Use filter service to apply advanced filtering
        const filterService = strapi.service('api::product.filter');
        const filterParams = {
          categoryId,
          attributes,
          inStockOnly,
          minStock,
        };

        // Build comprehensive filters using the filter service
        let filters = await filterService.buildFilters(
          baseFilters,
          filterParams
        );

        // Combine with search filters
        filters = {
          ...filters,
          ...searchFilters,
        };

        // Determine sorting
        let sort: any = {};
        switch (sortBy) {
          case 'title':
            sort = { name: sortOrder };
            break;
          case 'newest':
            sort = { createdAt: 'desc' };
            break;
          case 'oldest':
            sort = { createdAt: 'asc' };
            break;
          case 'relevance':
          default:
            break;
        }

        // Execute search query using Document Service API
        const results: any = await strapi
          .documents('api::product.product')
          .findMany({
            filters,
            sort,
            pagination: { page, pageSize },
            populate: {
              category: {
                fields: ['id', 'name', 'slug'],
              },
              inventoryRecord: {
                fields: ['quantity', 'lowStockThreshold', 'inStock'],
              },
            } as any,
            fields: [
              'id',
              'name',
              'brand',
              'description',
              'sku',
              'inventory',
              'status',
              'createdAt',
              'updatedAt',
            ] as any,
          });

        // Calculate relevance scores for search results
        if (searchQuery && searchQuery.trim()) {
          const products = results.data || results;
          const scoredResults = this.calculateRelevanceScores(
            products,
            searchQuery.trim()
          );
          return {
            data: scoredResults,
            meta: results.meta || {
              pagination: {
                page,
                pageSize,
                pageCount: Math.ceil(scoredResults.length / pageSize),
                total: scoredResults.length,
              },
            },
          };
        }

        return results;
      } catch (error) {
        strapi.log.error('Error in product search:', error);
        throw new Error('Failed to perform product search');
      }
    },

    /**
     * Calculates relevance scores for search results
     * @param products - Array of products to score
     * @param searchQuery - The search term used
     * @returns Array of products with relevance scores
     */
    calculateRelevanceScores(
      products: any[],
      searchQuery: string
    ): ProductWithScore[] {
      const query = searchQuery.toLowerCase();

      return products
        .map((product): ProductWithScore => {
          let score = 0;

          // Name matches get highest score
          if (product.name?.toLowerCase().includes(query)) {
            score += 10;
            if (product.name.toLowerCase().startsWith(query)) {
              score += 5; // Bonus for name starting with query
            }
          }

          // Brand matches get high score
          if (product.brand?.toLowerCase().includes(query)) {
            score += 8;
            if (product.brand.toLowerCase().startsWith(query)) {
              score += 3; // Bonus for brand starting with query
            }
          }

          // SKU exact match gets high score
          if (product.sku?.toLowerCase() === query) {
            score += 15;
          } else if (product.sku?.toLowerCase().includes(query)) {
            score += 8;
          }

          // Description matches (lower weight due to potential for long text)
          if (product.description?.toLowerCase().includes(query)) {
            score += 3;
          }

          // In-stock products get slight bonus
          if (product.inventory && product.inventory > 0) {
            score += 1;
          }

          return {
            ...product,
            _relevanceScore: score,
          };
        })
        .sort((a, b) => (b._relevanceScore || 0) - (a._relevanceScore || 0));
    },

    /**
     * Get search suggestions based on partial query
     * @param partialQuery - Partial search term
     * @param limit - Maximum number of suggestions
     * @returns Promise<string[]>
     */
    async getSearchSuggestions(
      partialQuery: string,
      limit: number = 10
    ): Promise<string[]> {
      if (!partialQuery || partialQuery.trim().length < 2) {
        return [];
      }

      try {
        const query = partialQuery.trim();

        // Get product names and brands that start with or contain the query using Document Service API
        const products: any = await strapi
          .documents('api::product.product')
          .findMany({
            filters: {
              status: 'active', 
              $or: [
                { name: { $containsi: query } },
                { brand: { $containsi: query } },
                { sku: { $containsi: query } },
              ],
            },
            fields: ['name', 'brand', 'sku'],
            pagination: { page: 1, pageSize: limit * 2 },
          } as any);

        // Extract unique suggestions
        const suggestions = new Set<string>();

        const productsArray = products.data || products || [];
        productsArray.forEach(product => {
          // Add name if it matches
          if (product.name && product.name.toLowerCase().includes(query.toLowerCase())) {
            suggestions.add(product.name);
          }

          // Add brand if it matches and is different from name
          if (
            product.brand &&
            product.brand.toLowerCase().includes(query.toLowerCase()) &&
            product.brand !== product.name
          ) {
            suggestions.add(product.brand);
          }

          // Add SKU if it matches and is different from name and brand
          if (
            product.sku &&
            product.sku.toLowerCase().includes(query.toLowerCase()) &&
            product.sku !== product.name &&
            product.sku !== product.brand
          ) {
            suggestions.add(product.sku);
          }
        });

        return Array.from(suggestions).slice(0, limit);
      } catch (error) {
        strapi.log.error('Error getting search suggestions:', error);
        return [];
      }
    },

    /**
     * Get popular search terms (placeholder for analytics integration)
     * @param limit - Maximum number of terms to return
     * @returns Promise<string[]>
     */
    async getPopularSearchTerms(limit: number = 10): Promise<string[]> {
      // This would typically integrate with analytics system
      // For now, return common product-related terms
      const popularTerms: string[] = [
        'electronics',
        'clothing',
        'books',
        'home',
        'sports',
        'beauty',
        'tools',
        'toys',
        'automotive',
        'health',
      ];

      return popularTerms.slice(0, limit);
    },
  })
);
