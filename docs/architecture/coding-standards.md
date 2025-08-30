# Coding Standards

*Generated on: [Current Date]*

---

## Introduction

This document defines the coding standards and best practices for the Single-Seller Ecommerce Platform. These standards ensure code quality, consistency, and maintainability across the entire codebase, covering both frontend (Astro/React) and backend (Strapi) development.

### Scope

- **Frontend:** Astro 4.5+, React 18.3+, TypeScript 5.9.2+, Tailwind CSS 3.4+
- **Backend:** Strapi 4.25+, Node.js 20+, TypeScript/JavaScript
- **Testing:** Vitest 2.0+, Jest 30+, Playwright 1.50+
- **Infrastructure:** Cloudflare Pages, Cloudflare Workers, Wrangler 3.50+

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| [Current Date] | v1.0 | Initial coding standards creation | Winston (Architect) |

---

## General Principles

### 1. Code Quality Standards

- **Type Safety:** Use TypeScript 5.9.2+ for all new code. JavaScript is only acceptable for Strapi plugins/extensions where TypeScript isn't supported.
- **Readability:** Code should be self-documenting with clear variable and function names.
- **Consistency:** Follow established patterns within each codebase section.
- **Performance:** Optimize for Core Web Vitals and ecommerce-specific metrics.
- **Accessibility:** All components must meet WCAG 2.1 AA standards.
- **Modern JavaScript:** Leverage Node.js 20+ features and ES2022+ syntax where appropriate.

### 2. File and Directory Naming

```
# Frontend (Astro/React)
components/
├── layout/
│   ├── Header.astro          # PascalCase for components
│   └── Navigation.tsx
├── product/
│   ├── ProductCard.astro
│   └── product-card.module.css  # kebab-case for CSS modules
└── utils/
    ├── api-client.ts         # camelCase for utilities
    └── formatters.ts

# Backend (Strapi)
src/
├── api/
│   └── product/
│       ├── content-types/
│       │   └── product/
│       │       └── schema.json
│       ├── controllers/
│       │   └── product.js
│       ├── routes/
│       │   └── product.js
│       └── services/
│           └── product.js
└── extensions/
    └── api/
        └── product/
            └── controllers/
                └── product.js
```

### 3. Import/Export Standards

```typescript
// ✅ Good - Grouped imports
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

// Third-party libraries
import { motion } from 'framer-motion'
import { format } from 'date-fns'

// Local imports
import { ProductCard } from '@/components/product/ProductCard'
import { useCart } from '@/stores/cart'
import { formatPrice } from '@/utils/formatters'

// ✅ Good - Named exports for components
export const ProductGrid = ({ products }: ProductGridProps) => {
  // Component implementation
}

// ✅ Good - Default exports for pages/layouts
export default function ProductPage() {
  // Page implementation
}

// ✅ Good - Barrel exports
// components/index.ts
export { Header } from './layout/Header'
export { ProductCard } from './product/ProductCard'
export { CartDrawer } from './cart/CartDrawer'
```

---

## TypeScript Standards

### 1. Type Definitions

```typescript
// ✅ Good - Explicit interfaces (TypeScript 5.9.2+)
interface Product {
  id: string
  sku: string
  basePrice: number
  comparePrice?: number
  inventory: number
  isActive: boolean
  status: 'draft' | 'active' | 'inactive'
  category?: Category
  wishlistedBy: User[]
  inventoryRecord?: Inventory
  productListings: ProductListing[]
  createdAt: Date
  updatedAt: Date
}

interface ProductListing {
  id: string
  title: string
  slug: string
  description: string
  shortDescription?: string
  type: 'single' | 'variant'
  basePrice?: number
  comparePrice?: number
  isActive: boolean
  featured: boolean
  images: Media[]
  product: Product
  category?: Category
  variants: ProductListingVariant[]
  optionGroups: OptionGroup[]
  seo?: SEOComponent
  createdAt: Date
  updatedAt: Date
}

interface ProductListingVariant {
  id: string
  sku: string
  price: number
  comparePrice?: number
  inventory: number
  isActive: boolean
  weight?: number
  length?: number
  width?: number
  height?: number
  productListing: ProductListing
  optionValues: OptionValue[]
  images?: Media
  createdAt: Date
  updatedAt: Date
}

// ✅ Good - Union types for variants
type ProductStatus = 'draft' | 'active' | 'inactive'
type ProductListingType = 'single' | 'variant'
type SortOrder = 'asc' | 'desc'

// ✅ Good - Generic types with improved inference
interface ApiResponse<T> {
  data: T
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

// ✅ Good - Utility types (TypeScript 5.9.2+ features)
type ProductListingPreview = Pick<ProductListing, 'id' | 'title' | 'basePrice' | 'images'>
type ProductListingFormData = Omit<ProductListing, 'id' | 'createdAt' | 'updatedAt'>
type VariantPreview = Pick<ProductListingVariant, 'id' | 'sku' | 'price' | 'inventory'>

// ✅ Good - Template literal types for better type safety
type ApiEndpoint = `/api/${string}`
type ProductListingEndpoint = `/api/product-listings/${string}`
type VariantEndpoint = `/api/product-listing-variants/${string}`

// ✅ Good - Satisfies operator for runtime validation
const productListingConfig = {
  maxPrice: 10000,
  minPrice: 0,
  currency: 'USD'
} satisfies ProductListingConfig
```

