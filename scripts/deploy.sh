#!/bin/bash

# Deployment Script for Ecommerce Platform
# This script handles deployment to different environments

set -e

ENVIRONMENT=${1:-staging}

echo "🚀 Deploying to $ENVIRONMENT environment..."

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo "❌ Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

# Build all projects
echo "📦 Building projects..."
npm run build

# Deploy Strapi backend
echo "🔧 Deploying Strapi backend..."
cd apps/strapi
npm run deploy

# Deploy frontend (when available)
echo "🌐 Deploying frontend..."
cd ../web
# npm run deploy (uncomment when frontend is ready)

# Deploy infrastructure
echo "🏗️ Deploying infrastructure..."
cd ../../infrastructure/cloudflare
wrangler deploy --env $ENVIRONMENT

echo "✅ Deployment to $ENVIRONMENT completed successfully!"
