// Remove Strapi import as it's not needed

import { UserType } from "../../../../config/constant";

/**
 * Checkout Activity Controller
 * Handles high-volume checkout activity tracking for analytics
 */

interface CheckoutActivityData {
  checkout: any;
  user?: any;
  sessionId?: string;
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
}

interface BulkCreateRequest {
  activities: CheckoutActivityData[];
}

interface BulkCreateResponse {
  meta : {
    message: string;
  },
  count: number;
  activities: any[];
}

interface SessionSummaryResponse {
  meta : {
    message: string;
  },
  data: {
    sessionId: string;
    totalEvents: number;
    stepProgression: Record<string, number>;
    timeSpent: Record<string, number>;
    abandonmentStep?: string;
    completionTime?: number;
  }
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Create a new checkout activity event
   */
  async create(ctx: any): Promise<any> {
    try {
      const { data }: { data: CheckoutActivityData } = ctx.request.body;
      const { user, userType, userId } = ctx.state;
      

      // Validate required fields
      if (!data.checkout || !data.activityType) {
        return ctx.badRequest('checkout and activityType are required');
      }

      // Sanitize and validate activity data
      const validationResult = await strapi
        .service('api::checkout-activity.checkout-activity-validation')
        .sanitizeActivityData(data, userId || user?.id, userType);
      
      if (!validationResult.isValid) {
        return ctx.badRequest('Validation failed', validationResult.errors);
      }
      
      const sanitizedData = validationResult.data;
      // Add timestamp if not provided
      if (!sanitizedData.timestamp) {
        sanitizedData.timestamp = new Date();
      }

      // Add user info from context if available
      if (user) {
        sanitizedData.user = user.id;
      }

      // Add request metadata
      sanitizedData.ipAddress = ctx.request.ip;
      sanitizedData.userAgent = ctx.request.headers['user-agent'];
      sanitizedData.sessionId = ctx.request.headers['x-session-id'];

      // Create activity record using Document Service API
      const activity = await strapi.documents('api::checkout-activity.checkout-activity').create({
        data: sanitizedData,
        populate: ['user', 'checkout']
      });

      return {
        meta : {
          message: 'Checkout activity created successfully',
        },
        data: activity
      };
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

      if (query.checkout) {
        filters.checkout = {documentId: query.checkout};
      }
      
      if (query.activityType) {
        filters.activityType = query.activityType;
      }
      
      if (query.stepName) {
        filters.stepName = query.stepName;
      }
      
      if (query.user) {
        filters.user = query.user;
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
        populate: ['user']
      });

      const total = await strapi.documents('api::checkout-activity.checkout-activity').count({ filters });

      return {
        meta : {
          message: 'Checkout activities retrieved successfully',
          pagination: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: total,
            pageCount: Math.ceil(total / pagination.pageSize)
          }
        },
        data: activities
      };
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
        populate: ['user']
      });

      if (!activity) {
        return ctx.notFound('Checkout activity not found');
      }

      return {
        meta : {
          message: 'Checkout activity retrieved successfully',
        },
        data: activity
      };
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
      const { user, userType, userId } = ctx.state;
      const { data }: { data: Partial<CheckoutActivityData> } = ctx.request.body;
      
      if (!documentId) {
        return ctx.badRequest('Activity documentId is required');
      }
      // findone the activity
      const existingActivity = await strapi.documents('api::checkout-activity.checkout-activity').findOne({
        documentId,
        populate: ['user']
      });
      
      if (!existingActivity) {
        return ctx.notFound('Checkout activity not found');
      }

      // Sanitize update data
      const validationResult = await strapi
        .service('api::checkout-activity.checkout-activity-validation')
        .sanitizeActivityData(data, userId || user?.id, userType);

      if (!validationResult.isValid) {
        return ctx.badRequest('Validation failed', validationResult.errors);
      }

      const sanitizedData = validationResult.data;

      const activity = await strapi.documents('api::checkout-activity.checkout-activity').update({
        documentId,
        data: sanitizedData,
        populate: ['user']
      });

      return {
        meta : {
          message: 'Checkout activity updated successfully',
        },
        data: activity
      };
    } catch (error) {
      strapi.log.error('Error updating checkout activity:', error);
      ctx.throw(500, 'Failed to update checkout activity');
    }
  },

  /**
   * Delete checkout activity
   */
  async delete(ctx: any){
    try {
      const { documentId }: { documentId: string } = ctx.params;
      
      if (!documentId) {
        return ctx.badRequest('Activity documentId is required');
      }

      const result = await strapi.documents('api::checkout-activity.checkout-activity').delete({
        documentId
      });

      return {
        meta : {
          message: 'Checkout activity deleted successfully',
        },
        data: result
      };
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
      const { user, userType, userId } = ctx.state;
      if (!Array.isArray(activities) || activities.length === 0) {
        return ctx.badRequest('Activities array is required and must not be empty');
      }

      if (activities.length > 1000) {
        return ctx.badRequest('Maximum 1000 activities per bulk create');
      }

      // Validate and sanitize all activities
      const sanitizedActivities: CheckoutActivityData[] = [];
      for (const activity of activities) {
        if (!activity.checkout || !activity.activityType) {
          return ctx.badRequest('Each activity must have checkout and activityType');
        }

        const validationResult = await strapi
          .service('api::checkout-activity.checkout-activity-validation')
          .sanitizeActivityData(activity, userId || user?.id, userType);
        
        if (!validationResult.isValid) {
          return ctx.badRequest(`Validation failed for activity: ${validationResult.errors.join(', ')}`);
        }
        
        const sanitized = validationResult.data;

        // Ensure timestamp is always set
        sanitized.timestamp = sanitized.timestamp || new Date();

        if (user) {
          sanitized.user = user.id;
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
        meta : {
          message: `Successfully created ${createdActivities.length} activities`,
        },
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
      const { checkoutId }: { checkoutId: string } = ctx.params;
      
      if (!checkoutId) {
        return ctx.badRequest('checkoutId is required');
      }

      const summary = await strapi
        .service('api::checkout-activity.checkout-activity-analytics')
        .getSessionSummary(checkoutId);

      return {
        meta : {
          message: 'Session summary retrieved successfully',
        },
        data: summary
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        return ctx.notFound(error.message);
      }
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
  async cleanup(ctx: any) {
    try {
      const { days = '90' }: { days?: string } = ctx.query;
      const { user, userType } = ctx.state;
      if (userType === UserType.AUTHENTICATED && user?.role?.type !== 'admin') {
        return ctx.forbidden('Only administrators can perform cleanup');
      }


      const result = await strapi
        .service('api::checkout-activity.checkout-activity-cleanup')
        .cleanupOldActivities(parseInt(days));

      return {
        meta : {
          message: `Cleanup completed successfully`,
        },
        data: {
          deletedCount: result.deletedCount,
          daysRetained: parseInt(days)
        }
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
