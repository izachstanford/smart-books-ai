#!/usr/bin/env node
/**
 * SmartBooks AI - Deployment Script
 * Copies build folder to website-ai-with-zach/public/smart-books-ai/
 */
const fs = require('fs-extra');
const path = require('path');

const SOURCE_BUILD = path.join(__dirname, 'build');
const WEBSITE_PATH = path.join(__dirname, '..', 'website-ai-with-zach', 'public', 'smart-books-ai');

async function deploy() {
  console.log('🚀 SmartBooks AI - Deployment Script\n');

  // Check if build folder exists
  if (!fs.existsSync(SOURCE_BUILD)) {
    console.error('❌ Error: Build folder not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Check if website folder exists
  const websiteRoot = path.join(__dirname, '..', 'website-ai-with-zach');
  if (!fs.existsSync(websiteRoot)) {
    console.error('❌ Error: website-ai-with-zach folder not found.');
    console.error('   Expected location:', websiteRoot);
    process.exit(1);
  }

  try {
    console.log('📁 Source:', SOURCE_BUILD);
    console.log('📁 Destination:', WEBSITE_PATH);
    console.log('');

    // Remove existing deployment
    if (fs.existsSync(WEBSITE_PATH)) {
      console.log('🗑️  Removing existing deployment...');
      fs.emptyDirSync(WEBSITE_PATH);
    }

    // Copy build folder
    console.log('📦 Copying build files...');
    fs.copySync(SOURCE_BUILD, WEBSITE_PATH);

    // Copy data files if they exist
    const dataPath = path.join(__dirname, 'data');
    const dataFiles = [
      'library_with_embeddings.json',
      'analytics_data.json',
      'galaxy_coordinates.json'
    ];

    const destDataPath = path.join(WEBSITE_PATH, 'data');
    fs.ensureDirSync(destDataPath);

    let copiedDataFiles = 0;
    for (const file of dataFiles) {
      const src = path.join(dataPath, file);
      if (fs.existsSync(src)) {
        fs.copySync(src, path.join(destDataPath, file));
        copiedDataFiles++;
      }
    }
    console.log(`📊 Copied ${copiedDataFiles} data files`);

    // Verify deployment
    const indexHtml = path.join(WEBSITE_PATH, 'index.html');
    if (fs.existsSync(indexHtml)) {
      console.log('');
      console.log('✅ Deployment successful!');
      console.log('');
      console.log('📍 Your app is now at: /smart-books-ai/');
      console.log('');
      console.log('Next steps:');
      console.log('  1. cd ../website-ai-with-zach');
      console.log('  2. npm run build');
      console.log('  3. Deploy to Netlify');
    } else {
      console.error('❌ Deployment verification failed - index.html not found');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deploy();
