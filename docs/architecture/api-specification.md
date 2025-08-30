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

## Product Endpoints (Base Entity)

### Get Products
```yaml
/api/products:
  get:
    summary: Get base products (admin only)
    security:
      - bearerAuth: []
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
      - name: status
        in: query
        schema:
          type: string
          enum: [draft, active, inactive]
      - name: sort
        in: query
        schema:
          type: string
          enum: [price_asc, price_desc, name_asc, name_desc, created_desc]
    responses:
      '200':
        description: List of base products
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductList'
```

### Get Product by ID
```yaml
/api/products/{id}:
  get:
    summary: Get base product by ID (admin only)
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
        description: Base product details
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Product'
      '404':
        description: Product not found
```

## ProductListing Endpoints (Customer-Facing)

### Get Product Listings
```yaml
/api/product-listings:
  get:
    summary: Get customer-facing product listings
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
      - name: type
        in: query
        schema:
          type: string
          enum: [single, variant]
      - name: sort
        in: query
        schema:
          type: string
          enum: [price_asc, price_desc, name_asc, name_desc, created_desc]
    responses:
      '200':
        description: List of product listings
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductListingList'
```

### Get Product Listing by ID
```yaml
/api/product-listings/{id}:
  get:
    summary: Get product listing by ID
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    responses:
      '200':
        description: Product listing details
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductListing'
      '404':
        description: Product listing not found
```

### Get Product Listings by Type
```yaml
/api/product-listings/type/{type}:
  get:
    summary: Get product listings by type (single/variant)
    parameters:
      - name: type
        in: path
        required: true
        schema:
          type: string
          enum: [single, variant]
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
    responses:
      '200':
        description: List of product listings by type
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductListingList'
```

### Get Product Listing with Variants
```yaml
/api/product-listings/{id}/with-variants:
  get:
    summary: Get product listing with full variant details
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    responses:
      '200':
        description: Product listing with variants
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductListingWithVariants'
      '404':
        description: Product listing not found
```

## ProductListingVariant Endpoints

### Get Product Listing Variants
```yaml
/api/product-listing-variants:
  get:
    summary: List all product listing variants
    security:
      - bearerAuth: []
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
      - name: productListing
        in: query
        schema:
          type: string
      - name: isActive
        in: query
        schema:
          type: boolean
    responses:
      '200':
        description: List of product listing variants
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductListingVariantList'
```

### Get Product Listing Variant by ID
```yaml
/api/product-listing-variants/{id}:
  get:
    summary: Get specific product listing variant
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    responses:
      '200':
        description: Product listing variant details
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductListingVariant'
      '404':
        description: Variant not found
```

### Get Variants by Product Listing
```yaml
/api/product-listing-variants/product-listing/{productListingId}:
  get:
    summary: Get all variants for a specific product listing
    parameters:
      - name: productListingId
        in: path
        required: true
        schema:
          type: string
      - name: isActive
        in: query
        schema:
          type: boolean
    responses:
      '200':
        description: List of variants for product listing
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductListingVariantList'
```

### Find Variant by Options
```yaml
/api/product-listing-variants/product-listing/{productListingId}/find-by-options:
  post:
    summary: Find variant by option combination
    parameters:
      - name: productListingId
        in: path
        required: true
        schema:
          type: string
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              optionValues:
                type: array
                items:
                  type: string
                description: Array of option value IDs
    responses:
      '200':
        description: Matching variant found
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductListingVariant'
      '404':
        description: No matching variant found
```

### Update Variant Inventory
```yaml
/api/product-listing-variants/{id}/inventory:
  put:
    summary: Update variant inventory
    security:
      - bearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              inventory:
                type: integer
                minimum: 0
    responses:
      '200':
        description: Inventory updated successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductListingVariant'
```

