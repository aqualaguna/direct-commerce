'use strict'

interface CheckoutSessionData {
  cartId?: string
  guestCheckout?: boolean
  user?: any
}

interface CheckoutSessionUpdate {
  step?: string
  shippingAddress?: any
  billingAddress?: any
  shippingMethod?: string
  paymentMethod?: string
  order?: any
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Create a new checkout session
   */
  async create(ctx: any) {
    try {
      const { cartId, guestCheckout = false } = ctx.request.body
      const { user } = ctx.state

      // Validate request
      if (!cartId) {
        return ctx.badRequest('Cart ID is required')
      }

      // Check if cart exists and is valid
      const cart = await strapi.documents('api::cart.cart').findOne({
        documentId: cartId,
        populate: ['items', 'items.product']
      })

      if (!cart) {
        return ctx.notFound('Cart not found')
      }

      if (cart.items.length === 0) {
        return ctx.badRequest('Cart is empty')
      }

      // Check if user already has an active checkout session
      if (user && !guestCheckout) {
        const existingSession = await strapi.documents('api::checkout-session.checkout-session').findFirst({
          filters: {
            user: user.id,
            status: 'active'
          }
        })

        if (existingSession) {
          return ctx.badRequest('User already has an active checkout session')
        }
      }

      // Create checkout session
      const sessionData = {
        user: user ? user.id : null,
        cart: cartId,
        sessionId: guestCheckout ? this.generateSessionId() : null,
        step: 'cart',
        status: 'active',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        shippingAddress: null,
        billingAddress: null,
        shippingMethod: null,
        paymentMethod: null,
        order: null
      }

      const checkoutSession = await strapi.documents('api::checkout-session.checkout-session').create({
        data: sessionData,
        populate: ['cart', 'user']
      })

      // Initialize checkout steps
      await strapi.service('api::checkout-step.step-management').initializeSteps(checkoutSession.documentId)

      // Track checkout session creation
      await this.trackCheckoutEvent(checkoutSession.documentId, 'session_created', {
        guestCheckout,
        cartItems: cart.items.length,
        cartTotal: cart.total
      })

      return ctx.created(checkoutSession)
    } catch (error) {
      strapi.log.error('Error creating checkout session:', error)
      return ctx.internalServerError('Failed to create checkout session')
    }
  },

  /**
   * Get checkout session details
   */
  async findOne(ctx: any) {
    try {
      const { sessionId } = ctx.params
      const { user } = ctx.state

      if (!sessionId) {
        return ctx.badRequest('Session ID is required')
      }

      const checkoutSession = await strapi.documents('api::checkout-session.checkout-session').findOne({
        documentId: sessionId,
        populate: ['cart', 'cart.items', 'cart.items.product', 'user', 'shippingAddress', 'billingAddress']
      })

      if (!checkoutSession) {
        return ctx.notFound('Checkout session not found')
      }

      // Check authorization
      if (checkoutSession.user && checkoutSession.user.id !== user?.id) {
        return ctx.forbidden('Access denied')
      }

      // Get step progress
      const stepProgress = await strapi.service('api::checkout-step.step-management').getStepProgress(sessionId)

      // Get step analytics
      const stepAnalytics = await strapi.service('api::checkout-step.step-management').getStepAnalytics(sessionId)

      const response = {
        ...checkoutSession,
        stepProgress,
        stepAnalytics
      }

      return ctx.ok(response)
    } catch (error) {
      strapi.log.error('Error getting checkout session:', error)
      return ctx.internalServerError('Failed to get checkout session')
    }
  },

  /**
   * Update checkout session
   */
  async update(ctx: any) {
    try {
      const { sessionId } = ctx.params
      const updateData: CheckoutSessionUpdate = ctx.request.body
      const { user } = ctx.state

      if (!sessionId) {
        return ctx.badRequest('Session ID is required')
      }

      const checkoutSession = await strapi.documents('api::checkout-session.checkout-session').findOne({
        documentId: sessionId,
        populate: ['user']
      })

      if (!checkoutSession) {
        return ctx.notFound('Checkout session not found')
      }

      // Check authorization
      if (checkoutSession.user && checkoutSession.user.id !== user?.id) {
        return ctx.forbidden('Access denied')
      }

      // Validate step progression
      if (updateData.step) {
        const stepProgress = await strapi.service('api::checkout-step.step-management').getStepProgress(sessionId)
        
        if (!stepProgress.availableSteps.includes(updateData.step)) {
          return ctx.badRequest('Invalid step progression')
        }
      }

      // Update checkout session
      const updatedSession = await strapi.documents('api::checkout-session.checkout-session').update({
        documentId: sessionId,
        data: updateData,
        populate: ['cart', 'user', 'shippingAddress', 'billingAddress']
      })

      // Track session update
      await this.trackCheckoutEvent(sessionId, 'session_updated', updateData)

      return ctx.ok(updatedSession)
    } catch (error) {
      strapi.log.error('Error updating checkout session:', error)
      return ctx.internalServerError('Failed to update checkout session')
    }
  },

