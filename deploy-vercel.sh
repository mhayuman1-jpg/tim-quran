#!/bin/bash
# deploy-vercel.sh - Script deployment ke Vercel
# Usage: ./deploy-vercel.sh [--prod]

set -e

echo "=== DEPLOYMENT KE VERCEL ==="
echo ""

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm i -g vercel
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "Please login to Vercel first:"
    vercel login
fi

# Parse arguments
PROD_FLAG=""
if [ "$1" = "--prod" ]; then
    PROD_FLAG="--prod"
    echo "Mode: PRODUCTION"
else
    echo "Mode: PREVIEW"
fi

echo ""
echo "Step 1: Building project..."
npm run build

echo ""
echo "Step 2: Deploying to Vercel..."
if [ -n "$PROD_FLAG" ]; then
    vercel --prod
else
    vercel
fi

echo ""
echo "=== DEPLOYMENT SELESAI ==="
echo ""
echo "Next steps:"
echo "1. Cek URL deployment di Vercel Dashboard"
echo "2. Set environment variables jika belum"
echo "3. Test semua fitur"
echo "4. Update DNS domain jika production"
