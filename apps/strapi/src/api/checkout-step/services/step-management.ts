'use strict'

interface StepConfig {
  name: string
  order: number
  required: boolean
  validationRules: Record<string, any>
  errorMessages: Record<string, string>
  dependencies: string[]
  canSkip: boolean
}

interface StepProgress {
  currentStep: string
  completedSteps: string[]
  availableSteps: string[]
  nextStep?: string
  previousStep?: string
  canProceed: boolean
  errors: Record<string, string[]>
}

interface StepAnalytics {
  timeSpent: number
  attempts: number
  completionRate: number
  averageTime: number
  abandonmentRate: number
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Step configuration for checkout flow
   */
  stepConfigs: {
    cart: {
      name: 'cart',
      order: 1,
      required: true,
      validationRules: {
        hasItems: true,
        totalAmount: { min: 0.01 }
      },
      errorMessages: {
        hasItems: 'Cart must contain at least one item',
        totalAmount: 'Cart total must be greater than zero'
      },
      dependencies: [],
      canSkip: false
    },
    shipping: {
      name: 'shipping',
      order: 2,
      required: true,
      validationRules: {
        address: { required: true },
        shippingMethod: { required: true }
      },
      errorMessages: {
        address: 'Shipping address is required',
        shippingMethod: 'Please select a shipping method'
      },
      dependencies: ['cart'],
      canSkip: false
    },
    billing: {
      name: 'billing',
      order: 3,
      required: true,
      validationRules: {
        address: { required: true },
        paymentMethod: { required: true }
      },
      errorMessages: {
        address: 'Billing address is required',
        paymentMethod: 'Please select a payment method'
      },
      dependencies: ['shipping'],
      canSkip: false
    },
    payment: {
      name: 'payment',
      order: 4,
      required: true,
      validationRules: {
        cardNumber: { required: true, format: 'credit_card' },
        expiryDate: { required: true, format: 'expiry' },
        cvv: { required: true, format: 'cvv' }
      },
      errorMessages: {
        cardNumber: 'Valid card number is required',
        expiryDate: 'Valid expiry date is required',
        cvv: 'Valid CVV is required'
      },
      dependencies: ['billing'],
      canSkip: false
    },
    review: {
      name: 'review',
      order: 5,
      required: true,
      validationRules: {
        termsAccepted: { required: true },
        privacyAccepted: { required: true }
      },
      errorMessages: {
        termsAccepted: 'You must accept the terms and conditions',
        privacyAccepted: 'You must accept the privacy policy'
      },
      dependencies: ['payment'],
      canSkip: false
    },
    confirmation: {
      name: 'confirmation',
      order: 6,
      required: false,
      validationRules: {},
      errorMessages: {},
      dependencies: ['review'],
      canSkip: true
    }
  },

  /**
   * Initialize checkout steps for a session
   */
  async initializeSteps(checkoutSessionId: string): Promise<any[]> {
    try {
      const steps = Object.values(this.stepConfigs).map(config => ({
        checkoutSession: checkoutSessionId,
        stepName: config.name,
        stepOrder: config.order,
        isRequired: config.required,
        isActive: config.order === 1, // Only first step is active initially
        isCompleted: false,
        validationRules: config.validationRules,
        errorMessages: config.errorMessages,
        startedAt: config.order === 1 ? new Date() : null,
        stepData: {},
        validationErrors: {},
        navigationHistory: [],
        analytics: {
          timeSpent: 0,
          attempts: 0,
          completionRate: 0,
          averageTime: 0,
          abandonmentRate: 0
        }
      }))

      const createdSteps = await Promise.all(
        steps.map(step => 
          strapi.documents('api::checkout-step.checkout-step').create({
            data: step
          })
        )
      )

      return createdSteps
    } catch (error) {
      strapi.log.error('Error initializing checkout steps:', error)
      throw new Error('Failed to initialize checkout steps')
    }
  },

