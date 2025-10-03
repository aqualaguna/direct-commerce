/**
 * Inventory service
 *
 * Provides business logic for inventory management including stock tracking,
 * reservations, analytics, and history management.
 */

// Node.js and external library imports
import { factories } from '@strapi/strapi';

// Local type imports
interface InventoryUpdateOptions {
  reason: string;
  source?: 'manual' | 'order' | 'return' | 'adjustment' | 'system';
  orderId?: string;
  userId?: string;
  allowNegative?: boolean;
}

interface ReservationOptions {
  orderId: string;
  customerId?: string;
  expirationMinutes?: number;
}

interface HistoryRecordData {
  productId: string;
  action:
    | 'increase'
    | 'decrease'
    | 'reserve'
    | 'release'
    | 'adjust'
    | 'initialize';
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
}

export default factories.createCoreService(
  'api::inventory.inventory' as any,
  ({ strapi }) => ({
    /**
     * Get inventory record for a product
     */
    async getInventoryByProduct(productId: string): Promise<any> {
      try {
        const inventory = await strapi.documents(
          'api::inventory.inventory'
        ).findFirst({
          filters: { product: { documentId: productId } },
        });

        return inventory;
      } catch (error) {
        strapi.log.error('Error getting inventory by product:', error);
        throw error;
      }
    },

    /**
     * Initialize inventory record for a product
     */
    async initializeInventory(
      productId: string,
      initialQuantity: number = 0,
      userId?: string
    ): Promise<any> {
      try {
        strapi.log.info(`Initializing inventory for product ${productId} with quantity ${initialQuantity}`);
        
        // Check if inventory record already exists using Document Service API
        const existingInventory = await strapi.documents('api::inventory.inventory').findMany({
          filters: { product: { documentId: productId } },
          limit: 1,
          start: 0,
        });

        strapi.log.info(`Existing inventory check result:`, existingInventory);

        if (existingInventory?.length > 0) {
          strapi.log.warn(`Inventory record already exists for product ${productId}`);
          throw new Error('Inventory record already exists for this product');
        }

        // Create inventory record using Document Service API
        const inventoryData = {
          product: { documentId: productId },
          quantity: initialQuantity,
          reserved: 0,
          available: initialQuantity,
          lowStockThreshold: 10,
          isLowStock: initialQuantity > 0 && initialQuantity <= 10,
          lastUpdated: new Date(),
          updatedBy: userId,
        };
        
        strapi.log.info(`Creating inventory record with data:`, inventoryData);
        
        const inventory = await strapi.documents('api::inventory.inventory').create({
          data: inventoryData,
        });
        
        strapi.log.info(`Inventory record created successfully:`, inventory);

        // Create history record
        if (initialQuantity > 0) {
          await this.createHistoryRecord({
            productId,
            action: 'initialize',
            quantityBefore: 0,
            quantityAfter: initialQuantity,
            quantityChanged: initialQuantity,
            reservedBefore: 0,
            reservedAfter: 0,
            reason: 'Initial inventory setup',
            source: 'system',
            changedBy: userId,
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
    async updateInventory(
      productId: string,
      quantityChange: number,
      options: InventoryUpdateOptions
    ): Promise<any> {
      try {
        strapi.log.info(`updateInventory called with productId: ${productId}, quantityChange: ${quantityChange}, options:`, options);
        
        // Get current inventory using Document Service API
        const inventory = await strapi.documents('api::inventory.inventory').findFirst({
          filters: { product: { documentId: productId } },
          populate: { product: true },
        });

        if (!inventory) {
          throw new Error('Inventory record not found for product');
        }

        strapi.log.info(`Current inventory:`, inventory);
        const newQuantity = inventory.quantity + quantityChange;
        strapi.log.info(`Calculated newQuantity: ${newQuantity} (${inventory.quantity} + ${quantityChange})`);

        // Validate business rules
        if (!options.allowNegative && newQuantity < 0) {
          throw new Error('Insufficient inventory. Cannot reduce below zero.');
        }

        if (newQuantity < inventory.reserved) {
          throw new Error('Cannot reduce inventory below reserved quantity');
        }

        const newAvailable = Math.max(0, newQuantity - inventory.reserved);
        const isLowStock = newQuantity > 0 && newQuantity <= inventory.lowStockThreshold;

        // Update inventory atomically using Document Service API
        const updatedInventory = await strapi.documents('api::inventory.inventory').update({
          documentId: inventory.documentId,
          data: {
            quantity: newQuantity,
            available: newAvailable,
            isLowStock,
            lastUpdated: new Date(),
            updatedBy: options.userId,
          },
        });

        // Note: Product schema doesn't have inventory field, so we skip this update
        // The inventory is managed through the inventory content type

        // Create history record
        await this.createHistoryRecord({
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
          changedBy: options.userId,
        });

        // Check for low stock alerts
        if (isLowStock && !inventory.isLowStock) {
          await this.triggerLowStockAlert(
            productId,
            newQuantity,
            inventory.lowStockThreshold
          );
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
    async reserveStock(
      productId: string,
      quantity: number,
      options: ReservationOptions
    ): Promise<any> {
      try {
        // Get current inventory
        const inventory = await strapi.documents(
          'api::inventory.inventory'
        ).findFirst({
          filters: { product: { documentId: productId } },
        });

        if (!inventory) {
          throw new Error('Inventory record not found for product');
        }

        if (inventory.available < quantity) {
          throw new Error('Insufficient available inventory for reservation');
        }

        // Calculate expiration time (default 30 minutes)
        const expirationMinutes = options.expirationMinutes || 30;
        const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

        // Create reservation using Document Service API
        const reservation = await strapi.documents(
          'api::stock-reservation.stock-reservation'
        ).create({
          data: {
            product: { documentId: productId },
            quantity,
            orderId: options.orderId,
            customerId: options.customerId,
            status: 'active',
            expiresAt,
            metadata: { expirationMinutes },
          },
        });

        // Update inventory using Document Service API
        const newReserved = inventory.reserved + quantity;
        const newAvailable = inventory.quantity - newReserved;

        await strapi.documents('api::inventory.inventory').update({
          documentId: inventory.documentId,
          data: {
            reserved: newReserved,
            available: newAvailable,
            lastUpdated: new Date(),
          },
        });

        // Create history record
        await this.createHistoryRecord({
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
          changedBy: options.customerId,
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
    async createHistoryRecord(data: HistoryRecordData): Promise<any> {
      try {
        return await strapi.documents(
          'api::inventory-history.inventory-history'
        ).create({
          data: {
            product: { documentId: data.productId },
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
            metadata: data.metadata,
          },
        });
      } catch (error) {
        strapi.log.error('Error creating history record:', error);
        throw error;
      }
    },

    /**
     * Release a stock reservation
     */
    async releaseReservation(
      reservationId: string,
      reason: string = 'Manual release'
    ): Promise<any> {
      try {
        // Get the reservation using Document Service API
        const reservation = await strapi.documents(
          'api::stock-reservation.stock-reservation'
        ).findOne({
          documentId: reservationId,
          populate: { product: true },
        });

        if (!reservation) {
          throw new Error('Reservation not found');
        }

        if (reservation.status !== 'active') {
          throw new Error('Reservation is not active');
        }

        // Get current inventory
        const inventory = await strapi.documents(
          'api::inventory.inventory'
        ).findFirst({
          filters: { product: { documentId: reservation.product.documentId } },
        });

        if (!inventory) {
          throw new Error('Inventory record not found');
        }

        // Update reservation status using Document Service API
        const updatedReservation = await strapi.documents(
          'api::stock-reservation.stock-reservation'
        ).update({
          documentId: reservationId,
          data: {
            status: 'completed',
            completedAt: new Date(),
            reason,
          },
        });

        // Update inventory using Document Service API
        const newReserved = Math.max(
          0,
          inventory.reserved - reservation.quantity
        );
        const newAvailable = inventory.quantity - newReserved;

        await strapi.documents('api::inventory.inventory').update({
          documentId: inventory.documentId,
          data: {
            reserved: newReserved,
            available: newAvailable,
            lastUpdated: new Date(),
          },
        });

        // Create history record
        await this.createHistoryRecord({
          productId: reservation.product.documentId,
          action: 'release',
          quantityBefore: inventory.quantity,
          quantityAfter: inventory.quantity,
          quantityChanged: 0,
          reservedBefore: inventory.reserved,
          reservedAfter: newReserved,
          reason,
          source: 'system',
          orderId: reservation.orderId,
          changedBy: undefined,
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
    async completeReservation(
      reservationId: string,
      reason: string = 'Order fulfilled'
    ): Promise<any> {
      try {
        // Get the reservation using Document Service API
        const reservation = await strapi.documents(
          'api::stock-reservation.stock-reservation'
        ).findOne({
          documentId: reservationId,
          populate: { product: true },
        });

        if (!reservation) {
          throw new Error('Reservation not found');
        }

        if (reservation.status !== 'active') {
          throw new Error('Reservation is not active');
        }

        // Update inventory by reducing both quantity and reserved
        await this.updateInventory(
          reservation.product.documentId,
          -reservation.quantity,
          {
            reason,
            source: 'order',
            orderId: reservation.orderId,
          }
        );

        // Update reservation status using Document Service API
        const updatedReservation = await strapi.documents(
          'api::stock-reservation.stock-reservation'
        ).update({
          documentId: reservationId,
          data: {
            status: 'completed',
            completedAt: new Date(),
            reason,
          },
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
    async cleanupExpiredReservations(): Promise<any> {
      try {
        const now = new Date();

        // Find expired reservations using Document Service API
        const expiredReservations = await strapi.documents(
          'api::stock-reservation.stock-reservation'
        ).findMany({
          filters: {
            status: 'active',
            expiresAt: { $lt: now },
          },
          populate: { product: true },
        });

        const results: Array<{
          reservationId: string;
          orderId: string;
          quantity: number;
          status: string;
        }> = [];

        const reservationData = expiredReservations;

        for (const reservation of reservationData) {
          try {
            await this.releaseReservation(
              reservation.documentId,
              'Automatic expiration'
            );

            // Mark as expired using Document Service API
            await strapi.documents(
              'api::stock-reservation.stock-reservation'
            ).update({
              documentId: reservation.documentId,
              data: { status: 'expired' },
            });

            results.push({
              reservationId: reservation.documentId,
              orderId: reservation.orderId,
              quantity: reservation.quantity,
              status: 'expired',
            });
          } catch (error) {
            strapi.log.error(
              `Error expiring reservation ${reservation.documentId}:`,
              error
            );
          }
        }

        return {
          processedCount: results.length,
          expiredReservations: results,
        };
      } catch (error) {
        strapi.log.error('Error cleaning up expired reservations:', error);
        throw error;
      }
    },

    /**
     * Get inventory analytics
     */
    async getInventoryAnalytics(
      filters: Record<string, any> = {}
    ): Promise<any> {
      try {
        // Get all inventory records with filters using Document Service API
        const inventoryResponse = await strapi.documents(
          'api::inventory.inventory'
        ).findMany({
          filters,
          populate: {
            product: true,
          },
        });

        const inventoryRecords = inventoryResponse;

        const totalProducts = inventoryRecords.length;
        const lowStockCount = inventoryRecords.filter(
          (inv: any) => inv.isLowStock
        ).length;
        const outOfStockCount = inventoryRecords.filter(
          (inv: any) => inv.quantity === 0
        ).length;
        const totalQuantity = inventoryRecords.reduce(
          (sum: number, inv: any) => sum + inv.quantity,
          0
        );
        const totalReserved = inventoryRecords.reduce(
          (sum: number, inv: any) => sum + inv.reserved,
          0
        );
        const totalAvailable = inventoryRecords.reduce(
          (sum: number, inv: any) => sum + inv.available,
          0
        );

        const lowStockPercentage =
          totalProducts > 0 ? (lowStockCount / totalProducts) * 100 : 0;
        const outOfStockPercentage =
          totalProducts > 0 ? (outOfStockCount / totalProducts) * 100 : 0;

        // Calculate total inventory value
        const totalValue = inventoryRecords.reduce((sum: number, inv: any) => {
          const price = inv.product?.price || 0;
          return sum + inv.quantity * price;
        }, 0);

        // Calculate average inventory per product
        const averageInventory =
          totalProducts > 0 ? totalQuantity / totalProducts : 0;

        // Get top low stock products
        const topLowStockProducts = inventoryRecords
          .filter((inv: any) => inv.isLowStock)
          .sort((a: any, b: any) => a.quantity - b.quantity)
          .slice(0, 10)
          .map((inv: any) => ({
            productId: inv.product.documentId,
            productTitle: inv.product.title,
            sku: inv.product.sku,
            currentQuantity: inv.quantity,
            threshold: inv.lowStockThreshold,
            shortfall: Math.max(0, inv.lowStockThreshold - inv.quantity),
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
          topLowStockProducts,
        };
      } catch (error) {
        strapi.log.error('Error getting inventory analytics:', error);
        throw error;
      }
    },

    /**
     * Trigger low stock alert
     */
    async triggerLowStockAlert(
      productId: string,
      currentQuantity: number,
      threshold: number
    ): Promise<{ alertSent: boolean; error?: string }> {
      try {
        strapi.log.warn(
          `Low stock alert: Product ${productId} has ${currentQuantity} units (threshold: ${threshold})`
        );

        // Here you would implement actual notification logic:
        // - Send email to administrators
        // - Create system notifications
        // - Integrate with external alerting systems
        // - Log to monitoring systems

        return { alertSent: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        strapi.log.error('Error sending low stock alert:', error);
        return { alertSent: false, error: errorMessage };
      }
    },
  })
);
