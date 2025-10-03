/**
 * Address validation service
 * 
 * Provides basic address validation and formatting functionality
 */

interface AddressValidationResult {
  isValid: boolean;
  errors: string[];
  formattedAddress?: any;
  confidence: number;
}

interface AddressData {
  firstName?: string;
  lastName?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  type?: string;
}

export default {
  /**
   * Validate address data
   */
  validateAddress(addressData: AddressData): AddressValidationResult {
    const errors: string[] = [];
    let confidence = 1.0;
    const requiredFields = ['type', 'firstName', 'lastName', 'address1', 'city', 'state', 'postalCode', 'country', 'phone'];
    for (const field of requiredFields) {
      if (!addressData[field]?.trim()) {
        errors.push(`${field} is required`);
        confidence -= 0.1;
      }
    }

    // Validate address type
    if (!['shipping', 'billing', 'both'].includes(addressData.type)) {
      errors.push('Invalid address type. Must be shipping, billing, or both');
      confidence -= 0.1;
    }

    // Format validation
    if (addressData.firstName && addressData.firstName.length > 255) {
      errors.push('First name is too long (max 255 characters)');
      confidence -= 0.05;
    }

    if (addressData.lastName && addressData.lastName.length > 255) {
      errors.push('Last name is too long (max 255 characters)');
      confidence -= 0.05;
    }

    if (addressData.address1 && addressData.address1.length > 255) {
      errors.push('Address line 1 is too long (max 255 characters)');
      confidence -= 0.05;
    }

    if (addressData.address2 && addressData.address2.length > 255) {
      errors.push('Address line 2 is too long (max 255 characters)');
      confidence -= 0.05;
    }

    if (addressData.city && addressData.city.length > 255) {
      errors.push('City is too long (max 255 characters)');
      confidence -= 0.05;
    }

    if (addressData.state && addressData.state.length > 255) {
      errors.push('State/Province is too long (max 255 characters)');
      confidence -= 0.05;
    }

    if (addressData.postalCode && addressData.postalCode.length > 20) {
      errors.push('Postal code is too long (max 20 characters)');
      confidence -= 0.05;
    }

    if (addressData.country && addressData.country.length > 255) {
      errors.push('Country is too long (max 255 characters)');
      confidence -= 0.05;
    }

    if (addressData.phone && addressData.phone.length > 20) {
      errors.push('Phone number is too long (max 20 characters)');
      confidence -= 0.05;
    }

    // Basic format validation
    if (addressData.postalCode && !this.isValidPostalCode(addressData.postalCode)) {
      errors.push('Invalid postal code format');
      confidence -= 0.1;
    }

    if (addressData.phone && !this.isValidPhoneNumber(addressData.phone)) {
      errors.push('Invalid phone number format');
      confidence -= 0.1;
    }

    // Ensure confidence doesn't go below 0
    confidence = Math.max(0, confidence);

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      formattedAddress: isValid ? this.formatAddress(addressData) : undefined,
      confidence
    };
  },

  /**
   * Format address data
   */
  formatAddress(addressData: AddressData): AddressData {
    return {
      firstName: addressData.firstName?.trim(),
      lastName: addressData.lastName?.trim(),
      company: addressData.company?.trim(),
      address1: addressData.address1?.trim(),
      address2: addressData.address2?.trim(),
      city: addressData.city?.trim(),
      state: addressData.state?.trim(),
      postalCode: addressData.postalCode?.trim().toUpperCase(),
      country: addressData.country?.trim(),
      phone: this.formatPhoneNumber(addressData.phone),
      type: addressData.type?.trim(),
    };
  },

  /**
   * Validate postal code format (basic validation)
   */
  isValidPostalCode(postalCode: string): boolean {
    if (!postalCode) return false;

    // Remove spaces and convert to uppercase
    const cleanCode = postalCode.replace(/\s/g, '').toUpperCase();

    // Basic validation - must contain at least one digit
    // This ensures it's not just letters like "invalid"
    const postalCodeRegex = /^[A-Z0-9\-]{3,10}$/;

    // Check if it matches the pattern AND contains at least one digit
    return postalCodeRegex.test(cleanCode) && /\d/.test(cleanCode);
  },

  /**
   * Validate phone number format (basic validation)
   */
  isValidPhoneNumber(phone: string): boolean {
    if (!phone) return false;

    // Remove all non-digit characters except + and -
    const cleanPhone = phone.replace(/[^\d+\-\(\)\s]/g, '');

    // Basic validation - should have at least 7 digits
    const digitCount = (cleanPhone.match(/\d/g) || []).length;

    return digitCount >= 7 && digitCount <= 15;
  },

  /**
   * Format phone number
   */
  formatPhoneNumber(phone?: string): string | undefined {
    if (!phone) return undefined;

    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // Basic formatting for common lengths
    if (digits.length === 10) {
      // US format: (123) 456-7890
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      // US format with country code: +1 (123) 456-7890
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    } else if (digits.length >= 7 && digits.length <= 15) {
      // International format: just return with + prefix if it doesn't have one
      return phone.startsWith('+') ? phone : `+${digits}`;
    }

    // Return as-is if no specific format matches
    return phone;
  },

  /**
   * Validate address for specific country (basic validation)
   */
  validateAddressForCountry(addressData: AddressData, country: string): AddressValidationResult {
    const baseValidation = this.validateAddress(addressData);

    if (!baseValidation.isValid) {
      return baseValidation;
    }

    const errors = [...baseValidation.errors];
    let confidence = baseValidation.confidence;

    // Country-specific validations
    switch (country.toUpperCase()) {
      case 'US':
      case 'USA':
      case 'UNITED STATES':
        // US-specific validations
        if (addressData.postalCode && !this.isValidUSPostalCode(addressData.postalCode)) {
          errors.push('Invalid US postal code format');
          confidence -= 0.1;
        }
        break;

      case 'CA':
      case 'CANADA':
        // Canada-specific validations
        if (addressData.postalCode && !this.isValidCanadianPostalCode(addressData.postalCode)) {
          errors.push('Invalid Canadian postal code format');
          confidence -= 0.1;
        }
        break;

      default:
        // For other countries, just do basic validation
        break;
    }

    confidence = Math.max(0, confidence);

    return {
      isValid: errors.length === 0,
      errors,
      formattedAddress: errors.length === 0 ? this.formatAddress(addressData) : undefined,
      confidence
    };
  },

  /**
   * Validate US postal code
   */
  isValidUSPostalCode(postalCode: string): boolean {
    if (!postalCode) return false;

    const cleanCode = postalCode.replace(/\s/g, '').toUpperCase();

    // US ZIP code format: 12345 or 12345-6789
    const usZipRegex = /^\d{5}(-\d{4})?$/;

    return usZipRegex.test(cleanCode);
  },

  /**
   * Validate Canadian postal code
   */
  isValidCanadianPostalCode(postalCode: string): boolean {
    if (!postalCode) return false;

    const cleanCode = postalCode.replace(/\s/g, '').toUpperCase();

    // Canadian postal code format: A1A 1A1
    const canadianPostalRegex = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/;

    return canadianPostalRegex.test(cleanCode);
  },

  /**
   * Get address suggestions for common typos (basic implementation)
   */
  getAddressSuggestions(addressData: AddressData): AddressData[] {
    const suggestions: AddressData[] = [];

    // Only provide suggestions if we have some valid data
    if (!addressData.city && !addressData.state && !addressData.postalCode) {
      return suggestions;
    }

    // This is a basic implementation - in a real system, you'd integrate with
    // an address validation service like Google Maps API or SmartyStreets

    return suggestions;
  }
};
