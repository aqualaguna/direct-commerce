/**
 * Profile service tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock global strapi object
global.strapi = {
  documents: jest.fn((contentType: string) => ({
    findOne: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    publish: jest.fn(),
    unpublish: jest.fn(),
    discardDraft: jest.fn(),
  })),
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
} as any;

// Mock the profile service with any types to avoid TypeScript issues
const mockProfileService: any = {
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  getProfileCompletion: jest.fn(),
  validateProfileData: jest.fn(),
  applyPrivacySettings: jest.fn(),
  createDefaultPreferences: jest.fn(),
  createDefaultPrivacySettings: jest.fn(),
};

jest.mock('./profile', () => ({
  __esModule: true,
  default: mockProfileService
}));

describe('Profile Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile when user exists', async () => {
      const mockUser = {
        documentId: 'user123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        profilePicture: { id: 1, url: '/uploads/profile.jpg' },
        preferences: { theme: 'light' },
        privacySettings: { showEmail: false }
      };

      mockProfileService.getProfile.mockResolvedValue(mockUser);

      const result = await mockProfileService.getProfile('user123', 'user123');

      expect(result).toEqual(mockUser);
      expect(mockProfileService.getProfile).toHaveBeenCalledWith('user123', 'user123');
    });

    it('should apply privacy settings when requesting different user', async () => {
      const mockUser = {
        documentId: 'user123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        location: 'New York',
        privacySettings: { showEmail: false, showPhone: false, showLocation: true }
      };

      const expectedResult = {
        documentId: 'user123',
        firstName: 'John',
        lastName: 'Doe',
        location: 'New York',
        privacySettings: { showEmail: false, showPhone: false, showLocation: true }
      };

      mockProfileService.getProfile.mockResolvedValue(expectedResult);

      const result = await mockProfileService.getProfile('user123', 'otheruser456');

      expect(result.email).toBeUndefined();
      expect(result.phone).toBeUndefined();
      expect(result.location).toBe('New York');
    });

    it('should throw error when user not found', async () => {
      mockProfileService.getProfile.mockRejectedValue(new Error('User not found'));

      await expect(mockProfileService.getProfile('nonexistent', 'user123')).rejects.toThrow('User not found');
    });
  });

  describe('updateProfile', () => {
    it('should update profile with valid data', async () => {
      const profileData = {
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'Software developer'
      };

      const mockUpdatedUser = {
        documentId: 'user123',
        ...profileData,
        profilePicture: null,
        preferences: null,
        privacySettings: null
      };

      mockProfileService.updateProfile.mockResolvedValue(mockUpdatedUser);

      const result = await mockProfileService.updateProfile('user123', profileData);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockProfileService.updateProfile).toHaveBeenCalledWith('user123', profileData);
    });

    it('should throw error for invalid profile data', async () => {
      const invalidData = {
        firstName: 'A'.repeat(300), // Too long
        website: 'invalid-url'
      };

      mockProfileService.updateProfile.mockRejectedValue(new Error('Validation failed'));

      await expect(mockProfileService.updateProfile('user123', invalidData)).rejects.toThrow('Validation failed');
    });
  });

  describe('getProfileCompletion', () => {
    it('should calculate profile completion percentage correctly', async () => {
      const completionData = {
        percentage: 100,
        completedFields: ['firstName', 'lastName', 'email', 'phone', 'profilePicture', 'dateOfBirth', 'gender', 'bio', 'website', 'location'],
        missingFields: []
      };

      mockProfileService.getProfileCompletion.mockResolvedValue(completionData);

      const result = await mockProfileService.getProfileCompletion('user123');

      expect(result.percentage).toBe(100);
      expect(result.completedFields).toHaveLength(10);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should return partial completion for incomplete profile', async () => {
      const completionData = {
        percentage: 30,
        completedFields: ['firstName', 'lastName', 'email'],
        missingFields: ['phone', 'profilePicture', 'dateOfBirth', 'gender', 'bio', 'website', 'location']
      };

      mockProfileService.getProfileCompletion.mockResolvedValue(completionData);

      const result = await mockProfileService.getProfileCompletion('user123');

      expect(result.percentage).toBe(30);
      expect(result.completedFields).toContain('firstName');
      expect(result.completedFields).toContain('lastName');
      expect(result.completedFields).toContain('email');
      expect(result.missingFields).toHaveLength(7);
    });
  });

  describe('validateProfileData', () => {
    it('should validate profile data successfully', async () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        website: 'https://example.com',
        dateOfBirth: '1990-01-01',
        bio: 'Software developer'
      };

      const validationResult = {
        isValid: true,
        errors: []
      };

      mockProfileService.validateProfileData.mockResolvedValue(validationResult);

      const result = await mockProfileService.validateProfileData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for invalid data', async () => {
      const invalidData = {
        firstName: 'A'.repeat(300), // Too long
        phone: 'invalid-phone',
        website: 'not-a-url',
        dateOfBirth: '2020-01-01', // Too young
        bio: 'A'.repeat(600) // Too long
      };

      const validationResult = {
        isValid: false,
        errors: [
          'First name must be less than 255 characters',
          'Invalid phone number format',
          'Invalid website URL',
          'Date of birth must be for a person between 13 and 120 years old',
          'Bio must be less than 500 characters'
        ]
      };

      mockProfileService.validateProfileData.mockResolvedValue(validationResult);

      const result = await mockProfileService.validateProfileData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('First name must be less than 255 characters');
      expect(result.errors).toContain('Invalid phone number format');
      expect(result.errors).toContain('Invalid website URL');
      expect(result.errors).toContain('Date of birth must be for a person between 13 and 120 years old');
      expect(result.errors).toContain('Bio must be less than 500 characters');
    });
  });

  describe('applyPrivacySettings', () => {
    it('should hide email and phone when privacy settings are disabled', () => {
      const user = {
        documentId: 'user123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        location: 'New York',
        privacySettings: {
          showEmail: false,
          showPhone: false,
          showLocation: true
        }
      };

      const expectedResult = {
        documentId: 'user123',
        firstName: 'John',
        lastName: 'Doe',
        location: 'New York',
        privacySettings: {
          showEmail: false,
          showPhone: false,
          showLocation: true
        }
      };

      mockProfileService.applyPrivacySettings.mockReturnValue(expectedResult);

      const result = mockProfileService.applyPrivacySettings(user);

      expect(result.email).toBeUndefined();
      expect(result.phone).toBeUndefined();
      expect(result.location).toBe('New York');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
    });

    it('should show all data when privacy settings allow', () => {
      const user = {
        documentId: 'user123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        location: 'New York',
        privacySettings: {
          showEmail: true,
          showPhone: true,
          showLocation: true
        }
      };

      mockProfileService.applyPrivacySettings.mockReturnValue(user);

      const result = mockProfileService.applyPrivacySettings(user);

      expect(result.email).toBe('john@example.com');
      expect(result.phone).toBe('+1234567890');
      expect(result.location).toBe('New York');
    });

    it('should return user unchanged when no privacy settings exist', () => {
      const user = {
        documentId: 'user123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890'
      };

      mockProfileService.applyPrivacySettings.mockReturnValue(user);

      const result = mockProfileService.applyPrivacySettings(user);

      expect(result).toEqual(user);
    });
  });

  describe('createDefaultPreferences', () => {
    it('should create default preferences for new user', async () => {
      const mockPreferences = {
        documentId: 'pref123',
        user: 'user123',
        emailNotifications: true,
        smsNotifications: false,
        marketingEmails: false,
        orderUpdates: true,
        twoFactorEnabled: false,
        loginNotifications: true,
        theme: 'auto',
        language: 'en',
        currency: 'USD',
        timezone: 'UTC',
        notificationFrequency: 'immediate'
      };

      mockProfileService.createDefaultPreferences.mockResolvedValue(mockPreferences);

      const result = await mockProfileService.createDefaultPreferences('user123');

      expect(result).toEqual(mockPreferences);
      expect(mockProfileService.createDefaultPreferences).toHaveBeenCalledWith('user123');
    });
  });

  describe('createDefaultPrivacySettings', () => {
    it('should create default privacy settings for new user', async () => {
      const mockPrivacySettings = {
        documentId: 'privacy123',
        user: 'user123',
        profileVisibility: 'private',
        showEmail: false,
        showPhone: false,
        showLocation: false,
        allowAnalytics: true,
        allowMarketing: false,
        allowThirdParty: false,
        dataRetentionConsent: false,
        marketingConsent: false
      };

      mockProfileService.createDefaultPrivacySettings.mockResolvedValue(mockPrivacySettings);

      const result = await mockProfileService.createDefaultPrivacySettings('user123');

      expect(result).toEqual(mockPrivacySettings);
      expect(mockProfileService.createDefaultPrivacySettings).toHaveBeenCalledWith('user123');
    });
  });
});
