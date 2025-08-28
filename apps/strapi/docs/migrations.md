# Database Migration System

## Overview

This document describes the database migration system for the Strapi Ecommerce Platform. The system supports multiple environments and provides automated database setup and seeding capabilities.

## Architecture

### Strapi's Built-in Migration System

Strapi automatically handles database migrations through its content type system. When you define content types in the `src/api/*/content-types/` directory, Strapi automatically:

1. Creates database tables
2. Manages schema changes
3. Handles relationships
4. Provides rollback capabilities

### Migration Files

- **SQL Migrations**: `database/migrations/*.sql` - Reference documentation of expected database structure
- **JavaScript Seeds**: `src/seeds/*.js` - Actual seeding scripts using Strapi's API
- **Migration Script**: `scripts/migrate.js` - Custom migration management script

## Environments

### Development Environment
- **Database**: SQLite (in-memory)
- **Purpose**: Local development and testing
- **Configuration**: Automatic setup with no external dependencies

### Test Environment
- **Database**: SQLite (in-memory)
- **Purpose**: Automated testing
- **Configuration**: Isolated database for each test run

### Production Environment
- **Database**: PostgreSQL
- **Purpose**: Live application
- **Configuration**: Requires PostgreSQL server and environment variables

## Usage

### Basic Commands

```bash
# Run migrations
npm run migrate

# Run seeding
npm run seed

# Bootstrap (migrate + seed)
npm run bootstrap

# Reset database (WARNING: Deletes all data)
npm run reset
```

### Environment-Specific Commands

```bash
# Development (default)
npm run migrate
npm run seed --env development

# Testing
npm run migrate --env test
npm run seed --env test

# Production
npm run migrate --env production
npm run seed --env production
```

### Using the Migration Script

```bash
# Show help
node scripts/migrate.js

# Run migrations for specific environment
node scripts/migrate.js migrate --env production

# Run seeding for test environment
node scripts/migrate.js seed --env test

# Bootstrap production database
node scripts/migrate.js bootstrap --env production
```

## Database Schema

### Core Tables

#### Products
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  short_description VARCHAR(500) NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  compare_price DECIMAL(10,2),
  sku VARCHAR(100) NOT NULL UNIQUE,
  inventory INTEGER NOT NULL DEFAULT 0 CHECK (inventory >= 0),
  is_active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  created_by_id UUID REFERENCES admin_users(id),
  updated_by_id UUID REFERENCES admin_users(id)
);
```

#### Categories
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  parent_id UUID REFERENCES categories(id),
  published_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  created_by_id UUID REFERENCES admin_users(id),
  updated_by_id UUID REFERENCES admin_users(id)
);
```

#### Addresses
```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY,
  type ENUM('shipping', 'billing', 'both') NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  address1 VARCHAR(255) NOT NULL,
  address2 VARCHAR(255),
  city VARCHAR(255) NOT NULL,
  state VARCHAR(255) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  user_id UUID NOT NULL REFERENCES up_users(id),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

### Relationship Tables

#### Product-Category (Many-to-One)
```sql
CREATE TABLE products_categories_links (
  id INTEGER PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  UNIQUE(product_id, category_id)
);
```

#### User-Wishlist (Many-to-Many)
```sql
CREATE TABLE up_users_wishlist_links (
  id INTEGER PRIMARY KEY,
  user_id UUID REFERENCES up_users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(user_id, product_id)
);
```

## Seeding Data

### Sample Data Structure

The seeding script creates:

1. **Categories**: Electronics, Clothing, Books, Smartphones
2. **Products**: iPhone 15 Pro, Samsung Galaxy S24, MacBook Pro, Nike Air Max, The Great Gatsby
3. **Users**: john_doe, jane_smith, admin_user
4. **Addresses**: Shipping and billing addresses for users
5. **Wishlist Relationships**: Sample wishlist items
6. **SEO Data**: Meta information for products and categories

### Customizing Seed Data

To customize the seed data:

1. Edit `src/seeds/001-sample-data.js`
2. Modify the data arrays in each function
3. Run `npm run seed` to apply changes

### Adding New Seed Files

1. Create a new file in `src/seeds/` with format `002-your-seed.js`
2. Follow the same structure as the existing seed file
3. Export a `seed` function that takes `{ strapi }` as parameter

## Testing Database Setup

### Test Database Configuration

Tests use an isolated SQLite in-memory database:

```javascript
// jest.setup.js
process.env.NODE_ENV = 'test';
process.env.DATABASE_CLIENT = 'sqlite';
process.env.DATABASE_FILENAME = ':memory:';
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Environment Variables

### Required for Production

```bash
# Database Configuration
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=strapi_ecommerce
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=strapi_password
DATABASE_SSL=false

# Strapi Configuration
APP_KEYS=your-app-keys-here
API_TOKEN_SALT=your-api-token-salt-here
ADMIN_JWT_SECRET=your-admin-jwt-secret-here
JWT_SECRET=your-jwt-secret-here
```

### Development/Testing

```bash
# Development (SQLite)
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=:memory:

# Testing (SQLite)
NODE_ENV=test
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=:memory:
```

## Best Practices

### Migration Guidelines

1. **Never modify existing migrations** - Create new ones instead
2. **Test migrations in development** before applying to production
3. **Backup production database** before running migrations
4. **Use transactions** for complex migrations
5. **Document schema changes** in migration files

### Seeding Guidelines

1. **Make seed data realistic** but not production-like
2. **Use consistent naming conventions** for sample data
3. **Include relationships** between entities
4. **Make seeds idempotent** - safe to run multiple times
5. **Test seed scripts** in isolation

### Testing Guidelines

1. **Use isolated test databases** for each test run
2. **Clean up test data** after each test
3. **Mock external dependencies** when possible
4. **Test both success and failure scenarios**
5. **Use realistic test data** that matches production structure

## Troubleshooting

### Common Issues

#### Migration Fails
```bash
# Check database connection
npm run migrate --env development

# Reset database and try again
npm run reset
npm run bootstrap
```

#### Seed Data Not Created
```bash
# Check if database exists
npm run migrate

# Run seeding manually
npm run seed
```

#### Test Database Issues
```bash
# Clear Jest cache
npm run test -- --clearCache

# Reset test environment
npm run test:reset
```

### Debugging

1. **Check logs** for detailed error messages
2. **Verify environment variables** are set correctly
3. **Test database connectivity** manually
4. **Check file permissions** for database files
5. **Review migration order** and dependencies

## Security Considerations

1. **Never commit sensitive data** to version control
2. **Use environment variables** for database credentials
3. **Limit database user permissions** in production
4. **Regularly backup** production databases
5. **Monitor database access** and queries

## Performance Optimization

1. **Use indexes** on frequently queried columns
2. **Optimize relationships** to avoid N+1 queries
3. **Use pagination** for large datasets
4. **Monitor query performance** in production
5. **Consider caching** for read-heavy operations
