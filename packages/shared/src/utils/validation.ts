// Validation Utilities
import { VALIDATION_RULES } from '../constants/validation';

export const validateEmail = (email: string): boolean => {
  return VALIDATION_RULES.EMAIL.PATTERN.test(email) && 
         email.length <= VALIDATION_RULES.EMAIL.MAX_LENGTH;
};

export const validatePassword = (password: string): boolean => {
  return password.length >= VALIDATION_RULES.PASSWORD.MIN_LENGTH &&
         password.length <= VALIDATION_RULES.PASSWORD.MAX_LENGTH &&
         VALIDATION_RULES.PASSWORD.PATTERN.test(password);
};

export const validatePhone = (phone: string): boolean => {
  return VALIDATION_RULES.PHONE.PATTERN.test(phone) && 
         phone.length <= VALIDATION_RULES.PHONE.MAX_LENGTH;
};

export const validateRequired = (value: any): boolean => {
  return value !== null && value !== undefined && value !== '';
};

export const validateLength = (value: string, min: number, max: number): boolean => {
  return value.length >= min && value.length <= max;
};
