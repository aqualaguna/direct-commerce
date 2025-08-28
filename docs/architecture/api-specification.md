# API Specification

## Overview

This document defines the REST API specification for the Single-Seller Ecommerce Platform built on Strapi. The API follows RESTful principles and provides endpoints for all ecommerce functionality.

## Base Configuration

```yaml
openapi: 3.0.0
info:
  title: Single-Seller Ecommerce Platform API
  version: 1.0.0
  description: REST API for the Single-Seller Ecommerce Platform built on Strapi
servers:
  - url: https://api.yourstore.com
    description: Production API server
  - url: https://api-staging.yourstore.com
    description: Staging API server
```

## Authentication

All protected endpoints require JWT authentication via Bearer token:

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

## Product Endpoints

### Get Products
```yaml
/api/products:
  get:
    summary: Get products
    parameters:
      - name: page
        in: query
        schema:
          type: integer
          default: 1
      - name: pageSize
        in: query
        schema:
          type: integer
          default: 25
      - name: category
        in: query
        schema:
          type: string
      - name: search
        in: query
        schema:
          type: string
      - name: featured
        in: query
        schema:
          type: boolean
      - name: sort
        in: query
        schema:
          type: string
          enum: [price_asc, price_desc, name_asc, name_desc, created_desc]
    responses:
      '200':
        description: List of products
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductList'
```

### Get Product by ID
```yaml
/api/products/{id}:
  get:
    summary: Get product by ID
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    responses:
      '200':
        description: Product details
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Product'
      '404':
        description: Product not found
```

### Create Product (Admin Only)
```yaml
/api/products:
  post:
    summary: Create product
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ProductInput'
    responses:
      '201':
        description: Product created
      '401':
        description: Unauthorized
      '400':
        description: Validation error
```

## Category Endpoints

### Get Categories
```yaml
/api/categories:
  get:
    summary: Get categories
    parameters:
      - name: parent
        in: query
        schema:
          type: string
    responses:
      '200':
        description: List of categories
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CategoryList'
```

### Get Category by ID
```yaml
/api/categories/{id}:
  get:
    summary: Get category by ID
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    responses:
      '200':
        description: Category details
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Category'
```

## Authentication Endpoints

### User Login
```yaml
/api/auth/local:
  post:
    summary: User login
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - identifier
              - password
            properties:
              identifier:
                type: string
                description: Email or username
              password:
                type: string
    responses:
      '200':
        description: Login successful
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AuthResponse'
      '400':
        description: Invalid credentials
```

### User Registration
```yaml
/api/auth/local/register:
  post:
    summary: User registration
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/UserRegistration'
    responses:
      '201':
        description: User registered
      '400':
        description: Validation error
```

## Order Endpoints

### Get User Orders
```yaml
/api/orders:
  get:
    summary: Get user orders
    security:
      - bearerAuth: []
    parameters:
      - name: page
        in: query
        schema:
          type: integer
      - name: pageSize
        in: query
        schema:
          type: integer
      - name: status
        in: query
        schema:
          type: string
          enum: [pending, processing, shipped, delivered, cancelled]
    responses:
      '200':
        description: User orders
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrderList'
      '401':
        description: Unauthorized
```

### Create Order
```yaml
/api/orders:
  post:
    summary: Create order
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/OrderInput'
    responses:
      '201':
        description: Order created
      '400':
        description: Validation error
      '401':
        description: Unauthorized
```

### Get Order by ID
```yaml
/api/orders/{id}:
  get:
    summary: Get order by ID
    security:
      - bearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    responses:
      '200':
        description: Order details
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Order'
      '404':
        description: Order not found
```

## User Endpoints

### Get User Profile
```yaml
/api/users/me:
  get:
    summary: Get current user profile
    security:
      - bearerAuth: []
    responses:
      '200':
        description: User profile
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
      '401':
        description: Unauthorized
```

