/**
 * Unit tests for Step Progress Service
 * 
 * Tests the step progress tracking, validation, and navigation functionality
 */

const StepProgressService = require('../step-progress').default;

describe('Step Progress Service', () => {
  let mockStepProgress;

  beforeEach(() => {
    mockStepProgress = {
      cart: {
        isCompleted: true,
        completedAt: new Date(),
        attempts: 1,
        timeSpent: 30,
        startedAt: new Date(Date.now() - 30000)
      },
      shipping: {
        isCompleted: false,
        attempts: 2,
        timeSpent: 60,
        startedAt: new Date(Date.now() - 60000),
        validationErrors: ['Address is required']
      },
      billing: {
        isCompleted: false,
        attempts: 0,
        timeSpent: 0,
        startedAt: new Date()
      },
      payment: {
        isCompleted: false,
        attempts: 0,
        timeSpent: 0,
        startedAt: new Date()
      },
      review: {
        isCompleted: false,
        attempts: 0,
        timeSpent: 0,
        startedAt: new Date()
      },
      confirmation: {
        isCompleted: false,
        attempts: 0,
        timeSpent: 0,
        startedAt: new Date()
      }
    };
  });

  describe('initializeStepProgress', () => {
    it('should initialize step progress for all steps', () => {
      const stepProgress = StepProgressService.initializeStepProgress();

      expect(stepProgress).toHaveProperty('cart');
      expect(stepProgress).toHaveProperty('shipping');
      expect(stepProgress).toHaveProperty('billing');
      expect(stepProgress).toHaveProperty('payment');
      expect(stepProgress).toHaveProperty('review');
      expect(stepProgress).toHaveProperty('confirmation');

      Object.values(stepProgress).forEach(progress => {
        expect(progress.isCompleted).toBe(false);
        expect(progress.attempts).toBe(0);
        expect(progress.timeSpent).toBe(0);
        expect(progress.startedAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('markStepCompleted', () => {
    it('should mark step as completed with form data', () => {
      const formData = { address: '123 Main St', city: 'New York' };
      const updatedProgress = StepProgressService.markStepCompleted(
        mockStepProgress,
        'shipping',
        formData
      );

      expect(updatedProgress.shipping.isCompleted).toBe(true);
      expect(updatedProgress.shipping.completedAt).toBeInstanceOf(Date);
      expect(updatedProgress.shipping.formData).toEqual(formData);
      expect(updatedProgress.shipping.timeSpent).toBeGreaterThan(0);
    });

    it('should mark step as completed without form data', () => {
      const updatedProgress = StepProgressService.markStepCompleted(
        mockStepProgress,
        'cart'
      );

      expect(updatedProgress.cart.isCompleted).toBe(true);
      expect(updatedProgress.cart.completedAt).toBeInstanceOf(Date);
    });

    it('should not modify other steps', () => {
      const originalBilling = { ...mockStepProgress.billing };
      const updatedProgress = StepProgressService.markStepCompleted(
        mockStepProgress,
        'shipping'
      );

      expect(updatedProgress.billing).toEqual(originalBilling);
    });
  });

  describe('markStepIncomplete', () => {
    it('should mark step as incomplete with validation errors', () => {
      const validationErrors = ['Address is required', 'Phone is required'];
      const updatedProgress = StepProgressService.markStepIncomplete(
        mockStepProgress,
        'billing',
        validationErrors
      );

      expect(updatedProgress.billing.isCompleted).toBe(false);
      expect(updatedProgress.billing.completedAt).toBeUndefined();
      expect(updatedProgress.billing.validationErrors).toEqual(validationErrors);
      expect(updatedProgress.billing.attempts).toBe(1);
      expect(updatedProgress.billing.lastAttemptAt).toBeInstanceOf(Date);
    });

    it('should increment attempts counter', () => {
      const updatedProgress = StepProgressService.markStepIncomplete(
        mockStepProgress,
        'shipping'
      );

      expect(updatedProgress.shipping.attempts).toBe(3); // Was 2, now 3
    });
  });

  describe('updateStepFormData', () => {
    it('should update step form data', () => {
      const newFormData = { address: '456 Oak St', zipCode: '12345' };
      const updatedProgress = StepProgressService.updateStepFormData(
        mockStepProgress,
        'shipping',
        newFormData
      );

      expect(updatedProgress.shipping.formData).toEqual(newFormData);
    });

    it('should merge with existing form data', () => {
      const existingData = { address: '123 Main St' };
      const newData = { city: 'New York', zipCode: '12345' };
      
      mockStepProgress.shipping.formData = existingData;
      
      const updatedProgress = StepProgressService.updateStepFormData(
        mockStepProgress,
        'shipping',
        newData
      );

      expect(updatedProgress.shipping.formData).toEqual({
        ...existingData,
        ...newData
      });
    });
  });

  describe('validateStep', () => {
    it('should validate shipping step with valid data', () => {
      const formData = {
        address: '123 Main St',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '123-456-7890'
      };

      const result = StepProgressService.validateStep('shipping', formData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.stepName).toBe('shipping');
    });

    it('should validate shipping step with missing required fields', () => {
      const formData = {
        address: '123 Main St',
        firstName: 'John'
        // Missing lastName, email, phone
      };

      const result = StepProgressService.validateStep('shipping', formData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.stepName).toBe('shipping');
    });

    it('should return error for invalid step', () => {
      const result = StepProgressService.validateStep('invalid-step', {});

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid step: invalid-step');
    });
  });

  describe('canProceedToNextStep', () => {
    it('should allow proceeding when current step is completed', () => {
      const result = StepProgressService.canProceedToNextStep(
        mockStepProgress,
        'cart'
      );

      expect(result.canProceed).toBe(true);
      expect(result.nextStep).toBe('shipping');
      expect(result.errors).toHaveLength(0);
    });

    it('should not allow proceeding when current step is not completed', () => {
      const result = StepProgressService.canProceedToNextStep(
        mockStepProgress,
        'shipping'
      );

      expect(result.canProceed).toBe(false);
      expect(result.errors).toContain('Step shipping must be completed before proceeding');
    });

    it('should not allow proceeding when previous required steps are not completed', () => {
      // Mark cart as incomplete
      mockStepProgress.cart.isCompleted = false;

      const result = StepProgressService.canProceedToNextStep(
        mockStepProgress,
        'shipping'
      );

      expect(result.canProceed).toBe(false);
      expect(result.errors).toContain('Required step cart must be completed before proceeding');
    });

    it('should return null for next step on last step', () => {
      const result = StepProgressService.canProceedToNextStep(
        mockStepProgress,
        'confirmation'
      );

      expect(result.nextStep).toBeUndefined();
    });

    it('should return error for invalid step', () => {
      const result = StepProgressService.canProceedToNextStep(
        mockStepProgress,
        'invalid-step'
      );

      expect(result.canProceed).toBe(false);
      expect(result.errors).toContain('Invalid current step: invalid-step');
    });
  });

  describe('canGoToPreviousStep', () => {
    it('should allow going to previous step when available', () => {
      const result = StepProgressService.canGoToPreviousStep('shipping');

      expect(result.canProceed).toBe(true);
      expect(result.previousStep).toBe('cart');
      expect(result.errors).toHaveLength(0);
    });

    it('should not allow going to previous step on first step', () => {
      const result = StepProgressService.canGoToPreviousStep('cart');

      expect(result.canProceed).toBe(false);
      expect(result.errors).toContain('No previous step available');
    });
  });

  describe('getStepStatus', () => {
    it('should return correct step status for completed step', () => {
      const status = StepProgressService.getStepStatus(mockStepProgress, 'cart');

      expect(status.isCompleted).toBe(true);
      expect(status.isRequired).toBe(true);
      expect(status.isActive).toBe(true);
      expect(status.hasErrors).toBe(false);
      expect(status.errorCount).toBe(0);
    });

    it('should return correct step status for incomplete step with errors', () => {
      const status = StepProgressService.getStepStatus(mockStepProgress, 'shipping');

      expect(status.isCompleted).toBe(false);
      expect(status.isRequired).toBe(true);
      expect(status.isActive).toBe(true);
      expect(status.hasErrors).toBe(true);
      expect(status.errorCount).toBe(1);
    });

    it('should return correct step status for confirmation step', () => {
      const status = StepProgressService.getStepStatus(mockStepProgress, 'confirmation');

      expect(status.isCompleted).toBe(false);
      expect(status.isRequired).toBe(false);
      expect(status.isActive).toBe(true);
      expect(status.hasErrors).toBe(false);
      expect(status.errorCount).toBe(0);
    });
  });

  describe('getCheckoutProgress', () => {
    it('should return correct checkout progress', () => {
      const progress = StepProgressService.getCheckoutProgress(mockStepProgress);

      expect(progress.completedSteps).toBe(1);
      expect(progress.totalSteps).toBe(6);
      expect(progress.progressPercentage).toBe(17); // 1/6 * 100 rounded
      expect(progress.completedStepNames).toContain('cart');
      expect(progress.incompleteStepNames).toContain('shipping');
      expect(progress.incompleteStepNames).toContain('billing');
    });

    it('should return 100% progress when all steps completed', () => {
      // Mark all steps as completed
      Object.keys(mockStepProgress).forEach(step => {
        mockStepProgress[step].isCompleted = true;
      });

      const progress = StepProgressService.getCheckoutProgress(mockStepProgress);

      expect(progress.completedSteps).toBe(6);
      expect(progress.totalSteps).toBe(6);
      expect(progress.progressPercentage).toBe(100);
      expect(progress.completedStepNames).toHaveLength(6);
      expect(progress.incompleteStepNames).toHaveLength(0);
    });
  });

  describe('getStepAnalytics', () => {
    it('should return correct analytics for step with activity', () => {
      const analytics = StepProgressService.getStepAnalytics(mockStepProgress, 'shipping');

      expect(analytics.attempts).toBe(2);
      expect(analytics.timeSpent).toBe(60);
      expect(analytics.completionRate).toBe(0);
      expect(analytics.averageTimeSpent).toBe(60);
    });

    it('should return correct analytics for completed step', () => {
      const analytics = StepProgressService.getStepAnalytics(mockStepProgress, 'cart');

      expect(analytics.attempts).toBe(1);
      expect(analytics.timeSpent).toBe(30);
      expect(analytics.completionRate).toBe(100);
      expect(analytics.averageTimeSpent).toBe(30);
    });
  });

  describe('resetStepProgress', () => {
    it('should reset step progress to initial state', () => {
      const updatedProgress = StepProgressService.resetStepProgress(
        mockStepProgress,
        'shipping'
      );

      expect(updatedProgress.shipping.isCompleted).toBe(false);
      expect(updatedProgress.shipping.attempts).toBe(0);
      expect(updatedProgress.shipping.timeSpent).toBe(0);
      expect(updatedProgress.shipping.startedAt).toBeInstanceOf(Date);
      expect(updatedProgress.shipping.validationErrors).toBeUndefined();
      expect(updatedProgress.shipping.completedAt).toBeUndefined();
    });
  });

  describe('getAllStepProgress', () => {
    it('should return all step progress with configuration', () => {
      const allProgress = StepProgressService.getAllStepProgress(mockStepProgress);

      expect(allProgress).toHaveProperty('cart');
      expect(allProgress).toHaveProperty('shipping');
      expect(allProgress).toHaveProperty('billing');
      expect(allProgress).toHaveProperty('payment');
      expect(allProgress).toHaveProperty('review');
      expect(allProgress).toHaveProperty('confirmation');

      // Check that each step has config data
      Object.values(allProgress).forEach(stepData => {
        expect(stepData).toHaveProperty('config');
        expect(stepData.config).toHaveProperty('order');
        expect(stepData.config).toHaveProperty('required');
        expect(stepData.config).toHaveProperty('displayName');
        expect(stepData.config).toHaveProperty('isActive');
      });
    });
  });
});
