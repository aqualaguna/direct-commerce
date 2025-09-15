/**
 * Unified Activity Tracking Utilities
 * 
 * Centralized utilities for activity tracking across the application.
 * This ensures consistency and eliminates duplicate code.
 */

import { v4 as uuidv4 } from 'uuid';
import * as geoip from 'geoip-lite';
import type { Core } from '@strapi/strapi';

// Type definitions
export interface User {
  documentId: string;
  id: number;
  username: string;
  email: string;
  role?: {
    type: string;
  };
}

export interface DeviceInfo {
  browser: string | null;
  os: string | null;
  device: string | null;
  mobile: boolean;
  [key: string]: any;
}

export interface ActivityData {
  url: string;
  method: string;
  timestamp: string;
  endpoint?: string;
  action?: string;
  queryParams?: Record<string, any>;
  [key: string]: any;
}

export type ActivityType = 'login' | 'logout' | 'profile_update' | 'preference_change' | 'page_view' | 'product_interaction' | 'account_created' | 'password_change' | 'session_expired';

export interface TrackActivityParams {
  strapi: Core.Strapi;
  user: User | null;
  activityType: ActivityType;
  activityData: ActivityData;
  ipAddress: string | null;
  userAgent: string | null;
  location?: string | null;
  deviceInfo?: DeviceInfo | null;
  sessionId: string;
  sessionDuration?: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return uuidv4();
}

/**
 * Anonymize IP address for privacy compliance
 */
export function anonymizeIP(ipAddress: string | null): string | null {
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

/**
 * Get location from IP address
 */
export function getLocationFromIP(ipAddress: string | null): string | null {
  if (!ipAddress) return null;
  
  try {
    const geo = geoip.lookup(ipAddress);
    if (geo) {
      return `${geo.city}, ${geo.region}, ${geo.country}`;
    }
  } catch (error) {
    console.debug('Failed to get location from IP:', error);
  }
  return null;
}

/**
 * Parse user agent to extract device information
 */
export function parseUserAgent(userAgent: string | null): DeviceInfo | null {
  if (!userAgent) return null;
  
  const deviceInfo: DeviceInfo = {
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
  
  if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iOS')) {
    deviceInfo.os = 'iOS';
  } else if (userAgent.includes('Android')) {
    deviceInfo.os = 'Android';
  } else if (userAgent.includes('Windows')) {
    deviceInfo.os = 'Windows';
  } else if (userAgent.includes('Mac OS')) {
    deviceInfo.os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    deviceInfo.os = 'Linux';
  }
  
  return deviceInfo;
}

/**
 * Extract device info from user agent (simplified version for controllers)
 */
export function extractDeviceInfo(userAgent: string): DeviceInfo | null {
  if (!userAgent) return null;

  // Basic device detection
  const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
  const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/.test(userAgent);
  const isDesktop = !isMobile && !isTablet;

  return {
    type: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
    userAgent: userAgent.substring(0, 200), // Truncate for privacy
    mobile: isMobile,
    browser: null,
    os: null,
    device: null
  };
}

/**
 * Get location from IP address (async version for controllers)
 */
export async function getLocationFromIPAsync(ip: string): Promise<string | null> {
  try {
    // Basic IP anonymization - only store country/region level
    if (!ip || ip === '::1' || ip.startsWith('127.')) {
      return 'local';
    }

    // In production, you might use a service like MaxMind GeoIP
    // For now, return a placeholder
    return 'unknown';
  } catch (error) {
    console.warn('Error getting location from IP:', error);
    return 'unknown';
  }
}

/**
 * Unified activity tracking function
 */
export async function trackActivity({
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
  errorMessage,
  metadata = {}
}: TrackActivityParams): Promise<void> {
  try {
    // Use Strapi 5 Document Service API
    await strapi.documents('api::user-activity.user-activity').create({
      data: {
        user: user ? user.documentId : null,
        activityType,
        activityData,
        ipAddress: anonymizeIP(ipAddress),
        userAgent: userAgent ? userAgent.substring(0, 1000) : null,
        location: location || (ipAddress ? getLocationFromIP(ipAddress) : null),
        deviceInfo: deviceInfo || (userAgent ? parseUserAgent(userAgent) : null),
        sessionId,
        sessionDuration,
        success,
        errorMessage,
        metadata: {
          ...metadata,
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
 * Track login attempt with standardized data structure
 */
export async function trackLoginAttempt(
  strapi: Core.Strapi,
  ctx: any,
  user: User | null,
  success: boolean,
  errorMessage: string | null,
  sessionDuration: number = 0
): Promise<void> {
  const ipAddress = ctx.request.ip || 
                   ctx.request.headers['x-forwarded-for'] || 
                   ctx.request.headers['x-real-ip'] || 
                   ctx.request.connection.remoteAddress;
  
  const userAgent = ctx.request.headers['user-agent'];
  const sessionId = ctx.request.headers['x-session-id'] || generateSessionId();
  
  await trackActivity({
    strapi,
    user,
    activityType: 'login',
    activityData: {
      url: '/api/auth/local',
      endpoint: '/api/auth/local',
      method: 'POST',
      identifier: ctx.request.body.identifier,
      timestamp: new Date().toISOString()
    },
    ipAddress,
    userAgent,
    sessionId,
    sessionDuration,
    success,
    errorMessage,
    metadata: {
      loginAttempt: true,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Track general activity with standardized data structure
 */
export async function trackGeneralActivity(
  strapi: Core.Strapi,
  ctx: any,
  user: User | null,
  activityType: ActivityType,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  const ipAddress = ctx.request.ip || 
                   ctx.request.headers['x-forwarded-for'] || 
                   ctx.request.headers['x-real-ip'] || 
                   ctx.request.connection.remoteAddress;
  
  const userAgent = ctx.request.headers['user-agent'];
  const sessionId = ctx.request.headers['x-session-id'] || generateSessionId();
  
  await trackActivity({
    strapi,
    user,
    activityType,
    activityData: {
      url: ctx.request.url,
      endpoint: ctx.request.url,
      method: ctx.request.method,
      timestamp: new Date().toISOString()
    },
    ipAddress,
    userAgent,
    sessionId,
    success,
    errorMessage,
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
}
