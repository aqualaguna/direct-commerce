'use strict'

interface CheckoutSession {
  documentId: string
  sessionId: string
  user?: any
  cart: any
  step: 'cart' | 'shipping' | 'billing' | 'payment' | 'review' | 'confirmation'
  status: 'active' | 'completed' | 'abandoned' | 'expired'
  shippingAddress?: any
  billingAddress?: any
  shippingMethod?: string
  paymentMethod?: string
  order?: any
  expiresAt: Date
  abandonedAt?: Date
  completedAt?: Date
  metadata?: any
  createdAt: Date
  updatedAt: Date
}

interface CreateCheckoutSessionData {
  sessionId: string
  userId?: string
  cartId: string
  expiresAt: Date
}

interface UpdateCheckoutSessionData {
  step?: 'cart' | 'shipping' | 'billing' | 'payment' | 'review' | 'confirmation'
  status?: 'active' | 'completed' | 'abandoned' | 'expired'
  shippingAddress?: any
  billingAddress?: any
  shippingMethod?: string
  paymentMethod?: string
  orderId?: string
  metadata?: any
  abandonedAt?: Date
}

interface CheckoutStepValidation {
  isValid: boolean
  errors: string[]
  canProceed: boolean
}

export default ({ strapi }: { strapi: any }) => {
  const service = {
    /**
     * Create a new checkout session
     */
    async createSession(data: CreateCheckoutSessionData): Promise<CheckoutSession> {
      try {
        const checkoutSession = await strapi.documents('api::checkout-session.checkout-session').create({
          data: {
            sessionId: data.sessionId,
            user: data.userId ? { connect: [data.userId] } : undefined,
            cart: { connect: [data.cartId] },
            step: 'cart',
            status: 'active',
            expiresAt: data.expiresAt,
            metadata: {
              createdAt: new Date().toISOString(),
              userAgent: 'checkout-flow-service'
            }
          },
          populate: ['user', 'cart', 'order']
        })

        strapi.log.info(`Checkout session created: ${checkoutSession.documentId}`)
        return checkoutSession
      } catch (error) {
        strapi.log.error('Error creating checkout session:', error)
        throw new Error('Failed to create checkout session')
      }
    },

    /**
     * Get checkout session by session ID
     */
    async getSession(sessionId: string): Promise<CheckoutSession | null> {
      try {
        const checkoutSession = await strapi.documents('api::checkout-session.checkout-session').findFirst({
          filters: { sessionId },
          populate: ['user', 'cart', 'order', 'shippingAddress', 'billingAddress']
        })

        return checkoutSession
      } catch (error) {
        strapi.log.error('Error getting checkout session:', error)
        throw new Error('Failed to get checkout session')
      }
    },

    /**
     * Update checkout session
     */
    async updateSession(sessionId: string, data: UpdateCheckoutSessionData): Promise<CheckoutSession> {
      try {
        const existingSession = await service.getSession(sessionId)
        if (!existingSession) {
          throw new Error('Checkout session not found')
        }

        // Validate step progression
        if (data.step && !service.isValidStepProgression(existingSession.step, data.step)) {
          throw new Error(`Invalid step progression from ${existingSession.step} to ${data.step}`)
        }

        const updateData: any = { ...data }
        
        // Handle order connection
        if (data.orderId) {
          updateData.order = { connect: [data.orderId] }
          delete updateData.orderId
        }

        // Set completion timestamp if status is completed
        if (data.status === 'completed') {
          updateData.completedAt = new Date()
        }

        // Set abandonment timestamp if status is abandoned
        if (data.status === 'abandoned') {
          updateData.abandonedAt = new Date()
        }

        const checkoutSession = await strapi.documents('api::checkout-session.checkout-session').update({
          documentId: existingSession.documentId,
          data: updateData,
          populate: ['user', 'cart', 'order', 'shippingAddress', 'billingAddress']
        })

        strapi.log.info(`Checkout session updated: ${checkoutSession.documentId}, step: ${checkoutSession.step}`)
        return checkoutSession
      } catch (error) {
        strapi.log.error('Error updating checkout session:', error)
        throw error
      }
    },

    /**
     * Validate checkout step progression
     */
    isValidStepProgression(currentStep: string, newStep: string): boolean {
      const stepOrder = ['cart', 'shipping', 'billing', 'payment', 'review', 'confirmation']
      const currentIndex = stepOrder.indexOf(currentStep)
      const newIndex = stepOrder.indexOf(newStep)

      // Allow moving forward one step or backward any number of steps
      return newIndex <= currentIndex + 1
    },

    /**
     * Validate current step completion
     */
    async validateStep(sessionId: string, step: string): Promise<CheckoutStepValidation> {
      try {
        const session = await service.getSession(sessionId)
        if (!session) {
          return {
            isValid: false,
            errors: ['Checkout session not found'],
            canProceed: false
          }
        }

        const errors: string[] = []

        switch (step) {
          case 'cart':
            if (!session.cart || session.cart.items?.length === 0) {
              errors.push('Cart is empty')
            }
            break

          case 'shipping':
            if (!session.shippingAddress) {
              errors.push('Shipping address is required')
            } else {
              const addressErrors = await service.validateAddress(session.shippingAddress)
              errors.push(...addressErrors)
            }
            break

          case 'billing':
            if (!session.billingAddress) {
              errors.push('Billing address is required')
            } else {
              const addressErrors = await service.validateAddress(session.billingAddress)
              errors.push(...addressErrors)
            }
            break

          case 'payment':
            if (!session.paymentMethod) {
              errors.push('Payment method is required')
            }
            break

          case 'review':
            // Validate all previous steps
            if (!session.shippingAddress) {
              errors.push('Shipping address is required')
            }
            if (!session.billingAddress) {
              errors.push('Billing address is required')
            }
            if (!session.paymentMethod) {
              errors.push('Payment method is required')
            }
            break

          default:
            errors.push(`Unknown step: ${step}`)
        }

        const isValid = errors.length === 0
        const canProceed = isValid && service.isValidStepProgression(session.step, step)

        return {
          isValid,
          errors,
          canProceed
        }
      } catch (error) {
        strapi.log.error('Error validating checkout step:', error)
        return {
          isValid: false,
          errors: ['Failed to validate step'],
          canProceed: false
        }
      }
    },

    /**
     * Validate address component using existing address validation service
     */
    async validateAddress(address: any): Promise<string[]> {
      try {
        // Try to use existing address validation service from Story 3.3
        const addressValidationService = strapi.service('api::address-validation.address-validation')
        if (addressValidationService) {
          const validationResult = await addressValidationService.validateAddress(address)
          return validationResult.errors || []
        }
      } catch (error) {
        strapi.log.warn('Address validation service not available, using basic validation')
      }

      // Fallback to basic validation if address validation service is not available
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
     * Mark checkout session as abandoned
     */
    async abandonSession(sessionId: string): Promise<CheckoutSession> {
      try {
        const session = await service.getSession(sessionId)
        if (!session) {
          throw new Error('Checkout session not found')
        }

        if (session.status === 'completed') {
          throw new Error('Cannot abandon completed checkout session')
        }

        const updatedSession = await service.updateSession(sessionId, {
          status: 'abandoned',
          abandonedAt: new Date()
        })

        strapi.log.info(`Checkout session abandoned: ${sessionId}`)
        return updatedSession
      } catch (error) {
        strapi.log.error('Error abandoning checkout session:', error)
        throw error
      }
    },

    /**
     * Clean up expired checkout sessions
     */
    async cleanupExpiredSessions(): Promise<number> {
      try {
        const expiredSessions = await strapi.documents('api::checkout-session.checkout-session').findMany({
          filters: {
            status: 'active',
            expiresAt: { $lt: new Date() }
          },
          fields: ['documentId']
        })

        let cleanedCount = 0
        for (const session of expiredSessions) {
          await strapi.documents('api::checkout-session.checkout-session').update({
            documentId: session.documentId,
            data: {
              status: 'expired'
            }
          })
          cleanedCount++
        }

        strapi.log.info(`Cleaned up ${cleanedCount} expired checkout sessions`)
        return cleanedCount
      } catch (error) {
        strapi.log.error('Error cleaning up expired checkout sessions:', error)
        throw new Error('Failed to cleanup expired sessions')
      }
    },

    /**
     * Get checkout session analytics
     */
    async getAnalytics(): Promise<any> {
      try {
        const totalSessions = await strapi.documents('api::checkout-session.checkout-session').count()
        const completedSessions = await strapi.documents('api::checkout-session.checkout-session').count({
          status: 'completed'
        })
        const abandonedSessions = await strapi.documents('api::checkout-session.checkout-session').count({
          status: 'abandoned'
        })
        const expiredSessions = await strapi.documents('api::checkout-session.checkout-session').count({
          status: 'expired'
        })

        const conversionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0

        return {
          totalSessions,
          completedSessions,
          abandonedSessions,
          expiredSessions,
          conversionRate: Math.round(conversionRate * 100) / 100
        }
      } catch (error) {
        strapi.log.error('Error getting checkout analytics:', error)
        throw new Error('Failed to get checkout analytics')
      }
    }
  }

  return service
}
