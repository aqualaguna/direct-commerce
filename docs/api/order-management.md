# Order Management System Documentation

## Overview

The Order Management System provides comprehensive functionality for creating, managing, and tracking ecommerce orders. It integrates with the shopping cart, checkout process, and payment systems to provide a complete order lifecycle management solution.

## Architecture

### Core Components

1. **Order Content Types**
   - `Order` - Main order entity
   - `OrderItem` - Individual items within an order
   - `OrderStatus` - Order status history and tracking
   - `OrderConfirmation` - Order confirmations and receipts
   - `OrderHistory` - Audit trail and change history
   - `OrderTracking` - Shipment tracking and updates

2. **Services**
   - `order-creation` - Order creation from cart
   - `order-status-management` - Status transitions and automation
   - `receipt-generation` - Confirmation and receipt generation
   - `order-history` - History tracking and audit
   - `order-tracking` - Carrier integration and tracking

3. **API Endpoints**
   - RESTful API for order management
   - Real-time status updates
   - Analytics and reporting endpoints

## API Reference

### Base URL
```
/api/orders
```

### Authentication
All endpoints require authentication using JWT tokens:
```
Authorization: Bearer <jwt_token>
```

### Endpoints

#### Create Order
```http
POST /api/orders
```

**Request Body:**
```json
{
  "cartId": "cart-123",
  "checkoutSessionId": "checkout-456",
  "paymentIntentId": "payment-789",
  "customerNotes": "Please deliver after 6 PM",
  "giftOptions": {
    "isGift": true,
    "giftMessage": "Happy Birthday!"
  },
  "promoCode": "SAVE10",
  "source": "web",
  "metadata": {
    "referrer": "google",
    "campaign": "summer_sale"
  }
}
```

**Response:**
```json
{
  "documentId": "order-123",
  "orderNumber": "ORD-2024-001",
  "status": "pending",
  "paymentStatus": "pending",
  "total": 12999,
  "currency": "USD",
  "items": [...],
  "createdAt": "2024-12-25T10:00:00Z"
}
```

