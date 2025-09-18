/**
 * Profile service for user profile management
 */

interface ProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  profilePicture?: any;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  bio?: string;
  website?: string;
  location?: string;
  timezone?: string;
  language?: string;
  currency?: string;
}

interface ProfileCompletion {
  percentage: number;
  completedFields: string[];
  missingFields: string[];
}

export default {
  /**
   * Get user profile with privacy filtering
   */
  async getProfile(userId: string, requestingUserId?: string) {
    try {
      const user = await strapi.documents('plugin::users-permissions.user').findOne({
        documentId: userId,
        populate: ['profilePicture', 'preferences', 'privacySettings']
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Apply privacy settings if not the same user
      if (requestingUserId !== userId) {
        return this.applyPrivacySettings(user);
      }

      return user;
    } catch (error) {
      strapi.log.error('Error getting user profile:', error);
      throw error;
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(userId: string, profileData: ProfileData) {
    try {
      // Validate profile data
      const validationResult = await this.validateProfileData(profileData);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Update user profile
      const updatedUser = await strapi.documents('plugin::users-permissions.user').update({
        documentId: userId,
        data: profileData,
        populate: ['profilePicture', 'preferences', 'privacySettings']
      });

      // Log profile update for audit
      strapi.log.info(`Profile updated for user ${userId}`);

      return updatedUser;
    } catch (error) {
      strapi.log.error('Error updating user profile:', error);
      throw error;
    }
  },

  /**
   * Get profile completion percentage
   */
  async getProfileCompletion(userId: string): Promise<ProfileCompletion> {
    try {
      const user = await strapi.documents('plugin::users-permissions.user').findOne({
        documentId: userId,
        populate: ['profilePicture', 'preferences', 'privacySettings']
      });

      if (!user) {
        throw new Error('User not found');
      }

      const requiredFields = [
        'firstName', 'lastName', 'email', 'phone', 'profilePicture',
        'dateOfBirth', 'gender', 'bio', 'website', 'location'
      ];

      const completedFields: string[] = [];
      const missingFields: string[] = [];

      requiredFields.forEach(field => {
        if (user[field] && user[field] !== '') {
          completedFields.push(field);
        } else {
          missingFields.push(field);
        }
      });

      const percentage = Math.round((completedFields.length / requiredFields.length) * 100);

      return {
        percentage,
        completedFields,
        missingFields
      };
    } catch (error) {
      strapi.log.error('Error calculating profile completion:', error);
      throw error;
    }
  },

  /**
   * Validate profile data
   */
  async validateProfileData(profileData: ProfileData) {
    const errors: string[] = [];

    // Validate first name
    if (profileData.firstName && profileData.firstName.length > 255) {
      errors.push('First name must be less than 255 characters');
    }

    // Validate last name
    if (profileData.lastName && profileData.lastName.length > 255) {
      errors.push('Last name must be less than 255 characters');
    }

    // Validate phone number
    if (profileData.phone) {
      // Ensure phone is a string
      if (typeof profileData.phone !== 'string') {
        errors.push('Phone number must be a string');
      } else {
        // More flexible phone regex that accepts common formats
        const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,19}$/;
        const cleanPhone = profileData.phone.replace(/[\s\-\(\)]/g, '');
        if (!phoneRegex.test(profileData.phone) || cleanPhone.length < 8 || cleanPhone.length > 20) {
          errors.push('Invalid phone number format');
        }
      }
    }

    // Validate website URL
    if (profileData.website) {
      try {
        const url = new URL(profileData.website);
        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push('Invalid website URL');
        }
      } catch {
        errors.push('Invalid website URL');
      }
    }

    // Validate date of birth
    if (profileData.dateOfBirth) {
      const dob = new Date(profileData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      
      if (age < 13 || age > 120) {
        errors.push('Date of birth must be for a person between 13 and 120 years old');
      }
    }

    // Validate bio length
    if (profileData.bio && profileData.bio.length > 500) {
      errors.push('Bio must be less than 500 characters');
    }

    // Validate gender
    if (profileData.gender && !['male', 'female', 'other', 'prefer-not-to-say'].includes(profileData.gender)) {
      errors.push('Gender must be male, female, other, or prefer-not-to-say');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Apply privacy settings to profile data
   */
  applyPrivacySettings(user: any) {
    const privacySettings = user.privacySettings;
    const filteredUser = { ...user };

    if (privacySettings) {
      if (!privacySettings.showEmail) {
        delete filteredUser.email;
      }
      if (!privacySettings.showPhone) {
        delete filteredUser.phone;
      }
      if (!privacySettings.showLocation) {
        delete filteredUser.location;
      }
    }

    return filteredUser;
  },

  /**
   * Create default preferences for new user
   */
  async createDefaultPreferences(userId: string) {
    try {
      const preferences = await strapi.documents('api::user-preference.user-preference').create({
        data: {
          user: userId,
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
        }
      });

      return preferences;
    } catch (error) {
      strapi.log.error('Error creating default preferences:', error);
      throw error;
    }
  },

  /**
   * Create default privacy settings for new user
   */
  async createDefaultPrivacySettings(userId: string) {
    try {
      const privacySettings = await strapi.documents('api::privacy-setting.privacy-setting').create({
        data: {
          user: userId,
          profileVisibility: 'private' as const,
          showEmail: false,
          showPhone: false,
          showLocation: false,
          dataSharing: false,
          analyticsConsent: true,
          marketingConsent: false,
          thirdPartySharing: false,
          gdprConsent: false,
          dataRetentionConsent: false,
          dataProcessingConsent: true,
          cookieConsent: 'necessary' as const,
          consentSource: 'registration' as const,
          rightToBeForgetRequested: false,
          dataExportRequested: false
        }
      });

      return privacySettings;
    } catch (error) {
      strapi.log.error('Error creating default privacy settings:', error);
      throw error;
    }
  }
};
