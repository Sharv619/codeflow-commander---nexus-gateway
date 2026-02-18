#!/bin/bash

# Direct Docker Deployment Script
# This script deploys the system using direct Docker commands

set -e

echo "🚀 Starting Direct Docker Deployment..."

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

# Build Docker images
build_images() {
    print_status "Building Docker images..."
    
    # Build backend image
    print_status "Building backend image..."
    docker build -f Dockerfile.python -t codeflow-backend .
    
    # Build frontend image
    print_status "Building frontend image..."
    docker build -f Dockerfile.frontend -t codeflow-frontend .
    
    print_success "Images built successfully"
}

# Start services
start_services() {
    print_status "Starting services..."
    
    # Stop existing containers if any
    docker stop codeflow-backend 2>/dev/null || true
    docker stop codeflow-frontend 2>/dev/null || true
    docker rm codeflow-backend 2>/dev/null || true
    docker rm codeflow-frontend 2>/dev/null || true
    
    # Start backend
    print_status "Starting backend service..."
    docker run -d \
        --name codeflow-backend \
        -p 3001:3001 \
        -e ENVIRONMENT=production \
        -e LOG_LEVEL=info \
        -v $(pwd)/results:/app/results \
        -v $(pwd)/pipeline-results:/app/pipeline-results \
        --restart unless-stopped \
        codeflow-backend
    
    # Start frontend
    print_status "Starting frontend service..."
    docker run -d \
        --name codeflow-frontend \
        -p 80:80 \
        -e REACT_APP_API_URL=http://localhost:3001 \
        --restart unless-stopped \
        --link codeflow-backend:backend \
        codeflow-frontend
    
    print_success "Services started"
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for backend
    print_status "Waiting for backend service..."
    sleep 15
    
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
    echo "   View logs:    docker logs -f codeflow-backend"
    echo "                 docker logs -f codeflow-frontend"
    echo "   Stop:         docker stop codeflow-backend codeflow-frontend"
    echo "   Restart:      docker restart codeflow-backend codeflow-frontend"
    echo "   Remove:       docker rm -f codeflow-backend codeflow-frontend"
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
    echo "🚀 Direct Docker CodeFlow CI/CD Pipeline Deployment"
    echo "==================================================="
    
    check_docker
    create_directories
    build_images
    start_services
    wait_for_services
    show_info
    
    print_success "Deployment completed successfully!"
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"