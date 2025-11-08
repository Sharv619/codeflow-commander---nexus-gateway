#!/bin/bash

# ------------------------------------------------------------------------------
# EKG Ingestion Service Deployment Script
# Automates the build and deployment process for the ingestion service
# ------------------------------------------------------------------------------

set -e  # Exit on any error

# Configuration
SERVICE_NAME="ekg-ingestion-service"
NAMESPACE="codeflow-platform"
IMAGE_NAME="codeflow/ekg-ingestion-service"
TAG="$(date +%Y%m%d-%H%M%S)"

echo "🚀 Deploying $SERVICE_NAME..."

# Step 1: Build the Docker image
echo "📦 Building Docker image..."
docker build -t "$IMAGE_NAME:$TAG" -t "$IMAGE_NAME:latest" ../

# Step 2: Authenticate with ECR (if using AWS ECR)
echo "🔐 Authenticating with AWS ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com"

# Step 3: Tag and push the image
FULL_IMAGE_NAME="$AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/$IMAGE_NAME:$TAG"
docker tag "$IMAGE_NAME:$TAG" "$FULL_IMAGE_NAME"
echo "📤 Pushing image to ECR..."
docker push "$FULL_IMAGE_NAME"

# Step 4: Update the deployment with the new image
echo "🔄 Updating Kubernetes deployment..."
kubectl set image deployment/$SERVICE_NAME $SERVICE_NAME="$FULL_IMAGE_NAME" -n $NAMESPACE

# Step 5: Apply any pending configuration changes
echo "📝 Applying Kubernetes manifests..."
kubectl apply -f . -n $NAMESPACE

# Step 6: Wait for rollout to complete
echo "⏱️  Waiting for deployment to complete..."
kubectl rollout status deployment/$SERVICE_NAME -n $NAMESPACE --timeout=300s

# Step 7: Verify the deployment
echo "🔍 Verifying deployment..."
kubectl get pods -l app=$SERVICE_NAME -n $NAMESPACE
kubectl get svc $SERVICE_NAME -n $NAMESPACE

echo "✅ Deployment completed successfully!"
echo "🌐 Service available at: http://$SERVICE_NAME.$NAMESPACE.svc.cluster.local"
echo "📊 Health check: kubectl port-forward svc/$SERVICE_NAME 3000:80 -n $NAMESPACE"
