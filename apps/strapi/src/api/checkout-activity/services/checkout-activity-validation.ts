/**
 * Checkout Activity Validation Service
 * Handles data validation and sanitization for checkout activity tracking
 */

import { UserType } from "../../../../config/constant";

interface CheckoutActivityData {
  checkout: string;
  user?: any;
  sessionId?: string;
  activityType: 'step_enter' | 'step_exit' | 'form_field_focus' | 'form_field_blur' | 'validation_error' | 'form_submit' | 'checkout_abandon' | 'checkout_complete';
  stepName?: 'cart' | 'shipping' | 'billing' | 'payment' | 'review' | 'confirmation';
  formField?: string;
  formType?: 'shipping' | 'billing' | 'payment' | 'review';
  fieldType?: 'text' | 'email' | 'select' | 'checkbox' | 'radio' | 'textarea';
  interactionType?: 'focus' | 'blur' | 'input' | 'validation_error' | 'validation_success';
  activityData?: Record<string, any>;
  timestamp?: Date;
  stepDuration?: number;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  screenResolution?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  location?: string;
  userAgent?: string;
  ipAddress?: string;
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Sanitize and validate checkout activity data
   */
  async sanitizeActivityData(data: Partial<CheckoutActivityData>, userId: string, userType: UserType): Promise<{ isValid: boolean, data: Partial<CheckoutActivityData>, errors: string[] }> {
    const sanitized: Partial<CheckoutActivityData> = {};
    const errors: string[] = [];

    // Required fields validation
    if (!data.checkout) {
      errors.push('checkout is required');
    } else {
      const checkout = await strapi.documents('api::checkout.checkout').findOne({
        documentId: data.checkout
      });
      if (!checkout) {
        errors.push('checkout not found');
      } else {
        sanitized.checkout = checkout;
      }
    }

    if (!data.activityType) {
      errors.push('activityType is required');
    } else {
      const validActivityTypes = [
        'step_enter', 'step_exit', 'form_field_focus', 'form_field_blur',
        'validation_error', 'form_submit', 'checkout_abandon', 'checkout_complete'
      ];
      if (!validActivityTypes.includes(data.activityType)) {
        errors.push('Invalid activityType');
      } else {
        sanitized.activityType = data.activityType;
      }
    }


    if (data.stepName) {
      const validStepNames = ['cart', 'shipping', 'billing', 'payment', 'review', 'confirmation'];
      if (!validStepNames.includes(data.stepName)) {
        errors.push('Invalid stepName');
      } else {
        sanitized.stepName = data.stepName;
      }
    }

    if (data.formField) {
      sanitized.formField = this.sanitizeString(data.formField, 100);
    }

    if (data.formType) {
      const validFormTypes = ['shipping', 'billing', 'payment', 'review'];
      if (!validFormTypes.includes(data.formType)) {
        errors.push('Invalid formType');
      } else {
        sanitized.formType = data.formType;
      }
    }

    if (data.fieldType) {
      const validFieldTypes = ['text', 'email', 'select', 'checkbox', 'radio', 'textarea'];
      if (!validFieldTypes.includes(data.fieldType)) {
        errors.push('Invalid fieldType');
      } else {
        sanitized.fieldType = data.fieldType;
      }
    }

    if (data.interactionType) {
      const validInteractionTypes = ['focus', 'blur', 'input', 'validation_error', 'validation_success'];
      if (!validInteractionTypes.includes(data.interactionType)) {
        errors.push('Invalid interactionType');
      } else {
        sanitized.interactionType = data.interactionType;
      }
    }

    if (data.activityData) {
      sanitized.activityData = data.activityData;
    }

    if (data.timestamp) {
      const timestamp = new Date(data.timestamp);
      if (isNaN(timestamp.getTime())) {
        errors.push('Invalid timestamp');
      } else {
        sanitized.timestamp = timestamp;
      }
    }

    if (data.stepDuration !== undefined) {
      const duration = parseInt(data.stepDuration.toString());
      if (isNaN(duration) || duration < 0) {
        errors.push('stepDuration must be a positive number');
      } else {
        sanitized.stepDuration = duration;
      }
    }

    if (data.deviceType) {
      const validDeviceTypes = ['desktop', 'mobile', 'tablet'];
      if (!validDeviceTypes.includes(data.deviceType)) {
        errors.push('Invalid deviceType');
      } else {
        sanitized.deviceType = data.deviceType;
      }
    }

    if (data.browser) {
      sanitized.browser = this.sanitizeString(data.browser, 50);
    }

    if (data.os) {
      sanitized.os = this.sanitizeString(data.os, 50);
    }

    if (data.screenResolution) {
      sanitized.screenResolution = this.sanitizeString(data.screenResolution, 20);
    }

    if (data.referrer) {
      sanitized.referrer = this.sanitizeString(data.referrer, 2000);
    }

    if (data.utmSource) {
      sanitized.utmSource = this.sanitizeString(data.utmSource, 100);
    }

    if (data.utmMedium) {
      sanitized.utmMedium = this.sanitizeString(data.utmMedium, 100);
    }

    if (data.utmCampaign) {
      sanitized.utmCampaign = this.sanitizeString(data.utmCampaign, 100);
    }

    if (data.location) {
      sanitized.location = this.sanitizeString(data.location, 100);
    }

    if (data.userAgent) {
      sanitized.userAgent = this.sanitizeString(data.userAgent, 500);
    }

    if (data.ipAddress) {
      sanitized.ipAddress = this.sanitizeIpAddress(data.ipAddress);
    }

    if (data.sessionId) {
      sanitized.sessionId = this.sanitizeString(data.sessionId, 255);
    }

    return {
      isValid : errors.length === 0,
      data : sanitized,
      errors : errors
    };
  },

  /**
   * Sanitize string input
   */
  sanitizeString(input: string, maxLength: number): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Remove null bytes and control characters
    let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  },

  /**
   * Sanitize IP address
   */
  sanitizeIpAddress(ip: string): string {
    if (typeof ip !== 'string') {
      return '';
    }

    // Basic IP validation (IPv4 or IPv6)
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    const sanitized = ip.trim();
    
    if (ipv4Regex.test(sanitized) || ipv6Regex.test(sanitized)) {
      return sanitized;
    }

    return '';
  },


  /**
   * Validate activity data for GDPR compliance
   */
  validateGdprCompliance(data: Partial<CheckoutActivityData>): boolean {
    // Check for sensitive data in activityData
    if (data.activityData) {
      const sensitiveFields = ['password', 'creditCard', 'ssn', 'socialSecurity'];
      const activityDataStr = JSON.stringify(data.activityData).toLowerCase();
      
      for (const field of sensitiveFields) {
        if (activityDataStr.includes(field)) {
          return false;
        }
      }
    }

    // Check for PII in field values
    if (data.activityData?.fieldValue) {
      const fieldValue = data.activityData.fieldValue.toString().toLowerCase();
      const piiPatterns = [
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email
      ];

      for (const pattern of piiPatterns) {
        if (pattern.test(fieldValue)) {
          return false;
        }
      }
    }

    return true;
  }
});