### Check Variant Availability
```yaml
/api/product-listing-variants/{id}/check-availability:
  post:
    summary: Check variant availability
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              quantity:
                type: integer
                minimum: 1
    responses:
      '200':
        description: Availability check result
        content:
          application/json:
            schema:
              type: object
              properties:
                available:
                  type: boolean
                availableQuantity:
                  type: integer
                message:
                  type: string
```

### Get Low Stock Variants
```yaml
/api/product-listing-variants/low-stock:
  get:
    summary: Get variants with low stock
    security:
      - bearerAuth: []
    parameters:
      - name: threshold
        in: query
        schema:
          type: integer
          default: 10
    responses:
      '200':
        description: List of low stock variants
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductListingVariantList'
```

### Get Out of Stock Variants
```yaml
/api/product-listing-variants/out-of-stock:
  get:
    summary: Get out of stock variants
    security:
      - bearerAuth: []
    responses:
      '200':
        description: List of out of stock variants
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductListingVariantList'
```

### Validate Variant Selection
```yaml
/api/product-listing-variants/product-listing/{productListingId}/validate-selection:
  post:
    summary: Validate variant selection
    parameters:
      - name: productListingId
        in: path
        required: true
        schema:
          type: string
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              optionValues:
                type: array
                items:
                  type: string
              quantity:
                type: integer
                minimum: 1
    responses:
      '200':
        description: Validation result
        content:
          application/json:
            schema:
              type: object
              properties:
                valid:
                  type: boolean
                variant:
                  $ref: '#/components/schemas/ProductListingVariant'
                message:
                  type: string
```

### Get Variant Options
```yaml
/api/product-listing-variants/product-listing/{productListingId}/options:
  get:
    summary: Get available options for product listing
    parameters:
      - name: productListingId
        in: path
        required: true
        schema:
          type: string
    responses:
      '200':
        description: Available options for product listing
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductListingOptions'
```

### Get Availability Matrix
```yaml
/api/product-listing-variants/product-listing/{productListingId}/availability-matrix:
  get:
    summary: Get variant availability matrix
    parameters:
      - name: productListingId
        in: path
        required: true
        schema:
          type: string
    responses:
      '200':
        description: Availability matrix for product listing
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AvailabilityMatrix'
```

## OptionGroup Endpoints

### Get Option Groups
```yaml
/api/option-groups:
  get:
    summary: List all option groups
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
      - name: isActive
        in: query
        schema:
          type: boolean
    responses:
      '200':
        description: List of option groups
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OptionGroupList'
```

### Get Option Groups by Product Listing
```yaml
/api/option-groups/product-listing/{productListingId}:
  get:
    summary: Get option groups for a specific product listing
    parameters:
      - name: productListingId
        in: path
        required: true
        schema:
          type: string
    responses:
      '200':
        description: Option groups for product listing
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OptionGroupList'
```

### Get Active Option Groups
```yaml
/api/option-groups/active:
  get:
    summary: Get active option groups
    responses:
      '200':
        description: List of active option groups
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OptionGroupList'
```

## OptionValue Endpoints

### Get Option Values
```yaml
/api/option-values:
  get:
    summary: List all option values
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
      - name: optionGroup
        in: query
        schema:
          type: string
      - name: isActive
        in: query
        schema:
          type: boolean
    responses:
      '200':
        description: List of option values
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OptionValueList'
```

### Get Option Values by Option Group
```yaml
/api/option-values/option-group/{optionGroupId}:
  get:
    summary: Get option values for a specific option group
    parameters:
      - name: optionGroupId
        in: path
        required: true
        schema:
          type: string
    responses:
      '200':
        description: Option values for option group
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OptionValueList'
```

### Get Active Option Values
```yaml
/api/option-values/active:
  get:
    summary: Get active option values
    responses:
      '200':
        description: List of active option values
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OptionValueList'
```

### Get Option Values by Product Listing
```yaml
/api/option-values/product-listing/{productListingId}:
  get:
    summary: Get option values for a specific product listing
    parameters:
      - name: productListingId
        in: path
        required: true
        schema:
          type: string
    responses:
      '200':
        description: Option values for product listing
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OptionValueList'
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
