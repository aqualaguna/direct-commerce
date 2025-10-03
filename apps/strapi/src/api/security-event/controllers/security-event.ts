'use strict'

import { factories } from '@strapi/strapi'

// Helper functions
const calculateSeverity = (eventType: string, attemptCount?: number): 'low' | 'medium' | 'high' | 'critical' => {
  switch (eventType) {
    case 'failed_login':
      return attemptCount && attemptCount > 10 ? 'high' : 'medium'
    case 'brute_force_attempt':
      return 'critical'
    case 'account_lockout':
      return 'high'
    case 'suspicious_activity':
      return 'medium'
    case 'admin_action':
      return 'low'
    case 'password_change':
      return 'low'
    default:
      return 'low'
  }
}

// Validation functions
const isValidEventType = (eventType: string): boolean => {
  const validEventTypes = [
    'failed_login',
    'suspicious_activity',
    'password_change',
    'account_lockout',
    'admin_action',
    'data_access',
    'permission_change',
    'api_abuse',
    'brute_force_attempt',
    'unusual_location',
    'multiple_sessions',
    'account_deletion'
  ]
  return validEventTypes.includes(eventType)
}

const isValidSeverity = (severity: string): boolean => {
  const validSeverities = ['low', 'medium', 'high', 'critical']
  return validSeverities.includes(severity)
}

