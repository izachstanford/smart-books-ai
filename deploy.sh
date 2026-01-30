#!/bin/bash

# Smart Books AI - Deployment Script
# Builds the app and deploys to website-ai-with-zach

set -e  # Exit on any error

echo "🚀 Starting Smart Books AI deployment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="../website-ai-with-zach/public/smart-books-ai"

echo -e "${BLUE}📦 Step 1: Building React app...${NC}"
cd "$SOURCE_DIR"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build completed successfully!${NC}"
else
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo -e "${BLUE}📂 Step 2: Preparing target directory...${NC}"

# Check if website repo exists
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${YELLOW}⚠️  Target directory doesn't exist. Creating it...${NC}"
    mkdir -p "$TARGET_DIR"
fi

# Clear existing files (except .git if it exists)
if [ -d "$TARGET_DIR" ]; then
    echo "  Cleaning old deployment files..."
    rm -rf "$TARGET_DIR"/*
fi

echo ""
echo -e "${BLUE}📋 Step 3: Copying build files to website...${NC}"
cp -r build/* "$TARGET_DIR/"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Files copied successfully!${NC}"
else
    echo "❌ Copy failed!"
    exit 1
fi

echo ""
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo "  Source: $SOURCE_DIR/build"
echo "  Target: $TARGET_DIR"
echo ""
echo "  Files deployed:"
du -sh "$TARGET_DIR"
echo ""
ls -lh "$TARGET_DIR/data/" 2>/dev/null | grep ".json" || echo "  (Data files included)"

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${YELLOW}📌 Next steps:${NC}"
echo "  1. cd ../website-ai-with-zach"
echo "  2. git status (to see changes)"
echo "  3. git add public/smart-books-ai"
echo "  4. git commit -m 'Deploy Smart Books AI'"
echo "  5. git push"
echo ""
