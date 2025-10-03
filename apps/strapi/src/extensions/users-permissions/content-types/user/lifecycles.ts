import type { Core } from '@strapi/strapi';

/**
 * Lifecycle hooks for user content type to enforce ownership restrictions
 * and handle data deletion when user is deleted
 */
export default {

    async beforeDelete(event: any) {
        const { params, state } = event;
        const { where } = params;

        const resourceId = where?.id?.toString() || where?.documentId?.toString();

        if (!resourceId) {
            throw new Error('Resource ID is required.');
        }

        // Get user data BEFORE deletion for cleanup
        const { strapi } = event;
        if (strapi) {
            try {
                const userData = await strapi.db.query('plugin::users-permissions.user').findOne({
                    where: { id: Number(resourceId) },
                    populate: ['preferences', 'privacySettings', 'addresses', 'wishlist']
                });
                if (userData) {
                    // Store user data in the event for use in afterDelete
                    event.userDataForCleanup = userData;
                    // Delete related records (cascade deletion)
                    const deletedRecords: string[] = [];

                    // Delete user preferences
                    if (userData.preferences) {
                        try {
                            await strapi.documents('api::user-preference.user-preference').delete({
                                documentId: userData.preferences.documentId
                            });
                            deletedRecords.push('preferences');
                        } catch (error) {
                            console.error('Error deleting user preferences:', error);
                        }
                    }

                    // Delete privacy settings
                    if (userData.privacySettings) {
                        try {
                            await strapi.documents('api::privacy-setting.privacy-setting').delete({
                                documentId: userData.privacySettings.documentId
                            });
                            deletedRecords.push('privacy-settings');
                        } catch (error) {
                            console.error('Error deleting privacy settings:', error);
                        }
                    }

                    // Delete addresses
                    if (userData.addresses && userData.addresses.length > 0) {
                        try {
                            for (const address of userData.addresses) {
                                await strapi.documents('api::address.address').delete({
                                    documentId: address.documentId
                                });
                            }
                            deletedRecords.push(`${userData.addresses.length} addresses`);
                        } catch (error) {
                            console.error('Error deleting user addresses:', error);
                        }
                    }

                    // Clear wishlist (remove relations)
                    if (userData.wishlist && userData.wishlist.length > 0) {
                        try {
                            await strapi.documents('plugin::users-permissions.user').update({
                                documentId: resourceId,
                                data: { wishlist: [] }
                            });
                            deletedRecords.push(`wishlist (${userData.wishlist.length} items)`);
                        } catch (error) {
                            console.error('Error clearing wishlist:', error);
                        }
                    }

                    // Delete user cart and cart items
                    try {
                        const userCarts = await strapi.documents('api::cart.cart').findMany({
                            filters: { user: Number(resourceId) },
                            populate: { items: true }
                        });

                        for (const cart of userCarts) {
                            // Delete all cart items first
                            if (cart.items && cart.items.length > 0) {
                                for (const item of cart.items) {
                                    await strapi.documents('api::cart-item.cart-item').delete({
                                        documentId: item.documentId
                                    });
                                }
                                deletedRecords.push(`${cart.items.length} cart items`);
                            }

                            // Delete the cart
                            await strapi.documents('api::cart.cart').delete({
                                documentId: cart.documentId
                            });
                            deletedRecords.push('cart');
                        }
                    } catch (error) {
                        console.error('Error deleting user cart:', error);
                    }

                    // Log successful cleanup
                    console.info('User data cleanup completed:', {
                        userId: resourceId,
                        deletedRecords,
                        deletionDate: new Date().toISOString(),
                        gdprCompliant: true
                    });
                }
            } catch (error) {
                console.error('Error collecting user data for cleanup:', error);
            }
        }
    },
};

/**
 * Log data deletion for audit trail
 */
async function logDataDeletion(userId: string, strapi: any): Promise<void> {
    try {
        const logEntry = {
            userId,
            action: 'data-deletion',
            timestamp: new Date(),
            gdprCompliant: true
        };

        console.info('Data deletion logged:', logEntry);

        // Additional audit logging can be implemented here
        // For example, writing to a dedicated audit log table
        if (strapi && strapi.log) {
            strapi.log.info('Data deletion logged:', logEntry);
        }
    } catch (error) {
        console.error('Error logging data deletion:', error);
        if (strapi && strapi.log) {
            strapi.log.error('Error logging data deletion:', error);
        }
    }
}
