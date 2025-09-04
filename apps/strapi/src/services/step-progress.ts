/**
 * Step Progress Tracking Service
 * 
 * Handles step progress tracking, validation, and navigation for checkout sessions
 */

import { getStepConfig, getStepNames, getNextStep, getPreviousStep, isStepRequired } from '../config/checkout-steps';

export interface StepProgress {
  isCompleted: boolean;
  completedAt?: Date;
  validationErrors?: string[];
  formData?: Record<string, any>;
  attempts?: number;
  lastAttemptAt?: Date;
  timeSpent?: number;
  startedAt?: Date;
}

export interface CheckoutSessionStepProgress {
  [stepName: string]: StepProgress;
}

export interface StepValidationResult {
  isValid: boolean;
  errors: string[];
  stepName: string;
}

export interface StepNavigationResult {
  canProceed: boolean;
  nextStep?: string;
  previousStep?: string;
  errors: string[];
}

export class StepProgressService {
  /**
   * Initialize step progress for a new checkout session
   */
  static initializeStepProgress(): CheckoutSessionStepProgress {
    const stepNames = getStepNames();
    const stepProgress: CheckoutSessionStepProgress = {};

    stepNames.forEach(stepName => {
      stepProgress[stepName] = {
        isCompleted: false,
        attempts: 0,
        timeSpent: 0,
        startedAt: new Date()
      };
    });

    return stepProgress;
  }

  /**
   * Mark a step as completed
   */
  static markStepCompleted(
    stepProgress: CheckoutSessionStepProgress,
    stepName: string,
    formData?: Record<string, any>
  ): CheckoutSessionStepProgress {
    const updatedProgress = { ...stepProgress };

    if (updatedProgress[stepName]) {
      updatedProgress[stepName] = {
        ...updatedProgress[stepName],
        isCompleted: true,
        completedAt: new Date(),
        formData: formData || updatedProgress[stepName].formData,
        timeSpent: this.calculateTimeSpent(updatedProgress[stepName].startedAt)
      };
    }

    return updatedProgress;
  }

  /**
   * Mark a step as incomplete
   */
  static markStepIncomplete(
    stepProgress: CheckoutSessionStepProgress,
    stepName: string,
    validationErrors?: string[]
  ): CheckoutSessionStepProgress {
    const updatedProgress = { ...stepProgress };

    if (updatedProgress[stepName]) {
      updatedProgress[stepName] = {
        ...updatedProgress[stepName],
        isCompleted: false,
        completedAt: undefined,
        validationErrors,
        attempts: (updatedProgress[stepName].attempts || 0) + 1,
        lastAttemptAt: new Date()
      };
    }

    return updatedProgress;
  }

  /**
   * Update step form data
   */
  static updateStepFormData(
    stepProgress: CheckoutSessionStepProgress,
    stepName: string,
    formData: Record<string, any>
  ): CheckoutSessionStepProgress {
    const updatedProgress = { ...stepProgress };

    if (updatedProgress[stepName]) {
      updatedProgress[stepName] = {
        ...updatedProgress[stepName],
        formData: { ...updatedProgress[stepName].formData, ...formData }
      };
    }

    return updatedProgress;
  }

  /**
   * Validate step data against step configuration
   */
  static validateStep(
    stepName: string,
    formData: Record<string, any>
  ): StepValidationResult {
    const stepConfig = getStepConfig(stepName);
    const errors: string[] = [];

    if (!stepConfig) {
      return {
        isValid: false,
        errors: [`Invalid step: ${stepName}`],
        stepName
      };
    }

    // Check required fields
    const validationRules = stepConfig.validationRules || {};
    
    Object.entries(validationRules).forEach(([field, rule]) => {
      if (rule === 'required' && (!formData[field] || formData[field].trim() === '')) {
        const errorMessage = stepConfig.errorMessages?.[field] || `${field} is required`;
        errors.push(errorMessage);
      }
    });

    // Additional validation logic can be added here
    // For example, email validation, credit card validation, etc.

    return {
      isValid: errors.length === 0,
      errors,
      stepName
    };
  }

