# Data Models

## Overview

This document defines the core data models/entities that will be shared between Strapi backend and Astro frontend. These models support all ecommerce functionality outlined in the PRD.

## Product Model (Base Entity)

**Purpose:** Base product entity - source of truth for core product data

**Key Attributes:**
- `id`: string - Unique product identifier
- `sku`: string - Stock keeping unit
- `basePrice`: decimal - Base product price in cents
- `comparePrice`: decimal - Original/compare price for discounts
- `inventory`: integer - Available quantity
- `isActive`: boolean - Whether product is available for purchase
- `status`: enum - Product status (draft, active, inactive)
- `category`: relation - Product category
- `wishlistedBy`: relation[] - Users who have this product in wishlist
- `inventoryRecord`: relation - Inventory tracking record
- `productListings`: relation[] - Customer-facing product listings
- `createdAt`: datetime - Creation timestamp
- `updatedAt`: datetime - Last update timestamp

**TypeScript Interface:**
```typescript
interface Product {
  id: string;
  sku: string;
  basePrice: number; // in cents
  comparePrice?: number;
  inventory: number;
  isActive: boolean;
  status: 'draft' | 'active' | 'inactive';
  category?: Category;
  wishlistedBy: User[];
  inventoryRecord?: Inventory;
  productListings: ProductListing[];
  createdAt: string;
  updatedAt: string;
}
```

**Relationships:**
- Belongs to one Category
- Has many ProductListings (customer-facing representations)
- Has many Users (wishlist)
- Has one Inventory record

## ProductListing Model (Customer-Facing Entity)

**Purpose:** Customer-facing product representations with variants support

**Key Attributes:**
- `id`: string - Unique product listing identifier
- `title`: string - Product name and title
- `slug`: string - URL-friendly product identifier
- `description`: richtext - Detailed product description
- `shortDescription`: text - Brief product summary
- `type`: enum - Product type (single, variant)
- `basePrice`: decimal - Base price in cents
- `comparePrice`: decimal - Original/compare price for discounts
- `isActive`: boolean - Whether product listing is visible
- `featured`: boolean - Whether product is featured
- `images`: media[] - Product images and media
- `product`: relation - Base product entity
- `category`: relation - Product category
- `variants`: relation[] - Product variants (for variant type)
- `optionGroups`: relation[] - Option groups for variants
- `seo`: component - SEO metadata
- `createdAt`: datetime - Creation timestamp
- `updatedAt`: datetime - Last update timestamp

**TypeScript Interface:**
```typescript
interface ProductListing {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  type: 'single' | 'variant';
  basePrice?: number; // in cents
  comparePrice?: number;
  isActive: boolean;
  featured: boolean;
  images: Media[];
  product: Product;
  category?: Category;
  variants: ProductListingVariant[];
  optionGroups: OptionGroup[];
  seo?: SEOComponent;
  createdAt: string;
  updatedAt: string;
}
```

**Relationships:**
- Belongs to one Product (base entity)
- Belongs to one Category
- Has many ProductListingVariants (for variant type)
- Has many OptionGroups (for variant type)
- Has many Media (images)

## ProductListingVariant Model

**Purpose:** Product variants with specific options, pricing, and inventory

**Key Attributes:**
- `id`: string - Unique variant identifier
- `sku`: string - Variant-specific SKU
- `price`: decimal - Variant price in cents (overrides base price)
- `comparePrice`: decimal - Variant compare price
- `inventory`: integer - Variant-specific inventory
- `isActive`: boolean - Whether variant is available
- `weight`: decimal - Variant-specific weight
- `length`: decimal - Variant length
- `width`: decimal - Variant width
- `height`: decimal - Variant height
- `productListing`: relation - Parent product listing
- `optionValues`: relation[] - Option values for this variant
- `images`: media - Variant-specific images
- `createdAt`: datetime - Creation timestamp
- `updatedAt`: datetime - Last update timestamp

**TypeScript Interface:**
```typescript
interface ProductListingVariant {
  id: string;
  sku: string;
  price: number; // in cents
  comparePrice?: number;
  inventory: number;
  isActive: boolean;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  productListing: ProductListing;
  optionValues: OptionValue[];
  images?: Media;
  createdAt: string;
  updatedAt: string;
}
```

**Relationships:**
- Belongs to one ProductListing
- Has many OptionValues (combination of options)

