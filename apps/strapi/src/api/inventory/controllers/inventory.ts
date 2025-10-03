/**
 * Inventory controller
 *
 * Handles inventory management operations including stock tracking,
 * reservations, analytics, and low stock alerts.
 */

// Node.js and external library imports
import { Core, factories } from '@strapi/strapi';

// Note: Using 'any' types for Strapi compatibility
// The Strapi framework uses complex internal types that are difficult to fully type
// without access to their internal type definitions. This is a known limitation
// in the Strapi TypeScript ecosystem.

// Local type definitions specific to this controller
interface InitializeInventoryRequest {
  productId: string;
  initialQuantity?: number;
}

interface UpdateQuantityRequest {
  quantityChange: number;
  reason: string;
  source?: 'manual' | 'order' | 'return' | 'adjustment' | 'system';
  orderId?: string;
  allowNegative?: boolean;
}

interface ReserveStockRequest {
  productId: string;
  quantity: number;
  orderId: string;
  customerId?: string;
  expirationMinutes?: number;
}

interface ReleaseReservationRequest {
  reason?: string;
}

interface BulkUpdateThresholdRequest {
  updates: Array<{
    inventoryId: string;
    lowStockThreshold: number;
  }>;
}

interface InventoryQueryParams {
  page?: number;
  pageSize?: number;
  action?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
}