  /**
   * Check if user can proceed to next step
   */
  static canProceedToNextStep(
    stepProgress: CheckoutSessionStepProgress,
    currentStep: string
  ): StepNavigationResult {
    const stepNames = getStepNames();
    const currentIndex = stepNames.indexOf(currentStep);
    const errors: string[] = [];

    if (currentIndex === -1) {
      return {
        canProceed: false,
        errors: [`Invalid current step: ${currentStep}`]
      };
    }

    // Check if current step is completed
    const currentStepProgress = stepProgress[currentStep];
    if (!currentStepProgress?.isCompleted) {
      errors.push(`Step ${currentStep} must be completed before proceeding`);
    }

    // Check if all required previous steps are completed
    for (let i = 0; i < currentIndex; i++) {
      const stepName = stepNames[i];
      const stepConfig = getStepConfig(stepName);
      
      if (stepConfig?.required && !stepProgress[stepName]?.isCompleted) {
        errors.push(`Required step ${stepName} must be completed before proceeding`);
      }
    }

    const canProceed = errors.length === 0;
    const nextStep = canProceed ? getNextStep(currentStep) : undefined;

    return {
      canProceed,
      nextStep,
      errors
    };
  }

  /**
   * Check if user can go back to previous step
   */
  static canGoToPreviousStep(
    currentStep: string
  ): StepNavigationResult {
    const previousStep = getPreviousStep(currentStep);
    const errors: string[] = [];

    if (!previousStep) {
      errors.push('No previous step available');
    }

    return {
      canProceed: !!previousStep,
      previousStep,
      errors
    };
  }

  /**
   * Get current step status
   */
  static getStepStatus(
    stepProgress: CheckoutSessionStepProgress,
    stepName: string
  ): {
    isCompleted: boolean;
    isRequired: boolean;
    isActive: boolean;
    hasErrors: boolean;
    errorCount: number;
  } {
    const stepConfig = getStepConfig(stepName);
    const progress = stepProgress[stepName];

    return {
      isCompleted: progress?.isCompleted || false,
      isRequired: stepConfig?.required || false,
      isActive: stepConfig?.isActive !== false,
      hasErrors: (progress?.validationErrors?.length || 0) > 0,
      errorCount: progress?.validationErrors?.length || 0
    };
  }

  /**
   * Get overall checkout progress
   */
  static getCheckoutProgress(
    stepProgress: CheckoutSessionStepProgress
  ): {
    completedSteps: number;
    totalSteps: number;
    progressPercentage: number;
    completedStepNames: string[];
    incompleteStepNames: string[];
  } {
    const stepNames = getStepNames();
    const completedSteps = stepNames.filter(stepName => 
      stepProgress[stepName]?.isCompleted
    );
    const incompleteSteps = stepNames.filter(stepName => 
      !stepProgress[stepName]?.isCompleted
    );

    return {
      completedSteps: completedSteps.length,
      totalSteps: stepNames.length,
      progressPercentage: Math.round((completedSteps.length / stepNames.length) * 100),
      completedStepNames: completedSteps,
      incompleteStepNames: incompleteSteps
    };
  }

  /**
   * Calculate time spent on a step
   */
  private static calculateTimeSpent(startedAt?: Date): number {
    if (!startedAt) return 0;
    
    const now = new Date();
    return Math.round((now.getTime() - startedAt.getTime()) / 1000); // seconds
  }

  /**
   * Get step analytics data
   */
  static getStepAnalytics(
    stepProgress: CheckoutSessionStepProgress,
    stepName: string
  ): {
    attempts: number;
    timeSpent: number;
    completionRate: number;
    averageTimeSpent: number;
  } {
    const progress = stepProgress[stepName];
    
    return {
      attempts: progress?.attempts || 0,
      timeSpent: progress?.timeSpent || 0,
      completionRate: progress?.isCompleted ? 100 : 0,
      averageTimeSpent: progress?.timeSpent || 0
    };
  }

  /**
   * Reset step progress
   */
  static resetStepProgress(
    stepProgress: CheckoutSessionStepProgress,
    stepName: string
  ): CheckoutSessionStepProgress {
    const updatedProgress = { ...stepProgress };

    if (updatedProgress[stepName]) {
      updatedProgress[stepName] = {
        isCompleted: false,
        attempts: 0,
        timeSpent: 0,
        startedAt: new Date(),
        validationErrors: undefined,
        completedAt: undefined
      };
    }

    return updatedProgress;
  }

  /**
   * Get all step progress data for a checkout session
   */
  static getAllStepProgress(
    stepProgress: CheckoutSessionStepProgress
  ): Record<string, any> {
    const stepNames = getStepNames();
    const allProgress: Record<string, any> = {};

    stepNames.forEach(stepName => {
      const progress = stepProgress[stepName];
      const config = getStepConfig(stepName);
      
      allProgress[stepName] = {
        ...progress,
        config: {
          order: config?.order,
          required: config?.required,
          displayName: config?.displayName,
          isActive: config?.isActive
        }
      };
    });

    return allProgress;
  }
}

export default StepProgressService;