### Update User Profile
```yaml
/api/users/me:
  put:
    summary: Update current user profile
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/UserUpdate'
    responses:
      '200':
        description: Profile updated
      '400':
        description: Validation error
```

## Address Endpoints

### Get User Addresses
```yaml
/api/addresses:
  get:
    summary: Get user addresses
    security:
      - bearerAuth: []
    responses:
      '200':
        description: User addresses
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AddressList'
```

### Create Address
```yaml
/api/addresses:
  post:
    summary: Create address
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/AddressInput'
    responses:
      '201':
        description: Address created
```

## Data Schemas

### Product
```yaml
Product:
  type: object
  properties:
    id:
      type: string
    title:
      type: string
    slug:
      type: string
    description:
      type: string
    shortDescription:
      type: string
    price:
      type: number
      description: Price in cents
    comparePrice:
      type: number
      description: Compare price in cents
    sku:
      type: string
    inventory:
      type: integer
    isActive:
      type: boolean
    featured:
      type: boolean
    images:
      type: array
      items:
        $ref: '#/components/schemas/Media'
    category:
      $ref: '#/components/schemas/Category'
    tags:
      type: array
      items:
        $ref: '#/components/schemas/Tag'
    createdAt:
      type: string
      format: date-time
    updatedAt:
      type: string
      format: date-time
```

### Category
```yaml
Category:
  type: object
  properties:
    id:
      type: string
    name:
      type: string
    slug:
      type: string
    description:
      type: string
    image:
      $ref: '#/components/schemas/Media'
    parent:
      $ref: '#/components/schemas/Category'
    children:
      type: array
      items:
        $ref: '#/components/schemas/Category'
    isActive:
      type: boolean
    sortOrder:
      type: integer
```

### Order
```yaml
Order:
  type: object
  properties:
    id:
      type: string
    orderNumber:
      type: string
    status:
      type: string
      enum: [pending, processing, shipped, delivered, cancelled]
    items:
      type: array
      items:
        $ref: '#/components/schemas/OrderItem'
    subtotal:
      type: number
      description: Subtotal in cents
    tax:
      type: number
      description: Tax in cents
    shipping:
      type: number
      description: Shipping in cents
    total:
      type: number
      description: Total in cents
    paymentStatus:
      type: string
      enum: [pending, paid, failed, refunded]
    paymentMethod:
      type: string
    shippingMethod:
      type: string
    trackingNumber:
      type: string
    shippingAddress:
      $ref: '#/components/schemas/AddressComponent'
    billingAddress:
      $ref: '#/components/schemas/AddressComponent'
    createdAt:
      type: string
      format: date-time
    updatedAt:
      type: string
      format: date-time
```

### Media
```yaml
Media:
  type: object
  properties:
    id:
      type: string
    url:
      type: string
    alternativeText:
      type: string
    width:
      type: integer
    height:
      type: integer
    mime:
      type: string
    size:
      type: number
```

### Pagination Meta
```yaml
PaginationMeta:
  type: object
  properties:
    pagination:
      type: object
      properties:
        page:
          type: integer
        pageSize:
          type: integer
        pageCount:
          type: integer
        total:
          type: integer
```

## Error Responses

### Standard Error Format
```yaml
Error:
  type: object
  properties:
    error:
      type: object
      properties:
        code:
          type: string
        message:
          type: string
        details:
          type: object
        timestamp:
          type: string
          format: date-time
        requestId:
          type: string
```

### Common Error Codes
- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_ERROR`: Invalid or missing authentication
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Rate Limiting

- **Public endpoints:** 100 requests per minute
- **Authenticated endpoints:** 1000 requests per minute
- **Admin endpoints:** 5000 requests per minute

## CORS Configuration

```javascript
// Strapi CORS configuration
module.exports = ({ env }) => ({
  settings: {
    cors: {
      enabled: true,
      origin: [
        'http://localhost:4321', // Development
        'https://yourstore.com', // Production
        'https://staging.yourstore.com', // Staging
      ],
      credentials: true,
    },
  },
});
```
