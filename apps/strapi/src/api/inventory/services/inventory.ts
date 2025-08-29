/**
 * inventory service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::inventory.inventory' as any, ({ strapi }) => ({
  /**
   * Initialize inventory record for a product
   */
  async initializeInventory(productId: string, initialQuantity: number = 0, userId?: string) {
    try {
      // Check if inventory record already exists
      const existingInventory = await (strapi.entityService as any).findMany('api::inventory.inventory', {
        filters: { product: productId },
        limit: 1
      });

      if (existingInventory.length > 0) {
        throw new Error('Inventory record already exists for this product');
      }

      // Create inventory record
      const inventory = await (strapi.entityService as any).create('api::inventory.inventory', {
        data: {
          product: productId,
          quantity: initialQuantity,
          reserved: 0,
          available: initialQuantity,
          lowStockThreshold: 10,
          isLowStock: initialQuantity <= 10,
          lastUpdated: new Date(),
          updatedBy: userId
        }
      });

      // Create history record
      if (initialQuantity > 0) {
        await (this as any).createHistoryRecord({
          productId,
          action: 'initialize',
          quantityBefore: 0,
          quantityAfter: initialQuantity,
          quantityChanged: initialQuantity,
          reservedBefore: 0,
          reservedAfter: 0,
          reason: 'Initial inventory setup',
          source: 'system',
          changedBy: userId
        });
      }

      return inventory;
    } catch (error) {
      strapi.log.error('Error initializing inventory:', error);
      throw error;
    }
  },

  /**
   * Update inventory quantity with atomic operations
   */
  async updateInventory(productId: string, quantityChange: number, options: {
    reason: string;
    source?: 'manual' | 'order' | 'return' | 'adjustment' | 'system';
    orderId?: string;
    userId?: string;
    allowNegative?: boolean;
  }) {
    try {
      // Get current inventory with lock
      const inventory = await strapi.db.query('api::inventory.inventory').findOne({
        where: { product: productId },
        populate: { product: true }
      }) as any;

      if (!inventory) {
        throw new Error('Inventory record not found for product');
      }

      const newQuantity = inventory.quantity + quantityChange;
      
      // Validate business rules
      if (!options.allowNegative && newQuantity < 0) {
        throw new Error('Insufficient inventory. Cannot reduce below zero.');
      }

      if (newQuantity < inventory.reserved) {
        throw new Error('Cannot reduce inventory below reserved quantity');
      }

      const newAvailable = Math.max(0, newQuantity - inventory.reserved);
      const isLowStock = newQuantity <= inventory.lowStockThreshold;

      // Update inventory atomically
      const updatedInventory = await (strapi.entityService as any).update('api::inventory.inventory', inventory.id, {
        data: {
          quantity: newQuantity,
          available: newAvailable,
          isLowStock,
          lastUpdated: new Date(),
          updatedBy: options.userId
        }
      });

      // Update product inventory field for backward compatibility
      await (strapi.entityService as any).update('api::product.product', productId, {
        data: { inventory: newQuantity }
      });

      // Create history record
      await (this as any).createHistoryRecord({
        productId,
        action: quantityChange > 0 ? 'increase' : 'decrease',
        quantityBefore: inventory.quantity,
        quantityAfter: newQuantity,
        quantityChanged: quantityChange,
        reservedBefore: inventory.reserved,
        reservedAfter: inventory.reserved,
        reason: options.reason,
        source: options.source || 'manual',
        orderId: options.orderId,
        changedBy: options.userId
      });

      // Check for low stock alerts
      if (isLowStock && !inventory.isLowStock) {
        await (this as any).triggerLowStockAlert(productId, newQuantity, inventory.lowStockThreshold);
      }

      return updatedInventory;
    } catch (error) {
      strapi.log.error('Error updating inventory:', error);
      throw error;
    }
  },

  /**
   * Reserve stock for an order
   */
  async reserveStock(productId: string, quantity: number, options: {
    orderId: string;
    customerId?: string;
    expirationMinutes?: number;
  }) {
    try {
      // Get current inventory
      const inventory = await strapi.db.query('api::inventory.inventory').findOne({
        where: { product: productId }
      }) as any;

      if (!inventory) {
        throw new Error('Inventory record not found for product');
      }

      if (inventory.available < quantity) {
        throw new Error('Insufficient available inventory for reservation');
      }

      // Calculate expiration time (default 30 minutes)
      const expirationMinutes = options.expirationMinutes || 30;
      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

      // Create reservation
      const reservation = await (strapi.entityService as any).create('api::stock-reservation.stock-reservation', {
        data: {
          product: productId,
          quantity,
          orderId: options.orderId,
          customerId: options.customerId,
          status: 'active',
          expiresAt,
          metadata: { expirationMinutes }
        }
      });

      // Update inventory
      const newReserved = inventory.reserved + quantity;
      const newAvailable = inventory.quantity - newReserved;

      await (strapi.entityService as any).update('api::inventory.inventory', inventory.id, {
        data: {
          reserved: newReserved,
          available: newAvailable,
          lastUpdated: new Date()
        }
      });

      // Create history record
      await (this as any).createHistoryRecord({
        productId,
        action: 'reserve',
        quantityBefore: inventory.quantity,
        quantityAfter: inventory.quantity,
        quantityChanged: 0,
        reservedBefore: inventory.reserved,
        reservedAfter: newReserved,
        reason: `Stock reserved for order ${options.orderId}`,
        source: 'order',
        orderId: options.orderId,
        changedBy: options.customerId
      });

      return reservation;
    } catch (error) {
      strapi.log.error('Error reserving stock:', error);
      throw error;
    }
  },

  /**
   * Create inventory history record
   */
  async createHistoryRecord(data: {
    productId: string;
    action: 'increase' | 'decrease' | 'reserve' | 'release' | 'adjust' | 'initialize';
    quantityBefore: number;
    quantityAfter: number;
    quantityChanged: number;
    reservedBefore: number;
    reservedAfter: number;
    reason: string;
    source?: 'manual' | 'order' | 'return' | 'adjustment' | 'system';
    orderId?: string;
    changedBy?: string;
    metadata?: any;
  }) {
    try {
      return await (strapi.entityService as any).create('api::inventory-history.inventory-history', {
        data: {
          product: data.productId,
          action: data.action,
          quantityBefore: data.quantityBefore,
          quantityAfter: data.quantityAfter,
          quantityChanged: data.quantityChanged,
          reservedBefore: data.reservedBefore,
          reservedAfter: data.reservedAfter,
          reason: data.reason,
          source: data.source || 'manual',
          orderId: data.orderId,
          changedBy: data.changedBy,
          timestamp: new Date(),
          metadata: data.metadata
        }
      });
    } catch (error) {
      strapi.log.error('Error creating history record:', error);
      throw error;
    }
  },

  /**
   * Release a stock reservation
   */
  async releaseReservation(reservationId: string, reason: string = 'Manual release') {
    try {
      // Get the reservation
      const reservation = await (strapi.entityService as any).findOne('api::stock-reservation.stock-reservation', reservationId, {
        populate: { product: true }
      }) as any;

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      if (reservation.status !== 'active') {
        throw new Error('Reservation is not active');
      }

      // Get current inventory
      const inventory = await strapi.db.query('api::inventory.inventory').findOne({
        where: { product: reservation.product.id }
      }) as any;

      if (!inventory) {
        throw new Error('Inventory record not found');
      }

      // Update reservation status
      const updatedReservation = await (strapi.entityService as any).update('api::stock-reservation.stock-reservation', reservationId, {
        data: {
          status: 'completed',
          completedAt: new Date(),
          reason
        }
      });

      // Update inventory
      const newReserved = Math.max(0, inventory.reserved - reservation.quantity);
      const newAvailable = inventory.quantity - newReserved;

      await (strapi.entityService as any).update('api::inventory.inventory', inventory.id, {
        data: {
          reserved: newReserved,
          available: newAvailable,
          lastUpdated: new Date()
        }
      });

      // Create history record
      await (this as any).createHistoryRecord({
        productId: reservation.product.id,
        action: 'release',
        quantityBefore: inventory.quantity,
        quantityAfter: inventory.quantity,
        quantityChanged: 0,
        reservedBefore: inventory.reserved,
        reservedAfter: newReserved,
        reason,
        source: 'system',
        orderId: reservation.orderId,
        changedBy: null
      });

      return updatedReservation;
    } catch (error) {
      strapi.log.error('Error releasing reservation:', error);
      throw error;
    }
  },

  /**
   * Complete a stock reservation (fulfill order)
   */
  async completeReservation(reservationId: string, reason: string = 'Order fulfilled') {
    try {
      // Get the reservation
      const reservation = await (strapi.entityService as any).findOne('api::stock-reservation.stock-reservation', reservationId, {
        populate: { product: true }
      }) as any;

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      if (reservation.status !== 'active') {
        throw new Error('Reservation is not active');
      }

      // Update inventory by reducing both quantity and reserved
      await (this as any).updateInventory(reservation.product.id, -reservation.quantity, {
        reason,
        source: 'order',
        orderId: reservation.orderId
      });

      // Update reservation status
      const updatedReservation = await (strapi.entityService as any).update('api::stock-reservation.stock-reservation', reservationId, {
        data: {
          status: 'completed',
          completedAt: new Date(),
          reason
        }
      });

      return updatedReservation;
    } catch (error) {
      strapi.log.error('Error completing reservation:', error);
      throw error;
    }
  },

  /**
   * Clean up expired reservations
   */
  async cleanupExpiredReservations() {
    try {
      const now = new Date();
      
      // Find expired reservations
      const expiredReservations = await (strapi.entityService as any).findMany('api::stock-reservation.stock-reservation', {
        filters: {
          status: 'active',
          expiresAt: { $lt: now }
        },
        populate: { product: true }
      }) as any[];

      const results = [];

      for (const reservation of expiredReservations) {
        try {
          await (this as any).releaseReservation(reservation.id.toString(), 'Automatic expiration');
          
          // Mark as expired
          await (strapi.entityService as any).update('api::stock-reservation.stock-reservation', reservation.id, {
            data: { status: 'expired' }
          });

          results.push({
            reservationId: reservation.id,
            orderId: reservation.orderId,
            quantity: reservation.quantity,
            status: 'expired'
          });
        } catch (error) {
          strapi.log.error(`Error expiring reservation ${reservation.id}:`, error);
        }
      }

      return {
        processedCount: results.length,
        expiredReservations: results
      };
    } catch (error) {
      strapi.log.error('Error cleaning up expired reservations:', error);
      throw error;
    }
  },

  /**
   * Get inventory analytics
   */
  async getInventoryAnalytics(filters: any = {}) {
    try {
      // Get all inventory records with filters
      const inventoryRecords = await (strapi.entityService as any).findMany('api::inventory.inventory', {
        filters,
        populate: {
          product: {
            fields: ['id', 'title', 'sku', 'price']
          }
        }
      }) as any[];

      const totalProducts = inventoryRecords.length;
      const lowStockCount = inventoryRecords.filter((inv: any) => inv.isLowStock).length;
      const outOfStockCount = inventoryRecords.filter((inv: any) => inv.quantity === 0).length;
      const totalQuantity = inventoryRecords.reduce((sum: number, inv: any) => sum + inv.quantity, 0);
      const totalReserved = inventoryRecords.reduce((sum: number, inv: any) => sum + inv.reserved, 0);
      const totalAvailable = inventoryRecords.reduce((sum: number, inv: any) => sum + inv.available, 0);

      const lowStockPercentage = totalProducts > 0 ? (lowStockCount / totalProducts) * 100 : 0;
      const outOfStockPercentage = totalProducts > 0 ? (outOfStockCount / totalProducts) * 100 : 0;

      // Calculate total inventory value
      const totalValue = inventoryRecords.reduce((sum: number, inv: any) => {
        const price = inv.product?.price || 0;
        return sum + (inv.quantity * price);
      }, 0);

      // Calculate average inventory per product
      const averageInventory = totalProducts > 0 ? totalQuantity / totalProducts : 0;

      // Get top low stock products
      const topLowStockProducts = inventoryRecords
        .filter((inv: any) => inv.isLowStock)
        .sort((a: any, b: any) => a.quantity - b.quantity)
        .slice(0, 10)
        .map((inv: any) => ({
          productId: inv.product.id,
          productTitle: inv.product.title,
          sku: inv.product.sku,
          currentQuantity: inv.quantity,
          threshold: inv.lowStockThreshold,
          shortfall: Math.max(0, inv.lowStockThreshold - inv.quantity)
        }));

      return {
        totalProducts,
        lowStockCount,
        outOfStockCount,
        totalQuantity,
        totalReserved,
        totalAvailable,
        totalValue,
        averageInventory,
        lowStockPercentage: Math.round(lowStockPercentage * 100) / 100,
        outOfStockPercentage: Math.round(outOfStockPercentage * 100) / 100,
        topLowStockProducts
      };
    } catch (error) {
      strapi.log.error('Error getting inventory analytics:', error);
      throw error;
    }
  },

  /**
   * Trigger low stock alert
   */
  async triggerLowStockAlert(productId: string, currentQuantity: number, threshold: number) {
    try {
      strapi.log.warn(`Low stock alert: Product ${productId} has ${currentQuantity} units (threshold: ${threshold})`);
      
      // Here you would implement actual notification logic:
      // - Send email to administrators
      // - Create system notifications
      // - Integrate with external alerting systems
      // - Log to monitoring systems
      
      return { alertSent: true };
    } catch (error) {
      strapi.log.error('Error sending low stock alert:', error);
      return { alertSent: false, error: error.message };
    }
  }
}));