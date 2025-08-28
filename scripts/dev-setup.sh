#!/bin/bash

# Development Setup Script for Ecommerce Platform
# This script sets up the development environment with Docker Compose

set -e

echo "🚀 Setting up development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start PostgreSQL database
echo "📦 Starting PostgreSQL database..."
docker-compose up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Check if database is accessible
echo "🔍 Testing database connection..."
if docker-compose exec -T postgres pg_isready -U strapi -d strapi_ecommerce; then
    echo "✅ Database is ready!"
else
    echo "❌ Database connection failed. Please check Docker logs."
    exit 1
fi

# Copy environment file if it doesn't exist
if [ ! -f "apps/strapi/.env" ]; then
    echo "📝 Creating .env file from example..."
    cp apps/strapi/config/env.example apps/strapi/.env
    echo "✅ Environment file created. Please update with your specific values."
fi

echo "🎉 Development environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update apps/strapi/.env with your specific configuration"
echo "2. Run 'npm run strapi:dev' to start Strapi development server"
echo "3. Access pgAdmin at http://localhost:5050 (admin@ecommerce.local / admin_password)"
echo "4. Database is accessible at localhost:5432"