### 2. Function Signatures

```typescript
// ✅ Good - Explicit return types
export const formatPrice = (price: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price)
}

// ✅ Good - Async functions with proper typing
export const fetchProductListings = async (
  params: ProductListingQueryParams
): Promise<ApiResponse<ProductListing[]>> => {
  const response = await apiClient.get('/product-listings', { params })
  return response.data
}

export const fetchVariants = async (
  productListingId: string
): Promise<ApiResponse<ProductListingVariant[]>> => {
  const response = await apiClient.get(`/product-listing-variants/product-listing/${productListingId}`)
  return response.data
}

// ✅ Good - Event handlers
const handleAddToCart = (productListing: ProductListing, variant?: ProductListingVariant, quantity: number = 1): void => {
  cartStore.addItem(productListing, variant, quantity)
}
```

### 3. Component Props

```typescript
// ✅ Good - Props interface
interface ProductListingCardProps {
  productListing: ProductListing
  onAddToCart?: (productListing: ProductListing, variant?: ProductListingVariant) => void
  variant?: 'default' | 'compact'
  className?: string
}

// ✅ Good - Default props
export const ProductListingCard = ({
  productListing,
  onAddToCart,
  variant = 'default',
  className = '',
}: ProductListingCardProps) => {
  // Component implementation
}
```

---

## React Standards

### 1. Component Structure

```typescript
// ✅ Good - Functional components with hooks (React 18.3+)
import React, { useState, useEffect, useTransition } from 'react'
import { motion } from 'framer-motion'

interface ProductListingDetailProps {
  productListing: ProductListing
}

export const ProductListingDetail: React.FC<ProductListingDetailProps> = ({ productListing }) => {
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<ProductListingVariant | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isPending, startTransition] = useTransition()
  const { addToCart } = useCart()

  const handleAddToCart = () => {
    startTransition(() => {
      addToCart(productListing, selectedVariant, quantity)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="product-listing-detail"
    >
      {/* Component JSX */}
      {isPending && <div className="loading-indicator">Adding to cart...</div>}
    </motion.div>
  )
}
```

### 2. Hooks Usage

```typescript
// ✅ Good - Custom hooks
export const useProductListing = (productListingId: string) => {
  const [productListing, setProductListing] = useState<ProductListing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProductListing = async () => {
      try {
        const data = await apiClient.get(`/product-listings/${productListingId}`)
        setProductListing(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch product listing')
      } finally {
        setLoading(false)
      }
    }

    fetchProductListing()
  }, [productListingId])

  return { productListing, loading, error }
}

// ✅ Good - Hook dependencies
useEffect(() => {
  // Effect logic
}, [dependency1, dependency2]) // Always include all dependencies
```

### 3. State Management (Zustand 4.5+)

```typescript
// ✅ Good - Store definition with improved TypeScript support
interface CartStore {
  items: CartItem[]
  addItem: (product: Product, quantity: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  total: number
  itemCount: number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  
  addItem: (product, quantity) => {
    set((state) => {
      const existingItem = state.items.find(item => item.product.id === product.id)
      
      if (existingItem) {
        return {
          items: state.items.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          )
        }
      }
      
      return {
        items: [...state.items, { product, quantity }]
      }
    })
  },
  
  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter(item => item.product.id !== productId)
    }))
  },
  
  updateQuantity: (productId, quantity) => {
    set((state) => ({
      items: state.items.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    }))
  },
  
  clearCart: () => set({ items: [] }),
  
  get total() {
    return get().items.reduce((sum, item) => 
      sum + (item.product.price * item.quantity), 0
    )
  },
  
  get itemCount() {
    return get().items.reduce((sum, item) => sum + item.quantity, 0)
  }
}))

// ✅ Good - Store persistence with Zustand 4.5+
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // ... store implementation
    }),
    {
      name: 'cart-storage',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Handle migration from version 0 to 1
          return { ...persistedState, version: 1 }
        }
        return persistedState
      }
    }
  )
)
```

