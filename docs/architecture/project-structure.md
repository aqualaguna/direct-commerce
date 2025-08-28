# Project Structure

## Overview

This document defines the unified project structure for the Single-Seller Ecommerce Platform using a monorepo approach with Nx. The structure accommodates both frontend (Astro) and backend (Strapi) applications while maintaining clear separation of concerns.

## Monorepo Structure

```
ecommerce-platform/
├── .github/                    # CI/CD workflows
│   └── workflows/
│       ├── ci.yaml
│       └── deploy.yaml
├── apps/                       # Application packages
│   ├── web/                    # Astro frontend
│   │   ├── src/
│   │   │   ├── components/     # UI components
│   │   │   ├── pages/          # Astro pages
│   │   │   ├── layouts/        # Page layouts
│   │   │   ├── lib/            # Utilities and API client
│   │   │   ├── services/       # Business logic services
│   │   │   ├── stores/         # State management
│   │   │   ├── styles/         # Global styles
│   │   │   └── types/          # TypeScript types
│   │   ├── public/             # Static assets
│   │   ├── astro.config.mjs    # Astro configuration
│   │   └── package.json
│   └── strapi/                 # Strapi backend
│       ├── src/
│       │   ├── api/            # API definitions
│       │   ├── components/     # Strapi components
│       │   ├── extensions/     # Strapi extensions
│       │   ├── middlewares/    # Custom middlewares
│       │   └── policies/       # Authorization policies
│       ├── config/             # Strapi configuration
│       ├── database/           # Database migrations
│       └── package.json
├── packages/                   # Shared packages
│   ├── shared/                 # Shared types/utilities
│   │   ├── src/
│   │   │   ├── types/          # TypeScript interfaces
│   │   │   ├── constants/      # Shared constants
│   │   │   └── utils/          # Shared utilities
│   │   └── package.json
│   ├── ui/                     # Shared UI components
│   │   ├── src/
│   │   │   ├── components/     # Reusable UI components
│   │   │   └── styles/         # Shared styles
│   │   └── package.json
│   └── config/                 # Shared configuration
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/
├── infrastructure/             # IaC definitions
│   ├── cloudflare/             # Cloudflare configuration
│   │   ├── wrangler.toml       # Workers configuration
│   │   └── pages/              # Pages configuration
│   └── strapi/                 # Strapi deployment
├── scripts/                    # Build/deploy scripts
│   ├── build.sh
│   ├── deploy.sh
│   └── seed.js                 # Database seeding
├── docs/                       # Documentation
│   ├── prd.md
│   ├── front-end-spec.md
│   └── architecture/
│       ├── tech-stack.md
│       ├── data-models.md
│       ├── api-specification.md
│       ├── project-structure.md
│       └── ...
├── .env.example                # Environment template
├── package.json                # Root package.json
├── nx.json                     # Nx monorepo configuration
└── README.md
```

## Frontend Structure (Astro)

### Apps/Web Directory Structure

