/**
 * Unit tests for checkout step configuration
 * 
 * Tests the static step configuration and utility functions
 */

const {
  CHECKOUT_STEPS,
  getStepConfig,
  getStepNames,
  getNextStep,
  getPreviousStep,
  isStepRequired,
  getStepValidationRules,
  getStepDisplayName,
  isStepActive,
  getStepErrorMessages,
  getStepAccessibilityFeatures
} = require('../checkout-steps');

describe('Checkout Steps Configuration', () => {
  describe('CHECKOUT_STEPS constant', () => {
    it('should have all required steps', () => {
      const expectedSteps = ['cart', 'shipping', 'billing', 'payment', 'review', 'confirmation'];
      
      expectedSteps.forEach(step => {
        expect(CHECKOUT_STEPS).toHaveProperty(step);
      });
    });

    it('should have correct step order', () => {
      expect(CHECKOUT_STEPS.cart.order).toBe(1);
      expect(CHECKOUT_STEPS.shipping.order).toBe(2);
      expect(CHECKOUT_STEPS.billing.order).toBe(3);
      expect(CHECKOUT_STEPS.payment.order).toBe(4);
      expect(CHECKOUT_STEPS.review.order).toBe(5);
      expect(CHECKOUT_STEPS.confirmation.order).toBe(6);
    });

    it('should have required properties for each step', () => {
      Object.values(CHECKOUT_STEPS).forEach(step => {
        expect(step).toHaveProperty('order');
        expect(step).toHaveProperty('required');
        expect(step).toHaveProperty('validationRules');
        expect(step).toHaveProperty('displayName');
        expect(typeof step.order).toBe('number');
        expect(typeof step.required).toBe('boolean');
        expect(typeof step.validationRules).toBe('object');
        expect(typeof step.displayName).toBe('string');
      });
    });

    it('should have cart step as required', () => {
      expect(CHECKOUT_STEPS.cart.required).toBe(true);
    });

    it('should have confirmation step as not required', () => {
      expect(CHECKOUT_STEPS.confirmation.required).toBe(false);
    });
  });

  describe('getStepConfig', () => {
    it('should return step configuration for valid step name', () => {
      const config = getStepConfig('cart');
      expect(config).toEqual(CHECKOUT_STEPS.cart);
    });

    it('should return null for invalid step name', () => {
      const config = getStepConfig('invalid-step');
      expect(config).toBeNull();
    });

    it('should return null for empty string', () => {
      const config = getStepConfig('');
      expect(config).toBeNull();
    });
  });

  describe('getStepNames', () => {
    it('should return step names in correct order', () => {
      const stepNames = getStepNames();
      expect(stepNames).toEqual(['cart', 'shipping', 'billing', 'payment', 'review', 'confirmation']);
    });

    it('should return array of strings', () => {
      const stepNames = getStepNames();
      expect(Array.isArray(stepNames)).toBe(true);
      stepNames.forEach(name => {
        expect(typeof name).toBe('string');
      });
    });
  });

  describe('getNextStep', () => {
    it('should return next step for valid current step', () => {
      expect(getNextStep('cart')).toBe('shipping');
      expect(getNextStep('shipping')).toBe('billing');
      expect(getNextStep('billing')).toBe('payment');
      expect(getNextStep('payment')).toBe('review');
      expect(getNextStep('review')).toBe('confirmation');
    });

    it('should return null for last step', () => {
      expect(getNextStep('confirmation')).toBeNull();
    });

    it('should return null for invalid step', () => {
      expect(getNextStep('invalid-step')).toBeNull();
    });
  });

  describe('getPreviousStep', () => {
    it('should return previous step for valid current step', () => {
      expect(getPreviousStep('shipping')).toBe('cart');
      expect(getPreviousStep('billing')).toBe('shipping');
      expect(getPreviousStep('payment')).toBe('billing');
      expect(getPreviousStep('review')).toBe('payment');
      expect(getPreviousStep('confirmation')).toBe('review');
    });

    it('should return null for first step', () => {
      expect(getPreviousStep('cart')).toBeNull();
    });

    it('should return null for invalid step', () => {
      expect(getPreviousStep('invalid-step')).toBeNull();
    });
  });

  describe('isStepRequired', () => {
    it('should return true for required steps', () => {
      expect(isStepRequired('cart')).toBe(true);
      expect(isStepRequired('shipping')).toBe(true);
      expect(isStepRequired('billing')).toBe(true);
      expect(isStepRequired('payment')).toBe(true);
      expect(isStepRequired('review')).toBe(true);
    });

    it('should return false for non-required steps', () => {
      expect(isStepRequired('confirmation')).toBe(false);
    });

    it('should return false for invalid steps', () => {
      expect(isStepRequired('invalid-step')).toBe(false);
    });
  });

  describe('getStepValidationRules', () => {
    it('should return validation rules for valid step', () => {
      const rules = getStepValidationRules('shipping');
      expect(rules).toEqual(CHECKOUT_STEPS.shipping.validationRules);
    });

    it('should return empty object for step without validation rules', () => {
      const rules = getStepValidationRules('cart');
      expect(rules).toEqual({});
    });

    it('should return empty object for invalid step', () => {
      const rules = getStepValidationRules('invalid-step');
      expect(rules).toEqual({});
    });
  });

  describe('getStepDisplayName', () => {
    it('should return display name for valid step', () => {
      expect(getStepDisplayName('cart')).toBe('Cart Review');
      expect(getStepDisplayName('shipping')).toBe('Shipping Address');
      expect(getStepDisplayName('billing')).toBe('Billing Address');
      expect(getStepDisplayName('payment')).toBe('Payment Method');
      expect(getStepDisplayName('review')).toBe('Order Review');
      expect(getStepDisplayName('confirmation')).toBe('Order Confirmation');
    });

    it('should return step name for invalid step', () => {
      expect(getStepDisplayName('invalid-step')).toBe('invalid-step');
    });
  });

  describe('isStepActive', () => {
    it('should return true for active steps', () => {
      expect(isStepActive('cart')).toBe(true);
      expect(isStepActive('shipping')).toBe(true);
      expect(isStepActive('billing')).toBe(true);
      expect(isStepActive('payment')).toBe(true);
      expect(isStepActive('review')).toBe(true);
      expect(isStepActive('confirmation')).toBe(true);
    });

    it('should return false for invalid steps', () => {
      expect(isStepActive('invalid-step')).toBe(false);
    });
  });

  describe('getStepErrorMessages', () => {
    it('should return error messages for valid step', () => {
      const messages = getStepErrorMessages('shipping');
      expect(messages).toEqual(CHECKOUT_STEPS.shipping.errorMessages);
    });

    it('should return empty object for step without error messages', () => {
      const messages = getStepErrorMessages('cart');
      expect(messages).toEqual(CHECKOUT_STEPS.cart.errorMessages);
    });

    it('should return empty object for invalid step', () => {
      const messages = getStepErrorMessages('invalid-step');
      expect(messages).toEqual({});
    });
  });

  describe('getStepAccessibilityFeatures', () => {
    it('should return accessibility features for valid step', () => {
      const features = getStepAccessibilityFeatures('shipping');
      expect(features).toEqual(CHECKOUT_STEPS.shipping.accessibilityFeatures);
    });

    it('should return empty object for step without accessibility features', () => {
      const features = getStepAccessibilityFeatures('cart');
      expect(features).toEqual({});
    });

    it('should return empty object for invalid step', () => {
      const features = getStepAccessibilityFeatures('invalid-step');
      expect(features).toEqual({});
    });
  });

  describe('Step validation rules', () => {
    it('should have appropriate validation rules for shipping step', () => {
      const rules = CHECKOUT_STEPS.shipping.validationRules;
      expect(rules).toHaveProperty('address');
      expect(rules).toHaveProperty('firstName');
      expect(rules).toHaveProperty('lastName');
      expect(rules).toHaveProperty('email');
      expect(rules).toHaveProperty('phone');
    });

    it('should have appropriate validation rules for billing step', () => {
      const rules = CHECKOUT_STEPS.billing.validationRules;
      expect(rules).toHaveProperty('address');
      expect(rules).toHaveProperty('firstName');
      expect(rules).toHaveProperty('lastName');
    });

    it('should have appropriate validation rules for payment step', () => {
      const rules = CHECKOUT_STEPS.payment.validationRules;
      expect(rules).toHaveProperty('paymentMethod');
      expect(rules).toHaveProperty('cardNumber');
      expect(rules).toHaveProperty('expiryDate');
      expect(rules).toHaveProperty('cvv');
    });
  });

  describe('Step error messages', () => {
    it('should have appropriate error messages for shipping step', () => {
      const messages = CHECKOUT_STEPS.shipping.errorMessages;
      expect(messages).toHaveProperty('address');
      expect(messages).toHaveProperty('firstName');
      expect(messages).toHaveProperty('lastName');
      expect(messages).toHaveProperty('email');
      expect(messages).toHaveProperty('phone');
    });

    it('should have appropriate error messages for payment step', () => {
      const messages = CHECKOUT_STEPS.payment.errorMessages;
      expect(messages).toHaveProperty('paymentMethod');
      expect(messages).toHaveProperty('cardNumber');
      expect(messages).toHaveProperty('expiryDate');
      expect(messages).toHaveProperty('cvv');
    });
  });

  describe('Step accessibility features', () => {
    it('should have appropriate accessibility features for shipping step', () => {
      const features = CHECKOUT_STEPS.shipping.accessibilityFeatures;
      expect(features).toHaveProperty('ariaLabel');
      expect(features).toHaveProperty('requiredFields');
      expect(Array.isArray(features.requiredFields)).toBe(true);
    });

    it('should have appropriate accessibility features for payment step', () => {
      const features = CHECKOUT_STEPS.payment.accessibilityFeatures;
      expect(features).toHaveProperty('ariaLabel');
      expect(features).toHaveProperty('requiredFields');
      expect(Array.isArray(features.requiredFields)).toBe(true);
    });
  });
});
