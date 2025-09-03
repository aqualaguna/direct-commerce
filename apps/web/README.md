# Ecommerce Frontend

A modern, performant ecommerce frontend built with Astro, React, and Tailwind CSS.

## 🚀 Features

- **Modern Tech Stack**: Astro 4.5+, React 18.3+, TypeScript 5.9.2+, Tailwind CSS 4.1+
- **Performance Optimized**: Static site generation with partial hydration
- **Type Safe**: Full TypeScript support with strict configuration
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Accessibility**: WCAG 2.1 AA compliant components
- **SEO Optimized**: Built-in SEO features and meta tags
- **Testing Ready**: Vitest, Testing Library, and Playwright setup
- **Development Experience**: Hot reload, ESLint, Prettier

## 📦 Tech Stack

- **Framework**: [Astro](https://astro.build/) 4.5+
- **UI Library**: [React](https://react.dev/) 18.3+
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) 4.1+
- **Language**: [TypeScript](https://www.typescriptlang.org/) 5.9.2+
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) 4.5+
- **Testing**: [Vitest](https://vitest.dev/) 2.0+, [Playwright](https://playwright.dev/) 1.50+
- **Code Quality**: ESLint, Prettier
- **API Client**: Axios with Strapi integration

## 🛠️ Development Setup

### Prerequisites

- Node.js 20+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd my-strapi-project
   ```

2. **Install dependencies**
   ```bash
   cd apps/web
   npm install
   ```

3. **Environment setup**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

The site will be available at `http://localhost:4321`

## 📁 Project Structure

```
apps/web/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── layout/         # Layout components (Header, Footer, Navigation)
│   │   ├── product/        # Product-related components
│   │   ├── cart/           # Shopping cart components
│   │   ├── checkout/       # Checkout components
│   │   ├── user/           # User account components
│   │   └── ui/             # Basic UI components
│   ├── layouts/            # Page layouts
│   ├── pages/              # Astro pages (routes)
│   ├── stores/             # State management (Zustand)
│   ├── styles/             # Global styles and CSS
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   └── test/               # Test setup and utilities
├── public/                 # Static assets
├── astro.config.mjs        # Astro configuration
├── tailwind.config.mjs     # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── vitest.config.ts        # Vitest configuration
└── package.json            # Dependencies and scripts
```

## 🎯 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run unit tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Environment
NODE_ENV=development

# Astro Configuration
PUBLIC_SITE_URL=http://localhost:4321
PUBLIC_SITE_NAME=Ecommerce Store

# Strapi API Configuration
PUBLIC_STRAPI_URL=http://localhost:1337
PUBLIC_STRAPI_API_TOKEN=your-strapi-api-token

# Authentication
PUBLIC_AUTH_ENABLED=true
PUBLIC_AUTH_REDIRECT_URL=http://localhost:4321/auth/callback

# Analytics
PUBLIC_ANALYTICS_ENABLED=false
PUBLIC_ANALYTICS_ID=your-analytics-id

# Payment Processing
PUBLIC_PAYMENT_ENABLED=false
PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key

# Image Optimization
PUBLIC_IMAGE_OPTIMIZATION_ENABLED=true
PUBLIC_IMAGE_CDN_URL=https://your-cdn.com

# Feature Flags
PUBLIC_FEATURE_CART_ENABLED=true
PUBLIC_FEATURE_WISHLIST_ENABLED=true
PUBLIC_FEATURE_REVIEWS_ENABLED=true
```

### Tailwind CSS

The project uses Tailwind CSS 4.1+ with custom configuration:

- Custom color palette with primary colors
- Responsive design utilities
- Custom animations and transitions
- Component classes for common patterns

### TypeScript

Strict TypeScript configuration with:

- Path mapping for clean imports
- Strict type checking
- React JSX support
- Astro integration

## 🧪 Testing

### Unit Tests

Run unit tests with Vitest:

```bash
npm run test
```

### Component Tests

Test React components with Testing Library:

```bash
npm run test:ui
```

### End-to-End Tests

Run E2E tests with Playwright:

```bash
npm run test:e2e
```

### Coverage

Generate test coverage report:

```bash
npm run test:coverage
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Deployment Platforms

This project is configured for deployment on:

- **Cloudflare Pages** (recommended)
- **Vercel**
- **Netlify**
- **GitHub Pages**

## 📚 Development Guidelines

### Code Style

- Follow ESLint and Prettier configuration
- Use TypeScript for all new code
- Follow component naming conventions
- Write meaningful commit messages

### Component Development

- Use functional components with hooks
- Implement proper TypeScript interfaces
- Follow accessibility guidelines
- Write unit tests for components

### State Management

- Use Zustand for global state
- Keep component state local when possible
- Follow immutable update patterns

### Performance

- Use Astro's partial hydration
- Optimize images and assets
- Implement lazy loading
- Monitor Core Web Vitals

## 🔗 Integration

### Strapi Backend

The frontend integrates with a Strapi backend:

- API client configured for Strapi
- Authentication integration
- Product and order management
- User account features

### External Services

- Payment processing (Stripe)
- Analytics (configurable)
- Image optimization (Cloudflare R2)
- Email services (configurable)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Check the documentation
- Open an issue on GitHub
- Contact the development team

## 🔄 Updates

Keep dependencies updated:

```bash
npm update
npm audit fix
```

---

Built with ❤️ using modern web technologies.
