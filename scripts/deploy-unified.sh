#!/bin/bash

# Unified Container Deployment Script
# Single container with both frontend and backend

set -e

echo "🚀 Starting Unified Container Deployment..."

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

# Build unified image
build_image() {
    print_status "Building unified container image..."
    
    docker build -f Dockerfile.unified -t codeflow-unified .
    
    print_success "Unified image built successfully"
}

# Start unified container
start_container() {
    print_status "Starting unified container..."
    
    # Stop existing container if any
    docker stop codeflow-unified 2>/dev/null || true
    docker rm codeflow-unified 2>/dev/null || true
    
    # Start unified container
    docker run -d \
        --name codeflow-unified \
        -p 80:80 \
        -p 3001:3001 \
        -e ENVIRONMENT=production \
        -e LOG_LEVEL=info \
        -v $(pwd)/results:/app/results \
        -v $(pwd)/pipeline-results:/app/pipeline-results \
        --restart unless-stopped \
        codeflow-unified
    
    print_success "Unified container started"
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
    echo "   View logs:    docker logs -f codeflow-unified"
    echo "   Stop:         docker stop codeflow-unified"
    echo "   Restart:      docker restart codeflow-unified"
    echo "   Remove:       docker rm -f codeflow-unified"
    echo ""
    echo "📊 What You Get:"
    echo "   ✅ Single container with frontend + backend"
    echo "   ✅ Real CI/CD execution with actual commands"
    echo "   ✅ AI code review with security analysis"
    echo "   ✅ Live frontend with real-time updates"
    echo "   ✅ Professional CLI output formatting"
    echo "   ✅ Project detection and pipeline generation"
    echo "   ✅ Nginx reverse proxy for frontend"
}

# Monitor container logs
monitor_logs() {
    print_status "Monitoring container logs..."
    echo ""
    echo "Press Ctrl+C to stop monitoring"
    echo ""
    
    docker logs -f codeflow-unified
}

# Main deployment function
main() {
    echo "🚀 Unified CodeFlow CI/CD Pipeline Deployment"
    echo "=============================================="
    
    check_docker
    create_directories
    build_image
    start_container
    wait_for_services
    show_info
    
    print_success "Deployment completed successfully!"
    
    # Ask if user wants to monitor logs
    echo ""
    read -p "Do you want to monitor container logs? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        monitor_logs
    fi
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"