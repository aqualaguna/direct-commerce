import { Core } from "@strapi/strapi"
import type { Context } from "koa"

interface GuestData {
    sessionId: string
    email: string
    cartId: string
    metadata: any
}

interface ConvertToUserData {
    username: string
    password: string
    email: string
    firstName: string
    lastName: string
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
    /**
     * Create a new guest
     */
    async create(ctx: Context) {
        try {
            const { sessionId, email, cartId, metadata } = ctx.request.body as GuestData

            // Validate required fields
            if (!sessionId || !cartId) {
                return ctx.badRequest('Missing required fields: sessionId, cartId')
            }
            const data = {
                sessionId,
                email,
                cartId,
                metadata
            };
            // Validate guest data
            const validation = await strapi.service('api::guest.guest').validateGuestData(data)

            if (!validation.isValid) {
                return ctx.badRequest('Validation failed', validation.errors)
            }

            // Create guest
            const guest = await strapi.service('api::guest.guest').createGuest(data)

            return {
                data: guest,
                meta: {
                    message: 'Guest created successfully'
                }
            }
        } catch (error) {
            strapi.log.error('Error creating guest:', error)
            return ctx.internalServerError(error.message || 'Failed to create guest')
        }
    },

    /**
     * Get guest by session ID
     */
    async findOne(ctx: Context) {
        try {
            const { sessionId } = ctx.params

            if (!sessionId) {
                return ctx.badRequest('Session ID is required')
            }

            const guest = await strapi.service('api::guest.guest').getGuest(sessionId)

            if (!guest) {
                return ctx.notFound('Guest not found')
            }

            return {
                data: guest,
                meta: {
                    message: 'Guest retrieved successfully'
                }
            }
        } catch (error) {
            strapi.log.error('Error getting guest:', error)
            return ctx.internalServerError('Failed to get guest')
        }
    },

    /**
     * Update guest
     */
    async update(ctx: Context) {
        try {
            const { sessionId } = ctx.params
            const updateData = ctx.request.body

            if (!sessionId) {
                return ctx.badRequest('Session ID is required')
            }
            // check if guest exists
            const guest = await strapi.service('api::guest.guest').getGuest(sessionId)
            if (!guest) {
                return ctx.notFound('Guest not found')
            }
            const updatedData = { ...guest, ...updateData };
            // Validate guest data
            const validation = await strapi.service('api::guest.guest').validateGuestData(updatedData, { isUpdate: true })

            if (!validation.isValid) {
                return ctx.badRequest('Validation failed', validation.errors)
            }


            const updatedGuest = await strapi.service('api::guest.guest').updateGuest(sessionId, updatedData)

            return {
                data: updatedGuest,
                meta: {
                    message: 'Guest updated successfully'
                }
            }
        } catch (error) {
            strapi.log.error('Error updating guest:', error)
            return ctx.internalServerError(error.message || 'Failed to update guest')
        }
    },

    /**
     * Convert guest to registered user
     */
    async convertToUser(ctx: Context) {
        try {
            const { sessionId } = ctx.params
            const userData = ctx.request.body as ConvertToUserData

            if (!sessionId) {
                return ctx.badRequest('Session ID is required')
            }

            // Validate required user data
            const { username, password, email, firstName, lastName } = userData
            if (!username || !password || !email || !firstName || !lastName) {
                return ctx.badRequest('Missing required fields: username, password, email, firstName, lastName')
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(email)) {
                return ctx.badRequest('Invalid email format')
            }

            // Validate password strength (basic validation)
            if (password.length < 6) {
                return ctx.badRequest('Password must be at least 6 characters long')
            }
            // check if guest exists
            const guest = await strapi.service('api::guest.guest').getGuest(sessionId)
            if (!guest) {
                return ctx.notFound('Guest not found')
            }
            if (guest.status === 'converted') {
                return ctx.badRequest('Guest already converted to user')
            }
            const result = await strapi.service('api::guest.guest').convertToUser(sessionId, userData)

            return {
                data: result,
                meta: {
                    message: 'Guest successfully converted to user account'
                }
            }
        } catch (error) {
            strapi.log.error('Error converting guest to user:', error)
            return ctx.internalServerError(error.message || 'Failed to convert guest to user')
        }
    },

    /**
     * Get guest analytics
     */
    async getAnalytics(ctx: Context) {
        try {
            const analytics = await strapi.service('api::guest.guest').getAnalytics()

            return {
                data: analytics,
                meta: {
                    message: 'Analytics retrieved successfully'
                }
            }
        } catch (error) {
            strapi.log.error('Error getting guest analytics:', error)
            return ctx.internalServerError('Failed to get guest analytics')
        }
    },
    /**
     * Delete guest
     */
    async delete(ctx: Context) {
        try {
            const { sessionId } = ctx.params

            if (!sessionId) {
                return ctx.badRequest('Session ID is required')
            }

            const guest = await strapi.service('api::guest.guest').getGuest(sessionId)

            if (!guest) {
                return ctx.notFound('Guest not found')
            }
            await strapi.documents('api::guest.guest').delete({
                documentId: guest.documentId,
            })

            return {
                data: guest,
                meta: {
                    message: 'Guest deleted successfully'
                }
            }
        } catch (error) {
            strapi.log.error('Error deleting guest:', error)
            return ctx.internalServerError('Failed to delete guest')
        }
    }
})
