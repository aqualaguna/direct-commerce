/**
 * Static checkout step configuration
 * 
 * This configuration replaces the dynamic CheckoutStep and CheckoutForm tables
 * to eliminate redundant database records and improve performance.
 */

export interface CheckoutStepConfig {
  order: number;
  required: boolean;
  validationRules: Record<string, any>;
  displayName: string;
  description?: string;
  isActive?: boolean;
  errorMessages?: Record<string, string>;
  accessibilityFeatures?: Record<string, any>;
  usabilityFeatures?: Record<string, any>;
}

export interface CheckoutStepsConfig {
  [stepName: string]: CheckoutStepConfig;
}

export const CHECKOUT_STEPS: CheckoutStepsConfig = {
  cart: {
    order: 1,
    required: true,
    validationRules: {},
    displayName: "Cart Review",
    description: "Review your cart items and quantities",
    isActive: true,
    errorMessages: {
      empty: "Your cart is empty",
      invalid: "Some items in your cart are no longer available"
    }
  },
  shipping: {
    order: 2,
    required: true,
    validationRules: { 
      address: "required",
      firstName: "required",
      lastName: "required",
      email: "required|email",
      phone: "required"
    },
    displayName: "Shipping Address",
    description: "Enter your shipping address",
    isActive: true,
    errorMessages: {
      address: "Shipping address is required",
      firstName: "First name is required",
      lastName: "Last name is required",
      email: "Valid email is required",
      phone: "Phone number is required"
    },
    accessibilityFeatures: {
      ariaLabel: "Shipping address form",
      requiredFields: ["firstName", "lastName", "email", "phone", "address"]
    }
  },
  billing: {
    order: 3,
    required: true,
    validationRules: { 
      address: "required",
      firstName: "required",
      lastName: "required"
    },
    displayName: "Billing Address",
    description: "Enter your billing address",
    isActive: true,
    errorMessages: {
      address: "Billing address is required",
      firstName: "First name is required",
      lastName: "Last name is required"
    },
    accessibilityFeatures: {
      ariaLabel: "Billing address form",
      requiredFields: ["firstName", "lastName", "address"]
    }
  },
  payment: {
    order: 4,
    required: true,
    validationRules: { 
      paymentMethod: "required",
      cardNumber: "required|creditCard",
      expiryDate: "required|date",
      cvv: "required|numeric|min:3|max:4"
    },
    displayName: "Payment Method",
    description: "Enter your payment information",
    isActive: true,
    errorMessages: {
      paymentMethod: "Payment method is required",
      cardNumber: "Valid card number is required",
      expiryDate: "Valid expiry date is required",
      cvv: "Valid CVV is required"
    },
    accessibilityFeatures: {
      ariaLabel: "Payment method form",
      requiredFields: ["paymentMethod", "cardNumber", "expiryDate", "cvv"]
    }
  },
  review: {
    order: 5,
    required: true,
    validationRules: {},
    displayName: "Order Review",
    description: "Review your order details before confirmation",
    isActive: true,
    errorMessages: {
      terms: "You must accept the terms and conditions"
    },
    accessibilityFeatures: {
      ariaLabel: "Order review summary"
    }
  },
  confirmation: {
    order: 6,
    required: false,
    validationRules: {},
    displayName: "Order Confirmation",
    description: "Your order has been confirmed",
    isActive: true,
    accessibilityFeatures: {
      ariaLabel: "Order confirmation page"
    }
  }
};

/**
 * Get step configuration by name
 */
export const getStepConfig = (stepName: string): CheckoutStepConfig | null => {
  return CHECKOUT_STEPS[stepName] || null;
};

/**
 * Get all step names in order
 */
export const getStepNames = (): string[] => {
  return Object.keys(CHECKOUT_STEPS).sort((a, b) => 
    CHECKOUT_STEPS[a].order - CHECKOUT_STEPS[b].order
  );
};

/**
 * Get next step name
 */
export const getNextStep = (currentStep: string): string | null => {
  const stepNames = getStepNames();
  const currentIndex = stepNames.indexOf(currentStep);
  
  if (currentIndex === -1 || currentIndex === stepNames.length - 1) {
    return null;
  }
  
  return stepNames[currentIndex + 1];
};

/**
 * Get previous step name
 */
export const getPreviousStep = (currentStep: string): string | null => {
  const stepNames = getStepNames();
  const currentIndex = stepNames.indexOf(currentStep);
  
  if (currentIndex <= 0) {
    return null;
  }
  
  return stepNames[currentIndex - 1];
};

/**
 * Check if step is required
 */
export const isStepRequired = (stepName: string): boolean => {
  const config = getStepConfig(stepName);
  return config?.required || false;
};

/**
 * Get step validation rules
 */
export const getStepValidationRules = (stepName: string): Record<string, any> => {
  const config = getStepConfig(stepName);
  return config?.validationRules || {};
};

/**
 * Get step display name
 */
export const getStepDisplayName = (stepName: string): string => {
  const config = getStepConfig(stepName);
  return config?.displayName || stepName;
};

/**
 * Check if step is active
 */
export const isStepActive = (stepName: string): boolean => {
  const config = getStepConfig(stepName);
  return config ? config.isActive !== false : false;
};

/**
 * Get step error messages
 */
export const getStepErrorMessages = (stepName: string): Record<string, string> => {
  const config = getStepConfig(stepName);
  return config?.errorMessages || {};
};

/**
 * Get step accessibility features
 */
export const getStepAccessibilityFeatures = (stepName: string): Record<string, any> => {
  const config = getStepConfig(stepName);
  return config?.accessibilityFeatures || {};
};

export default CHECKOUT_STEPS;
