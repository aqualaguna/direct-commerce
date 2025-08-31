import React from 'react'

interface CheckoutValidationProps {
  errors?: string[]
  warnings?: string[]
  type?: 'error' | 'warning' | 'info'
  className?: string
}

export const CheckoutValidation: React.FC<CheckoutValidationProps> = ({
  errors = [],
  warnings = [],
  type = 'error',
  className = ''
}) => {
  if (errors.length === 0 && warnings.length === 0) {
    return null
  }

  const getIcon = () => {
    switch (type) {
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      default:
        return '❌'
    }
  }

  const getTitle = () => {
    switch (type) {
      case 'error':
        return 'Please fix the following errors:'
      case 'warning':
        return 'Please review the following warnings:'
      case 'info':
        return 'Please note:'
      default:
        return 'Please fix the following errors:'
    }
  }

  const getContainerClass = () => {
    switch (type) {
      case 'error':
        return 'validation-error'
      case 'warning':
        return 'validation-warning'
      case 'info':
        return 'validation-info'
      default:
        return 'validation-error'
    }
  }

  return (
    <div className={`checkout-validation ${getContainerClass()} ${className}`}>
      <div className="validation-header">
        <span className="validation-icon">{getIcon()}</span>
        <h4 className="validation-title">{getTitle()}</h4>
      </div>

      <div className="validation-content">
        {errors.length > 0 && (
          <div className="validation-errors">
            <ul className="error-list">
              {errors.map((error, index) => (
                <li key={index} className="error-item">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="validation-warnings">
            <ul className="warning-list">
              {warnings.map((warning, index) => (
                <li key={index} className="warning-item">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Accessibility announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {type === 'error' && errors.length > 0 && (
          <span>
            {errors.length} validation error{errors.length > 1 ? 's' : ''} found. 
            {errors.join('. ')}
          </span>
        )}
        {type === 'warning' && warnings.length > 0 && (
          <span>
            {warnings.length} warning{warnings.length > 1 ? 's' : ''} found. 
            {warnings.join('. ')}
          </span>
        )}
      </div>
    </div>
  )
}