```
apps/web/
├── src/
│   ├── components/             # UI Components
│   │   ├── layout/            # Layout components
│   │   │   ├── Header.astro
│   │   │   ├── Footer.astro
│   │   │   └── Navigation.astro
│   │   ├── product/           # Product-related components
│   │   │   ├── ProductCard.astro
│   │   │   ├── ProductGrid.astro
│   │   │   ├── ProductDetail.astro
│   │   │   └── ProductSearch.astro
│   │   ├── cart/              # Shopping cart components
│   │   │   ├── CartItem.astro
│   │   │   ├── CartSummary.astro
│   │   │   └── CartDrawer.astro
│   │   ├── checkout/          # Checkout components
│   │   │   ├── CheckoutForm.astro
│   │   │   ├── PaymentForm.astro
│   │   │   └── OrderSummary.astro
│   │   ├── user/              # User account components
│   │   │   ├── LoginForm.astro
│   │   │   ├── RegisterForm.astro
│   │   │   └── UserProfile.astro
│   │   └── ui/                # Reusable UI components
│   │       ├── Button.astro
│   │       ├── Input.astro
│   │       ├── Modal.astro
│   │       └── Loading.astro
│   ├── pages/                 # Astro pages (routes)
│   │   ├── index.astro        # Homepage
│   │   ├── products/
│   │   │   ├── index.astro    # Product catalog
│   │   │   ├── [slug].astro   # Product detail
│   │   │   └── category/
│   │   │       └── [slug].astro # Category page
│   │   ├── cart.astro         # Shopping cart
│   │   ├── checkout.astro     # Checkout process
│   │   ├── account/
│   │   │   ├── login.astro    # User login
│   │   │   ├── register.astro # User registration
│   │   │   ├── profile.astro  # User profile
│   │   │   └── orders.astro   # Order history
│   │   ├── about.astro        # About page
│   │   └── contact.astro      # Contact page
│   ├── layouts/               # Page layouts
│   │   ├── BaseLayout.astro   # Base layout
│   │   ├── ProductLayout.astro # Product-specific layout
│   │   └── AccountLayout.astro # Account-specific layout
│   ├── lib/                   # Utilities and API client
│   │   ├── api.ts             # API client setup
│   │   ├── auth.ts            # Authentication utilities
│   │   ├── cart.ts            # Cart utilities
│   │   ├── format.ts          # Formatting utilities
│   │   └── validation.ts      # Validation utilities
│   ├── services/              # Business logic services
│   │   ├── productService.ts  # Product-related API calls
│   │   ├── orderService.ts    # Order-related API calls
│   │   ├── userService.ts     # User-related API calls
│   │   └── paymentService.ts  # Payment processing
│   ├── stores/                # State management
│   │   ├── cartStore.ts       # Cart state (Zustand)
│   │   ├── userStore.ts       # User state (Zustand)
│   │   └── uiStore.ts         # UI state (Zustand)
│   ├── styles/                # Global styles
│   │   ├── globals.css        # Global CSS
│   │   ├── components.css     # Component styles
│   │   └── utilities.css      # Utility classes
│   └── types/                 # TypeScript types
│       ├── api.ts             # API response types
│       ├── product.ts         # Product types
│       ├── order.ts           # Order types
│       └── user.ts            # User types
├── public/                    # Static assets
│   ├── images/                # Static images
│   ├── icons/                 # Icons and logos
│   └── favicon.ico            # Favicon
├── astro.config.mjs           # Astro configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Frontend dependencies
```

## Backend Structure (Strapi)

### Apps/Strapi Directory Structure

```
apps/strapi/
├── src/
│   ├── api/                   # API definitions
│   │   ├── product/           # Product API
│   │   │   ├── content-types/
│   │   │   │   └── product/
│   │   │   │       └── schema.json
│   │   │   ├── controllers/
│   │   │   │   └── product.js
│   │   │   ├── routes/
│   │   │   │   └── product.js
│   │   │   └── services/
│   │   │       └── product.js
│   │   ├── category/          # Category API
│   │   │   ├── content-types/
│   │   │   ├── controllers/
│   │   │   ├── routes/
│   │   │   └── services/
│   │   ├── order/             # Order API
│   │   │   ├── content-types/
│   │   │   ├── controllers/
│   │   │   ├── routes/
│   │   │   └── services/
│   │   └── user/              # User API
│   │       ├── content-types/
│   │       ├── controllers/
│   │       ├── routes/
│   │       └── services/
│   ├── components/            # Strapi components
│   │   ├── shared/
│   │   │   ├── media.json     # Media component
│   │   │   ├── seo.json       # SEO component
│   │   │   └── address.json   # Address component
│   │   └── ui/
│   │       ├── button.json    # Button component
│   │       └── input.json     # Input component
│   ├── extensions/            # Strapi extensions
│   │   ├── users-permissions/ # Auth extensions
│   │   └── upload/            # Upload extensions
│   ├── middlewares/           # Custom middlewares
│   │   ├── auth.js            # Authentication middleware
│   │   ├── cors.js            # CORS middleware
│   │   └── error-handler.js   # Error handling middleware
│   └── policies/              # Authorization policies
│       ├── is-admin.js        # Admin policy
│       ├── is-owner.js        # Owner policy
│       └── is-public.js       # Public policy
├── config/                    # Strapi configuration
│   ├── api.js                 # API configuration
│   ├── database.js            # Database configuration
│   ├── middlewares.js         # Middleware configuration
│   ├── plugins.js             # Plugin configuration
│   └── server.js              # Server configuration
├── database/                  # Database files
│   ├── migrations/            # Database migrations
│   └── seeds/                 # Database seeds
├── public/                    # Public files
│   └── uploads/               # Uploaded files
├── .env                       # Environment variables
├── package.json               # Backend dependencies
└── strapi.js                  # Strapi entry point
```

## Shared Packages

### Packages/Shared

