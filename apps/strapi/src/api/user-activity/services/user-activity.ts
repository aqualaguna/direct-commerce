'use strict';

import { factories } from '@strapi/strapi';
import { trackActivity } from '../../../utils/activity-tracking';

export default factories.createCoreService(
  'api::user-activity.user-activity',
  ({ strapi }) => ({
    async trackActivity(activityData: any, user?: any) {
      try {
        // Use the unified trackActivity function
        await trackActivity({
          strapi,
          user: user ? { documentId: user.id, id: user.id, username: user.username, email: user.email } : null,
          activityType: activityData.activityType,
          activityData: activityData.activityData || {},
          ipAddress: activityData.ipAddress,
          userAgent: activityData.userAgent,
          location: activityData.location,
          deviceInfo: activityData.deviceInfo,
          sessionId: activityData.sessionId,
          sessionDuration: activityData.sessionDuration,
          success: activityData.success !== undefined ? activityData.success : true,
          errorMessage: activityData.errorMessage,
          metadata: {
            ...activityData.metadata,
            trackedAt: new Date().toISOString()
          }
        });

        return { success: true };
      } catch (error) {
        strapi.log.error('Error tracking activity:', error);
        throw error;
      }
    },

    async getUserActivities(userId: string, filters: any = {}) {
      try {
        const activities = await strapi.documents('api::user-activity.user-activity').findMany({
          filters: {
            user: { id: { $eq: userId } },
            ...filters
          },
          populate: {
            user: {
              fields: ['id', 'username', 'email']
            }
          },
          sort: { createdAt: 'desc' }
        });

        return activities;
      } catch (error) {
        strapi.log.error('Error fetching user activities:', error);
        throw error;
      }
    },

    async getActivityStats(filters: any = {}) {
      try {
        const activities = await strapi.documents('api::user-activity.user-activity').findMany({
          filters,
          populate: {
            user: {
              fields: ['id', 'username', 'email']
            }
          }
        });

        const stats = {
          total: activities.length,
          successful: activities.filter(a => a.success).length,
          failed: activities.filter(a => !a.success).length,
          byType: activities.reduce((acc, activity) => {
            acc[activity.activityType] = (acc[activity.activityType] || 0) + 1;
            return acc;
          }, {}),
          byUser: activities.reduce((acc, activity) => {
            const userId = activity.user?.id || 'anonymous';
            acc[userId] = (acc[userId] || 0) + 1;
            return acc;
          }, {}),
          dateRange: activities.length > 0 ? {
            earliest: new Date(Math.min(...activities.map(a => new Date(a.createdAt).getTime()))),
            latest: new Date(Math.max(...activities.map(a => new Date(a.createdAt).getTime())))
          } : null
        };

        return stats;
      } catch (error) {
        strapi.log.error('Error calculating activity stats:', error);
        throw error;
      }
    },

    async cleanupOldActivities(retentionDays: number = 90) {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const oldActivities = await strapi.documents('api::user-activity.user-activity').findMany({
          filters: {
            createdAt: { $lt: cutoffDate.toISOString() }
          }
        });

        let deletedCount = 0;
        for (const activity of oldActivities) {
          await strapi.documents('api::user-activity.user-activity').delete({
            documentId: activity.documentId
          });
          deletedCount++;
        }

        strapi.log.info(`Cleaned up ${deletedCount} old user activities`);
        return deletedCount;
      } catch (error) {
        strapi.log.error('Error cleaning up old activities:', error);
        throw error;
      }
    },

    async anonymizeOldActivities(anonymizationDays: number = 30) {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - anonymizationDays);

        const oldActivities = await strapi.documents('api::user-activity.user-activity').findMany({
          filters: {
            createdAt: { $lt: cutoffDate.toISOString() },
            ipAddress: { $notNull: true }
          }
        });

        let anonymizedCount = 0;
        for (const activity of oldActivities) {
          // Anonymize IP address
          const anonymizedIP = this.anonymizeIP(activity.ipAddress);
          
          await strapi.documents('api::user-activity.user-activity').update({
            documentId: activity.documentId,
            data: {
              ipAddress: anonymizedIP,
              userAgent: 'ANONYMIZED',
          metadata: Object.assign({}, activity.metadata || {}, {
            anonymizedAt: new Date().toISOString()
          })
            }
          });
          anonymizedCount++;
        }

        strapi.log.info(`Anonymized ${anonymizedCount} old user activities`);
        return anonymizedCount;
      } catch (error) {
        strapi.log.error('Error anonymizing old activities:', error);
        throw error;
      }
    },

    anonymizeIP(ipAddress: string) {
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
  })
);
