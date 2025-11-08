# ------------------------------------------------------------------------------
# Codeflow Commander Phase 4 - Main Infrastructure Configuration
# Provisions the complete EKG platform: VPC, EKS Cluster, Neptune Graph Database
# ------------------------------------------------------------------------------

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend configuration for state management (uncomment and configure for production)
  # backend "s3" {
  #   bucket         = "codeflow-terraform-state"
  #   key            = "phase4-ekg-infrastructure.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "codeflow-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "codeflow-platform"
      Component   = "ekg-infrastructure"
      Environment = var.environment
      Phase       = "4"
      ManagedBy   = "terraform"
    }
  }
}

# ------------------------------------------------------------------------------
# VPC Module - Network Infrastructure
# ------------------------------------------------------------------------------
module "vpc" {
  source = "./modules/vpc"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  # VPC Configuration
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  private_subnet_cidrs = var.private_subnet_cidrs
  public_subnet_cidrs  = var.public_subnet_cidrs

  # Security Configuration
  enable_nat_gateway = var.enable_nat_gateway
  single_nat_gateway = var.single_nat_gateway

  # Tags
  tags = var.common_tags
}

# ------------------------------------------------------------------------------
# EKS Cluster Module - Kubernetes Control Plane
# ------------------------------------------------------------------------------
module "eks" {
  source = "./modules/eks"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  # Cluster Configuration
  cluster_version = var.cluster_version

  # Network Configuration
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids

  # Node Groups Configuration
  node_groups = var.node_groups

  # Managed Add-ons
  enable_cluster_autoscaler = var.enable_cluster_autoscaler
  enable_metrics_server    = var.enable_metrics_server
  enable_aws_load_balancer_controller = var.enable_aws_load_balancer_controller

  # Security Configuration
  cluster_endpoint_private_access = var.cluster_endpoint_private_access
  cluster_endpoint_public_access  = var.cluster_endpoint_public_access

  # Tags
  tags = var.common_tags

  # Dependencies
  depends_on = [module.vpc]
}

# ------------------------------------------------------------------------------
# Neptune Graph Database Module
# ------------------------------------------------------------------------------
module "neptune" {
  source = "./modules/neptune"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  # Neptune Configuration
  instance_class          = var.neptune_instance_class
  cluster_identifier      = var.neptune_cluster_identifier
  database_name           = var.neptune_database_name
  backup_retention_period = var.backup_retention_period

  # Network Configuration
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  vpc_security_group_ids = var.neptune_security_group_ids

  # Maintenance Configuration
  preferred_backup_window   = var.preferred_backup_window
  preferred_maintenance_window = var.preferred_maintenance_window

  # Encryption Configuration
  storage_encrypted = var.storage_encrypted
  kms_key_arn      = var.kms_key_arn

  # Monitoring Configuration
  enable_cloudwatch_logs_exports = var.enable_cloudwatch_logs_exports

  # Tags
  tags = var.common_tags

  # Dependencies
  depends_on = [module.vpc]
}

# ------------------------------------------------------------------------------
# ECR Repositories for Container Images
# ------------------------------------------------------------------------------
resource "aws_ecr_repository" "ingestion_service" {
  name                 = "codeflow/ekg-ingestion-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.common_tags
}

resource "aws_ecr_repository" "query_service" {
  name                 = "codeflow/ekg-query-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.common_tags
}

# ------------------------------------------------------------------------------
# CloudWatch Log Groups for Centralized Logging
# ------------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "platform_logs" {
  name              = "/codeflow-platform/ekg/${var.environment}"
  retention_in_days = var.cloudwatch_log_retention
  kms_key_id        = var.kms_key_arn

  tags = var.common_tags
}

# ------------------------------------------------------------------------------
# IAM Policies for Service Accounts
# ------------------------------------------------------------------------------
resource "aws_iam_policy" "neptune_access" {
  name        = "${var.project_name}-neptune-access-${var.environment}"
  description = "IAM policy for accessing Neptune graph database"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "neptune:ReadDataViaQuery",
          "neptune:WriteDataViaQuery",
          "neptune:GetQueryStatus"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.platform_logs.arn}:*"
      }
    ]
  })

  tags = var.common_tags
}
