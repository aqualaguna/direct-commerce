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
        const { user } = ctx.state

        if (!data.eventType || !data.ipAddress) {
          return ctx.badRequest('eventType and ipAddress are required')
        }

        // Calculate severity based on event type
        const severity = calculateSeverity(data.eventType, data.attemptCount)

        // Create security event
        const securityEvent = await strapi.documents('api::security-event.security-event').create({
          data: {
            user: data.userId || null,
            eventType: data.eventType,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent || '',
            location: data.location || 'unknown',
            attemptCount: data.attemptCount || 1,
            reason: data.reason || '',
            severity: severity,
            timestamp: new Date(),
            resolved: false
          }
        })

        // Trigger security alert for high/critical events
        if (severity === 'high' || severity === 'critical') {
          await triggerSecurityAlert(securityEvent)
        }

        return securityEvent
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
          filters['eventData.severity'] = query.severity
        }
        
        if (query.eventType) {
          filters.eventType = query.eventType
        }
        
        if (query.resolved !== undefined) {
          filters.resolved = query.resolved === 'true'
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
          sort: { timestamp: 'desc' },
          pagination,
          populate: ['user']
        })

        return events
      } catch (error) {
        strapi.log.error('Error finding security events:', error)
        ctx.throw(500, 'Failed to retrieve security events')
      }
    },

    async findOne(ctx) {
      try {
        const { documentId } = ctx.params

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
        const { documentId } = ctx.params
        const { data } = ctx.request.body

        if (!documentId) {
          return ctx.badRequest('Security event documentId is required')
        }

        // Use Document Service API for updates
        const event = await strapi.documents('api::security-event.security-event').update({
          documentId,
          data,
          populate: ['user']
        })

        return event
      } catch (error) {
        strapi.log.error('Error updating security event:', error)
        ctx.throw(500, 'Failed to update security event')
      }
    },

    async delete(ctx) {
      try {
        const { documentId } = ctx.params

        if (!documentId) {
          return ctx.badRequest('Security event documentId is required')
        }

        // Use Document Service API
        await strapi.documents('api::security-event.security-event').delete({
          documentId
        })

        return { message: 'Security event deleted successfully' }
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

    async resolveEvent(ctx) {
      try {
        const { documentId } = ctx.params
        const { resolutionNotes } = ctx.request.body
        const { user } = ctx.state

        if (!documentId) {
          return ctx.badRequest('Security event documentId is required')
        }

        const updateData = {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: user?.id,
          resolutionNotes
        }

        // Use Document Service API
        const event = await strapi.documents('api::security-event.security-event').update({
          documentId,
          data: updateData,
          populate: ['user', 'resolvedBy']
        })

        return event
      } catch (error) {
        strapi.log.error('Error resolving security event:', error)
        ctx.throw(500, 'Failed to resolve security event')
      }
    }
  }))
