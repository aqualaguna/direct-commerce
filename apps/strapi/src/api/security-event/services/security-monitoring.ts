'use strict'

import { Core } from '@strapi/strapi'

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getSecurityAnalytics(params: any) {
    try {
      const { startDate, endDate, severity, eventType } = params

      // Build base filters
      const filters: any = {}
      
      if (severity) {
        filters.severity = severity
      }
      
      if (eventType) {
        filters.eventType = eventType
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

      // Get raw security event data
      const events = await strapi.documents('api::security-event.security-event').findMany({
        filters,
        sort: 'createdAt:desc',
        populate: ['user', 'resolvedBy']
      })

      // Calculate security metrics
      const metrics = this.calculateSecurityMetrics(events)

      // Detect security threats
      const threats = await this.detectSecurityThreats(events)

      return {
        data: events,
        metrics,
        threats,
        summary: {
          totalEvents: events.length,
          resolvedEvents: events.filter(e => e.resolved).length,
          criticalEvents: events.filter(e => e.severity === 'critical').length,
          highSeverityEvents: events.filter(e => e.severity === 'high').length
        }
      }
    } catch (error) {
      strapi.log.error('Error getting security analytics:', error)
      throw error
    }
  },

  calculateSecurityMetrics(events: any[]) {
    const metrics: any = {
      eventTypeDistribution: {},
      severityDistribution: {},
      resolutionTime: {
        average: 0,
        median: 0,
        min: 0,
        max: 0
      },
      topIPAddresses: {},
      topUserAgents: {},
      locationDistribution: {},
      hourlyDistribution: {}
    }

    const resolutionTimes: number[] = []

    events.forEach(event => {
      // Event type distribution
      if (!metrics.eventTypeDistribution[event.eventType]) {
        metrics.eventTypeDistribution[event.eventType] = 0
      }
      metrics.eventTypeDistribution[event.eventType]++

      // Severity distribution
      if (!metrics.severityDistribution[event.severity]) {
        metrics.severityDistribution[event.severity] = 0
      }
      metrics.severityDistribution[event.severity]++

      // Resolution time calculation
      if (event.resolved && event.resolvedAt) {
        const resolutionTime = new Date(event.resolvedAt).getTime() - new Date(event.timestamp).getTime()
        resolutionTimes.push(resolutionTime)
      }

      // Top IP addresses
      if (event.ipAddress) {
        if (!metrics.topIPAddresses[event.ipAddress]) {
          metrics.topIPAddresses[event.ipAddress] = 0
        }
        metrics.topIPAddresses[event.ipAddress]++
      }

      // Top user agents
      if (event.userAgent) {
        const userAgent = event.userAgent.substring(0, 100) // Truncate for privacy
        if (!metrics.topUserAgents[userAgent]) {
          metrics.topUserAgents[userAgent] = 0
        }
        metrics.topUserAgents[userAgent]++
      }

      // Location distribution
      if (event.location) {
        if (!metrics.locationDistribution[event.location]) {
          metrics.locationDistribution[event.location] = 0
        }
        metrics.locationDistribution[event.location]++
      }

      // Hourly distribution
      const hour = new Date(event.timestamp).getHours()
      if (!metrics.hourlyDistribution[hour]) {
        metrics.hourlyDistribution[hour] = 0
      }
      metrics.hourlyDistribution[hour]++
    })

    // Calculate resolution time statistics
    if (resolutionTimes.length > 0) {
      metrics.resolutionTime = this.calculateStats(resolutionTimes)
    }

    // Sort top items
    metrics.topIPAddresses = this.sortTopItems(metrics.topIPAddresses, 10)
    metrics.topUserAgents = this.sortTopItems(metrics.topUserAgents, 10)

    return metrics
  },

  async detectSecurityThreats(events: any[]) {
    const threats: any[] = []

    // Detect brute force attempts
    const bruteForceThreats = this.detectBruteForceAttempts(events)
    threats.push(...bruteForceThreats)

    // Detect unusual activity patterns
    const unusualActivityThreats = this.detectUnusualActivity(events)
    threats.push(...unusualActivityThreats)

    // Detect geographic anomalies
    const geographicThreats = await this.detectGeographicAnomalies(events)
    threats.push(...geographicThreats)

    // Detect time-based anomalies
    const timeBasedThreats = this.detectTimeBasedAnomalies(events)
    threats.push(...timeBasedThreats)

    return threats
  },

  detectBruteForceAttempts(events: any[]) {
    const threats: any[] = []
    const ipAttempts: any = {}

    // Group failed login attempts by IP
    events
      .filter(e => e.eventType === 'failed_login')
      .forEach(event => {
        if (!ipAttempts[event.ipAddress]) {
          ipAttempts[event.ipAddress] = []
        }
        ipAttempts[event.ipAddress].push(event)
      })

    // Check for brute force patterns
    Object.entries(ipAttempts).forEach(([ip, attempts]: [string, any]) => {
      if (attempts.length >= 5) {
        const timeSpan = new Date(attempts[0].timestamp).getTime() - 
                        new Date(attempts[attempts.length - 1].timestamp).getTime()
        
        // If 5+ attempts within 1 hour, consider it brute force
        if (timeSpan <= 3600000) { // 1 hour in milliseconds
          threats.push({
            type: 'brute_force_attempt',
            severity: 'high',
            ipAddress: ip,
            attemptCount: attempts.length,
            timeSpan: timeSpan,
            description: `Detected ${attempts.length} failed login attempts from IP ${ip} within ${Math.round(timeSpan / 60000)} minutes`,
            affectedUsers: [...new Set(attempts.map((a: any) => a.user?.id).filter(Boolean))],
            timestamp: new Date()
          })
        }
      }
    })

    return threats
  },

  detectUnusualActivity(events: any[]) {
    const threats: any[] = []
    const userActivity: any = {}

    // Group events by user
    events.forEach(event => {
      if (event.user?.id) {
        if (!userActivity[event.user.id]) {
          userActivity[event.user.id] = []
        }
        userActivity[event.user.id].push(event)
      }
    })

    // Check for unusual patterns
    Object.entries(userActivity).forEach(([userId, userEvents]: [string, any]) => {
      // Check for rapid successive actions
      const sortedEvents = userEvents.sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      for (let i = 0; i < sortedEvents.length - 1; i++) {
        const timeDiff = new Date(sortedEvents[i].timestamp).getTime() - 
                        new Date(sortedEvents[i + 1].timestamp).getTime()
        
        // If actions are less than 1 second apart, flag as suspicious
        if (timeDiff < 1000) {
          threats.push({
            type: 'rapid_activity',
            severity: 'medium',
            userId: userId,
            description: `User ${userId} performed actions too rapidly (${timeDiff}ms apart)`,
            events: [sortedEvents[i], sortedEvents[i + 1]],
            timestamp: new Date()
          })
        }
      }
    })

    return threats
  },

  async detectGeographicAnomalies(events: any[]) {
    const threats: any[] = []
    const userLocations: any = {}

    // Group events by user and location
    events.forEach(event => {
      if (event.user?.id && event.location) {
        if (!userLocations[event.user.id]) {
          userLocations[event.user.id] = []
        }
        userLocations[event.user.id].push({
          location: event.location,
          timestamp: event.timestamp
        })
      }
    })

    // Check for location changes that are too rapid
    Object.entries(userLocations).forEach(([userId, locations]: [string, any]) => {
      if (locations.length > 1) {
        const sortedLocations = locations.sort((a: any, b: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )

        for (let i = 0; i < sortedLocations.length - 1; i++) {
          const timeDiff = new Date(sortedLocations[i].timestamp).getTime() - 
                          new Date(sortedLocations[i + 1].timestamp).getTime()
          
          // If location changed within 1 hour, flag as suspicious
          if (timeDiff <= 3600000 && 
              sortedLocations[i].location !== sortedLocations[i + 1].location) {
            threats.push({
              type: 'geographic_anomaly',
              severity: 'medium',
              userId: userId,
              description: `User ${userId} changed location from ${sortedLocations[i + 1].location} to ${sortedLocations[i].location} within ${Math.round(timeDiff / 60000)} minutes`,
              locations: [sortedLocations[i + 1], sortedLocations[i]],
              timestamp: new Date()
            })
          }
        }
      }
    })

    return threats
  },

  detectTimeBasedAnomalies(events: any[]) {
    const threats: any[] = []
    const hourlyActivity: any = {}

    // Group events by hour
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours()
      if (!hourlyActivity[hour]) {
        hourlyActivity[hour] = 0
      }
      hourlyActivity[hour]++
    })

    // Check for unusual activity during off-hours (e.g., 2-6 AM)
    const offHours = [2, 3, 4, 5, 6]
    offHours.forEach(hour => {
      if (hourlyActivity[hour] && hourlyActivity[hour] > 5) {
        threats.push({
          type: 'off_hours_activity',
          severity: 'medium',
          description: `Unusual activity detected during off-hours (${hour}:00) - ${hourlyActivity[hour]} events`,
          hour: hour,
          eventCount: hourlyActivity[hour],
          timestamp: new Date()
        })
      }
    })

    return threats
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

  async getSecurityDashboard() {
    try {
      // Get recent events
      const recentEvents = await strapi.documents('api::security-event.security-event').findMany({
        filters: {},
        sort: 'createdAt:desc',
        limit: 10,
        start: 0,
        populate: ['user']
      })

      // Get unresolved critical events
      const criticalEvents = await strapi.documents('api::security-event.security-event').findMany({
        filters: {
          severity: 'critical',
          resolved: false
        },
        sort: 'createdAt:desc',
        populate: ['user']
      })

      // Get today's events
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const todayEvents = await strapi.documents('api::security-event.security-event').findMany({
        filters: {
          timestamp: {
            $gte: today
          }
        },
        populate: ['user']
      })

      return {
        recentEvents,
        criticalEvents,
        todayEvents,
        summary: {
          totalToday: todayEvents.length,
          criticalUnresolved: criticalEvents.length,
          recentCount: recentEvents.length
        }
      }
    } catch (error) {
      strapi.log.error('Error getting security dashboard:', error)
      throw error
    }
  }
})
