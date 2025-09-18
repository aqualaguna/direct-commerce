/**
 * Checkout Activity Analytics Service
 * Handles analytics processing and aggregation for checkout activity data
 */

interface SessionSummary {
  sessionId: string;
  totalEvents: number;
  stepProgression: Record<string, number>;
  timeSpent: Record<string, number>;
  abandonmentStep?: string;
  completionTime?: number;
  formInteractions: Record<string, number>;
  validationErrors: Record<string, number>;
}

interface FunnelData {
  step: string;
  entered: number;
  completed: number;
  conversionRate: number;
  averageTime: number;
  abandonmentRate: number;
}

interface AbandonmentAnalysis {
  totalSessions: number;
  abandonedSessions: number;
  abandonmentRate: number;
  abandonmentByStep: Record<string, number>;
  averageTimeToAbandon: number;
  topAbandonmentReasons: string[];
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Get checkout session summary
   */
  async getSessionSummary(checkoutSessionId: string): Promise<SessionSummary> {
    try {
      // Get all activities for this session
      const activities = await strapi.documents('api::checkout-activity.checkout-activity').findMany({
        filters: { checkoutSessionId },
        sort: 'timestamp:asc',
        limit: 1000,
        start: 0,
      });

      if (activities.length === 0) {
        throw new Error('No activities found for session');
      }

      const summary: SessionSummary = {
        sessionId: checkoutSessionId,
        totalEvents: activities.length,
        stepProgression: {},
        timeSpent: {},
        formInteractions: {},
        validationErrors: {}
      };

      let currentStep: string | undefined;
      let stepStartTime: number | undefined;
      let completionTime: number | undefined;

      // Process activities chronologically
      for (const activity of activities) {
        const timestamp = new Date(activity.timestamp).getTime();

        // Track step progression
        if (activity.activityType === 'step_enter') {
          if (activity.stepName) {
            currentStep = activity.stepName;
            stepStartTime = timestamp;
            summary.stepProgression[activity.stepName] = (summary.stepProgression[activity.stepName] || 0) + 1;
          }
        }

        // Track step exit and time spent
        if (activity.activityType === 'step_exit' && currentStep && stepStartTime) {
          const timeSpent = timestamp - stepStartTime;
          summary.timeSpent[currentStep] = (summary.timeSpent[currentStep] || 0) + timeSpent;
          stepStartTime = undefined;
        }

        // Track form interactions
        if (activity.activityType === 'form_field_focus' || activity.activityType === 'form_field_blur') {
          const fieldKey = `${activity.formType}.${activity.formField}`;
          summary.formInteractions[fieldKey] = (summary.formInteractions[fieldKey] || 0) + 1;
        }

        // Track validation errors
        if (activity.activityType === 'validation_error') {
          const errorKey = `${activity.formType}.${activity.formField}`;
          summary.validationErrors[errorKey] = (summary.validationErrors[errorKey] || 0) + 1;
        }

        // Track abandonment
        if (activity.activityType === 'checkout_abandon') {
          summary.abandonmentStep = currentStep;
        }

        // Track completion
        if (activity.activityType === 'checkout_complete') {
          completionTime = timestamp;
        }
      }

      // Calculate completion time if available
      if (completionTime && activities.length > 0) {
        const firstActivity = activities[0];
        const startTime = new Date(firstActivity.timestamp).getTime();
        summary.completionTime = completionTime - startTime;
      }

      return summary;
    } catch (error) {
      strapi.log.error('Error getting session summary:', error);
      throw error;
    }
  },

