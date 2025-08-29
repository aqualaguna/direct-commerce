/**
 * Product service - Migrated to new coding standards
 *
 * Implements product business logic following Strapi 5 Document Service API
 * and TypeScript 5.9.2+ best practices
 */

// Third-party imports
import { factories } from '@strapi/strapi';

// Local imports
import productValidationService from './product-validation';

// Type definitions - Updated for Strapi compatibility
interface UpdateStatusParams {
  documentId: string;
  newStatus: string;
}

interface FindByStatusOptions {
  filters?: any;
  sort?: any;
  pagination?: {
    page?: number;
    pageSize?: number;
  };
}

interface StatusStatistics {
  draft: number;
  published: number;
  total: number;
  percentages: {
    draft: number;
    published: number;
  };
}

export default factories.createCoreService(
  'api::product.product',
  ({ strapi }) => ({
    /**
     * Update product status with validation - Updated to Document Service API
     */
    async updateStatus(
      documentId: string,
      newStatus: string
    ): Promise<unknown> {
      try {
        // Get current product using Document Service API
        const product = await strapi.documents('api::product.product').findOne({
          documentId,
          fields: ['id', 'status'],
        });

        if (!product) {
          throw new Error('Product not found');
        }

        // Validate status transition
        const validationResult =
          await productValidationService.validateStatusTransition(
            (product as any).status || 'draft',
            newStatus as any
          );

        if (!validationResult.isValid) {
          throw new Error(validationResult.errors.join(', '));
        }

        // Update status using Document Service API
        const updatedProduct = await strapi
          .documents('api::product.product')
          .update({
            documentId,
            data: { status: newStatus as any },
            populate: ['images', 'category', 'seo'] as any,
          });

        return updatedProduct;
      } catch (error) {
        strapi.log.error('Error updating product status:', error);
        throw error;
      }
    },

    /**
     * Get products by status - Updated to Document Service API
     */
    async findByStatus(
      status: string,
      options: FindByStatusOptions = {}
    ): Promise<unknown> {
      try {
        const filters = {
          ...options.filters,
          status,
        };

        const products = await strapi
          .documents('api::product.product')
          .findMany({
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
          });

        return products;
      } catch (error) {
        strapi.log.error('Error finding products by status:', error);
        throw error;
      }
    },

    /**
     * Get products with status-based filtering - Updated to Document Service API
     */
    async findWithStatusFilter(
      statusFilters: string[],
      options: FindByStatusOptions = {}
    ): Promise<unknown> {
      try {
        const filters = {
          ...options.filters,
          status: { $in: statusFilters },
        };

        const products = await strapi
          .documents('api::product.product')
          .findMany({
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
          });

        return products;
      } catch (error) {
        strapi.log.error('Error finding products with status filter:', error);
        throw error;
      }
    },

    /**
     * Bulk status update - Updated to Document Service API
     */
    async bulkUpdateStatus(
      documentIds: string[],
      newStatus: string
    ): Promise<{
      success: number;
      failed: number;
      results: unknown[];
      errors: Array<{ documentId: string; error: string }>;
    }> {
      try {
        const results: unknown[] = [];
        const errors: Array<{ documentId: string; error: string }> = [];

        for (const documentId of documentIds) {
          try {
            const result = await this.updateStatus(documentId, newStatus);
            results.push(result);
          } catch (error) {
            errors.push({
              documentId,
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
     * Get status statistics - Updated to Document Service API
     */
    async getStatusStatistics(): Promise<StatusStatistics> {
      try {
        const [draft, published] = await Promise.all([
          strapi.documents('api::product.product').count({
            status: 'draft',
          }),
          strapi.documents('api::product.product').count({
            status: 'published',
          }),
        ]);

        const total = draft + published;

        return {
          draft,
          published,
          total,
          percentages: {
            draft: total > 0 ? Math.round((draft / total) * 100) : 0,
            published: total > 0 ? Math.round((published / total) * 100) : 0,
          },
        };
      } catch (error) {
        strapi.log.error('Error getting status statistics:', error);
        throw error;
      }
    },

    /**
     * Publish product using Document Service API Draft & Publish
     */
    async publishProduct(documentId: string): Promise<unknown> {
      try {
        // Use Document Service API publish method for Draft & Publish
        const result = await strapi.documents('api::product.product').publish({
          documentId,
        });
        return result;
      } catch (error) {
        strapi.log.error('Error publishing product:', error);
        throw error;
      }
    },

    /**
     * Unpublish product using Document Service API Draft & Publish
     */
    async unpublishProduct(documentId: string): Promise<unknown> {
      try {
        // Use Document Service API unpublish method for Draft & Publish
        const result = await strapi
          .documents('api::product.product')
          .unpublish({
            documentId,
          });
        return result;
      } catch (error) {
        strapi.log.error('Error unpublishing product:', error);
        throw error;
      }
    },

    /**
     * Reactivate product (legacy method - now uses publish)
     */
    async reactivateProduct(documentId: string): Promise<unknown> {
      try {
        return await this.publishProduct(documentId);
      } catch (error) {
        strapi.log.error('Error reactivating product:', error);
        throw error;
      }
    },

    /**
     * Get products ready for publication - Updated to Document Service API
     */
    async getProductsReadyForPublication(
      options: FindByStatusOptions = {}
    ): Promise<unknown> {
      try {
        const filters: any = {
          status: 'draft',
          title: { $notNull: true },
          description: { $notNull: true },
          price: { $gt: 0 },
          sku: { $notNull: true },
          inventory: { $gte: 0 },
        };

        const products = await strapi
          .documents('api::product.product')
          .findMany({
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
          });

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
