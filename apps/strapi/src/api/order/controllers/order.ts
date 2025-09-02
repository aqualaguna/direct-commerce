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
   * Create order from cart
   */
  async create(ctx) {
    try {
      const { cartId, checkoutSessionId, paymentIntentId, customerNotes, giftOptions, promoCode, source, metadata } = ctx.request.body;
      const userId = ctx.state.user?.id;

      const orderCreationService = strapi.service('api::order.order-creation');
      const order = await orderCreationService.createOrderFromCart({
        cartId,
        checkoutSessionId,
        paymentIntentId,
        customerNotes,
        giftOptions,
        promoCode,
        source: source || 'web',
        metadata
      }, userId);

      return ctx.created(order);
    } catch (error) {
      strapi.log.error('Error creating order:', error);
      return ctx.badRequest(error.message);
    }
  },

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
        pagination: {
          page: parseInt(page),
          pageSize: Math.min(parseInt(pageSize), 100)
        },
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
          'cart',
          'checkoutSession',
          'items',
          'items.productListing',
          'items.productListingVariant',
          'manualPayment'
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
   * Update order
   */
  async update(ctx) {
    try {
      const { documentId } = ctx.params;
      const { data } = ctx.request.body;
      const userId = ctx.state.user?.id;

      // Check if user can update this order
      const existingOrder = await strapi.documents('api::order.order').findOne({
        documentId,
        populate: ['user']
      });

      if (!existingOrder) {
        return ctx.notFound('Order not found');
      }

      if (existingOrder.user?.documentId !== userId && ctx.state.user?.role?.type !== 'admin') {
        return ctx.forbidden('Access denied');
      }

      // Only allow certain fields to be updated
      const allowedFields = ['customerNotes', 'adminNotes', 'tags', 'metadata'];
      const updateData = {};

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updateData[field] = data[field];
        }
      }

      const order = await strapi.documents('api::order.order').update({
        documentId,
        data: updateData,
        populate: ['user', 'items']
      });

      return ctx.send(order);
    } catch (error) {
      strapi.log.error('Error updating order:', error);
      return ctx.badRequest('Error updating order');
    }
  },

  /**
   * Delete order (admin only)
   */
  async delete(ctx) {
    try {
      const { documentId } = ctx.params;

      // Only admins can delete orders
      if (ctx.state.user?.role?.type !== 'admin') {
        return ctx.forbidden('Access denied');
      }

      const order = await strapi.documents('api::order.order').findOne({
        documentId,
        populate: ['items']
      });

      if (!order) {
        return ctx.notFound('Order not found');
      }

      // Delete order items first
      if (order.items) {
        for (const item of order.items) {
          await strapi.documents('api::order-item.order-item').delete({
            documentId: item.documentId
          });
        }
      }

      // Delete order
      await strapi.documents('api::order.order').delete({
        documentId
      });

      return ctx.send({ message: 'Order deleted successfully' });
    } catch (error) {
      strapi.log.error('Error deleting order:', error);
      return ctx.internalServerError('Error deleting order');
    }
  },

  /**
   * Update order status
   */
  async updateStatus(ctx) {
    try {
      const { documentId } = ctx.params;
      const { status, reason, notes } = ctx.request.body;

      // Only admins can update order status
      if (ctx.state.user?.role?.type !== 'admin') {
        return ctx.forbidden('Access denied');
      }

      const order = await strapi.documents('api::order.order').findOne({
        documentId
      });

      if (!order) {
        return ctx.notFound('Order not found');
      }

      // Validate status transition
      const validTransitions = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['processing', 'cancelled'],
        processing: ['shipped', 'cancelled'],
        shipped: ['delivered', 'cancelled'],
        delivered: ['refunded'],
        cancelled: [],
        refunded: []
      };

      const allowedTransitions = validTransitions[order.status] || [];
      if (!allowedTransitions.includes(status)) {
        return ctx.badRequest(`Invalid status transition from ${order.status} to ${status}`);
      }

      const updateData = {
        status,
        adminNotes: notes ? `${order.adminNotes || ''}\n[${new Date().toISOString()}] Status changed to ${status}: ${notes}`.trim() : order.adminNotes
      };

      const updatedOrder = await strapi.documents('api::order.order').update({
        documentId,
        data: updateData,
        populate: ['user', 'items']
      });

      return ctx.send(updatedOrder);
    } catch (error) {
      strapi.log.error('Error updating order status:', error);
      return ctx.badRequest('Error updating order status');
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
        sort: { createdAt: 'desc' },
        pagination: {
          page: parseInt(page),
          pageSize: Math.min(parseInt(pageSize), 100)
        },
        populate: ['items']
      });

      return ctx.send(orders);
    } catch (error) {
      strapi.log.error('Error searching orders:', error);
      return ctx.internalServerError('Error searching orders');
    }
  }
};
