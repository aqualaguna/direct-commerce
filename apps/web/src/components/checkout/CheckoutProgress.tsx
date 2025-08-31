import React from 'react'
import { CheckoutStepType } from '../../types/checkout'

interface CheckoutProgressProps {
  currentStep: CheckoutStepType
  completedSteps: string[]
  availableSteps: string[]
  onStepClick: (step: CheckoutStepType) => void
  className?: string
}

const stepConfig = {
  cart: { title: 'Cart', icon: '🛒', order: 1 },
  shipping: { title: 'Shipping', icon: '📦', order: 2 },
  billing: { title: 'Billing', icon: '💳', order: 3 },
  payment: { title: 'Payment', icon: '🔒', order: 4 },
  review: { title: 'Review', icon: '✅', order: 5 },
  confirmation: { title: 'Confirmation', icon: '🎉', order: 6 }
}

export const CheckoutProgress: React.FC<CheckoutProgressProps> = ({
  currentStep,
  completedSteps,
  availableSteps,
  onStepClick,
  className = ''
}) => {
  const steps = Object.entries(stepConfig).sort(([, a], [, b]) => a.order - b.order)

  const getStepStatus = (stepName: string) => {
    if (currentStep === stepName) return 'current'
    if (completedSteps.includes(stepName)) return 'completed'
    if (availableSteps.includes(stepName)) return 'available'
    return 'disabled'
  }

  const isStepClickable = (stepName: string) => {
    return availableSteps.includes(stepName) || completedSteps.includes(stepName)
  }

  return (
    <div className={`checkout-progress ${className}`}>
      <div className="progress-container">
        {steps.map(([stepName, config], index) => {
          const status = getStepStatus(stepName)
          const isClickable = isStepClickable(stepName)
          const isLast = index === steps.length - 1

          return (
            <React.Fragment key={stepName}>
              <div
                className={`progress-step ${status} ${isClickable ? 'clickable' : ''}`}
                onClick={() => isClickable && onStepClick(stepName as CheckoutStepType)}
              >
                <div className="step-icon">
                  {status === 'completed' ? '✓' : config.icon}
                </div>
                <div className="step-content">
                  <span className="step-number">{config.order}</span>
                  <span className="step-title">{config.title}</span>
                </div>
                {status === 'current' && (
                  <div className="current-indicator">
                    <div className="pulse"></div>
                  </div>
                )}
              </div>

              {!isLast && (
                <div className={`progress-connector ${status === 'completed' ? 'completed' : ''}`}>
                  <div className="connector-line"></div>
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Mobile progress indicator */}
      <div className="mobile-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${(stepConfig[currentStep].order / steps.length) * 100}%` 
            }}
          ></div>
        </div>
        <div className="mobile-step-info">
          <span className="step-icon">{stepConfig[currentStep].icon}</span>
          <span className="step-title">{stepConfig[currentStep].title}</span>
          <span className="step-counter">
            Step {stepConfig[currentStep].order} of {steps.length}
          </span>
        </div>
      </div>
    </div>
  )
}
