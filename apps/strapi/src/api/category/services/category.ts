/**
 * category service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService(
  'api::category.category',
  ({ strapi }) => ({
    /**
     * Find category by name and parent
     */
    async findByNameAndParent(name: string, parentId: number | null) {
      try {
        const filters: any = {
          name: { $eqi: name },
        };

        if (parentId) {
          filters.parent = parentId;
        } else {
          filters.parent = { $null: true };
        }

        const categories = await strapi
          .documents('api::category.category')
          .findMany({
            filters,
            pagination: {
              limit: 1,
            },
          });

        return categories.length > 0 ? categories[0] : null;
      } catch (error) {
        strapi.log.error('Error finding category by name and parent:', error);
        throw error;
      }
    },

    /**
     * Check for circular reference in category hierarchy
     */
    async checkCircularReference(
      parentId: number,
      categoryId: number | null
    ): Promise<boolean> {
      try {
        if (!parentId || parentId === categoryId) {
          return categoryId !== null; // Self-reference is circular
        }

        const visited = new Set<number>();
        let currentId = parentId;

        while (currentId && !visited.has(currentId)) {
          if (currentId === categoryId) {
            return true; // Circular reference found
          }

          visited.add(currentId);

          const category = await strapi
            .documents('api::category.category')
            .findOne({
              documentId: String(currentId),
              populate: { parent: true },
              fields: ['id', 'name', 'slug'],
            });

          if (!category) {
            break;
          }

          currentId = (category as any).parent?.documentId;
        }

        return false;
      } catch (error) {
        strapi.log.error('Error checking circular reference:', error);
        throw error;
      }
    },

    /**
     * Get next sort order for a parent category
     */
    async getNextSortOrder(parentId: number | null): Promise<number> {
      try {
        const filters: any = {};

        if (parentId) {
          filters.parent = parentId;
        } else {
          filters.parent = { $null: true };
        }

        const categories = await strapi
          .documents('api::category.category')
          .findMany({
            filters,
            sort: { sortOrder: 'desc' },
            pagination: {
              limit: 1,
            },
          });

        if (categories.length === 0) {
          return 0;
        }

        return (categories[0].sortOrder || 0) + 1;
      } catch (error) {
        strapi.log.error('Error getting next sort order:', error);
        throw error;
      }
    },

    /**
     * Get full category tree structure
     */
    async getCategoryTree() {
      try {
        // Get all categories with their relationships
        const allCategories = await strapi
          .documents('api::category.category')
          .findMany({
            filters: {
              publishedAt: { $notNull: true },
            },
            sort: { sortOrder: 'asc', name: 'asc' },
            populate: {
              parent: true,
              children: true,
              products: true,
            },
          });

        // Build tree structure
        const categoryMap = new Map();
        const rootCategories: any[] = [];

        // First pass: create category map
        allCategories.forEach(category => {
          categoryMap.set(category.documentId, {
            ...category,
            children: [],
          });
        });

        // Second pass: build tree relationships
        allCategories.forEach(category => {
          const categoryWithChildren = categoryMap.get(category.documentId);

          if ((category as any).parent) {
            const parent = categoryMap.get((category as any).parent.documentId);
            if (parent) {
              parent.children.push(categoryWithChildren);
            }
          } else {
            rootCategories.push(categoryWithChildren);
          }
        });

        // Sort children recursively with cycle protection
        const sortCategoriesRecursively = (
          categories: any[],
          visited = new Set()
        ) => {
          categories.sort((a, b) => {
            // Handle null/undefined sortOrder
            const aSort = a.sortOrder ?? 999999;
            const bSort = b.sortOrder ?? 999999;
            if (aSort !== bSort) {
              return aSort - bSort;
            }
            return (a.name || '').localeCompare(b.name || '');
          });

          categories.forEach(category => {
            if (
              category.children &&
              category.children.length > 0 &&
              !visited.has(category.documentId)
            ) {
              visited.add(category.documentId);
              sortCategoriesRecursively(category.children, visited);
              visited.delete(category.documentId);
            }
          });
        };

        sortCategoriesRecursively(rootCategories);

        return rootCategories;
      } catch (error) {
        strapi.log.error('Error getting category tree:', error);
        throw error;
      }
    },

    /**
     * Get breadcrumbs for a category
     */
    async getBreadcrumbs(categoryId: number): Promise<any[]> {
      try {
        const breadcrumbs: any[] = [];
        let currentId = categoryId;

        while (currentId) {
          const category = await strapi
            .documents('api::category.category')
            .findOne({
              documentId: String(currentId),
              populate: {
                parent: true,
              },
              fields: ['id', 'name', 'slug'],
            });

          if (!category) {
            break;
          }

          breadcrumbs.unshift({
            documentId: category.documentId,
            name: category.name,
            slug: category.slug,
          });

          currentId = (category as any).parent?.documentId;
        }

        return breadcrumbs;
      } catch (error) {
        strapi.log.error('Error getting breadcrumbs:', error);
        throw error;
      }
    },

    /**
     * Get category path from root to category
     */
    async getCategoryPath(categoryId: number): Promise<string> {
      try {
        const breadcrumbs = await this.getBreadcrumbs(categoryId);
        return breadcrumbs.map(crumb => crumb.slug).join('/');
      } catch (error) {
        strapi.log.error('Error getting category path:', error);
        throw error;
      }
    },

    /**
     * Get all descendant categories
     */
    async getDescendants(categoryId: number): Promise<any[]> {
      try {
        const descendants: any[] = [];
        const toProcess = [categoryId];

        while (toProcess.length > 0) {
          const currentId = toProcess.shift();

          const children = await strapi
            .documents('api::category.category')
            .findMany({
              filters: {
                parent: currentId as any,
                publishedAt: { $notNull: true },
              },
              fields: ['id', 'name', 'slug'],
            });

          children.forEach(child => {
            descendants.push(child);
            toProcess.push(child.id as number);
          });
        }

        return descendants;
      } catch (error) {
        strapi.log.error('Error getting descendants:', error);
        throw error;
      }
    },

    /**
     * Get all ancestor categories
     */
    async getAncestors(categoryId: number): Promise<any[]> {
      try {
        const ancestors: any[] = [];
        let currentId = categoryId;

        while (currentId) {
          const category = await strapi
            .documents('api::category.category')
            .findOne({
              documentId: String(currentId),
              populate: {
                parent: true,
              },
              fields: ['id', 'name', 'slug'],
            });

          if (!category || !(category as any).parent) {
            break;
          }

          ancestors.unshift({
            id: (category as any).parent.id,
            name: (category as any).parent.name,
            slug: (category as any).parent.slug,
          });

          currentId = (category as any).parent.id;
        }

        return ancestors;
      } catch (error) {
        strapi.log.error('Error getting ancestors:', error);
        throw error;
      }
    },

    /**
     * Reorder categories within a parent
     */
    async reorderCategories(
      parentId: number | null,
      categoryOrders: { documentId: string; sortOrder: number }[]
    ) {
      try {
        const updatePromises = categoryOrders.map(({ documentId, sortOrder }) =>
          strapi.documents('api::category.category').update({
            documentId: String(documentId),
            data: { sortOrder },
          })
        );

        await Promise.all(updatePromises);

        return true;
      } catch (error) {
        strapi.log.error('Error reordering categories:', error);
        throw error;
      }
    },

    /**
     * Get categories by status
     */
    async getCategoriesByStatus(isActive: boolean, parentId?: number | null) {
      try {
        const filters: any = {
          isActive,
          publishedAt: { $notNull: true },
        };

        if (parentId !== undefined) {
          if (parentId) {
            filters.parent = parentId;
          } else {
            filters.parent = { $null: true };
          }
        }

        return await strapi.documents('api::category.category').findMany({
          filters,
          sort: { sortOrder: 'asc', name: 'asc' },
          populate: {
            parent: true,
            children: true,
            products: true,
          },
        });
      } catch (error) {
        strapi.log.error('Error getting categories by status:', error);
        throw error;
      }
    },

    /**
     * Get category statistics including product counts
     */
    async getCategoryStatistics(categoryId: number | string) {
      try {
        // Get the category with its products
        const category = await strapi
          .documents('api::category.category')
          .findOne({
            documentId: String(categoryId),
            populate: {
              products: {
                fields: ['id', 'status', 'isActive', 'inventory', 'price'] as any,
              },
              children: {
                fields: ['id', 'name'] as any,
              },
            },
          });

        if (!category) {
          throw new Error('Category not found');
        }

        const categoryData = category as any;
        const products = categoryData.products || [];

        // Calculate statistics
        const stats = {
          categoryId,
          categoryName: category.name,
          totalProducts: products.length,
          activeProducts: products.filter(
            (p: any) => p.isActive === true && p.status === 'published'
          ).length,
          draftProducts: products.filter((p: any) => p.status === 'draft')
            .length,
          inactiveProducts: products.filter(
            (p: any) => !p.isActive || p.status === 'inactive'
          ).length,
          outOfStockProducts: products.filter((p: any) => p.inventory === 0)
            .length,
          lowStockProducts: products.filter(
            (p: any) => p.inventory > 0 && p.inventory <= 10
          ).length,
          totalValue: products.reduce(
            (sum: number, p: any) => sum + (parseFloat(p.price) || 0),
            0
          ),
          averagePrice:
            products.length > 0
              ? products.reduce(
                  (sum: number, p: any) => sum + (parseFloat(p.price) || 0),
                  0
                ) / products.length
              : 0,
          childCategories: categoryData.children
            ? categoryData.children.length
            : 0,
          isLeafCategory:
            !categoryData.children || categoryData.children.length === 0,
        };

        return stats;
      } catch (error) {
        strapi.log.error('Error getting category statistics:', error);
        throw error;
      }
    },

    /**
     * Get products by category (including subcategories if specified)
     */
    async getProductsByCategory(
      categoryId: number | string,
      includeSubcategories: boolean = false
    ) {
      try {
        let categoryIds = [categoryId];

        if (includeSubcategories) {
          const descendants = await this.getDescendants(categoryId as number);
          categoryIds = [categoryId, ...descendants.map(cat => cat.id)];
        }

        const products = await strapi
          .documents('api::product.product')
          .findMany({
            filters: {
              category: { $in: categoryIds } as any,
              publishedAt: { $notNull: true },
            },
            sort: { createdAt: 'desc' },
            populate: {
              category: {
                fields: ['id', 'name', 'slug'] as any,
              },
              images: true as any,
              seo: true as any,
            },
          });

        return products;
      } catch (error) {
        strapi.log.error('Error getting products by category:', error);
        throw error;
      }
    },

    /**
     * Validate product assignment to category
     */
    async validateProductAssignment(
      productId: number | string,
      categoryId: number | string
    ) {
      try {
        const product = await strapi.documents('api::product.product').findOne({
          documentId: String(productId),
        });
        if (!product) {
          throw new Error('Product not found');
        }

        const category = await strapi
          .documents('api::category.category')
          .findOne({
            documentId: String(categoryId),
          });
        if (!category) {
          throw new Error('Category not found');
        }

        // Check if category is active
        if (!category.isActive) {
          throw new Error('Cannot assign products to inactive category');
        }

        return true;
      } catch (error) {
        strapi.log.error('Error validating product assignment:', error);
        throw error;
      }
    },

    /**
     * Bulk assign products to category
     */
    async bulkAssignProducts(
      productIds: (number | string)[],
      categoryId: number | string
    ) {
      try {
        // Validate category first
        const category = await strapi
          .documents('api::category.category')
          .findOne({
            documentId: String(categoryId),
          });
        if (!category) {
          throw new Error('Category not found');
        }

        if (!category.isActive) {
          throw new Error('Cannot assign products to inactive category');
        }

        // Validate all products exist
        const products = await Promise.all(
          productIds.map(id =>
            strapi.documents('api::product.product').findOne({
              documentId: String(id),
            })
          )
        );

        const invalidProducts = products
          .map((product, index) => ({ product, id: productIds[index] }))
          .filter(item => !item.product);

        if (invalidProducts.length > 0) {
          throw new Error(
            `Products not found: ${invalidProducts.map(item => item.id).join(', ')}`
          );
        }

        // Update all products
        const updatePromises = productIds.map(productId =>
          strapi.documents('api::product.product').update({
            documentId: String(productId),
            data: { category: categoryId },
          })
        );

        await Promise.all(updatePromises);

        return {
          success: true,
          categoryId,
          productCount: productIds.length,
          updatedProducts: productIds,
        };
      } catch (error) {
        strapi.log.error('Error in bulk assign products:', error);
        throw error;
      }
    },

    /**
     * Get orphaned products (products without categories)
     */
    async getOrphanedProducts() {
      try {
        const products = await strapi
          .documents('api::product.product')
          .findMany({
            filters: {
              category: { $null: true } as any,
              publishedAt: { $notNull: true },
            },
            sort: { createdAt: 'desc' },
          });

        return products;
      } catch (error) {
        strapi.log.error('Error getting orphaned products:', error);
        throw error;
      }
    },

    /**
     * Get navigation menu structure for frontend
     */
    async getNavigationMenu(maxDepth: number = 3) {
      try {
        const rootCategories = await strapi
          .documents('api::category.category')
          .findMany({
            filters: {
              parent: { $null: true } as any,
              isActive: true,
              publishedAt: { $notNull: true },
            },
            sort: { sortOrder: 'asc', name: 'asc' },
            populate: {
              children: {
                filters: {
                  isActive: true,
                },
                sort: { sortOrder: 'asc', name: 'asc' },
                fields: ['id', 'name', 'slug', 'sortOrder'],
              },
            },
            fields: ['id', 'name', 'slug', 'sortOrder'],
          });

        // Build navigation menu with limited depth
        const buildMenuLevel = async (
          categories: any[],
          currentDepth: number
        ): Promise<any[]> => {
          if (currentDepth >= maxDepth) {
            return categories.map(cat => ({
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
              sortOrder: cat.sortOrder,
              url: `/categories/${cat.slug}`,
              children: [],
            }));
          }

          const menu = [];
          for (const category of categories) {
            const menuItem = {
              id: category.id,
              name: category.name,
              slug: category.slug,
              sortOrder: category.sortOrder,
              url: `/categories/${category.slug}`,
              children: [],
            };

            if (category.children && category.children.length > 0) {
              menuItem.children = await buildMenuLevel(
                category.children,
                currentDepth + 1
              );
            }

            menu.push(menuItem);
          }

          return menu;
        };

        return await buildMenuLevel(rootCategories, 0);
      } catch (error) {
        strapi.log.error('Error getting navigation menu:', error);
        throw error;
      }
    },

    /**
     * Get breadcrumb navigation with URLs
     */
    async getBreadcrumbNavigation(categoryId: number): Promise<any[]> {
      try {
        const breadcrumbs = await this.getBreadcrumbs(categoryId);

        return breadcrumbs.map((crumb, index) => ({
          ...crumb,
          url: `/categories/${crumb.slug}`,
          isLast: index === breadcrumbs.length - 1,
          isFirst: index === 0,
        }));
      } catch (error) {
        strapi.log.error('Error getting breadcrumb navigation:', error);
        throw error;
      }
    },

    /**
     * Get sibling categories (categories with the same parent)
     */
    async getSiblingCategories(categoryId: number) {
      try {
        const category = await strapi
          .documents('api::category.category')
          .findOne({
            documentId: String(categoryId),
            populate: {
              parent: true,
            },
          });

        if (!category) {
          throw new Error('Category not found');
        }

        const categoryData = category as any;
        const parentId = categoryData.parent?.id || null;

        const filters: any = {
          isActive: true,
          publishedAt: { $notNull: true },
        };

        if (parentId) {
          filters.parent = parentId;
        } else {
          filters.parent = { $null: true };
        }

        // Exclude the current category
        filters.id = { $ne: categoryId };

        const siblings = await strapi
          .documents('api::category.category')
          .findMany({
            filters,
            sort: { sortOrder: 'asc', name: 'asc' },
            fields: ['id', 'name', 'slug', 'sortOrder'],
          });

        return siblings;
      } catch (error) {
        strapi.log.error('Error getting sibling categories:', error);
        throw error;
      }
    },

    /**
     * Search categories by name or description
     */
    async searchCategories(searchTerm: string, limit: number = 20) {
      try {
        const categories = await strapi
          .documents('api::category.category')
          .findMany({
            filters: {
              $or: [
                { name: { $containsi: searchTerm } },
                { description: { $containsi: searchTerm } },
              ],
              isActive: true,
              publishedAt: { $notNull: true },
            },
            sort: { name: 'asc' },
            limit,
            populate: {
              parent: {
                fields: ['id', 'name', 'slug'],
              },
              products: true,
            } as any,
            fields: ['id', 'name', 'slug', 'description'],
          });

        return categories.map((category: any) => ({
          ...category,
          url: `/categories/${category.slug}`,
          breadcrumbPath: category.parent
            ? `${category.parent.name} > ${category.name}`
            : category.name,
        }));
      } catch (error) {
        strapi.log.error('Error searching categories:', error);
        throw error;
      }
    },
  })
);
