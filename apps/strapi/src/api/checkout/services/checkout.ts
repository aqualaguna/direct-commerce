import { Core } from "@strapi/strapi"
import { CheckoutCreateData } from "./validation";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
    async createCheckout(data: CheckoutCreateData) {
        // track what created
        
        try {
            const checkoutData : any = {
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
                status: 'active',
                paymentMethod: data.paymentMethod,
                shippingAddress: data.shippingAddress,
                billingAddress: data.billingAddress,
                shippingMethod: data.shippingMethod,
                metadata: data.metadata,
                guestCheckout: data.guestCheckout,
                user: data.user,
                sessionId: data.sessionId,
            };
            const checkout = await strapi.documents('api::checkout.checkout-session').create({
                data: checkoutData
            })
            return checkout;
        } catch (error) {
            console.error('Error creating checkout:', error);
            strapi.log.error('Error creating checkout:', error);
            throw error;
        }
    },
})