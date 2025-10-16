import { Core } from "@strapi/strapi"


export default ({ strapi }: { strapi: Core.Strapi }) => ({
    async validateCreatePayment(orderId: string, userId: string, data: any, isGuest: boolean) {
        const errors: string[] = [];
        const validatedData: any = {};
        // check if order exists
        const order = await strapi.documents('api::order.order').findOne({
            documentId: orderId,
            populate: {
                user: true,
                checkout: true
            }
        })
        
        if (!order) {
            errors.push('Order not found')
            return { isValid: false, errors, data: validatedData }
        }
        // order status must be pending
        if (order.status !== 'pending') {
            errors.push('Order status must be pending')
        }
        // payment status must be pending
        if (order.paymentStatus !== 'pending') {
            errors.push('Payment status must be pending')
        }
        // check if order owner is correct
        if (isGuest && order.checkout.sessionId !== userId) {
            errors.push('Order owner is not correct')
        } else if (!isGuest && order.user.id !== userId) {
            errors.push('Order owner is not correct')
        }
        // check if data is valid
        if (!data) {
            errors.push('Data is required')
            return { isValid: false, errors, data: validatedData }
        }
        
        // Check required fields
        if (!data.paymentMethod) {
            errors.push('Payment method is required')
        }
        if (!data.amount) {
            errors.push('Amount is required')
        }
        if (!data.currency) {
            errors.push('Currency is required')
        }
        if (!data.paymentType) {
            errors.push('Payment type is required')
        }
        
        // Return early if required fields are missing
        if (errors.length > 0) {
            return { isValid: false, errors, data: validatedData }
        }
        
        if(data.paymentMethod) {
            const paymentMethod = await strapi.documents('api::payment-method.payment-method').findOne({
                documentId: data.paymentMethod
            })
            if (!paymentMethod) {
                errors.push('Payment method not found')
            } else {
                // check if payment method is active
                if (!paymentMethod.isActive) {
                    errors.push('Payment method is not active')
                }
                validatedData.paymentMethod = paymentMethod;
            }
        }
        // amount must be greater than 0 and a number   
        if (data.amount) {
            if (typeof data.amount !== 'number' || data.amount <= 0) {
                errors.push('Amount must be a number greater than 0')
            }
            validatedData.amount = data.amount;
        }
        // currency must be a string and a has 3 characters
        if (data.currency) {
            if (typeof data.currency !== 'string' || data.currency.length !== 3) {
                errors.push('Currency must be a string and have 3 characters')
            }
            validatedData.currency = data.currency;
        }
        // payment type must be a string and a valid enum
        if (data.paymentType) {
            if (typeof data.paymentType !== 'string' || !['manual', 'automated'].includes(data.paymentType)) {
                errors.push('Payment type must be a string and a valid enum')
            }
            validatedData.paymentType = data.paymentType;
        }
        // gateway id must be a string
        if (data.gatewayId) {
            if (typeof data.gatewayId !== 'string') {
                errors.push('Gateway ID must be a string')
            }
            validatedData.gatewayId = data.gatewayId;
        }
        // payment notes must be a string
        if (data.paymentNotes) {
            if (typeof data.paymentNotes !== 'string') {
                errors.push('Payment notes must be a string')
            }
            validatedData.paymentNotes = data.paymentNotes;
        }
        // admin notes must be a string
        if (data.adminNotes) {
            if (typeof data.adminNotes !== 'string') {
                errors.push('Admin notes must be a string')
            }
            validatedData.adminNotes = data.adminNotes;
        }
        
        return { isValid: errors.length === 0, errors, data: validatedData }
    },
    async validateConfirmManualPayment(paymentId: string, data: any) {
        const errors: string[] = [];
        const validatedData: any = {};
        // check if payment exists
        const payment = await strapi.documents('api::payment.payment').findOne({
            documentId: paymentId,
            populate: {
                paymentConfirmation: true
            }
        })
        if (!payment) {
            errors.push('Payment not found')
            return { isValid: false, errors, data: validatedData }
        }
        // check if payment confirmation exists
        if (!payment.paymentConfirmation) {
            errors.push('Payment confirmation not found')
        }
         // check payment status
        if (payment.status !== 'pending') {
            errors.push('Payment is not pending')
        }
        // check payment confirmation status
        if (payment.paymentConfirmation && payment.paymentConfirmation.confirmationStatus !== 'pending') {
            errors.push('Payment confirmation is not pending')
        }
        // check if data is valid
        if (!data) {
            errors.push('Data is required')
        }
        
        return { isValid: errors.length === 0, errors, data: validatedData }
    }
})