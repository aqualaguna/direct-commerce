'use strict'

import { factories } from '@strapi/strapi'

interface GuestCheckoutData {
  sessionId: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  shippingAddress: any
  billingAddress: any
  cartId: string
  expiresAt: Date
}

interface ConvertToUserData {
  username: string
  password: string
  email: string
  firstName: string
  lastName: string
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Create a new guest checkout
   */
  async createGuestCheckout(data: GuestCheckoutData) {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) {
        throw new Error('Invalid email format')
      }

      // Check if email already exists for a registered user
      const existingUser = await strapi.documents('plugin::users-permissions.user' as any).findFirst({
        filters: { email: data.email }
      })

      if (existingUser) {
        throw new Error('Email already registered. Please login instead.')
      }

      // Create guest checkout
      const guestCheckout = await strapi.documents('api::guest-checkout.guest-checkout' as any).create({
        data: {
          sessionId: data.sessionId,
          email: data.email.toLowerCase(),
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          shippingAddress: data.shippingAddress,
          billingAddress: data.billingAddress,
          cart: { connect: [data.cartId] },
          status: 'active',
          expiresAt: data.expiresAt,
          metadata: {
            createdAt: new Date().toISOString(),
            userAgent: 'guest-checkout-service',
            ipAddress: 'tracked-separately'
          }
        } as any,
        populate: ['cart', 'checkoutSession', 'convertedToUser', 'order'] as any
      })

