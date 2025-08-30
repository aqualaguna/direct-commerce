'use strict'

import { factories } from '@strapi/strapi'

export default factories.createCoreController(
  'api::engagement-metrics.engagement-metric',
  ({ strapi }) => ({
    async calculate(ctx) {
      try {
        const { data } = ctx.request.body
        const { user } = ctx.state

        if (!data.metricType || !data.userId) {
          return ctx.badRequest('metricType and userId are required')
        }

        // Get the engagement calculation service
        const engagementService = strapi.service('api::engagement-metrics.engagement-calculator')
        
        // Calculate the metric
        const metricData = await engagementService.calculateMetric({
          userId: data.userId,
          metricType: data.metricType,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd
        })

        // Create the engagement metric record
        const engagementMetric = await strapi.documents('api::engagement-metrics.engagement-metric').create({
          data: {
            user: data.userId,
            metricType: data.metricType,
            metricValue: metricData.value,
            calculationDate: new Date(),
            periodStart: data.periodStart || metricData.periodStart,
            periodEnd: data.periodEnd || metricData.periodEnd,
            metadata: metricData.metadata,
            source: 'calculated'
          }
        })

        return engagementMetric
      } catch (error) {
        strapi.log.error('Error calculating engagement metric:', error)
        ctx.throw(500, 'Failed to calculate engagement metric')
      }
    },

    async find(ctx) {
      try {
        const { query } = ctx

        // Build filters
        const filters: any = {}
        
        if (query.userId) {
          filters.user = query.userId
        }
        
        if (query.metricType) {
          filters.metricType = query.metricType
        }
        
        if (query.source) {
          filters.source = query.source
        }
        
        if (query.status) {
          filters.status = query.status
        }
        
        if (query.startDate || query.endDate) {
          filters.calculationDate = {}
          if (query.startDate) {
            filters.calculationDate.$gte = new Date(String(query.startDate))
          }
          if (query.endDate) {
            filters.calculationDate.$lte = new Date(String(query.endDate))
          }
        }

        // Apply pagination
        const pagination = {
          page: Math.max(1, parseInt(String(query.page)) || 1),
          pageSize: Math.min(Math.max(1, parseInt(String(query.pageSize)) || 25), 100)
        }

        // Use Document Service API
        const metrics = await strapi.documents('api::engagement-metrics.engagement-metric').findMany({
          filters,
          sort: { calculationDate: 'desc' },
          pagination,
          populate: ['user']
        })

        return metrics
      } catch (error) {
        strapi.log.error('Error finding engagement metrics:', error)
        ctx.throw(500, 'Failed to retrieve engagement metrics')
      }
    },

    async findOne(ctx) {
      try {
        const { documentId } = ctx.params

        if (!documentId) {
          return ctx.badRequest('Engagement metric documentId is required')
        }

        // Use Document Service API
        const metric = await strapi.documents('api::engagement-metrics.engagement-metric').findOne({
          documentId,
          populate: ['user']
        })

        if (!metric) {
          return ctx.notFound('Engagement metric not found')
        }

        return metric
      } catch (error) {
        strapi.log.error('Error finding engagement metric:', error)
        ctx.throw(500, 'Failed to retrieve engagement metric')
      }
    },

    async update(ctx) {
      try {
        const { documentId } = ctx.params
        const { data } = ctx.request.body

        if (!documentId) {
          return ctx.badRequest('Engagement metric documentId is required')
        }

        // Use Document Service API for updates
        const metric = await strapi.documents('api::engagement-metrics.engagement-metric').update({
          documentId,
          data,
          populate: ['user']
        })

        return metric
      } catch (error) {
        strapi.log.error('Error updating engagement metric:', error)
        ctx.throw(500, 'Failed to update engagement metric')
      }
    },

    async delete(ctx) {
      try {
        const { documentId } = ctx.params

        if (!documentId) {
          return ctx.badRequest('Engagement metric documentId is required')
        }

        // Use Document Service API
        await strapi.documents('api::engagement-metrics.engagement-metric').delete({
          documentId
        })

        return { message: 'Engagement metric deleted successfully' }
      } catch (error) {
        strapi.log.error('Error deleting engagement metric:', error)
        ctx.throw(500, 'Failed to delete engagement metric')
      }
    },

    async getAnalytics(ctx) {
      try {
        const { query } = ctx

        // Get analytics data using the engagement analytics service
        const analyticsService = strapi.service('api::engagement-metrics.engagement-analytics')
        
        const analytics = await analyticsService.getEngagementAnalytics({
          userId: query.userId,
          metricType: query.metricType,
          startDate: query.startDate,
          endDate: query.endDate,
          groupBy: query.groupBy || 'day'
        })

        return analytics
      } catch (error) {
        strapi.log.error('Error getting engagement analytics:', error)
        ctx.throw(500, 'Failed to retrieve engagement analytics')
      }
    },

    async calculateAll(ctx) {
      try {
        const { data } = ctx.request.body
        const { user } = ctx.state

        if (!data.userId) {
          return ctx.badRequest('userId is required')
        }

        // Get the engagement calculation service
        const engagementService = strapi.service('api::engagement-metrics.engagement-calculator')
        
        // Calculate all metrics for the user
        const results = await engagementService.calculateAllMetrics({
          userId: data.userId,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd
        })

        return {
          message: 'All engagement metrics calculated successfully',
          results
        }
      } catch (error) {
        strapi.log.error('Error calculating all engagement metrics:', error)
        ctx.throw(500, 'Failed to calculate all engagement metrics')
      }
    }
  }))
