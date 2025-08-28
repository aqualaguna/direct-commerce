# Data Models

## Overview

This document defines the core data models/entities that will be shared between Strapi backend and Astro frontend. These models support all ecommerce functionality outlined in the PRD.

## Product Model

**Purpose:** Core product information including details, pricing, inventory, and media

**Key Attributes:**
- `id`: string - Unique product identifier
- `title`: string - Product name and title
- `slug`: string - URL-friendly product identifier
- `description`: text - Detailed product description
- `shortDescription`: text - Brief product summary
- `price`: decimal - Product price in cents
- `comparePrice`: decimal - Original/compare price for discounts
- `sku`: string - Stock keeping unit
- `inventory`: integer - Available quantity
- `isActive`: boolean - Whether product is available for purchase
- `featured`: boolean - Whether product is featured
- `images`: media[] - Product images and media
- `category`: relation - Product category
- `tags`: relation[] - Product tags for search
- `variants`: relation[] - Product variants (size, color, etc.)
- `seo`: component - SEO metadata
- `createdAt`: datetime - Creation timestamp
- `updatedAt`: datetime - Last update timestamp

**TypeScript Interface:**
```typescript
interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number; // in cents
  comparePrice?: number;
  sku: string;
  inventory: number;
  isActive: boolean;
  featured: boolean;
  images: Media[];
  category: Category;
  tags: Tag[];
  variants: ProductVariant[];
  seo: SEOComponent;
  createdAt: string;
  updatedAt: string;
}
```

**Relationships:**
- Belongs to one Category
- Has many Tags
- Has many ProductVariants
- Has many Media (images)
- Has one SEO component

## Category Model

**Purpose:** Product categorization and navigation structure

**Key Attributes:**
- `id`: string - Unique category identifier
- `name`: string - Category name
- `slug`: string - URL-friendly category identifier
- `description`: text - Category description
- `image`: media - Category image
- `parent`: relation - Parent category for hierarchy
- `children`: relation[] - Child categories
- `products`: relation[] - Products in this category
- `isActive`: boolean - Whether category is visible
- `sortOrder`: integer - Display order
- `seo`: component - SEO metadata

**TypeScript Interface:**
```typescript
interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image?: Media;
  parent?: Category;
  children: Category[];
  products: Product[];
  isActive: boolean;
  sortOrder: number;
  seo: SEOComponent;
}
```

**Relationships:**
- Has many Products
- Belongs to one parent Category
- Has many child Categories

## User Model

**Purpose:** Customer account information and authentication

**Key Attributes:**
- `id`: string - Unique user identifier
- `email`: string - User email address
- `username`: string - Username for login
- `firstName`: string - User's first name
- `lastName`: string - User's last name
- `phone`: string - Contact phone number
- `isActive`: boolean - Whether account is active
- `emailVerified`: boolean - Email verification status
- `role`: enum - User role (customer, admin)
- `addresses`: relation[] - User's saved addresses
- `orders`: relation[] - User's order history
- `wishlist`: relation[] - User's wishlist items
- `createdAt`: datetime - Account creation date

**TypeScript Interface:**
```typescript
interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  emailVerified: boolean;
  role: 'customer' | 'admin';
  addresses: Address[];
  orders: Order[];
  wishlist: Product[];
  createdAt: string;
}
```

**Relationships:**
- Has many Orders
- Has many Addresses
- Has many Wishlist items (Products)

## Order Model

**Purpose:** Customer orders and purchase information

**Key Attributes:**
- `id`: string - Unique order identifier
- `orderNumber`: string - Human-readable order number
- `user`: relation - Customer who placed the order
- `status`: enum - Order status (pending, processing, shipped, delivered, cancelled)
- `items`: relation[] - Order line items
- `subtotal`: decimal - Order subtotal in cents
- `tax`: decimal - Tax amount in cents
- `shipping`: decimal - Shipping cost in cents
- `total`: decimal - Total order amount in cents
- `shippingAddress`: component - Delivery address
- `billingAddress`: component - Billing address
- `paymentStatus`: enum - Payment status (pending, paid, failed, refunded)
- `paymentMethod`: string - Payment method used
- `shippingMethod`: string - Shipping method selected
- `trackingNumber`: string - Shipping tracking number
- `notes`: text - Order notes
- `createdAt`: datetime - Order creation date
- `updatedAt`: datetime - Last update date

**TypeScript Interface:**
```typescript
interface Order {
  id: string;
  orderNumber: string;
  user: User;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  subtotal: number; // in cents
  tax: number;
  shipping: number;
  total: number;
  shippingAddress: AddressComponent;
  billingAddress: AddressComponent;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: string;
  shippingMethod: string;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

**Relationships:**
- Belongs to one User
- Has many OrderItems

## OrderItem Model

**Purpose:** Individual items within an order

**Key Attributes:**
- `id`: string - Unique order item identifier
- `order`: relation - Parent order
- `product`: relation - Product ordered
- `variant`: relation - Product variant (if applicable)
- `quantity`: integer - Quantity ordered
- `price`: decimal - Price per unit in cents
- `total`: decimal - Total price for this item in cents

**TypeScript Interface:**
```typescript
interface OrderItem {
  id: string;
  order: Order;
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  price: number; // in cents
  total: number; // in cents
}
```

**Relationships:**
- Belongs to one Order
- Belongs to one Product
- Belongs to one ProductVariant (optional)

## Address Model

**Purpose:** Customer addresses for shipping and billing

**Key Attributes:**
- `id`: string - Unique address identifier
- `user`: relation - Address owner
- `type`: enum - Address type (shipping, billing, both)
- `firstName`: string - First name
- `lastName`: string - Last name
- `company`: string - Company name (optional)
- `address1`: string - Primary address line
- `address2`: string - Secondary address line (optional)
- `city`: string - City
- `state`: string - State/province
- `postalCode`: string - Postal code
- `country`: string - Country
- `phone`: string - Contact phone
- `isDefault`: boolean - Whether this is the default address

**TypeScript Interface:**
```typescript
interface Address {
  id: string;
  user: User;
  type: 'shipping' | 'billing' | 'both';
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}
```

**Relationships:**
- Belongs to one User

## Shared Components

### Media Component
```typescript
interface Media {
  id: string;
  url: string;
  alternativeText?: string;
  width?: number;
  height?: number;
  mime?: string;
  size?: number;
}
```

### SEO Component
```typescript
interface SEOComponent {
  metaTitle?: string;
  metaDescription?: string;
  metaImage?: Media;
  keywords?: string;
  canonicalURL?: string;
}
```

### Address Component
```typescript
interface AddressComponent {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}
```

## Design Decisions

### Price Storage
- **Price in cents:** Avoids floating-point precision issues in financial calculations
- **Consistent currency:** All monetary values stored in cents as integers

### Relationships
- **Flexible address system:** Supports both shipping and billing addresses
- **Order status tracking:** Comprehensive order lifecycle management
- **SEO components:** Built-in SEO support for products and categories
- **Media relationships:** Proper image and media management

### Extensibility
- **Product variants:** Support for size, color, and other product variations
- **Category hierarchy:** Nested category structure for complex product organization
- **User roles:** Extensible role system for future admin features
