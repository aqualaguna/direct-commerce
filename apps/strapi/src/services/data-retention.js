'use strict';

/**
 * Data Retention Service
 * Handles data cleanup and retention policies for user activities
 */

const cron = require('node-cron');

module.exports = {
  /**
   * Initialize retention policies and cron jobs
   */
  init() {
    // Run daily at 2:00 AM to clean up old activity data
    cron.schedule('0 2 * * *', async () => {
      try {
        strapi.log.info('Starting daily data retention cleanup...');
        await this.runDailyCleanup();
        strapi.log.info('Daily data retention cleanup completed');
      } catch (error) {
        strapi.log.error('Error in daily data retention cleanup:', error);
      }
    });

    // Run weekly on Sundays at 3:00 AM for deep cleanup
    cron.schedule('0 3 * * 0', async () => {
      try {
        strapi.log.info('Starting weekly data retention deep cleanup...');
        await this.runWeeklyCleanup();
        strapi.log.info('Weekly data retention deep cleanup completed');
      } catch (error) {
        strapi.log.error('Error in weekly data retention cleanup:', error);
      }
    });

    // Run monthly on the 1st at 4:00 AM for archive operations
    cron.schedule('0 4 1 * *', async () => {
      try {
        strapi.log.info('Starting monthly data archival...');
        await this.runMonthlyArchival();
        strapi.log.info('Monthly data archival completed');
      } catch (error) {
        strapi.log.error('Error in monthly data archival:', error);
      }
    });

    strapi.log.info('Data retention policies initialized');
  },

  /**
   * Daily cleanup routine
   */
  async runDailyCleanup() {
    const results = {
      activitiesDeleted: 0,
      errorsEncountered: 0,
      totalProcessed: 0
    };

    try {
      // Clean up user activities older than 90 days
      const activityCleanup = await this.cleanupUserActivities(90);
      results.activitiesDeleted = activityCleanup.deletedCount;

      // Clean up failed activities older than 30 days
      const failedCleanup = await this.cleanupFailedActivities(30);
      results.activitiesDeleted += failedCleanup.deletedCount;

      // Clean up session data older than 7 days
      const sessionCleanup = await this.cleanupExpiredSessions(7);
      results.totalProcessed = sessionCleanup.processedCount;

    } catch (error) {
      results.errorsEncountered++;
      strapi.log.error('Error in daily cleanup:', error);
    }

    // Log cleanup results
    strapi.log.info('Daily cleanup results:', results);
    await this.logRetentionActivity('daily_cleanup', results);

    return results;
  },

  /**
   * Weekly deep cleanup routine
   */
  async runWeeklyCleanup() {
    const results = {
      anonymizedRecords: 0,
      optimizedTables: 0,
      errorsEncountered: 0
    };

    try {
      // Anonymize old user activity data (older than 180 days)
      const anonymizationResult = await this.anonymizeOldData(180);
      results.anonymizedRecords = anonymizationResult.anonymizedCount;

      // Clean up duplicate activities
      const deduplicationResult = await this.removeDuplicateActivities();
      results.optimizedTables = deduplicationResult.removedCount;

    } catch (error) {
      results.errorsEncountered++;
      strapi.log.error('Error in weekly cleanup:', error);
    }

    strapi.log.info('Weekly cleanup results:', results);
    await this.logRetentionActivity('weekly_cleanup', results);

    return results;
  },

  /**
   * Monthly archival routine
   */
  async runMonthlyArchival() {
    const results = {
      archivedRecords: 0,
      compressedSize: 0,
      errorsEncountered: 0
    };

    try {
      // Archive activities older than 1 year to separate storage
      const archivalResult = await this.archiveOldActivities(365);
      results.archivedRecords = archivalResult.archivedCount;

      // Generate monthly activity reports
      await this.generateMonthlyReport();

    } catch (error) {
      results.errorsEncountered++;
      strapi.log.error('Error in monthly archival:', error);
    }

    strapi.log.info('Monthly archival results:', results);
    await this.logRetentionActivity('monthly_archival', results);

    return results;
  },

  /**
   * Clean up user activities older than specified days
   */
  async cleanupUserActivities(retentionDays) {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    try {
      const oldActivities = await strapi.documents('api::user-activity.user-activity').findMany({
        filters: {
          createdAt: {
            $lt: cutoffDate
          }
        },
        fields: ['documentId'],
        pagination: { page: 1, pageSize: 1000 }
      });

      const activitiesData = oldActivities.data || oldActivities || [];

      for (const activity of activitiesData) {
        try {
          await strapi.documents('api::user-activity.user-activity').delete({
            documentId: activity.documentId
          });
          deletedCount++;
        } catch (deleteError) {
          strapi.log.debug('Error deleting activity:', deleteError);
        }
      }

      strapi.log.info(`Cleaned up ${deletedCount} user activities older than ${retentionDays} days`);
      
    } catch (error) {
      strapi.log.error('Error in user activity cleanup:', error);
      throw error;
    }

    return { deletedCount, cutoffDate, retentionDays };
  },

  /**
   * Clean up failed activities older than specified days
   */
  async cleanupFailedActivities(retentionDays) {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    try {
      const failedActivities = await strapi.documents('api::user-activity.user-activity').findMany({
        filters: {
          success: false,
          createdAt: {
            $lt: cutoffDate
          }
        },
        fields: ['documentId'],
        pagination: { page: 1, pageSize: 1000 }
      });

      const activitiesData = failedActivities.data || failedActivities || [];

      for (const activity of activitiesData) {
        try {
          await strapi.documents('api::user-activity.user-activity').delete({
            documentId: activity.documentId
          });
          deletedCount++;
        } catch (deleteError) {
          strapi.log.debug('Error deleting failed activity:', deleteError);
        }
      }

      strapi.log.info(`Cleaned up ${deletedCount} failed activities older than ${retentionDays} days`);

    } catch (error) {
      strapi.log.error('Error in failed activity cleanup:', error);
      throw error;
    }

    return { deletedCount, cutoffDate, retentionDays };
  },

  /**
   * Clean up expired session data
   */
  async cleanupExpiredSessions(retentionDays) {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let processedCount = 0;

    try {
      // This would clean up session-related data
      // For now, we'll just log the process since sessions are handled differently
      const sessionActivities = await strapi.documents('api::user-activity.user-activity').findMany({
        filters: {
          activityType: {
            $in: ['login', 'logout']
          },
          createdAt: {
            $lt: cutoffDate
          }
        },
        fields: ['documentId'],
        pagination: { page: 1, pageSize: 100 }
      });

      processedCount = (sessionActivities.data || sessionActivities || []).length;
      strapi.log.info(`Processed ${processedCount} expired session activities`);

    } catch (error) {
      strapi.log.error('Error in session cleanup:', error);
      throw error;
    }

    return { processedCount, cutoffDate, retentionDays };
  },

  /**
   * Anonymize old data for privacy compliance
   */
  async anonymizeOldData(retentionDays) {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let anonymizedCount = 0;

    try {
      const oldActivities = await strapi.documents('api::user-activity.user-activity').findMany({
        filters: {
          createdAt: {
            $lt: cutoffDate
          },
          ipAddress: {
            $ne: null
          }
        },
        fields: ['documentId', 'ipAddress', 'userAgent'],
        pagination: { page: 1, pageSize: 500 }
      });

      const activitiesData = oldActivities.data || oldActivities || [];

      for (const activity of activitiesData) {
        try {
          // Anonymize sensitive data
          await strapi.documents('api::user-activity.user-activity').update({
            documentId: activity.documentId,
            data: {
              ipAddress: this.anonymizeIP(activity.ipAddress),
              userAgent: this.anonymizeUserAgent(activity.userAgent),
              metadata: {
                ...activity.metadata,
                anonymized: true,
                anonymizedAt: new Date()
              }
            }
          });
          anonymizedCount++;
        } catch (updateError) {
          strapi.log.debug('Error anonymizing activity:', updateError);
        }
      }

      strapi.log.info(`Anonymized ${anonymizedCount} activities older than ${retentionDays} days`);

    } catch (error) {
      strapi.log.error('Error in data anonymization:', error);
      throw error;
    }

    return { anonymizedCount, cutoffDate, retentionDays };
  },

  /**
   * Remove duplicate activities
   */
  async removeDuplicateActivities() {
    let removedCount = 0;

    try {
      // Find potential duplicates (same user, same activity type, within 1 minute)
      const activities = await strapi.documents('api::user-activity.user-activity').findMany({
        sort: { createdAt: 'desc' },
        pagination: { page: 1, pageSize: 2000 }
      });

      const activitiesData = activities.data || activities || [];
      const seen = new Set();
      const duplicates = [];

      activitiesData.forEach(activity => {
        const key = `${activity.user}-${activity.activityType}-${Math.floor(new Date(activity.createdAt).getTime() / 60000)}`;
        
        if (seen.has(key)) {
          duplicates.push(activity.documentId);
        } else {
          seen.add(key);
        }
      });

      // Remove duplicates
      for (const documentId of duplicates) {
        try {
          await strapi.documents('api::user-activity.user-activity').delete({ documentId });
          removedCount++;
        } catch (deleteError) {
          strapi.log.debug('Error removing duplicate:', deleteError);
        }
      }

      strapi.log.info(`Removed ${removedCount} duplicate activities`);

    } catch (error) {
      strapi.log.error('Error in duplicate removal:', error);
      throw error;
    }

    return { removedCount };
  },

  /**
   * Archive old activities (placeholder for external storage)
   */
  async archiveOldActivities(retentionDays) {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let archivedCount = 0;

    try {
      const oldActivities = await strapi.documents('api::user-activity.user-activity').findMany({
        filters: {
          createdAt: {
            $lt: cutoffDate
          }
        },
        pagination: { page: 1, pageSize: 100 }
      });

      const activitiesData = oldActivities.data || oldActivities || [];
      
      // In a real implementation, this would export to external storage
      // For now, we'll just log the archival process
      archivedCount = activitiesData.length;
      
      strapi.log.info(`Would archive ${archivedCount} activities older than ${retentionDays} days`);

    } catch (error) {
      strapi.log.error('Error in activity archival:', error);
      throw error;
    }

    return { archivedCount, cutoffDate, retentionDays };
  },

  /**
   * Generate monthly activity report
   */
  async generateMonthlyReport() {
    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const startOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      const endOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

      // Get aggregation service
      const aggregationService = strapi.service('activity-aggregation');
      
      // Generate comprehensive report
      const report = {
        period: 'monthly',
        startDate: startOfMonth,
        endDate: endOfMonth,
        activitySummary: await aggregationService.aggregateActivitiesByType(startOfMonth, endOfMonth),
        loginAnalysis: await aggregationService.getLoginAnalysis(30),
        generatedAt: new Date()
      };

      // Log report generation
      strapi.log.info('Monthly activity report generated:', {
        period: `${startOfMonth.toISOString().split('T')[0]} to ${endOfMonth.toISOString().split('T')[0]}`,
        totalActivities: report.activitySummary.totalActivities,
        activityTypes: report.activitySummary.activityTypes
      });

      return report;
    } catch (error) {
      strapi.log.error('Error generating monthly report:', error);
      throw error;
    }
  },

  /**
   * Log retention activity for audit trail
   */
  async logRetentionActivity(activityType, results) {
    try {
      const logEntry = {
        type: 'data_retention',
        activity: activityType,
        results: JSON.stringify(results),
        timestamp: new Date(),
        automated: true
      };

      strapi.log.info('Data retention activity logged:', logEntry);
      
      // Could also store this in a separate audit table if needed
      
    } catch (error) {
      strapi.log.error('Error logging retention activity:', error);
    }
  },

  /**
   * Anonymize IP address
   */
  anonymizeIP(ipAddress) {
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
  },

  /**
   * Anonymize user agent string
   */
  anonymizeUserAgent(userAgent) {
    if (!userAgent) return null;
    
    // Keep only basic browser and OS info, remove version details
    let anonymized = userAgent;
    
    // Remove detailed version numbers
    anonymized = anonymized.replace(/\d+\.\d+[\d\.]*[^\s]*/g, 'X.X');
    
    // Keep it short and generic
    if (anonymized.length > 50) {
      anonymized = anonymized.substring(0, 50) + '...';
    }
    
    return anonymized;
  },

  /**
   * Manual cleanup trigger (for testing or emergency use)
   */
  async runManualCleanup(options = {}) {
    const {
      retentionDays = 90,
      cleanupType = 'all',
      dryRun = false
    } = options;

    const results = {
      type: cleanupType,
      dryRun,
      retentionDays,
      results: {}
    };

    try {
      if (dryRun) {
        strapi.log.info('Running manual cleanup in dry-run mode...');
      }

      if (cleanupType === 'all' || cleanupType === 'activities') {
        if (!dryRun) {
          results.results.activities = await this.cleanupUserActivities(retentionDays);
        } else {
          // Count what would be deleted
          const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
          const count = await strapi.documents('api::user-activity.user-activity').count({
            filters: { createdAt: { $lt: cutoffDate } }
          });
          results.results.activities = { wouldDelete: count };
        }
      }

      if (cleanupType === 'all' || cleanupType === 'failed') {
        if (!dryRun) {
          results.results.failed = await this.cleanupFailedActivities(30);
        } else {
          const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const count = await strapi.documents('api::user-activity.user-activity').count({
            filters: { success: false, createdAt: { $lt: cutoffDate } }
          });
          results.results.failed = { wouldDelete: count };
        }
      }

      strapi.log.info('Manual cleanup completed:', results);

    } catch (error) {
      strapi.log.error('Error in manual cleanup:', error);
      throw error;
    }

    return results;
  }
};