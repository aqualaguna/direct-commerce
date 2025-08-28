# Technology Stack

This is the **DEFINITIVE technology selection** for the entire project. This table is the single source of truth - all development must use these exact versions.

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| **Frontend Language** | TypeScript | 5.9.2+ | Type-safe frontend development | Ensures code quality and developer productivity |
| **Frontend Framework** | Astro | 4.5+ | Static site generation with partial hydration | Optimal performance for ecommerce with minimal JavaScript |
| **UI Component Library** | React + Tailwind CSS | React 18.3+, Tailwind 3.4+ | Rapid UI development with utility-first CSS | Familiar React ecosystem with excellent styling system |
| **State Management** | Zustand | 4.5+ | Lightweight state management | Simple, performant state management for ecommerce |
| **Backend Language** | JavaScript/TypeScript | Node.js 20+ | Strapi backend development | Strapi's native language with TypeScript support |
| **Backend Framework** | Strapi | 4.25+ | Headless CMS and API | Proven ecommerce capabilities with excellent admin interface |
| **API Style** | REST | - | Strapi's native API approach | Simple, cacheable, and widely supported |
| **Database** | PostgreSQL | 16+ | Primary database | Strapi's recommended database with excellent performance |
| **Cache** | Cloudflare Cache | - | Edge caching | Built-in with Cloudflare Pages for optimal performance |
| **File Storage** | Cloudflare R2 | - | Media and file storage | Cost-effective alternative to S3 with Cloudflare integration |
| **Authentication** | Strapi Auth + JWT | - | User authentication | Built-in Strapi authentication with JWT tokens |
| **Frontend Testing** | Vitest + Testing Library | Vitest 2.0+ | Component and unit testing | Fast testing with excellent React support |
| **Backend Testing** | Jest + Supertest | Jest 30+ | API and integration testing | Strapi's recommended testing stack |
| **E2E Testing** | Playwright | 1.50+ | End-to-end testing | Excellent cross-browser testing for ecommerce flows |
| **Build Tool** | Astro CLI | 4.5+ | Frontend build system | Astro's native build tool with excellent optimization |
| **Bundler** | Vite (via Astro) | 6.0+ | Fast development and building | Astro's default bundler with excellent performance |
| **IaC Tool** | Cloudflare Wrangler | 3.50+ | Infrastructure as Code | Cloudflare's CLI for Workers and configuration |
| **CI/CD** | GitHub Actions | - | Automated deployment | Git-based workflow with Cloudflare Pages integration |
| **Monitoring** | Cloudflare Analytics | - | Performance monitoring | Built-in analytics with Cloudflare Pages |
| **Logging** | Cloudflare Logs | - | Application logging | Centralized logging through Cloudflare |
| **CSS Framework** | Tailwind CSS | 3.4+ | Utility-first CSS framework | Rapid development with excellent customization |

## Technology Rationale

### Frontend Stack
- **Astro 4.5+:** Latest version with excellent performance and Cloudflare integration
- **TypeScript 5.9.2+:** Latest stable version with enhanced type safety and performance
- **React 18.3+:** Latest React version with concurrent features and improved performance
- **Tailwind CSS 3.4+:** Latest version with improved performance and new features
- **Zustand 4.5+:** Latest version with improved TypeScript support and performance

### Backend Stack
- **Strapi 4.25+:** Latest stable version with all ecommerce features and security updates
- **PostgreSQL 16+:** Latest LTS version with improved performance and features
- **Node.js 20+:** Latest LTS version with long-term support and security updates

### Infrastructure Stack
- **Cloudflare ecosystem:** R2 for storage, Cache for performance, Analytics for monitoring
- **GitHub Actions:** Excellent integration with Cloudflare Pages
- **Wrangler 3.50+:** Latest Cloudflare CLI with improved features and performance

### Testing Strategy
- **Vitest 2.0+:** Latest version with improved performance and Jest compatibility
- **Jest 30+:** Latest version with improved performance and TypeScript support
- **Playwright 1.50+:** Latest version with improved browser automation and testing capabilities
