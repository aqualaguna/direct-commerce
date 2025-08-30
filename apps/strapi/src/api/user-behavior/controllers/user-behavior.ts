'use strict'

import { factories } from '@strapi/strapi'

// Helper functions
const extractDeviceInfo = (userAgent: string) => {
  if (!userAgent) return null

  // Basic device detection
  const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent)
  const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/.test(userAgent)
  const isDesktop = !isMobile && !isTablet

  return {
    type: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
    userAgent: userAgent.substring(0, 200) // Truncate for privacy
  }
}

const getLocationFromIP = async (ip: string) => {
  try {
    // Basic IP anonymization - only store country/region level
    if (!ip || ip === '::1' || ip.startsWith('127.')) {
      return 'local'
    }

    // In production, you might use a service like MaxMind GeoIP
    // For now, return a placeholder
    return 'unknown'
  } catch (error) {
    console.warn('Error getting location from IP:', error)
    return 'unknown'
  }
}

export default factories.createCoreController(
  'api::user-behavior.user-behavior',
  ({ strapi }) => ({
  async track(ctx) {
    try {
      const { data } = ctx.request.body
      const { user } = ctx.state

      if (!data.behaviorType || !data.sessionId) {
        return ctx.badRequest('behaviorType and sessionId are required')
      }

      // Prepare behavior data with privacy compliance
      const behaviorData = {
        ...data,
        user: user?.id || null,
        timestamp: new Date(),
        ipAddress: ctx.request.ip,
        userAgent: ctx.request.headers['user-agent'],
        deviceInfo: extractDeviceInfo(ctx.request.headers['user-agent']),
        location: await getLocationFromIP(ctx.request.ip)
      }

      // Use Document Service API for creation
      const behavior = await strapi.documents('api::user-behavior.user-behavior').create({
        data: behaviorData
      })

      return behavior
    } catch (error) {
      strapi.log.error('Error tracking user behavior:', error)
      ctx.throw(500, 'Failed to track user behavior')
    }
  },

  async find(ctx) {
    try {
      const { query } = ctx
      const { user } = ctx.state

      // Build filters
      const filters: any = {}
      
      if (query.userId) {
        filters.user = query.userId
      }
      
      if (query.behaviorType) {
        filters.behaviorType = query.behaviorType
      }
      
      if (query.sessionId) {
        filters.sessionId = query.sessionId
      }
      
      if (query.startDate || query.endDate) {
        filters.timestamp = {}
        if (query.startDate) {
          filters.timestamp.$gte = new Date(String(query.startDate))
        }
        if (query.endDate) {
          filters.timestamp.$lte = new Date(String(query.endDate))
        }
      }

      // Apply pagination
      const pagination = {
        page: Math.max(1, parseInt(String(query.page)) || 1),
        pageSize: Math.min(Math.max(1, parseInt(String(query.pageSize)) || 25), 100)
      }

      // Use Document Service API
      const behaviors = await strapi.documents('api::user-behavior.user-behavior').findMany({
        filters,
        sort: { timestamp: 'desc' },
        pagination,
        populate: ['user']
      })

      return behaviors
    } catch (error) {
      strapi.log.error('Error finding user behaviors:', error)
      ctx.throw(500, 'Failed to retrieve user behaviors')
    }
  },

  async findOne(ctx) {
    try {
      const { documentId } = ctx.params

      if (!documentId) {
        return ctx.badRequest('Behavior documentId is required')
      }

      // Use Document Service API
      const behavior = await strapi.documents('api::user-behavior.user-behavior').findOne({
        documentId,
        populate: ['user']
      })

      if (!behavior) {
        return ctx.notFound('User behavior not found')
      }

      return behavior
    } catch (error) {
      strapi.log.error('Error finding user behavior:', error)
      ctx.throw(500, 'Failed to retrieve user behavior')
    }
  },

  async delete(ctx) {
    try {
      const { documentId } = ctx.params

      if (!documentId) {
        return ctx.badRequest('Behavior documentId is required')
      }

      // Use Document Service API
      await strapi.documents('api::user-behavior.user-behavior').delete({
        documentId
      })

      return { message: 'User behavior deleted successfully' }
    } catch (error) {
      strapi.log.error('Error deleting user behavior:', error)
      ctx.throw(500, 'Failed to delete user behavior')
    }
  },

  async getAnalytics(ctx) {
    try {
      const { query } = ctx
      const { user } = ctx.state

      // Get analytics data using the analytics service
      const analyticsService = strapi.service('api::user-behavior.analytics')
      
      const analytics = await analyticsService.getBehaviorAnalytics({
        userId: query.userId,
        behaviorType: query.behaviorType,
        startDate: query.startDate,
        endDate: query.endDate,
        groupBy: query.groupBy || 'day'
      })

      return analytics
    } catch (error) {
      strapi.log.error('Error getting behavior analytics:', error)
      ctx.throw(500, 'Failed to retrieve behavior analytics')
    }
      }
  }))
