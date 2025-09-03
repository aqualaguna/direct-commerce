import React from 'react'
import { CartStep } from './steps/CartStep'
import { ShippingStep } from './steps/ShippingStep'
import { BillingStep } from './steps/BillingStep'
import { PaymentStep } from './steps/PaymentStep'
import { ReviewStep } from './steps/ReviewStep'
import { ConfirmationStep } from './steps/ConfirmationStep'
import { CheckoutStepType, CheckoutSession } from '../../types/checkout'

interface CheckoutStepProps {
  step: CheckoutStepType
  session: CheckoutSession
  formData: Record<string, any>
  validationErrors: Record<string, string[]>
  onFormUpdate: (data: Record<string, any>) => void
  onValidate: () => Promise<{ isValid: boolean; errors: Record<string, string[]> }>
}

export const CheckoutStep: React.FC<CheckoutStepProps> = ({
  step,
  session,
  formData,
  validationErrors,
  onFormUpdate,
  onValidate
}) => {
  const stepProps = {
    session,
    formData,
    validationErrors,
    onFormUpdate,
    onValidate
  }

  switch (step) {
    case 'cart':
      return <CartStep {...stepProps} />
    
    case 'shipping':
      return <ShippingStep {...stepProps} />
    
    case 'billing':
      return <BillingStep {...stepProps} />
    
    case 'payment':
      return <PaymentStep {...stepProps} />
    
    case 'review':
      return <ReviewStep {...stepProps} />
    
    case 'confirmation':
      return <ConfirmationStep {...stepProps} />
    
    default:
      return (
        <div className="checkout-step error">
          <h2>Unknown Step</h2>
          <p>The checkout step "{step}" is not recognized.</p>
        </div>
      )
  }
}
