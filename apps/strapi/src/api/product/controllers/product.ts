/**
 * Product controller - Migrated to new coding standards
 *
 * Implements product management operations following Strapi 5 Document Service API
 * and TypeScript 5.9.2+ best practices
 */

// Third-party imports
import { factories } from '@strapi/strapi';

// Type definitions following new standards - Updated for Strapi compatibility
interface ProductQuery {
  filters?: any;
  sort?: any;
  pagination?: {
    page?: number;
    pageSize?: number;
  };
  populate?: any;
}

interface ProductData {
  title: string;
  slug?: string;
  description: string;
  shortDescription: string;
  price: number;
  comparePrice?: number;
  sku: string;
  inventory: number;
  status?: string;
  isActive?: boolean;
  featured?: boolean;
  category?: any;
  images?: any[];
  seo?: any;
}

type ProductStatus = 'draft' | 'published';
type UserRole = 'admin' | 'authenticated' | 'public';

export default factories.createCoreController(
  'api::product.product',
  ({ strapi }) => ({
    // Enhanced find method with filtering, sorting, and pagination - Updated to Document Service API
    async find(ctx) {
      try {
        const { query } = ctx;

        // Build query parameters using new Document Service API patterns
        const queryParams: ProductQuery = {
          filters: {
            ...((query.filters as Record<string, unknown>) || {}),
            // Use status filter instead of publishedAt for Strapi 5
            status: 'published',
          },
          sort: query.sort || { createdAt: 'desc' },
          pagination: {
            page: Math.max(1, parseInt(String(query.page || 1))),
            pageSize: Math.min(
              Math.max(1, parseInt(String(query.pageSize || 25))),
              100
            ),
          },
          populate: {
            images: {
              fields: ['url', 'width', 'height', 'formats'],
            },
            category: {
              fields: ['id', 'name', 'slug'], // Use documentId instead of id
            },
            seo: true,
          },
        };

        // Handle admin requests (include draft products)
        if (ctx.state.user?.role?.type === 'admin') {
          // Admin can see both published and draft products
          delete queryParams.filters?.status;
        }

        // Use Document Service API instead of Entity Service
        const products = await strapi
          .documents('api::product.product')
          .findMany(queryParams);

        return {
          data: products,
          meta: {
            pagination: {
              page: queryParams.pagination!.page,
              pageSize: queryParams.pagination!.pageSize,
              pageCount: Math.ceil(
                (products as unknown[]).length /
                  queryParams.pagination!.pageSize
              ),
              total: (products as unknown[]).length,
            },
          },
        };
      } catch (error) {
        strapi.log.error('Error in product find:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    // Enhanced findOne method with proper error handling - Updated to Document Service API
    async findOne(ctx) {
      try {
        // Support both legacy id and new documentId parameters
        const documentId = ctx.params.documentId || ctx.params.id;

        if (!documentId) {
          return ctx.badRequest('Product documentId is required');
        }

        // Use Document Service API with documentId
        const product = await strapi.documents('api::product.product').findOne({
          documentId,
          populate: {
            images: {
              fields: ['url', 'width', 'height', 'formats'],
            },
            category: {
              fields: ['id', 'name', 'slug'], // Use documentId instead of id
            },
            seo: true,
          },
        });

        if (!product) {
          return ctx.notFound('Product not found');
        }

        // Check if product is published (for non-admin users) using status
        if (
          ctx.state.user?.role?.type !== 'admin' &&
          (product as any).status !== 'published'
        ) {
          return ctx.notFound('Product not found');
        }

        return { data: product };
      } catch (error) {
        strapi.log.error('Error in product findOne:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    // Enhanced create method with validation - Updated to Document Service API
    async create(ctx) {
      try {
        const { data } = ctx.request.body;

        if (!data) {
          return ctx.badRequest('Product data is required');
        }

        // Validate required fields with proper type checking
        const requiredFields: (keyof ProductData)[] = [
          'title',
          'description',
          'shortDescription',
          'price',
          'sku',
          'inventory',
        ];

        for (const field of requiredFields) {
          if (!data[field] && data[field] !== 0) {
            return ctx.badRequest(`${field} is required`);
          }
        }

        // Validate price using modern type checking
        if (typeof data.price !== 'number' || data.price <= 0) {
          return ctx.badRequest('Price must be greater than 0');
        }

        // Validate inventory
        if (typeof data.inventory !== 'number' || data.inventory < 0) {
          return ctx.badRequest('Inventory cannot be negative');
        }

        // Check SKU uniqueness using Document Service API
        const existingProducts = await strapi
          .documents('api::product.product')
          .findMany({
            filters: { sku: data.sku },
            fields: ['id'], // Only fetch documentId for efficiency
          });

        if ((existingProducts as unknown[]).length > 0) {
          return ctx.badRequest('SKU must be unique');
        }

        // Create product using Document Service API
        const product = await strapi.documents('api::product.product').create({
          data,
          populate: {
            images: true,
            category: true,
            seo: true,
          },
        });

        return { data: product };
      } catch (error) {
        strapi.log.error('Error in product create:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    // Enhanced update method with validation - Updated to Document Service API
    async update(ctx) {
      try {
        // Support both legacy id and new documentId parameters
        const documentId = ctx.params.documentId || ctx.params.id;
        const { data } = ctx.request.body;

        if (!documentId) {
          return ctx.badRequest('Product documentId is required');
        }

        if (!data) {
          return ctx.badRequest('Product data is required');
        }

        // Check if product exists using Document Service API
        const existingProduct = await strapi
          .documents('api::product.product')
          .findOne({
            documentId,
            fields: ['id', 'sku'], // Only fetch needed fields
          });

        if (!existingProduct) {
          return ctx.notFound('Product not found');
        }

        // Validate price if provided with proper type checking
        if (
          data.price !== undefined &&
          (typeof data.price !== 'number' || data.price <= 0)
        ) {
          return ctx.badRequest('Price must be greater than 0');
        }

        // Validate inventory if provided
        if (
          data.inventory !== undefined &&
          (typeof data.inventory !== 'number' || data.inventory < 0)
        ) {
          return ctx.badRequest('Inventory cannot be negative');
        }

        // Check SKU uniqueness if provided
        if (data.sku && data.sku !== (existingProduct as any).sku) {
          const skuExists = await strapi
            .documents('api::product.product')
            .findMany({
              filters: { sku: data.sku },
              fields: ['id'],
            });

          if ((skuExists as unknown[]).length > 0) {
            return ctx.badRequest('SKU must be unique');
          }
        }

        // Update product using Document Service API
        const product = await strapi.documents('api::product.product').update({
          documentId,
          data,
          populate: {
            images: true,
            category: true,
            seo: true,
          },
        });

        return { data: product };
      } catch (error) {
        strapi.log.error('Error in product update:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    // Enhanced delete method - Updated to Document Service API
    async delete(ctx) {
      try {
        // Support both legacy id and new documentId parameters
        const documentId = ctx.params.documentId || ctx.params.id;

        if (!documentId) {
          return ctx.badRequest('Product documentId is required');
        }

        // Check if product exists using Document Service API
        const existingProduct = await strapi
          .documents('api::product.product')
          .findOne({
            documentId,
            fields: ['id'], // Only fetch documentId for existence check
          });

        if (!existingProduct) {
          return ctx.notFound('Product not found');
        }

        // Delete product using Document Service API
        await strapi.documents('api::product.product').delete({ documentId });

        return { message: 'Product deleted successfully' };
      } catch (error) {
        strapi.log.error('Error in product delete:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    // Status management endpoints - Updated to Document Service API
    async updateStatus(ctx) {
      try {
        // Support both legacy id and new documentId parameters
        const documentId = ctx.params.documentId || ctx.params.id;
        const { status } = ctx.request.body;

        if (!documentId) {
          return ctx.badRequest('Product documentId is required');
        }

        if (!status) {
          return ctx.badRequest('Status is required');
        }

        const validStatuses: ProductStatus[] = ['draft', 'published'];
        if (!validStatuses.includes(status as ProductStatus)) {
          return ctx.badRequest(
            'Invalid status. Must be one of: draft, published'
          );
        }

        const product = await strapi
          .service('api::product.product')
          .updateStatus(documentId, status);

        return { data: product };
      } catch (error) {
        strapi.log.error('Error updating product status:', error);
        if (error instanceof Error) {
          return ctx.badRequest(error.message);
        }
        ctx.throw(500, 'Internal server error');
      }
    },

    async getByStatus(ctx) {
      try {
        const { status } = ctx.params;
        const { query } = ctx;

        const validStatuses = ['draft', 'active', 'inactive'];
        if (!validStatuses.includes(status)) {
          return ctx.badRequest(
            'Invalid status. Must be one of: draft, active, inactive'
          );
        }

        const products = await strapi
          .service('api::product.product')
          .findByStatus(status, {
            filters: query.filters,
            sort: query.sort,
            pagination: {
              page: Math.max(1, parseInt(String(query.page || 1))),
              pageSize: Math.min(
                Math.max(1, parseInt(String(query.pageSize || 25))),
                100
              ),
            },
          });

        return {
          data: products,
          meta: {
            status,
            pagination: {
              page: parseInt(String(query.page || 1)),
              pageSize: parseInt(String(query.pageSize || 25)),
              total: products.length,
            },
          },
        };
      } catch (error) {
        strapi.log.error('Error getting products by status:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    async getStatusStatistics(ctx) {
      try {
        const statistics = await strapi
          .service('api::product.product')
          .getStatusStatistics();

        return { data: statistics };
      } catch (error) {
        strapi.log.error('Error getting status statistics:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    async bulkUpdateStatus(ctx) {
      try {
        const { productIds, status } = ctx.request.body;

        if (!productIds || !Array.isArray(productIds)) {
          return ctx.badRequest('Product IDs array is required');
        }

        if (!status) {
          return ctx.badRequest('Status is required');
        }

        const validStatuses = ['draft', 'active', 'inactive'];
        if (!validStatuses.includes(status)) {
          return ctx.badRequest(
            'Invalid status. Must be one of: draft, active, inactive'
          );
        }

        const result = await strapi
          .service('api::product.product')
          .bulkUpdateStatus(productIds, status);

        return { data: result };
      } catch (error) {
        strapi.log.error('Error in bulk status update:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    // Publish product using Document Service API Draft & Publish
    async publishProduct(ctx) {
      try {
        // Support both legacy id and new documentId parameters
        const documentId = ctx.params.documentId || ctx.params.id;

        if (!documentId) {
          return ctx.badRequest('Product documentId is required');
        }

        // Use Document Service API publish method
        const result = await strapi.documents('api::product.product').publish({
          documentId,
        });

        return { data: result };
      } catch (error) {
        strapi.log.error('Error publishing product:', error);
        if (error instanceof Error) {
          return ctx.badRequest(error.message);
        }
        ctx.throw(500, 'Internal server error');
      }
    },

    // Unpublish product using Document Service API Draft & Publish
    async unpublishProduct(ctx) {
      try {
        // Support both legacy id and new documentId parameters
        const documentId = ctx.params.documentId || ctx.params.id;

        if (!documentId) {
          return ctx.badRequest('Product documentId is required');
        }

        // Use Document Service API unpublish method
        const result = await strapi
          .documents('api::product.product')
          .unpublish({
            documentId,
          });

        return { data: result };
      } catch (error) {
        strapi.log.error('Error unpublishing product:', error);
        if (error instanceof Error) {
          return ctx.badRequest(error.message);
        }
        ctx.throw(500, 'Internal server error');
      }
    },

    async reactivateProduct(ctx) {
      try {
        const { id } = ctx.params;

        if (!id) {
          return ctx.badRequest('Product ID is required');
        }

        const product = await strapi
          .service('api::product.product')
          .reactivateProduct(id);

        return { data: product };
      } catch (error) {
        strapi.log.error('Error reactivating product:', error);
        if (error instanceof Error) {
          return ctx.badRequest(error.message);
        }
        ctx.throw(500, 'Internal server error');
      }
    },

    // SEO management endpoints
    async generateSEO(ctx) {
      try {
        const { id } = ctx.params;

        if (!id) {
          return ctx.badRequest('Product ID is required');
        }

        const product = await strapi.entityService.findOne(
          'api::product.product',
          id,
          {
            populate: ['images', 'category'] as any,
          }
        );

        if (!product) {
          return ctx.notFound('Product not found');
        }

        const seoService = strapi.service('api::product.seo');
        const seoData = await seoService.generateSEOData(product);

        return { data: seoData };
      } catch (error) {
        strapi.log.error('Error generating SEO data:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    async validateSEO(ctx) {
      try {
        const { seoData } = ctx.request.body;

        if (!seoData) {
          return ctx.badRequest('SEO data is required');
        }

        const seoService = strapi.service('api::product.seo');
        const validationResult = await seoService.validateSEOData(seoData);

        return { data: validationResult };
      } catch (error) {
        strapi.log.error('Error validating SEO data:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    async optimizeSEO(ctx) {
      try {
        const { id } = ctx.params;
        const { seoData } = ctx.request.body;

        if (!id) {
          return ctx.badRequest('Product ID is required');
        }

        const product = await strapi.entityService.findOne(
          'api::product.product',
          id,
          {
            populate: ['images', 'category'] as any,
          }
        );

        if (!product) {
          return ctx.notFound('Product not found');
        }

        const seoService = strapi.service('api::product.seo');
        const optimizedSEO = await seoService.optimizeSEOData(
          seoData || {},
          product
        );

        return { data: optimizedSEO };
      } catch (error) {
        strapi.log.error('Error optimizing SEO data:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    async getSitemapData(ctx) {
      try {
        const { query } = ctx;

        const products = await strapi.entityService.findMany(
          'api::product.product',
          {
            filters: { status: 'active', publishedAt: { $notNull: true } },
            populate: ['category'],
          }
        );

        const seoService = strapi.service('api::product.seo');
        const sitemapData = await seoService.generateSitemapData(products);

        return { data: sitemapData };
      } catch (error) {
        strapi.log.error('Error generating sitemap data:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    // Bulk operations endpoints
    async importCSV(ctx) {
      try {
        const { csvData, validateOnly } = ctx.request.body;

        if (!csvData) {
          return ctx.badRequest('CSV data is required');
        }

        const bulkService = strapi.service('api::product.bulk-operations');
        const result = await bulkService.importFromCSV(csvData, {
          validateOnly,
        });

        return { data: result };
      } catch (error) {
        strapi.log.error('Error importing CSV:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    async importJSON(ctx) {
      try {
        const { jsonData, validateOnly } = ctx.request.body;

        if (!jsonData || !Array.isArray(jsonData)) {
          return ctx.badRequest('JSON data array is required');
        }

        const bulkService = strapi.service('api::product.bulk-operations');
        const result = await bulkService.importFromJSON(jsonData, {
          validateOnly,
        });

        return { data: result };
      } catch (error) {
        strapi.log.error('Error importing JSON:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    async exportCSV(ctx) {
      try {
        const { query } = ctx;
        const { filters, fields } = query;

        const bulkService = strapi.service('api::product.bulk-operations');
        const csvData = await bulkService.exportToCSV({
          format: 'csv',
          filters,
        });

        ctx.set('Content-Type', 'text/csv');
        ctx.set('Content-Disposition', 'attachment; filename="products.csv"');

        return csvData;
      } catch (error) {
        strapi.log.error('Error exporting CSV:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    async exportJSON(ctx) {
      try {
        const { query } = ctx;
        const { filters, fields, includeRelations } = query;

        const bulkService = strapi.service('api::product.bulk-operations');
        const jsonData = await bulkService.exportToJSON({
          format: 'json',
          filters,
          fields,
          includeRelations,
        });

        return { data: jsonData };
      } catch (error) {
        strapi.log.error('Error exporting JSON:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    async bulkUpdateFields(ctx) {
      try {
        const { productIds, updateData } = ctx.request.body;

        if (!productIds || !Array.isArray(productIds)) {
          return ctx.badRequest('Product IDs array is required');
        }

        if (!updateData) {
          return ctx.badRequest('Update data is required');
        }

        const bulkService = strapi.service('api::product.bulk-operations');
        const result = await bulkService.bulkUpdateFields(
          productIds,
          updateData
        );

        return { data: result };
      } catch (error) {
        strapi.log.error('Error in bulk update fields:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    async bulkDelete(ctx) {
      try {
        const { productIds } = ctx.request.body;

        if (!productIds || !Array.isArray(productIds)) {
          return ctx.badRequest('Product IDs array is required');
        }

        const bulkService = strapi.service('api::product.bulk-operations');
        const result = await bulkService.bulkDelete(productIds);

        return { data: result };
      } catch (error) {
        strapi.log.error('Error in bulk delete:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    async getCSVTemplate(ctx) {
      try {
        const bulkService = strapi.service('api::product.bulk-operations');
        const template = bulkService.generateCSVTemplate();

        ctx.set('Content-Type', 'text/csv');
        ctx.set(
          'Content-Disposition',
          'attachment; filename="products-template.csv"'
        );

        return template;
      } catch (error) {
        strapi.log.error('Error generating CSV template:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    // Custom method for product search - Updated to Document Service API
    async search(ctx) {
      try {
        const { query } = ctx;
        const { q, category, minPrice, maxPrice, featured, isActive } = query;

        const filters: Record<string, unknown> = {
          status: 'published', // Use status filter instead of publishedAt
        };

        // Text search with proper typing
        if (q && typeof q === 'string') {
          filters.$or = [
            { title: { $containsi: q } },
            { description: { $containsi: q } },
            { shortDescription: { $containsi: q } },
            { sku: { $containsi: q } },
          ];
        }

        // Category filter
        if (category && typeof category === 'string') {
          filters.category = { slug: category };
        }

        // Price range filter with proper type checking
        if (minPrice || maxPrice) {
          filters.price = {};
          if (minPrice) {
            const min = parseFloat(String(minPrice));
            if (!isNaN(min)) {
              (filters.price as Record<string, number>).$gte = min;
            }
          }
          if (maxPrice) {
            const max = parseFloat(String(maxPrice));
            if (!isNaN(max)) {
              (filters.price as Record<string, number>).$lte = max;
            }
          }
        }

        // Featured filter
        if (featured !== undefined) {
          filters.featured = featured === 'true';
        }

        // Active filter
        if (isActive !== undefined) {
          filters.isActive = isActive === 'true';
        }

        // Use Document Service API for search
        const products = await strapi
          .documents('api::product.product')
          .findMany({
            filters,
            sort: { createdAt: 'desc' },
            pagination: {
              page: Math.max(1, parseInt(String(query.page || 1))),
              pageSize: Math.min(
                Math.max(1, parseInt(String(query.pageSize || 25))),
                100
              ),
            },
            populate: {
              images: {
                fields: ['url', 'width', 'height', 'formats'],
              },
              category: {
                fields: ['id', 'name', 'slug'], // Use documentId instead of id
              },
            },
          });

        return {
          data: products,
          meta: {
            pagination: {
              page: parseInt(String(query.page || 1)),
              pageSize: parseInt(String(query.pageSize || 25)),
              pageCount: Math.ceil(
                (products as unknown[]).length /
                  parseInt(String(query.pageSize || 25))
              ),
              total: (products as unknown[]).length,
            },
          },
        };
      } catch (error) {
        strapi.log.error('Error in product search:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    // Wishlist management methods (placeholder - requires wishlist content type)
    async addToWishlist(ctx) {
      try {
        const { productId } = ctx.params;
        const { user } = ctx.state;

        if (!user) {
          return ctx.badRequest('User authentication required');
        }

        if (!productId) {
          return ctx.badRequest('Product ID is required');
        }

        // Check if product exists
        const product = await strapi.entityService.findOne(
          'api::product.product',
          productId
        );

        if (!product) {
          return ctx.notFound('Product not found');
        }

        // TODO: Implement wishlist functionality when wishlist content type is created
        // For now, return a placeholder response
        return {
          data: {
            message: 'Wishlist functionality not yet implemented',
            productId,
            userId: user.id,
          },
        };
      } catch (error) {
        strapi.log.error('Error adding product to wishlist:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    async removeFromWishlist(ctx) {
      try {
        const { productId } = ctx.params;
        const { user } = ctx.state;

        if (!user) {
          return ctx.badRequest('User authentication required');
        }

        if (!productId) {
          return ctx.badRequest('Product ID is required');
        }

        // TODO: Implement wishlist functionality when wishlist content type is created
        // For now, return a placeholder response
        return {
          message: 'Wishlist functionality not yet implemented',
          productId,
          userId: user.id,
        };
      } catch (error) {
        strapi.log.error('Error removing product from wishlist:', error);
        ctx.throw(500, 'Internal server error');
      }
    },

    async getWishlist(ctx) {
      try {
        const { user } = ctx.state;
        const { query } = ctx;

        if (!user) {
          return ctx.badRequest('User authentication required');
        }

        // TODO: Implement wishlist functionality when wishlist content type is created
        // For now, return a placeholder response
        return {
          data: [],
          meta: {
            pagination: {
              page: parseInt(String(query.page || 1)),
              pageSize: parseInt(String(query.pageSize || 25)),
              pageCount: 0,
              total: 0,
            },
            message: 'Wishlist functionality not yet implemented',
          },
        };
      } catch (error) {
        strapi.log.error('Error getting wishlist:', error);
        ctx.throw(500, 'Internal server error');
      }
    },
  })
);
