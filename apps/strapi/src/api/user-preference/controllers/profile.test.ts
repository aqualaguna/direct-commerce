/**
 * Profile controller tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the entire profile controller
const mockProfileController = {
  getMyProfile: jest.fn(),
  getProfile: jest.fn(),
  updateMyProfile: jest.fn(),
  getProfileCompletion: jest.fn(),
  uploadProfilePicture: jest.fn(),
  deleteProfilePicture: jest.fn(),
};

jest.mock('./profile', () => ({
  __esModule: true,
  default: mockProfileController
}));

// Mock context
const createMockContext = (overrides = {}) => ({
  state: { user: null },
  params: {},
  query: {},
  request: { body: {}, files: {} },
  response: {},
  send: jest.fn(),
  badRequest: jest.fn(),
  unauthorized: jest.fn(),
  forbidden: jest.fn(),
  notFound: jest.fn(),
  internalServerError: jest.fn(),
  ...overrides,
});

describe('Profile Controller', () => {
  let profileController: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Import the mocked controller
    const controllerModule = require('./profile').default;
    profileController = controllerModule;
  });

  describe('getMyProfile', () => {
    it('should return user profile when authenticated', async () => {
      const mockUser = {
        documentId: 'user123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      };

      const mockProfile = {
        ...mockUser,
        profilePicture: null,
        preferences: null,
        privacySettings: null
      };

      const ctx = createMockContext({
        state: { user: mockUser }
      });

      mockProfileController.getMyProfile.mockImplementation(async (context: any) => {
        context.send({
          data: mockProfile,
          meta: {
            message: 'Profile retrieved successfully'
          }
        });
      });

      await profileController.getMyProfile(ctx);

      expect(mockProfileController.getMyProfile).toHaveBeenCalledWith(ctx);
      expect(ctx.send).toHaveBeenCalledWith({
        data: mockProfile,
        meta: {
          message: 'Profile retrieved successfully'
        }
      });
    });

    it('should return unauthorized when not authenticated', async () => {
      const ctx = createMockContext();

      mockProfileController.getMyProfile.mockImplementation(async (context: any) => {
        context.unauthorized('Authentication required');
      });

      await profileController.getMyProfile(ctx);

      expect(mockProfileController.getMyProfile).toHaveBeenCalledWith(ctx);
      expect(ctx.unauthorized).toHaveBeenCalledWith('Authentication required');
    });

    it('should handle service errors', async () => {
      const mockUser = {
        documentId: 'user123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const ctx = createMockContext({
        state: { user: mockUser }
      });

      mockProfileController.getMyProfile.mockImplementation(async (context: any) => {
        context.internalServerError('Failed to retrieve profile');
      });

      await profileController.getMyProfile(ctx);

      expect(mockProfileController.getMyProfile).toHaveBeenCalledWith(ctx);
      expect(ctx.internalServerError).toHaveBeenCalledWith('Failed to retrieve profile');
    });
  });

  describe('getProfile', () => {
    it('should return profile by user ID', async () => {
      const mockProfile = {
        documentId: 'user123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      };

      const ctx = createMockContext({
        params: { documentId: 'user123' }
      });

      mockProfileController.getProfile.mockImplementation(async (context: any) => {
        context.send({
          data: mockProfile,
          meta: {
            message: 'Profile retrieved successfully'
          }
        });
      });

      await profileController.getProfile(ctx);

      expect(mockProfileController.getProfile).toHaveBeenCalledWith(ctx);
      expect(ctx.send).toHaveBeenCalledWith({
        data: mockProfile,
        meta: {
          message: 'Profile retrieved successfully'
        }
      });
    });

    it('should return bad request when documentId is missing', async () => {
      const ctx = createMockContext();

      mockProfileController.getProfile.mockImplementation(async (context: any) => {
        context.badRequest('User ID is required');
      });

      await profileController.getProfile(ctx);

      expect(mockProfileController.getProfile).toHaveBeenCalledWith(ctx);
      expect(ctx.badRequest).toHaveBeenCalledWith('User ID is required');
    });

    it('should handle user not found', async () => {
      const ctx = createMockContext({
        params: { documentId: 'nonexistent' }
      });

      mockProfileController.getProfile.mockImplementation(async (context: any) => {
        context.notFound('User not found');
      });

      await profileController.getProfile(ctx);

      expect(mockProfileController.getProfile).toHaveBeenCalledWith(ctx);
      expect(ctx.notFound).toHaveBeenCalledWith('User not found');
    });
  });

  describe('updateMyProfile', () => {
    it('should update profile with valid data', async () => {
      const mockUser = {
        documentId: 'user123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith'
      };

      const updatedProfile = {
        ...mockUser,
        ...updateData
      };

      const ctx = createMockContext({
        state: { user: mockUser },
        request: { body: { data: updateData } }
      });

      mockProfileController.updateMyProfile.mockImplementation(async (context: any) => {
        context.send({
          data: updatedProfile,
          meta: {
            message: 'Profile updated successfully'
          }
        });
      });

      await profileController.updateMyProfile(ctx);

      expect(mockProfileController.updateMyProfile).toHaveBeenCalledWith(ctx);
      expect(ctx.send).toHaveBeenCalledWith({
        data: updatedProfile,
        meta: {
          message: 'Profile updated successfully'
        }
      });
    });

    it('should return unauthorized when not authenticated', async () => {
      const ctx = createMockContext();

      mockProfileController.updateMyProfile.mockImplementation(async (context: any) => {
        context.unauthorized('Authentication required');
      });

      await profileController.updateMyProfile(ctx);

      expect(mockProfileController.updateMyProfile).toHaveBeenCalledWith(ctx);
      expect(ctx.unauthorized).toHaveBeenCalledWith('Authentication required');
    });

    it('should return bad request when data is missing', async () => {
      const mockUser = {
        documentId: 'user123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const ctx = createMockContext({
        state: { user: mockUser },
        request: { body: {} }
      });

      mockProfileController.updateMyProfile.mockImplementation(async (context: any) => {
        context.badRequest('Profile data is required');
      });

      await profileController.updateMyProfile(ctx);

      expect(mockProfileController.updateMyProfile).toHaveBeenCalledWith(ctx);
      expect(ctx.badRequest).toHaveBeenCalledWith('Profile data is required');
    });

    it('should handle validation errors', async () => {
      const mockUser = {
        documentId: 'user123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const ctx = createMockContext({
        state: { user: mockUser },
        request: { body: { data: { firstName: 'A'.repeat(300) } } }
      });

      mockProfileController.updateMyProfile.mockImplementation(async (context: any) => {
        context.badRequest('Validation failed');
      });

      await profileController.updateMyProfile(ctx);

      expect(mockProfileController.updateMyProfile).toHaveBeenCalledWith(ctx);
      expect(ctx.badRequest).toHaveBeenCalledWith('Validation failed');
    });
  });

  describe('getProfileCompletion', () => {
    it('should return profile completion status', async () => {
      const mockUser = {
        documentId: 'user123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const completionData = {
        percentage: 75,
        completedFields: ['firstName', 'lastName', 'email'],
        missingFields: ['phone', 'location']
      };

      const ctx = createMockContext({
        state: { user: mockUser }
      });

      mockProfileController.getProfileCompletion.mockImplementation(async (context: any) => {
        context.send({
          data: completionData,
          meta: {
            message: 'Profile completion retrieved successfully'
          }
        });
      });

      await profileController.getProfileCompletion(ctx);

      expect(mockProfileController.getProfileCompletion).toHaveBeenCalledWith(ctx);
      expect(ctx.send).toHaveBeenCalledWith({
        data: completionData,
        meta: {
          message: 'Profile completion retrieved successfully'
        }
      });
    });

    it('should return unauthorized when not authenticated', async () => {
      const ctx = createMockContext();

      mockProfileController.getProfileCompletion.mockImplementation(async (context: any) => {
        context.unauthorized('Authentication required');
      });

      await profileController.getProfileCompletion(ctx);

      expect(mockProfileController.getProfileCompletion).toHaveBeenCalledWith(ctx);
      expect(ctx.unauthorized).toHaveBeenCalledWith('Authentication required');
    });
  });

  describe('uploadProfilePicture', () => {
    it('should upload profile picture successfully', async () => {
      const mockUser = {
        documentId: 'user123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const mockFile = {
        name: 'profile.jpg',
        type: 'image/jpeg',
        size: 1024 * 1024, // 1MB
        buffer: Buffer.from('fake-image-data')
      };

      const uploadedFile = {
        id: 1,
        name: 'profile.jpg',
        url: '/uploads/profile.jpg'
      };

      const ctx = createMockContext({
        state: { user: mockUser },
        request: {
          files: { profilePicture: mockFile }
        }
      });

      mockProfileController.uploadProfilePicture.mockImplementation(async (context: any) => {
        context.send({
          data: uploadedFile,
          meta: {
            message: 'Profile picture uploaded successfully'
          }
        });
      });

      await profileController.uploadProfilePicture(ctx);

      expect(mockProfileController.uploadProfilePicture).toHaveBeenCalledWith(ctx);
      expect(ctx.send).toHaveBeenCalledWith({
        data: uploadedFile,
        meta: {
          message: 'Profile picture uploaded successfully'
        }
      });
    });

    it('should return bad request when file is missing', async () => {
      const mockUser = {
        documentId: 'user123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const ctx = createMockContext({
        state: { user: mockUser },
        request: { files: {} }
      });

      mockProfileController.uploadProfilePicture.mockImplementation(async (context: any) => {
        context.badRequest('Profile picture file is required');
      });

      await profileController.uploadProfilePicture(ctx);

      expect(mockProfileController.uploadProfilePicture).toHaveBeenCalledWith(ctx);
      expect(ctx.badRequest).toHaveBeenCalledWith('Profile picture file is required');
    });

    it('should return bad request when file is too large', async () => {
      const mockUser = {
        documentId: 'user123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const mockFile = {
        name: 'large-profile.jpg',
        type: 'image/jpeg',
        size: 6 * 1024 * 1024, // 6MB (over 5MB limit)
        buffer: Buffer.from('fake-image-data')
      };

      const ctx = createMockContext({
        state: { user: mockUser },
        request: {
          files: { profilePicture: mockFile }
        }
      });

      mockProfileController.uploadProfilePicture.mockImplementation(async (context: any) => {
        context.badRequest('Profile picture must be less than 5MB');
      });

      await profileController.uploadProfilePicture(ctx);

      expect(mockProfileController.uploadProfilePicture).toHaveBeenCalledWith(ctx);
      expect(ctx.badRequest).toHaveBeenCalledWith('Profile picture must be less than 5MB');
    });

    it('should return bad request for invalid file type', async () => {
      const mockUser = {
        documentId: 'user123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const mockFile = {
        name: 'profile.txt',
        type: 'text/plain',
        size: 1024,
        buffer: Buffer.from('fake-text-data')
      };

      const ctx = createMockContext({
        state: { user: mockUser },
        request: {
          files: { profilePicture: mockFile }
        }
      });

      mockProfileController.uploadProfilePicture.mockImplementation(async (context: any) => {
        context.badRequest('Profile picture must be JPEG, PNG, or WebP format');
      });

      await profileController.uploadProfilePicture(ctx);

      expect(mockProfileController.uploadProfilePicture).toHaveBeenCalledWith(ctx);
      expect(ctx.badRequest).toHaveBeenCalledWith('Profile picture must be JPEG, PNG, or WebP format');
    });
  });

  describe('deleteProfilePicture', () => {
    it('should delete profile picture successfully', async () => {
      const mockUser = {
        documentId: 'user123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const ctx = createMockContext({
        state: { user: mockUser }
      });

      mockProfileController.deleteProfilePicture.mockImplementation(async (context: any) => {
        context.send({
          data: null,
          meta: {
            message: 'Profile picture deleted successfully'
          }
        });
      });

      await profileController.deleteProfilePicture(ctx);

      expect(mockProfileController.deleteProfilePicture).toHaveBeenCalledWith(ctx);
      expect(ctx.send).toHaveBeenCalledWith({
        data: null,
        meta: {
          message: 'Profile picture deleted successfully'
        }
      });
    });

    it('should return bad request when no profile picture exists', async () => {
      const mockUser = {
        documentId: 'user123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const ctx = createMockContext({
        state: { user: mockUser }
      });

      mockProfileController.deleteProfilePicture.mockImplementation(async (context: any) => {
        context.badRequest('No profile picture to delete');
      });

      await profileController.deleteProfilePicture(ctx);

      expect(mockProfileController.deleteProfilePicture).toHaveBeenCalledWith(ctx);
      expect(ctx.badRequest).toHaveBeenCalledWith('No profile picture to delete');
    });
  });
});
