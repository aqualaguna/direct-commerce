import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckoutStep } from './CheckoutStep'
import { CheckoutProgress } from './CheckoutProgress'
import { CheckoutValidation } from './CheckoutValidation'
import { useCheckoutSession } from '../../hooks/useCheckoutSession'
import { useCheckoutForm } from '../../hooks/useCheckoutForm'
import { CheckoutStepType, CheckoutSession, StepProgress } from '../../types/checkout'

interface CheckoutFlowProps {
  sessionId: string
  onComplete?: (orderId: string) => void
  onAbandon?: () => void
  className?: string
}

export const CheckoutFlow: React.FC<CheckoutFlowProps> = ({
  sessionId,
  onComplete,
  onAbandon,
  className = ''
}) => {
  const [currentStep, setCurrentStep] = useState<CheckoutStepType>('cart')
  const [stepProgress, setStepProgress] = useState<Record<string, any> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const {
    session,
    loading: sessionLoading,
    error: sessionError,
    updateSession,
    abandonSession
  } = useCheckoutSession(sessionId)

  const {
    formData,
    validationErrors,
    isValid,
    updateFormData,
    validateForm,
    submitForm
  } = useCheckoutForm(sessionId, currentStep)

  // Load initial session data
  useEffect(() => {
    if (session && !sessionLoading) {
      setCurrentStep(session.currentStep || 'cart')
      setStepProgress(session.stepProgress)
      setIsLoading(false)
    }
  }, [session, sessionLoading])

  // Handle session errors
  useEffect(() => {
    if (sessionError) {
      setError(sessionError)
      setIsLoading(false)
    }
  }, [sessionError])

  // Handle step progression
  const handleNextStep = useCallback(async () => {
    if (!session || !stepProgress) return

    try {
      setIsLoading(true)
      setError(null)

      // Validate current step
      const validationResult = await validateForm()
      if (!validationResult.isValid) {
        setError('Please fix the validation errors before proceeding')
        setIsLoading(false)
        return
      }

      // Submit form data
      await submitForm()

      // Mark current step as completed and move to next step
      const response = await fetch(`/api/checkout/session/${sessionId}/steps/${currentStep}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ formData })
      })

      if (!response.ok) {
        throw new Error('Failed to complete step')
      }

      const updatedSession = await response.json()
      setStepProgress(updatedSession.stepProgress)
      setCurrentStep(updatedSession.currentStep)

      // Check if checkout is complete
      if (newStepProgress.currentStep === 'confirmation') {
        onComplete?.(session.order?.id || '')
      }

      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to proceed to next step')
      setIsLoading(false)
    }
  }, [session, stepProgress, sessionId, validateForm, submitForm, updateSession, onComplete])

  const handlePreviousStep = useCallback(async () => {
    if (!session || !stepProgress) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/checkout/session/${sessionId}/steps/previous`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to move to previous step')
      }

      const updatedSession = await response.json()
      setStepProgress(updatedSession.stepProgress)
      setCurrentStep(updatedSession.currentStep)

      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move to previous step')
      setIsLoading(false)
    }
  }, [session, stepProgress, sessionId])

  const handleJumpToStep = useCallback(async (stepName: CheckoutStepType) => {
    if (!session || !stepProgress) return

    try {
      setIsLoading(true)
      setError(null)

      // Check if step is accessible (all previous steps completed)
      const stepIndex = ['cart', 'shipping', 'billing', 'payment', 'review', 'confirmation'].indexOf(stepName)
      const currentIndex = ['cart', 'shipping', 'billing', 'payment', 'review', 'confirmation'].indexOf(currentStep)
      
      if (stepIndex > currentIndex + 1) {
        throw new Error('Cannot jump to step - previous steps must be completed first')
      }

      // Update current step
      const response = await fetch(`/api/checkout/session/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ currentStep: stepName })
      })

      if (!response.ok) {
        throw new Error('Failed to jump to step')
      }

      const updatedSession = await response.json()
      setStepProgress(updatedSession.stepProgress)
      setCurrentStep(updatedSession.currentStep)

      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to jump to step')
      setIsLoading(false)
    }
  }, [session, stepProgress, sessionId, currentStep])

  const handleAbandon = useCallback(async () => {
    try {
      await abandonSession()
      onAbandon?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to abandon checkout')
    }
  }, [abandonSession, onAbandon])

  const handleFormUpdate = useCallback((data: Record<string, any>) => {
    updateFormData(data)
  }, [updateFormData])

  // Loading state
  if (isLoading || sessionLoading) {
    return (
      <div className={`checkout-flow loading ${className}`}>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading checkout...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !session) {
    return (
      <div className={`checkout-flow error ${className}`}>
        <div className="error-message">
          <h3>Checkout Error</h3>
          <p>{error || 'Failed to load checkout session'}</p>
          <button onClick={handleAbandon} className="btn-secondary">
            Return to Cart
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`checkout-flow ${className}`}>
      {/* Progress indicator */}
      <CheckoutProgress
        currentStep={currentStep}
        stepProgress={stepProgress}
        onStepClick={handleJumpToStep}
      />

      {/* Main checkout content */}
      <div className="checkout-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CheckoutStep
              step={currentStep}
              session={session}
              formData={formData}
              validationErrors={validationErrors}
              onFormUpdate={handleFormUpdate}
              onValidate={validateForm}
            />
          </motion.div>
        </AnimatePresence>

        {/* Validation errors */}
        {error && (
          <CheckoutValidation
            errors={[error]}
            type="error"
            className="mt-4"
          />
        )}

        {/* Step validation errors */}
        {validationErrors && Object.keys(validationErrors).length > 0 && (
          <CheckoutValidation
            errors={Object.values(validationErrors).flat()}
            type="error"
            className="mt-4"
          />
        )}

        {/* Navigation buttons */}
        <div className="checkout-navigation">
          <div className="navigation-buttons">
            {currentStep !== 'cart' && (
              <button
                onClick={handlePreviousStep}
                disabled={isLoading}
                className="btn-secondary"
              >
                ← Back
              </button>
            )}

            <div className="navigation-right">
              <button
                onClick={handleAbandon}
                disabled={isLoading}
                className="btn-text"
              >
                Save for Later
              </button>

              {currentStep !== 'confirmation' && (
                <button
                  onClick={handleNextStep}
                  disabled={isLoading || !isValid}
                  className="btn-primary"
                >
                  {currentStep === 'review' ? 'Place Order' : 'Continue →'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Processing...</p>
          </div>
        </div>
      )}
    </div>
  )
}
