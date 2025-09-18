/**
 * Manual Payment Controller
 * 
 * Handles manual payment API endpoints following Strapi 5+ Document Service API patterns
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::manual-payment.manual-payment', ({ strapi }) => ({
  /**
   * Create manual payment order
   */
  async createOrder(ctx) {
    try {
      const { data } = ctx.request.body
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      // Validate required fields
      if (!data.orderId || !data.paymentMethodId || !data.amount) {
        return ctx.badRequest('Order ID, payment method ID, and amount are required')
      }

      const manualPaymentService = strapi.service('api::manual-payment.manual-payment')
      const result = await manualPaymentService.createManualPaymentOrder({
        orderId: data.orderId,
        userId: user.id,
        paymentMethodId: data.paymentMethodId,
        amount: data.amount,
        currency: data.currency,
        paymentNotes: data.paymentNotes
      })

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return ctx.created(result.data)
    } catch (error) {
      strapi.log.error('Error in createOrder:', error)
      return ctx.internalServerError('Failed to create manual payment order')
    }
  },

  /**
   * Confirm manual payment
   */
  async confirmPayment(ctx) {
    try {
      const { paymentId } = ctx.params
      const { data } = ctx.request.body
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      // Check if user is admin
      if (user.role.type !== 'admin') {
        return ctx.forbidden('Admin access required')
      }

      if (!paymentId) {
        return ctx.badRequest('Payment ID is required')
      }

      const manualPaymentService = strapi.service('api::manual-payment.manual-payment')
      
      // Get current payment
      const paymentResult = await manualPaymentService.getManualPayment(paymentId)
      if (!paymentResult.success) {
        return ctx.notFound('Payment not found')
      }

      const payment = paymentResult.data
      if (payment.status !== 'pending') {
        return ctx.badRequest('Payment is not in pending status')
      }

      // Update payment status to confirmed
      const updateResult = await manualPaymentService.updatePaymentStatus(
        paymentId,
        'confirmed',
        user.id
      )

      if (!updateResult.success) {
        return ctx.badRequest(updateResult.error)
      }

      // Add admin notes if provided
      if (data.adminNotes) {
        await strapi.documents('api::manual-payment.manual-payment').update({
          documentId: paymentId,
          data: {
            adminNotes: data.adminNotes
          }
        })
      }

      return ctx.ok(updateResult.data)
    } catch (error) {
      strapi.log.error('Error in confirmPayment:', error)
      return ctx.internalServerError('Failed to confirm payment')
    }
  },

  /**
   * Get payment review queue
   */
  async getReviewQueue(ctx) {
    try {
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      // Check if user is admin
      if (user.role.type !== 'admin') {
        return ctx.forbidden('Admin access required')
      }

      const { status, page = 1, pageSize = 25 } = ctx.query

      const manualPaymentService = strapi.service('api::manual-payment.manual-payment')
      
      let filters: any = {}
      if (status) {
        filters.status = status
      } else {
        filters.status = 'pending' // Default to pending payments
      }

      const payments = await strapi.documents('api::manual-payment.manual-payment').findMany({
        filters,
        populate: ['user', 'paymentMethod'],
        sort: 'createdAt:asc',
        limit: parseInt(pageSize as string),
        start: (parseInt(page as string) - 1) * parseInt(pageSize as string)
      })

      return ctx.ok(payments)
    } catch (error) {
      strapi.log.error('Error in getReviewQueue:', error)
      return ctx.internalServerError('Failed to get review queue')
    }
  },

  /**
   * Review manual payment
   */
  async reviewPayment(ctx) {
    try {
      const { paymentId } = ctx.params
      const { data } = ctx.request.body
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      // Check if user is admin
      if (user.role.type !== 'admin') {
        return ctx.forbidden('Admin access required')
      }

      if (!paymentId) {
        return ctx.badRequest('Payment ID is required')
      }

      if (!data.status || !['approved', 'rejected', 'requires_info'].includes(data.status)) {
        return ctx.badRequest('Valid status is required')
      }

      const manualPaymentService = strapi.service('api::manual-payment.manual-payment')
      
      // Get current payment
      const paymentResult = await manualPaymentService.getManualPayment(paymentId)
      if (!paymentResult.success) {
        return ctx.notFound('Payment not found')
      }

      const payment = paymentResult.data
      if (payment.status !== 'pending') {
        return ctx.badRequest('Payment is not in pending status')
      }

      // Map review status to payment status
      let paymentStatus = 'pending'
      switch (data.status) {
        case 'approved':
          paymentStatus = 'confirmed'
          break
        case 'rejected':
          paymentStatus = 'rejected'
          break
        case 'requires_info':
          paymentStatus = 'pending'
          break
      }

      // Update payment status
      const updateResult = await manualPaymentService.updatePaymentStatus(
        paymentId,
        paymentStatus,
        user.id
      )

      if (!updateResult.success) {
        return ctx.badRequest(updateResult.error)
      }

      // Add review notes
      if (data.reviewNotes) {
        await strapi.documents('api::manual-payment.manual-payment').update({
          documentId: paymentId,
          data: {
            adminNotes: data.reviewNotes
          }
        })
      }

      return ctx.ok(updateResult.data)
    } catch (error) {
      strapi.log.error('Error in reviewPayment:', error)
      return ctx.internalServerError('Failed to review payment')
    }
  },

  /**
   * Get manual payment by ID
   */
  async findOne(ctx) {
    try {
      const { documentId } = ctx.params
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      if (!documentId) {
        return ctx.badRequest('Payment ID is required')
      }

      const manualPaymentService = strapi.service('api::manual-payment.manual-payment')
      const result = await manualPaymentService.getManualPayment(documentId)

      if (!result.success) {
        return ctx.notFound('Payment not found')
      }

      // Check if user can access this payment
      const payment = result.data
      if (user.role.type !== 'admin' && payment.user.documentId !== user.id) {
        return ctx.forbidden('Access denied')
      }

      return ctx.ok(payment)
    } catch (error) {
      strapi.log.error('Error in findOne:', error)
      return ctx.internalServerError('Failed to get payment')
    }
  },

  /**
   * Get manual payments by order
   */
  async getByOrder(ctx) {
    try {
      const { orderId } = ctx.params
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      if (!orderId) {
        return ctx.badRequest('Order ID is required')
      }

      const manualPaymentService = strapi.service('api::manual-payment.manual-payment')
      const result = await manualPaymentService.getManualPaymentsByOrder(orderId)

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return ctx.ok(result.data)
    } catch (error) {
      strapi.log.error('Error in getByOrder:', error)
      return ctx.internalServerError('Failed to get payments by order')
    }
  },

  /**
   * Cancel manual payment
   */
  async cancelPayment(ctx) {
    try {
      const { paymentId } = ctx.params
      const { data } = ctx.request.body
      const { user } = ctx.state

      if (!user) {
        return ctx.unauthorized('Authentication required')
      }

      if (!paymentId) {
        return ctx.badRequest('Payment ID is required')
      }

      const manualPaymentService = strapi.service('api::manual-payment.manual-payment')
      
      // Get current payment
      const paymentResult = await manualPaymentService.getManualPayment(paymentId)
      if (!paymentResult.success) {
        return ctx.notFound('Payment not found')
      }

      const payment = paymentResult.data
      
      // Check if user can cancel this payment
      if (user.role.type !== 'admin' && payment.user.documentId !== user.id) {
        return ctx.forbidden('Access denied')
      }

      // Only allow cancellation of pending payments
      if (payment.status !== 'pending') {
        return ctx.badRequest('Only pending payments can be cancelled')
      }

      const result = await manualPaymentService.cancelManualPayment(
        paymentId,
        data.reason
      )

      if (!result.success) {
        return ctx.badRequest(result.error)
      }

      return ctx.ok(result.data)
    } catch (error) {
      strapi.log.error('Error in cancelPayment:', error)
      return ctx.internalServerError('Failed to cancel payment')
    }
  }
}))
