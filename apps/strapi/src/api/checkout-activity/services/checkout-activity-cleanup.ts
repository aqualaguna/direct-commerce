/**
 * Checkout Activity Cleanup Service
 * Handles data retention and cleanup of old checkout activity data
 */

interface CleanupResult {
  deletedCount: number;
  partitionsDropped: number;
  errors: string[];
}

export default {
  /**
   * Clean up old checkout activities
   */
  async cleanupOldActivities(daysToRetain: number = 90): Promise<CleanupResult> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToRetain);

      strapi.log.info(`Starting cleanup of checkout activities older than ${daysToRetain} days (before ${cutoffDate.toISOString()})`);

      const result: CleanupResult = {
        deletedCount: 0,
        partitionsDropped: 0,
        errors: []
      };

      // Delete old activities using Document Service API
      try {
        const deletedActivities = await strapi.documents('api::checkout-activity.checkout-activity').deleteMany({
          filters: {
            timestamp: {
              $lt: cutoffDate
            }
          }
        });

        result.deletedCount = deletedActivities.count || 0;
        strapi.log.info(`Deleted ${result.deletedCount} old checkout activities`);
      } catch (error) {
        const errorMsg = `Error deleting old activities: ${error.message}`;
        strapi.log.error(errorMsg);
        result.errors.push(errorMsg);
      }

      // Clean up old partitions (if using PostgreSQL partitioning)
      try {
        result.partitionsDropped = await this.cleanupOldPartitions(cutoffDate);
        strapi.log.info(`Dropped ${result.partitionsDropped} old partitions`);
      } catch (error) {
        const errorMsg = `Error cleaning up partitions: ${error.message}`;
        strapi.log.error(errorMsg);
        result.errors.push(errorMsg);
      }

      // Anonymize data older than 30 days for GDPR compliance
      try {
        const anonymizeDate = new Date();
        anonymizeDate.setDate(anonymizeDate.getDate() - 30);

        const anonymizedCount = await this.anonymizeOldData(anonymizeDate);
        strapi.log.info(`Anonymized ${anonymizedCount} records for GDPR compliance`);
      } catch (error) {
        const errorMsg = `Error anonymizing data: ${error.message}`;
        strapi.log.error(errorMsg);
        result.errors.push(errorMsg);
      }

      return result;
    } catch (error) {
      strapi.log.error('Error during cleanup process:', error);
      throw error;
    }
  },

  /**
   * Clean up old partitions (PostgreSQL specific)
   */
  async cleanupOldPartitions(cutoffDate: Date): Promise<number> {
    try {
      // This would require direct database access to manage partitions
      // For now, we'll use a placeholder implementation
      // In a real implementation, you would:
      // 1. Query pg_tables for checkout_activities partitions
      // 2. Check partition date ranges
      // 3. Drop partitions older than cutoff date

      strapi.log.info('Partition cleanup would be implemented with direct database access');
      return 0;
    } catch (error) {
      strapi.log.error('Error cleaning up partitions:', error);
      throw error;
    }
  },

  /**
   * Anonymize old data for GDPR compliance
   */
  async anonymizeOldData(anonymizeDate: Date): Promise<number> {
    try {
      // Find activities older than anonymizeDate that still have PII
      const activitiesToAnonymize = await strapi.documents('api::checkout-activity.checkout-activity').findMany({
        filters: {
          timestamp: {
            $lt: anonymizeDate
          },
          $or: [
            { userId: { $notNull: true } },
            { ipAddress: { $notNull: true } },
            { userAgent: { $notNull: true } },
            { sessionId: { $notNull: true } }
          ]
        },
        pagination: { page: 1, pageSize: 1000 }
      });

      let anonymizedCount = 0;

      for (const activity of activitiesToAnonymize) {
        try {
          await strapi.documents('api::checkout-activity.checkout-activity').update({
            documentId: activity.documentId,
            data: {
              userId: null,
              ipAddress: null,
              userAgent: null,
              sessionId: null,
              activityData: this.anonymizeActivityData(activity.activityData)
            }
          });
          anonymizedCount++;
        } catch (error) {
          strapi.log.error(`Error anonymizing activity ${activity.documentId}:`, error);
        }
      }

      return anonymizedCount;
    } catch (error) {
      strapi.log.error('Error anonymizing old data:', error);
      throw error;
    }
  },

  /**
   * Anonymize activity data
   */
  anonymizeActivityData(activityData: any): any {
    if (!activityData) {
      return activityData;
    }

    const anonymized = { ...activityData };

    // Remove or anonymize sensitive fields
    if (anonymized.fieldValue) {
      anonymized.fieldValue = '[ANONYMIZED]';
    }

    if (anonymized.validationErrors) {
      anonymized.validationErrors = anonymized.validationErrors.map(() => '[ANONYMIZED]');
    }

    // Remove any other potentially sensitive data
    const sensitiveFields = ['email', 'phone', 'address', 'name', 'card'];
    for (const field of sensitiveFields) {
      if (anonymized[field]) {
        anonymized[field] = '[ANONYMIZED]';
      }
    }

    return anonymized;
  },

  /**
   * Schedule automatic cleanup (called by cron job)
   */
  async scheduleCleanup(): Promise<void> {
    try {
      const daysToRetain = parseInt(process.env.CHECKOUT_ACTIVITY_RETENTION_DAYS || '90');
      
      strapi.log.info('Running scheduled checkout activity cleanup');
      
      const result = await this.cleanupOldActivities(daysToRetain);
      
      strapi.log.info('Scheduled cleanup completed:', {
        deletedCount: result.deletedCount,
        partitionsDropped: result.partitionsDropped,
        errors: result.errors.length
      });

      // Send notification if there were errors
      if (result.errors.length > 0) {
        await this.sendCleanupNotification(result);
      }
    } catch (error) {
      strapi.log.error('Error in scheduled cleanup:', error);
      await this.sendCleanupNotification({ errors: [error.message] });
    }
  },

  /**
   * Send cleanup notification
   */
  async sendCleanupNotification(result: CleanupResult): Promise<void> {
    try {
      // This would integrate with your notification system
      // For now, just log the notification
      strapi.log.warn('Cleanup notification would be sent:', {
        deletedCount: result.deletedCount,
        partitionsDropped: result.partitionsDropped,
        errors: result.errors
      });
    } catch (error) {
      strapi.log.error('Error sending cleanup notification:', error);
    }
  },

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<Record<string, any>> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Count activities by age
      const totalActivities = await strapi.documents('api::checkout-activity.checkout-activity').count();
      const activitiesOlderThan30Days = await strapi.documents('api::checkout-activity.checkout-activity').count({
        filters: {
          timestamp: {
            $lt: thirtyDaysAgo
          }
        }
      });
      const activitiesOlderThan90Days = await strapi.documents('api::checkout-activity.checkout-activity').count({
        filters: {
          timestamp: {
            $lt: ninetyDaysAgo
          }
        }
      });

      return {
        totalActivities,
        activitiesOlderThan30Days,
        activitiesOlderThan90Days,
        estimatedStorageMB: Math.round((totalActivities * 500) / (1024 * 1024)), // ~500 bytes per activity
        lastCleanupRun: new Date().toISOString(),
        retentionPolicy: {
          anonymizeAfterDays: 30,
          deleteAfterDays: 90
        }
      };
    } catch (error) {
      strapi.log.error('Error getting cleanup stats:', error);
      throw error;
    }
  }
};
