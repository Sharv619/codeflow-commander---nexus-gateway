#!/bin/bash

# CodeFlow CI/CD Pipeline Deployment Script
# This script deploys the complete containerized system

set -e

echo "🚀 Starting CodeFlow CI/CD Pipeline Deployment..."

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
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p results
    mkdir -p pipeline-results
    mkdir -p nginx/ssl
    mkdir -p monitoring
    
    print_success "Directories created"
}

# Generate SSL certificates for development
generate_ssl() {
    print_status "Generating SSL certificates for development..."
    
    if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=US/ST=CA/L=San Francisco/O=CodeFlow/CN=localhost"
        
        print_success "SSL certificates generated"
    else
        print_warning "SSL certificates already exist"
    fi
}

# Build and start services
deploy_services() {
    print_status "Building and starting services..."
    
    # Build images
    docker-compose build --no-cache
    
    # Start services
    docker-compose up -d
    
    print_success "Services started"
}

# Wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to be healthy..."
    
    # Wait for backend
    print_status "Waiting for backend service..."
    timeout 120 bash -c 'until docker-compose exec -T backend curl -f http://localhost:3001/; do sleep 2; done'
    
    # Wait for frontend
    print_status "Waiting for frontend service..."
    timeout 120 bash -c 'until docker-compose exec -T frontend curl -f http://localhost/; do sleep 2; done'
    
    print_success "All services are healthy"
}

# Display deployment information
show_info() {
    print_success "🎉 CodeFlow CI/CD Pipeline deployed successfully!"
    echo ""
    echo "📋 Access Information:"
    echo "   Frontend:     http://localhost (HTTP)"
    echo "   Frontend:     https://localhost (HTTPS)"
    echo "   Backend API:  http://localhost:3001"
    echo "   API Docs:     http://localhost:3001/docs"
    echo "   Grafana:      http://localhost:3000 (admin/admin)"
    echo "   Prometheus:   http://localhost:9090"
    echo ""
    echo "🔧 Management Commands:"
    echo "   View logs:    docker-compose logs -f"
    echo "   Stop:         docker-compose down"
    echo "   Restart:      docker-compose restart"
    echo "   Update:       docker-compose pull && docker-compose up -d"
    echo ""
    echo "📊 Monitoring:"
    echo "   Services are monitored with health checks"
    echo "   Logs are automatically collected"
    echo "   Performance metrics available in Grafana"
}

# Main deployment function
main() {
    echo "🚀 CodeFlow CI/CD Pipeline Deployment"
    echo "====================================="
    
    check_docker
    create_directories
    generate_ssl
    deploy_services
    wait_for_services
    show_info
    
    print_success "Deployment completed successfully!"
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"