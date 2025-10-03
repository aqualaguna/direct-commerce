// Remove Strapi import as it's not needed

/**
 * Checkout Activity Controller
 * Handles high-volume checkout activity tracking for analytics
 */

interface CheckoutActivityData {
  checkoutSessionId: string;
  userId?: string;
  activityType: 'step_enter' | 'step_exit' | 'form_field_focus' | 'form_field_blur' | 'validation_error' | 'form_submit' | 'checkout_abandon' | 'checkout_complete';
  stepName?: 'cart' | 'shipping' | 'billing' | 'payment' | 'review' | 'confirmation';
  formField?: string;
  formType?: 'shipping' | 'billing' | 'payment' | 'review';
  fieldType?: 'text' | 'email' | 'select' | 'checkbox' | 'radio' | 'textarea';
  interactionType?: 'focus' | 'blur' | 'input' | 'validation_error' | 'validation_success';
  activityData?: Record<string, any>;
  timestamp: Date;
  stepDuration?: number;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  screenResolution?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  location?: string;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
}

interface BulkCreateRequest {
  activities: CheckoutActivityData[];
}

interface BulkCreateResponse {
  message: string;
  count: number;
  activities: any[];
}

interface CleanupResponse {
  message: string;
  deletedCount: number;
  daysRetained: number;
}

interface SessionSummaryResponse {
  sessionId: string;
  totalEvents: number;
  stepProgression: Record<string, number>;
  timeSpent: Record<string, number>;
  abandonmentStep?: string;
  completionTime?: number;
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Create a new checkout activity event
   */
  async create(ctx: any): Promise<any> {
    try {
      const { data }: { data: CheckoutActivityData } = ctx.request.body;
      
      // Validate required fields
      if (!data.checkoutSessionId || !data.activityType) {
        return ctx.badRequest('checkoutSessionId and activityType are required');
      }

      // Sanitize and validate activity data
      const sanitizedData = await strapi
        .service('api::checkout-activity.checkout-activity-validation')
        .sanitizeActivityData(data);

      // Add timestamp if not provided
      if (!sanitizedData.timestamp) {
        sanitizedData.timestamp = new Date();
      }

      // Add user info from context if available
      if (ctx.state.user) {
        sanitizedData.userId = ctx.state.user.id;
      }

      // Add request metadata
      sanitizedData.ipAddress = ctx.request.ip;
      sanitizedData.userAgent = ctx.request.headers['user-agent'];
      sanitizedData.sessionId = ctx.request.headers['x-session-id'];

      // Create activity record using Document Service API
      const activity = await strapi.documents('api::checkout-activity.checkout-activity').create({
        data: sanitizedData
      });

      return activity;
    } catch (error) {
      strapi.log.error('Error creating checkout activity:', error);
      if (ctx.throw) {
        ctx.throw(500, 'Failed to create checkout activity');
      } else {
        throw new Error('Failed to create checkout activity');
      }
    }
  },

  /**
   * Get checkout activity data with filtering
   */
  async find(ctx: any): Promise<any> {
    try {
      const { query } = ctx;
      
      // Build filters
      const filters: Record<string, any> = {};
      
      if (query.checkoutSessionId) {
        filters.checkoutSessionId = query.checkoutSessionId;
      }
      
      if (query.activityType) {
        filters.activityType = query.activityType;
      }
      
      if (query.stepName) {
        filters.stepName = query.stepName;
      }
      
      if (query.userId) {
        filters.userId = query.userId;
      }
      
      if (query.startDate || query.endDate) {
        filters.timestamp = {};
        if (query.startDate) {
          filters.timestamp.$gte = new Date(query.startDate);
        }
        if (query.endDate) {
          filters.timestamp.$lte = new Date(query.endDate);
        }
      }

      // Build pagination
      const pagination = {
        page: Math.max(1, parseInt(query.page) || 1),
        pageSize: Math.min(Math.max(1, parseInt(query.pageSize) || 25), 1000)
      };

      // Build sort
      const sort = query.sort || 'createdAt:desc';

      // Get activities using Document Service API
      const activities = await strapi.documents('api::checkout-activity.checkout-activity').findMany({
        filters,
        sort,
        limit: pagination.pageSize,
        start: (pagination.page - 1) * pagination.pageSize,
        populate: ['userId']
      });

      return activities;
    } catch (error) {
      strapi.log.error('Error finding checkout activities:', error);
      if (ctx.throw) {
        ctx.throw(500, 'Failed to retrieve checkout activities');
      } else {
        throw new Error('Failed to retrieve checkout activities');
      }
    }
  },

  /**
   * Get checkout activity by ID
   */
  async findOne(ctx: any): Promise<any> {
    try {
      const { documentId }: { documentId: string } = ctx.params;
      
      if (!documentId) {
        return ctx.badRequest('Activity documentId is required');
      }

      const activity = await strapi.documents('api::checkout-activity.checkout-activity').findOne({
        documentId,
        populate: ['userId']
      });

      if (!activity) {
        return ctx.notFound('Checkout activity not found');
      }

      return activity;
    } catch (error) {
      strapi.log.error('Error finding checkout activity:', error);
      ctx.throw(500, 'Failed to retrieve checkout activity');
    }
  },

