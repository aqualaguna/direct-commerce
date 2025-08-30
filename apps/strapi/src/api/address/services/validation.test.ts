/**
 * Address validation service tests
 * 
 * Tests for address validation and formatting functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('Address Validation Service', () => {
  let validationService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Import the actual validation service
    const validationModule = require('./validation').default;
    validationService = validationModule;
  });

  describe('validateAddress', () => {
    it('should validate a complete address successfully', () => {
      // Arrange
      const addressData = {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
        phone: '1234567890'
      };

      // Act
      const result = validationService.validateAddress(addressData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.confidence).toBe(1.0);
      expect(result.formattedAddress).toBeDefined();
    });

    it('should return errors for missing required fields', () => {
      // Arrange
      const addressData = {
        firstName: 'John',
        // Missing lastName, address1, city, state, postalCode, country, phone
      };

      // Act
      const result = validationService.validateAddress(addressData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Last name is required');
      expect(result.errors).toContain('Address line 1 is required');
      expect(result.errors).toContain('City is required');
      expect(result.errors).toContain('State/Province is required');
      expect(result.errors).toContain('Postal code is required');
      expect(result.errors).toContain('Country is required');
      expect(result.errors).toContain('Phone number is required');
      expect(result.confidence).toBeLessThan(1.0);
    });

    it('should return errors for fields that are too long', () => {
      // Arrange
      const addressData = {
        firstName: 'A'.repeat(300), // Too long
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
        phone: '1234567890'
      };

      // Act
      const result = validationService.validateAddress(addressData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('First name is too long (max 255 characters)');
      expect(result.confidence).toBeLessThan(1.0);
    });

    it('should validate postal code format', () => {
      // Arrange
      const validAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '12345',
        country: 'USA',
        phone: '1234567890'
      };

      const invalidAddress = {
        ...validAddress,
        postalCode: 'invalid'
      };

      // Act
      const validResult = validationService.validateAddress(validAddress);
      const invalidResult = validationService.validateAddress(invalidAddress);

      // Assert
      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Invalid postal code format');
    });

    it('should validate phone number format', () => {
      // Arrange
      const validAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '12345',
        country: 'USA',
        phone: '1234567890'
      };

      const invalidAddress = {
        ...validAddress,
        phone: '123' // Too short
      };

      // Act
      const validResult = validationService.validateAddress(validAddress);
      const invalidResult = validationService.validateAddress(invalidAddress);

      // Assert
      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Invalid phone number format');
    });
  });

  describe('formatAddress', () => {
    it('should format address data correctly', () => {
      // Arrange
      const addressData = {
        firstName: '  john  ',
        lastName: '  doe  ',
        company: '  test company  ',
        address1: '  123 Main St  ',
        address2: '  Apt 4B  ',
        city: '  New York  ',
        state: '  NY  ',
        postalCode: '  10001  ',
        country: '  USA  ',
        phone: '  1234567890  '
      };

      // Act
      const result = validationService.formatAddress(addressData);

      // Assert
      expect(result.firstName).toBe('john');
      expect(result.lastName).toBe('doe');
      expect(result.company).toBe('test company');
      expect(result.address1).toBe('123 Main St');
      expect(result.address2).toBe('Apt 4B');
      expect(result.city).toBe('New York');
      expect(result.state).toBe('NY');
      expect(result.postalCode).toBe('10001');
      expect(result.country).toBe('USA');
      expect(result.phone).toBeDefined();
    });

    it('should handle undefined values gracefully', () => {
      // Arrange
      const addressData = {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
        phone: undefined
      };

      // Act
      const result = validationService.formatAddress(addressData);

      // Assert
      expect(result.firstName).toBe('John');
      expect(result.phone).toBeUndefined();
    });
  });

  describe('isValidPostalCode', () => {
    it('should validate valid postal codes', () => {
      // Arrange
      const validCodes = ['12345', '12345-6789', 'A1A1A1', '123456'];

      // Act & Assert
      validCodes.forEach(code => {
        expect(validationService.isValidPostalCode(code)).toBe(true);
      });
    });

    it('should reject invalid postal codes', () => {
      // Arrange
      const invalidCodes = ['', '12', '123456789012345', 'invalid', '12@34'];

      // Act & Assert
      invalidCodes.forEach(code => {
        expect(validationService.isValidPostalCode(code)).toBe(false);
      });
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should validate valid phone numbers', () => {
      // Arrange
      const validPhones = [
        '1234567890',
        '(123) 456-7890',
        '+1-123-456-7890',
        '123-456-7890'
      ];

      // Act & Assert
      validPhones.forEach(phone => {
        expect(validationService.isValidPhoneNumber(phone)).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      // Arrange
      const invalidPhones = [
        '',
        '123',
        '1234567890123456', // Too long
        'invalid',
        '123@456'
      ];

      // Act & Assert
      invalidPhones.forEach(phone => {
        expect(validationService.isValidPhoneNumber(phone)).toBe(false);
      });
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format US phone numbers correctly', () => {
      // Arrange
      const testCases = [
        { input: '1234567890', expected: '(123) 456-7890' },
        { input: '11234567890', expected: '+1 (123) 456-7890' }
      ];

      // Act & Assert
      testCases.forEach(({ input, expected }) => {
        expect(validationService.formatPhoneNumber(input)).toBe(expected);
      });
    });

    it('should handle international phone numbers', () => {
      // Arrange
      const testCases = [
        { input: '123456789', expected: '+123456789' },
        { input: '+123456789', expected: '+123456789' }
      ];

      // Act & Assert
      testCases.forEach(({ input, expected }) => {
        expect(validationService.formatPhoneNumber(input)).toBe(expected);
      });
    });

    it('should return undefined for empty input', () => {
      // Act
      const result = validationService.formatPhoneNumber(undefined);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('validateAddressForCountry', () => {
    it('should validate US address with US postal code', () => {
      // Arrange
      const usAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '12345',
        country: 'USA',
        phone: '1234567890'
      };

      // Act
      const result = validationService.validateAddressForCountry(usAddress, 'USA');

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate Canadian address with Canadian postal code', () => {
      // Arrange
      const canadianAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'Toronto',
        state: 'ON',
        postalCode: 'A1A 1A1',
        country: 'Canada',
        phone: '1234567890'
      };

      // Act
      const result = validationService.validateAddressForCountry(canadianAddress, 'Canada');

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for invalid US postal code', () => {
      // Arrange
      const usAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: 'A1A1A1', // Canadian format
        country: 'USA',
        phone: '1234567890'
      };

      // Act
      const result = validationService.validateAddressForCountry(usAddress, 'USA');

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid US postal code format');
    });

    it('should return error for invalid Canadian postal code', () => {
      // Arrange
      const canadianAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'Toronto',
        state: 'ON',
        postalCode: '12345', // US format
        country: 'Canada',
        phone: '1234567890'
      };

      // Act
      const result = validationService.validateAddressForCountry(canadianAddress, 'Canada');

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid Canadian postal code format');
    });
  });

  describe('isValidUSPostalCode', () => {
    it('should validate valid US ZIP codes', () => {
      // Arrange
      const validCodes = ['12345', '12345-6789'];

      // Act & Assert
      validCodes.forEach(code => {
        expect(validationService.isValidUSPostalCode(code)).toBe(true);
      });
    });

    it('should reject invalid US ZIP codes', () => {
      // Arrange
      const invalidCodes = ['1234', '123456', 'A1A1A1', 'invalid'];

      // Act & Assert
      invalidCodes.forEach(code => {
        expect(validationService.isValidUSPostalCode(code)).toBe(false);
      });
    });
  });

  describe('isValidCanadianPostalCode', () => {
    it('should validate valid Canadian postal codes', () => {
      // Arrange
      const validCodes = ['A1A 1A1', 'A1A1A1'];

      // Act & Assert
      validCodes.forEach(code => {
        expect(validationService.isValidCanadianPostalCode(code)).toBe(true);
      });
    });

    it('should reject invalid Canadian postal codes', () => {
      // Arrange
      const invalidCodes = ['12345', 'A1A1', 'invalid', 'A1A 1A'];

      // Act & Assert
      invalidCodes.forEach(code => {
        expect(validationService.isValidCanadianPostalCode(code)).toBe(false);
      });
    });
  });

  describe('getAddressSuggestions', () => {
    it('should return empty array when no address data provided', () => {
      // Arrange
      const addressData = {};

      // Act
      const result = validationService.getAddressSuggestions(addressData);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array for basic implementation', () => {
      // Arrange
      const addressData = {
        city: 'New York',
        state: 'NY',
        postalCode: '10001'
      };

      // Act
      const result = validationService.getAddressSuggestions(addressData);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