  /**
   * Get current step progress for a checkout session
   */
  async getStepProgress(checkoutSessionId: string): Promise<StepProgress> {
    try {
      const steps = await strapi.documents('api::checkout-step.checkout-step').findMany({
        filters: { checkoutSession: checkoutSessionId },
        sort: { stepOrder: 'asc' },
        populate: ['checkoutSession']
      })

      if (!steps || steps.length === 0) {
        // Return default progress for empty steps
        return {
          currentStep: 'cart',
          completedSteps: [],
          availableSteps: [],
          nextStep: undefined,
          previousStep: undefined,
          canProceed: false,
          errors: {}
        }
      }

      const currentStep = steps.find(step => step.isActive)
      const completedSteps = steps.filter(step => step.isCompleted).map(step => step.stepName)
      const availableSteps = this.getAvailableSteps(steps, completedSteps)

      const nextStep = this.getNextStep(steps, currentStep?.stepName)
      const previousStep = this.getPreviousStep(steps, currentStep?.stepName)

      const canProceed = await this.canProceedToNextStep(checkoutSessionId, currentStep?.stepName)
      const errors = await this.getStepErrors(checkoutSessionId, currentStep?.stepName)

      return {
        currentStep: currentStep?.stepName || 'cart',
        completedSteps,
        availableSteps,
        nextStep: nextStep?.stepName,
        previousStep: previousStep?.stepName,
        canProceed,
        errors
      }
    } catch (error) {
      strapi.log.error('Error getting step progress:', error)
      throw new Error('Failed to get step progress')
    }
  },

  /**
   * Move to next step
   */
  async moveToNextStep(checkoutSessionId: string): Promise<StepProgress> {
    try {
      const currentProgress = await this.getStepProgress(checkoutSessionId)
      
      if (!currentProgress.canProceed) {
        throw new Error('Cannot proceed to next step - validation failed')
      }

      const steps = await strapi.documents('api::checkout-step.checkout-step').findMany({
        filters: { checkoutSession: checkoutSessionId },
        sort: { stepOrder: 'asc' }
      })

      const currentStep = steps.find(step => step.stepName === currentProgress.currentStep)
      const nextStep = steps.find(step => step.stepName === currentProgress.nextStep)

      if (!nextStep) {
        throw new Error('No next step available')
      }

      // Complete current step
      if (currentStep) {
        await this.completeStep(currentStep.documentId)
      }

      // Activate next step
      await this.activateStep(nextStep.documentId)

      return await this.getStepProgress(checkoutSessionId)
    } catch (error) {
      strapi.log.error('Error moving to next step:', error)
      throw error
    }
  },

  /**
   * Move to previous step
   */
  async moveToPreviousStep(checkoutSessionId: string): Promise<StepProgress> {
    try {
      const currentProgress = await this.getStepProgress(checkoutSessionId)
      
      if (!currentProgress.previousStep) {
        throw new Error('No previous step available')
      }

      const steps = await strapi.documents('api::checkout-step.checkout-step').findMany({
        filters: { checkoutSession: checkoutSessionId },
        sort: { stepOrder: 'asc' }
      })

      const currentStep = steps.find(step => step.stepName === currentProgress.currentStep)
      const previousStep = steps.find(step => step.stepName === currentProgress.previousStep)

      // Deactivate current step
      if (currentStep) {
        await this.deactivateStep(currentStep.documentId)
      }

      // Activate previous step
      if (previousStep) {
        await this.activateStep(previousStep.documentId)
      }

      return await this.getStepProgress(checkoutSessionId)
    } catch (error) {
      strapi.log.error('Error moving to previous step:', error)
      throw error
    }
  },

  /**
   * Jump to specific step
   */
  async jumpToStep(checkoutSessionId: string, targetStepName: string): Promise<StepProgress> {
    try {
      const steps = await strapi.documents('api::checkout-step.checkout-step').findMany({
        filters: { checkoutSession: checkoutSessionId },
        sort: { stepOrder: 'asc' }
      })

      if (!steps || steps.length === 0) {
        throw new Error('No steps found for session')
      }

      const targetStep = steps.find(step => step.stepName === targetStepName)
      if (!targetStep) {
        throw new Error('Target step not found')
      }

      // Check if step is available
      const completedSteps = steps.filter(step => step.isCompleted).map(step => step.stepName)
      const availableSteps = this.getAvailableSteps(steps, completedSteps)
      
      if (!availableSteps.includes(targetStepName)) {
        throw new Error('Target step is not available')
      }

      // Deactivate all steps
      await Promise.all(
        steps.map(step => this.deactivateStep(step.documentId))
      )

      // Activate target step
      await this.activateStep(targetStep.documentId)

      return await this.getStepProgress(checkoutSessionId)
    } catch (error) {
      strapi.log.error('Error jumping to step:', error)
      throw error
    }
  },

