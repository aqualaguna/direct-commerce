/**
 * Category controller
 *
 * Handles category management operations with hierarchical structure support
 */

// Third-party imports
import { factories } from '@strapi/strapi';

// Type definitions for Strapi context and responses
interface StrapiContext {
  params: {
    documentId?: string;
    [key: string]: unknown;
  };
  query: {
    filters?: Record<string, unknown>;
    sort?: Record<string, string>;
    page?: string;
    pageSize?: string;
    populate?: Record<string, unknown>;
    maxDepth?: string;
    q?: string;
    limit?: string;
    [key: string]: unknown;
  };
  request: {
    body: {
      data?: Record<string, unknown>;
      productIds?: string[];
      targetCategoryId?: string;
      [key: string]: unknown;
    };
  };
  state: {
    user?: {
      id: number;
      role?: {
        type: string;
      };
    };
  };
  badRequest: (message: string) => void;
  notFound: (message: string) => void;
  throw: (status: number, message: string) => void;
}

interface CategoryData {
  documentId?: string;
  name: string;
  description?: string;
  slug?: string;
  parent?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  children?: CategoryData[];
  products?: ProductData[];
  seo?: Record<string, unknown>;
  breadcrumbs?: CategoryData[];
  [key: string]: unknown;
}

interface ProductData {
  documentId: string;
  name: string;
  price: number;
  category?: string;
  [key: string]: unknown;
}

interface ApiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
    [key: string]: unknown;
  };
}

interface CategoryFilters {
  parent?: string | null;
  name?: unknown;
  category?: string;
  [key: string]: unknown;
}

interface PopulateOptions {
  parent?: boolean;
  children?: boolean;
  seo?: boolean;
  category?: boolean;
  images?: boolean;
  products?: boolean;
  [key: string]: unknown;
}

interface PaginationOptions {
  page: number;
  pageSize: number;
}

interface SortOptions {
  [key: string]: string;
}

