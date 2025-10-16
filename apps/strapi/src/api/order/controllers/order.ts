/**
 * Order Controller
 * Handles order CRUD operations and management
 */

type StrapiContext = {
  query: any;
  state: any;
  send: (data: any) => any;
  badRequest: (message: string) => any;
  unauthorized: (message: string) => any;
  internalServerError: (message: string) => any;
};

export default {

  /**
   * Get user orders
   */
  async find(ctx: StrapiContext) {
    try {
      const { query } = ctx;
      const { page = 1, pageSize = 25, status, startDate, endDate, user } = query;

      // Build filters
      const filters: any = {};
      
      if (user) {
        filters.user = user;
      }

      if (status) {
        filters.status = status;
      }

      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) {
          filters.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          filters.createdAt.$lte = new Date(endDate);
        }
      }

      // Get orders with pagination
      const orders = await strapi.documents('api::order.order').findMany({
        filters,
        limit: Math.min(parseInt(pageSize), 100),
        start: (parseInt(page) - 1) * Math.min(parseInt(pageSize), 100),
        populate: ['user', 'items', 'items.productListing']
      });

      // Get total count for pagination
      const totalOrders = await strapi.documents('api::order.order').count({ filters: filters as any });

      // Get status counts for analytics
      const statusCounts = await Promise.all([
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'pending' } as any }),
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'confirmed' } as any }),
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'processing' } as any }),
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'shipped' } as any }),
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'delivered' } as any }),
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'cancelled' } as any }),
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'refunded' } as any })
      ]);

      return {
        data: orders,
        meta: {
          pagination: {
            page: parseInt(page),
            pageSize: Math.min(parseInt(pageSize), 100),
            pageCount: Math.ceil(totalOrders / Math.min(parseInt(pageSize), 100)),
            total: totalOrders
          },
          statusCounts: {
            pending: statusCounts[0],
            confirmed: statusCounts[1],
            processing: statusCounts[2],
            shipped: statusCounts[3],
            delivered: statusCounts[4],
            cancelled: statusCounts[5],
            refunded: statusCounts[6]
          }
        }
      };
    } catch (error) {
      strapi.log.error('Error fetching orders:', error);
      return ctx.badRequest('Failed to fetch orders');
    }
  },

  /**
   * Get order by ID
   */
  async findOne(ctx) {
    try {
      const { documentId } = ctx.params;
      const userId = ctx.state.user?.id;

      const order = await strapi.documents('api::order.order').findOne({
        documentId,
        populate: [
          'user',
          'checkout',
          'items',
          'items.product',
          'items.variant',
          'items.productListing',
          'payments'
        ]
      });

      if (!order) {
        return ctx.notFound('Order not found');
      }

      // Check if user can access this order
      if (order.user?.documentId !== userId && ctx.state.user?.role?.type !== 'admin') {
        return ctx.forbidden('Access denied');
      }

      return ctx.send(order);
    } catch (error) {
      strapi.log.error('Error finding order:', error);
      return ctx.internalServerError('Error retrieving order');
    }
  },
  /**
   * Cancel order
   */
  async cancelOrder(ctx) {
    try {
      const { documentId } = ctx.params;
      const userId = ctx.state.user?.id;
      // return dummy data
      return ctx.send({
        message: 'Order cancelled'
      });
    } catch (error) {
      strapi.log.error('Error canceling order:', error);
      return ctx.internalServerError('Error canceling order');
    }
  },
  /**
   * Refund order
   */
  async refundOrder(ctx) {
    try {
      const { documentId } = ctx.params;
      const userId = ctx.state.user?.id;
    } catch (error) {
      strapi.log.error('Error refunding order:', error);
      return ctx.internalServerError('Error refunding order');
    }
  },
  /**
   * Get order statistics
   */
  async getStats(ctx) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) {
        return ctx.unauthorized('User not authenticated');
      }

      const filters = { user: userId };

      const totalOrders = await strapi.documents('api::order.order').count({filters});
      
      const statusCounts = await Promise.all([
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'pending' } as any }),
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'confirmed' } as any }),
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'processing' } as any }),
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'shipped' } as any }),
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'delivered' } as any }),
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'cancelled' } as any }),
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'refunded' } as any })
      ]);

      const stats = {
        totalOrders,
        statusCounts: {
          pending: statusCounts[0],
          confirmed: statusCounts[1],
          processing: statusCounts[2],
          shipped: statusCounts[3],
          delivered: statusCounts[4],
          cancelled: statusCounts[5],
          refunded: statusCounts[6]
        }
      };

      return ctx.send(stats);
    } catch (error) {
      strapi.log.error('Error getting order stats:', error);
      return ctx.internalServerError('Error retrieving order statistics');
    }
  },

  /**
   * Search orders
   */
  async search(ctx) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) {
        return ctx.unauthorized('User not authenticated');
      }

      const { q, page = 1, pageSize = 25 } = ctx.query;

      const filters = {
        user: userId
      };

      if (q) {
        (filters as any).$or = [
          { orderNumber: { $contains: q } },
          { customerNotes: { $contains: q } }
        ];
      }

      const orders = await strapi.documents('api::order.order').findMany({
        filters,
        sort: 'createdAt:desc',
        limit: Math.min(parseInt(pageSize), 100),
        start: (parseInt(page) - 1) * Math.min(parseInt(pageSize), 100),
        populate: ['items']
      });

      return ctx.send(orders);
    } catch (error) {
      strapi.log.error('Error searching orders:', error);
      return ctx.internalServerError('Error searching orders');
    }
  }
};
