/**
 * Checkout Analytics Controller
 * Provides analytics endpoints for checkout behavior analysis
 */

interface FunnelQuery {
  startDate: string;
  endDate: string;
}

interface AbandonmentQuery {
  startDate: string;
  endDate: string;
}

interface ActivityQuery {
  checkoutSessionId?: string;
  activityType?: string;
  startDate?: string;
  endDate?: string;
  page?: string;
  pageSize?: string;
}

export default {
  /**
   * Get checkout activity data with filtering
   */
  async getActivity(ctx: any): Promise<any> {
    try {
      const query: ActivityQuery = ctx.query;
      
      // Build filters
      const filters: Record<string, any> = {};
      
      if (query.checkoutSessionId) {
        filters.checkoutSessionId = query.checkoutSessionId;
      }
      
      if (query.activityType) {
        filters.activityType = query.activityType;
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

      // Get activities using Document Service API
      const activities = await strapi.documents('api::checkout-activity.checkout-activity').findMany({
        filters,
        sort: { timestamp: 'desc' },
        pagination,
        populate: ['userId']
      });

      return {
        data: activities.data || activities,
        meta: {
          pagination: activities.meta?.pagination || pagination,
          filters: Object.keys(filters).length > 0 ? filters : undefined
        }
      };
    } catch (error) {
      strapi.log.error('Error getting checkout activity:', error);
      ctx.throw(500, 'Failed to retrieve checkout activity data');
    }
  },

  /**
   * Get checkout funnel analytics
   */
  async getFunnel(ctx: any): Promise<any> {
    try {
      const query: FunnelQuery = ctx.query;
      
      // Validate required parameters
      if (!query.startDate || !query.endDate) {
        return ctx.badRequest('startDate and endDate are required');
      }

      // Validate date format
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return ctx.badRequest('Invalid date format. Use YYYY-MM-DD');
      }

      if (startDate >= endDate) {
        return ctx.badRequest('startDate must be before endDate');
      }

      // Get funnel data from analytics service
      const funnelData = await strapi
        .service('api::checkout-activity.checkout-activity-analytics')
        .getFunnelAnalytics(query.startDate, query.endDate);

      return {
        data: {
          funnel: funnelData,
          dateRange: {
            startDate: query.startDate,
            endDate: query.endDate
          },
          summary: {
            totalSessions: funnelData.reduce((sum, step) => sum + step.entered, 0),
            totalCompletions: funnelData.reduce((sum, step) => sum + step.completed, 0),
            overallConversionRate: funnelData.length > 0 
              ? (funnelData[funnelData.length - 1].completed / funnelData[0].entered) * 100 
              : 0
          }
        }
      };
    } catch (error) {
      strapi.log.error('Error getting funnel analytics:', error);
      ctx.throw(500, 'Failed to retrieve funnel analytics');
    }
  },

  /**
   * Get checkout abandonment analysis
   */
  async getAbandonment(ctx: any): Promise<any> {
    try {
      const query: AbandonmentQuery = ctx.query;
      
      // Validate required parameters
      if (!query.startDate || !query.endDate) {
        return ctx.badRequest('startDate and endDate are required');
      }

      // Validate date format
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return ctx.badRequest('Invalid date format. Use YYYY-MM-DD');
      }

      if (startDate >= endDate) {
        return ctx.badRequest('startDate must be before endDate');
      }

      // Get abandonment analysis from analytics service
      const abandonmentData = await strapi
        .service('api::checkout-activity.checkout-activity-analytics')
        .getAbandonmentAnalysis(query.startDate, query.endDate);

      return {
        data: {
          ...abandonmentData,
          dateRange: {
            startDate: query.startDate,
            endDate: query.endDate
          },
          insights: this.generateAbandonmentInsights(abandonmentData)
        }
      };
    } catch (error) {
      strapi.log.error('Error getting abandonment analysis:', error);
      ctx.throw(500, 'Failed to retrieve abandonment analysis');
    }
  },

  /**
   * Get real-time analytics metrics
   */
  async getRealTimeMetrics(ctx: any): Promise<any> {
    try {
      // Get real-time metrics from analytics service
      const metrics = await strapi
        .service('api::checkout-activity.checkout-activity-analytics')
        .getRealTimeMetrics();

      return {
        data: {
          ...metrics,
          timestamp: new Date().toISOString(),
          status: 'live'
        }
      };
    } catch (error) {
      strapi.log.error('Error getting real-time metrics:', error);
      ctx.throw(500, 'Failed to retrieve real-time metrics');
    }
  },

  /**
   * Export checkout analytics data
   */
  async exportData(ctx: any): Promise<any> {
    try {
      const { format = 'json', startDate, endDate, type } = ctx.query;
      
      // Validate export type
      const validTypes = ['activity', 'funnel', 'abandonment', 'realtime'];
      if (!validTypes.includes(type)) {
        return ctx.badRequest(`Invalid export type. Must be one of: ${validTypes.join(', ')}`);
      }

      // Validate date range for time-based exports
      if (type !== 'realtime' && (!startDate || !endDate)) {
        return ctx.badRequest('startDate and endDate are required for time-based exports');
      }

      let exportData: any;

      // Get data based on type
      switch (type) {
        case 'activity':
          exportData = await this.getActivityDataForExport(startDate, endDate);
          break;
        case 'funnel':
          exportData = await strapi
            .service('api::checkout-activity.checkout-activity-analytics')
            .getFunnelAnalytics(startDate, endDate);
          break;
        case 'abandonment':
          exportData = await strapi
            .service('api::checkout-activity.checkout-activity-analytics')
            .getAbandonmentAnalysis(startDate, endDate);
          break;
        case 'realtime':
          exportData = await strapi
            .service('api::checkout-activity.checkout-activity-analytics')
            .getRealTimeMetrics();
          break;
      }

      // Format response based on requested format
      if (format === 'csv') {
        const csvData = this.convertToCSV(exportData);
        ctx.set('Content-Type', 'text/csv');
        ctx.set('Content-Disposition', `attachment; filename="checkout-analytics-${type}-${startDate}-${endDate}.csv"`);
        return csvData;
      }

      return {
        data: exportData,
        export: {
          type,
          format,
          dateRange: startDate && endDate ? { startDate, endDate } : undefined,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      strapi.log.error('Error exporting analytics data:', error);
      ctx.throw(500, 'Failed to export analytics data');
    }
  },

  /**
   * Get activity data for export
   */
  async getActivityDataForExport(startDate: string, endDate: string): Promise<any[]> {
    const activities = await strapi.documents('api::checkout-activity.checkout-activity').findMany({
      filters: {
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      },
      sort: { timestamp: 'asc' },
      pagination: { page: 1, pageSize: 10000 }
    });

    return activities.data || activities;
  },

  /**
   * Convert data to CSV format
   */
  convertToCSV(data: any): string {
    if (!Array.isArray(data)) {
      data = [data];
    }

    if (data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value || '';
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  },

  /**
   * Generate abandonment insights
   */
  generateAbandonmentInsights(abandonmentData: any): string[] {
    const insights: string[] = [];

    if (abandonmentData.abandonmentRate > 70) {
      insights.push('High abandonment rate detected. Consider reviewing checkout flow complexity.');
    }

    if (abandonmentData.averageTimeToAbandon < 30000) { // 30 seconds
      insights.push('Users are abandoning quickly. Check for technical issues or confusing UI.');
    }

    const topAbandonmentStep = Object.entries(abandonmentData.abandonmentByStep)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0];

    if (topAbandonmentStep) {
      insights.push(`Most abandonments occur at step: ${topAbandonmentStep[0]}. Focus optimization efforts here.`);
    }

    if (abandonmentData.topAbandonmentReasons.includes('validation_errors')) {
      insights.push('Validation errors are causing abandonments. Review form validation logic.');
    }

    if (abandonmentData.topAbandonmentReasons.includes('form_complexity')) {
      insights.push('Form complexity is causing abandonments. Consider simplifying the checkout process.');
    }

    return insights;
  }
};