export default factories.createCoreController(
  'api::category.category',
  ({ strapi }) => ({
    /**
     * Find categories with hierarchical structure support
     */
    async find(ctx: any) {
      try {
        const { query } = ctx;

        const filters : any = {
          ...((query.filters as object) || {}),
        };
        

        // Apply sorting with validation (default by sortOrder)
        const sort = query.sort || {
          sortOrder: 'asc',
          name: 'asc',
        };

        // Apply pagination with improved validation
        const pagination = {
          page: Math.max(1, parseInt(query.page as string) || 1),
          pageSize: Math.min(
            Math.max(1, parseInt(query.pageSize as string) || 25),
            100
          ),
        };
        
        // Handle pagination query parameters
        if (query.pagination) {
          const paginationQuery = query.pagination as any;
          if (paginationQuery.page) {
            pagination.page = Math.max(1, parseInt(paginationQuery.page) || 1);
          }
          if (paginationQuery.pageSize) {
            pagination.pageSize = Math.min(
              Math.max(1, parseInt(paginationQuery.pageSize) || 25),
              100
            );
          }
        }

        // Populate relations for hierarchy and products
        const populate = {
          parent: true,
          children: true,
          seo: true,
          ...((query.populate as object) || {}),
        };
        // Use Document Service API instead of Entity Service
        const categories = await strapi
          .documents('api::category.category')
          .findMany({
            filters,
            sort,
            pagination,
            populate,
          });

        // Handle pagination metadata properly
        const meta = (categories as any)?.meta || {};
        if (meta.pagination) {
          meta.pagination = {
            page: meta.pagination.page || pagination.page,
            pageSize: meta.pagination.pageSize || pagination.pageSize,
            pageCount: meta.pagination.pageCount || Math.ceil((meta.pagination.total || 0) / pagination.pageSize),
            total: meta.pagination.total || 0,
          };
        } else {
          meta.pagination = {
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: 1,
            total: Array.isArray(categories) ? categories.length : 0,
          };
        }


        return {
          data: Array.isArray(categories) ? categories : [],
          meta,
        };
      } catch (error) {
        strapi.log.error('Error in category find:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Find single category with full hierarchy context
     */
    async findOne(ctx: any) {
      try {
        const { id } = ctx.request.params;
        
        if (!id) {
          return ctx.badRequest('Category docudmentId is required');
        }

        const populate = {
          parent: true,
          children: true,
          seo: true,
        };

        // Use Document Service API with documentId
        const category = await strapi
          .documents('api::category.category')
          .findOne({
            documentId: id,
            populate,
          });

        if (!category) {
          return ctx.notFound('FindOne: Category not found');
        }

        // Generate breadcrumbs for the category
        const breadcrumbs = await strapi
          .service('api::category.category')
          .getBreadcrumbs(category.documentId);

        return {
          data: {
            ...category,
            breadcrumbs,
          },
        };
      } catch (error) {
        strapi.log.error('Error in category findOne:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Create category with hierarchy validation
     */
    async create(ctx: any) {
      try {
        const { data } = ctx.request.body;

        // Validate required fields
        if (!data?.name) {
          return ctx.badRequest('Category name is required');
        }

        // Validate slug uniqueness if provided
        if (data.slug) {
          const existingSlugCategory = await strapi
            .documents('api::category.category')
            .findFirst({
              filters: { slug: data.slug }
            });
          if (existingSlugCategory) {
            return ctx.badRequest('Category slug must be unique');
          }
        }

        // Validate parent category if provided
        if (data.parent) {
          const parentCategory = await strapi
            .documents('api::category.category')
            .findOne({
              documentId: data.parent as string,
            });
          if (!parentCategory) {
            return ctx.badRequest('Parent category not found');
          }

          // Check for circular reference
          const wouldCreateCircle = await strapi
            .service('api::category.category')
            .checkCircularReference(data.parent as string, null);
          if (wouldCreateCircle) {
            return ctx.badRequest(
              'Circular reference detected in category hierarchy'
            );
          }

          // Validate uniqueness within parent category
          const existingCategory = await strapi
            .service('api::category.category')
            .findByNameAndParent(data.name, data.parent as string);
          if (existingCategory) {
            return ctx.badRequest(
              'Category name must be unique within the same parent category'
            );
          }
        } else {
          // Validate uniqueness for root categories
          const existingRootCategory = await strapi
            .service('api::category.category')
            .findByNameAndParent(data.name, null);
          if (existingRootCategory) {
            return ctx.badRequest('Root category name must be unique');
          }
        }

        // Set default sortOrder if not provided
        if (data.sortOrder === undefined || data.sortOrder === null) {
          data.sortOrder = await strapi
            .service('api::category.category')
            .getNextSortOrder(data.parent);
        }

        // Use Document Service API for creation
        const category = await strapi
          .documents('api::category.category')
          .create({
            data: data as any,
            populate: {
              parent: true,
              children: true,
              seo: true,
            },
          });

        return { data: category };
      } catch (error) {
        strapi.log.error('Error creating category:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Update category with hierarchy validation
     */
    async update(ctx: any) {
      try {
        const { id } = ctx.request.params;
        const { data } = ctx.request.body;
        const documentId = id;

        if (!documentId) {
          return ctx.badRequest('Category documentId is required');
        }

        // Use Document Service API to find existing category
        const existingCategory = await strapi
          .documents('api::category.category')
          .findOne({
            documentId,
          });
        if (!existingCategory) {
          return ctx.notFound('Category not found');
        }

        // Validate slug uniqueness if being updated
        if (data?.slug) {
          const existingSlugCategory = await strapi
            .documents('api::category.category')
            .findFirst({
              filters: { slug: data.slug }
            });
          if (existingSlugCategory && existingSlugCategory.documentId !== documentId) {
            return ctx.badRequest('Category slug must be unique');
          }
        }

        // Validate parent category if being updated
        if (data?.parent !== undefined) {
          if (data.parent) {
            const parentCategory = await strapi
              .documents('api::category.category')
              .findOne({
                documentId: data.parent as string,
              });
            if (!parentCategory) {
              return ctx.badRequest('Parent category not found');
            }

            // Check for circular reference
            const wouldCreateCircle = await strapi
              .service('api::category.category')
              .checkCircularReference(data.parent, documentId);
            if (wouldCreateCircle) {
              return ctx.badRequest(
                'Circular reference detected in category hierarchy'
              );
            }
          }

          // Validate name uniqueness if name or parent is being updated
          if (
            data.name ||
            data.parent !== (existingCategory as any).parent?.documentId
          ) {
            const nameToCheck = data.name || existingCategory.name;
            const parentToCheck = data.parent;

            const existingWithSameName = await strapi
              .service('api::category.category')
              .findByNameAndParent(nameToCheck, parentToCheck);
            if (
              existingWithSameName &&
              existingWithSameName.documentId !== documentId
            ) {
              return ctx.badRequest(
                'Category name must be unique within the same parent category'
              );
            }
          }
        }

        // Use Document Service API for update
        const category = await strapi
          .documents('api::category.category')
          .update({
            documentId,
            data,
            populate: {
              parent: true,
              children: true,
              seo: true,
            },
          });

        return { data: category };
      } catch (error) {
        strapi.log.error('Error updating category:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Delete category with children handling
     */
    async delete(ctx: any) {
      try {
        const { id } = ctx.request.params;
        const documentId = id;

        if (!documentId) {
          return ctx.badRequest('Category documentId is required');
        }

        // Use Document Service API to find category with relations
        const category = await strapi
          .documents('api::category.category')
          .findOne({
            documentId,
            populate: {
              children: true,
              products: true,
            },
          });

        if (!category) {
          return ctx.notFound('Category not found');
        }

        // Check if category has children
        const categoryData = category as any;
        if (categoryData.children && categoryData.children.length > 0) {
          return ctx.badRequest(
            'Cannot delete category with child categories. Please reassign or delete child categories first.'
          );
        }

        // Check if category has products
        if (categoryData.products && categoryData.products.length > 0) {
          return ctx.badRequest(
            'Cannot delete category with assigned products. Please reassign products to another category first.'
          );
        }

        // Use Document Service API for deletion
        const deletedCategory = await strapi
          .documents('api::category.category')
          .delete({
            documentId,
          });

        return { data: deletedCategory as any };
      } catch (error) {
        strapi.log.error('Error deleting category:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Get category tree structure
     */
    async getTree(ctx: any) {
      try {
        const tree = await strapi
          .service('api::category.category')
          .getCategoryTree();
        return { data: tree };
      } catch (error) {
        console.error('Error in getTree controller:', error);
        strapi.log.error('Error getting category tree:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Get category breadcrumbs
     */
    async getBreadcrumbs(ctx: any) {
      try {
        const { documentId } = ctx.params;

        if (!documentId) {
          return ctx.badRequest('Category documentId is required');
        }

        const breadcrumbs = await strapi
          .service('api::category.category')
          .getBreadcrumbs(documentId);
        return { data: breadcrumbs };
      } catch (error) {
        strapi.log.error('Error getting category breadcrumbs:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Get products in a category
     */
    async getProducts(ctx: any) {
      try {
        const { documentId } = ctx.params;
        const { query } = ctx;

        if (!documentId) {
          return ctx.badRequest('Category documentId is required');
        }

        // Use Document Service API to verify category exists
        const category = await strapi
          .documents('api::category.category')
          .findOne({
            documentId,
          });
        if (!category) {
          return ctx.notFound('Category not found');
        }

        // Apply pagination with improved validation
        const pagination = {
          page: Math.max(1, parseInt(query.page as string) || 1),
          pageSize: Math.min(
            Math.max(1, parseInt(query.pageSize as string) || 25),
            100
          ),
        };

        const filters = {
          category: { documentId: documentId },
          ...((query.filters as object) || {}),
        };

        const sort = query.sort || { createdAt: 'desc' };

        // Use Document Service API for products
        const products = await strapi
          .documents('api::product.product')
          .findMany({
            filters,
            sort,
            pagination,
            populate: {
              category: {
                fields: ['id', 'name', 'slug'] as any,
              },
              inventoryRecord: true as any,
            },
          });

        return {
          data: Array.isArray(products) ? products : [],
          meta: (products as any)?.meta || (products as any)?.pagination || {},
        };
      } catch (error) {
        strapi.log.error('Error getting category products:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Assign products to category
     */
    async assignProducts(ctx: any): Promise<any> {
      try {
        const { documentId } = ctx.params;
        const { productIds } = ctx.request.body;

        if (!documentId) {
          return ctx.badRequest('Category documentId is required');
        }

        if (!productIds || !Array.isArray(productIds)) {
          return ctx.badRequest('Product IDs array is required');
        }

        if (productIds.length === 0) {
          return ctx.badRequest('Product IDs array cannot be empty');
        }

        // Use Document Service API to verify category exists
        const category = await strapi
          .documents('api::category.category')
          .findOne({
            documentId,
          });
        if (!category) {
          return ctx.notFound('Category not found');
        }

        // Update all specified products to assign them to this category using Document Service API
        const updatePromises = productIds.map(productDocumentId =>
          strapi.documents('api::product.product').update({
            documentId: productDocumentId,
            data: { category: documentId },
          })
        );

        await Promise.all(updatePromises);

        return {
          data: {
            message: 'Products assigned successfully',
            categoryId: documentId,
            productCount: productIds.length,
          },
        };
      } catch (error) {
        strapi.log.error('Error assigning products to category:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Remove products from category
     */
    async removeProducts(ctx: any): Promise<any> {
      try {
        const { documentId } = ctx.params;
        const { productIds } = ctx.request.body;

        if (!documentId) {
          return ctx.badRequest('Category documentId is required');
        }

        if (!productIds || !Array.isArray(productIds)) {
          return ctx.badRequest('Product IDs array is required');
        }

        // Use Document Service API to verify category exists
        const category = await strapi
          .documents('api::category.category')
          .findOne({
            documentId,
          });
        if (!category) {
          return ctx.notFound('Category not found');
        }

        // Update all specified products to remove them from this category using Document Service API
        // Update sequentially to avoid transaction conflicts
        for (const productDocumentId of productIds) {
          try {
            await strapi.documents('api::product.product').update({
              documentId: productDocumentId,
              data: { category: null },
            });
          } catch (error) {
            strapi.log.error(`Error updating product ${productDocumentId}:`, error);
            throw error;
          }
        }

        return {
          data: {
            message: 'Products removed successfully',
            categoryId: documentId,
            productCount: productIds.length,
          },
        };
      } catch (error) {
        strapi.log.error('Error removing products from category:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Move products to another category
     */
    async moveProducts(ctx: any): Promise<any> {
      try {
        const { documentId } = ctx.params;
        const { targetCategoryId, productIds } = ctx.request.body;

        if (!documentId) {
          return ctx.badRequest('Source category documentId is required');
        }

        if (!targetCategoryId) {
          return ctx.badRequest('Target category documentId is required');
        }

        if (!productIds || !Array.isArray(productIds)) {
          return ctx.badRequest('Product IDs array is required');
        }

        // Use Document Service API to verify both categories exist
        const sourceCategory = await strapi
          .documents('api::category.category')
          .findOne({
            documentId,
          });
        if (!sourceCategory) {
          return ctx.notFound('Source category not found');
        }

        const targetCategory = await strapi
          .documents('api::category.category')
          .findOne({
            documentId: targetCategoryId,
          });
        if (!targetCategory) {
          return ctx.badRequest('Target category not found');
        }

        // Update all specified products to move them to the target category using Document Service API
        const updatePromises = productIds.map(productDocumentId =>
          strapi.documents('api::product.product').update({
            documentId: productDocumentId,
            data: { category: targetCategoryId },
          })
        );

        await Promise.all(updatePromises);

        return {
          data: {
            message: 'Products moved successfully',
            sourceCategoryId: documentId,
            targetCategoryId,
            productCount: productIds.length,
          },
        };
      } catch (error) {
        strapi.log.error('Error moving products between categories:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Get category statistics
     */
    async getStats(ctx: any) {
      try {
        const { documentId } = ctx.params;

        if (!documentId) {
          return ctx.badRequest('Category documentId is required');
        }

        // Use Document Service API to verify category exists
        const category = await strapi
          .documents('api::category.category')
          .findOne({
            documentId,
          });
        if (!category) {
          return ctx.notFound('Category not found');
        }

        // Get product counts and statistics
        const stats = await strapi
          .service('api::category.category')
          .getCategoryStatistics(documentId);

        return { data: stats };
      } catch (error) {
        strapi.log.error('Error getting category statistics:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Get navigation menu structure
     */
    async getNavigation(ctx: any) {
      try {
        const { query } = ctx;
        const maxDepth = parseInt(query.maxDepth as string) || 3;

        const navigation = await strapi
          .service('api::category.category')
          .getNavigationMenu(maxDepth);

        return { data: navigation };
      } catch (error) {
        strapi.log.error('Error getting navigation menu:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Get sibling categories
     */
    async getSiblings(ctx: any) {
      try {
        const { documentId } = ctx.params;

        if (!documentId) {
          return ctx.badRequest('Category documentId is required');
        }

        const siblings = await strapi
          .service('api::category.category')
          .getSiblingCategories(documentId);

        return { data: siblings };
      } catch (error) {
        strapi.log.error('Error getting sibling categories:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Search categories
     */
    async search(ctx: any) {
      try {
        const { query } = ctx;
        const searchTerm = query.q as string;
        const limit = parseInt(query.limit as string) || 20;

        if (!searchTerm) {
          return ctx.badRequest('Search term is required');
        }

        const results = await strapi
          .service('api::category.category')
          .searchCategories(searchTerm, limit);

        return { data: results };
      } catch (error) {
        strapi.log.error('Error searching categories:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

  })
);
