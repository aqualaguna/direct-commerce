'use strict'


export default ({ strapi }: { strapi: any }) => ({
  async getBehaviorAnalytics(params: any) {
    try {
      const { userId, behaviorType, startDate, endDate, groupBy = 'day' } = params

      // Build base filters
      const filters: any = {}
      
      if (userId) {
        filters.user = userId
      }
      
      if (behaviorType) {
        filters.behaviorType = behaviorType
      }
      
      if (startDate || endDate) {
        filters.timestamp = {}
        if (startDate) {
          filters.timestamp.$gte = new Date(startDate)
        }
        if (endDate) {
          filters.timestamp.$lte = new Date(endDate)
        }
      }

      // Get raw behavior data
      const behaviors = await strapi.documents('api::user-behavior.user-behavior').findMany({
        filters,
        sort: { timestamp: 'asc' },
        populate: ['user']
      })

      // Aggregate data based on groupBy parameter
      const aggregatedData = this.aggregateBehaviorData(behaviors, groupBy)

      // Calculate additional metrics
      const metrics = this.calculateBehaviorMetrics(behaviors)

      return {
        data: aggregatedData,
        metrics,
        summary: {
          totalBehaviors: behaviors.length,
          uniqueUsers: new Set(behaviors.map(b => b.user?.id).filter(Boolean)).size,
          dateRange: {
            start: startDate || behaviors[0]?.timestamp,
            end: endDate || behaviors[behaviors.length - 1]?.timestamp
          }
        }
      }
    } catch (error) {
      strapi.log.error('Error getting behavior analytics:', error)
      throw error
    }
  },

  aggregateBehaviorData(behaviors: any[], groupBy: string) {
    const aggregated: any = {}

    behaviors.forEach(behavior => {
      let key: string

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
          key = behavior.behaviorType
          break
        default:
          key = new Date(behavior.timestamp).toISOString().slice(0, 10)
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
      aggregated[key].uniqueUsers.add(behavior.user?.id)

      // Count by behavior type
      if (!aggregated[key].behaviors[behavior.behaviorType]) {
        aggregated[key].behaviors[behavior.behaviorType] = 0
      }
      aggregated[key].behaviors[behavior.behaviorType]++
    })

    // Convert Sets to counts and sort by period
    return Object.values(aggregated)
      .map((item: any) => ({
        ...item,
        uniqueUsers: item.uniqueUsers.size
      }))
      .sort((a: any, b: any) => a.period.localeCompare(b.period))
  },

  calculateBehaviorMetrics(behaviors: any[]) {
    const metrics: any = {
      behaviorTypeDistribution: {},
      deviceTypeDistribution: {},
      timeSpentStats: {
        average: 0,
        median: 0,
        min: 0,
        max: 0
      },
      scrollDepthStats: {
        average: 0,
        median: 0,
        min: 0,
        max: 0
      },
      topPages: {},
      topProducts: {},
      topSearchQueries: {}
    }

    const timeSpentValues: number[] = []
    const scrollDepthValues: number[] = []

    behaviors.forEach(behavior => {
      // Behavior type distribution
      if (!metrics.behaviorTypeDistribution[behavior.behaviorType]) {
        metrics.behaviorTypeDistribution[behavior.behaviorType] = 0
      }
      metrics.behaviorTypeDistribution[behavior.behaviorType]++

      // Device type distribution
      const deviceType = behavior.deviceInfo?.type || 'unknown'
      if (!metrics.deviceTypeDistribution[deviceType]) {
        metrics.deviceTypeDistribution[deviceType] = 0
      }
      metrics.deviceTypeDistribution[deviceType]++

      // Time spent statistics
      if (behavior.timeSpent && behavior.timeSpent > 0) {
        timeSpentValues.push(behavior.timeSpent)
      }

      // Scroll depth statistics
      if (behavior.scrollDepth && behavior.scrollDepth >= 0) {
        scrollDepthValues.push(behavior.scrollDepth)
      }

      // Top pages
      if (behavior.pageUrl) {
        if (!metrics.topPages[behavior.pageUrl]) {
          metrics.topPages[behavior.pageUrl] = 0
        }
        metrics.topPages[behavior.pageUrl]++
      }

      // Top products
      if (behavior.productId) {
        if (!metrics.topProducts[behavior.productId]) {
          metrics.topProducts[behavior.productId] = 0
        }
        metrics.topProducts[behavior.productId]++
      }

      // Top search queries
      if (behavior.searchQuery) {
        if (!metrics.topSearchQueries[behavior.searchQuery]) {
          metrics.topSearchQueries[behavior.searchQuery] = 0
        }
        metrics.topSearchQueries[behavior.searchQuery]++
      }
    })

    // Calculate statistics
    if (timeSpentValues.length > 0) {
      metrics.timeSpentStats = this.calculateStats(timeSpentValues)
    }

    if (scrollDepthValues.length > 0) {
      metrics.scrollDepthStats = this.calculateStats(scrollDepthValues)
    }

    // Sort top items
    metrics.topPages = this.sortTopItems(metrics.topPages, 10)
    metrics.topProducts = this.sortTopItems(metrics.topProducts, 10)
    metrics.topSearchQueries = this.sortTopItems(metrics.topSearchQueries, 10)

    return metrics
  },

  calculateStats(values: number[]) {
    const sorted = values.sort((a, b) => a - b)
    const sum = values.reduce((acc, val) => acc + val, 0)
    const count = values.length

    return {
      average: sum / count,
      median: sorted[Math.floor(count / 2)],
      min: sorted[0],
      max: sorted[sorted.length - 1]
    }
  },

  sortTopItems(items: any, limit: number) {
    return Object.entries(items)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, limit)
      .reduce((acc, [key, value]) => {
        acc[key] = value
        return acc
      }, {} as any)
  },

  async getUserBehaviorPatterns(userId: string) {
    try {
      const behaviors = await strapi.documents('api::user-behavior.user-behavior').findMany({
        filters: { user: userId },
        sort: { timestamp: 'desc' },
        pagination: { page: 1, pageSize: 100 }
      })

      const patterns = {
        favoritePages: this.getTopItems(behaviors, 'pageUrl', 5),
        favoriteProducts: this.getTopItems(behaviors, 'productId', 5),
        commonSearches: this.getTopItems(behaviors, 'searchQuery', 5),
        preferredDevice: this.getPreferredDevice(behaviors),
        averageTimeSpent: this.calculateAverageTimeSpent(behaviors),
        activityHours: this.getActivityHours(behaviors)
      }

      return patterns
    } catch (error) {
      strapi.log.error('Error getting user behavior patterns:', error)
      throw error
    }
  },

  getTopItems(behaviors: any[], field: string, limit: number) {
    const items: any = {}
    
    behaviors.forEach(behavior => {
      const value = behavior[field]
      if (value) {
        items[value] = (items[value] || 0) + 1
      }
    })

    return Object.entries(items)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, limit)
      .map(([key, value]) => ({ item: key, count: value }))
  },

  getPreferredDevice(behaviors: any[]) {
    const devices: any = {}
    
    behaviors.forEach(behavior => {
      const deviceType = behavior.deviceInfo?.type || 'unknown'
      devices[deviceType] = (devices[deviceType] || 0) + 1
    })

    return Object.entries(devices)
      .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || 'unknown'
  },

  calculateAverageTimeSpent(behaviors: any[]) {
    const timeSpentValues = behaviors
      .map(b => b.timeSpent)
      .filter(t => t && t > 0)

    if (timeSpentValues.length === 0) return 0

    const sum = timeSpentValues.reduce((acc, val) => acc + val, 0)
    return sum / timeSpentValues.length
  },

  getActivityHours(behaviors: any[]) {
    const hours: any = {}
    
    behaviors.forEach(behavior => {
      const hour = new Date(behavior.timestamp).getHours()
      hours[hour] = (hours[hour] || 0) + 1
    })

    return hours
  }
})
