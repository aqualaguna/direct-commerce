'use strict';

/**
 * Activity tracking middleware
 * Tracks user activities for analytics and security monitoring
 */

const geoip = require('geoip-lite');
const { v4: uuidv4 } = require('uuid');

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    const startTime = Date.now();
    const sessionId = ctx.request.headers['x-session-id'] || uuidv4();
    
    // Extract user information
    const user = ctx.state.user;
    const ipAddress = ctx.request.ip || 
                     ctx.request.headers['x-forwarded-for'] || 
                     ctx.request.headers['x-real-ip'] || 
                     ctx.request.connection.remoteAddress;
    
    const userAgent = ctx.request.headers['user-agent'];
    const location = getLocationFromIP(ipAddress);
    const deviceInfo = parseUserAgent(userAgent);
    
    // Track page views for authenticated users
    if (user && ctx.method === 'GET' && !ctx.request.url.startsWith('/admin')) {
      await trackActivity({
        strapi,
        user,
        activityType: 'page_view',
        activityData: {
          url: ctx.request.url,
          method: ctx.method,
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
      
      // Track successful activities
      if (shouldTrackEndpoint(ctx)) {
        const endTime = Date.now();
        const sessionDuration = endTime - startTime;
        
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
          sessionDuration,
          success: true
        });
      }
    } catch (error) {
      // Track failed activities
      if (shouldTrackEndpoint(ctx)) {
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

/**
 * Track user activity in the database
 */
async function trackActivity({
  strapi,
  user,
  activityType,
  activityData,
  ipAddress,
  userAgent,
  location,
  deviceInfo,
  sessionId,
  sessionDuration,
  success,
  errorMessage
}) {
  try {
    await strapi.documents('api::user-activity.user-activity').create({
      data: {
        user: user ? user.id : null,
        activityType,
        activityData,
        ipAddress: anonymizeIP(ipAddress),
        userAgent,
        location,
        deviceInfo,
        sessionId,
        sessionDuration,
        success,
        errorMessage,
        metadata: {
          timestamp: new Date().toISOString(),
          serverTime: Date.now()
        }
      }
    });
  } catch (error) {
    strapi.log.error('Failed to track activity:', error);
    // Don't throw error to prevent breaking the main request flow
  }
}

/**
 * Determine if endpoint should be tracked
 */
function shouldTrackEndpoint(ctx) {
  const trackableEndpoints = [
    '/api/auth/local',
    '/api/auth/local/register',
    '/api/users/me',
    '/api/user-preferences',
    '/api/privacy-settings'
  ];
  
  const excludeEndpoints = [
    '/api/user-activities',
    '/api/user-behavior',
    '/api/security-events',
    '/api/engagement-metrics'
  ];
  
  // Don't track analytics endpoints to avoid infinite loops
  if (excludeEndpoints.some(endpoint => ctx.request.url.startsWith(endpoint))) {
    return false;
  }
  
  // Track specific endpoints
  return trackableEndpoints.some(endpoint => ctx.request.url.startsWith(endpoint));
}

/**
 * Get activity type based on the request
 */
function getActivityType(ctx) {
  const url = ctx.request.url;
  const method = ctx.method;
  
  if (url.startsWith('/api/auth/local') && method === 'POST') {
    return 'login';
  }
  
  if (url.startsWith('/api/auth/local/register') && method === 'POST') {
    return 'account_created';
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
function getActivityData(ctx) {
  const url = ctx.request.url;
  const method = ctx.method;
  
  const baseData = {
    url,
    method,
    timestamp: new Date().toISOString()
  };
  
  // Add specific data based on endpoint
  if (url.startsWith('/api/auth/local')) {
    return {
      ...baseData,
      endpoint: 'authentication',
      action: method === 'POST' ? 'login' : 'logout'
    };
  }
  
  if (url.startsWith('/api/users/me')) {
    return {
      ...baseData,
      endpoint: 'user_profile',
      action: 'update_profile'
    };
  }
  
  if (url.startsWith('/api/user-preferences') || url.startsWith('/api/privacy-settings')) {
    return {
      ...baseData,
      endpoint: 'user_preferences',
      action: 'update_preferences'
    };
  }
  
  return baseData;
}

/**
 * Get location from IP address
 */
function getLocationFromIP(ipAddress) {
  try {
    const geo = geoip.lookup(ipAddress);
    if (geo) {
      return `${geo.city}, ${geo.region}, ${geo.country}`;
    }
  } catch (error) {
    strapi.log.debug('Failed to get location from IP:', error);
  }
  return null;
}

/**
 * Parse user agent to extract device information
 */
function parseUserAgent(userAgent) {
  if (!userAgent) return null;
  
  const deviceInfo = {
    browser: null,
    os: null,
    device: null,
    mobile: false
  };
  
  // Basic user agent parsing
  if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
    deviceInfo.mobile = true;
  }
  
  if (userAgent.includes('Chrome')) {
    deviceInfo.browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    deviceInfo.browser = 'Firefox';
  } else if (userAgent.includes('Safari')) {
    deviceInfo.browser = 'Safari';
  }
  
  if (userAgent.includes('Windows')) {
    deviceInfo.os = 'Windows';
  } else if (userAgent.includes('Mac OS')) {
    deviceInfo.os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    deviceInfo.os = 'Linux';
  } else if (userAgent.includes('Android')) {
    deviceInfo.os = 'Android';
  } else if (userAgent.includes('iOS')) {
    deviceInfo.os = 'iOS';
  }
  
  return deviceInfo;
}

/**
 * Anonymize IP address for privacy compliance
 */
function anonymizeIP(ipAddress) {
  if (!ipAddress) return null;
  
  // IPv4 - remove last octet
  if (ipAddress.includes('.')) {
    const parts = ipAddress.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }
  
  // IPv6 - remove last 64 bits
  if (ipAddress.includes(':')) {
    const parts = ipAddress.split(':');
    if (parts.length >= 4) {
      return `${parts.slice(0, 4).join(':')}::`;
    }
  }
  
  return ipAddress;
}