## OptionGroup Model

**Purpose:** Option groups for product variants (e.g., Size, Color, Material)

**Key Attributes:**
- `id`: string - Unique option group identifier
- `name`: string - Option group name (e.g., "Size", "Color")
- `displayName`: string - Display name for UI
- `type`: enum - Input type (select, radio, checkbox)
- `isRequired`: boolean - Whether option is required
- `sortOrder`: integer - Display order
- `isActive`: boolean - Whether option group is active
- `productListings`: relation[] - Product listings using this option group
- `optionValues`: relation[] - Available option values
- `createdAt`: datetime - Creation timestamp
- `updatedAt`: datetime - Last update timestamp

**TypeScript Interface:**
```typescript
interface OptionGroup {
  id: string;
  name: string;
  displayName: string;
  type: 'select' | 'radio' | 'checkbox';
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
  productListings: ProductListing[];
  optionValues: OptionValue[];
  createdAt: string;
  updatedAt: string;
}
```

**Relationships:**
- Has many OptionValues
- Has many ProductListings

## OptionValue Model

**Purpose:** Specific option values for product variants (e.g., Large, Red, Cotton)

**Key Attributes:**
- `id`: string - Unique option value identifier
- `value`: string - Option value (e.g., "L", "Red", "Cotton")
- `displayName`: string - Display name for UI
- `sortOrder`: integer - Display order
- `isActive`: boolean - Whether option value is active
- `optionGroup`: relation - Parent option group
- `variants`: relation[] - Variants using this option value
- `createdAt`: datetime - Creation timestamp
- `updatedAt`: datetime - Last update timestamp

**TypeScript Interface:**
```typescript
interface OptionValue {
  id: string;
  value: string;
  displayName: string;
  sortOrder: number;
  isActive: boolean;
  optionGroup: OptionGroup;
  variants: ProductListingVariant[];
  createdAt: string;
  updatedAt: string;
}
```

**Relationships:**
- Belongs to one OptionGroup
- Has many ProductListingVariants

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
- `productListings`: relation[] - Product listings in this category
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
  productListings: ProductListing[];
  isActive: boolean;
  sortOrder: number;
  seo: SEOComponent;
}
```

**Relationships:**
- Has many Products
- Has many ProductListings
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
- `wishlist`: relation[] - User's wishlist items (Products)
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
- `productListing`: relation - Product listing ordered
- `productListingVariant`: relation - Product variant (if applicable)
- `quantity`: integer - Quantity ordered
- `price`: decimal - Price per unit in cents
- `total`: decimal - Total price for this item in cents

**TypeScript Interface:**
```typescript
interface OrderItem {
  id: string;
  order: Order;
  productListing: ProductListing;
  productListingVariant?: ProductListingVariant;
  quantity: number;
  price: number; // in cents
  total: number; // in cents
}
```

**Relationships:**
- Belongs to one Order
- Belongs to one ProductListing
- Belongs to one ProductListingVariant (optional)

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

### ProductListing Architecture
- **Separation of Concerns:** Product (base entity) vs ProductListing (customer-facing)
- **Variant Support:** ProductListing supports both single and variant product types
- **Flexible Options:** OptionGroup and OptionValue system for unlimited variant combinations
- **Pricing Override:** Variant-specific pricing can override base product pricing

### Price Storage
- **Price in cents:** Avoids floating-point precision issues in financial calculations
- **Consistent currency:** All monetary values stored in cents as integers
- **Variant pricing:** Variants can have their own pricing independent of base product

### Relationships
- **Flexible address system:** Supports both shipping and billing addresses
- **Order status tracking:** Comprehensive order lifecycle management
- **SEO components:** Built-in SEO support for products and categories
- **Media relationships:** Proper image and media management
- **Variant relationships:** Complex many-to-many relationships between variants and option values

### Extensibility
- **Product variants:** Support for size, color, and other product variations
- **Category hierarchy:** Nested category structure for complex product organization
- **User roles:** Extensible role system for future admin features
- **Option system:** Reusable option groups and values across multiple products

### Inventory Management
- **Dual inventory:** Both Product (base) and ProductListingVariant (specific) inventory tracking
- **Variant-specific stock:** Each variant maintains its own inventory count
- **Availability checking:** Comprehensive availability validation for variants
