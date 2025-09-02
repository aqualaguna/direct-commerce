/**
 * Order History Service
 * Handles order history tracking, audit trail, and change management
 */

interface HistoryEvent {
  orderId: string;
  eventType: string;
  previousValue?: any;
  newValue?: any;
  changedBy: string;
  changeReason?: string;
  changeSource: 'customer' | 'admin' | 'system' | 'payment_gateway' | 'shipping_carrier' | 'fraud_detection' | 'webhook';
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  affectedFields?: string[];
  metadata?: object;
  isCustomerVisible?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  requiresFollowUp?: boolean;
  followUpNotes?: string;
  automatedAction?: string;
  relatedEvents?: string[];
}

interface HistoryQuery {
  orderId?: string;
  eventType?: string;
  changeSource?: string;
  startDate?: Date;
  endDate?: Date;
  changedBy?: string;
  priority?: string;
  requiresFollowUp?: boolean;
  isCustomerVisible?: boolean;
  page?: number;
  pageSize?: number;
}

export default {
  /**
   * Record order history event
   */
  async recordHistoryEvent(event: HistoryEvent) {
    try {
      const historyData = {
        order: event.orderId,
        eventType: event.eventType,
        previousValue: event.previousValue,
        newValue: event.newValue,
        changedBy: event.changedBy,
        changeReason: event.changeReason,
        changeSource: event.changeSource,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        sessionId: event.sessionId,
        affectedFields: event.affectedFields,
        metadata: event.metadata,
        isCustomerVisible: event.isCustomerVisible !== false,
        priority: event.priority || 'normal',
        requiresFollowUp: event.requiresFollowUp || false,
        followUpNotes: event.followUpNotes,
        automatedAction: event.automatedAction,
        relatedEvents: event.relatedEvents
      };

      const historyRecord = await strapi.documents('api::order-history.order-history').create({
        data: historyData as any,
        populate: ['order', 'changedBy']
      });

      // Trigger follow-up actions if needed
      if (event.requiresFollowUp) {
        await this.triggerFollowUpActions(historyRecord);
      }

      return historyRecord;
    } catch (error) {
      strapi.log.error('Error recording order history event:', error);
      throw error;
    }
  },

  /**
   * Record order creation event
   */
  async recordOrderCreation(orderId: string, orderData: any, userId: string, source: string) {
    const event: HistoryEvent = {
      orderId,
      eventType: 'order_created',
      newValue: orderData,
      changedBy: userId,
      changeSource: source as any,
      isCustomerVisible: true,
      priority: 'normal',
      metadata: {
        orderNumber: orderData.orderNumber,
        total: orderData.total,
        currency: orderData.currency
      }
    };

    return this.recordHistoryEvent(event);
  },

  /**
   * Record status change event
   */
  async recordStatusChange(orderId: string, previousStatus: string, newStatus: string, userId: string, reason?: string) {
    const event: HistoryEvent = {
      orderId,
      eventType: 'status_changed',
      previousValue: { status: previousStatus },
      newValue: { status: newStatus },
      changedBy: userId,
      changeReason: reason,
      changeSource: 'admin',
      affectedFields: ['status'],
      isCustomerVisible: true,
      priority: newStatus === 'cancelled' || newStatus === 'refunded' ? 'high' : 'normal'
    };

    return this.recordHistoryEvent(event);
  },

  /**
   * Record payment update event
   */
  async recordPaymentUpdate(orderId: string, previousPayment: any, newPayment: any, userId: string, source: string) {
    const event: HistoryEvent = {
      orderId,
      eventType: 'payment_updated',
      previousValue: previousPayment,
      newValue: newPayment,
      changedBy: userId,
      changeSource: source as any,
      affectedFields: ['paymentStatus', 'paymentMethod'],
      isCustomerVisible: true,
      priority: 'normal'
    };

    return this.recordHistoryEvent(event);
  },

  /**
   * Record shipping update event
   */
  async recordShippingUpdate(orderId: string, previousShipping: any, newShipping: any, userId: string, source: string) {
    const event: HistoryEvent = {
      orderId,
      eventType: 'shipping_updated',
      previousValue: previousShipping,
      newValue: newShipping,
      changedBy: userId,
      changeReason: 'Shipping information updated',
      changeSource: source as any,
      affectedFields: ['trackingNumber', 'shippingMethod', 'estimatedDelivery'],
      isCustomerVisible: true,
      priority: 'normal'
    };

    return this.recordHistoryEvent(event);
  },

  /**
   * Record address change event
   */
  async recordAddressChange(orderId: string, addressType: 'shipping' | 'billing', previousAddress: any, newAddress: any, userId: string) {
    const event: HistoryEvent = {
      orderId,
      eventType: 'address_changed',
      previousValue: { [addressType]: previousAddress },
      newValue: { [addressType]: newAddress },
      changedBy: userId,
      changeReason: `${addressType} address updated`,
      changeSource: 'customer',
      affectedFields: [`${addressType}Address`],
      isCustomerVisible: true,
      priority: 'normal'
    };

    return this.recordHistoryEvent(event);
  },

  /**
   * Record notes update event
   */
  async recordNotesUpdate(orderId: string, noteType: 'customer' | 'admin', previousNotes: string, newNotes: string, userId: string) {
    const event: HistoryEvent = {
      orderId,
      eventType: 'notes_updated',
      previousValue: { [noteType]: previousNotes },
      newValue: { [noteType]: newNotes },
      changedBy: userId,
      changeReason: `${noteType} notes updated`,
      changeSource: noteType === 'admin' ? 'admin' : 'customer',
      affectedFields: [`${noteType}Notes`],
      isCustomerVisible: noteType === 'customer',
      priority: 'low'
    };

    return this.recordHistoryEvent(event);
  },

  /**
   * Record fraud flag event
   */
  async recordFraudFlag(orderId: string, fraudData: any, userId: string) {
    const event: HistoryEvent = {
      orderId,
      eventType: 'fraud_flag_raised',
      newValue: fraudData,
      changedBy: userId,
      changeReason: 'Fraud detection flag raised',
      changeSource: 'fraud_detection',
      isCustomerVisible: false,
      priority: 'critical',
      requiresFollowUp: true,
      followUpNotes: 'Fraud detection system flagged this order for review'
    };

    return this.recordHistoryEvent(event);
  },

  /**
   * Get order history
   */
  async getOrderHistory(query: HistoryQuery) {
    try {
      const filters: any = {};

      if (query.orderId) {
        filters.order = query.orderId;
      }

      if (query.eventType) {
        filters.eventType = query.eventType;
      }

      if (query.changeSource) {
        filters.changeSource = query.changeSource;
      }

      if (query.changedBy) {
        filters.changedBy = query.changedBy;
      }

      if (query.priority) {
        filters.priority = query.priority;
      }

      if (query.requiresFollowUp !== undefined) {
        filters.requiresFollowUp = query.requiresFollowUp;
      }

      if (query.isCustomerVisible !== undefined) {
        filters.isCustomerVisible = query.isCustomerVisible;
      }

      if (query.startDate || query.endDate) {
        filters.createdAt = {};
        if (query.startDate) {
          filters.createdAt.$gte = query.startDate;
        }
        if (query.endDate) {
          filters.createdAt.$lte = query.endDate;
        }
      }

      const history = await strapi.documents('api::order-history.order-history').findMany({
        filters,
        sort: { createdAt: 'desc' },
        pagination: {
          page: query.page || 1,
          pageSize: Math.min(query.pageSize || 25, 100)
        },
        populate: ['order', 'changedBy']
      });

      return history;
    } catch (error) {
      strapi.log.error('Error getting order history:', error);
      throw error;
    }
  },

  /**
   * Get order history by order ID
   */
  async getOrderHistoryByOrderId(orderId: string, page = 1, pageSize = 25) {
    return this.getOrderHistory({
      orderId,
      page,
      pageSize
    });
  },

  /**
   * Get customer-visible order history
   */
  async getCustomerOrderHistory(orderId: string, page = 1, pageSize = 25) {
    return this.getOrderHistory({
      orderId,
      isCustomerVisible: true,
      page,
      pageSize
    });
  },

  /**
   * Get history events requiring follow-up
   */
  async getFollowUpEvents(page = 1, pageSize = 25) {
    return this.getOrderHistory({
      requiresFollowUp: true,
      page,
      pageSize
    });
  },

  /**
   * Get critical priority events
   */
  async getCriticalEvents(page = 1, pageSize = 25) {
    return this.getOrderHistory({
      priority: 'critical',
      page,
      pageSize
    });
  },

  /**
   * Search order history
   */
  async searchOrderHistory(searchTerm: string, page = 1, pageSize = 25) {
    try {
      const filters = {
        $or: [
          { changeReason: { $contains: searchTerm } },
          { followUpNotes: { $contains: searchTerm } },
          { automatedAction: { $contains: searchTerm } }
        ]
      };

      const history = await strapi.documents('api::order-history.order-history').findMany({
        filters,
        sort: { createdAt: 'desc' },
        pagination: { page, pageSize },
        populate: ['order', 'changedBy']
      });

      return history;
    } catch (error) {
      strapi.log.error('Error searching order history:', error);
      throw error;
    }
  },

  /**
   * Export order history
   */
  async exportOrderHistory(query: HistoryQuery, format: 'csv' | 'json' = 'json') {
    try {
      // Get all history records (no pagination for export)
      const allHistory = await this.getOrderHistory({
        ...query,
        page: 1,
        pageSize: 10000 // Large number to get all records
      });

      if (format === 'csv') {
        return this.convertToCSV(allHistory);
      } else {
        return allHistory;
      }
    } catch (error) {
      strapi.log.error('Error exporting order history:', error);
      throw error;
    }
  },

  /**
   * Convert history data to CSV
   */
  convertToCSV(historyData: any[]): string {
    const headers = [
      'Event ID',
      'Order ID',
      'Event Type',
      'Change Source',
      'Changed By',
      'Change Reason',
      'Priority',
      'Requires Follow-up',
      'Customer Visible',
      'Created At'
    ];

    const csvRows = [headers.join(',')];

    for (const record of historyData) {
      const row = [
        record.documentId,
        record.order?.documentId || '',
        record.eventType,
        record.changeSource,
        record.changedBy?.username || record.changedBy?.email || '',
        `"${record.changeReason || ''}"`,
        record.priority,
        record.requiresFollowUp ? 'Yes' : 'No',
        record.isCustomerVisible ? 'Yes' : 'No',
        record.createdAt
      ];

      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  },

  /**
   * Get history statistics
   */
  async getHistoryStatistics(orderId?: string, startDate?: Date, endDate?: Date) {
    try {
      const filters: any = {};

      if (orderId) {
        filters.order = orderId;
      }

      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) {
          filters.createdAt.$gte = startDate;
        }
        if (endDate) {
          filters.createdAt.$lte = endDate;
        }
      }

      const totalEvents = await strapi.documents('api::order-history.order-history').count(filters);

      const eventTypeCounts = await Promise.all([
        strapi.documents('api::order-history.order-history').count({ ...filters, eventType: 'order_created' }),
        strapi.documents('api::order-history.order-history').count({ ...filters, eventType: 'status_changed' }),
        strapi.documents('api::order-history.order-history').count({ ...filters, eventType: 'payment_updated' }),
        strapi.documents('api::order-history.order-history').count({ ...filters, eventType: 'shipping_updated' }),
        strapi.documents('api::order-history.order-history').count({ ...filters, eventType: 'address_changed' }),
        strapi.documents('api::order-history.order-history').count({ ...filters, eventType: 'notes_updated' }),
        strapi.documents('api::order-history.order-history').count({ ...filters, eventType: 'fraud_flag_raised' })
      ]);

      const priorityCounts = await Promise.all([
        strapi.documents('api::order-history.order-history').count({ ...filters, priority: 'low' }),
        strapi.documents('api::order-history.order-history').count({ ...filters, priority: 'normal' }),
        strapi.documents('api::order-history.order-history').count({ ...filters, priority: 'high' }),
        strapi.documents('api::order-history.order-history').count({ ...filters, priority: 'critical' })
      ]);

      const followUpCount = await strapi.documents('api::order-history.order-history').count({
        ...filters,
        requiresFollowUp: true
      });

      return {
        totalEvents,
        eventTypeCounts: {
          orderCreated: eventTypeCounts[0],
          statusChanged: eventTypeCounts[1],
          paymentUpdated: eventTypeCounts[2],
          shippingUpdated: eventTypeCounts[3],
          addressChanged: eventTypeCounts[4],
          notesUpdated: eventTypeCounts[5],
          fraudFlagRaised: eventTypeCounts[6]
        },
        priorityCounts: {
          low: priorityCounts[0],
          normal: priorityCounts[1],
          high: priorityCounts[2],
          critical: priorityCounts[3]
        },
        followUpCount
      };
    } catch (error) {
      strapi.log.error('Error getting history statistics:', error);
      throw error;
    }
  },

  /**
   * Trigger follow-up actions
   */
  async triggerFollowUpActions(historyRecord: any) {
    try {
      // TODO: Implement follow-up action triggers
      // This could include:
      // - Sending notifications to admins
      // - Creating tasks in task management system
      // - Triggering automated workflows
      // - Sending alerts to relevant departments

      strapi.log.info(`Follow-up action triggered for history record ${historyRecord.documentId}`);
    } catch (error) {
      strapi.log.error('Error triggering follow-up actions:', error);
    }
  },

  /**
   * Clean up old history records
   */
  async cleanupOldHistory(olderThanDays: number = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const oldRecords = await strapi.documents('api::order-history.order-history').findMany({
        filters: {
          createdAt: { $lt: cutoffDate },
          priority: { $ne: 'critical' } // Don't delete critical records
        }
      });

      let deletedCount = 0;
      for (const record of oldRecords) {
        await strapi.documents('api::order-history.order-history').delete({
          documentId: record.documentId
        });
        deletedCount++;
      }

      strapi.log.info(`Cleaned up ${deletedCount} old history records`);
      return deletedCount;
    } catch (error) {
      strapi.log.error('Error cleaning up old history records:', error);
      throw error;
    }
  }
};
