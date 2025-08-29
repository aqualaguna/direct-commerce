/**
 * category controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::category.category',
  ({ strapi }) => ({
    /**
     * Find categories with hierarchical structure support
     */
    async find(ctx) {
      try {
        const { query } = ctx;

        // Apply filters with improved error handling
        const filters: any = {
          ...((query.filters as object) || {}),
          publishedAt: { $notNull: true },
        };

        // Apply sorting with validation (default by sortOrder)
        const sort = query.sort || { sortOrder: 'asc', name: 'asc' };

        // Apply pagination with improved validation
        const pagination = {
          page: Math.max(1, parseInt(query.page as string) || 1),
          pageSize: Math.min(
            Math.max(1, parseInt(query.pageSize as string) || 25),
            100
          ),
        };

        // Populate relations for hierarchy and products
        const populate: any = {
          parent: true,
          children: true,
          seo: true,
          ...((query.populate as object) || {}),
        };

        const { results, pagination: paginationInfo } =
          await strapi.entityService.findPage('api::category.category', {
            filters,
            sort,
            pagination,
            populate,
          });

        return { data: results, meta: { pagination: paginationInfo } };
      } catch (error) {
        strapi.log.error('Error in category find:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Find single category with full hierarchy context
     */
    async findOne(ctx) {
      try {
        const { id } = ctx.params;

        if (!id) {
          return ctx.badRequest('Category ID is required');
        }

        const populate: any = {
          parent: true,
          children: true,
          seo: true,
        };

        const category = await strapi.entityService.findOne(
          'api::category.category',
          id,
          {
            populate,
          }
        );

        if (!category) {
          return ctx.notFound('Category not found');
        }

        // Generate breadcrumbs for the category
        const breadcrumbs = await strapi
          .service('api::category.category')
          .getBreadcrumbs(category.id);

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
    async create(ctx) {
      try {
        const { data } = ctx.request.body;

        // Validate required fields
        if (!data.name) {
          return ctx.badRequest('Category name is required');
        }

        // Validate parent category if provided
        if (data.parent) {
          const parentCategory = await strapi.entityService.findOne(
            'api::category.category',
            data.parent
          );
          if (!parentCategory) {
            return ctx.badRequest('Parent category not found');
          }

          // Check for circular reference
          const wouldCreateCircle = await strapi
            .service('api::category.category')
            .checkCircularReference(data.parent, null);
          if (wouldCreateCircle) {
            return ctx.badRequest(
              'Circular reference detected in category hierarchy'
            );
          }

          // Validate uniqueness within parent category
          const existingCategory = await strapi
            .service('api::category.category')
            .findByNameAndParent(data.name, data.parent);
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

        const category = await strapi.entityService.create(
          'api::category.category',
          {
            data,
            populate: {
              parent: true,
              children: true,
              seo: true,
            },
          }
        );

        return { data: category };
      } catch (error) {
        strapi.log.error('Error creating category:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Update category with hierarchy validation
     */
    async update(ctx) {
      try {
        const { id } = ctx.params;
        const { data } = ctx.request.body;

        if (!id) {
          return ctx.badRequest('Category ID is required');
        }

        const existingCategory = await strapi.entityService.findOne(
          'api::category.category',
          id
        );
        if (!existingCategory) {
          return ctx.notFound('Category not found');
        }

        // Validate parent category if being updated
        if (data.parent !== undefined) {
          if (data.parent) {
            const parentCategory = await strapi.entityService.findOne(
              'api::category.category',
              data.parent
            );
            if (!parentCategory) {
              return ctx.badRequest('Parent category not found');
            }

            // Check for circular reference
            const wouldCreateCircle = await strapi
              .service('api::category.category')
              .checkCircularReference(data.parent, id);
            if (wouldCreateCircle) {
              return ctx.badRequest(
                'Circular reference detected in category hierarchy'
              );
            }
          }

          // Validate name uniqueness if name or parent is being updated
          if (
            data.name ||
            data.parent !== (existingCategory as any).parent?.id
          ) {
            const nameToCheck = data.name || existingCategory.name;
            const parentToCheck = data.parent;

            const existingWithSameName = await strapi
              .service('api::category.category')
              .findByNameAndParent(nameToCheck, parentToCheck);
            if (
              existingWithSameName &&
              existingWithSameName.id !== parseInt(id)
            ) {
              return ctx.badRequest(
                'Category name must be unique within the same parent category'
              );
            }
          }
        }

        const category = await strapi.entityService.update(
          'api::category.category',
          id,
          {
            data,
            populate: {
              parent: true,
              children: true,
              seo: true,
            },
          }
        );

        return { data: category };
      } catch (error) {
        strapi.log.error('Error updating category:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Delete category with children handling
     */
    async delete(ctx) {
      try {
        const { id } = ctx.params;

        if (!id) {
          return ctx.badRequest('Category ID is required');
        }

        const category = await strapi.entityService.findOne(
          'api::category.category',
          id,
          {
            populate: {
              children: true,
              products: true,
            },
          }
        );

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

        const deletedCategory = await strapi.entityService.delete(
          'api::category.category',
          id
        );

        return { data: deletedCategory };
      } catch (error) {
        strapi.log.error('Error deleting category:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Get category tree structure
     */
    async getTree(ctx) {
      try {
        const tree = await strapi
          .service('api::category.category')
          .getCategoryTree();
        return { data: tree };
      } catch (error) {
        strapi.log.error('Error getting category tree:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Get category breadcrumbs
     */
    async getBreadcrumbs(ctx) {
      try {
        const { id } = ctx.params;

        if (!id) {
          return ctx.badRequest('Category ID is required');
        }

        const breadcrumbs = await strapi
          .service('api::category.category')
          .getBreadcrumbs(id);
        return { data: breadcrumbs };
      } catch (error) {
        strapi.log.error('Error getting category breadcrumbs:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Get products in a category
     */
    async getProducts(ctx) {
      try {
        const { id } = ctx.params;
        const { query } = ctx;

        if (!id) {
          return ctx.badRequest('Category ID is required');
        }

        const category = await strapi.entityService.findOne(
          'api::category.category',
          id
        );
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

        const filters: any = {
          category: id,
          publishedAt: { $notNull: true },
          ...((query.filters as object) || {}),
        };

        const sort = query.sort || { createdAt: 'desc' };

        const { results, pagination: paginationInfo } =
          await strapi.entityService.findPage('api::product.product', {
            filters,
            sort,
            pagination,
            populate: {
              category: true,
              images: true,
              seo: true,
            },
          });

        return { data: results, meta: { pagination: paginationInfo } };
      } catch (error) {
        strapi.log.error('Error getting category products:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Assign products to category
     */
    async assignProducts(ctx) {
      try {
        const { id } = ctx.params;
        const { productIds } = ctx.request.body;

        if (!id) {
          return ctx.badRequest('Category ID is required');
        }

        if (!productIds || !Array.isArray(productIds)) {
          return ctx.badRequest('Product IDs array is required');
        }

        const category = await strapi.entityService.findOne(
          'api::category.category',
          id
        );
        if (!category) {
          return ctx.notFound('Category not found');
        }

        // Update all specified products to assign them to this category
        const updatePromises = productIds.map(productId =>
          strapi.entityService.update('api::product.product', productId, {
            data: { category: id },
          })
        );

        await Promise.all(updatePromises);

        return {
          data: {
            message: 'Products assigned successfully',
            categoryId: id,
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
    async removeProducts(ctx) {
      try {
        const { id } = ctx.params;
        const { productIds } = ctx.request.body;

        if (!id) {
          return ctx.badRequest('Category ID is required');
        }

        if (!productIds || !Array.isArray(productIds)) {
          return ctx.badRequest('Product IDs array is required');
        }

        const category = await strapi.entityService.findOne(
          'api::category.category',
          id
        );
        if (!category) {
          return ctx.notFound('Category not found');
        }

        // Update all specified products to remove them from this category
        const updatePromises = productIds.map(productId =>
          strapi.entityService.update('api::product.product', productId, {
            data: { category: null },
          })
        );

        await Promise.all(updatePromises);

        return {
          data: {
            message: 'Products removed successfully',
            categoryId: id,
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
    async moveProducts(ctx) {
      try {
        const { id } = ctx.params;
        const { targetCategoryId, productIds } = ctx.request.body;

        if (!id) {
          return ctx.badRequest('Source category ID is required');
        }

        if (!targetCategoryId) {
          return ctx.badRequest('Target category ID is required');
        }

        if (!productIds || !Array.isArray(productIds)) {
          return ctx.badRequest('Product IDs array is required');
        }

        const sourceCategory = await strapi.entityService.findOne(
          'api::category.category',
          id
        );
        if (!sourceCategory) {
          return ctx.notFound('Source category not found');
        }

        const targetCategory = await strapi.entityService.findOne(
          'api::category.category',
          targetCategoryId
        );
        if (!targetCategory) {
          return ctx.badRequest('Target category not found');
        }

        // Update all specified products to move them to the target category
        const updatePromises = productIds.map(productId =>
          strapi.entityService.update('api::product.product', productId, {
            data: { category: targetCategoryId },
          })
        );

        await Promise.all(updatePromises);

        return {
          data: {
            message: 'Products moved successfully',
            sourceCategoryId: id,
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
    async getStats(ctx) {
      try {
        const { id } = ctx.params;

        if (!id) {
          return ctx.badRequest('Category ID is required');
        }

        const category = await strapi.entityService.findOne(
          'api::category.category',
          id
        );
        if (!category) {
          return ctx.notFound('Category not found');
        }

        // Get product counts and statistics
        const stats = await strapi
          .service('api::category.category')
          .getCategoryStatistics(id);

        return { data: stats };
      } catch (error) {
        strapi.log.error('Error getting category statistics:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Get navigation menu structure
     */
    async getNavigation(ctx) {
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
    async getSiblings(ctx) {
      try {
        const { id } = ctx.params;

        if (!id) {
          return ctx.badRequest('Category ID is required');
        }

        const siblings = await strapi
          .service('api::category.category')
          .getSiblingCategories(id);

        return { data: siblings };
      } catch (error) {
        strapi.log.error('Error getting sibling categories:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    /**
     * Search categories
     */
    async search(ctx) {
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