```
packages/shared/
├── src/
│   ├── types/                 # Shared TypeScript types
│   │   ├── index.ts           # Main types export
│   │   ├── product.ts         # Product types
│   │   ├── order.ts           # Order types
│   │   ├── user.ts            # User types
│   │   ├── api.ts             # API types
│   │   └── common.ts          # Common types
│   ├── constants/             # Shared constants
│   │   ├── index.ts           # Main constants export
│   │   ├── api.ts             # API constants
│   │   ├── validation.ts      # Validation constants
│   │   └── config.ts          # Configuration constants
│   └── utils/                 # Shared utilities
│       ├── index.ts           # Main utils export
│       ├── format.ts          # Formatting utilities
│       ├── validation.ts      # Validation utilities
│       ├── api.ts             # API utilities
│       └── helpers.ts         # Helper functions
├── package.json               # Package configuration
└── tsconfig.json              # TypeScript configuration
```

### Packages/UI

```
packages/ui/
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   │   ├── Input.tsx
│   │   │   ├── Input.test.tsx
│   │   │   └── index.ts
│   │   ├── Modal/
│   │   │   ├── Modal.tsx
│   │   │   ├── Modal.test.tsx
│   │   │   └── index.ts
│   │   └── index.ts           # Main components export
│   └── styles/                # Shared styles
│       ├── globals.css        # Global styles
│       ├── components.css     # Component styles
│       └── utilities.css      # Utility styles
├── package.json               # Package configuration
└── tsconfig.json              # TypeScript configuration
```

### Packages/Config

```
packages/config/
├── eslint/                    # ESLint configuration
│   ├── index.js               # Main ESLint config
│   ├── react.js               # React-specific rules
│   └── typescript.js          # TypeScript-specific rules
├── typescript/                # TypeScript configuration
│   ├── base.json              # Base TypeScript config
│   ├── frontend.json          # Frontend-specific config
│   └── backend.json           # Backend-specific config
├── tailwind/                  # Tailwind CSS configuration
│   ├── index.js               # Main Tailwind config
│   └── components.js          # Component-specific config
└── package.json               # Package configuration
```

## Infrastructure

### Infrastructure/Cloudflare

```
infrastructure/cloudflare/
├── wrangler.toml              # Workers configuration
├── pages/                     # Pages configuration
│   ├── _routes.json           # Custom routes
│   └── _headers               # Custom headers
└── workers/                   # Cloudflare Workers
    ├── payment-worker/        # Payment processing worker
    │   ├── index.js
    │   └── wrangler.toml
    ├── email-worker/          # Email processing worker
    │   ├── index.js
    │   └── wrangler.toml
    └── analytics-worker/      # Analytics worker
        ├── index.js
        └── wrangler.toml
```

## Scripts

### Scripts Directory

```
scripts/
├── build.sh                   # Build script
├── deploy.sh                  # Deploy script
├── seed.js                    # Database seeding
├── setup.sh                   # Initial setup
└── test.sh                    # Test runner
```

## Configuration Files

### Root Configuration

- **package.json**: Root package configuration with workspaces
- **nx.json**: Nx monorepo configuration
- **.env.example**: Environment variables template
- **.gitignore**: Git ignore rules
- **README.md**: Project documentation

### Frontend Configuration

- **astro.config.mjs**: Astro configuration
- **tailwind.config.js**: Tailwind CSS configuration
- **tsconfig.json**: TypeScript configuration
- **vite.config.ts**: Vite configuration

### Backend Configuration

- **config/**: Strapi configuration files
- **.env**: Environment variables
- **strapi.js**: Strapi entry point

## Development Workflow

### Package Management

- **pnpm**: Package manager for the monorepo
- **Nx**: Build system and task runner
- **Workspaces**: Shared dependencies management

### Build Process

1. **Frontend Build**: Astro static site generation
2. **Backend Build**: Strapi application build
3. **Shared Packages**: TypeScript compilation
4. **Assets**: Static asset optimization

### Deployment Process

1. **Frontend**: Deploy to Cloudflare Pages
2. **Backend**: Deploy to Strapi Cloud
3. **Workers**: Deploy to Cloudflare Workers
4. **Database**: PostgreSQL migration

## Benefits of This Structure

### Monorepo Advantages
- **Shared Code**: Common types and utilities
- **Consistent Tooling**: Unified development experience
- **Atomic Commits**: Related changes in single commit
- **Simplified CI/CD**: Single pipeline for all applications

### Clear Separation
- **Frontend/Backend**: Clear boundaries between applications
- **Shared Packages**: Reusable code without duplication
- **Configuration**: Environment-specific configurations
- **Documentation**: Centralized project documentation

### Scalability
- **Modular Design**: Easy to add new applications
- **Package Isolation**: Independent versioning and deployment
- **Team Organization**: Clear ownership and responsibilities
- **Technology Flexibility**: Easy to swap technologies
