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
  priceRange?: {
    min?: number;
    max?: number;
  };
  attributes?: Record<string, any>;
  sortBy?:
    | 'relevance'
    | 'price_asc'
    | 'price_desc'
    | 'title'
    | 'newest'
    | 'oldest';
  sortOrder?: 'asc' | 'desc';
  includeInactive?: boolean;
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
  title?: string;
  description?: string;
  shortDescription?: string;
  sku?: string;
  price: number;
  featured?: boolean;
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
        priceRange,
        attributes,
        sortBy = 'relevance',
        sortOrder = 'desc',
        includeInactive = false,
        inStockOnly = false,
        minStock,
      } = options;

      try {
        // Base filters for published and active products using new Document Service API
        const baseFilters: any = {
          publishedAt: { $notNull: true }, // Keep using publishedAt for compatibility
        };

        if (!includeInactive) {
          baseFilters.isActive = true;
        }

        // Full-text search filters
        let searchFilters: any = {};
        if (searchQuery && searchQuery.trim()) {
          const trimmedQuery = searchQuery.trim();

          // Search across multiple fields with OR condition
          searchFilters = {
            $or: [
              { title: { $containsi: trimmedQuery } },
              { description: { $containsi: trimmedQuery } },
              { shortDescription: { $containsi: trimmedQuery } },
              { sku: { $containsi: trimmedQuery } },
            ],
          };
        }

        // Use filter service to apply advanced filtering
        const filterService = strapi.service('api::product.filter');
        const filterParams = {
          categoryId,
          priceRange,
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
          case 'price_asc':
            sort = { price: 'asc' };
            break;
          case 'price_desc':
            sort = { price: 'desc' };
            break;
          case 'title':
            sort = { title: sortOrder };
            break;
          case 'newest':
            sort = { createdAt: 'desc' };
            break;
          case 'oldest':
            sort = { createdAt: 'asc' };
            break;
          case 'relevance':
          default:
            // For relevance, we'll use a combination of factors
            // Featured products first, then by created date
            sort = { featured: 'desc', createdAt: 'desc' };
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
              images: {
                fields: ['url', 'width', 'height', 'formats'],
              },
              category: {
                fields: ['id', 'name', 'slug'],
              },
              inventoryRecord: {
                fields: ['quantity', 'lowStockThreshold', 'inStock'],
              },
            } as any,
            fields: [
              'id',
              'title',
              'slug',
              'description',
              'shortDescription',
              'price',
              'comparePrice',
              'sku',
              'inventory',
              'isActive',
              'featured',
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

          // Title matches get highest score
          if (product.title?.toLowerCase().includes(query)) {
            score += 10;
            if (product.title.toLowerCase().startsWith(query)) {
              score += 5; // Bonus for title starting with query
            }
          }

          // SKU exact match gets high score
          if (product.sku?.toLowerCase() === query) {
            score += 15;
          } else if (product.sku?.toLowerCase().includes(query)) {
            score += 8;
          }

          // Short description matches
          if (product.shortDescription?.toLowerCase().includes(query)) {
            score += 5;
          }

          // Description matches (lower weight due to potential for long text)
          if (product.description?.toLowerCase().includes(query)) {
            score += 3;
          }

          // Featured products get bonus score
          if (product.featured) {
            score += 2;
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

        // Get product titles that start with or contain the query using Document Service API
        const products: any = await strapi
          .documents('api::product.product')
          .findMany({
            filters: {
              publishedAt: { $notNull: true }, // Keep using publishedAt for compatibility
              isActive: true,
              $or: [
                { title: { $containsi: query } },
                { sku: { $containsi: query } },
              ],
            },
            fields: ['title', 'sku'],
            pagination: { page: 1, pageSize: limit * 2 },
          } as any);

        // Extract unique suggestions
        const suggestions = new Set<string>();

        const productsArray = products.data || products || [];
        productsArray.forEach(product => {
          // Add title if it matches
          if (product.title.toLowerCase().includes(query.toLowerCase())) {
            suggestions.add(product.title);
          }

          // Add SKU if it matches and is different from title
          if (
            product.sku.toLowerCase().includes(query.toLowerCase()) &&
            product.sku !== product.title
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
