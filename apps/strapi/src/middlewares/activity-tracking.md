# Activity Tracking Middleware

A comprehensive activity tracking middleware for Strapi that monitors user interactions, authentication events, and system activities for analytics and security purposes.

## Features

- **User Activity Tracking**: Tracks login, logout, profile updates, and other user interactions
- **Privacy Compliant**: IP anonymization and configurable data collection
- **Device Detection**: Browser, OS, and device information parsing
- **Location Tracking**: IP-based geolocation (optional)
- **Session Management**: Session tracking and duration measurement
- **Error Monitoring**: Tracks failed requests and errors
- **Configurable**: Highly configurable endpoints and privacy settings
- **TypeScript Support**: Full TypeScript support with proper types
- **Strapi 5 Compatible**: Uses Document Service API

## Installation

The middleware is already configured in your Strapi application. It's registered in `config/middlewares.ts`:

```typescript
export default [
  // ... other middlewares
  'global::activity-tracking', // Activity tracking middleware
];
```

## Configuration

The middleware can be configured by modifying the configuration object. Here's the default configuration:

```typescript
import { defaultConfig } from './activity-tracking.config';

const config = {
  enabled: true,
  
  trackableEndpoints: [
    '/api/auth/local',
    '/api/auth/local/register',
    '/api/users/me',
    '/api/user-preferences',
    '/api/privacy-settings',
    '/api/products',
    '/api/orders',
    '/api/cart'
  ],
  
  excludedEndpoints: [
    '/api/user-activities',
    '/api/user-behavior',
    '/api/security-events',
    '/api/engagement-metrics',
    '/api/analytics',
    '/admin'
  ],
  
  trackableActivityTypes: [
    'login',
    'logout',
    'profile_update',
    'preference_change',
    'page_view',
    'product_interaction',
    'account_created',
    'password_change',
    'session_expired'
  ],
  
  privacy: {
    anonymizeIP: true,        // Anonymize IP addresses
    trackLocation: true,      // Track location data
    trackDeviceInfo: true     // Track device information
  },
  
  performance: {
    batchSize: 100,           // Batch size for bulk operations
    asyncProcessing: true     // Async processing (don't block request)
  }
};
```

## Activity Types

The middleware tracks the following activity types:

- **`login`**: User authentication
- **`logout`**: User logout
- **`profile_update`**: Profile information updates
- **`preference_change`**: User preference changes
- **`page_view`**: Page views (for authenticated users)
- **`product_interaction`**: Product-related interactions
- **`account_created`**: New account creation
- **`password_change`**: Password changes
- **`session_expired`**: Session expiration events

## Data Structure

Each activity record contains:

```typescript
{
  user: string | null,           // User documentId
  activityType: string,          // Activity type
  activityData: {                // Activity-specific data
    url: string,
    method: string,
    timestamp: string,
    endpoint?: string,
    action?: string,
    queryParams?: object
  },
  ipAddress: string | null,      // Anonymized IP address
  userAgent: string | null,      // User agent string
  location: string | null,       // Location (city, region, country)
  deviceInfo: {                  // Device information
    browser: string | null,
    os: string | null,
    device: string | null,
    mobile: boolean
  },
  sessionId: string,             // Session identifier
  sessionDuration?: number,      // Session duration in ms
  success: boolean,              // Whether the activity succeeded
  errorMessage?: string,         // Error message if failed
  metadata: {                    // Additional metadata
    timestamp: string,
    serverTime: number
  }
}
```

## Privacy Features

### IP Anonymization

IP addresses are automatically anonymized for privacy compliance:

- **IPv4**: Last octet removed (e.g., `192.168.1.100` → `192.168.1.0`)
- **IPv6**: Last 64 bits removed (e.g., `2001:0db8:85a3:0000:0000:8a2e:0370:7334` → `2001:0db8:85a3:0000::`)

### Configurable Data Collection

You can disable specific data collection:

```typescript
const config = {
  privacy: {
    anonymizeIP: false,      // Disable IP anonymization
    trackLocation: false,    // Disable location tracking
    trackDeviceInfo: false   // Disable device info tracking
  }
};
```

## Usage Examples

### Basic Usage

The middleware works automatically once configured. It will track activities for all configured endpoints.

### Custom Configuration

To customize the middleware behavior, you can modify the configuration:

```typescript
// In your Strapi configuration
const customConfig = {
  enabled: true,
  trackableEndpoints: [
    '/api/auth/local',
    '/api/products',
    '/api/orders'
  ],
  privacy: {
    anonymizeIP: true,
    trackLocation: false,  // Disable location tracking
    trackDeviceInfo: true
  }
};
```

### Querying Activity Data

You can query activity data through the Strapi API:

```typescript
// Get user activities
const activities = await strapi.documents('api::user-activity.user-activity').findMany({
  filters: {
    user: 'user-document-id',
    activityType: 'login'
  },
  sort: { createdAt: 'desc' },
  pagination: { page: 1, pageSize: 10 }
});
```

## Testing

The middleware includes comprehensive tests. Run them with:

```bash
npm test activity-tracking
```

## Performance Considerations

- **Async Processing**: Activity tracking doesn't block the main request flow
- **Error Handling**: Tracking failures don't affect the main request
- **Batch Operations**: Supports batch processing for high-volume scenarios
- **Configurable Endpoints**: Only track necessary endpoints to minimize overhead

## Security Considerations

- **Infinite Loop Prevention**: Analytics endpoints are excluded to prevent infinite loops
- **Admin Protection**: Admin endpoints are not tracked
- **Error Isolation**: Tracking errors don't affect main application functionality
- **Data Validation**: Activity types are validated against allowed values

## Troubleshooting

### Common Issues

1. **Activities not being tracked**
   - Check if the endpoint is in `trackableEndpoints`
   - Verify the endpoint is not in `excludedEndpoints`
   - Ensure `enabled` is set to `true`

2. **Performance issues**
   - Reduce the number of tracked endpoints
   - Enable `asyncProcessing`
   - Check database performance

3. **Privacy concerns**
   - Enable `anonymizeIP`
   - Disable `trackLocation` if not needed
   - Review `trackableEndpoints` list

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
const config = {
  enabled: true,
  debug: true  // Enable debug logging
};
```

## Contributing

When contributing to this middleware:

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure TypeScript types are correct
5. Test with Strapi 5 Document Service API

## License

This middleware is part of the project and follows the same license terms.