const isValidIPAddress = (ip: string): boolean => {
  // More comprehensive IP validation - IPv4 and IPv6
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  // IPv6 regex that handles compressed notation like 2001:db8::1
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/
  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

const isValidAttemptCount = (count: number): boolean => {
  return count >= 0
}

const triggerSecurityAlert = async (event: any) => {
  try {
    // In production, this would trigger notifications to security team
    console.warn('SECURITY ALERT:', {
      eventType: event.eventType,
      severity: event.severity,
      ipAddress: event.ipAddress,
      userId: event.user,
      timestamp: event.timestamp
    })

    // Could also send email/SMS alerts here
    // await strapi.service('notification').sendSecurityAlert(event)
  } catch (error) {
    console.error('Error triggering security alert:', error)
  }
}

export default factories.createCoreController(
  'api::security-event.security-event',
  ({ strapi }) => ({
    async create(ctx) {
      try {
        const { data } = ctx.request.body

        // Validate required fields
        if (!data.eventType || !data.ipAddress) {
          return ctx.badRequest('eventType and ipAddress are required')
        }

        // Validate event type
        if (!isValidEventType(data.eventType)) {
          return ctx.badRequest('Invalid event type')
        }

        // Validate severity if provided
        if (data.severity && !isValidSeverity(data.severity)) {
          return ctx.badRequest('Invalid severity level')
        }

        // Validate IP address format
        if (!isValidIPAddress(data.ipAddress)) {
          return ctx.badRequest('Invalid IP address format')
        }

        // Validate attempt count if provided
        if (data.attemptCount !== undefined && !isValidAttemptCount(data.attemptCount)) {
          return ctx.badRequest('Invalid attempt count - must be non-negative')
        }

        // Validate user ID if provided (only for non-test environments)
        if (data.user) {
          try {
            // Try to find user by ID (numeric) or documentId (string)
            let user = null
            if (typeof data.user === 'number') {
              user = await strapi.documents('plugin::users-permissions.user').findOne({
                documentId: data.user.toString()
              })
            } else {
              user = await strapi.documents('plugin::users-permissions.user').findOne({
                documentId: data.user
              })
            }
            if (!user) {
              return ctx.badRequest('Invalid user ID')
            }
          } catch (error) {
            return ctx.badRequest('Invalid user ID')
          }
        }

        // Use provided severity or calculate based on event type
        const severity = data.severity || calculateSeverity(data.eventType, data.attemptCount)

        // Create security event
        const securityEvent = await strapi.documents('api::security-event.security-event').create({
          data: {
            user: data.user || null,
            eventType: data.eventType,
            eventData: data.eventData || null,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent || '',
            location: data.location || 'unknown',
            attemptCount: data.attemptCount || 1,
            reason: data.reason || '',
            severity: severity,
            timestamp: data.timestamp || new Date(),
            metadata: data.metadata || null
          },
          populate: ['user']
        })

        // Trigger security alert for high/critical events
        if (severity === 'high' || severity === 'critical') {
          await triggerSecurityAlert(securityEvent)
        }

        return {data: securityEvent}
      } catch (error) {
        strapi.log.error('Error creating security event:', error)
        ctx.throw(500, 'Failed to create security event')
      }
    },

    async find(ctx) {
      try {
        const { query } = ctx

        // Build filters
        const filters: any = {}
        
        if (query.severity) {
          filters.severity = query.severity
        }
        
        if (query.eventType) {
          filters.eventType = query.eventType
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
        const events = await strapi.documents('api::security-event.security-event').findMany({
          filters,
          sort: 'createdAt:desc',
          limit: pagination.pageSize,
          start: (pagination.page - 1) * pagination.pageSize,
          populate: ['user']
        })

        // Get total count for pagination
        const totalCount = await strapi.documents('api::security-event.security-event').count({ filters })

        return {
          data: events,
          meta: {
            pagination: {
              page: pagination.page,
              pageSize: pagination.pageSize,
              pageCount: Math.ceil(totalCount / pagination.pageSize),
              total: totalCount
            }
          }
        }
      } catch (error) {
        strapi.log.error('Error finding security events:', error)
        ctx.throw(500, 'Failed to retrieve security events')
      }
    },

    async findOne(ctx) {
      try {
        const documentId = ctx.params.documentId || ctx.params.id;

        if (!documentId) {
          return ctx.badRequest('Security event documentId is required')
        }

        // Use Document Service API
        const event = await strapi.documents('api::security-event.security-event').findOne({
          documentId,
          populate: ['user']
        })

        if (!event) {
          return ctx.notFound('Security event not found')
        }

        return event
      } catch (error) {
        strapi.log.error('Error finding security event:', error)
        ctx.throw(500, 'Failed to retrieve security event')
      }
    },

    async update(ctx) {
      try {
        const documentId = ctx.params.documentId || ctx.params.id;
        const { data } = ctx.request.body
        const { user } = ctx.state

        if (!documentId) {
          return ctx.badRequest('Security event documentId is required')
        }


        // Use Document Service API for updates
        const event = await strapi.documents('api::security-event.security-event').update({
          documentId,
          data,
          populate: ['user']
        })

        return {data:event}
      } catch (error) {
        strapi.log.error('Error updating security event:', error)
        ctx.throw(500, 'Failed to update security event')
      }
    },

    async delete(ctx) {
      try {
        const documentId = ctx.params.documentId || ctx.params.id;

        if (!documentId) {
          return ctx.badRequest('Security event documentId is required')
        }

        // Check if security event exists first
        const existingEvent = await strapi.documents('api::security-event.security-event').findOne({
          documentId
        })

        if (!existingEvent) {
          return ctx.notFound('Security event not found')
        }

        // Use Document Service API
        const result = await strapi.documents('api::security-event.security-event').delete({
          documentId
        })

        return { data: result, message: 'Security event deleted successfully' }
      } catch (error) {
        strapi.log.error('Error deleting security event:', error)
        ctx.throw(500, 'Failed to delete security event')
      }
    },

    async getAnalytics(ctx) {
      try {
        const { query } = ctx

        // Get analytics data using the security analytics service
        const securityService = strapi.service('api::security-event.security-analytics')
        
        const analytics = await securityService.getSecurityAnalytics({
          startDate: query.startDate,
          endDate: query.endDate,
          severity: query.severity,
          eventType: query.eventType
        })

        return analytics
      } catch (error) {
        strapi.log.error('Error getting security analytics:', error)
        ctx.throw(500, 'Failed to retrieve security analytics')
      }
    },


  }))
