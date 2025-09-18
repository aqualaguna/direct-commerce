'use strict'

import { Core, factories } from '@strapi/strapi'

export default factories.createCoreService(
  'api::engagement-metrics.engagement-calculator' as any,
  ({ strapi }: { strapi: Core.Strapi }) => ({
  async calculateMetric(params: any) {
    try {
      const { userId, metricType, periodStart, periodEnd } = params

      switch (metricType) {
        case 'daily_active':
          return await this.calculateDailyActive(userId, periodStart, periodEnd)
        case 'weekly_active':
          return await this.calculateWeeklyActive(userId, periodStart, periodEnd)
        case 'monthly_active':
          return await this.calculateMonthlyActive(userId, periodStart, periodEnd)
        case 'retention':
          return await this.calculateRetention(userId, periodStart, periodEnd)
        case 'engagement_score':
          return await this.calculateEngagementScore(userId, periodStart, periodEnd)
        case 'session_duration':
          return await this.calculateSessionDuration(userId, periodStart, periodEnd)
        case 'page_views':
          return await this.calculatePageViews(userId, periodStart, periodEnd)
        case 'bounce_rate':
          return await this.calculateBounceRate(userId, periodStart, periodEnd)
        case 'conversion_rate':
          return await this.calculateConversionRate(userId, periodStart, periodEnd)
        case 'time_on_site':
          return await this.calculateTimeOnSite(userId, periodStart, periodEnd)
        default:
          throw new Error(`Unknown metric type: ${metricType}`)
      }
    } catch (error) {
      strapi.log.error('Error calculating metric:', error)
      throw error
    }
  },

  async calculateDailyActive(userId: string, periodStart?: Date, periodEnd?: Date) {
    const startDate = periodStart || new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
    const endDate = periodEnd || new Date()

    // Get user activities for the period
    const activities = await strapi.documents('api::user-activity.user-activity').findMany({
      filters: {
        user: {documentId: userId},
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      }
    })

    // Count unique days with activity
    const uniqueDays = new Set(
      activities.map((activity: any) => 
        new Date(activity.timestamp).toISOString().split('T')[0]
      )
    ).size

    return {
      value: uniqueDays,
      periodStart: startDate,
      periodEnd: endDate,
      metadata: {
        totalActivities: activities.length,
        uniqueDays: uniqueDays,
        periodHours: (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
      }
    }
  },

  async calculateWeeklyActive(userId: string, periodStart?: Date, periodEnd?: Date) {
    const startDate = periodStart || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    const endDate = periodEnd || new Date()

    const activities = await strapi.documents('api::user-activity.user-activity').findMany({
      filters: {
        user: {documentId: userId},
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      }
    })

    // Count unique weeks with activity
    const uniqueWeeks = new Set(
      activities.map((activity: any) => {
        const date = new Date(activity.timestamp)
        const weekStart = new Date(date.setDate(date.getDate() - date.getDay()))
        return weekStart.toISOString().split('T')[0]
      })
    ).size

    return {
      value: uniqueWeeks,
      periodStart: startDate,
      periodEnd: endDate,
      metadata: {
        totalActivities: activities.length,
        uniqueWeeks: uniqueWeeks,
        periodDays: (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      }
    }
  },

  async calculateMonthlyActive(userId: string, periodStart?: Date, periodEnd?: Date) {
    const startDate = periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    const endDate = periodEnd || new Date()

    const activities = await strapi.documents('api::user-activity.user-activity').findMany({
      filters: {
        user: {documentId: userId},
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      }
    })

    // Count unique months with activity
    const uniqueMonths = new Set(
      activities.map((activity: any) => 
        new Date(activity.timestamp).toISOString().slice(0, 7) // YYYY-MM format
      )
    ).size

    return {
      value: uniqueMonths,
      periodStart: startDate,
      periodEnd: endDate,
      metadata: {
        totalActivities: activities.length,
        uniqueMonths: uniqueMonths,
        periodDays: (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      }
    }
  },

  async calculateRetention(userId: string, periodStart?: Date, periodEnd?: Date) {
    const startDate = periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    const endDate = periodEnd || new Date()

    // Get user's first activity
    const firstActivity = await strapi.documents('api::user-activity.user-activity').findFirst({
      filters: {
        user: {documentId: userId}
      },
      sort: { createdAt: 'asc' }
    })

    if (!firstActivity) {
      return {
        value: 0,
        periodStart: startDate,
        periodEnd: endDate,
        metadata: { reason: 'No activity found' }
      }
    }

    // Get recent activities
    const recentActivities = await strapi.documents('api::user-activity.user-activity').findMany({
      filters: {
        user: {documentId: userId},
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      }
    })

    // Calculate retention rate (recent activity / total possible days)
    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    const activeDays = new Set(
      recentActivities.map((activity: any) => 
        new Date(activity.timestamp).toISOString().split('T')[0]
      )
    ).size

    const retentionRate = totalDays > 0 ? (activeDays / totalDays) * 100 : 0

    return {
      value: retentionRate,
      periodStart: startDate,
      periodEnd: endDate,
      metadata: {
        totalDays: Math.round(totalDays),
        activeDays: activeDays,
        retentionRate: retentionRate,
        firstActivity: firstActivity.createdAt
      }
    }
  },

  async calculateEngagementScore(userId: string, periodStart?: Date, periodEnd?: Date) {
    const startDate = periodStart || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    const endDate = periodEnd || new Date()

    // Get user behaviors for the period
    const behaviors = await strapi.documents('api::user-behavior.user-behavior').findMany({
      filters: {
        user: {documentId: userId},
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      }
    })

    // Calculate engagement score based on various factors
    let score = 0
    const weights = {
      pageViews: 0.2,
      timeSpent: 0.3,
      interactions: 0.3,
      frequency: 0.2
    }

    // Page views score (0-100)
    const pageViews = behaviors.filter(b => b.behaviorType === 'page_view').length
    const pageViewsScore = Math.min(pageViews * 10, 100) // 10 points per page view, max 100

    // Time spent score (0-100)
    const totalTimeSpent = behaviors.reduce((sum, b) => sum + (b.timeSpent || 0), 0)
    const timeSpentScore = Math.min(totalTimeSpent / 60, 100) // 1 point per minute, max 100

    // Interactions score (0-100)
    const interactions = behaviors.filter(b => 
      ['product_view', 'search', 'cart_add', 'purchase'].includes(b.behaviorType)
    ).length
    const interactionsScore = Math.min(interactions * 20, 100) // 20 points per interaction, max 100

    // Frequency score (0-100)
    const uniqueDays = new Set(
      behaviors.map(b => new Date(b.timestamp).toISOString().split('T')[0])
    ).size
    const frequencyScore = Math.min(uniqueDays * 14, 100) // 14 points per day, max 100

    // Calculate weighted score
    score = (
      pageViewsScore * weights.pageViews +
      timeSpentScore * weights.timeSpent +
      interactionsScore * weights.interactions +
      frequencyScore * weights.frequency
    )

    return {
      value: Math.round(score),
      periodStart: startDate,
      periodEnd: endDate,
      metadata: {
        pageViews: pageViews,
        pageViewsScore: pageViewsScore,
        totalTimeSpent: totalTimeSpent,
        timeSpentScore: timeSpentScore,
        interactions: interactions,
        interactionsScore: interactionsScore,
        uniqueDays: uniqueDays,
        frequencyScore: frequencyScore,
        weights: weights
      }
    }
  },

  async calculateSessionDuration(userId: string, periodStart?: Date, periodEnd?: Date) {
    const startDate = periodStart || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    const endDate = periodEnd || new Date()

    const behaviors = await strapi.documents('api::user-behavior.user-behavior').findMany({
      filters: {
        user: {documentId: userId},
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      },
      sort: 'timestamp:asc'
    })

    // Group behaviors by session
    const sessions: any = {}
    behaviors.forEach(behavior => {
      if (!sessions[behavior.sessionId]) {
        sessions[behavior.sessionId] = []
      }
      sessions[behavior.sessionId].push(behavior)
    })

    // Calculate average session duration
    const sessionDurations: number[] = []
    Object.values(sessions).forEach((sessionBehaviors: any) => {
      if (sessionBehaviors.length > 1) {
        const firstActivity = sessionBehaviors[0]
        const lastActivity = sessionBehaviors[sessionBehaviors.length - 1]
        const duration = new Date(lastActivity.timestamp).getTime() - new Date(firstActivity.timestamp).getTime()
        sessionDurations.push(duration / 1000) // Convert to seconds
      }
    })

    const averageDuration = sessionDurations.length > 0 
      ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
      : 0

    return {
      value: averageDuration,
      periodStart: startDate,
      periodEnd: endDate,
      metadata: {
        totalSessions: Object.keys(sessions).length,
        sessionsWithDuration: sessionDurations.length,
        averageDuration: averageDuration,
        minDuration: sessionDurations.length > 0 ? Math.min(...sessionDurations) : 0,
        maxDuration: sessionDurations.length > 0 ? Math.max(...sessionDurations) : 0
      }
    }
  },

  async calculatePageViews(userId: string, periodStart?: Date, periodEnd?: Date) {
    const startDate = periodStart || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    const endDate = periodEnd || new Date()

    const pageViews = await strapi.documents('api::user-behavior.user-behavior').count({
      filters: {
        user: {documentId: userId},
        behaviorType: 'page_view',
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      }
    })

    return {
      value: pageViews,
      periodStart: startDate,
      periodEnd: endDate,
      metadata: {
        periodDays: (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        averagePerDay: pageViews / ((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      }
    }
  },

  async calculateBounceRate(userId: string, periodStart?: Date, periodEnd?: Date) {
    const startDate = periodStart || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    const endDate = periodEnd || new Date()

    const behaviors = await strapi.documents('api::user-behavior.user-behavior').findMany({
      filters: {
        user: {documentId: userId},
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      }
    })

    // Group by session
    const sessions: any = {}
    behaviors.forEach(behavior => {
      if (!sessions[behavior.sessionId]) {
        sessions[behavior.sessionId] = []
      }
      sessions[behavior.sessionId].push(behavior)
    })

    // Count single-page sessions (bounces)
    const bounces = Object.values(sessions).filter((sessionBehaviors: any) => 
      sessionBehaviors.length === 1 && sessionBehaviors[0].behaviorType === 'page_view'
    ).length

    const totalSessions = Object.keys(sessions).length
    const bounceRate = totalSessions > 0 ? (bounces / totalSessions) * 100 : 0

    return {
      value: bounceRate,
      periodStart: startDate,
      periodEnd: endDate,
      metadata: {
        totalSessions: totalSessions,
        bounces: bounces,
        bounceRate: bounceRate
      }
    }
  },

  async calculateConversionRate(userId: string, periodStart?: Date, periodEnd?: Date) {
    const startDate = periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    const endDate = periodEnd || new Date()

    const behaviors = await strapi.documents('api::user-behavior.user-behavior').findMany({
      filters: {
        user: {documentId: userId},
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      }
    })

    const totalSessions = new Set(behaviors.map(b => b.sessionId)).size
    const purchases = behaviors.filter(b => b.behaviorType === 'purchase').length

    const conversionRate = totalSessions > 0 ? (purchases / totalSessions) * 100 : 0

    return {
      value: conversionRate,
      periodStart: startDate,
      periodEnd: endDate,
      metadata: {
        totalSessions: totalSessions,
        purchases: purchases,
        conversionRate: conversionRate
      }
    }
  },

  async calculateTimeOnSite(userId: string, periodStart?: Date, periodEnd?: Date) {
    const startDate = periodStart || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    const endDate = periodEnd || new Date()

    const behaviors = await strapi.documents('api::user-behavior.user-behavior').findMany({
      filters: {
        user: {documentId: userId},
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      }
    })

    const totalTimeSpent = behaviors.reduce((sum, b) => sum + (b.timeSpent || 0), 0)
    const totalSessions = new Set(behaviors.map(b => b.sessionId)).size

    const averageTimeOnSite = totalSessions > 0 ? totalTimeSpent / totalSessions : 0

    return {
      value: averageTimeOnSite,
      periodStart: startDate,
      periodEnd: endDate,
      metadata: {
        totalTimeSpent: totalTimeSpent,
        totalSessions: totalSessions,
        averageTimeOnSite: averageTimeOnSite
      }
    }
  },

  async calculateAllMetrics(params: any) {
    try {
      const { userId, periodStart, periodEnd } = params
      const metricTypes = [
        'daily_active',
        'weekly_active',
        'monthly_active',
        'retention',
        'engagement_score',
        'session_duration',
        'page_views',
        'bounce_rate',
        'conversion_rate',
        'time_on_site'
      ]

      const results = []
      for (const metricType of metricTypes) {
        try {
          const result = await this.calculateMetric({
            userId,
            metricType,
            periodStart,
            periodEnd
          })
          results.push({ metricType, ...result })
        } catch (error) {
          strapi.log.error(`Error calculating ${metricType}:`, error)
          results.push({ metricType, error: error.message })
        }
      }

      return results
    } catch (error) {
      strapi.log.error('Error calculating all metrics:', error)
      throw error
    }
  }
}))