export default factories.createCoreController(
  'api::inventory.inventory' as any, // Strapi content type identifier
  ({ strapi }: { strapi: Core.Strapi }) => ({
    // Strapi instance type
    /**
     * Initialize inventory for a product
     */
    async initializeInventory(ctx: any): Promise<void> {
      // Strapi controller context
      try {
        const { productId, initialQuantity = 0 }: InitializeInventoryRequest =
          ctx.request.body;
        const userId = ctx.state.user?.id;

        if (!productId) {
          return ctx.badRequest('Product ID is required');
        }

        // Validate that product exists using Document Service API
        const product = await strapi.documents('api::product.product').findOne({
          documentId: productId,
        });

        if (!product) {
          return ctx.notFound('Product not found');
        }

        const inventory = await strapi
          .service('api::inventory.inventory')
          .initializeInventory(productId, initialQuantity, userId);

        ctx.body = {
          data: inventory,
          meta: { message: 'Inventory initialized successfully' },
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        strapi.log.error('Error in initializeInventory:', error);

        if (errorMessage.includes('already exists')) {
          return ctx.conflict(errorMessage);
        }
        ctx.throw(500, errorMessage);
      }
    },

    /**
     * Update inventory quantity
     */
    async updateQuantity(ctx: any): Promise<void> {
      // Strapi controller context
      try {
        const { id } = ctx.params;
        const {
          quantityChange,
          reason,
          source = 'manual',
          orderId,
          allowNegative = false,
        }: UpdateQuantityRequest = ctx.request.body;
        const userId = ctx.state.user?.id;

        if (!quantityChange || !reason) {
          return ctx.badRequest('Quantity change and reason are required');
        }

        if (typeof quantityChange !== 'number') {
          return ctx.badRequest('Quantity change must be a number');
        }

        // Get inventory record to find product ID using Document Service API
        const inventory = await strapi
          .documents('api::inventory.inventory')
          .findOne({
            documentId: id,
            populate: {
              product: true,
            },
          });

        if (!inventory) {
          return ctx.notFound('Inventory record not found');
        }

        const updatedInventory = await strapi
          .service('api::inventory.inventory')
          .updateInventory(inventory.product.documentId, quantityChange, {
            reason,
            source,
            orderId,
            userId,
            allowNegative,
          });

        ctx.body = {
          data: updatedInventory,
          meta: { message: 'Inventory updated successfully' },
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        strapi.log.error('Error in updateQuantity:', error);

        if (
          errorMessage.includes('Insufficient inventory') ||
          errorMessage.includes('Cannot reduce')
        ) {
          return ctx.badRequest(errorMessage);
        }
        ctx.throw(500, errorMessage);
      }
    },

    /**
     * Reserve stock for an order
     */
    async reserveStock(ctx: any): Promise<void> {
      try {
        const {
          productId,
          quantity,
          orderId,
          customerId,
          expirationMinutes = 30,
        }: ReserveStockRequest = ctx.request.body;

        if (!productId || !quantity || !orderId) {
          return ctx.badRequest(
            'Product ID, quantity, and order ID are required'
          );
        }

        if (quantity <= 0) {
          return ctx.badRequest('Quantity must be greater than zero');
        }

        const reservation = await strapi
          .service('api::inventory.inventory')
          .reserveStock(productId, quantity, {
            orderId,
            customerId: customerId || ctx.state.user?.id,
            expirationMinutes,
          });

        ctx.body = {
          data: reservation,
          meta: { message: 'Stock reserved successfully' },
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        strapi.log.error('Error in reserveStock:', error);

        if (errorMessage.includes('Insufficient available inventory')) {
          return ctx.badRequest(errorMessage);
        }
        ctx.throw(500, errorMessage);
      }
    },

    /**
     * Release a stock reservation
     */
    async releaseReservation(ctx: any): Promise<void> {
      try {
        const { id } = ctx.params;
        const { reason = 'Manual release' }: ReleaseReservationRequest =
          ctx.request.body;

        const result = await strapi
          .service('api::inventory.inventory')
          .releaseReservation(id, reason);

        ctx.body = {
          data: result,
          meta: { message: 'Reservation released successfully' },
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        strapi.log.error('Error in releaseReservation:', error);

        if (errorMessage.includes('not found')) {
          return ctx.notFound(errorMessage);
        }
        ctx.throw(500, errorMessage);
      }
    },

    /**
     * Get inventory by product ID
     */
    async findByProduct(ctx: any): Promise<void> {
      try {
        const { productId } = ctx.params;

        const inventory = await strapi.documents('api::inventory.inventory').findMany({
          filters: { product: { documentId: productId } },
          populate: {
            product: true,
          },
          limit: 1,
          start: 0,
        });

        if (!inventory?.length) {
          return ctx.notFound('Inventory record not found for this product');
        }

        ctx.body = {
          data: inventory[0],
          meta: {},
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        strapi.log.error('Error in findByProduct:', error);
        ctx.throw(500, errorMessage);
      }
    },

    /**
     * Get low stock products
     */
    async getLowStock(ctx: any): Promise<void> {
      try {
        const { page = 1, pageSize = 25 }: InventoryQueryParams = ctx.query;

        const lowStockInventory = await strapi
          .documents('api::inventory.inventory')
          .findMany({
            filters: { isLowStock: true },
            populate: {
              product: true,
            },
            sort: 'quantity:asc',
            limit: pageSize,
            start: (page - 1) * pageSize,
          });

        ctx.body = {
          data: Array.isArray(lowStockInventory) ? lowStockInventory : [],
          meta: {
            pagination: {
              page: page,
              pageSize: pageSize,
              total: Array.isArray(lowStockInventory) ? lowStockInventory.length : 0,
              pageCount: 1,
            },
          },
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        strapi.log.error('Error in getLowStock:', error);
        ctx.throw(500, errorMessage);
      }
    },

    /**
     * Get inventory history for a product
     */
    async getHistory(ctx: any): Promise<void> {
      try {
        const { productId } = ctx.params;
        const {
          page = 1,
          pageSize = 25,
          action,
          source,
          startDate,
          endDate,
        }: InventoryQueryParams = ctx.query;

        const filters: Record<string, any> = { product: { documentId: productId } }; // Strapi filter object

        if (action) {
          filters.action = action;
        }

        if (source) {
          filters.source = source;
        }

        if (startDate || endDate) {
          filters.timestamp = {};
          if (startDate) {
            filters.timestamp.$gte = new Date(String(startDate));
          }
          if (endDate) {
            filters.timestamp.$lte = new Date(String(endDate));
          }
        }

        const history = await strapi
          .documents('api::inventory-history.inventory-history')
          .findMany({
            filters,
            populate: {
              product: true,
            },
            sort: 'createdAt:desc',
            limit: pageSize,
            start: (page - 1) * pageSize,
          });

        ctx.body = {
          data: Array.isArray(history) ? history : [],
          meta: {
            pagination: {
              page: page,
              pageSize: pageSize,
              total: Array.isArray(history) ? history.length : 0,
              pageCount: 1,
            },
          },
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        strapi.log.error('Error in getHistory:', error);
        ctx.throw(500, errorMessage);
      }
    },

    /**
     * Get inventory analytics
     */
    async getAnalytics(ctx: any): Promise<void> {
      try {
        const { categoryId, startDate, endDate }: InventoryQueryParams =
          ctx.query;

        const filters: Record<string, any> = {}; // Strapi filter object

        // If category filter is provided, we need to join with products
        if (categoryId) {
          const productsInCategory = await strapi
            .documents('api::product.product')
            .findMany({
              filters: { category: { documentId: categoryId } },
            });

          const productIds =
            productsInCategory.map((p: any) => p.documentId) || []; // Product data from Strapi
          if (productIds.length > 0) {
            filters.product = { $in: productIds };
          } else {
            // No products in category, return empty analytics
            ctx.body = {
              data: {
                totalProducts: 0,
                lowStockCount: 0,
                outOfStockCount: 0,
                totalQuantity: 0,
                totalReserved: 0,
                totalAvailable: 0,
                lowStockPercentage: 0,
                outOfStockPercentage: 0,
              },
            };
            return;
          }
        }

        const analytics = await strapi
          .service('api::inventory.inventory')
          .getInventoryAnalytics(filters);

        ctx.body = {
          data: analytics,
          meta: {
            filters: { categoryId, startDate, endDate },
            generatedAt: new Date(),
          },
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        strapi.log.error('Error in getAnalytics:', error);
        ctx.throw(500, errorMessage);
      }
    },

    /**
     * Bulk update low stock thresholds
     */
    async updateLowStockThresholds(ctx: any): Promise<void> {
      try {
        const { updates }: BulkUpdateThresholdRequest = ctx.request.body;

        if (!Array.isArray(updates)) {
          return ctx.badRequest('Updates must be an array');
        }

        const results: Array<{
          inventoryId: string;
          status: 'success' | 'error';
          message: string;
        }> = [];

        for (const update of updates) {
          try {
            const { inventoryId, lowStockThreshold } = update;

            if (!inventoryId || typeof lowStockThreshold !== 'number') {
              results.push({
                inventoryId,
                status: 'error',
                message: 'Invalid inventory ID or threshold',
              });
              continue;
            }

            const inventory = await strapi
              .documents('api::inventory.inventory')
              .findOne({
                documentId: inventoryId,
                fields: ['id', 'quantity'],
              });

            if (!inventory) {
              results.push({
                inventoryId,
                status: 'error',
                message: 'Inventory record not found',
              });
              continue;
            }

            const isLowStock = inventory.quantity <= lowStockThreshold;

            await strapi.documents('api::inventory.inventory').update({
              documentId: inventoryId,
              data: {
                lowStockThreshold,
                isLowStock,
                lastUpdated: new Date(),
              },
            });

            results.push({
              inventoryId,
              status: 'success',
              message: 'Threshold updated successfully',
            });
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error occurred';
            results.push({
              inventoryId: update.inventoryId,
              status: 'error',
              message: errorMessage,
            });
          }
        }

        ctx.body = {
          data: results,
          meta: {
            total: updates.length,
            successful: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status === 'error').length,
          },
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        strapi.log.error('Error in updateLowStockThresholds:', error);
        ctx.throw(500, errorMessage);
      }
    },

    /**
     * Override default find to include product information
     */
    async find(ctx: any) {
      try {
        const { query } = ctx;
        const filters: any = {
          ...((query.filters as object) || {}),
        };

        const sort = query.sort || [{ quantity: 'asc' }, { createdAt: 'desc' }];

        // Populate relations for hierarchy and products
        const populate = {
          product: true,
          ...((query.populate as object) || {}),
        };
        const paginationQuery = query.pagination as any || { page: '1', pageSize: '25' };
        const pagination = {
          page: Math.max(1, parseInt(String(paginationQuery.page || '1')) || 1),
          pageSize: Math.min(
            Math.max(1, parseInt(String(paginationQuery.pageSize || '25')) || 25),
            100
          ),
        };
        const inventory = await strapi.documents('api::inventory.inventory').findMany({
          filters,
          limit: pagination.pageSize,
          start: (pagination.page - 1) * pagination.pageSize,
          sort,
          populate,
        });
        const total = await strapi.documents('api::inventory.inventory').count({ filters });
        return {
          data: inventory,
          meta: {
            pagination: {
              page: pagination.page,
              pageSize: pagination.pageSize,
              pageCount: Math.ceil(total / pagination.pageSize),
              total: total,
            }
          }
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        strapi.log.error('Error in find:', error);
        ctx.throw(500, errorMessage);
      }
    },

    /**
     * Override default findOne to include product information
     */
    async findOne(ctx: any): Promise<void> {
      try {
        const { id } = ctx.params;

        const inventory = await strapi
          .documents('api::inventory.inventory')
          .findOne({
            documentId: id,
            populate: {
              product: {
                populate: {
                  category: {
                    fields: ['id', 'name'],
                  },
                },
              },
            },
          });

        if (!inventory) {
          return ctx.notFound('Inventory record not found');
        }

        ctx.body = {
          data: inventory,
          meta: {},
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        strapi.log.error('Error in findOne:', error);
        ctx.throw(500, errorMessage);
      }
    },
  })
);