  /**
   * Add address to checkout session
   */
  async addAddress(ctx: any) {
    try {
      const { sessionId } = ctx.params
      const { type, addressData } = ctx.request.body
      const { user } = ctx.state

      if (!sessionId || !type || !addressData) {
        return ctx.badRequest('Session ID, type, and address data are required')
      }

      if (!['shipping', 'billing'].includes(type)) {
        return ctx.badRequest('Address type must be shipping or billing')
      }

      const checkoutSession = await strapi.documents('api::checkout-session.checkout-session').findOne({
        documentId: sessionId,
        populate: ['user']
      })

      if (!checkoutSession) {
        return ctx.notFound('Checkout session not found')
      }

      // Check authorization
      if (checkoutSession.user && checkoutSession.user.id !== user?.id) {
        return ctx.forbidden('Access denied')
      }

      // Validate address using Story 3.3 address validation
      const addressValidation = await strapi.service('api::address.address-validation').validateAddress(addressData)
      
      if (!addressValidation.isValid) {
        return ctx.badRequest('Invalid address', {
          errors: addressValidation.errors
        })
      }

      // Create or update address
      const address = await strapi.documents('api::address.address').create({
        data: {
          ...addressData,
          user: checkoutSession.user?.id,
          isDefault: false,
          validated: true
        }
      })

      // Update checkout session with address
      const updateData = type === 'shipping' ? { shippingAddress: address.documentId } : { billingAddress: address.documentId }
      
      const updatedSession = await strapi.documents('api::checkout-session.checkout-session').update({
        documentId: sessionId,
        data: updateData,
        populate: ['cart', 'user', 'shippingAddress', 'billingAddress']
      })

      // Track address addition
      await this.trackCheckoutEvent(sessionId, 'address_added', {
        type,
        addressId: address.documentId
      })

      return ctx.ok(updatedSession)
    } catch (error) {
      strapi.log.error('Error adding address to checkout session:', error)
      return ctx.internalServerError('Failed to add address')
    }
  },

  /**
   * Validate checkout session
   */
  async validate(ctx: any) {
    try {
      const { sessionId } = ctx.params
      const { user } = ctx.state

      if (!sessionId) {
        return ctx.badRequest('Session ID is required')
      }

      const checkoutSession = await strapi.documents('api::checkout-session.checkout-session').findOne({
        documentId: sessionId,
        populate: ['cart', 'cart.items', 'user', 'shippingAddress', 'billingAddress']
      })

      if (!checkoutSession) {
        return ctx.notFound('Checkout session not found')
      }

      // Check authorization
      if (checkoutSession.user && checkoutSession.user.id !== user?.id) {
        return ctx.forbidden('Access denied')
      }

      const validationResult = await this.validateCheckoutSession(checkoutSession)

      return ctx.ok(validationResult)
    } catch (error) {
      strapi.log.error('Error validating checkout session:', error)
      return ctx.internalServerError('Failed to validate checkout session')
    }
  },

  /**
   * Move to next step
   */
  async nextStep(ctx: any) {
    try {
      const { sessionId } = ctx.params
      const { user } = ctx.state

      if (!sessionId) {
        return ctx.badRequest('Session ID is required')
      }

      const checkoutSession = await strapi.documents('api::checkout-session.checkout-session').findOne({
        documentId: sessionId,
        populate: ['user']
      })

      if (!checkoutSession) {
        return ctx.notFound('Checkout session not found')
      }

      // Check authorization
      if (checkoutSession.user && checkoutSession.user.id !== user?.id) {
        return ctx.forbidden('Access denied')
      }

      // Move to next step
      const stepProgress = await strapi.service('api::checkout-step.step-management').moveToNextStep(sessionId)

      // Track step progression
      await this.trackCheckoutEvent(sessionId, 'step_completed', {
        step: stepProgress.currentStep
      })

      return ctx.ok(stepProgress)
    } catch (error) {
      strapi.log.error('Error moving to next step:', error)
      return ctx.internalServerError('Failed to move to next step')
    }
  },

