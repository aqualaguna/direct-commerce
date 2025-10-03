'use strict'

import { factories } from '@strapi/strapi'

// Helper functions
const extractDeviceInfo = (userAgent: string) => {
  if (!userAgent) return null

  // Basic device detection
  const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent)
  const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/.test(userAgent)

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
        data: behaviorData,
        populate: ['user']
      })

      // Return in Strapi format
      ctx.body = {
        data: behavior
      }
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
      const paginationQuery = query.pagination as any || { page: '1', pageSize: '25' };
      // Apply pagination
      const pagination = {
        page: Math.max(1, parseInt(String(paginationQuery.page)) || 1),
        pageSize: Math.min(Math.max(1, parseInt(String(paginationQuery.pageSize)) || 25), 100)
      }

      // Use Document Service API
      const behaviors = await strapi.documents('api::user-behavior.user-behavior').findMany({
        filters,
        sort: 'createdAt:desc',
        limit: pagination.pageSize,
        start: (pagination.page - 1) * pagination.pageSize,
        populate: ['user']
      })

      // Return in Strapi format
      ctx.body = {
        data: behaviors,
        meta: {
          pagination: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(behaviors.length / pagination.pageSize),
            total: behaviors.length
          }
        }
      }
    } catch (error) {
      strapi.log.error('Error finding user behaviors:', error)
      ctx.throw(500, 'Failed to retrieve user behaviors')
    }
  },

  async findOne(ctx) {
    try {
      const documentId = ctx.params.documentId || ctx.params.id;

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

      // Return in Strapi format
      ctx.body = {
        data: behavior
      }
    } catch (error) {
      strapi.log.error('Error finding user behavior:', error)
      ctx.throw(500, 'Failed to retrieve user behavior')
    }
  },

  async delete(ctx) {
    try {
      const documentId = ctx.params.documentId || ctx.params.id;

      if (!documentId) {
        return ctx.badRequest('Behavior documentId is required')
      }
      // check if behavior exists
      const behavior = await strapi.documents('api::user-behavior.user-behavior').findOne({
        documentId
      })
      if (!behavior) {
        return ctx.notFound('User behavior not found')
      }
      // Use Document Service API
      const result = await strapi.documents('api::user-behavior.user-behavior').delete({
        documentId
      })

      // Return in Strapi format
      ctx.body = {
        message: 'User behavior deleted successfully',
        data: result
      }
    } catch (error) {
      strapi.log.error('Error deleting user behavior:', error)
      ctx.throw(500, 'Failed to delete user behavior')
    }
  },

  async getAnalytics(ctx) {
    try {
      const { query } = ctx
      const { user } = ctx.state

      // Build filters for analytics
      const filters: any = {}
      
      if (query.userId) {
        filters.user = { documentId: query.userId }
      }
      
      if (query.behaviorType) {
        filters.behaviorType = query.behaviorType
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

      // Get raw behavior data
      const behaviors = await strapi.documents('api::user-behavior.user-behavior').findMany({
        filters,
        sort: 'createdAt:asc',
        populate: ['user']
      })

      // Ensure behaviors is an array
      const safeBehaviors = Array.isArray(behaviors) ? behaviors : []

      // Calculate basic analytics directly in the controller
      const metrics = {
        behaviorTypeDistribution: {},
        deviceTypeDistribution: {},
        timeSpentStats: { average: 0, median: 0, min: 0, max: 0 },
        scrollDepthStats: { average: 0, median: 0, min: 0, max: 0 },
        topPages: {},
        topProducts: {},
        topSearchQueries: {}
      }

      const timeSpentValues: number[] = []
      const scrollDepthValues: number[] = []

      // Process behaviors to calculate metrics
      safeBehaviors.forEach(behavior => {
        if (!behavior) return

        try {
          // Behavior type distribution
          const behaviorType = behavior.behaviorType || 'unknown'
          if (!metrics.behaviorTypeDistribution[behaviorType]) {
            metrics.behaviorTypeDistribution[behaviorType] = 0
          }
          metrics.behaviorTypeDistribution[behaviorType]++
          // Device type distribution
          const deviceType = typeof behavior.deviceInfo === 'object' && behavior.deviceInfo !== null && 'type' in behavior.deviceInfo 
            ? String(behavior.deviceInfo.type)
            : 'unknown'
          if (!metrics.deviceTypeDistribution[deviceType]) {
            metrics.deviceTypeDistribution[deviceType] = 0
          }
          metrics.deviceTypeDistribution[deviceType]++

          // Time spent statistics
          if (behavior.timeSpent && typeof behavior.timeSpent === 'number' && behavior.timeSpent > 0) {
            timeSpentValues.push(behavior.timeSpent)
          }

          // Scroll depth statistics
          if (behavior.scrollDepth && typeof behavior.scrollDepth === 'number' && behavior.scrollDepth >= 0) {
            scrollDepthValues.push(behavior.scrollDepth)
          }

          // Top pages
          if (behavior.pageUrl && typeof behavior.pageUrl === 'string') {
            if (!metrics.topPages[behavior.pageUrl]) {
              metrics.topPages[behavior.pageUrl] = 0
            }
            metrics.topPages[behavior.pageUrl]++
          }

          // Top products
          if (behavior.productId && typeof behavior.productId === 'string') {
            if (!metrics.topProducts[behavior.productId]) {
              metrics.topProducts[behavior.productId] = 0
            }
            metrics.topProducts[behavior.productId]++
          }

          // Top search queries
          if (behavior.searchQuery && typeof behavior.searchQuery === 'string') {
            if (!metrics.topSearchQueries[behavior.searchQuery]) {
              metrics.topSearchQueries[behavior.searchQuery] = 0
            }
            metrics.topSearchQueries[behavior.searchQuery]++
          }
        } catch (error) {
          console.warn('Error processing behavior for metrics:', error)
        }
      })

      // Calculate statistics
      if (timeSpentValues.length > 0) {
        const sorted = timeSpentValues.sort((a, b) => a - b)
        const sum = timeSpentValues.reduce((acc, val) => acc + val, 0)
        metrics.timeSpentStats = {
          average: sum / timeSpentValues.length,
          median: sorted[Math.floor(timeSpentValues.length / 2)],
          min: sorted[0],
          max: sorted[sorted.length - 1]
        }
      }

      if (scrollDepthValues.length > 0) {
        const sorted = scrollDepthValues.sort((a, b) => a - b)
        const sum = scrollDepthValues.reduce((acc, val) => acc + val, 0)
        metrics.scrollDepthStats = {
          average: sum / scrollDepthValues.length,
          median: sorted[Math.floor(scrollDepthValues.length / 2)],
          min: sorted[0],
          max: sorted[sorted.length - 1]
        }
      }

      // Sort top items
      metrics.topPages = Object.entries(metrics.topPages)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .reduce((acc, [key, value]) => {
          acc[key] = value
          return acc
        }, {} as any)

      metrics.topProducts = Object.entries(metrics.topProducts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .reduce((acc, [key, value]) => {
          acc[key] = value
          return acc
        }, {} as any)

      metrics.topSearchQueries = Object.entries(metrics.topSearchQueries)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .reduce((acc, [key, value]) => {
          acc[key] = value
          return acc
        }, {} as any)

      // Create aggregated data based on groupBy
      const groupBy = query.groupBy || 'day'
      const aggregated: any = {}

      safeBehaviors.forEach(behavior => {
        if (!behavior) return

        let key: string
        try {
          switch (groupBy) {
            case 'hour':
              key = new Date(behavior.timestamp).toISOString().slice(0, 13) + ':00:00.000Z'
              break
            case 'day':
              key = new Date(behavior.timestamp).toISOString().slice(0, 10)
              break
            case 'week':
              const date = new Date(behavior.timestamp)
              const weekStart = new Date(date.setDate(date.getDate() - date.getDay()))
              key = weekStart.toISOString().slice(0, 10)
              break
            case 'month':
              key = new Date(behavior.timestamp).toISOString().slice(0, 7)
              break
            case 'behaviorType':
              key = behavior.behaviorType || 'unknown'
              break
            default:
              key = new Date(behavior.timestamp).toISOString().slice(0, 10)
          }
        } catch (error) {
          console.warn('Error processing behavior timestamp:', error)
          key = 'unknown'
        }

        if (!aggregated[key]) {
          aggregated[key] = {
            period: key,
            count: 0,
            behaviors: {},
            uniqueUsers: new Set()
          }
        }

        aggregated[key].count++
        if (behavior.user?.id) {
          aggregated[key].uniqueUsers.add(behavior.user.id)
        }

        const behaviorType = behavior.behaviorType || 'unknown'
        if (!aggregated[key].behaviors[behaviorType]) {
          aggregated[key].behaviors[behaviorType] = 0
        }
        aggregated[key].behaviors[behaviorType]++
      })

      const aggregatedData = Object.values(aggregated)
        .map((item: any) => ({
          ...item,
          uniqueUsers: item.uniqueUsers.size
        }))
        .sort((a: any, b: any) => a.period.localeCompare(b.period))

      // Return analytics data
      ctx.body = {
        data: aggregatedData,
        metrics,
        summary: {
          totalBehaviors: safeBehaviors.length,
          uniqueUsers: new Set(safeBehaviors.map(b => b?.user?.id).filter(Boolean)).size,
          dateRange: {
            start: query.startDate || (safeBehaviors[0]?.timestamp || null),
            end: query.endDate || (safeBehaviors[safeBehaviors.length - 1]?.timestamp || null)
          }
        }
      }
    } catch (error) {
      strapi.log.error('Error getting behavior analytics:', error)
      strapi.log.error('Error details:', error.message, error.stack)
      ctx.throw(500, 'Failed to retrieve behavior analytics')
    }
  }
  }))
