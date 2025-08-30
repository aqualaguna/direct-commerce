'use strict';

/**
 * Activity Aggregation Service
 * Aggregates user activity data for analytics and reporting
 */

module.exports = {
  /**
   * Aggregate user activities by time period
   */
  async aggregateActivitiesByPeriod(period = 'day', startDate = null, endDate = null) {
    try {
      const now = new Date();
      const start = startDate ? new Date(startDate) : this.getDefaultStartDate(period, now);
      const end = endDate ? new Date(endDate) : now;

      const activities = await strapi.documents('api::user-activity.user-activity').findMany({
        filters: {
          createdAt: {
            $gte: start,
            $lte: end
          }
        },
        sort: { createdAt: 'desc' },
        pagination: { page: 1, pageSize: 10000 } // Adjust as needed
      });

      const aggregated = this.groupActivitiesByPeriod(activities.data || activities, period);
      
      return {
        period,
        startDate: start,
        endDate: end,
        totalActivities: activities.data?.length || activities.length || 0,
        aggregatedData: aggregated,
        generatedAt: new Date()
      };
    } catch (error) {
      strapi.log.error('Error aggregating activities by period:', error);
      throw error;
    }
  },

  /**
   * Aggregate user activities by type
   */
  async aggregateActivitiesByType(startDate = null, endDate = null) {
    try {
      const now = new Date();
      const start = startDate ? new Date(startDate) : new Date(now - 30 * 24 * 60 * 60 * 1000); // Last 30 days
      const end = endDate ? new Date(endDate) : now;

      const activities = await strapi.documents('api::user-activity.user-activity').findMany({
        filters: {
          createdAt: {
            $gte: start,
            $lte: end
          }
        },
        pagination: { page: 1, pageSize: 10000 }
      });

      const activityData = activities.data || activities || [];
      const aggregated = {};

      // Group by activity type
      activityData.forEach(activity => {
        const type = activity.activityType;
        if (!aggregated[type]) {
          aggregated[type] = {
            count: 0,
            successCount: 0,
            failureCount: 0,
            uniqueUsers: new Set(),
            firstSeen: activity.createdAt,
            lastSeen: activity.createdAt
          };
        }

        aggregated[type].count++;
        if (activity.success) {
          aggregated[type].successCount++;
        } else {
          aggregated[type].failureCount++;
        }

        if (activity.user) {
          aggregated[type].uniqueUsers.add(activity.user);
        }

        // Update first/last seen
        if (new Date(activity.createdAt) < new Date(aggregated[type].firstSeen)) {
          aggregated[type].firstSeen = activity.createdAt;
        }
        if (new Date(activity.createdAt) > new Date(aggregated[type].lastSeen)) {
          aggregated[type].lastSeen = activity.createdAt;
        }
      });

      // Convert Sets to counts
      Object.keys(aggregated).forEach(type => {
        aggregated[type].uniqueUserCount = aggregated[type].uniqueUsers.size;
        aggregated[type].successRate = aggregated[type].count > 0 ? 
          (aggregated[type].successCount / aggregated[type].count * 100).toFixed(2) + '%' : '0%';
        delete aggregated[type].uniqueUsers;
      });

      return {
        startDate: start,
        endDate: end,
        totalActivities: activityData.length,
        activityTypes: Object.keys(aggregated).length,
        aggregatedData: aggregated,
        generatedAt: new Date()
      };
    } catch (error) {
      strapi.log.error('Error aggregating activities by type:', error);
      throw error;
    }
  },

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(userId, days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate - days * 24 * 60 * 60 * 1000);

      const activities = await strapi.documents('api::user-activity.user-activity').findMany({
        filters: {
          user: userId,
          createdAt: {
            $gte: startDate,
            $lte: endDate
          }
        },
        sort: { createdAt: 'desc' }
      });

      const activityData = activities.data || activities || [];
      
      const summary = {
        userId,
        period: `${days} days`,
        startDate,
        endDate,
        totalActivities: activityData.length,
        activityTypes: {},
        sessionInfo: {
          totalSessions: 0,
          averageSessionDuration: 0,
          totalSessionTime: 0
        },
        recentActivities: activityData.slice(0, 10).map(activity => ({
          type: activity.activityType,
          timestamp: activity.createdAt,
          success: activity.success,
          sessionId: activity.sessionId
        }))
      };

      // Process activities
      const sessionDurations = [];
      const uniqueSessions = new Set();

      activityData.forEach(activity => {
        // Count by type
        const type = activity.activityType;
        if (!summary.activityTypes[type]) {
          summary.activityTypes[type] = {
            count: 0,
            successCount: 0,
            failureCount: 0
          };
        }

        summary.activityTypes[type].count++;
        if (activity.success) {
          summary.activityTypes[type].successCount++;
        } else {
          summary.activityTypes[type].failureCount++;
        }

        // Session tracking
        if (activity.sessionId) {
          uniqueSessions.add(activity.sessionId);
        }
        
        if (activity.sessionDuration && activity.sessionDuration > 0) {
          sessionDurations.push(activity.sessionDuration);
        }
      });

      // Calculate session statistics
      summary.sessionInfo.totalSessions = uniqueSessions.size;
      if (sessionDurations.length > 0) {
        summary.sessionInfo.totalSessionTime = sessionDurations.reduce((a, b) => a + b, 0);
        summary.sessionInfo.averageSessionDuration = Math.round(
          summary.sessionInfo.totalSessionTime / sessionDurations.length
        );
      }

      // Add success rates to activity types
      Object.keys(summary.activityTypes).forEach(type => {
        const typeData = summary.activityTypes[type];
        typeData.successRate = typeData.count > 0 ? 
          (typeData.successCount / typeData.count * 100).toFixed(2) + '%' : '0%';
      });

      return summary;
    } catch (error) {
      strapi.log.error('Error getting user activity summary:', error);
      throw error;
    }
  },

  /**
   * Get login activity analysis
   */
  async getLoginAnalysis(days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate - days * 24 * 60 * 60 * 1000);

      const loginActivities = await strapi.documents('api::user-activity.user-activity').findMany({
        filters: {
          activityType: 'login',
          createdAt: {
            $gte: startDate,
            $lte: endDate
          }
        },
        sort: { createdAt: 'desc' }
      });

      const activities = loginActivities.data || loginActivities || [];
      
      const analysis = {
        period: `${days} days`,
        startDate,
        endDate,
        totalAttempts: activities.length,
        successfulLogins: 0,
        failedLogins: 0,
        uniqueUsers: new Set(),
        uniqueIPs: new Set(),
        deviceTypes: {},
        browsers: {},
        locations: {},
        hourlyDistribution: Array(24).fill(0),
        dailyDistribution: {}
      };

      activities.forEach(activity => {
        // Success/failure counts
        if (activity.success) {
          analysis.successfulLogins++;
        } else {
          analysis.failedLogins++;
        }

        // Unique users and IPs
        if (activity.user) {
          analysis.uniqueUsers.add(activity.user);
        }
        if (activity.ipAddress) {
          analysis.uniqueIPs.add(activity.ipAddress);
        }

        // Device and browser analysis
        if (activity.deviceInfo) {
          const device = activity.deviceInfo.mobile ? 'Mobile' : 'Desktop';
          analysis.deviceTypes[device] = (analysis.deviceTypes[device] || 0) + 1;
          
          if (activity.deviceInfo.browser) {
            const browser = activity.deviceInfo.browser;
            analysis.browsers[browser] = (analysis.browsers[browser] || 0) + 1;
          }
        }

        // Location analysis
        if (activity.location) {
          analysis.locations[activity.location] = (analysis.locations[activity.location] || 0) + 1;
        }

        // Time distribution
        const hour = new Date(activity.createdAt).getHours();
        analysis.hourlyDistribution[hour]++;

        const day = new Date(activity.createdAt).toISOString().split('T')[0];
        analysis.dailyDistribution[day] = (analysis.dailyDistribution[day] || 0) + 1;
      });

      // Convert sets to counts
      analysis.uniqueUserCount = analysis.uniqueUsers.size;
      analysis.uniqueIPCount = analysis.uniqueIPs.size;
      delete analysis.uniqueUsers;
      delete analysis.uniqueIPs;

      // Calculate success rate
      analysis.successRate = analysis.totalAttempts > 0 ? 
        (analysis.successfulLogins / analysis.totalAttempts * 100).toFixed(2) + '%' : '0%';

      // Security insights
      analysis.securityInsights = {
        multipleFailedAttempts: analysis.failedLogins > analysis.uniqueUserCount * 2,
        unusualIPActivity: analysis.uniqueIPCount > analysis.uniqueUserCount * 1.5,
        peakLoginHour: analysis.hourlyDistribution.indexOf(Math.max(...analysis.hourlyDistribution)),
        avgLoginsPerUser: analysis.uniqueUserCount > 0 ? 
          (analysis.totalAttempts / analysis.uniqueUserCount).toFixed(2) : '0'
      };

      return analysis;
    } catch (error) {
      strapi.log.error('Error getting login analysis:', error);
      throw error;
    }
  },

  /**
   * Helper: Get default start date based on period
   */
  getDefaultStartDate(period, endDate) {
    const end = new Date(endDate);
    switch (period) {
      case 'hour':
        return new Date(end - 24 * 60 * 60 * 1000); // Last 24 hours
      case 'day':
        return new Date(end - 30 * 24 * 60 * 60 * 1000); // Last 30 days
      case 'week':
        return new Date(end - 12 * 7 * 24 * 60 * 60 * 1000); // Last 12 weeks
      case 'month':
        return new Date(end.getFullYear(), end.getMonth() - 12, 1); // Last 12 months
      default:
        return new Date(end - 30 * 24 * 60 * 60 * 1000); // Default to 30 days
    }
  },

  /**
   * Helper: Group activities by time period
   */
  groupActivitiesByPeriod(activities, period) {
    const grouped = {};

    activities.forEach(activity => {
      const date = new Date(activity.createdAt);
      let key;

      switch (period) {
        case 'hour':
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:00`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        default:
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = {
          count: 0,
          successCount: 0,
          failureCount: 0,
          uniqueUsers: new Set(),
          activityTypes: {}
        };
      }

      grouped[key].count++;
      if (activity.success) {
        grouped[key].successCount++;
      } else {
        grouped[key].failureCount++;
      }

      if (activity.user) {
        grouped[key].uniqueUsers.add(activity.user);
      }

      const type = activity.activityType;
      grouped[key].activityTypes[type] = (grouped[key].activityTypes[type] || 0) + 1;
    });

    // Convert Sets to counts and add computed fields
    Object.keys(grouped).forEach(key => {
      grouped[key].uniqueUserCount = grouped[key].uniqueUsers.size;
      grouped[key].successRate = grouped[key].count > 0 ? 
        (grouped[key].successCount / grouped[key].count * 100).toFixed(2) + '%' : '0%';
      delete grouped[key].uniqueUsers;
    });

    return grouped;
  },

  /**
   * Clean up old aggregated data
   */
  async cleanupOldAggregations(retentionDays = 90) {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      
      const oldActivities = await strapi.documents('api::user-activity.user-activity').findMany({
        filters: {
          createdAt: {
            $lt: cutoffDate
          }
        },
        fields: ['documentId']
      });

      const activitiesData = oldActivities.data || oldActivities || [];
      let deletedCount = 0;

      for (const activity of activitiesData) {
        try {
          await strapi.documents('api::user-activity.user-activity').delete({
            documentId: activity.documentId
          });
          deletedCount++;
        } catch (deleteError) {
          strapi.log.error('Error deleting old activity:', deleteError);
        }
      }

      strapi.log.info(`Cleaned up ${deletedCount} old activity records older than ${retentionDays} days`);
      
      return {
        deletedCount,
        cutoffDate,
        retentionDays
      };
    } catch (error) {
      strapi.log.error('Error cleaning up old aggregations:', error);
      throw error;
    }
  }
};