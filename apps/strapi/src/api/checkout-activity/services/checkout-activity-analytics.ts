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


export default ({ strapi }: { strapi: any }) => ({
  /**
   * Get checkout session summary
   */
  async getSessionSummary(checkoutId: string): Promise<SessionSummary> {
    try {
      // findone the checkout
      const checkout = await strapi.documents('api::checkout.checkout').findOne({
        documentId: checkoutId
      });
      if (!checkout) {
        throw new Error('Checkout not found');
      }

      // Get all activities for this session
      const activities = await strapi.documents('api::checkout-activity.checkout-activity').findMany({
        filters: { checkout: {documentId: checkoutId} },
        sort: 'createdAt:asc',
        limit: 1000,
        start: 0,
      });


      const summary: SessionSummary = {
        sessionId: checkoutId,
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

});
