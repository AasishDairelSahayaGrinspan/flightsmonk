#!/bin/bash

# ----------------------
# KUDU Deployment Script
# Version: 1.0.0
# ----------------------

# Helpers
exitWithMessageOnError () {
  if [ ! $? -eq 0 ]; then
    echo "An error has occurred during web site deployment."
    echo $1
    exit 1
  fi
}

# Prerequisites
# Verify node.js installed
hash node 2>/dev/null
exitWithMessageOnError "Missing node.js executable, please install node.js"

# Setup
DEPLOYMENT_SOURCE="${DEPLOYMENT_SOURCE:-$PWD}"
DEPLOYMENT_TARGET="${DEPLOYMENT_TARGET:-$PWD}"

echo "Deployment Source: $DEPLOYMENT_SOURCE"
echo "Deployment Target: $DEPLOYMENT_TARGET"

# Install npm packages
echo "Running npm install..."
cd "$DEPLOYMENT_SOURCE"
npm install --production=false
exitWithMessageOnError "npm install failed"

# Build the application
echo "Building the application..."
npm run build
exitWithMessageOnError "npm build failed"

echo "Deployment completed successfully."
