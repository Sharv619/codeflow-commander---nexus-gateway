# Codeflow Commander Phase 4 - Deployment & Testing

## Phase 4 EKG System End-to-End Validation

This directory contains the complete deployment and testing infrastructure for Codeflow Commander Phase 4 (Enterprise Knowledge Graph). After implementing the core system, this ensures rigorous validation of the entire developer workflow.

## 🚀 Quick Start

```bash
# Complete automated deployment
./deploy.sh

# Run comprehensive end-to-end tests
./end-to-end-test.sh
```

## 📋 Prerequisites

### System Requirements
- **AWS CLI v2** - configured with your credentials (`aws configure`)
- **kubectl** - configured for EKS cluster access
- **Terraform v1.0+** - for infrastructure deployment
- **Docker** - for building container images
- **bash** - for running deployment scripts

### AWS Permissions
Your AWS user/role needs these permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "eks:*",
                "ec2:*",
                "vpc:*",
                "iam:*",
                "neptune:*",
                "ecr:*",
                "s3:*",
                "cloudwatch:*"
            ],
            "Resource": "*"
        }
    ]
}
```

### kubectl Setup
```bash
aws eks update-kubeconfig --region us-east-1 --name codeflow-eks-cluster
kubectl get nodes  # Verify cluster access
```

## 🎯 Deployment Overview

The `./deploy.sh` script orchestrates the complete Phase 4 deployment:

### Deployment Steps
1. **Prerequisites Check** - Validate tools and AWS access
2. **Infrastructure Deployment** - Terraform EKS cluster + Neptune
3. **Kubernetes Setup** - Namespace, service accounts, RBAC
4. **Docker Images** - Build and push to ECR
5. **ConfigMaps/Secrets** - Deploy configurations to k8s
6. **Service Deployment** - Deploy microservices
7. **Verification** - Health checks and connectivity tests
8. **CLI Configuration** - Set up integration environment
9. **Testing Preparation** - Generate test repository and scripts

### Key Deployment Features
- **Idempotent** - Can be re-run safely after failures
- **State Tracking** - Remembers completed steps
- **User Confirmation** - Prompts before major infrastructure changes
- **Parallel Processing** - Where dependencies allow
- **Comprehensive Logging** - Detailed success/failure tracking

## 🧪 Testing Suite

The `./end-to-end-test.sh` script validates the complete developer workflow:

### Test Suite Overview
1. **Infrastructure Validation** - EKS nodes, namespace existence
2. **Service Health Checks** - Pod readiness, health endpoints
3. **API Connectivity** - GraphQL queries, webhook endpoints
4. **Repository Setup** - Creates realistic test repository
5. **CLI Integration** - Dry-run modes, command validation
6. **Diff Analysis** - EKG-enhanced analysis validation
7. **Integration Testing** - Full workflow simulation

### Test Repository Features
- **Realistic Setup** - Express.js server with authentication
- **Multiple Commits** - Feature branch with legitimate changes
- **Code Variations** - JWT auth, rate limiting, data manipulation
- **Clean Test Data** - Representative of real enterprise code

### Test Results Interpretation
- **GREEN ✅** - Component working perfectly
- **YELLOW ⚠️** - Expected in certain scenarios (e.g., no services running locally)
- **RED ❌** - Critical failure requiring attention

## 🔧 Manual Usage

### Deploy Specific Components

```bash
# Infrastructure only
cd ../infrastructure
terraform init && terraform plan
terraform apply

# Services only (assumes infrastructure exists)
cd ../services/ingestion-service/kubernetes
./deploy.sh

cd ../query-service/kubernetes
./deploy.sh

# CLI setup only
cd ../../../services/cli-integration
npm install && npm run build
cp .env.example .env  # Edit with your values
```

### Individual Tests

```bash
# Test just Kubernetes access
kubectl cluster-info && kubectl get nodes

# Test service health manually
kubectl get pods -n codeflow-platform
kubectl logs -f deployment/ekg-query-service -n codeflow-platform

# Test GraphQL API manually
kubectl port-forward svc/ekg-query-service 4000:4000 -n codeflow-platform
curl http://localhost:4000/health
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ graphStatistics { repositoryCount } }"}'
```

## 📊 Monitoring & Troubleshooting

### Service Health Monitoring

```bash
# Real-time pod status
watch kubectl get pods -n codeflow-platform -o wide

# Service logs
kubectl logs -f deployment/ekg-ingestion-service -n codeflow-platform
kubectl logs -f deployment/ekg-query-service -n codeflow-platform

# Resource usage
kubectl top pods -n codeflow-platform
kubectl describe hpa -n codeflow-platform
```

### Common Issues & Solutions

#### 1. AWS Authentication Issues
```bash
# Check AWS credentials
aws sts get-caller-identity

# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name your-cluster-name
```

#### 2. ECR Permission Denied
```bash
# Login to ECR explicitly
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
```

#### 3. Kubernetes RBAC Issues
```bash
# Check service account permissions
kubectl auth can-i --list -n codeflow-platform --as=system:serviceaccount:codeflow-platform:ekg-service-account
```

#### 4. Neptune Connection Issues
```bash
# Check security groups allow access
aws ec2 describe-security-groups --group-ids YOUR_NEPTUNE_SG

# Test from pod
kubectl exec -it deployment/ekg-query-service -n codeflow-platform -- nc -zv neptune-cluster-endpoint 8182
```

#### 5. GraphQL Query Failures
```bash
# Check schema loading
kubectl exec -it deployment/ekg-query-service -n codeflow-platform -- cat /app/src/schemas/schema.graphql

# Debug graph operations
kubectl logs deployment/ekg-query-service -n codeflow-platform | grep "graph\|neptune"
```

### Performance Optimization

```bash
# Scale services if needed
kubectl scale deployment ekg-query-service --replicas=4 -n codeflow-platform

# Update resource limits
kubectl patch deployment ekg-query-service -n codeflow-platform --type json \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/cpu", "value":"800m"}]'
```

## 🔄 Workflow Validation

### Complete Developer Experience Test

1. **Clone and Setup**
```bash
cd /tmp && git clone https://github.com/your-org/your-repo.git
cd your-repo
```

2. **Index Repository**
```bash
codeflow-hook index
# Should trigger ingestion service webhook
```

3. **Monitor Ingestion**
```bash
kubectl logs -f deployment/ekg-ingestion-service -n codeflow-platform
# Should show PRISM analysis and Neptune writes
```

4. **Test Query Service**
```bash
kubectl port-forward svc/ekg-query-service 4000:4000 -n codeflow-platform &
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ repositoryIntelligence(repositoryId: \"your-repo-id\") { patterns { name confidence } } }"
  }'
```

5. **Enhanced Diff Analysis**
```bash
# Make some changes
echo "// Add validation" >> auth.js
git diff | codeflow-hook analyze-diff
# Should show EKG-enhanced analysis with enterprise patterns
```

## 📈 Expected Results

### Successful Test Suite Output
```
🧪 Starting Comprehensive End-to-End Test Suite
===============================================

📋 Test 1: Checking Infrastructure Readiness
✅ PASS: Kubernetes cluster accessible
✅ PASS: EKS nodes ready
✅ PASS: EKG namespace 'codeflow-platform' exists

📋 Test 2: EKG Ingestion Service Health
✅ PASS: ekg-ingestion-service deployment is ready
✅ PASS: ekg-ingestion-service pods are healthy (2/2)

📋 Test 3: EKG Query Service Health
✅ PASS: ekg-query-service deployment is ready
✅ PASS: ekg-query-service pods are healthy (2/2)

📋 Test 4: GraphQL Endpoint Validation
✅ PASS: GraphQL query successful

📊 Test Results Summary
=======================
Tests Passed: 7/7
🎉 ALL TESTS PASSED! Phase 4 EKG System is fully operational.
```

### Post-Deployment Verification

After successful deployment, you should see:
- ✅ All pods in `Running` state
- ✅ Health endpoints returning 200
- ✅ CLI commands processing successfully
- ✅ GraphQL queries returning structured data
- ✅ Neptune connectivity confirmed in logs

## 🎯 Testing Success Criteria

The Phase 4 implementation is considered validated when:

1. **Infrastructure Stable** - EKS cluster responding, Neptune accessible
2. **Services Operational** - All health checks passing, pods healthy
3. **API Functional** - GraphQL queries working, webhook endpoints responsive
4. **CLI Integrated** - Commands successfully interact with backend services
5. **EKG Populated** - Repository data ingested and queryable
6. **Analysis Enhanced** - Diff analysis returns EKG-contextualized results

## 📚 Additional Resources

- [Phase 4 Architecture Document](../../PHASE4_ARCHITECTURE.md)
- [Infrastructure Terraform](../../infrastructure/)
- [Service Documentation](../../services/)
- [GraphQL API Schema](../../services/query-service/src/schemas/schema.graphql)

## 🚨 Emergency Procedures

### Rollback Deployment
```bash
# Stop all services
kubectl delete deployments --all -n codeflow-platform

# Destroy infrastructure (CAUTION!)
cd ../infrastructure && terraform destroy

# Clean up ECR images
aws ecr batch-delete-image --repository-name codeflow/ekg-ingestion-service --image-ids imageTag=latest
aws ecr batch-delete-image --repository-name codeflow/ekg-query-service --image-ids imageTag=latest
```

### Complete Reset
```bash
kubectl delete namespace codeflow-platform
aws eks delete-cluster --name codeflow-eks-cluster
```

---

**Next Steps:** Phase 5 - Autonomous Agent Network 🧠🤖

After Phase 4 validation, the foundation is set for intelligent autonomous agents that can leverage the rich organizational context now available through the EKG. The CLI becomes the perfect user interface for triggering agent-assisted workflows.
