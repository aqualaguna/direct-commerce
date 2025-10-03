import { z } from 'zod';
const checkoutCreateSchema = z.object({
    shippingAddress: z.string(),
    billingAddress: z.string(),
    shippingMethod: z.string(),
    paymentMethod: z.string(),
    status: z.enum(['active', 'completed', 'abandoned', 'expired']).optional(),
    metadata: z.object({}).optional(),
    completedAt: z.string().optional(),
    abandonedAt: z.string().optional(),
    expiresAt: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    guestCheckout: z.string().optional(),
    cartItems: z.array(z.string()),
})

export type CheckoutCreateData = z.infer<typeof checkoutCreateSchema> & {
    user: any,
    sessionId: any,
}

export default ({ strapi }: { strapi: any }) => ({
    async validateCheckoutData(data: any, userId: any, isGuest: boolean) {
        const errors: string[] = [];
        const validatedData: any = {};
        
        // Validate the input data against the schema
        const result = checkoutCreateSchema.safeParse(data);
        
        if (!result.success) {
            // Add schema validation errors
            result.error.issues.forEach(error => {
                errors.push(`${error.path.join('.')}: ${error.message}`);
            });
        } else {
            // If schema validation passed, use the validated data
            Object.assign(validatedData, result.data);
        }
        // set early return for next validation is expensive operation
        if (errors.length > 0) {
            return {
                isValid: false,
                errors: errors,
                data: validatedData,
            }
        }

        // Set user/session based on authentication type
        if (isGuest) {
            validatedData.sessionId = userId;
        } else {
            validatedData.user = userId;
        }

        // Set default values
        validatedData.status = validatedData.status || 'active';
        validatedData.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days from now
        validatedData.createdAt = new Date();
        validatedData.updatedAt = new Date();

        if (validatedData.cartItems && validatedData.cartItems.length === 0) {
            errors.push('Cart items are required for checkout');
        }

        // Validate addresses exist and belong to the user
        if (validatedData.shippingAddress) {
            try {
                const shippingAddress = await strapi.documents('api::address.address').findOne({
                    documentId: validatedData.shippingAddress,
                    populate: ['user']
                });
                
                if (!shippingAddress) {
                    errors.push('Shipping address not found');
                } else {
                    // Check ownership
                    const addressOwner = isGuest ? shippingAddress.sessionId : shippingAddress.user?.id;
                    if (addressOwner !== userId) {
                        errors.push('Shipping address does not belong to the requesting user');
                    }
                }
            } catch (error) {
                errors.push('Error validating shipping address ' + error.message);
            }
        }

        if (validatedData.billingAddress) {
            try {
                const billingAddress = await strapi.documents('api::address.address').findOne({
                    documentId: validatedData.billingAddress,
                    populate: ['user']
                });
                
                if (!billingAddress) {
                    errors.push('Billing address not found');
                } else {
                    // Check ownership
                    const addressOwner = isGuest ? billingAddress.sessionId : billingAddress.user?.id;
                    if (addressOwner !== userId) {
                        errors.push('Billing address does not belong to the requesting user');
                    }
                }
            } catch (error) {
                errors.push('Error validating billing address ' + error.message);
            }
        }

        // Validate payment method exists and is active
        if (validatedData.paymentMethod) {
            try {
                const paymentMethod = await strapi.documents('api::basic-payment-method.basic-payment-method').findOne({
                    documentId: validatedData.paymentMethod
                });
                
                if (!paymentMethod) {
                    errors.push('Payment method not found');
                } else if (!paymentMethod.isActive) {
                    errors.push('Payment method is not active');
                }
            } catch (error) {
                errors.push('Error validating payment method ' + error.message);
            }
        }

        // Validate cart items exist and belong to the user
        if (validatedData.cartItems && validatedData.cartItems.length > 0) {
            try {
                const cartItems = await strapi.documents('api::cart-item.cart-item').findMany({
                    filters: {
                        documentId: {
                            $in: validatedData.cartItems
                        }
                    },
                    populate: ['cart.user', 'cart.sessionId']
                });
                
                // Check if all cart items were found
                const foundCartItemIds = cartItems.map(item => item.documentId);
                const missingCartItems = validatedData.cartItems.filter(id => !foundCartItemIds.includes(id));
                
                if (missingCartItems.length > 0) {
                    errors.push(`Cart items not found: ${missingCartItems.join(', ')}`);
                }
                
                // Check ownership for found cart items
                for (const cartItem of cartItems) {
                    const cartOwner = isGuest ? cartItem.cart.sessionId : cartItem.cart.user?.id;
                    if (cartOwner !== userId) {
                        errors.push(`Cart item ${cartItem.documentId} does not belong to the requesting user`);
                    }
                }
            } catch (error) {
                errors.push('Error validating cart items ' + error.message);
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            data: validatedData,
        }
    }
});