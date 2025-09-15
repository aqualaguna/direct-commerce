'use strict';

import { factories } from '@strapi/strapi';
import { 
  generateSessionId, 
  anonymizeIP, 
  extractDeviceInfo, 
  getLocationFromIPAsync 
} from '../../../utils/activity-tracking';

// Helper functions are now imported from utils/activity-tracking

export default factories.createCoreController(
  'api::user-activity.user-activity',
  ({ strapi }) => ({
    async create(ctx) {
      try {
        const { data } = ctx.request.body;
        const { user } = ctx.state;

        if (!data.activityType) {
          return ctx.badRequest('activityType is required');
        }

        // Prepare activity data with privacy compliance
        const activityData = {
          ...(data || {}),
          user: data.user || user?.id,
          ipAddress: data.ipAddress ? anonymizeIP(data.ipAddress) : null,
          userAgent: data.userAgent ? data.userAgent.substring(0, 1000) : null,
          deviceInfo: data.userAgent ? extractDeviceInfo(data.userAgent) : data.deviceInfo,
          location: data.location || (data.ipAddress ? await getLocationFromIPAsync(data.ipAddress) : null),
          sessionId: data.sessionId || generateSessionId(),
          success: data.success !== undefined ? data.success : true,
          metadata: {
            ...(data.metadata || {}),
            timestamp: new Date().toISOString(),
            createdBy: user?.id || 'system'
          }
        };

        // Create the activity
        const activity = await strapi.documents('api::user-activity.user-activity').create({
          data: activityData,
          populate: {
            user: {
              fields: ['id', 'username', 'email']
            }
          }
        });

        return ctx.created({ data: activity });
      } catch (error) {
        strapi.log.error('Error creating user activity:', error);
        return ctx.internalServerError('Failed to create user activity');
      }
    },

    async find(ctx) {
      try {
        const { query } = ctx;
        const { user } = ctx.state;

        // Apply user filtering if not admin
        if (user && user.role?.type !== 'admin') {
          query.filters = Object.assign({}, query.filters || {}, {
            user: { id: { $eq: user.id } }
          });
        }

        const page = Number((query as any).pagination?.page || (query as any).page) || 1;
        const pageSize = Number((query as any).pagination?.pageSize || (query as any).pageSize) || 25;
        const start = (page - 1) * pageSize;
        const limit = pageSize;

        const activities = await strapi.documents('api::user-activity.user-activity').findMany({
          ...query,
          start,
          limit,
          populate: {
            user: {
              fields: ['id', 'username', 'email']
            }
          }
        });

        // Get total count for pagination
        const total = await strapi.documents('api::user-activity.user-activity').count(query);

        return ctx.send({ 
          data: activities,
          meta: {
            pagination: {
              page,
              pageSize,
              total,
              pageCount: Math.ceil(total / pageSize)
            }
          }
        });
      } catch (error) {
        strapi.log.error('Error fetching user activities:', error);
        return ctx.internalServerError('Failed to fetch user activities');
      }
    },

    async findOne(ctx) {
      try {
        const { id } = ctx.params;
        const { user } = ctx.state;

        const activity = await strapi.documents('api::user-activity.user-activity').findOne({
          documentId: id,
          populate: {
            user: {
              fields: ['id', 'username', 'email']
            }
          }
        });

        if (!activity) {
          return ctx.notFound('User activity not found');
        }

        // Check if user can access this activity
        if (user && user.role?.type !== 'admin' && (activity as any).user?.id !== user.id) {
          return ctx.forbidden('You can only view your own activities');
        }

        return ctx.send({ data: activity });
      } catch (error) {
        strapi.log.error('Error fetching user activity:', error);
        return ctx.internalServerError('Failed to fetch user activity');
      }
    },

    async update(ctx) {
      try {
        const { id } = ctx.params;
        const { data } = ctx.request.body;
        const { user } = ctx.state;

        // Check if activity exists
        const existingActivity = await strapi.documents('api::user-activity.user-activity').findOne({
          documentId: id
        });

        if (!existingActivity) {
          return ctx.notFound('User activity not found');
        }

        // Check permissions
        if (user && user.role?.type !== 'admin' && (existingActivity as any).user?.id !== user.id) {
          return ctx.forbidden('You can only update your own activities');
        }

        // Prepare update data
        const updateData = Object.assign({}, data || {}, {
          ipAddress: data.ipAddress ? anonymizeIP(data.ipAddress) : existingActivity.ipAddress,
          userAgent: data.userAgent ? data.userAgent.substring(0, 1000) : existingActivity.userAgent,
          deviceInfo: data.userAgent ? extractDeviceInfo(data.userAgent) : data.deviceInfo || existingActivity.deviceInfo,
          metadata: Object.assign({}, existingActivity.metadata || {}, data.metadata || {}, {
            updatedAt: new Date().toISOString(),
            updatedBy: user?.id || 'system'
          })
        });

        const updatedActivity = await strapi.documents('api::user-activity.user-activity').update({
          documentId: id,
          data: updateData
        });

        return ctx.send({ data: updatedActivity });
      } catch (error) {
        strapi.log.error('Error updating user activity:', error);
        return ctx.internalServerError('Failed to update user activity');
      }
    },

    async delete(ctx) {
      try {
        const { id } = ctx.params;
        const { user } = ctx.state;

        // Check if activity exists
        const existingActivity = await strapi.documents('api::user-activity.user-activity').findOne({
          documentId: id
        });

        if (!existingActivity) {
          return ctx.notFound('User activity not found');
        }

        // Check permissions
        if (user && user.role?.type !== 'admin' && (existingActivity as any).user?.id !== user.id) {
          return ctx.forbidden('You can only delete your own activities');
        }

        await strapi.documents('api::user-activity.user-activity').delete({
          documentId: id
        });

        return ctx.send(null, 204);
      } catch (error) {
        strapi.log.error('Error deleting user activity:', error);
        return ctx.internalServerError('Failed to delete user activity');
      }
    },

    // Custom methods for analytics
    async getAnalytics(ctx) {
      try {
        const { query } = ctx;
        const { user } = ctx.state;

        // Apply user filtering if not admin
        if (user && user.role?.type !== 'admin') {
          query.filters = Object.assign({}, query.filters || {}, {
            user: { id: { $eq: user.id } }
          });
        }

        const activities = await strapi.documents('api::user-activity.user-activity').findMany(query);

        // Calculate analytics
        const analytics = {
          totalActivities: activities.length,
          successRate: activities.length > 0 ? 
            (activities.filter(a => a.success).length / activities.length) * 100 : 0,
          activityTypes: activities.reduce((acc: any, activity: any) => {
            acc[activity.activityType] = (acc[activity.activityType] || 0) + 1;
            return acc;
          }, {}),
          uniqueUsers: new Set(activities.map((a: any) => a.user?.id)).size,
          dateRange: activities.length > 0 ? {
            earliest: new Date(Math.min(...activities.map((a: any) => new Date(a.createdAt).getTime()))),
            latest: new Date(Math.max(...activities.map((a: any) => new Date(a.createdAt).getTime())))
          } : null
        };

        return ctx.send({ data: analytics });
      } catch (error) {
        strapi.log.error('Error fetching analytics:', error);
        return ctx.internalServerError('Failed to fetch analytics');
      }
    }
  })
);
