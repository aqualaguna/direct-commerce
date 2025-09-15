/**
 * Activity tracking middleware configuration
 */

export interface ActivityTrackingConfig {
  // Enable/disable activity tracking
  enabled: boolean;
  
  // Trackable endpoints
  trackableEndpoints: string[];
  
  // Excluded endpoints (to avoid infinite loops)
  excludedEndpoints: string[];
  
  // Activity types to track
  trackableActivityTypes: string[];
  
  // Privacy settings
  privacy: {
    // Anonymize IP addresses
    anonymizeIP: boolean;
    // Track location data
    trackLocation: boolean;
    // Track device information
    trackDeviceInfo: boolean;
  };
  
  // Performance settings
  performance: {
    // Batch size for bulk operations
    batchSize: number;
    // Async processing (don't block request)
    asyncProcessing: boolean;
  };
}

export const defaultConfig: ActivityTrackingConfig = {
  enabled: true,
  
  trackableEndpoints: [
    '/api/auth/local',
    '/api/auth/local/register',
    '/api/users/me',
    '/api/user-preferences',
    '/api/privacy-settings',
    '/api/products',
    '/api/orders',
    '/api/cart'
  ],
  
  excludedEndpoints: [
    '/api/user-activities',
    '/api/user-behavior',
    '/api/security-events',
    '/api/engagement-metrics',
    '/api/analytics',
    '/admin'
  ],
  
  trackableActivityTypes: [
    'login',
    'logout',
    'profile_update',
    'preference_change',
    'page_view',
    'product_interaction',
    'account_created',
    'password_change',
    'session_expired'
  ],
  
  privacy: {
    anonymizeIP: true,
    trackLocation: true,
    trackDeviceInfo: true
  },
  
  performance: {
    batchSize: 100,
    asyncProcessing: true
  }
};
