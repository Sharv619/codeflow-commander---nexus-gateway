# ------------------------------------------------------------------------------
# Codeflow Commander Phase 4 - Infrastructure Variables
# Defines all configurable parameters for the EKG platform infrastructure
# ------------------------------------------------------------------------------

# ------------------------------------------------------------------------------
# Global Configuration
# ------------------------------------------------------------------------------
variable "project_name" {
  description = "Name of the project - used for naming resources"
  type        = string
  default     = "codeflow"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region for infrastructure deployment"
  type        = string
  default     = "us-east-1"
}

# ------------------------------------------------------------------------------
# Common Tags
# ------------------------------------------------------------------------------
variable "common_tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default = {
    Project   = "codeflow-platform"
    Component = "ekg-infrastructure"
    Phase     = "4"
    ManagedBy = "terraform"
  }
}

# ------------------------------------------------------------------------------
# VPC Configuration
# ------------------------------------------------------------------------------
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT gateway for private subnet internet access"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use single NAT gateway instead of one per AZ"
  type        = bool
  default     = false
}

# ------------------------------------------------------------------------------
# EKS Cluster Configuration
# ------------------------------------------------------------------------------
variable "cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "node_groups" {
  description = "EKS managed node groups configuration"
  type = map(object({
    instance_type = string
    min_size      = number
    max_size      = number
    desired_size  = number
  }))
  default = {
    general = {
      instance_type = "t3.large"
      min_size      = 1
      max_size      = 5
      desired_size  = 2
    }
    compute = {
      instance_type = "t3.xlarge"
      min_size      = 0
      max_size      = 3
      desired_size  = 1
    }
  }
}

variable "enable_cluster_autoscaler" {
  description = "Enable cluster autoscaler add-on"
  type        = bool
  default     = true
}

variable "enable_metrics_server" {
  description = "Enable metrics server add-on"
  type        = bool
  default     = true
}

variable "enable_aws_load_balancer_controller" {
  description = "Enable AWS load balancer controller"
  type        = bool
  default     = true
}

variable "cluster_endpoint_private_access" {
  description = "Enable private access to cluster endpoint"
  type        = bool
  default     = true
}

variable "cluster_endpoint_public_access" {
  description = "Enable public access to cluster endpoint"
  type        = bool
  default     = true
}

# ------------------------------------------------------------------------------
# Neptune Graph Database Configuration
# ------------------------------------------------------------------------------
variable "neptune_instance_class" {
  description = "Instance class for Neptune cluster"
  type        = string
  default     = "db.t3.medium"
}

variable "neptune_cluster_identifier" {
  description = "Identifier for Neptune cluster"
  type        = string
  default     = "codeflow-ekg-neptune"
}

variable "neptune_database_name" {
  description = "Name of the Neptune database"
  type        = string
  default     = "codeflow_ekg"
}

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "neptune_security_group_ids" {
  description = "Security group IDs for Neptune access"
  type        = list(string)
  default     = []
}

variable "preferred_backup_window" {
  description = "Preferred backup window (UTC)"
  type        = string
  default     = "03:00-04:00"
}

variable "preferred_maintenance_window" {
  description = "Preferred maintenance window (UTC)"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "storage_encrypted" {
  description = "Enable storage encryption"
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  description = "ARN of KMS key for encryption (leave empty for AWS managed key)"
  type        = string
  default     = ""
}

variable "enable_cloudwatch_logs_exports" {
  description = "Enable CloudWatch logs exports"
  type        = list(string)
  default     = ["audit", "error", "slowquery"]
}

# ------------------------------------------------------------------------------
# Monitoring and Logging Configuration
# ------------------------------------------------------------------------------
variable "cloudwatch_log_retention" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}
