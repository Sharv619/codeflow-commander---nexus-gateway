# ------------------------------------------------------------------------------
# Codeflow Commander Phase 4 - Infrastructure Defaults
# Default values for terraform variables - suitable for development/testing
# ------------------------------------------------------------------------------

# Global Configuration
project_name = "codeflow"
environment  = "dev"
aws_region   = "us-east-1"

# VPC Configuration (smaller for dev)
vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["us-east-1a", "us-east-1b"]
private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24"]
enable_nat_gateway   = true
single_nat_gateway   = true

# EKS Configuration
cluster_version = "1.28"

node_groups = {
  general = {
    instance_type = "t3.medium"  # Smaller instance for dev
    min_size      = 1
    max_size      = 3
    desired_size  = 2
  }
  compute = {
    instance_type = "t3.large"   # Smaller instance for dev
    min_size      = 0
    max_size      = 2
    desired_size  = 0
  }
}

# Enable all add-ons in dev for testing
enable_cluster_autoscaler           = true
enable_metrics_server              = true
enable_aws_load_balancer_controller = true
cluster_endpoint_private_access     = true
cluster_endpoint_public_access      = true

# Neptune Configuration (smaller instance for dev)
neptune_instance_class     = "db.t3.medium"
neptune_cluster_identifier = "codeflow-ekg-neptune-dev"
neptune_database_name      = "codeflow_ekg"
backup_retention_period    = 7
preferred_backup_window    = "03:00-04:00"
preferred_maintenance_window = "sun:04:00-sun:05:00"
storage_encrypted         = true
enable_cloudwatch_logs_exports = ["audit", "error"]

# Monitoring
cloudwatch_log_retention = 30

# Common Tags
common_tags = {
  Project   = "codeflow-platform"
  Component = "ekg-infrastructure"
  Phase     = "4"
  Environment = "dev"
  ManagedBy = "terraform"
}
