/**
 * inventory controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::inventory.inventory' as any, ({ strapi }) => ({
  /**
   * Initialize inventory for a product
   */
  async initializeInventory(ctx: any) {
    try {
      const { productId, initialQuantity = 0 } = ctx.request.body;
      const userId = ctx.state.user?.id;

      if (!productId) {
        return ctx.badRequest('Product ID is required');
      }

      // Validate that product exists
      const product = await (strapi.entityService as any).findOne('api::product.product', productId);
      if (!product) {
        return ctx.notFound('Product not found');
      }

      const inventory = await (strapi.service as any)('api::inventory.inventory').initializeInventory(
        productId,
        initialQuantity,
        userId
      );

      ctx.body = {
        data: inventory,
        meta: { message: 'Inventory initialized successfully' }
      };
    } catch (error: any) {
      strapi.log.error('Error in initializeInventory:', error);
      if (error.message.includes('already exists')) {
        return ctx.conflict(error.message);
      }
      ctx.throw(500, error.message);
    }
  },

  /**
   * Update inventory quantity
   */
  async updateQuantity(ctx: any) {
    try {
      const { id } = ctx.params;
      const { quantityChange, reason, source = 'manual', orderId, allowNegative = false } = ctx.request.body;
      const userId = ctx.state.user?.id;

      if (!quantityChange || !reason) {
        return ctx.badRequest('Quantity change and reason are required');
      }

      if (typeof quantityChange !== 'number') {
        return ctx.badRequest('Quantity change must be a number');
      }

      // Get inventory record to find product ID
      const inventory = await (strapi.entityService as any).findOne('api::inventory.inventory', id, {
        populate: { product: true }
      }) as any;

      if (!inventory) {
        return ctx.notFound('Inventory record not found');
      }

      const updatedInventory = await (strapi.service as any)('api::inventory.inventory').updateInventory(
        inventory.product.id,
        quantityChange,
        {
          reason,
          source,
          orderId,
          userId,
          allowNegative
        }
      );

      ctx.body = {
        data: updatedInventory,
        meta: { message: 'Inventory updated successfully' }
      };
    } catch (error: any) {
      strapi.log.error('Error in updateQuantity:', error);
      if (error.message.includes('Insufficient inventory') || error.message.includes('Cannot reduce')) {
        return ctx.badRequest(error.message);
      }
      ctx.throw(500, error.message);
    }
  },

  /**
   * Reserve stock for an order
   */
  async reserveStock(ctx: any) {
    try {
      const { productId, quantity, orderId, customerId, expirationMinutes = 30 } = ctx.request.body;

      if (!productId || !quantity || !orderId) {
        return ctx.badRequest('Product ID, quantity, and order ID are required');
      }

      if (quantity <= 0) {
        return ctx.badRequest('Quantity must be greater than zero');
      }

      const reservation = await (strapi.service as any)('api::inventory.inventory').reserveStock(
        productId,
        quantity,
        {
          orderId,
          customerId: customerId || ctx.state.user?.id,
          expirationMinutes
        }
      );

      ctx.body = {
        data: reservation,
        meta: { message: 'Stock reserved successfully' }
      };
    } catch (error: any) {
      strapi.log.error('Error in reserveStock:', error);
      if (error.message.includes('Insufficient available inventory')) {
        return ctx.badRequest(error.message);
      }
      ctx.throw(500, error.message);
    }
  },

  /**
   * Release a stock reservation
   */
  async releaseReservation(ctx: any) {
    try {
      const { id } = ctx.params;
      const { reason = 'Manual release' } = ctx.request.body;

      const result = await (strapi.service as any)('api::inventory.inventory').releaseReservation(id, reason);

      ctx.body = {
        data: result,
        meta: { message: 'Reservation released successfully' }
      };
    } catch (error: any) {
      strapi.log.error('Error in releaseReservation:', error);
      if (error.message.includes('not found')) {
        return ctx.notFound(error.message);
      }
      ctx.throw(500, error.message);
    }
  },

  /**
   * Get inventory by product ID
   */
  async findByProduct(ctx: any) {
    try {
      const { productId } = ctx.params;

      const inventory = await (strapi.entityService as any).findMany('api::inventory.inventory', {
        filters: { product: productId },
        populate: {
          product: {
            fields: ['id', 'title', 'sku']
          },
          updatedBy: {
            fields: ['id', 'username', 'email']
          }
        },
        limit: 1
      });

      if (!inventory.length) {
        return ctx.notFound('Inventory record not found for this product');
      }

      ctx.body = {
        data: inventory[0],
        meta: {}
      };
    } catch (error: any) {
      strapi.log.error('Error in findByProduct:', error);
      ctx.throw(500, error.message);
    }
  },

  /**
   * Get low stock products
   */
  async getLowStock(ctx: any) {
    try {
      const { page = 1, pageSize = 25 } = ctx.query;

      const lowStockInventory = await (strapi.entityService as any).findMany('api::inventory.inventory', {
        filters: { isLowStock: true },
        populate: {
          product: {
            fields: ['id', 'title', 'sku', 'price']
          }
        },
        sort: ['quantity:asc'],
        pagination: {
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string)
        }
      });

      ctx.body = lowStockInventory;
    } catch (error: any) {
      strapi.log.error('Error in getLowStock:', error);
      ctx.throw(500, error.message);
    }
  },

  /**
   * Get inventory history for a product
   */
  async getHistory(ctx: any) {
    try {
      const { productId } = ctx.params;
      const { page = 1, pageSize = 25, action, source, startDate, endDate } = ctx.query;

      const filters: any = { product: productId };

      if (action) {
        filters.action = action;
      }

      if (source) {
        filters.source = source;
      }

      if (startDate || endDate) {
        filters.timestamp = {};
        if (startDate) {
          filters.timestamp.$gte = new Date(startDate as string);
        }
        if (endDate) {
          filters.timestamp.$lte = new Date(endDate as string);
        }
      }

      const history = await (strapi.entityService as any).findMany('api::inventory-history.inventory-history', {
        filters,
        populate: {
          product: {
            fields: ['id', 'title', 'sku']
          },
          changedBy: {
            fields: ['id', 'username', 'email']
          }
        },
        sort: ['timestamp:desc'],
        pagination: {
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string)
        }
      });

      ctx.body = history;
    } catch (error: any) {
      strapi.log.error('Error in getHistory:', error);
      ctx.throw(500, error.message);
    }
  },

  /**
   * Get inventory analytics
   */
  async getAnalytics(ctx: any) {
    try {
      const { categoryId, startDate, endDate } = ctx.query;

      const filters: any = {};

      // If category filter is provided, we need to join with products
      if (categoryId) {
        const productsInCategory = await (strapi.entityService as any).findMany('api::product.product', {
          filters: { category: categoryId },
          fields: ['id']
        });
        
        const productIds = productsInCategory.map((p: any) => p.id);
        if (productIds.length > 0) {
          filters.product = { $in: productIds };
        } else {
          // No products in category, return empty analytics
          return ctx.body = {
            data: {
              totalProducts: 0,
              lowStockCount: 0,
              outOfStockCount: 0,
              totalQuantity: 0,
              totalReserved: 0,
              totalAvailable: 0,
              lowStockPercentage: 0,
              outOfStockPercentage: 0
            }
          };
        }
      }

      const analytics = await (strapi.service as any)('api::inventory.inventory').getInventoryAnalytics(filters);

      ctx.body = {
        data: analytics,
        meta: {
          filters: { categoryId, startDate, endDate },
          generatedAt: new Date()
        }
      };
    } catch (error: any) {
      strapi.log.error('Error in getAnalytics:', error);
      ctx.throw(500, error.message);
    }
  },

  /**
   * Bulk update low stock thresholds
   */
  async updateLowStockThresholds(ctx: any) {
    try {
      const { updates } = ctx.request.body;

      if (!Array.isArray(updates)) {
        return ctx.badRequest('Updates must be an array');
      }

      const results = [];

      for (const update of updates) {
        try {
          const { inventoryId, lowStockThreshold } = update;

          if (!inventoryId || typeof lowStockThreshold !== 'number') {
            results.push({
              inventoryId,
              status: 'error',
              message: 'Invalid inventory ID or threshold'
            });
            continue;
          }

          const inventory = await (strapi.entityService as any).findOne('api::inventory.inventory', inventoryId) as any;
          if (!inventory) {
            results.push({
              inventoryId,
              status: 'error',
              message: 'Inventory record not found'
            });
            continue;
          }

          const isLowStock = inventory.quantity <= lowStockThreshold;

          await (strapi.entityService as any).update('api::inventory.inventory', inventoryId, {
            data: {
              lowStockThreshold,
              isLowStock,
              lastUpdated: new Date()
            }
          });

          results.push({
            inventoryId,
            status: 'success',
            message: 'Threshold updated successfully'
          });
        } catch (error: any) {
          results.push({
            inventoryId: update.inventoryId,
            status: 'error',
            message: error.message
          });
        }
      }

      ctx.body = {
        data: results,
        meta: {
          total: updates.length,
          successful: results.filter(r => r.status === 'success').length,
          failed: results.filter(r => r.status === 'error').length
        }
      };
    } catch (error: any) {
      strapi.log.error('Error in updateLowStockThresholds:', error);
      ctx.throw(500, error.message);
    }
  },

  /**
   * Override default find to include product information
   */
  async find(ctx: any) {
    try {
      const { query } = ctx;

      const inventory = await (strapi.entityService as any).findMany('api::inventory.inventory', {
        ...query,
        populate: {
          product: {
            fields: ['id', 'title', 'sku', 'price', 'status']
          },
          updatedBy: {
            fields: ['id', 'username', 'email']
          }
        }
      });

      ctx.body = inventory;
    } catch (error: any) {
      strapi.log.error('Error in find:', error);
      ctx.throw(500, error.message);
    }
  },

  /**
   * Override default findOne to include product information
   */
  async findOne(ctx: any) {
    try {
      const { id } = ctx.params;

      const inventory = await (strapi.entityService as any).findOne('api::inventory.inventory', id, {
        populate: {
          product: {
            populate: {
              category: {
                fields: ['id', 'name']
              },
              images: true
            }
          },
          updatedBy: {
            fields: ['id', 'username', 'email']
          }
        }
      });

      if (!inventory) {
        return ctx.notFound('Inventory record not found');
      }

      ctx.body = {
        data: inventory,
        meta: {}
      };
    } catch (error: any) {
      strapi.log.error('Error in findOne:', error);
      ctx.throw(500, error.message);
    }
  }
}));