/**
 * Product filter service
 *
 * Provides advanced filtering capabilities for products including category, price, and attribute filtering
 */

// Strapi imports
import { factories } from '@strapi/strapi';

// Type definitions
export interface FilterParams {
  categoryId?: number;
  priceRange?: {
    min?: number;
    max?: number;
  };
  attributes?: Record<string, any>;
  inStockOnly?: boolean;
  minStock?: number;
}

export interface Category {
  documentId: string;
  id?: string | number;
  name: string;
  slug: string;
  parent?: Category | null;
  children?: Category[];
}

export interface FilterOptions {
  categories: Category[];
  priceRange: {
    min: number;
    max: number;
  };
  inventoryOptions: Array<{
    value: string;
    label: string;
  }>;
}

export default factories.createCoreService(
  'api::product.product',
  ({ strapi }) => ({
    /**
     * Applies category-based filtering to product queries
     * @param filters - Existing filters object
     * @param categoryId - Category ID to filter by
     * @param includeSubcategories - Whether to include subcategories in the filter
     * @returns Updated filters object
     */
    async applyCategoryFilter(
      filters: any,
      categoryId?: number,
      includeSubcategories: boolean = true
    ): Promise<any> {
      if (!categoryId) {
        return filters;
      }

      try {
        if (includeSubcategories) {
          // Get all subcategories
          const subcategories = await this.getSubcategories(categoryId);
          const categoryDocumentIds = [
            String(categoryId),
            ...subcategories.map(cat => String(cat.documentId || cat.id)),
          ];

          return {
            ...filters,
            category: {
              documentId: { $in: categoryDocumentIds },
            },
          };
        }
        return {
          ...filters,
          category: {
            documentId: String(categoryId),
          },
        };
      } catch (error) {
        strapi.log.error('Error applying category filter:', error);
        return filters;
      }
    },

    /**
     * Gets all subcategories for a given category (recursive)
     * @param categoryId - Parent category ID
     * @returns Array of subcategory objects
     */
    async getSubcategories(categoryId: number): Promise<Category[]> {
      try {
        const directChildren: any = await strapi
          .documents('api::category.category')
          .findMany({
            filters: {
              parent: { documentId: String(categoryId) },
              publishedAt: { $notNull: true },
              isActive: true,
            },
            fields: ['documentId', 'name', 'slug'],
          } as any);

        let allSubcategories: Category[] = Array.isArray(directChildren)
          ? directChildren
          : directChildren.data || [];

        // Recursively get subcategories
        for (const child of allSubcategories) {
          // Convert documentId to number for recursive call (maintaining backward compatibility)
          const childIdValue = child.documentId || child.id;
          const childId = parseInt(String(childIdValue));
          if (!isNaN(childId)) {
            const grandChildren = await this.getSubcategories(childId);
            allSubcategories = allSubcategories.concat(grandChildren);
          }
        }

        return allSubcategories;
      } catch (error) {
        strapi.log.error('Error getting subcategories:', error);
        return [];
      }
    },

    /**
     * Applies price range filtering to product queries
     * @param filters - Existing filters object
     * @param priceRange - Price range object with min and/or max values
     * @returns Updated filters object
     */
    applyPriceFilter(
      filters: any,
      priceRange?: { min?: number; max?: number }
    ): any {
      if (!priceRange) {
        return filters;
      }

      const { min, max } = priceRange;
      let priceFilter: any = {};

      if (min !== undefined && max !== undefined) {
        priceFilter = { $gte: min, $lte: max };
      } else if (min !== undefined) {
        priceFilter = { $gte: min };
      } else if (max !== undefined) {
        priceFilter = { $lte: max };
      }

      if (Object.keys(priceFilter).length > 0) {
        return {
          ...filters,
          price: priceFilter,
        };
      }

      return filters;
    },

    /**
     * Applies attribute-based filtering to product queries
     * @param filters - Existing filters object
     * @param attributes - Attribute filters object
     * @returns Updated filters object
     */
    applyAttributeFilters(filters: any, attributes?: Record<string, any>): any {
      if (!attributes || Object.keys(attributes).length === 0) {
        return filters;
      }

      const updatedFilters = { ...filters };

      // Apply each attribute filter
      Object.entries(attributes).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Handle different attribute types
          if (Array.isArray(value)) {
            // Multiple values (e.g., colors, sizes)
            updatedFilters[key] = { $in: value };
          } else if (typeof value === 'string') {
            // String values (case-insensitive search)
            updatedFilters[key] = { $containsi: value };
          } else if (typeof value === 'boolean') {
            // Boolean values
            updatedFilters[key] = value;
          } else {
            // Exact match for other types
            updatedFilters[key] = value;
          }
        }
      });

      return updatedFilters;
    },

    /**
     * Applies inventory-based filtering to product queries
     * @param filters - Existing filters object
     * @param inStockOnly - Whether to show only in-stock products
     * @param minStock - Minimum stock quantity
     * @returns Updated filters object
     */
    applyInventoryFilter(
      filters: any,
      inStockOnly: boolean = false,
      minStock?: number
    ): any {
      const updatedFilters = { ...filters };

      if (inStockOnly) {
        updatedFilters.inventory = { $gt: 0 };
      }

      if (minStock !== undefined && minStock > 0) {
        updatedFilters.inventory = {
          ...updatedFilters.inventory,
          $gte: minStock,
        };
      }

      return updatedFilters;
    },

    /**
     * Validates and sanitizes filter parameters
     * @param filterParams - Raw filter parameters from request
     * @returns Sanitized filter parameters
     */
    validateFilterParams(filterParams: any): FilterParams {
      const sanitized: any = {};

      // Validate category ID
      if (filterParams.categoryId) {
        const categoryId = parseInt(String(filterParams.categoryId));
        if (!isNaN(categoryId) && categoryId > 0) {
          sanitized.categoryId = categoryId;
        }
      }

      // Validate price range
      if (
        filterParams.minPrice !== undefined ||
        filterParams.maxPrice !== undefined
      ) {
        const priceRange: any = {};

        if (filterParams.minPrice !== undefined) {
          const min = parseFloat(String(filterParams.minPrice));
          if (!isNaN(min) && min >= 0) {
            priceRange.min = min;
          }
        }

        if (filterParams.maxPrice !== undefined) {
          const max = parseFloat(String(filterParams.maxPrice));
          if (!isNaN(max) && max >= 0) {
            priceRange.max = max;
          }
        }

        // Ensure min <= max
        if (priceRange.min !== undefined && priceRange.max !== undefined) {
          if (priceRange.min > priceRange.max) {
            throw new Error(
              'Minimum price cannot be greater than maximum price'
            );
          }
        }

        if (Object.keys(priceRange).length > 0) {
          sanitized.priceRange = priceRange;
        }
      }

      // Validate inventory filters
      if (filterParams.inStockOnly !== undefined) {
        sanitized.inStockOnly =
          filterParams.inStockOnly === 'true' ||
          filterParams.inStockOnly === true;
      }

      if (filterParams.minStock !== undefined) {
        const minStock = parseInt(String(filterParams.minStock));
        if (!isNaN(minStock) && minStock >= 0) {
          sanitized.minStock = minStock;
        }
      }

      // Validate custom attributes (extensible for future attributes)
      const customAttributes: any = {};
      const knownSystemFields = [
        'categoryId',
        'minPrice',
        'maxPrice',
        'inStockOnly',
        'minStock',
        'q',
        'page',
        'pageSize',
        'sortBy',
        'sortOrder',
        'includeInactive',
      ];

      Object.entries(filterParams).forEach(([key, value]) => {
        if (
          !knownSystemFields.includes(key) &&
          value !== undefined &&
          value !== null &&
          value !== ''
        ) {
          customAttributes[key] = value;
        }
      });

      if (Object.keys(customAttributes).length > 0) {
        sanitized.attributes = customAttributes;
      }

      return sanitized;
    },

    /**
     * Builds complete filter object for product queries
     * @param baseFilters - Base filters (e.g., published, active)
     * @param filterParams - Validated filter parameters
     * @returns Complete filter object
     */
    async buildFilters(
      baseFilters: any,
      filterParams: FilterParams
    ): Promise<any> {
      let filters = { ...baseFilters };

      // Apply category filtering
      if (filterParams.categoryId) {
        filters = await this.applyCategoryFilter(
          filters,
          filterParams.categoryId,
          true
        );
      }

      // Apply price filtering
      if (filterParams.priceRange) {
        filters = this.applyPriceFilter(filters, filterParams.priceRange);
      }

      // Apply attribute filtering
      if (filterParams.attributes) {
        filters = this.applyAttributeFilters(filters, filterParams.attributes);
      }

      // Apply inventory filtering
      if (filterParams.inStockOnly || filterParams.minStock !== undefined) {
        filters = this.applyInventoryFilter(
          filters,
          filterParams.inStockOnly,
          filterParams.minStock
        );
      }

      return filters;
    },

    /**
     * Gets available filter options for the frontend
     * @returns Object containing available categories, price ranges, and attributes
     */
    async getAvailableFilters(): Promise<FilterOptions> {
      try {
        // Get all active categories using Document Service API
        const categories: any = await strapi
          .documents('api::category.category')
          .findMany({
            filters: {
              publishedAt: { $notNull: true },
              isActive: true,
            },
            fields: ['documentId', 'name', 'slug'],
            populate: {
              parent: {
                fields: ['documentId', 'name', 'slug'],
              },
            },
            sort: { name: 'asc' },
            pagination: { page: 1, pageSize: 100 },
          } as any);

        // Get price range from existing products
        const priceStats = await strapi.db
          .query('api::product.product')
          .findMany({
            select: ['price'],
            where: {
              status: 'published', // Use status instead of publishedAt
              isActive: true,
            },
            orderBy: { price: 'asc' },
          });

        let priceRange = { min: 0, max: 1000 };
        if (priceStats.length > 0) {
          const prices = priceStats.map(p => parseFloat(p.price));
          priceRange = {
            min: Math.min(...prices),
            max: Math.max(...prices),
          };
        }

        // Build hierarchical category structure
        const categoryData = Array.isArray(categories)
          ? categories
          : categories.data || [];
        const hierarchicalCategories =
          this.buildCategoryHierarchy(categoryData);

        return {
          categories: hierarchicalCategories,
          priceRange,
          inventoryOptions: [
            { value: 'all', label: 'All Products' },
            { value: 'in_stock', label: 'In Stock Only' },
            { value: 'low_stock', label: 'Low Stock' },
          ],
        };
      } catch (error) {
        strapi.log.error('Error getting available filters:', error);
        throw new Error('Failed to get available filters');
      }
    },

    /**
     * Builds hierarchical category structure from flat category array
     * @param categories - Flat array of category objects
     * @returns Hierarchical category structure
     */
    buildCategoryHierarchy(categories: any[]): Category[] {
      const categoryMap = new Map();
      const rootCategories: any[] = [];

      // Create a map of all categories
      categories.forEach(category => {
        const categoryId = String(category.documentId || category.id);
        categoryMap.set(categoryId, { ...category, children: [] });
      });

      // Build the hierarchy
      categories.forEach(category => {
        const categoryId = String(category.documentId || category.id);
        const categoryNode = categoryMap.get(categoryId);

        if (category.parent) {
          const parentId = String(
            category.parent.documentId || category.parent.id || category.parent
          );
          const parentNode = categoryMap.get(parentId);
          if (parentNode) {
            parentNode.children.push(categoryNode);
          } else {
            // Parent not found, treat as root
            rootCategories.push(categoryNode);
          }
        } else {
          // Root category
          rootCategories.push(categoryNode);
        }
      });

      return rootCategories;
    },
  })
);