  /**
   * Complete a step
   */
  async completeStep(stepDocumentId: string): Promise<void> {
    try {
      const step = await strapi.documents('api::checkout-step.checkout-step').findOne({
        documentId: stepDocumentId
      })

      if (!step) {
        throw new Error('Step not found')
      }

      const timeSpent = step.startedAt ? 
        Math.floor((Date.now() - new Date(step.startedAt).getTime()) / 1000) : 0

      await strapi.documents('api::checkout-step.checkout-step').update({
        documentId: stepDocumentId,
        data: {
          isCompleted: true,
          isActive: false,
          completedAt: new Date(),
          timeSpent: (step.timeSpent || 0) + timeSpent,
          attempts: (step.attempts || 0) + 1,
          lastAttemptAt: new Date()
        }
      })
    } catch (error) {
      strapi.log.error('Error completing step:', error)
      throw error
    }
  },

  /**
   * Activate a step
   */
  async activateStep(stepDocumentId: string): Promise<void> {
    try {
      await strapi.documents('api::checkout-step.checkout-step').update({
        documentId: stepDocumentId,
        data: {
          isActive: true,
          startedAt: new Date()
        }
      })
    } catch (error) {
      strapi.log.error('Error activating step:', error)
      throw error
    }
  },

  /**
   * Deactivate a step
   */
  async deactivateStep(stepDocumentId: string): Promise<void> {
    try {
      await strapi.documents('api::checkout-step.checkout-step').update({
        documentId: stepDocumentId,
        data: {
          isActive: false
        }
      })
    } catch (error) {
      strapi.log.error('Error deactivating step:', error)
      throw error
    }
  },

  /**
   * Validate step data
   */
  async validateStep(checkoutSessionId: string, stepName: string, stepData: any): Promise<{ isValid: boolean; errors: Record<string, string[]> }> {
    try {
      const step = await strapi.documents('api::checkout-step.checkout-step').findFirst({
        filters: {
          checkoutSession: checkoutSessionId,
          stepName
        }
      })

      if (!step) {
        throw new Error('Step not found')
      }

      const config = this.stepConfigs[stepName]
      if (!config) {
        throw new Error('Step configuration not found')
      }

      const errors: Record<string, string[]> = {}
      let isValid = true

      // Add email validation for all steps
      if (stepData.email && !this.isValidEmail(stepData.email)) {
        errors.email = ['Invalid email format']
        isValid = false
      }

      // Validate against step rules
      for (const [field, rule] of Object.entries(config.validationRules)) {
        const fieldErrors: string[] = []
        const value = stepData[field]

        const validationRule = rule as any
        if (validationRule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
          fieldErrors.push(config.errorMessages[field] || `${field} is required`)
          isValid = false
        }

        if (value && validationRule.format) {
          const formatError = this.validateFieldFormat(field, value, validationRule.format)
          if (formatError) {
            fieldErrors.push(formatError)
            isValid = false
          }
        }

        if (fieldErrors.length > 0) {
          errors[field] = fieldErrors
        }
      }

      // Update step with validation results
      await strapi.documents('api::checkout-step.checkout-step').update({
        documentId: step.documentId,
        data: {
          validationErrors: errors,
          stepData,
          attempts: (step.attempts || 0) + 1,
          lastAttemptAt: new Date()
        }
      })

      return { isValid, errors }
    } catch (error) {
      strapi.log.error('Error validating step:', error)
      throw error
    }
  },

