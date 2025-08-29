/**
 * product service
 */

import { factories } from '@strapi/strapi';
import productValidationService from './product-validation';

export default factories.createCoreService(
  'api::product.product',
  ({ strapi }) => ({
    /**
     * Update product status with validation
     */
    async updateStatus(productId: number, newStatus: string) {
      try {
        // Get current product
        const product = await strapi.entityService.findOne(
          'api::product.product',
          productId
        );
        if (!product) {
          throw new Error('Product not found');
        }

        // Validate status transition
        const validationResult =
          await productValidationService.validateStatusTransition(
            (product as any).status || 'draft',
            newStatus
          );

        if (!validationResult.isValid) {
          throw new Error(validationResult.errors.join(', '));
        }

        // Update status
        const updatedProduct = await strapi.entityService.update(
          'api::product.product',
          productId,
          {
            data: { status: newStatus } as any,
            populate: ['images', 'category', 'seo'],
          }
        );

        return updatedProduct;
      } catch (error) {
        strapi.log.error('Error updating product status:', error);
        throw error;
      }
    },

    /**
     * Get products by status
     */
    async findByStatus(status: string, options: any = {}) {
      try {
        const filters = {
          ...options.filters,
          status: status,
        } as any;

        const products = await strapi.entityService.findMany(
          'api::product.product',
          {
            filters,
            sort: options.sort || { createdAt: 'desc' },
            pagination: options.pagination || { page: 1, pageSize: 25 },
            populate: {
              images: {
                fields: ['url', 'width', 'height', 'formats'],
              },
              category: {
                fields: ['id', 'name', 'slug'],
              },
              seo: true,
            },
          }
        );

        return products;
      } catch (error) {
        strapi.log.error('Error finding products by status:', error);
        throw error;
      }
    },

    /**
     * Get products with status-based filtering
     */
    async findWithStatusFilter(statusFilters: string[], options: any = {}) {
      try {
        const filters = {
          ...options.filters,
          status: { $in: statusFilters },
        } as any;

        const products = await strapi.entityService.findMany(
          'api::product.product',
          {
            filters,
            sort: options.sort || { createdAt: 'desc' },
            pagination: options.pagination || { page: 1, pageSize: 25 },
            populate: {
              images: {
                fields: ['url', 'width', 'height', 'formats'],
              },
              category: {
                fields: ['id', 'name', 'slug'],
              },
              seo: true,
            },
          }
        );

        return products;
      } catch (error) {
        strapi.log.error('Error finding products with status filter:', error);
        throw error;
      }
    },

    /**
     * Bulk status update
     */
    async bulkUpdateStatus(productIds: number[], newStatus: string) {
      try {
        const results = [];
        const errors = [];

        for (const productId of productIds) {
          try {
            const result = await this.updateStatus(productId, newStatus);
            results.push(result);
          } catch (error) {
            errors.push({
              productId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        return {
          success: results.length,
          failed: errors.length,
          results,
          errors,
        };
      } catch (error) {
        strapi.log.error('Error in bulk status update:', error);
        throw error;
      }
    },

    /**
     * Get status statistics
     */
    async getStatusStatistics() {
      try {
        const [draft, active, inactive] = await Promise.all([
          strapi.entityService.count('api::product.product', {
            filters: { status: 'draft' } as any,
          }),
          strapi.entityService.count('api::product.product', {
            filters: { status: 'active' } as any,
          }),
          strapi.entityService.count('api::product.product', {
            filters: { status: 'inactive' } as any,
          }),
        ]);

        const total = draft + active + inactive;

        return {
          draft,
          active,
          inactive,
          total,
          percentages: {
            draft: total > 0 ? Math.round((draft / total) * 100) : 0,
            active: total > 0 ? Math.round((active / total) * 100) : 0,
            inactive: total > 0 ? Math.round((inactive / total) * 100) : 0,
          },
        };
      } catch (error) {
        strapi.log.error('Error getting status statistics:', error);
        throw error;
      }
    },

    /**
     * Publish product (draft to active)
     */
    async publishProduct(productId: number) {
      try {
        return await this.updateStatus(productId, 'active');
      } catch (error) {
        strapi.log.error('Error publishing product:', error);
        throw error;
      }
    },

    /**
     * Unpublish product (active to inactive)
     */
    async unpublishProduct(productId: number) {
      try {
        return await this.updateStatus(productId, 'inactive');
      } catch (error) {
        strapi.log.error('Error unpublishing product:', error);
        throw error;
      }
    },

    /**
     * Reactivate product (inactive to active)
     */
    async reactivateProduct(productId: number) {
      try {
        return await this.updateStatus(productId, 'active');
      } catch (error) {
        strapi.log.error('Error reactivating product:', error);
        throw error;
      }
    },

    /**
     * Get products ready for publication (draft products with complete data)
     */
    async getProductsReadyForPublication(options: any = {}) {
      try {
        const filters = {
          status: 'draft',
          title: { $notNull: true },
          description: { $notNull: true },
          price: { $gt: 0 },
          sku: { $notNull: true },
          inventory: { $gte: 0 },
        } as any;

        const products = await strapi.entityService.findMany(
          'api::product.product',
          {
            filters,
            sort: options.sort || { createdAt: 'desc' },
            pagination: options.pagination || { page: 1, pageSize: 25 },
            populate: {
              images: {
                fields: ['url', 'width', 'height', 'formats'],
              },
              category: {
                fields: ['id', 'name', 'slug'],
              },
              seo: true,
            },
          }
        );

        return products;
      } catch (error) {
        strapi.log.error(
          'Error getting products ready for publication:',
          error
        );
        throw error;
      }
    },
  })
);