---

## Astro Standards

### 1. Component Structure

```astro
---
// ✅ Good - Frontmatter with proper typing (Astro 4.5+)
import type { Product } from '@/types/product'
import { ProductCard } from '@/components/product/ProductCard'
import { formatPrice } from '@/utils/formatters'

interface Props {
  products: Product[]
  title?: string
}

const { products, title = 'Our Products' } = Astro.props
---

<!-- ✅ Good - Semantic HTML structure -->
<section class="products-grid">
  <h2 class="text-2xl font-bold mb-6">{title}</h2>
  
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {products.map((product) => (
      <ProductCard product={product} client:load />
    ))}
  </div>
</section>

<style>
  /* ✅ Good - Scoped styles with improved CSS support */
  .products-grid {
    @apply container mx-auto px-4 py-8;
  }
  
  /* ✅ Good - CSS custom properties for theming */
  :global(:root) {
    --product-grid-gap: 1.5rem;
    --product-card-radius: 0.5rem;
  }
</style>
```

### 2. Client Directives

```astro
<!-- ✅ Good - Appropriate client directives -->
<ProductCard product={product} client:load />     <!-- Interactive components -->
<CartDrawer client:visible />                     <!-- Visible on load -->
<SearchBar client:idle />                         <!-- Load when idle -->
<Analytics client:only="react" />                 <!-- Only for React -->
```

### 3. Layout Components

```astro
---
// layouts/BaseLayout.astro
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

interface Props {
  title: string
  description?: string
}

const { title, description } = Astro.props
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
  </head>
  <body>
    <Header />
    <main>
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

---

## Strapi Standards

### 1. Content Type Definitions

```json
// ✅ Good - Product content type schema
{
  "kind": "collectionType",
  "collectionName": "products",
  "info": {
    "singularName": "product",
    "pluralName": "products",
    "displayName": "Product",
    "description": "Ecommerce products"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true,
      "minLength": 1,
      "maxLength": 255
    },
    "slug": {
      "type": "uid",
      "targetField": "name",
      "required": true
    },
    "description": {
      "type": "richtext",
      "required": true
    },
    "price": {
      "type": "decimal",
      "required": true,
      "min": 0
    },
    "images": {
      "type": "media",
      "multiple": true,
      "required": false,
      "allowedTypes": ["images"]
    },
    "category": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::category.category",
      "inversedBy": "products"
    },
    "inStock": {
      "type": "boolean",
      "default": true
    }
  }
}
```

### 2. Controller Structure

```javascript
// ✅ Good - Strapi 5+ controller using Document Service API
'use strict'

module.exports = {
  async find(ctx) {
    try {
      const { query } = ctx
      
      // Apply filters with improved error handling
      const filters = {
        ...query.filters,
        // Use status filter for Draft & Publish instead of publishedAt
        status: 'published'
      }
      
      // Apply sorting with validation
      const sort = query.sort || { createdAt: 'desc' }
      
      // Apply pagination with improved validation
      const pagination = {
        page: Math.max(1, parseInt(query.page) || 1),
        pageSize: Math.min(Math.max(1, parseInt(query.pageSize) || 25), 100)
      }
      
      // Use Document Service API instead of Entity Service
      const products = await strapi.documents('api::product.product').findMany({
        filters,
        sort,
        pagination,
        populate: ['images', 'category']
      })
      
      return products
    } catch (error) {
      strapi.log.error('Error in product find:', error)
      ctx.throw(500, 'Internal server error')
    }
  },
  
  async findOne(ctx) {
    try {
      const { documentId } = ctx.params // Use documentId instead of id
      
      if (!documentId) {
        return ctx.badRequest('Product documentId is required')
      }
      
      // Use Document Service API with documentId
      const product = await strapi.documents('api::product.product').findOne({
        documentId,
        populate: ['images', 'category']
      })
      
      if (!product) {
        return ctx.notFound('Product not found')
      }
      
      return product
    } catch (error) {
      strapi.log.error('Error in product findOne:', error)
      ctx.throw(500, 'Internal server error')
    }
  },

  async create(ctx) {
    try {
      const { data } = ctx.request.body
      
      if (!data.name || !data.price) {
        return ctx.badRequest('Name and price are required')
      }
      
      // Use Document Service API for creation
      const product = await strapi.documents('api::product.product').create({
        data,
        populate: ['images', 'category']
      })
      
      return product
    } catch (error) {
      strapi.log.error('Error in product create:', error)
      ctx.throw(500, 'Internal server error')
    }
  },

  async update(ctx) {
    try {
      const { documentId } = ctx.params
      const { data } = ctx.request.body
      
      if (!documentId) {
        return ctx.badRequest('Product documentId is required')
      }
      
      // Use Document Service API for updates
      const product = await strapi.documents('api::product.product').update({
        documentId,
        data,
        populate: ['images', 'category']
      })
      
      return product
    } catch (error) {
      strapi.log.error('Error in product update:', error)
      ctx.throw(500, 'Internal server error')
    }
  },

  async delete(ctx) {
    try {
      const { documentId } = ctx.params
      
      if (!documentId) {
        return ctx.badRequest('Product documentId is required')
      }
      
      // Use Document Service API for deletion
      await strapi.documents('api::product.product').delete({
        documentId
      })
      
      return { message: 'Product deleted successfully' }
    } catch (error) {
      strapi.log.error('Error in product delete:', error)
      ctx.throw(500, 'Internal server error')
    }
  },

  // Draft & Publish operations
  async publish(ctx) {
    try {
      const { documentId } = ctx.params
      
      if (!documentId) {
        return ctx.badRequest('Product documentId is required')
      }
      
      // Use Document Service API for publishing
      const result = await strapi.documents('api::product.product').publish({
        documentId
      })
      
      return result
    } catch (error) {
      strapi.log.error('Error in product publish:', error)
      ctx.throw(500, 'Internal server error')
    }
  },

  async unpublish(ctx) {
    try {
      const { documentId } = ctx.params
      
      if (!documentId) {
        return ctx.badRequest('Product documentId is required')
      }
      
      // Use Document Service API for unpublishing
      const result = await strapi.documents('api::product.product').unpublish({
        documentId
      })
      
      return result
    } catch (error) {
      strapi.log.error('Error in product unpublish:', error)
      ctx.throw(500, 'Internal server error')
    }
  }
}
```

### 3. Service Layer

```javascript
// ✅ Good - Strapi 5+ service using Document Service API
'use strict'