  /**
   * Get step analytics
   */
  async getStepAnalytics(checkoutSessionId: string): Promise<Record<string, StepAnalytics>> {
    try {
      const steps = await strapi.documents('api::checkout-step.checkout-step').findMany({
        filters: { checkoutSession: checkoutSessionId }
      })

      const analytics: Record<string, StepAnalytics> = {}

      for (const step of steps) {
        const config = this.stepConfigs[step.stepName]
        if (!config) continue

        analytics[step.stepName] = {
          timeSpent: step.timeSpent || 0,
          attempts: step.attempts || 0,
          completionRate: step.isCompleted ? 100 : 0,
          averageTime: step.timeSpent && step.attempts ? step.timeSpent / step.attempts : 0,
          abandonmentRate: step.attempts > 0 && !step.isCompleted ? 100 : 0
        }
      }

      return analytics
    } catch (error) {
      strapi.log.error('Error getting step analytics:', error)
      throw new Error('Failed to get step analytics')
    }
  },

  /**
   * Track step navigation
   */
  async trackNavigation(checkoutSessionId: string, stepName: string, action: string): Promise<void> {
    try {
      const step = await strapi.documents('api::checkout-step.checkout-step').findFirst({
        filters: {
          checkoutSession: checkoutSessionId,
          stepName
        }
      })

      if (!step) return

      const navigationEntry = {
        action,
        timestamp: new Date().toISOString(),
        stepName,
        sessionId: checkoutSessionId
      }

      const navigationHistory = Array.isArray(step.navigationHistory) ? step.navigationHistory : []
      navigationHistory.push(navigationEntry)

      await strapi.documents('api::checkout-step.checkout-step').update({
        documentId: step.documentId,
        data: {
          navigationHistory
        }
      })
    } catch (error) {
      strapi.log.error('Error tracking navigation:', error)
      // Don't throw error as navigation tracking is not critical
    }
  },

  // Helper methods
  getAvailableSteps(steps: any[], completedSteps: string[]): string[] {
    const availableSteps: string[] = []
    
    for (const step of steps) {
      const config = this.stepConfigs[step.stepName]
      if (!config) continue

      const dependenciesMet = config.dependencies.every(dep => completedSteps.includes(dep))
      if (dependenciesMet) {
        availableSteps.push(step.stepName)
      }
    }

    return availableSteps
  },

  getNextStep(steps: any[], currentStepName?: string): any {
    if (!currentStepName) return steps[0]

    const currentStep = steps.find(step => step.stepName === currentStepName)
    if (!currentStep) return null

    return steps.find(step => step.stepOrder === currentStep.stepOrder + 1)
  },

  getPreviousStep(steps: any[], currentStepName?: string): any {
    if (!currentStepName) return null

    const currentStep = steps.find(step => step.stepName === currentStepName)
    if (!currentStep) return null

    return steps.find(step => step.stepOrder === currentStep.stepOrder - 1)
  },

  async canProceedToNextStep(checkoutSessionId: string, currentStepName?: string): Promise<boolean> {
    if (!currentStepName) return false

    const step = await strapi.documents('api::checkout-step.checkout-step').findFirst({
      filters: {
        checkoutSession: checkoutSessionId,
        stepName: currentStepName
      }
    })

    if (!step) return false

    // Check if step is completed or can be skipped
    const config = this.stepConfigs[currentStepName]
    if (!config) return false

    return step.isCompleted || config.canSkip
  },

  async getStepErrors(checkoutSessionId: string, stepName?: string): Promise<Record<string, string[]>> {
    if (!stepName) return {}

    const step = await strapi.documents('api::checkout-step.checkout-step').findFirst({
      filters: {
        checkoutSession: checkoutSessionId,
        stepName
      }
    })

    return step?.validationErrors || {}
  },

  validateFieldFormat(field: string, value: any, format: string): string | null {
    switch (format) {
      case 'credit_card':
        if (!this.luhnCheck(value.toString().replace(/\D/g, ''))) {
          return 'Invalid card number'
        }
        break
      case 'expiry':
        const [month, year] = value.split('/')
        if (!month || !year || month < 1 || month > 12) {
          return 'Invalid expiry date format (MM/YY)'
        }
        break
      case 'cvv':
        if (!/^\d{3,4}$/.test(value)) {
          return 'Invalid CVV format'
        }
        break
    }
    return null
  },

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  luhnCheck(cardNumber: string): boolean {
    if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
      return false
    }

    let sum = 0
    let isEven = false
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i))
      
      if (isEven) {
        digit *= 2
        if (digit > 9) {
          digit -= 9
        }
      }
      
      sum += digit
      isEven = !isEven
    }
    
    return sum % 10 === 0
  }
})
