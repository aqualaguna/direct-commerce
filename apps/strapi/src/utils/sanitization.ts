import sanitizeHtml from 'sanitize-html';
/**
 * Input sanitization utilities for preventing SQL injection and XSS attacks
 * 
 * This module provides sanitization functions to clean user input before
 * it reaches the database or is processed by the application.
 */

interface SanitizeOptions {
    sanitizeHtmlEnabled?: boolean;
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    allowedSchemes?: string[];
    allowedSchemesByTag?: Record<string, string[]>;
    allowedSchemesAppliedToAttributes?: string[];
}

/**
 * Sanitize address data to prevent SQL injection and XSS attacks
 * 
 * @param data - The raw address data to sanitize
 * @returns Sanitized address data with malicious patterns removed
 */
export const sanitizeAddressData = (data: any, options: SanitizeOptions = {}): any => {
  const sanitized: any = {};
  const { 
    sanitizeHtmlEnabled = false, 
    allowedTags = [], 
    allowedAttributes = {}, 
    allowedSchemes = [], 
    allowedSchemesByTag = {}, 
    allowedSchemesAppliedToAttributes = [], 
  } = options;

  // List of fields that need sanitization
  const stringFields = ['firstName', 'lastName', 'company', 'address1', 'address2', 'city', 'state', 'postalCode', 'country', 'phone'];
  
  // Sanitize string fields
  for (const field of stringFields) {
    if (data[field] && typeof data[field] === 'string') {
      let sanitizedValue = sanitizeString(data[field]);
      
      // Apply HTML sanitization if enabled
      if (sanitizeHtmlEnabled) {
        sanitizedValue = sanitizeHtml(sanitizedValue as string, {
          disallowedTagsMode: 'recursiveEscape',
          allowedTags,
          allowedAttributes,
          allowedSchemes,
          allowedSchemesByTag,
          allowedSchemesAppliedToAttributes,
        });
      }
      
      sanitized[field] = sanitizedValue;
    } else {
      sanitized[field] = data[field];
    }
  }
  
  // Copy other fields as-is
  Object.keys(data).forEach(key => {
    if (!stringFields.includes(key)) {
      sanitized[key] = data[key];
    }
  });
  
  return sanitized;
};

/**
 * Sanitize any string input to prevent SQL injection and XSS attacks
 * 
 * @param input - The string to sanitize
 * @returns Sanitized string with malicious patterns removed
 */
export const sanitizeString = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return input;
  }
  
  return input
    .replace(/['";]/g, '') // Remove quotes and semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL comment start
    .replace(/\*\//g, '') // Remove SQL comment end
    .replace(/DROP\s+TABLE/gi, '') // Remove DROP TABLE
    .replace(/DELETE\s+FROM/gi, '') // Remove DELETE FROM
    .replace(/UPDATE\s+.*\s+SET/gi, '') // Remove UPDATE SET
    .replace(/INSERT\s+INTO/gi, '') // Remove INSERT INTO
    .replace(/SELECT\s+.*\s+FROM/gi, '') // Remove SELECT FROM
    .replace(/UNION\s+SELECT/gi, '') // Remove UNION SELECT
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};




