/**
 * Order Controller
 * Handles order CRUD operations and management
 */
import { Core } from "@strapi/strapi"
import { UserType } from "../../../../config/constant";
import { Context } from 'koa'



export default ({ strapi }: { strapi: Core.Strapi }) => ({


  /**
   * Get user orders
   */
  async find(ctx: Context) {
    try {
      const { query } = ctx;
      const { user, userType } = ctx.state;
      const sessionId = ctx?.request?.query?.sessionId || ctx?.request?.body?.sessionId;

      let userId;
      if (userType === UserType.AUTHENTICATED) {
        userId = user.id;
      } else {
        userId = sessionId;
      }
      const validationService = strapi.service('api::order.validation');
      const validationResult = await validationService.validateFindOrderData(query, userType, userId);
      if (!validationResult.isValid) {
        return ctx.badRequest('Validation errors ', validationResult.errors);
      }
      const filters = validationResult.data;
      const pagination = {
        page: Math.max(1, parseInt(String(query.page || '1')) || 1),
        pageSize: Math.min(
          Math.max(1, parseInt(String(query.pageSize || '25')) || 25),
          1000
        ),
      }
      // Get orders with pagination
      const orders = await strapi.documents('api::order.order').findMany({
        filters,
        limit: pagination.pageSize,
        start: (pagination.page - 1) * pagination.pageSize,
        populate: ['user', 'items.productListing', 'items.variant',]
      });

      // Get total count for pagination
      const totalOrders = await strapi.documents('api::order.order').count({ filters: filters as any });

      // Get status counts for analytics
      const statusCounts = await Promise.all([
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'pending' } as any }),
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'confirmed' } as any }),
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'processing' } as any }),
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'shipping' } as any }),
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'delivered' } as any }),
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'cancelled' } as any }),
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'refunded' } as any }),
        strapi.documents('api::order.order').count({ filters: { ...filters, status: 'returned' } as any }),
      ]);

      return {
        data: orders,
        meta: {
          pagination: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(totalOrders / pagination.pageSize),
            total: totalOrders
          },
          statusCounts: {
            pending: statusCounts[0],
            confirmed: statusCounts[1],
            processing: statusCounts[2],
            shipping: statusCounts[3],
            delivered: statusCounts[4],
            cancelled: statusCounts[5],
            refunded: statusCounts[6],
            returned: statusCounts[7]
          }
        }
      };
    } catch (error) {
      strapi.log.error('Error fetching orders:', error);
      return ctx.badRequest('Failed to fetch orders');
    }
  },


  /**
 * Get user orders
 */
  async findByStatus(ctx: Context) {
    try {
      const { query } = ctx;
      const { user, userType } = ctx.state;
      const sessionId = ctx?.request?.query?.sessionId || ctx?.request?.body?.sessionId;
      const { status } = ctx.params;
      // validate status
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled', 'refunded'];
      if (!validStatuses.includes(status)) {
        return ctx.badRequest('Invalid status');
      }
      let userId;
      if (userType === UserType.AUTHENTICATED) {
        userId = user.id;
      } else {
        userId = sessionId;
      }
      const validationService = strapi.service('api::order.validation');
      const validationResult = await validationService.validateFindOrderData(query, userType, userId);
      if (!validationResult.isValid) {
        return ctx.badRequest('Validation errors ', validationResult.errors);
      }
      const filters = {
        ...validationResult.data,
        status: status,
      };
      const pagination = {
        page: Math.max(1, parseInt(String(query.page || '1')) || 1),
        pageSize: Math.min(
          Math.max(1, parseInt(String(query.pageSize || '25')) || 25),
          1000
        ),
      }
      // Get orders with pagination
      const orders = await strapi.documents('api::order.order').findMany({
        filters,
        limit: pagination.pageSize,
        start: (pagination.page - 1) * pagination.pageSize,
        populate: ['user', 'items.productListing', 'items.variant',]
      });

      // Get total count for pagination
      const totalOrders = await strapi.documents('api::order.order').count({ filters: filters as any });

      return {
        data: orders,
        meta: {
          pagination: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(totalOrders / pagination.pageSize),
            total: totalOrders
          }
        }
      };
    } catch (error) {
      strapi.log.error('Error fetching orders by status:', error);
      return ctx.badRequest('Failed to fetch orders by status');
    }
  },

  /**
   * Get order by ID
   */
  async findOne(ctx) {
    try {
      const { documentId } = ctx.params;
      const { user, userType } = ctx.state;
      const sessionId = ctx?.request?.query?.sessionId || ctx?.request?.body?.sessionId;

      let userId;
      if (userType === UserType.AUTHENTICATED) {
        userId = user.id;
      } else {
        userId = sessionId;
      }

      const order = await strapi.documents('api::order.order').findOne({
        documentId,
        populate: [
          'user',
          'items.variant',
          'items.productListing',
          'payments'
        ]
      });

      if (!order) {
        return ctx.notFound('Order not found');
      }

      // Check if user can access this order
      if (userType === UserType.AUTHENTICATED && order.user?.id !== userId) {
        return ctx.forbidden('Access denied You are not authorized to access this order');
      }
      if (userType === UserType.GUEST && order.sessionId && order.sessionId !== sessionId) {
        return ctx.forbidden('Access denied You are not authorized to access this order');
      }
      return {
        data: order,
        meta: {
          message: 'Order found successfully'
        }
      };
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
      const { user, userType } = ctx.state;
      const sessionId = ctx?.request?.query?.sessionId || ctx?.request?.body?.sessionId;
      const {cancelReason = 'Customer request'} = ctx.request.body;
      let userId;
      if (userType === UserType.AUTHENTICATED) {
        userId = user.id;
      } else {
        userId = sessionId;
      }
      // validate order
      const order = await strapi.documents('api::order.order').findOne({
        documentId,
        populate: ['user', 'items.variant', 'items.productListing', 'payments']
      });
      if (!order) {
        return ctx.notFound('Order not found');
      }
      // check if user own the order
      if (userType === UserType.AUTHENTICATED && order.user?.id !== userId) {
        return ctx.forbidden('Access denied You are not authorized to cancel this order');
      }
      if (userType === UserType.GUEST && order.sessionId && order.sessionId !== sessionId) {
        return ctx.forbidden('Access denied You are not authorized to cancel this order');
      }
      // validate order status
      const orderStatusService = strapi.service('api::order.order-status');
      const result = await orderStatusService.validateStatusUpdate(order.status, 'cancelled');
      if (!result.isValid) {
        return ctx.badRequest('Validation errors ', result.errors);
      }
      // cancel order
      const orderUpdated = await strapi.documents('api::order.order').update({
        documentId,
        data: {
          status: 'cancelled',
        }
      });
      // create order history
      const orderHistoryService = strapi.service('api::order.order-history');
      await orderHistoryService.recordStatusChange(documentId, order.status, 'cancelled', userType === UserType.AUTHENTICATED ? userId : null, cancelReason);

      return {
        data: orderUpdated,
        meta: {
          message: 'Order cancelled successfully'
        }
      };
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
      const { user, userType } = ctx.state;
      const {refundReason = 'Customer request'} = ctx.request.body;
      const sessionId = ctx?.request?.query?.sessionId || ctx?.request?.body?.sessionId;

      let userId;
      if (userType === UserType.AUTHENTICATED) {
        userId = user.id;
      } else {
        userId = sessionId;
      }
      // validate order
      const order = await strapi.documents('api::order.order').findOne({
        documentId,
        populate: ['user', 'items.variant', 'items.productListing', 'payments']
      });
      if (!order) {
        return ctx.notFound('Order not found');
      }
      // check if user own the order
      if (userType === UserType.AUTHENTICATED && order.user?.id !== userId) {
        return ctx.forbidden('Access denied You are not authorized to refund this order');
      }
      if (userType === UserType.GUEST && order.sessionId && order.sessionId !== sessionId) {
        return ctx.forbidden('Access denied You are not authorized to refund this order');
      }
      // validate order status
      const orderStatusService = strapi.service('api::order.order-status');
      const result = await orderStatusService.validateStatusUpdate(order.status, 'refunded');
      if (!result.isValid) {
        return ctx.badRequest('Validation errors ', result.errors);
      }
      // refund order
      const orderUpdated = await strapi.documents('api::order.order').update({
        documentId,
        data: {
          status: 'refunded',
          paymentStatus: 'refunded',
        }
      });
      // create order history
      const orderHistoryService = strapi.service('api::order.order-history');
      await orderHistoryService.recordStatusChange(documentId, order.status, 'refunded', userType === UserType.AUTHENTICATED ? userId : null, refundReason);
      // update payment status
      // find all payments for this order and update the status to refunded
      const payments = await strapi.documents('api::payment.payment').findMany({
        filters: {
          order: {
            documentId: documentId,
          }
        }
      });
      for (const payment of payments) {
        await strapi.documents('api::payment.payment').update({
          documentId: payment.documentId,
          data: {
            status: 'refunded',
          }
        });
      }
      return {
        data: orderUpdated,
        meta: {
          message: 'Order refunded successfully'
        }
      };
    } catch (error) {
      strapi.log.error('Error refunding order:', error);
      return ctx.internalServerError('Error refunding order');
    }
  }
});