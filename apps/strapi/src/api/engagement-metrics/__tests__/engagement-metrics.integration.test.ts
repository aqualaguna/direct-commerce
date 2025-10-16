/**
 * Engagement Metrics Integration Tests
 * 
 * Comprehensive integration tests for User Engagement Metrics module covering:
 * - Engagement metrics calculation
 * - Metrics aggregation and reporting
 * - Metrics visualization and dashboards
 * - Metrics performance optimization
 * - Metrics data accuracy and validation
 * - Metrics privacy and anonymization
 * - Metrics export and integration
 */

import request from 'supertest';

describe('Engagement Metrics Integration Tests', () => {
  const SERVER_URL = 'http://localhost:1337';
  let apiToken: string;
  let testUser: any;
  let testUserToken: string;
  let testUser2: any;
  let testUser2Token: string;
  
  // Generate unique test data with timestamp
  const timestamp = Date.now();

  beforeAll(async () => {
    // Get admin token for authenticated requests
    apiToken = process.env.STRAPI_API_TOKEN as string;

    if (!apiToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }

    // Create test users for engagement metrics
    const userData1 = {
      username: `engagementuser1${timestamp}`,
      email: `engagement1${timestamp}@example.com`,
      password: 'SecurePassword123!',
    };

    const userData2 = {
      username: `engagementuser2${timestamp}`,
      email: `engagement2${timestamp}@example.com`,
      password: 'SecurePassword123!',
    };

    const userResponse1 = await request(SERVER_URL)
      .post('/api/auth/local/register')
      .send(userData1)
      .timeout(10000);

    const userResponse2 = await request(SERVER_URL)
      .post('/api/auth/local/register')
      .send(userData2)
      .timeout(10000);

    testUser = userResponse1.body.user;
    testUserToken = userResponse1.body.jwt;
    testUser2 = userResponse2.body.user;
    testUser2Token = userResponse2.body.jwt;
  });

  // Add delay between tests to avoid rate limiting
  afterEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
  });

  // Test data factories
  const createTestEngagementMetricsData = (overrides = {}) => ({
    userId: testUser.id,
    metricType: 'page_views',
    metricValue: 10,
    timePeriod: 'daily',
    date: new Date().toISOString().split('T')[0],
    metadata: {
      pages: ['/products', '/cart', '/checkout'],
      sessionCount: 3,
      totalTimeSpent: 1800,
      bounceRate: 0.2
    },
    ...overrides,
  });

  const createTestEngagementSummaryData = (overrides = {}) => ({
    userId: testUser.id,
    totalPageViews: 25,
    totalTimeSpent: 3600,
    averageSessionDuration: 1200,
    bounceRate: 0.15,
    conversionRate: 0.08,
    engagementScore: 75.5,
    lastActiveDate: new Date().toISOString(),
    metrics: {
      pageViews: 25,
      productViews: 8,
      cartAdditions: 3,
      purchases: 2,
      searches: 5,
      reviews: 1
    },
    ...overrides,
  });

  const createTestAggregatedMetricsData = (overrides = {}) => ({
    aggregationType: 'daily',
    date: new Date().toISOString().split('T')[0],
    totalUsers: 150,
    totalPageViews: 2500,
    totalTimeSpent: 180000,
    averageSessionDuration: 1200,
    averageBounceRate: 0.25,
    averageConversionRate: 0.05,
    topPages: [
      { page: '/products', views: 800 },
      { page: '/cart', views: 300 },
      { page: '/checkout', views: 200 }
    ],
    userSegments: {
      newUsers: 50,
      returningUsers: 100,
      activeUsers: 120
    },
    ...overrides,
  });

  describe('Engagement Metrics Calculation', () => {
    it('should create and calculate engagement metrics', async () => {
      const metricsData = createTestEngagementMetricsData();

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: metricsData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.metricType).toBe(metricsData.metricType);
      expect(response.body.data.attributes.metricValue).toBe(metricsData.metricValue);
      expect(response.body.data.attributes.userId).toBe(metricsData.userId);
      expect(response.body.data.attributes.timePeriod).toBe(metricsData.timePeriod);
    });

    it('should calculate engagement score based on multiple metrics', async () => {
      const baseMetrics = createTestEngagementSummaryData();
      
      // Create multiple metric entries
      const metrics = [
        { ...baseMetrics, metricType: 'page_views', metricValue: 25 },
        { ...baseMetrics, metricType: 'time_spent', metricValue: 3600 },
        { ...baseMetrics, metricType: 'interactions', metricValue: 15 },
        { ...baseMetrics, metricType: 'conversions', metricValue: 2 }
      ];

      for (const metric of metrics) {
        await request(SERVER_URL)
          .post('/api/engagement-metrics')
          .set('Authorization', `Bearer ${apiToken}`)
          .send({ data: metric })
          .expect(201);
      }

      // Calculate engagement score
      const scoreResponse = await request(SERVER_URL)
        .post('/api/engagement-metrics/calculate-score')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ 
          data: { 
            userId: testUser.id,
            timePeriod: 'daily',
            date: new Date().toISOString().split('T')[0]
          }
        })
        .expect(200);

      expect(scoreResponse.body.data).toBeDefined();
      expect(scoreResponse.body.data.attributes.engagementScore).toBeGreaterThan(0);
      expect(scoreResponse.body.data.attributes.engagementScore).toBeLessThanOrEqual(100);
    });

    it('should calculate user engagement trends over time', async () => {
      const dates = [
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days ago
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 day ago
        new Date().toISOString().split('T')[0] // today
      ];

      // Create metrics for different dates
      for (let i = 0; i < dates.length; i++) {
        const metricsData = createTestEngagementMetricsData({
          date: dates[i],
          metricValue: 10 + (i * 5) // Increasing trend
        });

        await request(SERVER_URL)
          .post('/api/engagement-metrics')
          .set('Authorization', `Bearer ${apiToken}`)
          .send({ data: metricsData })
          .expect(201);
      }

      // Get engagement trends
      const trendsResponse = await request(SERVER_URL)
        .get(`/api/engagement-metrics/trends?userId=${testUser.id}&timePeriod=3days`)
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(200);

      expect(trendsResponse.body.data).toBeDefined();
      expect(trendsResponse.body.data.length).toBe(3);
      expect(trendsResponse.body.data[0].attributes.metricValue).toBeLessThan(
        trendsResponse.body.data[2].attributes.metricValue
      );
    });

    it('should calculate engagement metrics for different user segments', async () => {
      const segmentMetrics = [
        { ...createTestEngagementMetricsData({ userId: testUser.id }), metricValue: 20 },
        { ...createTestEngagementMetricsData({ userId: testUser2.id }), metricValue: 15 }
      ];

      for (const metric of segmentMetrics) {
        await request(SERVER_URL)
          .post('/api/engagement-metrics')
          .set('Authorization', `Bearer ${apiToken}`)
          .send({ data: metric })
          .expect(201);
      }

      // Calculate segment metrics
      const segmentResponse = await request(SERVER_URL)
        .post('/api/engagement-metrics/calculate-segments')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ 
          data: { 
            timePeriod: 'daily',
            date: new Date().toISOString().split('T')[0]
          }
        })
        .expect(200);

      expect(segmentResponse.body.data).toBeDefined();
      expect(segmentResponse.body.data.attributes.segments).toBeDefined();
      expect(segmentResponse.body.data.attributes.segments.highEngagement).toBeDefined();
      expect(segmentResponse.body.data.attributes.segments.mediumEngagement).toBeDefined();
      expect(segmentResponse.body.data.attributes.segments.lowEngagement).toBeDefined();
    });
  });

  describe('Metrics Aggregation and Reporting', () => {
    it('should aggregate metrics by time period', async () => {
      // Create metrics for different time periods
      const timePeriods = ['hourly', 'daily', 'weekly', 'monthly'];
      
      for (const period of timePeriods) {
        const metricsData = createTestEngagementMetricsData({
          timePeriod: period,
          metricValue: Math.floor(Math.random() * 100) + 10
        });

        await request(SERVER_URL)
          .post('/api/engagement-metrics')
          .set('Authorization', `Bearer ${apiToken}`)
          .send({ data: metricsData })
          .expect(201);
      }

      // Get aggregated metrics
      const aggregatedResponse = await request(SERVER_URL)
        .get('/api/engagement-metrics/aggregated?timePeriod=daily&date=' + new Date().toISOString().split('T')[0])
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(200);

      expect(aggregatedResponse.body.data).toBeDefined();
      expect(aggregatedResponse.body.data.attributes.aggregationType).toBe('daily');
      expect(aggregatedResponse.body.data.attributes.totalUsers).toBeGreaterThan(0);
      expect(aggregatedResponse.body.data.attributes.totalPageViews).toBeGreaterThan(0);
    });

    it('should generate comprehensive engagement reports', async () => {
      // Create test data for reporting
      const reportData = createTestAggregatedMetricsData();

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/reports')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: reportData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.aggregationType).toBe(reportData.aggregationType);
      expect(response.body.data.attributes.totalUsers).toBe(reportData.totalUsers);
      expect(response.body.data.attributes.totalPageViews).toBe(reportData.totalPageViews);
      expect(response.body.data.attributes.topPages).toBeDefined();
      expect(response.body.data.attributes.userSegments).toBeDefined();
    });

    it('should generate user-specific engagement reports', async () => {
      const userReportData = createTestEngagementSummaryData();

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/user-reports')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: userReportData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.userId).toBe(userReportData.userId);
      expect(response.body.data.attributes.totalPageViews).toBe(userReportData.totalPageViews);
      expect(response.body.data.attributes.engagementScore).toBe(userReportData.engagementScore);
      expect(response.body.data.attributes.metrics).toBeDefined();
    });

    it('should generate comparative engagement reports', async () => {
      const comparisonData = {
        timePeriod: 'weekly',
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        comparisonType: 'previous_period',
        metrics: ['page_views', 'time_spent', 'conversions']
      };

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/comparative-reports')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: comparisonData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.timePeriod).toBe(comparisonData.timePeriod);
      expect(response.body.data.attributes.comparisonType).toBe(comparisonData.comparisonType);
      expect(response.body.data.attributes.metrics).toBeDefined();
      expect(response.body.data.attributes.comparisonResults).toBeDefined();
    });

    it('should handle real-time metrics aggregation', async () => {
      // Create real-time metrics
      const realtimeMetrics = createTestEngagementMetricsData({
        metricType: 'realtime_activity',
        metricValue: 1,
        metadata: {
          activeUsers: 25,
          currentPageViews: 150,
          averageResponseTime: 250
        }
      });

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/realtime')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: realtimeMetrics })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.metricType).toBe('realtime_activity');
      expect(response.body.data.attributes.metadata.activeUsers).toBe(25);
      expect(response.body.data.attributes.metadata.currentPageViews).toBe(150);
    });
  });

  describe('Metrics Visualization and Dashboards', () => {
    it('should provide dashboard data for engagement metrics', async () => {
      // Create dashboard data
      const dashboardData = {
        dashboardType: 'engagement_overview',
        timeRange: '7days',
        widgets: [
          'total_users',
          'page_views',
          'engagement_score',
          'conversion_rate',
          'top_pages',
          'user_segments'
        ],
        filters: {
          userSegment: 'all',
          deviceType: 'all',
          trafficSource: 'all'
        }
      };

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/dashboard')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: dashboardData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.dashboardType).toBe(dashboardData.dashboardType);
      expect(response.body.data.attributes.widgets).toBeDefined();
      expect(response.body.data.attributes.widgets.length).toBe(dashboardData.widgets.length);
    });

    it('should provide chart data for engagement visualization', async () => {
      const chartData = {
        chartType: 'line',
        metric: 'page_views',
        timeRange: '30days',
        granularity: 'daily',
        filters: {
          userSegment: 'active_users'
        }
      };

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/chart-data')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: chartData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.chartType).toBe(chartData.chartType);
      expect(response.body.data.attributes.metric).toBe(chartData.metric);
      expect(response.body.data.attributes.dataPoints).toBeDefined();
    });

    it('should provide KPI data for engagement metrics', async () => {
      const kpiData = {
        kpiType: 'engagement_summary',
        timeRange: 'today',
        metrics: [
          'total_active_users',
          'average_session_duration',
          'bounce_rate',
          'conversion_rate',
          'engagement_score'
        ]
      };

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/kpi')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: kpiData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.kpiType).toBe(kpiData.kpiType);
      expect(response.body.data.attributes.metrics).toBeDefined();
      expect(response.body.data.attributes.metrics.length).toBe(kpiData.metrics.length);
    });

    it('should provide heatmap data for user engagement patterns', async () => {
      const heatmapData = {
        heatmapType: 'page_engagement',
        timeRange: '7days',
        pages: ['/products', '/cart', '/checkout', '/profile'],
        granularity: 'hourly'
      };

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/heatmap')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: heatmapData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.heatmapType).toBe(heatmapData.heatmapType);
      expect(response.body.data.attributes.heatmapData).toBeDefined();
      expect(response.body.data.attributes.heatmapData.length).toBeGreaterThan(0);
    });
  });

  describe('Metrics Performance Optimization', () => {
    it('should handle large datasets efficiently', async () => {
      const startTime = Date.now();
      
      // Create multiple metrics entries
      const metricsPromises: any[] = [];
      for (let i = 0; i < 100; i++) {
        const metricsData = createTestEngagementMetricsData({
          metricValue: Math.floor(Math.random() * 100) + 1,
          metadata: { batchId: i, testRun: true }
        });
        
        metricsPromises.push(
          request(SERVER_URL)
            .post('/api/engagement-metrics')
            .set('Authorization', `Bearer ${apiToken}`)
            .send({ data: metricsData })
        );
      }

      const responses = await Promise.all(metricsPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all requests succeeded
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Performance should be reasonable (less than 30 seconds for 100 requests)
      expect(duration).toBeLessThan(30000);
    });

    it('should handle concurrent metrics updates', async () => {
      const concurrentUpdates: any[] = [];
      
      // Simulate concurrent updates to the same user's metrics
      for (let i = 0; i < 10; i++) {
        const updateData = createTestEngagementMetricsData({
          metricValue: 10 + i,
          metadata: { concurrentUpdate: i }
        });
        
        concurrentUpdates.push(
          request(SERVER_URL)
            .post('/api/engagement-metrics')
            .set('Authorization', `Bearer ${apiToken}`)
            .send({ data: updateData })
        );
      }

      const responses = await Promise.all(concurrentUpdates);
      
      // All concurrent updates should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
    });

    it('should optimize metrics queries with proper indexing', async () => {
      // Create test metrics with different time periods
      const timePeriods = ['hourly', 'daily', 'weekly'];
      
      for (const period of timePeriods) {
        const metricsData = createTestEngagementMetricsData({
          timePeriod: period,
          metricValue: Math.floor(Math.random() * 100) + 1
        });

        await request(SERVER_URL)
          .post('/api/engagement-metrics')
          .set('Authorization', `Bearer ${apiToken}`)
          .send({ data: metricsData })
          .expect(201);
      }

      // Query with filters should be fast
      const startTime = Date.now();
      const queryResponse = await request(SERVER_URL)
        .get('/api/engagement-metrics?filters[timePeriod][$eq]=daily&filters[date][$eq]=' + new Date().toISOString().split('T')[0])
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(200);
      const endTime = Date.now();

      expect(queryResponse.body.data).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle metrics pagination efficiently', async () => {
      // Create multiple metrics for pagination testing
      for (let i = 0; i < 25; i++) {
        const metricsData = createTestEngagementMetricsData({
          metricValue: i + 1,
          metadata: { paginationTest: true, index: i }
        });

        await request(SERVER_URL)
          .post('/api/engagement-metrics')
          .set('Authorization', `Bearer ${apiToken}`)
          .send({ data: metricsData })
          .expect(201);
      }

      // Test pagination
      const page1Response = await request(SERVER_URL)
        .get('/api/engagement-metrics?pagination[page]=1&pagination[pageSize]=10')
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(200);

      const page2Response = await request(SERVER_URL)
        .get('/api/engagement-metrics?pagination[page]=2&pagination[pageSize]=10')
        .set('Authorization', `Bearer ${apiToken}`)
        .expect(200);

      expect(page1Response.body.data).toBeDefined();
      expect(page2Response.body.data).toBeDefined();
      expect(page1Response.body.data.length).toBe(10);
      expect(page2Response.body.data.length).toBe(10);
      expect(page1Response.body.meta.pagination.page).toBe(1);
      expect(page2Response.body.meta.pagination.page).toBe(2);
    });
  });

  describe('Metrics Data Accuracy and Validation', () => {
    it('should validate engagement metrics data accuracy', async () => {
      const metricsData = createTestEngagementMetricsData({
        metricValue: 50,
        metadata: {
          validationTest: true,
          expectedAccuracy: 0.95
        }
      });

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: metricsData })
        .expect(201);

      // Validate the stored data matches input
      expect(response.body.data.attributes.metricValue).toBe(50);
      expect(response.body.data.attributes.metadata.validationTest).toBe(true);
      expect(response.body.data.attributes.metadata.expectedAccuracy).toBe(0.95);
    });

    it('should detect and flag data anomalies', async () => {
      const anomalyData = createTestEngagementMetricsData({
        metricValue: 999999, // Unusually high value
        metadata: {
          anomalyTest: true,
          expectedRange: { min: 0, max: 1000 }
        }
      });

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/anomaly-detection')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: anomalyData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.anomalyDetected).toBe(true);
      expect(response.body.data.attributes.anomalyType).toBeDefined();
      expect(response.body.data.attributes.confidenceScore).toBeGreaterThan(0);
    });

    it('should validate metrics consistency across time periods', async () => {
      const baseDate = new Date().toISOString().split('T')[0];
      const timePeriods = ['hourly', 'daily', 'weekly'];
      
      // Create consistent metrics across time periods
      for (const period of timePeriods) {
        const metricsData = createTestEngagementMetricsData({
          timePeriod: period,
          date: baseDate,
          metricValue: 100, // Same value across periods
          metadata: { consistencyTest: true }
        });

        await request(SERVER_URL)
          .post('/api/engagement-metrics')
          .set('Authorization', `Bearer ${apiToken}`)
          .send({ data: metricsData })
          .expect(201);
      }

      // Validate consistency
      const consistencyResponse = await request(SERVER_URL)
        .post('/api/engagement-metrics/validate-consistency')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ 
          data: { 
            date: baseDate,
            timePeriods: timePeriods
          }
        })
        .expect(200);

      expect(consistencyResponse.body.data).toBeDefined();
      expect(consistencyResponse.body.data.attributes.isConsistent).toBe(true);
      expect(consistencyResponse.body.data.attributes.consistencyScore).toBeGreaterThan(0.9);
    });

    it('should validate metrics data integrity', async () => {
      const integrityData = createTestEngagementMetricsData({
        metricValue: 75,
        metadata: {
          integrityTest: true,
          checksum: 'abc123def456'
        }
      });

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: integrityData })
        .expect(201);

      // Validate data integrity
      const integrityResponse = await request(SERVER_URL)
        .post('/api/engagement-metrics/validate-integrity')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ 
          data: { 
            documentId: response.body.data.id,
            expectedChecksum: 'abc123def456'
          }
        })
        .expect(200);

      expect(integrityResponse.body.data).toBeDefined();
      expect(integrityResponse.body.data.attributes.integrityValid).toBe(true);
      expect(integrityResponse.body.data.attributes.checksumMatch).toBe(true);
    });

    it('should handle metrics data reconciliation', async () => {
      const reconciliationData = {
        sourceSystem: 'analytics',
        targetSystem: 'engagement_metrics',
        timeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        metrics: ['page_views', 'time_spent', 'conversions']
      };

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/reconcile')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: reconciliationData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.sourceSystem).toBe(reconciliationData.sourceSystem);
      expect(response.body.data.attributes.targetSystem).toBe(reconciliationData.targetSystem);
      expect(response.body.data.attributes.reconciliationResults).toBeDefined();
      expect(response.body.data.attributes.discrepancies).toBeDefined();
    });
  });

  describe('Metrics Privacy and Anonymization', () => {
    it('should anonymize user data in metrics', async () => {
      const sensitiveData = createTestEngagementMetricsData({
        userId: testUser.id,
        metadata: {
          sensitiveInfo: 'user@example.com',
          personalData: {
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890'
          }
        }
      });

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/anonymize')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: sensitiveData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.anonymizedData).toBeDefined();
      expect(response.body.data.attributes.anonymizedData.metadata.sensitiveInfo).not.toBe('user@example.com');
      expect(response.body.data.attributes.anonymizedData.metadata.personalData).toBeUndefined();
    });

    it('should handle GDPR compliance for metrics data', async () => {
      const gdprData = {
        userId: testUser.id,
        requestType: 'data_export',
        includeMetrics: true,
        timeRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        }
      };

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/gdpr-compliance')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: gdprData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.requestType).toBe(gdprData.requestType);
      expect(response.body.data.attributes.exportData).toBeDefined();
      expect(response.body.data.attributes.complianceStatus).toBe('compliant');
    });

    it('should handle data retention policies for metrics', async () => {
      const retentionData = {
        policyType: 'metrics_retention',
        retentionPeriod: 90, // days
        dataTypes: ['engagement_metrics', 'user_behavior', 'activity_logs'],
        action: 'archive_old_data'
      };

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/retention-policy')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: retentionData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.policyType).toBe(retentionData.policyType);
      expect(response.body.data.attributes.retentionPeriod).toBe(retentionData.retentionPeriod);
      expect(response.body.data.attributes.processedRecords).toBeDefined();
      expect(response.body.data.attributes.archivedRecords).toBeDefined();
    });

    it('should handle consent management for metrics tracking', async () => {
      const consentData = {
        userId: testUser.id,
        consentType: 'analytics_tracking',
        consentGiven: true,
        consentDate: new Date().toISOString(),
        consentVersion: '1.0',
        dataTypes: ['engagement_metrics', 'behavior_analytics']
      };

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/consent-management')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: consentData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.consentType).toBe(consentData.consentType);
      expect(response.body.data.attributes.consentGiven).toBe(consentData.consentGiven);
      expect(response.body.data.attributes.consentVersion).toBe(consentData.consentVersion);
    });

    it('should handle metrics data masking for privacy', async () => {
      const maskingData = createTestEngagementMetricsData({
        userId: testUser.id,
        metadata: {
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          location: 'New York, NY',
          deviceId: 'device_123456'
        }
      });

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/mask-data')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: maskingData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.maskedData).toBeDefined();
      expect(response.body.data.attributes.maskedData.metadata.ipAddress).not.toBe('192.168.1.100');
      expect(response.body.data.attributes.maskedData.metadata.deviceId).not.toBe('device_123456');
    });
  });

  describe('Metrics Export and Integration', () => {
    it('should export engagement metrics to CSV format', async () => {
      // Create test metrics for export
      const exportMetrics = createTestEngagementMetricsData({
        metricValue: 100,
        metadata: { exportTest: true }
      });

      await request(SERVER_URL)
        .post('/api/engagement-metrics')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: exportMetrics })
        .expect(201);

      // Export to CSV
      const exportResponse = await request(SERVER_URL)
        .post('/api/engagement-metrics/export')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ 
          data: { 
            format: 'csv',
            timeRange: 'today',
            metrics: ['page_views', 'time_spent', 'engagement_score']
          }
        })
        .expect(200);

      expect(exportResponse.body.data).toBeDefined();
      expect(exportResponse.body.data.attributes.format).toBe('csv');
      expect(exportResponse.body.data.attributes.exportUrl).toBeDefined();
      expect(exportResponse.body.data.attributes.recordCount).toBeGreaterThan(0);
    });

    it('should export engagement metrics to JSON format', async () => {
      const exportResponse = await request(SERVER_URL)
        .post('/api/engagement-metrics/export')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ 
          data: { 
            format: 'json',
            timeRange: '7days',
            includeMetadata: true,
            metrics: ['all']
          }
        })
        .expect(200);

      expect(exportResponse.body.data).toBeDefined();
      expect(exportResponse.body.data.attributes.format).toBe('json');
      expect(exportResponse.body.data.attributes.exportData).toBeDefined();
      expect(exportResponse.body.data.attributes.includeMetadata).toBe(true);
    });

    it('should integrate with external analytics platforms', async () => {
      const integrationData = {
        platform: 'google_analytics',
        integrationType: 'engagement_metrics',
        timeRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        metrics: ['page_views', 'session_duration', 'bounce_rate'],
        apiKey: 'test_api_key_123'
      };

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/integrate')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: integrationData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.platform).toBe(integrationData.platform);
      expect(response.body.data.attributes.integrationType).toBe(integrationData.integrationType);
      expect(response.body.data.attributes.integrationStatus).toBeDefined();
      expect(response.body.data.attributes.syncResults).toBeDefined();
    });

    it('should handle real-time metrics streaming', async () => {
      const streamingData = {
        streamType: 'engagement_metrics',
        metrics: ['active_users', 'page_views', 'conversions'],
        updateFrequency: '1minute',
        destination: 'websocket'
      };

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/stream')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: streamingData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.streamType).toBe(streamingData.streamType);
      expect(response.body.data.attributes.updateFrequency).toBe(streamingData.updateFrequency);
      expect(response.body.data.attributes.streamUrl).toBeDefined();
      expect(response.body.data.attributes.connectionId).toBeDefined();
    });

    it('should handle metrics data backup and restore', async () => {
      const backupData = {
        backupType: 'engagement_metrics',
        timeRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        includeMetadata: true,
        compression: 'gzip'
      };

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/backup')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: backupData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.backupType).toBe(backupData.backupType);
      expect(response.body.data.attributes.backupUrl).toBeDefined();
      expect(response.body.data.attributes.backupSize).toBeDefined();
      expect(response.body.data.attributes.compression).toBe(backupData.compression);
    });

    it('should handle metrics data migration', async () => {
      const migrationData = {
        sourceSystem: 'legacy_analytics',
        targetSystem: 'engagement_metrics',
        migrationType: 'full_migration',
        timeRange: {
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        dataMapping: {
          'legacy_page_views': 'page_views',
          'legacy_time_spent': 'time_spent',
          'legacy_conversions': 'conversions'
        }
      };

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/migrate')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: migrationData })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.attributes.sourceSystem).toBe(migrationData.sourceSystem);
      expect(response.body.data.attributes.targetSystem).toBe(migrationData.targetSystem);
      expect(response.body.data.attributes.migrationType).toBe(migrationData.migrationType);
      expect(response.body.data.attributes.migrationStatus).toBeDefined();
      expect(response.body.data.attributes.migratedRecords).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid engagement metrics data', async () => {
      const invalidData = {
        metricType: '', // Invalid empty type
        metricValue: -1, // Invalid negative value
        timePeriod: 'invalid_period' // Invalid time period
      };

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: invalidData })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('validation');
    });

    it('should handle missing user data gracefully', async () => {
      const missingUserData = createTestEngagementMetricsData({
        userId: 999999 // Non-existent user
      });

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: missingUserData })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle metrics calculation errors', async () => {
      const errorData = {
        userId: testUser.id,
        metricType: 'invalid_calculation',
        metricValue: 'invalid_value' // Invalid type
      };

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/calculate-score')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: errorData })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle export failures gracefully', async () => {
      const exportData = {
        format: 'invalid_format',
        timeRange: 'invalid_range'
      };

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/export')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: exportData })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle integration failures', async () => {
      const integrationData = {
        platform: 'invalid_platform',
        apiKey: 'invalid_key'
      };

      const response = await request(SERVER_URL)
        .post('/api/engagement-metrics/integrate')
        .set('Authorization', `Bearer ${apiToken}`)
        .send({ data: integrationData })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