#### Get Orders
```http
GET /api/orders?page=1&pageSize=25&status=pending&startDate=2024-12-01&endDate=2024-12-31
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 25, max: 100)
- `status` - Filter by order status
- `paymentStatus` - Filter by payment status
- `startDate` - Filter orders from date
- `endDate` - Filter orders to date
- `search` - Search in order number, customer email

**Response:**
```json
{
  "results": [...],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 150,
    "pageCount": 6
  }
}
```

#### Get Order by ID
```http
GET /api/orders/{orderId}
```

**Response:**
```json
{
  "documentId": "order-123",
  "orderNumber": "ORD-2024-001",
  "user": {
    "documentId": "user-456",
    "email": "customer@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "status": "confirmed",
  "paymentStatus": "paid",
  "subtotal": 11999,
  "tax": 1000,
  "shipping": 0,
  "discount": 0,
  "total": 12999,
  "currency": "USD",
  "shippingAddress": {...},
  "billingAddress": {...},
  "items": [...],
  "createdAt": "2024-12-25T10:00:00Z",
  "updatedAt": "2024-12-25T10:30:00Z"
}
```

#### Update Order
```http
PUT /api/orders/{orderId}
```

**Request Body:**
```json
{
  "adminNotes": "Customer requested expedited shipping",
  "trackingNumber": "TRK123456789",
  "estimatedDelivery": "2024-12-28T10:00:00Z"
}
```

#### Update Order Status
```http
POST /api/orders/{orderId}/status
```

**Request Body:**
```json
{
  "status": "shipped",
  "notes": "Package shipped via FedEx"
}
```

#### Delete Order (Admin Only)
```http
DELETE /api/orders/{orderId}
```

#### Get Order Statistics
```http
GET /api/orders/stats
```

**Response:**
```json
{
  "totalOrders": 1500,
  "totalRevenue": 15000000,
  "averageOrderValue": 10000,
  "ordersThisMonth": 150,
  "revenueThisMonth": 1500000,
  "statusCounts": {
    "pending": 25,
    "confirmed": 50,
    "processing": 30,
    "shipped": 40,
    "delivered": 300,
    "cancelled": 5,
    "refunded": 10
  }
}
```

#### Search Orders
```http
GET /api/orders/search?q=ORD-2024&status=pending
```

**Query Parameters:**
- `q` - Search query
- `status` - Filter by status
- `dateRange` - Date range filter

### Order Tracking Endpoints

#### Create Tracking Record
```http
POST /api/orders/{orderId}/tracking
```

**Request Body:**
```json
{
  "trackingNumber": "TRK123456789",
  "carrier": "fedex",
  "estimatedDelivery": "2024-12-28T10:00:00Z",
  "packageWeight": 2.5,
  "signatureRequired": true
}
```

#### Get Tracking Information
```http
GET /api/orders/{orderId}/tracking
```

#### Update Tracking Status
```http
PUT /api/orders/{orderId}/tracking
```

**Request Body:**
```json
{
  "status": "in_transit",
  "location": "Distribution Center",
  "description": "Package in transit"
}
```

### Analytics Endpoints

#### Get Order Analytics
```http
GET /api/orders/analytics?dateRange=30d
```

**Query Parameters:**
- `dateRange` - Date range (7d, 30d, 90d, 1y)

**Response:**
```json
{
  "stats": {
    "totalOrders": 1500,
    "totalRevenue": 15000000,
    "averageOrderValue": 10000,
    "ordersThisMonth": 150,
    "revenueThisMonth": 1500000
  },
  "trends": [
    {
      "date": "2024-12-25",
      "orders": 15,
      "revenue": 150000
    }
  ],
  "statusDistribution": [
    {
      "status": "delivered",
      "count": 300,
      "percentage": 20
    }
  ],
  "topProducts": [
    {
      "productName": "Product A",
      "quantity": 50,
      "revenue": 500000
    }
  ]
}
```

## Data Models

### Order Schema
```typescript
interface Order {
  documentId: string;
  orderNumber: string;
  user: User;
  cart?: Cart;
  checkoutSession?: CheckoutSession;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  shippingAddress: AddressComponent;
  billingAddress: AddressComponent;
  paymentStatus: 'pending' | 'confirmed' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  paymentMethod: string;
  manualPayment?: ManualPayment;
  shippingMethod: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  orderSource: 'web' | 'mobile' | 'admin' | 'api';
  customerNotes?: string;
  adminNotes?: string;
  fraudScore?: number;
  isGift: boolean;
  giftMessage?: string;
  referralCode?: string;
  tags: string[];
  metadata: object;
  createdAt: Date;
  updatedAt: Date;
}
```

### OrderItem Schema
```typescript
interface OrderItem {
  documentId: string;
  order: Order;
  productListing: ProductListing;
  productListingVariant?: ProductListingVariant;
  sku: string;
  productName: string;
  productDescription?: string;
  quantity: number;
  unitPrice: number;
  linePrice: number;
  originalPrice?: number;
  discountAmount: number;
  taxAmount: number;
  weight?: number;
  dimensions?: object;
  isDigital: boolean;
  digitalDeliveryStatus?: 'pending' | 'delivered' | 'failed';
  customizations?: object;
  giftWrapping?: boolean;
  returnEligible: boolean;
  warrantyInfo?: string;
}
```

## Order Status Workflow

### Status Transitions
```
pending → confirmed → processing → shipped → delivered
    ↓         ↓           ↓         ↓         ↓
  cancelled  cancelled  cancelled  cancelled  refunded
```

### Status Descriptions
- **pending** - Order created, awaiting payment confirmation
- **confirmed** - Payment confirmed, order ready for processing
- **processing** - Order being prepared for shipment
- **shipped** - Order shipped with tracking information
- **delivered** - Order successfully delivered to customer
- **cancelled** - Order cancelled (before shipment)
- **refunded** - Order refunded (after delivery)

### Automation Rules
- **pending → confirmed**: Automatic when payment is confirmed
- **confirmed → processing**: Automatic after 1 hour (configurable)
- **processing → shipped**: Manual or automatic when tracking is added
- **shipped → delivered**: Automatic when carrier confirms delivery

## Integration Points

### Shopping Cart Integration
- Orders are created from validated shopping carts
- Cart items are converted to order items
- Cart is cleared after successful order creation

### Checkout Integration
- Checkout session data is linked to orders
- Address information from checkout is used
- Payment method selection is preserved

### Payment Integration
- Manual payment system integration (Story 4.3)
- Payment status tracking
- Automatic status updates based on payment confirmation

### Address Management
- Uses shared address component (Story 3.3)
- Shipping and billing address validation
- Address formatting and standardization

## Error Handling

### Common Error Codes
- `400` - Bad Request (invalid data)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (order not found)
- `409` - Conflict (order already exists)
- `422` - Unprocessable Entity (validation errors)
- `500` - Internal Server Error

### Error Response Format
```json
{
  "error": {
    "message": "Order not found",
    "code": "ORDER_NOT_FOUND",
    "details": {
      "orderId": "invalid-order-id"
    }
  }
}
```

## Security Considerations

### Authentication & Authorization
- All endpoints require valid JWT tokens
- User can only access their own orders
- Admin endpoints require admin role
- API rate limiting implemented

### Data Validation
- Input validation on all endpoints
- SQL injection prevention
- XSS protection
- CSRF protection

### Audit Trail
- All order changes are logged
- User actions are tracked
- IP addresses and user agents recorded
- Change history maintained

## Performance Considerations

### Database Optimization
- Indexed fields for common queries
- Pagination for large result sets
- Efficient joins and relationships
- Query optimization

### Caching Strategy
- Order data caching
- Analytics data caching
- Status update caching
- CDN for static assets

### Monitoring
- API response time monitoring
- Error rate tracking
- Database performance monitoring
- User activity analytics

## Testing

### Unit Tests
- Service layer testing
- Controller testing
- Validation testing
- Error handling testing

### Integration Tests
- API endpoint testing
- Database integration testing
- External service integration testing
- End-to-end workflow testing

### Test Coverage
- Minimum 90% code coverage
- All critical paths tested
- Error scenarios covered
- Performance testing included

## Deployment

### Environment Configuration
```env
# Order Management Configuration
ORDER_NUMBER_PREFIX=ORD
ORDER_NUMBER_SEQUENCE_START=1
ORDER_AUTO_CONFIRMATION_DELAY=3600
ORDER_CLEANUP_RETENTION_DAYS=90

# Tracking Configuration
TRACKING_UPDATE_INTERVAL=1800
TRACKING_MAX_RETRIES=3
TRACKING_WEBHOOK_SECRET=your-secret-key

# Analytics Configuration
ANALYTICS_CACHE_TTL=3600
ANALYTICS_BATCH_SIZE=1000
ANALYTICS_EXPORT_FORMATS=csv,json,xlsx
```

### Database Migrations
- Order table creation
- Index creation
- Foreign key constraints
- Data migration scripts

### Monitoring Setup
- Health check endpoints
- Performance metrics
- Error alerting
- Log aggregation

## Troubleshooting

### Common Issues

#### Order Creation Fails
1. Check cart validation
2. Verify payment status
3. Check inventory availability
4. Review error logs

#### Status Update Issues
1. Verify status transition rules
2. Check automation triggers
3. Review notification settings
4. Check database constraints

#### Tracking Problems
1. Verify carrier configuration
2. Check API credentials
3. Review webhook settings
4. Check network connectivity

### Debug Tools
- Order validation endpoint
- Status transition testing
- Tracking simulation
- Performance profiling

### Log Analysis
- Order creation logs
- Status change logs
- Error logs
- Performance logs

## Support

### Documentation
- API documentation
- Integration guides
- Troubleshooting guides
- Best practices

### Contact
- Technical support: tech-support@example.com
- API support: api-support@example.com
- Emergency: emergency-support@example.com

### Resources
- GitHub repository
- Issue tracker
- Community forum
- Knowledge base
