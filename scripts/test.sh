#!/bin/bash

# Test Runner Script for Ecommerce Platform
# This script runs all tests across the monorepo

set -e

echo "🧪 Running tests for Ecommerce Platform..."

# Run linting
echo "🔍 Running linting..."
npm run lint

# Run type checking
echo "📝 Running type checking..."
npm run type-check

# Run formatting check
echo "🎨 Checking code formatting..."
npm run format:check

# Run Strapi tests (when available)
echo "🔧 Running Strapi tests..."
cd apps/strapi
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    npm test
else
    echo "⚠️ No test script found in Strapi"
fi

# Run frontend tests (when available)
echo "🌐 Running frontend tests..."
cd ../web
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    npm test
else
    echo "⚠️ No test script found in web app"
fi

# Run shared package tests
echo "📦 Running shared package tests..."
cd ../../packages/shared
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    npm test
else
    echo "⚠️ No test script found in shared package"
fi

echo "✅ All tests completed!"