      if (guestCheckout && guestCheckout.documentId) {
        strapi.log.info(`Guest checkout created: ${guestCheckout.documentId}`)
      } else {
        strapi.log.info('Guest checkout created successfully')
      }
      return guestCheckout
    } catch (error) {
      strapi.log.error('Error creating guest checkout:', error)
      throw error
    }
  },

  /**
   * Get guest checkout by session ID
   */
  async getGuestCheckout(sessionId: string) {
    try {
      const guestCheckout = await strapi.documents('api::guest-checkout.guest-checkout' as any).findFirst({
        filters: { sessionId },
        populate: ['cart', 'checkoutSession', 'convertedToUser', 'order', 'shippingAddress', 'billingAddress'] as any
      })

      return guestCheckout
    } catch (error) {
      strapi.log.error('Error getting guest checkout:', error)
      throw new Error('Failed to get guest checkout')
    }
  },

  /**
   * Update guest checkout
   */
  async updateGuestCheckout(sessionId: string, data: any) {
    try {
      const existingGuestCheckout = await this.getGuestCheckout(sessionId)
      if (!existingGuestCheckout) {
        throw new Error('Guest checkout not found')
      }

      const updatedGuestCheckout = await strapi.documents('api::guest-checkout.guest-checkout' as any).update({
        documentId: existingGuestCheckout.documentId,
        data,
        populate: ['cart', 'checkoutSession', 'convertedToUser', 'order', 'shippingAddress', 'billingAddress'] as any
      })

      if (updatedGuestCheckout && updatedGuestCheckout.documentId) {
        strapi.log.info(`Guest checkout updated: ${updatedGuestCheckout.documentId}`)
      } else {
        strapi.log.info('Guest checkout updated successfully')
      }
      return updatedGuestCheckout
    } catch (error) {
      strapi.log.error('Error updating guest checkout:', error)
      throw error
    }
  },

  /**
   * Convert guest checkout to registered user
   */
  async convertToUser(sessionId: string, userData: ConvertToUserData) {
    try {
      const guestCheckout = await this.getGuestCheckout(sessionId)
      if (!guestCheckout) {
        throw new Error('Guest checkout not found')
      }

      if (guestCheckout.status === 'converted') {
        throw new Error('Guest checkout already converted to user')
      }

      // Validate username uniqueness
      const existingUsername = await strapi.documents('plugin::users-permissions.user' as any).findFirst({
        filters: { username: userData.username }
      })

      if (existingUsername) {
        throw new Error('Username already taken')
      }

      // Validate email uniqueness
      const existingEmail = await strapi.documents('plugin::users-permissions.user' as any).findFirst({
        filters: { email: userData.email }
      })

      if (existingEmail) {
        throw new Error('Email already registered')
      }

      // Create new user
      const newUser = await strapi.documents('plugin::users-permissions.user' as any).create({
        data: {
          username: userData.username,
          email: userData.email.toLowerCase(),
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          confirmed: true,
          blocked: false,
          role: { connect: ['authenticated'] }
        } as any
      })

      // Update guest checkout with conversion
      const updatedGuestCheckout = await this.updateGuestCheckout(sessionId, {
        convertedToUser: { connect: [newUser.documentId] },
        convertedAt: new Date(),
        status: 'converted'
      })

      // Transfer cart to new user
      if (guestCheckout.cart) {
        await strapi.documents('api::cart.cart' as any).update({
          documentId: guestCheckout.cart.documentId,
          data: {
            user: { connect: [newUser.documentId] },
            guestCheckout: { disconnect: [guestCheckout.documentId] }
          } as any
        })
      }

      // Transfer checkout session to new user
      if (guestCheckout.checkoutSession) {
        await strapi.documents('api::checkout-session.checkout-session' as any).update({
          documentId: guestCheckout.checkoutSession.documentId,
          data: {
            user: { connect: [newUser.documentId] },
            guestCheckout: { disconnect: [guestCheckout.documentId] }
          } as any
        })
      }

      strapi.log.info(`Guest checkout converted to user: ${guestCheckout.documentId} -> ${newUser.documentId}`)
      
      return {
        user: newUser,
        guestCheckout: updatedGuestCheckout
      }
    } catch (error) {
      strapi.log.error('Error converting guest checkout to user:', error)
      throw error
    }
  },

  /**
   * Validate guest checkout data
   */
  validateGuestCheckoutData(data: GuestCheckoutData) {
    const errors: string[] = []

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!data.email || !emailRegex.test(data.email)) {
      errors.push('Valid email is required')
    }

    // Validate name
    if (!data.firstName?.trim()) {
      errors.push('First name is required')
    }

    if (!data.lastName?.trim()) {
      errors.push('Last name is required')
    }

    // Validate addresses
    if (!data.shippingAddress) {
      errors.push('Shipping address is required')
    } else {
      const shippingErrors = this.validateAddress(data.shippingAddress)
      errors.push(...shippingErrors.map(error => `Shipping: ${error}`))
    }

    if (!data.billingAddress) {
      errors.push('Billing address is required')
    } else {
      const billingErrors = this.validateAddress(data.billingAddress)
      errors.push(...billingErrors.map(error => `Billing: ${error}`))
    }

    // Validate phone (optional but if provided, should be valid)
    if (data.phone && !this.validatePhone(data.phone)) {
      errors.push('Invalid phone number format')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Validate address component
   */
  validateAddress(address: any): string[] {
    const errors: string[] = []

    if (!address.firstName?.trim()) {
      errors.push('First name is required')
    }

    if (!address.lastName?.trim()) {
      errors.push('Last name is required')
    }

    if (!address.address1?.trim()) {
      errors.push('Address line 1 is required')
    }

    if (!address.city?.trim()) {
      errors.push('City is required')
    }

    if (!address.state?.trim()) {
      errors.push('State is required')
    }

    if (!address.postalCode?.trim()) {
      errors.push('Postal code is required')
    }

    if (!address.country?.trim()) {
      errors.push('Country is required')
    }

    if (!address.phone?.trim()) {
      errors.push('Phone number is required')
    }

    return errors
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
   * Mark guest checkout as abandoned
   */
  async abandonGuestCheckout(sessionId: string) {
    try {
      const guestCheckout = await this.getGuestCheckout(sessionId)
      if (!guestCheckout) {
        throw new Error('Guest checkout not found')
      }

      if (guestCheckout.status === 'completed' || guestCheckout.status === 'converted') {
        throw new Error('Cannot abandon completed or converted guest checkout')
      }

      const updatedGuestCheckout = await this.updateGuestCheckout(sessionId, {
        status: 'abandoned',
        abandonedAt: new Date()
      })

      strapi.log.info(`Guest checkout abandoned: ${sessionId}`)
      return updatedGuestCheckout
    } catch (error) {
      strapi.log.error('Error abandoning guest checkout:', error)
      throw error
    }
  },

  /**
   * Clean up expired guest checkouts
   */
  async cleanupExpiredGuestCheckouts(): Promise<number> {
    try {
      const expiredGuestCheckouts = await strapi.documents('api::guest-checkout.guest-checkout' as any).findMany({
        filters: {
          status: 'active',
          expiresAt: { $lt: new Date() }
        },
        fields: ['documentId']
      })

      let cleanedCount = 0
      for (const guestCheckout of expiredGuestCheckouts) {
        await strapi.documents('api::guest-checkout.guest-checkout' as any).update({
          documentId: guestCheckout.documentId,
          data: {
            status: 'expired'
          } as any
        })
        cleanedCount++
      }

      strapi.log.info(`Cleaned up ${cleanedCount} expired guest checkouts`)
      return cleanedCount
    } catch (error) {
      strapi.log.error('Error cleaning up expired guest checkouts:', error)
      throw new Error('Failed to cleanup expired guest checkouts')
    }
  },

  /**
   * Get guest checkout analytics
   */
  async getAnalytics() {
    try {
      const totalGuestCheckouts = await strapi.documents('api::guest-checkout.guest-checkout' as any).count()
      const completedGuestCheckouts = await strapi.documents('api::guest-checkout.guest-checkout' as any).count({
        filters: { status: 'completed' }
      } as any)
      const convertedGuestCheckouts = await strapi.documents('api::guest-checkout.guest-checkout' as any).count({
        filters: { status: 'converted' }
      } as any)
      const abandonedGuestCheckouts = await strapi.documents('api::guest-checkout.guest-checkout' as any).count({
        filters: { status: 'abandoned' }
      } as any)
      const expiredGuestCheckouts = await strapi.documents('api::guest-checkout.guest-checkout' as any).count({
        filters: { status: 'expired' }
      } as any)

      const conversionRate = totalGuestCheckouts > 0 ? (convertedGuestCheckouts / totalGuestCheckouts) * 100 : 0
      const completionRate = totalGuestCheckouts > 0 ? ((completedGuestCheckouts + convertedGuestCheckouts) / totalGuestCheckouts) * 100 : 0

      return {
        totalGuestCheckouts,
        completedGuestCheckouts,
        convertedGuestCheckouts,
        abandonedGuestCheckouts,
        expiredGuestCheckouts,
        conversionRate: Math.round(conversionRate * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100
      }
    } catch (error) {
      strapi.log.error('Error getting guest checkout analytics:', error)
      throw new Error('Failed to get guest checkout analytics')
    }
  }
})