  /**
   * Get checkout funnel analytics
   */
  async getFunnelAnalytics(startDate: string, endDate: string): Promise<FunnelData[]> {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Get all step enter events in date range
      const stepEnterEvents = await strapi.documents('api::checkout-activity.checkout-activity').findMany({
        filters: {
          activityType: 'step_enter',
          timestamp: {
            $gte: start,
            $lte: end
          }
        },
        sort: 'timestamp:asc',
        limit: 10000,
        start: 0,
      });

      // Get all step exit events in date range
      const stepExitEvents = await strapi.documents('api::checkout-activity.checkout-activity').findMany({
        filters: {
          activityType: 'step_exit',
          timestamp: {
            $gte: start,
            $lte: end
          }
        },
        sort: 'timestamp:asc',
        limit: 10000,
        start: 0,
      });

      // Get all completion events in date range
      const completionEvents = await strapi.documents('api::checkout-activity.checkout-activity').findMany({
        filters: {
          activityType: 'checkout_complete',
          timestamp: {
            $gte: start,
            $lte: end
          }
        },
        sort: 'timestamp:asc',
        limit: 10000,
        start: 0,
      });

      // Define checkout steps in order
      const steps = ['cart', 'shipping', 'billing', 'payment', 'review', 'confirmation'];

      const funnelData: FunnelData[] = [];

      for (const step of steps) {
        const entered = stepEnterEvents.filter(event => event.stepName === step).length;
        const completed = stepExitEvents.filter(event => event.stepName === step).length;
        const conversionRate = entered > 0 ? (completed / entered) * 100 : 0;
        const abandonmentRate = entered > 0 ? ((entered - completed) / entered) * 100 : 0;

        // Calculate average time spent on step
        let totalTime = 0;
        let timeCount = 0;

        for (const enterEvent of stepEnterEvents.filter(event => event.stepName === step)) {
          const exitEvent = stepExitEvents.find(event => 
            event.checkoutSessionId === enterEvent.checkoutSessionId && 
            event.stepName === step &&
            new Date(event.timestamp) > new Date(enterEvent.timestamp)
          );

          if (exitEvent) {
            const enterTime = new Date(enterEvent.timestamp).getTime();
            const exitTime = new Date(exitEvent.timestamp).getTime();
            totalTime += exitTime - enterTime;
            timeCount++;
          }
        }

        const averageTime = timeCount > 0 ? totalTime / timeCount : 0;

        funnelData.push({
          step,
          entered,
          completed,
          conversionRate: Math.round(conversionRate * 100) / 100,
          averageTime: Math.round(averageTime),
          abandonmentRate: Math.round(abandonmentRate * 100) / 100
        });
      }

      return funnelData;
    } catch (error) {
      strapi.log.error('Error getting funnel analytics:', error);
      throw error;
    }
  },

  /**
   * Get checkout abandonment analysis
   */
  async getAbandonmentAnalysis(startDate: string, endDate: string): Promise<AbandonmentAnalysis> {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Get all checkout sessions in date range
      const allActivities = await strapi.documents('api::checkout-activity.checkout-activity').findMany({
        filters: {
          timestamp: {
            $gte: start,
            $lte: end
          }
        },
        sort: 'timestamp:asc',
        limit: 10000,
        start: 0,
      });

      // Group activities by session
      const sessions = new Map<string, any[]>();
      for (const activity of allActivities) {
        if (!sessions.has(activity.checkoutSessionId)) {
          sessions.set(activity.checkoutSessionId, []);
        }
        sessions.get(activity.checkoutSessionId)!.push(activity);
      }

      let totalSessions = 0;
      let abandonedSessions = 0;
      const abandonmentByStep: Record<string, number> = {};
      const abandonmentTimes: number[] = [];
      const abandonmentReasons: string[] = [];

      for (const [sessionId, activities] of sessions) {
        totalSessions++;
        
        const hasCompletion = activities.some(activity => activity.activityType === 'checkout_complete');
        const hasAbandonment = activities.some(activity => activity.activityType === 'checkout_abandon');

        if (!hasCompletion && hasAbandonment) {
          abandonedSessions++;

          // Find abandonment step
          const abandonmentEvent = activities.find(activity => activity.activityType === 'checkout_abandon');
          if (abandonmentEvent?.stepName) {
            abandonmentByStep[abandonmentEvent.stepName] = (abandonmentByStep[abandonmentEvent.stepName] || 0) + 1;
          }

          // Calculate time to abandon
          const firstActivity = activities[0];
          const abandonmentActivity = activities.find(activity => activity.activityType === 'checkout_abandon');
          
          if (firstActivity && abandonmentActivity) {
            const startTime = new Date(firstActivity.timestamp).getTime();
            const abandonTime = new Date(abandonmentActivity.timestamp).getTime();
            abandonmentTimes.push(abandonTime - startTime);
          }

          // Analyze abandonment reasons
          const validationErrors = activities.filter(activity => activity.activityType === 'validation_error');
          if (validationErrors.length > 0) {
            abandonmentReasons.push('validation_errors');
          }

          const formInteractions = activities.filter(activity => 
            activity.activityType === 'form_field_focus' || activity.activityType === 'form_field_blur'
          );
          if (formInteractions.length > 10) {
            abandonmentReasons.push('form_complexity');
          }
        }
      }

      const abandonmentRate = totalSessions > 0 ? (abandonedSessions / totalSessions) * 100 : 0;
      const averageTimeToAbandon = abandonmentTimes.length > 0 
        ? abandonmentTimes.reduce((sum, time) => sum + time, 0) / abandonmentTimes.length 
        : 0;

      // Get top abandonment reasons
      const reasonCounts = abandonmentReasons.reduce((acc, reason) => {
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topAbandonmentReasons = Object.entries(reasonCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([reason]) => reason);

      return {
        totalSessions,
        abandonedSessions,
        abandonmentRate: Math.round(abandonmentRate * 100) / 100,
        abandonmentByStep,
        averageTimeToAbandon: Math.round(averageTimeToAbandon),
        topAbandonmentReasons
      };
    } catch (error) {
      strapi.log.error('Error getting abandonment analysis:', error);
      throw error;
    }
  },

  /**
   * Get real-time analytics metrics
   */
  async getRealTimeMetrics(): Promise<Record<string, any>> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get recent activities
      const recentActivities = await strapi.documents('api::checkout-activity.checkout-activity').findMany({
        filters: {
          timestamp: {
            $gte: oneHourAgo
          }
        },
        sort: 'timestamp:desc',
        limit: 1000,
        start: 0,
      });

      // Get daily activities
      const dailyActivities = await strapi.documents('api::checkout-activity.checkout-activity').findMany({
        filters: {
          timestamp: {
            $gte: oneDayAgo
          }
        },
        sort: 'timestamp:desc',
        limit: 10000,
        start: 0,
      });

      // Calculate metrics
      const activeSessions = new Set(recentActivities.map(activity => activity.checkoutSessionId)).size;
      const hourlyCompletions = recentActivities.filter(activity => activity.activityType === 'checkout_complete').length;
      const dailyCompletions = dailyActivities.filter(activity => activity.activityType === 'checkout_complete').length;
      const hourlyAbandonments = recentActivities.filter(activity => activity.activityType === 'checkout_abandon').length;
      const dailyAbandonments = dailyActivities.filter(activity => activity.activityType === 'checkout_abandon').length;

      return {
        activeSessions,
        hourlyCompletions,
        dailyCompletions,
        hourlyAbandonments,
        dailyAbandonments,
        hourlyConversionRate: hourlyCompletions + hourlyAbandonments > 0 
          ? (hourlyCompletions / (hourlyCompletions + hourlyAbandonments)) * 100 
          : 0,
        dailyConversionRate: dailyCompletions + dailyAbandonments > 0 
          ? (dailyCompletions / (dailyCompletions + dailyAbandonments)) * 100 
          : 0
      };
    } catch (error) {
      strapi.log.error('Error getting real-time metrics:', error);
      throw error;
    }
  }
});
