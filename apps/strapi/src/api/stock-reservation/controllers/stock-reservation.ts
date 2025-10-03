/**
 * stock-reservation controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::stock-reservation.stock-reservation' as any,
  ({ strapi }) => ({
    // Core CRUD operations are automatically available
    // Custom methods below
  async create(ctx) {
    try {
      // Create the reservation using the core controller
      const reservation = await super.create(ctx);
      
      // Update inventory and create history record
      try {
        // Get product ID from the original request data
        const productId = ctx.request.body.data?.product;
        const quantityToReserve = ctx.request.body.data?.quantity;
        
        if (!productId) {
          strapi.log.error('Product ID not found in reservation data');
          return ctx.badRequest('Product ID is required for stock reservation');
        }
        
        if (!quantityToReserve) {
          strapi.log.error('Quantity not found in reservation data');
          return ctx.badRequest('Quantity is required for stock reservation');
        }
        
        // Get current inventory for the product
        let inventory;
        try {
          inventory = await strapi.documents('api::inventory.inventory').findFirst({
            filters: { 
              product: {
                documentId: productId
              }
            }
          });
        } catch (queryError) {
          strapi.log.error('Error querying inventory:', queryError);
          // Delete the reservation if inventory query fails
          try {
            const reservationId = reservation.data?.documentId || reservation.documentId;
            await strapi.documents('api::stock-reservation.stock-reservation').delete({
              documentId: reservationId
            });
          } catch (deleteError) {
            strapi.log.error('Error deleting reservation after inventory query failure:', deleteError);
          }
          return ctx.badRequest('Failed to query inventory for the product');
        }
        
        if (!inventory) {
          strapi.log.warn(`No inventory found for product ${productId}, attempting to initialize...`);
          
          // Try to initialize inventory for the product
          try {
            const newInventory = await strapi.documents('api::inventory.inventory').create({
              data: {
                product: productId,
                quantity: 0,
                reserved: 0,
                lowStockThreshold: 10,
                available: 0,
                lastUpdated: new Date(),
                updatedBy: ctx.state?.user?.id || null,
              }
            });
            
            strapi.log.info(`Inventory initialized for product ${productId}`);
            inventory = newInventory;
          } catch (initError) {
            strapi.log.error('Error initializing inventory:', initError);
            // Delete the reservation if inventory initialization fails
            try {
              const reservationId = reservation.data?.documentId || reservation.documentId;
              await strapi.documents('api::stock-reservation.stock-reservation').delete({
                documentId: reservationId
              });
            } catch (deleteError) {
              strapi.log.error('Error deleting reservation after inventory init failure:', deleteError);
            }
            return ctx.badRequest(`Failed to initialize inventory for product ${productId}`);
          }
        }
        
        // Check if there's enough stock available
        const availableStock = inventory.quantity - inventory.reserved;
        if (availableStock < quantityToReserve) {
          // Delete the reservation if insufficient stock
          await strapi.documents('api::stock-reservation.stock-reservation').delete({
            documentId: reservation.data.documentId
          });
          return ctx.badRequest(`Insufficient stock. Available: ${availableStock}, Requested: ${quantityToReserve}`);
        }
        
        // Update inventory: increase reserved quantity
        const updatedInventory = await strapi.documents('api::inventory.inventory').update({
          documentId: inventory.documentId,
          data: {
            reserved: inventory.reserved + quantityToReserve
          }
        });
        
        // Create inventory history record
        const orderId = reservation.data?.orderId || reservation.orderId;
        const customerId = reservation.data?.customer || reservation.customer;
        
        const historyData = {
          product: productId,
          action: 'reserve' as const,
          quantityBefore: inventory.quantity,
          quantityAfter: inventory.quantity, // Available quantity doesn't change
          quantityChanged: 0,
          reservedBefore: inventory.reserved,
          reservedAfter: updatedInventory.reserved,
          reason: `Stock reserved for order ${orderId}`,
          source: 'manual' as const,
          orderId: orderId,
          customerId: customerId,
          changedBy: ctx.state?.user?.id || null,
          timestamp: new Date().toISOString()
        };

        await strapi.documents('api::inventory-history.inventory-history').create({
          data: historyData
        });

        const reservationId = reservation.data?.documentId || reservation.documentId;
        strapi.log.info(`Inventory updated and history record created for reservation ${reservationId}`);
      } catch (inventoryError) {
        // If inventory update fails, delete the reservation
        try {
          const reservationId = reservation.data?.documentId || reservation.documentId;
          await strapi.documents('api::stock-reservation.stock-reservation').delete({
            documentId: reservationId
          });
        } catch (deleteError) {
          strapi.log.error('Error deleting reservation after inventory failure:', deleteError);
        }
        
        strapi.log.error('Error updating inventory for reservation:', inventoryError);
        ctx.throw(500, 'Failed to update inventory for reservation');
      }
      
      return reservation;
    } catch (error) {
      strapi.log.error('Error creating reservation:', error);
      
      // Check if it's a validation error (400) and let it pass through
      if (error.status === 400 || error.name === 'ValidationError' || error.message?.includes('validation')) {
        throw error; // Re-throw validation errors as-is
      }
      
      ctx.throw(500, 'Failed to create reservation');
    }
  },
  async completeReservation(ctx) {
    try {
      const { id } = ctx.params;
      const { reason } = ctx.request.body;
      
      const reservation = await strapi.documents('api::stock-reservation.stock-reservation').update({
        documentId: id,
        data: {
          status: 'completed',
          completedAt: new Date().toISOString(),
          reason: reason || 'Reservation completed'
        }
      });
      
      return reservation;
    } catch (error) {
      strapi.log.error('Error completing reservation:', error);
      ctx.throw(500, 'Failed to complete reservation');
    }
  },
  
  async cancelReservation(ctx) {
    try {
      const { id } = ctx.params;
      const { reason } = ctx.request.body;
      
      const reservation = await strapi.documents('api::stock-reservation.stock-reservation').update({
        documentId: id,
        data: {
          status: 'cancelled',
          reason: reason || 'Reservation cancelled'
        }
      });
      
      return reservation;
    } catch (error) {
      strapi.log.error('Error cancelling reservation:', error);
      ctx.throw(500, 'Failed to cancel reservation');
    }
  },
  
  async expireReservation(ctx) {
    try {
      const { id } = ctx.params;
      const { reason } = ctx.request.body;
      
      const reservation = await strapi.documents('api::stock-reservation.stock-reservation').update({
        documentId: id,
        data: {
          status: 'expired',
          reason: reason || 'Reservation expired'
        }
      });
      
      return reservation;
    } catch (error) {
      strapi.log.error('Error expiring reservation:', error);
      ctx.throw(500, 'Failed to expire reservation');
    }
  },
  
  async bulkComplete(ctx) {
    try {
      const { reservationIds, reason } = ctx.request.body;
      
      if (!Array.isArray(reservationIds)) {
        return ctx.badRequest('reservationIds must be an array');
      }
      
      const results = await Promise.all(
        reservationIds.map(id => 
          strapi.documents('api::stock-reservation.stock-reservation').update({
            documentId: id,
            data: {
              status: 'completed',
              completedAt: new Date().toISOString(),
              reason: reason || 'Bulk completion'
            }
          })
        )
      );
      
      return { results, count: results.length };
    } catch (error) {
      strapi.log.error('Error in bulk complete:', error);
      ctx.throw(500, 'Failed to complete reservations');
    }
  },
  
  async bulkCancel(ctx) {
    try {
      const { reservationIds, reason } = ctx.request.body;
      
      if (!Array.isArray(reservationIds)) {
        return ctx.badRequest('reservationIds must be an array');
      }
      
      const results = await Promise.all(
        reservationIds.map(id => 
          strapi.documents('api::stock-reservation.stock-reservation').update({
            documentId: id,
            data: {
              status: 'cancelled',
              reason: reason || 'Bulk cancellation'
            }
          })
        )
      );
      
      return { results, count: results.length };
    } catch (error) {
      strapi.log.error('Error in bulk cancel:', error);
      ctx.throw(500, 'Failed to cancel reservations');
    }
  },
  
  async getAnalytics(ctx) {
    try {
      const { startDate, endDate } = ctx.query;
      
      const filters : any = {};
      if (startDate && endDate) {
        filters.createdAt = {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        };
      }
      
      const reservations = await strapi.documents('api::stock-reservation.stock-reservation').findMany({
        filters,
        pagination: { pageSize: 1000 }
      });
      
      const analytics = {
        total: reservations.length,
        active: reservations.filter(r => r.status === 'active').length,
        completed: reservations.filter(r => r.status === 'completed').length,
        cancelled: reservations.filter(r => r.status === 'cancelled').length,
        expired: reservations.filter(r => r.status === 'expired').length,
        totalQuantity: reservations.reduce((sum, r) => sum + r.quantity, 0),
        averageQuantity: reservations.length > 0 ? 
          reservations.reduce((sum, r) => sum + r.quantity, 0) / reservations.length : 0
      };
      
      return analytics;
    } catch (error) {
      strapi.log.error('Error getting analytics:', error);
      ctx.throw(500, 'Failed to get analytics');
    }
  },
  
  async getExpired(ctx) {
    try {
      const now = new Date();
      
      const expired = await strapi.documents('api::stock-reservation.stock-reservation').findMany({
        filters: {
          status: 'active',
          expiresAt: { $lt: now }
        },
        sort: { expiresAt: 'desc' }
      });
      
      return expired;
    } catch (error) {
      strapi.log.error('Error getting expired reservations:', error);
      ctx.throw(500, 'Failed to get expired reservations');
    }
  },
  
  async getExpiringSoon(ctx) {
    try {
      const { hours = 24 } = ctx.query;
      const now = new Date();
      const expiringSoon = new Date(now.getTime() + (hours as any * 60 * 60 * 1000));
      
      const expiring = await strapi.documents('api::stock-reservation.stock-reservation').findMany({
        filters: {
          status: 'active',
          expiresAt: {
            $gte: now,
            $lte: expiringSoon
          }
        },
        sort: { expiresAt: 'asc' }
      });
      
      return expiring;
    } catch (error) {
      strapi.log.error('Error getting expiring reservations:', error);
      ctx.throw(500, 'Failed to get expiring reservations');
    }
  },
  
  async cleanupExpired(ctx) {
    try {
      const now = new Date();
      
      const expired = await strapi.documents('api::stock-reservation.stock-reservation').findMany({
        filters: {
          status: 'active',
          expiresAt: { $lt: now }
        }
      });
      
      const results = await Promise.all(
        expired.map(reservation => 
          strapi.documents('api::stock-reservation.stock-reservation').update({
            documentId: reservation.documentId,
            data: {
              status: 'expired',
              reason: 'Auto-expired by cleanup process'
            }
          })
        )
      );
      
      return { 
        message: `Cleaned up ${results.length} expired reservations`,
        count: results.length,
        results 
      };
    } catch (error) {
      strapi.log.error('Error cleaning up expired reservations:', error);
      ctx.throw(500, 'Failed to cleanup expired reservations');
    }
  }
  })
);
