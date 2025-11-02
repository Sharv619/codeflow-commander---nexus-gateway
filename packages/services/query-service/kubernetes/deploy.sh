#!/bin/bash

# ------------------------------------------------------------------------------
# EKG Query Service Deployment Script
# Automates the build and deployment process for the GraphQL query service
# ------------------------------------------------------------------------------

set -e  # Exit on any error

# Configuration
SERVICE_NAME="ekg-query-service"
NAMESPACE="codeflow-platform"
IMAGE_NAME="codeflow/ekg-query-service"
TAG="$(date +%Y%m%d-%H%M%S)"

echo "🚀 Deploying $SERVICE_NAME (GraphQL API)..."

# Step 1: Build the Docker image
echo "📦 Building Docker image..."
docker build -t "$IMAGE_NAME:$TAG" -t "$IMAGE_NAME:latest" ../

# Step 2: Authenticate with ECR
echo "🔐 Authenticating with AWS ECR..."
aws ecr get-login-password --region au-east-2 | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.au-east-2.amazonaws.com"

# Step 3: Tag and push the image
FULL_IMAGE_NAME="$AWS_ACCOUNT_ID.dkr.ecr.au-east-2.amazonaws.com/$IMAGE_NAME:$TAG"
docker tag "$IMAGE_NAME:$TAG" "$FULL_IMAGE_NAME"
echo "📤 Pushing image to ECR..."
docker push "$FULL_IMAGE_NAME"

# Step 4: Update the deployment with the new image
echo "🔄 Updating Kubernetes deployment..."
kubectl set image deployment/$SERVICE_NAME $SERVICE_NAME="$FULL_IMAGE_NAME" -n $NAMESPACE

# Step 5: Apply any pending Kubernetes manifest changes
echo "📝 Applying Kubernetes manifests..."
kubectl apply -f . -n $NAMESPACE

# Step 6: Wait for rollout to complete
echo "⏱️  Waiting for deployment to complete..."
kubectl rollout status deployment/$SERVICE_NAME -n $NAMESPACE --timeout=300s

# Step 7: Verify the deployment
echo "🔍 Verifying deployment..."
kubectl get pods -l app=$SERVICE_NAME -n $NAMESPACE
kubectl get svc $SERVICE_NAME -n $NAMESPACE

echo "✅ GraphQL Query Service deployment completed successfully!"
echo "🌐 GraphQL endpoint: https://$SERVICE_NAME.$NAMESPACE.svc.cluster.local/graphql"
echo "🔗 External LoadBalancer: $(kubectl get svc $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
echo "📊 Health check: kubectl port-forward svc/$SERVICE_NAME 4000:443 -n $NAMESPACE
