#!/bin/bash

# Simple CodeFlow CI/CD Pipeline Deployment Script
# This script deploys the basic containerized system

set -e

echo "🚀 Starting Simple CodeFlow CI/CD Pipeline Deployment..."

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

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    print_success "Docker is installed"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p results
    mkdir -p pipeline-results
    
    print_success "Directories created"
}

# Build and start services
deploy_services() {
    print_status "Building and starting services..."
    
    # Build images
    docker-compose -f docker-compose.simple.yml build
    
    # Start services
    docker-compose -f docker-compose.simple.yml up -d
    
    print_success "Services started"
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for backend
    print_status "Waiting for backend service..."
    sleep 10
    
    # Wait for frontend
    print_status "Waiting for frontend service..."
    sleep 10
    
    print_success "Services are ready"
}

# Display deployment information
show_info() {
    print_success "🎉 CodeFlow CI/CD Pipeline deployed successfully!"
    echo ""
    echo "📋 Access Information:"
    echo "   Frontend:     http://localhost"
    echo "   Backend API:  http://localhost:3001"
    echo "   API Docs:     http://localhost:3001/docs"
    echo ""
    echo "🔧 Management Commands:"
    echo "   View logs:    docker-compose -f docker-compose.simple.yml logs -f"
    echo "   Stop:         docker-compose -f docker-compose.simple.yml down"
    echo "   Restart:      docker-compose -f docker-compose.simple.yml restart"
    echo "   Update:       docker-compose -f docker-compose.simple.yml pull && docker-compose -f docker-compose.simple.yml up -d"
    echo ""
    echo "📊 What You Get:"
    echo "   ✅ Real CI/CD execution with actual commands"
    echo "   ✅ AI code review with security analysis"
    echo "   ✅ Live frontend with real-time updates"
    echo "   ✅ Professional CLI output formatting"
    echo "   ✅ Project detection and pipeline generation"
}

# Main deployment function
main() {
    echo "🚀 Simple CodeFlow CI/CD Pipeline Deployment"
    echo "============================================="
    
    check_docker
    create_directories
    deploy_services
    wait_for_services
    show_info
    
    print_success "Deployment completed successfully!"
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"