/**
 * Order Tracking Service
 * Handles order tracking, carrier integration, and real-time updates
 */

interface TrackingUpdate {
  orderId: string;
  trackingNumber: string;
  carrier: string;
  status: string;
  location?: string;
  description?: string;
  timestamp: Date;
  source: 'carrier_api' | 'webhook' | 'manual' | 'email' | 'sms';
}

interface CarrierConfig {
  name: string;
  code: string;
  apiKey?: string;
  apiUrl?: string;
  webhookUrl?: string;
  trackingUrlTemplate?: string;
  supportedCountries?: string[];
}

interface TrackingRequest {
  orderId: string;
  trackingNumber: string;
  carrier: string;
  carrierCode?: string;
  estimatedDelivery?: Date;
  packageWeight?: number;
  packageDimensions?: any;
  signatureRequired?: boolean;
  webhookUrl?: string;
}

export default {
  /**
   * Create tracking record
   */
  async createTrackingRecord(request: TrackingRequest) {
    try {
      const { orderId, trackingNumber, carrier, carrierCode, estimatedDelivery, packageWeight, packageDimensions, signatureRequired, webhookUrl } = request;

      // Validate order exists
      const order = await strapi.documents('api::order.order').findOne({
        documentId: orderId
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Check if tracking already exists
      const existingTracking = await strapi.documents('api::order.order-tracking').findFirst({
        filters: { order: orderId as any }
      });

      if (existingTracking) {
        throw new Error('Tracking record already exists for this order');
      }

      // Generate tracking URL
      const trackingUrl = await this.generateTrackingUrl(trackingNumber, carrier);

      // Create tracking record
      const trackingData = {
        order: orderId,
        trackingNumber,
        carrier,
        carrierCode,
        trackingUrl,
        status: 'pending' as const,
        estimatedDelivery,
        packageWeight,
        packageDimensions,
        signatureRequired: signatureRequired || false,
        webhookUrl,
        isActive: true,
        lastUpdate: new Date(),
        lastUpdateSource: 'manual' as const,
        updateHistory: []
      };

      const trackingRecord = await strapi.documents('api::order.order-tracking').create({
        data: trackingData,
        populate: ['order']
      });

      // Update order with tracking number
      await strapi.documents('api::order.order').update({
        documentId: orderId,
        data: { 
          trackingNumber,
          status: 'shipped'
        }
      });

      // Record history event
      const orderHistoryService = strapi.service('api::order.order-history');
      await orderHistoryService.recordShippingUpdate(orderId, null, trackingData, 'system', 'system');

      return trackingRecord;
    } catch (error) {
      strapi.log.error('Error creating tracking record:', error);
      throw error;
    }
  },

  /**
   * Update tracking status
   */
  async updateTrackingStatus(trackingId: string, update: TrackingUpdate) {
    try {
      const tracking = await strapi.documents('api::order.order-tracking').findOne({
        documentId: trackingId,
        populate: ['order']
      });

      if (!tracking) {
        throw new Error('Tracking record not found');
      }

      // Update tracking record
      const updateData: any = {
        status: update.status,
        lastUpdate: update.timestamp,
        lastUpdateSource: update.source,
        updateHistory: [
          ...(tracking.updateHistory || [] as any),
          {
            status: update.status,
            location: update.location,
            description: update.description,
            timestamp: update.timestamp,
            source: update.source
          }
        ]
      };

      // Update estimated delivery if provided
      if (update.status === 'in_transit' && !tracking.estimatedDelivery) {
        updateData.estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
      }

      // Update actual delivery if delivered
      if (update.status === 'delivered') {
        updateData.actualDelivery = update.timestamp;
      }

      const updatedTracking = await strapi.documents('api::order.order-tracking').update({
        documentId: trackingId,
        fields: updateData as any,
        populate: ['order']
      });

      // Update order status if needed
      if (update.status === 'delivered') {
        await strapi.documents('api::order.order').update({
          documentId: tracking.order.documentId,
          data: { 
            status: 'delivered',
            actualDelivery: update.timestamp
          }
        });

        // Record history event
        const orderHistoryService = strapi.service('api::order.order-history');
        await orderHistoryService.recordStatusChange(tracking.order.documentId, 'shipped', 'delivered', 'system', 'Package delivered');
      }

      // Send notifications
      await this.sendTrackingNotifications(tracking, update);

      return updatedTracking;
    } catch (error) {
      strapi.log.error('Error updating tracking status:', error);
      throw error;
    }
  },

  /**
   * Get tracking information
   */
  async getTrackingInfo(trackingNumber: string, carrier?: string) {
    try {
      const filters: any = { trackingNumber };
      if (carrier) {
        filters.carrier = carrier;
      }

      const tracking = await strapi.documents('api::order.order-tracking').findFirst({
        filters,
        populate: ['order', 'order.user', 'order.shippingAddress']
      });

      if (!tracking) {
        throw new Error('Tracking information not found');
      }

      return tracking;
    } catch (error) {
      strapi.log.error('Error getting tracking information:', error);
      throw error;
    }
  },

  /**
   * Get tracking by order ID
   */
  async getTrackingByOrderId(orderId: string) {
    try {
      const tracking = await strapi.documents('api::order.order-tracking').findFirst({
        filters: { order: orderId as any },
        populate: ['order']
      });

      return tracking;
    } catch (error) {
      strapi.log.error('Error getting tracking by order ID:', error);
      throw error;
    }
  },

  /**
   * Fetch tracking updates from carrier
   */
  async fetchCarrierUpdates(trackingId: string) {
    try {
      const tracking = await strapi.documents('api::order.order-tracking').findOne({
        documentId: trackingId,
        populate: ['order']
      });

      if (!tracking) {
        throw new Error('Tracking record not found');
      }

      // Get carrier configuration
      const carrierConfig = await this.getCarrierConfig(tracking.carrier);
      if (!carrierConfig) {
        throw new Error(`Carrier configuration not found for ${tracking.carrier}`);
      }

      // Fetch updates from carrier API
      const updates = await this.fetchFromCarrierAPI(tracking.trackingNumber, carrierConfig);

      // Process updates
      for (const update of updates) {
        await this.updateTrackingStatus(trackingId, {
          orderId: tracking.order.documentId,
          trackingNumber: tracking.trackingNumber,
          carrier: tracking.carrier,
          status: update.status,
          location: update.location,
          description: update.description,
          timestamp: update.timestamp,
          source: 'carrier_api'
        });
      }

      // Update retry count and next retry time
      await strapi.documents('api::order.order-tracking').update({
        documentId: trackingId,
        data: {
          retryCount: tracking.retryCount + 1,
          lastRetryAt: new Date(),
          nextRetryAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
        }
      });

      return updates;
    } catch (error) {
      strapi.log.error('Error fetching carrier updates:', error);
      throw error;
    }
  },

  /**
   * Process webhook update
   */
  async processWebhookUpdate(webhookData: any, secret: string) {
    try {
      // Validate webhook secret
      const tracking = await strapi.documents('api::order.order-tracking').findFirst({
        filters: { webhookSecret: secret },
        populate: ['order']
      });

      if (!tracking) {
        throw new Error('Invalid webhook secret');
      }

      // Parse webhook data
      const update = this.parseWebhookData(webhookData);

      // Update tracking
      await this.updateTrackingStatus(tracking.documentId, {
        orderId: tracking.order.documentId,
        trackingNumber: tracking.trackingNumber,
        carrier: tracking.carrier,
        status: update.status,
        location: update.location,
        description: update.description,
        timestamp: update.timestamp,
        source: 'webhook'
      });

      return { success: true };
    } catch (error) {
      strapi.log.error('Error processing webhook update:', error);
      throw error;
    }
  },

  /**
   * Generate tracking URL
   */
  async generateTrackingUrl(trackingNumber: string, carrier: string): Promise<string> {
    const carrierConfig = await this.getCarrierConfig(carrier);
    
    if (carrierConfig?.trackingUrlTemplate) {
      return carrierConfig.trackingUrlTemplate.replace('{tracking_number}', trackingNumber);
    }

    // Default tracking URLs for common carriers
    const defaultUrls: { [key: string]: string } = {
      'fedex': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
      'ups': `https://www.ups.com/track?tracknum=${trackingNumber}`,
      'usps': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
      'dhl': `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`
    };

    return defaultUrls[carrier.toLowerCase()] || `https://www.google.com/search?q=${trackingNumber}`;
  },

  /**
   * Get carrier configuration
   */
  async getCarrierConfig(carrier: string): Promise<CarrierConfig | null> {
    // TODO: Implement carrier configuration from database
    // For now, return hardcoded configurations
    const carrierConfigs: { [key: string]: CarrierConfig } = {
      'fedex': {
        name: 'FedEx',
        code: 'fedex',
        apiUrl: 'https://apis.fedex.com/track/v1/trackingnumbers',
        trackingUrlTemplate: 'https://www.fedex.com/fedextrack/?trknbr={tracking_number}'
      },
      'ups': {
        name: 'UPS',
        code: 'ups',
        apiUrl: 'https://onlinetools.ups.com/track/v1/details',
        trackingUrlTemplate: 'https://www.ups.com/track?tracknum={tracking_number}'
      },
      'usps': {
        name: 'USPS',
        code: 'usps',
        apiUrl: 'https://secure.shippingapis.com/ShippingAPI.dll',
        trackingUrlTemplate: 'https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking_number}'
      },
      'dhl': {
        name: 'DHL',
        code: 'dhl',
        apiUrl: 'https://api-test.dhl.com/parcel/de/v1/tracking',
        trackingUrlTemplate: 'https://www.dhl.com/en/express/tracking.html?AWB={tracking_number}'
      }
    };

    return carrierConfigs[carrier.toLowerCase()] || null;
  },

  /**
   * Fetch updates from carrier API
   */
  async fetchFromCarrierAPI(trackingNumber: string, carrierConfig: CarrierConfig): Promise<any[]> {
    try {
      // TODO: Implement actual carrier API integration
      // For now, return mock data
      strapi.log.info(`Fetching tracking updates from ${carrierConfig.name} for ${trackingNumber}`);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Return mock updates
      return [
        {
          status: 'in_transit',
          location: 'Distribution Center',
          description: 'Package in transit',
          timestamp: new Date()
        }
      ];
    } catch (error) {
      strapi.log.error('Error fetching from carrier API:', error);
      throw error;
    }
  },

  /**
   * Parse webhook data
   */
  parseWebhookData(webhookData: any): any {
    // TODO: Implement webhook data parsing based on carrier
    // For now, return basic structure
    return {
      status: webhookData.status || 'in_transit',
      location: webhookData.location,
      description: webhookData.description,
      timestamp: new Date(webhookData.timestamp || Date.now())
    };
  },

  /**
   * Send tracking notifications
   */
  async sendTrackingNotifications(tracking: any, update: TrackingUpdate) {
    try {
      const order = await strapi.documents('api::order.order').findOne({
        documentId: tracking.order.documentId,
        populate: ['user']
      });

      if (!order || !order.user) {
        return;
      }

      // Send email notification
      await this.sendTrackingEmail(order, tracking, update);

      // Send SMS notification for important updates
      if (update.status === 'delivered' || update.status === 'out_for_delivery') {
        await this.sendTrackingSMS(order, tracking, update);
      }
    } catch (error) {
      strapi.log.error('Error sending tracking notifications:', error);
    }
  },

  /**
   * Send tracking email notification
   */
  async sendTrackingEmail(order: any, tracking: any, update: TrackingUpdate) {
    try {
      const emailData = {
        to: order.user.email,
        subject: `Order ${order.orderNumber} - ${update.status.replace('_', ' ').toUpperCase()}`,
        template: 'tracking-update',
        data: {
          orderNumber: order.orderNumber,
          trackingNumber: tracking.trackingNumber,
          carrier: tracking.carrier,
          status: update.status,
          location: update.location,
          description: update.description,
          timestamp: update.timestamp,
          trackingUrl: tracking.trackingUrl
        }
      };

      // TODO: Integrate with actual email service
      strapi.log.info('Tracking email notification:', emailData);
    } catch (error) {
      strapi.log.error('Error sending tracking email:', error);
    }
  },

  /**
   * Send tracking SMS notification
   */
  async sendTrackingSMS(order: any, tracking: any, update: TrackingUpdate) {
    try {
      const phoneNumber = order.shippingAddress?.phone;
      if (!phoneNumber) {
        return;
      }

      const message = `Order ${order.orderNumber}: ${update.description || update.status}. Track at ${tracking.trackingUrl}`;

      // TODO: Integrate with actual SMS service
      strapi.log.info(`SMS notification to ${phoneNumber}: ${message}`);
    } catch (error) {
      strapi.log.error('Error sending tracking SMS:', error);
    }
  },

  /**
   * Get tracking statistics
   */
  async getTrackingStatistics() {
    try {
      const totalTrackings = await strapi.documents('api::order.order-tracking').count({});
      
      const statusCounts = await Promise.all([
        strapi.documents('api::order.order-tracking').count({ filters: { status: 'pending' } as any }),
        strapi.documents('api::order.order-tracking').count({ filters: { status: 'in_transit' } as any }),
        strapi.documents('api::order.order-tracking').count({ filters: { status: 'out_for_delivery' } as any }),
        strapi.documents('api::order.order-tracking').count({ filters: { status: 'delivered' } as any }),
        strapi.documents('api::order.order-tracking').count({ filters: { status: 'failed' } as any }),
        strapi.documents('api::order.order-tracking').count({ filters: { status: 'returned' } as any }),
        strapi.documents('api::order.order-tracking').count({ filters: { status: 'lost' } as any }),
        strapi.documents('api::order.order-tracking').count({ filters: { status: 'damaged' } as any })
      ]);

      const carrierCounts = await Promise.all([
        strapi.documents('api::order.order-tracking').count({ filters: { carrier: 'fedex' } as any }),
        strapi.documents('api::order.order-tracking').count({ filters: { carrier: 'ups' } as any }),
        strapi.documents('api::order.order-tracking').count({ filters: { carrier: 'usps' } as any }),
        strapi.documents('api::order.order-tracking').count({ filters: { carrier: 'dhl' } as any })
      ]);

      return {
        totalTrackings,
        statusCounts: {
          pending: statusCounts[0],
          inTransit: statusCounts[1],
          outForDelivery: statusCounts[2],
          delivered: statusCounts[3],
          failed: statusCounts[4],
          returned: statusCounts[5],
          lost: statusCounts[6],
          damaged: statusCounts[7]
        },
        carrierCounts: {
          fedex: carrierCounts[0],
          ups: carrierCounts[1],
          usps: carrierCounts[2],
          dhl: carrierCounts[3]
        }
      };
    } catch (error) {
      strapi.log.error('Error getting tracking statistics:', error);
      throw error;
    }
  },

  /**
   * Clean up old tracking records
   */
  async cleanupOldTrackingRecords(olderThanDays: number = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const oldRecords = await strapi.documents('api::order.order-tracking').findMany({
        filters: {
          createdAt: { $lt: cutoffDate },
          status: { $in: ['delivered', 'returned', 'lost', 'damaged'] }
        }
      });

      let deletedCount = 0;
      for (const record of oldRecords) {
        await strapi.documents('api::order.order-tracking').delete({
          documentId: record.documentId
        });
        deletedCount++;
      }

      strapi.log.info(`Cleaned up ${deletedCount} old tracking records`);
      return deletedCount;
    } catch (error) {
      strapi.log.error('Error cleaning up old tracking records:', error);
      throw error;
    }
  }
};