  /**
   * Move to previous step
   */
  async previousStep(ctx: any) {
    try {
      const { sessionId } = ctx.params
      const { user } = ctx.state

      if (!sessionId) {
        return ctx.badRequest('Session ID is required')
      }

      const checkoutSession = await strapi.documents('api::checkout-session.checkout-session').findOne({
        documentId: sessionId,
        populate: ['user']
      })

      if (!checkoutSession) {
        return ctx.notFound('Checkout session not found')
      }

      // Check authorization
      if (checkoutSession.user && checkoutSession.user.id !== user?.id) {
        return ctx.forbidden('Access denied')
      }

      // Move to previous step
      const stepProgress = await strapi.service('api::checkout-step.step-management').moveToPreviousStep(sessionId)

      // Track step navigation
      await this.trackCheckoutEvent(sessionId, 'step_navigated', {
        direction: 'back',
        step: stepProgress.currentStep
      })

      return ctx.ok(stepProgress)
    } catch (error) {
      strapi.log.error('Error moving to previous step:', error)
      return ctx.internalServerError('Failed to move to previous step')
    }
  },

  /**
   * Jump to specific step
   */
  async jumpToStep(ctx: any) {
    try {
      const { sessionId } = ctx.params
      const { stepName } = ctx.request.body
      const { user } = ctx.state

      if (!sessionId || !stepName) {
        return ctx.badRequest('Session ID and step name are required')
      }

      const checkoutSession = await strapi.documents('api::checkout-session.checkout-session').findOne({
        documentId: sessionId,
        populate: ['user']
      })

      if (!checkoutSession) {
        return ctx.notFound('Checkout session not found')
      }

      // Check authorization
      if (checkoutSession.user && checkoutSession.user.id !== user?.id) {
        return ctx.forbidden('Access denied')
      }

      // Jump to step
      const stepProgress = await strapi.service('api::checkout-step.step-management').jumpToStep(sessionId, stepName)

      // Track step jump
      await this.trackCheckoutEvent(sessionId, 'step_jumped', {
        targetStep: stepName,
        currentStep: stepProgress.currentStep
      })

      return ctx.ok(stepProgress)
    } catch (error) {
      strapi.log.error('Error jumping to step:', error)
      return ctx.internalServerError('Failed to jump to step')
    }
  },

  /**
   * Validate form data for current step
   */
  async validateStep(ctx: any) {
    try {
      const { sessionId } = ctx.params
      const { stepName, formData } = ctx.request.body
      const { user } = ctx.state

      if (!sessionId || !stepName || !formData) {
        return ctx.badRequest('Session ID, step name, and form data are required')
      }

      const checkoutSession = await strapi.documents('api::checkout-session.checkout-session').findOne({
        documentId: sessionId,
        populate: ['user']
      })

      if (!checkoutSession) {
        return ctx.notFound('Checkout session not found')
      }

      // Check authorization
      if (checkoutSession.user && checkoutSession.user.id !== user?.id) {
        return ctx.forbidden('Access denied')
      }

      // Validate step data
      const validationResult = await strapi.service('api::checkout-step.step-management').validateStep(sessionId, stepName, formData)

      // Also validate with form validation service
      const formValidationResult = await strapi.service('api::checkout-form.checkout-form-validation').validateCheckoutForm(
        formData,
        stepName,
        sessionId
      )

      const combinedResult = {
        isValid: validationResult.isValid && formValidationResult.isValid,
        errors: { ...validationResult.errors, ...formValidationResult.errors },
        warnings: formValidationResult.warnings
      }

      return ctx.ok(combinedResult)
    } catch (error) {
      strapi.log.error('Error validating step:', error)
      return ctx.internalServerError('Failed to validate step')
    }
  },