  /**
   * Update checkout activity
   */
  async update(ctx: any): Promise<any> {
    try {
      const { documentId }: { documentId: string } = ctx.params;
      const { data }: { data: Partial<CheckoutActivityData> } = ctx.request.body;
      
      if (!documentId) {
        return ctx.badRequest('Activity documentId is required');
      }

      // Sanitize update data
      const sanitizedData = await strapi
        .service('api::checkout-activity.checkout-activity-validation')
        .sanitizeActivityData(data);

      const activity = await strapi.documents('api::checkout-activity.checkout-activity').update({
        documentId,
        data: sanitizedData,
        populate: ['userId']
      });

      return activity;
    } catch (error) {
      strapi.log.error('Error updating checkout activity:', error);
      ctx.throw(500, 'Failed to update checkout activity');
    }
  },

  /**
   * Delete checkout activity
   */
  async delete(ctx: any): Promise<{ message: string }> {
    try {
      const { documentId }: { documentId: string } = ctx.params;
      
      if (!documentId) {
        return ctx.badRequest('Activity documentId is required');
      }

      await strapi.documents('api::checkout-activity.checkout-activity').delete({
        documentId
      });

      return { message: 'Checkout activity deleted successfully' };
    } catch (error) {
      strapi.log.error('Error deleting checkout activity:', error);
      ctx.throw(500, 'Failed to delete checkout activity');
    }
  },

  /**
   * Bulk create checkout activities (for high-volume events)
   */
  async bulkCreate(ctx: any): Promise<BulkCreateResponse> {
    try {
      const { activities }: BulkCreateRequest = ctx.request.body;
      
      if (!Array.isArray(activities) || activities.length === 0) {
        return ctx.badRequest('Activities array is required and must not be empty');
      }

      if (activities.length > 1000) {
        return ctx.badRequest('Maximum 1000 activities per bulk create');
      }

      // Validate and sanitize all activities
      const sanitizedActivities: CheckoutActivityData[] = [];
      for (const activity of activities) {
        if (!activity.checkoutSessionId || !activity.activityType) {
          return ctx.badRequest('Each activity must have checkoutSessionId and activityType');
        }

        const sanitized = await strapi
          .service('api::checkout-activity.checkout-activity-validation')
          .sanitizeActivityData(activity);

        // Ensure timestamp is always set
        sanitized.timestamp = sanitized.timestamp || new Date();

        if (ctx.state.user) {
          sanitized.userId = ctx.state.user.id;
        }

        sanitized.ipAddress = ctx.request.ip;
        sanitized.userAgent = ctx.request.headers['user-agent'];
        sanitized.sessionId = ctx.request.headers['x-session-id'];

        sanitizedActivities.push(sanitized);
      }

      // Bulk create using Document Service API
      const createdActivities: any[] = [];
      for (const activityData of sanitizedActivities) {
        const activity = await strapi.documents('api::checkout-activity.checkout-activity').create({
          data: activityData
        });
        createdActivities.push(activity);
      }

      return {
        message: `Successfully created ${createdActivities.length} activities`,
        count: createdActivities.length,
        activities: createdActivities
      };
    } catch (error) {
      strapi.log.error('Error bulk creating checkout activities:', error);
      if (ctx.throw) {
        ctx.throw(500, 'Failed to bulk create checkout activities');
      } else {
        throw new Error('Failed to bulk create checkout activities');
      }
    }
  },

  /**
   * Get checkout session summary
   */
  async getSessionSummary(ctx: any): Promise<SessionSummaryResponse> {
    try {
      const { checkoutSessionId }: { checkoutSessionId: string } = ctx.params;
      
      if (!checkoutSessionId) {
        return ctx.badRequest('checkoutSessionId is required');
      }

      const summary = await strapi
        .service('api::checkout-activity.checkout-activity-analytics')
        .getSessionSummary(checkoutSessionId);

      return summary;
    } catch (error) {
      strapi.log.error('Error getting session summary:', error);
      if (ctx.throw) {
        ctx.throw(500, 'Failed to get session summary');
      } else {
        throw new Error('Failed to get session summary');
      }
    }
  },

  /**
   * Clean up old activities (admin only)
   */
  async cleanup(ctx: any): Promise<CleanupResponse> {
    try {
      const { days = '90' }: { days?: string } = ctx.query;
      
      // Only allow admin users to perform cleanup
      if (!ctx.state.user || ctx.state.user.role.type !== 'admin') {
        return ctx.forbidden('Only administrators can perform cleanup');
      }

      const result = await strapi
        .service('api::checkout-activity.checkout-activity-cleanup')
        .cleanupOldActivities(parseInt(days));

      return {
        message: `Cleanup completed successfully`,
        deletedCount: result.deletedCount,
        daysRetained: parseInt(days)
      };
    } catch (error) {
      strapi.log.error('Error during cleanup:', error);
      if (ctx.throw) {
        ctx.throw(500, 'Failed to perform cleanup');
      } else {
        throw new Error('Failed to perform cleanup');
      }
    }
  }
});
