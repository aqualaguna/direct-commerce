# Ecommerce Platform
BMAD Core method using cursor.
but please don't use it as this project is experimental and stil ALPHA Status.
the code and the test may be halucinate due to not reading the generated code.

Single-Seller Ecommerce Platform built with Strapi backend and Astro frontend in a monorepo structure.

## Tech Stack

- **Backend**: Strapi 5.23.1+ with TypeScript
- **Frontend**: Astro 4.5+ with React 18.3+ (coming soon)
- **Database**: PostgreSQL 16+ (Docker)
- **Monorepo**: Nx workspace
- **Package Manager**: npm

## Prerequisites

- Node.js 18+ (currently using v22.18.0)
- Docker and Docker Compose
- npm 8+

## Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd my-strapi-project
npm install
```

### 2. Start Development Environment

```bash
# Start PostgreSQL database
npm run db:up

# Or use the full setup script
npm run dev:setup
```

### 3. Start Strapi Development Server

```bash
npm run strapi:dev
```

### 4. Access the Application

- **Strapi Admin**: http://localhost:1337/admin
- **Strapi API**: http://localhost:1337/api
- **pgAdmin**: http://localhost:5050 (admin@ecommerce.local / admin_password)

## Development Scripts

### Database Management

```bash
npm run db:up      # Start PostgreSQL database
npm run db:down    # Stop all containers
npm run db:reset   # Reset database (removes all data)
```

### Strapi Commands

```bash
npm run strapi:dev    # Start Strapi in development mode
npm run strapi:build  # Build Strapi for production
npm run strapi:start  # Start Strapi in production mode
```

### Nx Commands

```bash
npx nx build strapi    # Build Strapi project
npx nx build web       # Build web project (when available)
npx nx show projects   # List all projects
```

## Project Structure

```
ecommerce-platform/
├── apps/
│   ├── strapi/          # Strapi backend application
│   └── web/             # Astro frontend (coming soon)
├── packages/
│   ├── shared/          # Shared types and utilities
│   ├── ui/              # Shared UI components
│   └── config/          # Shared configuration files
├── infrastructure/      # Infrastructure configuration
├── scripts/             # Development scripts
└── docs/                # Documentation
```

## Environment Configuration

Copy the example environment file and update with your specific values:

```bash
cp apps/strapi/config/env.example apps/strapi/.env
```

### Required Environment Variables

- `DATABASE_CLIENT`: postgres
- `DATABASE_HOST`: localhost
- `DATABASE_PORT`: 5432
- `DATABASE_NAME`: strapi_ecommerce
- `DATABASE_USERNAME`: strapi
- `DATABASE_PASSWORD`: strapi_password

## Database Setup

The project uses PostgreSQL 16+ running in Docker. The database is automatically initialized with:

- Database name: `strapi_ecommerce`
- Username: `strapi`
- Password: `strapi_password`
- Port: `5432`

## Contributing

1. Follow the coding standards defined in `docs/architecture/coding-standards.md`
2. Use the defined project structure in `docs/architecture/project-structure.md`
3. Follow the tech stack versions in `docs/architecture/tech-stack.md`

## Architecture Documentation

- [Product Requirements Document](docs/prd.md)
- [Architecture Overview](docs/architecture.md)
- [Tech Stack](docs/architecture/tech-stack.md)
- [Project Structure](docs/architecture/project-structure.md)
- [Coding Standards](docs/architecture/coding-standards.md)