module.exports = {
  async createProduct(data) {
    try {
      // Validate data
      if (!data.name || !data.price) {
        throw new Error('Name and price are required')
      }
      
      // Create slug if not provided
      if (!data.slug) {
        data.slug = strapi.plugins['content-manager'].services.uid.generateUIDField({
          contentTypeUID: 'api::product.product',
          field: 'slug',
          data
        })
      }
      
      // Use Document Service API for creation
      const product = await strapi.documents('api::product.product').create({
        data,
        populate: ['images', 'category']
      })
      
      return product
    } catch (error) {
      strapi.log.error('Error creating product:', error)
      throw error
    }
  },
  
  async updateProductStock(documentId, quantity) {
    try {
      // Use Document Service API with documentId
      const product = await strapi.documents('api::product.product').findOne({
        documentId
      })
      
      if (!product) {
        throw new Error('Product not found')
      }
      
      const updatedProduct = await strapi.documents('api::product.product').update({
        documentId,
        data: {
          inStock: quantity > 0
        }
      })
      
      return updatedProduct
    } catch (error) {
      strapi.log.error('Error updating product stock:', error)
      throw error
    }
  },

  async findProductsByStatus(status = 'published', options = {}) {
    try {
      // Use Document Service API with status filter
      const products = await strapi.documents('api::product.product').findMany({
        filters: { status },
        sort: { createdAt: 'desc' },
        pagination: { page: 1, pageSize: 25 },
        populate: ['images', 'category'],
        ...options
      })
      
      return products
    } catch (error) {
      strapi.log.error('Error finding products by status:', error)
      throw error
    }
  },

  async publishProduct(documentId) {
    try {
      // Use Document Service API for publishing
      const result = await strapi.documents('api::product.product').publish({
        documentId
      })
      
      return result
    } catch (error) {
      strapi.log.error('Error publishing product:', error)
      throw error
    }
  },

  async unpublishProduct(documentId) {
    try {
      // Use Document Service API for unpublishing
      const result = await strapi.documents('api::product.product').unpublish({
        documentId
      })
      
      return result
    } catch (error) {
      strapi.log.error('Error unpublishing product:', error)
      throw error
    }
  },

  async countProducts(status = 'published') {
    try {
      // Use Document Service API for counting
      const count = await strapi.documents('api::product.product').count({
        status
      })
      
      return count
    } catch (error) {
      strapi.log.error('Error counting products:', error)
      throw error
    }
  }
}
```

### 4. Document Service API Migration Guide

```javascript
// ❌ DEPRECATED - Entity Service API (Strapi v4)
const product = await strapi.entityService.findOne('api::product.product', 1, {
  populate: ['images', 'category']
})

// ✅ NEW - Document Service API (Strapi v5)
const product = await strapi.documents('api::product.product').findOne({
  documentId: 'a1b2c3d4e5f6g7h8i9j0klm',
  populate: ['images', 'category']
})

