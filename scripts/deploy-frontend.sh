#!/bin/bash

# Frontend Build and Deployment Script
# This script builds the frontend and deploys it

set -e

echo "🏗️ Building Frontend..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if npm is available
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install Node.js and npm first."
        exit 1
    fi
    
    print_success "npm is available"
}

# Build frontend
build_frontend() {
    print_status "Building frontend..."
    
    cd packages/simulator-ui
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm install
    
    # Build the application
    print_status "Building application..."
    npm run build
    
    cd ../..
    
    print_success "Frontend built successfully"
}

# Create simple nginx container
create_nginx_container() {
    print_status "Creating nginx container for frontend..."
    
    # Stop existing container if any
    docker stop codeflow-frontend 2>/dev/null || true
    docker rm codeflow-frontend 2>/dev/null || true
    
    # Start nginx container with built frontend
    docker run -d \
        --name codeflow-frontend \
        -p 80:80 \
        -v $(pwd)/packages/simulator-ui/dist:/usr/share/nginx/html:ro \
        -v $(pwd)/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro \
        --restart unless-stopped \
        nginx:alpine
    
    print_success "Frontend container created"
}

# Main function
main() {
    echo "🏗️ Frontend Build and Deployment"
    echo "==============================="
    
    check_npm
    build_frontend
    create_nginx_container
    
    print_success "Frontend deployment completed successfully!"
    echo ""
    echo "Frontend is now available at: http://localhost"
}

# Handle script interruption
trap 'print_error "Frontend deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"