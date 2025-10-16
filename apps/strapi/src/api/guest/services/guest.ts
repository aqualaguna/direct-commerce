import { Core } from '@strapi/strapi'

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
  async createGuest(data: GuestData) {
    try {
      // Validate email format
      if (data.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if(!emailRegex.test(data.email)) {
          throw new Error('Invalid email format')
        }
        // Check if email already exists for a registered user
        const existingUser = await strapi.documents('plugin::users-permissions.user').findFirst({
          filters: { email: data.email }
        })

        if (existingUser) {
          throw new Error('Email already registered. Please login instead.')
        }
      }
      // Create guest
      const guest = await strapi.documents('api::guest.guest').create({
        data: {
          sessionId: data.sessionId,
          email: data.email,
          status: 'active',
          metadata: data.metadata ?? {}
        },
      })

      if (guest && guest.documentId) {
        strapi.log.info(`Guest created: ${guest.documentId}`)
      } else {
        strapi.log.info('Guest created successfully')
      }
      return guest
    } catch (error) {
      strapi.log.error('Error creating guest:', error)
      throw error
    }
  },

  /**
   * Get guest by session ID
   */
  async getGuest(sessionId: string) {
    try {
      const guest = await strapi.documents('api::guest.guest' ).findFirst({
        filters: { sessionId },
      })

      return guest
    } catch (error) {
      strapi.log.error('Error getting guest:', error)
      throw new Error('Failed to get guest')
    }
  },

  /**
   * Update guest
   */
  async updateGuest(sessionId: string, data: any) {
    try {
      const existingGuest = await this.getGuest(sessionId)
      if (!existingGuest) {
        throw new Error('Guest not found')
      }

      const updatedGuest = await strapi.documents('api::guest.guest' ).update({
        documentId: existingGuest.documentId,
        data,
      })

      if (updatedGuest && updatedGuest.documentId) {
        strapi.log.info(`Guest updated: ${updatedGuest.documentId}`)
      } else {
        strapi.log.info('Guest updated successfully')
      }
      return updatedGuest
    } catch (error) {
      strapi.log.error('Error updating guest:', error)
      throw error
    }
  },

  /**
   * Convert guest to registered user
   */
  async convertToUser(sessionId: string, userData: ConvertToUserData) {
    try {
      console.log('userData', userData)
      console.log('sessionId', sessionId)
      // Validate username uniqueness
      const existingUsername = await strapi.documents('plugin::users-permissions.user').findFirst({
        filters: { username: userData.username }
      })

      if (existingUsername) {
        throw new Error('Username already taken')
      }

      // Validate email uniqueness
      const existingEmail = await strapi.documents('plugin::users-permissions.user').findFirst({
        filters: { email: userData.email }
      })

      if (existingEmail) {
        throw new Error('Email already registered')
      }

      // Create new user
      const newUser = await strapi.documents('plugin::users-permissions.user').create({
        data: {
          username: userData.username,
          email: userData.email.toLowerCase(),
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          confirmed: true,
          blocked: false,
        } 
      })

      // Update guest with conversion
      const updatedGuest = await this.updateGuest(sessionId, {
        convertedToUser: { connect: [newUser.documentId] },
        convertedAt: new Date(),
        status: 'converted'
      })

      // Transfer cart to new user
      const cartPersistenceService = await strapi.service('api::cart.cart-persistence')
      const migratedCart = await cartPersistenceService.migrateGuestToUserCart(sessionId, newUser.id)

      // Todo: Transfer checkout and order to new user
      

      strapi.log.info(`Guest converted to user: ${updatedGuest.documentId} -> ${newUser.documentId}`)

      return {
        user: newUser,
        cart: migratedCart,
        guest: updatedGuest
      }
    } catch (error) {
      strapi.log.error('Error converting guest to user:', error)
      throw error
    }
  },

  /**
   * Validate guest data
   */
  async validateGuestData(data: GuestData, options: { isUpdate: boolean } = { isUpdate: false }) {
    const errors: string[] = []

    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) {
        errors.push('Invalid email format')
      }
    }

    // validate sessionId
    if (!options.isUpdate) {
      const guest = await this.getGuest(data.sessionId)
      if (guest) {
        errors.push('You are not allowed to create a guest for a session that already has a guest')
      }
    }
    // validate cartId
    // get cart by documentId
    if (data.cartId) {
      const cart = await strapi.documents('api::cart.cart').findOne({
        documentId: data.cartId,
        populate: {
          user: true
        }
      })
      if (!cart) {
        errors.push('Cart not found')
      } else {
        if (cart.user) {
          errors.push('You are not allowed to create a guest for a cart that already has a user')
        }
        if (cart.sessionId !== data.sessionId) {
          errors.push('You are not allowed to create a guest for a cart that already has a different session')
        }
      }
    }
    // validate metadata
    if (data.metadata) {
      if (typeof data.metadata !== 'object') {
        errors.push('Metadata must be an object')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },


  /**
   * Validate phone number format
   */
  validatePhone(phone: string): boolean {
    // Basic phone validation - can be enhanced based on requirements
    const phoneRegex = /^[\+]?[1-9][\d]{7,15}$/
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
  },



  /**
   * Get guest analytics
   */
  async getAnalytics() {
    try {
      const totalGuest = await strapi.documents('api::guest.guest' ).count({})
      const activeGuest = await strapi.documents('api::guest.guest' ).count({
        filters: { status: 'active' }
      } )
      const convertedGuest = await strapi.documents('api::guest.guest' ).count({
        filters: { status: 'converted' }
      } )

      const conversionRate = totalGuest > 0 ? (convertedGuest / totalGuest) * 100 : 0
      const completionRate = totalGuest > 0 ? ((activeGuest + convertedGuest) / totalGuest) * 100 : 0

      return {
        totalGuest,
        activeGuest,
        convertedGuest,
        conversionRate: Math.round(conversionRate * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100
      }
    } catch (error) {
      strapi.log.error('Error getting guest analytics:', error)
      throw new Error('Failed to get guest analytics')
    }
  }
})