// ❌ DEPRECATED - Using numeric ID
const products = await strapi.entityService.findMany('api::product.product', {
  filters: { publishedAt: { $notNull: true } }
})

// ✅ NEW - Using status filter
const products = await strapi.documents('api::product.product').findMany({
  filters: { status: 'published' }
})

// ❌ DEPRECATED - publishedAt checks
if (product.publishedAt) {
  // Product is published
}

// ✅ NEW - status checks
if (product.status === 'published') {
  // Product is published
}
```

### 5. Document Service API Best Practices

```javascript
// ✅ Good - Use documentId for all operations
const product = await strapi.documents('api::product.product').findOne({
  documentId: 'a1b2c3d4e5f6g7h8i9j0klm'
})

// ✅ Good - Use status filters for Draft & Publish
const publishedProducts = await strapi.documents('api::product.product').findMany({
  filters: { status: 'published' }
})

const draftProducts = await strapi.documents('api::product.product').findMany({
  filters: { status: 'draft' }
})

// ✅ Good - Use fields to limit returned data
const products = await strapi.documents('api::product.product').findMany({
  fields: ['documentId', 'name', 'price', 'slug'],
  populate: {
    images: {
      fields: ['url', 'width', 'height']
    }
  }
})

// ✅ Good - Use findFirst for single record queries
const firstProduct = await strapi.documents('api::product.product').findFirst({
  filters: { status: 'published' },
  sort: { createdAt: 'desc' }
})

// ✅ Good - Use count for performance
const totalProducts = await strapi.documents('api::product.product').count({
  status: 'published'
})

// ✅ Good - Draft & Publish operations
const publishResult = await strapi.documents('api::product.product').publish({
  documentId: 'a1b2c3d4e5f6g7h8i9j0klm'
})

const unpublishResult = await strapi.documents('api::product.product').unpublish({
  documentId: 'a1b2c3d4e5f6g7h8i9j0klm'
})

const discardResult = await strapi.documents('api::product.product').discardDraft({
  documentId: 'a1b2c3d4e5f6g7h8i9j0klm'
})
```

### 6. Route Configuration for Document Service API

```javascript
// ✅ Good - Routes using documentId parameter
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/products',
      handler: 'product.find',
      config: {
        policies: ['global::is-public']
      }
    },
    {
      method: 'GET',
      path: '/products/:documentId', // Use documentId instead of id
      handler: 'product.findOne',
      config: {
        policies: ['global::is-public']
      }
    },
    {
      method: 'POST',
      path: '/products',
      handler: 'product.create',
      config: {
        policies: ['global::is-authenticated']
      }
    },
    {
      method: 'PUT',
      path: '/products/:documentId', // Use documentId instead of id
      handler: 'product.update',
      config: {
        policies: ['global::is-authenticated']
      }
    },
    {
      method: 'DELETE',
      path: '/products/:documentId', // Use documentId instead of id
      handler: 'product.delete',
      config: {
        policies: ['global::is-authenticated']
      }
    },
    {
      method: 'POST',
      path: '/products/:documentId/publish',
      handler: 'product.publish',
      config: {
        policies: ['global::is-admin']
      }
    },
    {
      method: 'POST',
      path: '/products/:documentId/unpublish',
      handler: 'product.unpublish',
      config: {
        policies: ['global::is-admin']
      }
    }
  ]
}
```

---

# Coding Standards - Part 2

*Continuation of coding-standards.md*

---

## CSS/Tailwind Standards

### 1. Tailwind Usage

```typescript
// ✅ Good - Consistent class ordering
<div className="
  flex items-center justify-between
  p-4 md:p-6 lg:p-8
  bg-white dark:bg-gray-900
  border border-gray-200 dark:border-gray-700
  rounded-lg shadow-sm
  hover:shadow-md transition-shadow
">
  {/* Content */}
</div>

// ✅ Good - Component variants with Tailwind
const buttonVariants = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  secondary: "bg-gray-200 hover:bg-gray-300 text-gray-900",
  outline: "border border-gray-300 hover:bg-gray-50 text-gray-700"
}

// ✅ Good - Responsive design
<div className="
  grid grid-cols-1 
  sm:grid-cols-2 
  md:grid-cols-3 
  lg:grid-cols-4 
  gap-4 md:gap-6
">
  {/* Grid items */}
