/**
 * Activity tracking middleware
 * Tracks user activities for analytics and security monitoring
 */

import type { Core } from '@strapi/strapi';
import type { Context, Next } from 'koa';
import { defaultConfig, type ActivityTrackingConfig } from './activity-tracking.config';
import { 
  generateSessionId, 
  trackActivity, 
  parseUserAgent, 
  getLocationFromIP,
  type User,
  type DeviceInfo,
  type ActivityData,
  type ActivityType
} from '../utils/activity-tracking';

// Types are now imported from utils/activity-tracking

export default (config: ActivityTrackingConfig = defaultConfig, { strapi }: { strapi: Core.Strapi }) => {
  // Merge with default config
  const finalConfig = { ...defaultConfig, ...config };
  
  return async (ctx: Context, next: Next) => {
    // Skip if disabled
    if (!finalConfig.enabled) {
      return next();
    }
    
    const startTime = Date.now();
    const sessionId = (ctx.request.headers['x-session-id'] as string) || generateSessionId();
    
    // Extract user information
    const user = ctx.state.user as User | null;
    const ipAddress = ctx.request.ip || 
                     (ctx.request.headers['x-forwarded-for'] as string) || 
                     (ctx.request.headers['x-real-ip'] as string) || 
                     (ctx.request.socket?.remoteAddress) || null;
    
    const userAgent = ctx.request.headers['user-agent'] as string | null;
    const location = finalConfig.privacy.trackLocation ? getLocationFromIP(ipAddress) : null;
    const deviceInfo = finalConfig.privacy.trackDeviceInfo ? parseUserAgent(userAgent) : null;
    
    // Track page views for authenticated users (before processing)
    if (user && ctx.method === 'GET' && !ctx.request.url.startsWith('/admin') && shouldTrackEndpoint(ctx, finalConfig)) {
        await trackActivity({
          strapi,
          user,
          activityType: 'page_view',
          activityData: {
            url: ctx.request.url,
            method: ctx.method,
            timestamp: new Date().toISOString(),
            queryParams: ctx.query
          },
          ipAddress,
          userAgent,
          location,
          deviceInfo,
          sessionId,
          success: true
        });
    }
    
    try {
      await next();
      
      // Track activities (both successful and failed)
      if (shouldTrackEndpoint(ctx, finalConfig)) {
        const endTime = Date.now();
        const sessionDuration = endTime - startTime;
        
        // Determine if the request was successful
        const isSuccess = ctx.status >= 200 && ctx.status < 400;
        
        // For login endpoints, we need to get the user from the response
        let userToTrack = user;
        if (ctx.request.url.startsWith('/api/auth/local') && ctx.method === 'POST' && isSuccess) {
          // Login was successful, get user from response
          const responseBody = ctx.response.body as any;
          userToTrack = responseBody?.user || user;
        }
        
        const activityType = getActivityType(ctx);
        const activityData = getActivityData(ctx);
        
        await trackActivity({
          strapi,
          user: userToTrack,
          activityType,
          activityData,
          ipAddress,
          userAgent,
          location,
          deviceInfo,
          sessionId,
          sessionDuration,
          success: isSuccess,
          errorMessage: isSuccess ? undefined : `HTTP ${ctx.status}`
        });
      }
    } catch (error) {
      // Track failed activities
      if (shouldTrackEndpoint(ctx, finalConfig)) {
        await trackActivity({
          strapi,
          user,
          activityType: getActivityType(ctx),
          activityData: getActivityData(ctx),
          ipAddress,
          userAgent,
          location,
          deviceInfo,
          sessionId,
          success: false,
          errorMessage: error.message
        });
      }
      
      throw error;
    }
  };
};

// trackActivity function is now imported from utils/activity-tracking

/**
 * Determine if endpoint should be tracked
 */
function shouldTrackEndpoint(ctx: Context, config: ActivityTrackingConfig): boolean {
  // Don't track analytics endpoints to avoid infinite loops
  if (config.excludedEndpoints.some(endpoint => ctx.request.url.startsWith(endpoint))) {
    return false;
  }
  
  // Track specific endpoints
  return config.trackableEndpoints.some(endpoint => ctx.request.url.startsWith(endpoint));
}

/**
 * Get activity type based on the request
 */
function getActivityType(ctx: Context): ActivityType {
  const url = ctx.request.url;
  const method = ctx.method;
  
  if (url.startsWith('/api/auth/local/register') && method === 'POST') {
    return 'account_created';
  }
  
  if (url.startsWith('/api/auth/local') && method === 'POST') {
    return 'login';
  }
  
  if (url.startsWith('/api/users/me') && method === 'PUT') {
    return 'profile_update';
  }
  
  if (url.startsWith('/api/user-preferences') && method === 'PUT') {
    return 'preference_change';
  }
  
  if (url.startsWith('/api/privacy-settings') && method === 'PUT') {
    return 'preference_change';
  }
  
  return 'page_view';
}

/**
 * Get activity data based on the request
 */
function getActivityData(ctx: Context): ActivityData {
  const url = ctx.request.url;
  const method = ctx.method;
  
  const baseData: ActivityData = {
    url,
    method,
    timestamp: new Date().toISOString()
  };
  
  // Add specific data based on endpoint
  if (url.startsWith('/api/auth/local')) {
    return {
      ...baseData,
      endpoint: url, // Use the actual URL instead of generic 'authentication'
      action: method === 'POST' ? 'login' : 'logout'
    };
  }
  
  if (url.startsWith('/api/users/me')) {
    return {
      ...baseData,
      endpoint: url, // Use the actual URL
      action: 'update_profile'
    };
  }
  
  if (url.startsWith('/api/user-preferences') || url.startsWith('/api/privacy-settings')) {
    return {
      ...baseData,
      endpoint: url, // Use the actual URL
      action: 'update_preferences'
    };
  }
  
  return baseData;
}

// Utility functions are now imported from utils/activity-tracking