  /**
   * Get checkout analytics
   */
  async getAnalytics(ctx: any) {
    try {
      const { sessionId } = ctx.params
      const { user } = ctx.state

      if (!sessionId) {
        return ctx.badRequest('Session ID is required')
      }

      const checkoutSession = await strapi.documents('api::checkout-session.checkout-session').findOne({
        documentId: sessionId,
        populate: ['user']
      })

      if (!checkoutSession) {
        return ctx.notFound('Checkout session not found')
      }

      // Check authorization
      if (checkoutSession.user && checkoutSession.user.id !== user?.id) {
        return ctx.forbidden('Access denied')
      }

      // Get step analytics
      const stepAnalytics = await strapi.service('api::checkout-step.step-management').getStepAnalytics(sessionId)

      // Get session analytics
      const sessionAnalytics = await this.getSessionAnalytics(sessionId)

      const analytics = {
        stepAnalytics,
        sessionAnalytics
      }

      return ctx.ok(analytics)
    } catch (error) {
      strapi.log.error('Error getting checkout analytics:', error)
      return ctx.internalServerError('Failed to get analytics')
    }
  },

  /**
   * Abandon checkout session
   */
  async abandon(ctx: any) {
    try {
      const { sessionId } = ctx.params
      const { user } = ctx.state

      if (!sessionId) {
        return ctx.badRequest('Session ID is required')
      }

      const checkoutSession = await strapi.documents('api::checkout-session.checkout-session').findOne({
        documentId: sessionId,
        populate: ['user']
      })

      if (!checkoutSession) {
        return ctx.notFound('Checkout session not found')
      }

      // Check authorization
      if (checkoutSession.user && checkoutSession.user.id !== user?.id) {
        return ctx.forbidden('Access denied')
      }

      // Update session status
      await strapi.documents('api::checkout-session.checkout-session').update({
        documentId: sessionId,
        data: {
          status: 'abandoned'
        }
      })

      // Track abandonment
      await this.trackCheckoutEvent(sessionId, 'session_abandoned', {
        step: checkoutSession.step,
        reason: 'user_abandoned'
      })

      return ctx.ok({ message: 'Checkout session abandoned' })
    } catch (error) {
      strapi.log.error('Error abandoning checkout session:', error)
      return ctx.internalServerError('Failed to abandon checkout session')
    }
  },

  // Helper methods
  generateSessionId(): string {
    return 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  },

  async validateCheckoutSession(checkoutSession: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = []

    // Validate cart
    if (!checkoutSession.cart || checkoutSession.cart.items.length === 0) {
      errors.push('Cart is empty')
    }

    // Validate shipping address for non-cart steps
    if (checkoutSession.step !== 'cart' && !checkoutSession.shippingAddress) {
      errors.push('Shipping address is required')
    }

    // Validate billing address for payment and review steps
    if (['payment', 'review', 'confirmation'].includes(checkoutSession.step) && !checkoutSession.billingAddress) {
      errors.push('Billing address is required')
    }

    // Validate shipping method for shipping step and beyond
    if (['shipping', 'billing', 'payment', 'review', 'confirmation'].includes(checkoutSession.step) && !checkoutSession.shippingMethod) {
      errors.push('Shipping method is required')
    }

    // Validate payment method for payment step and beyond
    if (['payment', 'review', 'confirmation'].includes(checkoutSession.step) && !checkoutSession.paymentMethod) {
      errors.push('Payment method is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  async trackCheckoutEvent(sessionId: string, event: string, data: any): Promise<void> {
    try {
      // This would integrate with your analytics service
      // For now, we'll just log the event
      strapi.log.info('Checkout event tracked:', {
        sessionId,
        event,
        data,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      strapi.log.error('Error tracking checkout event:', error)
      // Don't throw error as analytics tracking is not critical
    }
  },

  async getSessionAnalytics(sessionId: string): Promise<any> {
    try {
      const session = await strapi.documents('api::checkout-session.checkout-session').findOne({
        documentId: sessionId
      })

      if (!session) {
        return {}
      }

      const timeSpent = session.createdAt ? 
        Math.floor((Date.now() - new Date(session.createdAt).getTime()) / 1000) : 0

      return {
        timeSpent,
        stepCount: 6, // Total number of steps
        currentStep: session.step,
        status: session.status,
        isExpired: session.expiresAt ? new Date() > new Date(session.expiresAt) : false
      }
    } catch (error) {
      strapi.log.error('Error getting session analytics:', error)
      return {}
    }
  }
})