</div>
```

### 2. Custom CSS

```css
/* ✅ Good - CSS custom properties */
:root {
  --color-primary: #3b82f6;
  --color-secondary: #6b7280;
  --color-success: #10b981;
  --color-error: #ef4444;
  --color-warning: #f59e0b;
  
  --font-family-sans: 'Inter', system-ui, sans-serif;
  --font-family-mono: 'JetBrains Mono', monospace;
  
  --border-radius: 0.5rem;
  --transition: all 0.2s ease-in-out;
}

/* ✅ Good - Component-specific styles */
.product-card {
  @apply relative overflow-hidden rounded-lg shadow-sm;
  transition: var(--transition);
}

.product-card:hover {
  @apply shadow-md;
  transform: translateY(-2px);
}

/* ✅ Good - Utility classes */
.text-gradient {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

## Testing Standards

### 1. Unit Tests (Vitest 2.0+)

```typescript
// ✅ Good - Component testing with improved Vitest 2.0+ features
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProductCard } from './ProductCard'

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Test Product',
    price: 29.99,
    images: [{ url: '/test-image.jpg' }],
    inStock: true
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders product information correctly', async () => {
    render(<ProductCard product={mockProduct} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument()
      expect(screen.getByText('$29.99')).toBeInTheDocument()
      expect(screen.getByAltText('Test Product')).toBeInTheDocument()
    })
  })

  it('calls onAddToCart when add to cart button is clicked', async () => {
    const mockOnAddToCart = vi.fn()
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />)
    
    const addToCartButton = screen.getByRole('button', { name: /add to cart/i })
    fireEvent.click(addToCartButton)
    
    await waitFor(() => {
      expect(mockOnAddToCart).toHaveBeenCalledWith(mockProduct)
    })
  })

  it('handles loading states correctly', () => {
    const mockProductLoading = { ...mockProduct, loading: true }
    render(<ProductCard product={mockProductLoading} />)
    
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })
})
```

### 2. API Tests (Jest 30+ + Supertest)

```javascript
// ✅ Good - Strapi 5+ API testing with Document Service API
const request = require('supertest')
const { createStrapiInstance } = require('@strapi/strapi')

describe('Product API', () => {
  let strapi

  beforeAll(async () => {
    strapi = await createStrapiInstance()
  })

  afterAll(async () => {
    await strapi.destroy()
  })

  describe('GET /api/products', () => {
    it('should return products with pagination', async () => {
      const response = await request(strapi.server)
        .get('/api/products')
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(response.body).toHaveProperty('meta.pagination')
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it('should filter products by category', async () => {
      const response = await request(strapi.server)
        .get('/api/products?category=electronics')
        .expect(200)

      expect(response.body.data).toHaveLength(0) // Assuming no electronics category exists
    })

    it('should handle invalid pagination parameters', async () => {
      const response = await request(strapi.server)
        .get('/api/products?page=-1&pageSize=1000')
        .expect(200) // Should still return valid response with corrected values

      expect(response.body.meta.pagination.page).toBe(1)
      expect(response.body.meta.pagination.pageSize).toBe(100)
    })

    it('should filter by publication status', async () => {
      const response = await request(strapi.server)
        .get('/api/products?status=published')
        .expect(200)

      expect(response.body.data).toBeDefined()
    })
  })

  describe('GET /api/products/:documentId', () => {
    it('should return 404 for non-existent product', async () => {
      await request(strapi.server)
        .get('/api/products/non-existent-document-id')
        .expect(404)
    })

    it('should return 400 for invalid documentId format', async () => {
      await request(strapi.server)
        .get('/api/products/invalid-document-id-format')
        .expect(400)
    })
  })

  describe('POST /api/products/:documentId/publish', () => {
    it('should publish a draft product', async () => {
      // First create a draft product
      const createResponse = await request(strapi.server)
        .post('/api/products')
        .send({
          data: {
            name: 'Test Product',
            price: 29.99,
            status: 'draft'
          }
        })
        .expect(201)

      const documentId = createResponse.body.documentId

      // Then publish it
      const publishResponse = await request(strapi.server)
        .post(`/api/products/${documentId}/publish`)
        .expect(200)

      expect(publishResponse.body.entries).toBeDefined()
    })
  })

  describe('POST /api/products/:documentId/unpublish', () => {
    it('should unpublish a published product', async () => {
      // First create and publish a product
      const createResponse = await request(strapi.server)
        .post('/api/products')
        .send({
          data: {
            name: 'Test Product',
            price: 29.99
          }
        })
        .expect(201)

      const documentId = createResponse.body.documentId

      await request(strapi.server)
        .post(`/api/products/${documentId}/publish`)
        .expect(200)

      // Then unpublish it
      const unpublishResponse = await request(strapi.server)
        .post(`/api/products/${documentId}/unpublish`)
        .expect(200)

      expect(unpublishResponse.body.entries).toBeDefined()
    })
  })
})
```

### 3. E2E Tests (Playwright 1.50+)

```typescript
// ✅ Good - E2E testing for critical flows with Playwright 1.50+ features
import { test, expect } from '@playwright/test'

test.describe('Ecommerce Flow', () => {
  test('should complete purchase flow', async ({ page }) => {
    // Navigate to product page
    await page.goto('/products/test-product')
    
    // Add to cart with improved waiting
    await page.getByTestId('add-to-cart').click()
    await expect(page.getByTestId('cart-count')).toHaveText('1')
    
    // Go to cart
    await page.getByTestId('cart-icon').click()
    await expect(page.getByTestId('cart-item')).toBeVisible()
    
    // Proceed to checkout
    await page.getByTestId('checkout-button').click()
    await expect(page).toHaveURL('/checkout')
    
    // Fill checkout form with improved selectors
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Full Name').fill('Test User')
    await page.getByLabel('Address').fill('123 Test St')
    
    // Submit order
    await page.getByRole('button', { name: 'Place Order' }).click()
    await expect(page).toHaveURL(/\/order-confirmation/)
  })

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/products', route => route.abort())
    
    await page.goto('/products')
    await expect(page.getByTestId('error-message')).toBeVisible()
  })

  test('should work across different viewports', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/products')
    
    // Verify mobile-specific elements
    await expect(page.getByTestId('mobile-menu')).toBeVisible()
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.reload()
    
    // Verify desktop-specific elements
    await expect(page.getByTestId('desktop-navigation')).toBeVisible()
  })
})
```

---

## Performance Standards

### 1. Frontend Performance

```typescript
// ✅ Good - Lazy loading components with React 18.3+ features
import { lazy, Suspense, startTransition } from 'react'

const ProductDetail = lazy(() => import('./ProductDetail'))
const CartDrawer = lazy(() => import('./CartDrawer'))

// ✅ Good - Image optimization with modern attributes
<img
  src={product.image.url}
  alt={product.name}
  loading="lazy"
  decoding="async"
  width={400}
  height={300}
  className="object-cover"
  fetchPriority="high"
/>

// ✅ Good - Memoization for expensive operations
const MemoizedProductGrid = React.memo(ProductGrid, (prevProps, nextProps) => {
  return prevProps.products.length === nextProps.products.length &&
         prevProps.products.every((product, index) => 
           product.id === nextProps.products[index].id
         )
})

// ✅ Good - Use transition for non-urgent updates
const handleProductFilter = (filter: ProductFilter) => {
  startTransition(() => {
    setFilteredProducts(filterProducts(products, filter))
  })
}
```

### 2. API Performance

```javascript
// ✅ Good - Strapi 5+ query optimization with Document Service API
const products = await strapi.documents('api::product.product').findMany({
  filters: { status: 'published' }, // Use status instead of publishedAt
  sort: { createdAt: 'desc' },
  pagination: { page: 1, pageSize: 25 },
  populate: {
    images: {
      fields: ['url', 'width', 'height', 'formats']
    },
    category: {
      fields: ['name', 'slug']
    }
  },
  // ✅ Good - Use fields to limit returned data
  fields: ['documentId', 'name', 'price', 'slug', 'inStock']
})

// ✅ Good - Batch operations for better performance
const documentIds = ['doc1', 'doc2', 'doc3'] // Use documentIds instead of numeric IDs
const products = await Promise.all(
  documentIds.map(documentId => 
    strapi.documents('api::product.product').findOne({
      documentId,
      populate: ['images'],
      fields: ['documentId', 'name', 'price']
    })
  )
)

// ✅ Good - Count operations for performance
const totalProducts = await strapi.documents('api::product.product').count({
  status: 'published'
})

// ✅ Good - Find first for single record queries
const firstProduct = await strapi.documents('api::product.product').findFirst({
  filters: { status: 'published' },
  sort: { createdAt: 'desc' },
  populate: ['images']
})
```

---

## Security Standards

### 1. Input Validation

```typescript
// ✅ Good - Frontend validation
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().positive(),
  description: z.string().min(10),
  categoryId: z.string().uuid()
})

// ✅ Good - API validation
const validateProduct = (data) => {
  const errors = []
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Name is required')
  }
  
  if (!data.price || data.price <= 0) {
    errors.push('Price must be greater than 0')
  }
  
  return errors
}
```

### 2. Authentication & Authorization

```javascript
// ✅ Good - Strapi policies
module.exports = async (policyContext, config, { strapi }) => {
  const { user } = policyContext.state
  
  if (!user) {
    return false
  }
  
  // Check if user has required permissions
  const hasPermission = await strapi
    .plugin('users-permissions')
    .service('user')
    .hasPermission(user, 'product', 'create')
  
  return hasPermission
}
```

---

## Documentation Standards

### 1. Code Comments

```typescript
/**
 * Formats a price value into a localized currency string
 * @param price - The price value in cents
 * @param currency - The currency code (default: 'USD')
 * @returns Formatted price string
 * @example
 * formatPrice(2999) // Returns "$29.99"
 * formatPrice(2999, 'EUR') // Returns "€29.99"
 */
export const formatPrice = (price: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price / 100)
}

// ✅ Good - Inline comments for complex logic
const calculateDiscount = (price: number, discountPercent: number): number => {
  // Apply discount and round to 2 decimal places
  const discount = price * (discountPercent / 100)
  return Math.round((price - discount) * 100) / 100
}
```

### 2. README Standards

```markdown
# Component/Module Name

Brief description of what this component/module does.

## Usage

```tsx
import { ComponentName } from '@/components/ComponentName'

<ComponentName prop1="value" prop2={42} />
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| prop1 | string | Yes | - | Description of prop1 |
| prop2 | number | No | 0 | Description of prop2 |

## Examples

### Basic Usage
```tsx
<ComponentName prop1="hello" />
```

### Advanced Usage
```tsx
<ComponentName 
  prop1="hello" 
  prop2={42}
  onEvent={handleEvent}
/>
```

## Accessibility

This component follows WCAG 2.1 AA guidelines:
- Proper ARIA labels
- Keyboard navigation support
- Screen reader compatibility

## Testing

Run tests with:
```bash
npm test ComponentName
```
```

---

## Git Standards

### 1. Commit Messages

```
# ✅ Good - Conventional commits
feat: add product search functionality
fix: resolve cart item quantity update issue
docs: update API documentation
style: format code with prettier
refactor: extract product card component
test: add unit tests for cart store
chore: update dependencies

# ✅ Good - Detailed commit messages
feat(products): add advanced filtering and sorting

- Add category filter dropdown
- Implement price range slider
- Add sort by name, price, and date
- Update product grid to handle new filters
- Add loading states for filter operations

Closes #123
```

### 2. Branch Naming

```
# ✅ Good - Feature branches
feature/product-search
feature/cart-persistence
feature/checkout-flow

# ✅ Good - Bug fix branches
fix/cart-quantity-update
fix/product-image-loading
fix/checkout-validation

# ✅ Good - Hotfix branches
hotfix/security-vulnerability
hotfix/critical-payment-issue
```

---

## Code Review Checklist

### Frontend Review
- [ ] TypeScript types are properly defined
- [ ] Component props are validated
- [ ] Accessibility requirements are met
- [ ] Performance optimizations are implemented
- [ ] Tests are written and passing
- [ ] Code follows established patterns
- [ ] No console.log statements in production code
- [ ] Error boundaries are in place for critical components

### Backend Review
- [ ] Input validation is implemented
- [ ] Error handling is comprehensive
- [ ] Database queries are optimized
- [ ] Security policies are enforced
- [ ] API responses are consistent
- [ ] Logging is appropriate
- [ ] Tests cover critical paths

### General Review
- [ ] Code is readable and well-documented
- [ ] No hardcoded values or magic numbers
- [ ] Environment variables are used appropriately
- [ ] Dependencies are up to date
- [ ] No security vulnerabilities
- [ ] Performance impact is considered

---

## Conclusion

These coding standards ensure consistency, quality, and maintainability across the Single-Seller Ecommerce Platform. All developers should follow these standards and use them as a reference during code reviews and development.

For questions or clarifications about these standards, please refer to the architecture team or create an issue in the project repository.

---

## Integration with Existing Architecture

This coding standards document complements the existing architecture documentation:

- **Tech Stack Alignment:** Standards follow the technologies specified in `tech-stack.md` (updated to latest versions)
- **Project Structure:** Naming conventions align with `project-structure.md`
- **API Consistency:** Backend standards match `api-specification.md` patterns
- **Data Models:** TypeScript interfaces reflect `data-models.md` definitions
- **Version Compatibility:** All standards updated for TypeScript 5.9.2+, React 18.3+, Strapi 4.25+, and Node.js 20+

## Maintenance

This document should be updated when:
- New technologies are added to the stack
- Development patterns evolve
- Security requirements change
- Performance optimizations are discovered
- Technology versions are updated in `tech-stack.md`

All updates should be versioned and communicated to the development team.

### Version Update Process

When updating technology versions:
1. Update `tech-stack.md` with new versions
2. Review and update coding standards for new features
3. Test compatibility with existing codebase
4. Update examples and best practices
5. Communicate changes to development team
