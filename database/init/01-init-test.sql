-- Initialize database for Strapi Ecommerce Platform
-- This script runs when the PostgreSQL container starts for the first time

-- Create the main database if it doesn't exist (handled by POSTGRES_DB env var)
-- Create test database for testing
CREATE DATABASE strapi_test;


-- Create additional schemas if needed
CREATE SCHEMA IF NOT EXISTS public;

-- Set proper permissions
GRANT ALL PRIVILEGES ON DATABASE strapi_test TO strapi;
GRANT ALL PRIVILEGES ON SCHEMA public TO strapi;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO strapi;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO strapi;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO strapi;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO strapi;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
