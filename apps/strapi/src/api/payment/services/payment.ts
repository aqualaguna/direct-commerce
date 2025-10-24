import { Core } from "@strapi/strapi"
import { UserType } from "../../../../config/constant";


export default ({ strapi }: { strapi: Core.Strapi }) => ({
    async createPayment(orderId: string, userId: string, data: any, isGuest: boolean) {
        try {
            const payment = await strapi.db.transaction(async ({ commit }) => {
                const paymentData = {
                    ...data,
                    order: orderId,
                };
                
                // Only add user field for authenticated users
                if (!isGuest) {
                    paymentData.user = userId;
                }
                
                const payment = await strapi.documents('api::payment.payment').create({
                    data: paymentData
                });
                // create payment confirmation 
                const paymentConfirmationService = strapi.service('api::payment.payment-confirmation');
                const result = await paymentConfirmationService.createPaymentConfirmation({
                    payment: payment.documentId,
                    confirmationType: payment.paymentType,
                    confirmationMethod: payment.paymentType === 'manual' ? 'admin_dashboard' : 'api_call',
                });
                if (!result.success) {
                    throw new Error(result.error)
                }
                // create order history
                const orderHistoryService = strapi.service('api::order.order-history');
                await orderHistoryService.recordPaymentUpdate(orderId, null, payment, isGuest ? null : userId, 'payment_gateway');
                await commit();
                // get latest payment
                const latestPayment = await strapi.documents('api::payment.payment').findOne({
                    documentId: payment.documentId,
                    populate: {
                        paymentConfirmation: true,
                        order: true,
                        user: true,
                        paymentMethod: true,
                    }
                });
                return latestPayment;
            })
            return payment;
        } catch (error) {
            strapi.log.error('Error in createPayment:', error)
            throw error
        }
    },
    async confirmManualPayment(paymentId: string, data: any, userType: UserType, userId: string) {
        try {
            const payment = await strapi.documents('api::payment.payment').findOne({
                documentId: paymentId,
                populate: {
                    paymentConfirmation: true
                }
            })
            if (!payment) {
                throw new Error('Payment not found')
            }
            if (!payment.paymentConfirmation) {
                throw new Error('Payment confirmation not found')
            }
            // check payment status
            if (payment.status !== 'pending') {
                throw new Error('Payment is not pending')
            }
            // check payment confirmation status
            if (payment.paymentConfirmation.confirmationStatus !== 'pending') {
                throw new Error('Payment confirmation is not pending')
            }
            // update payment confirmation
            const paymentConfirmationService = strapi.service('api::payment.payment-confirmation');
            const result = await paymentConfirmationService.confirmPaymentManually(
                payment.paymentConfirmation.documentId,
                userType === UserType.API_TOKEN ? 'api_token' : userId,
                data.confirmationNotes,
                data.confirmationEvidence,
                data.attachments
            );
            if (!result.success) {
                throw new Error(result.error)
            }
            return result.data;
            
        } catch (error) {
            strapi.log.error('Error in confirmManualPayment:', error)
            throw error
        }
    }
})