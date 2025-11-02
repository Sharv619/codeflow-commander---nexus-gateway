# ------------------------------------------------------------------------------
# Neptune Module - Graph Database Infrastructure
# Creates the Neptune graph database cluster for storing EKG (Enterprise Knowledge Graph)
# ------------------------------------------------------------------------------

# ------------------------------------------------------------------------------
# Neptune Subnet Group
# ------------------------------------------------------------------------------
resource "aws_neptune_subnet_group" "main" {
  name        = "${var.cluster_identifier}-subnet-group"
  description = "Subnet group for Neptune database cluster"
  subnet_ids  = var.private_subnet_ids

  tags = {
    Name        = "${var.cluster_identifier}-subnet-group"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

# ------------------------------------------------------------------------------
# Neptune Parameter Group
# ------------------------------------------------------------------------------
resource "aws_neptune_parameter_group" "main" {
  name        = "${var.cluster_identifier}-parameter-group"
  family      = "neptune1.3"
  description = "Parameter group for Neptune database cluster"

  # Neptune-specific parameters for graph database performance
  parameter {
    name         = "neptune.query.concurrency"
    value        = "8"  # Default concurrency for graph queries
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "neptune.query.timeout"
    value        = "120000"  # Query timeout in milliseconds (2 minutes)
    apply_method = "immediate"
  }

  parameter {
    name         = "neptune.query.slowquery.enable"
    value        = "1"  # Enable slow query logging
    apply_method = "immediate"
  }

  tags = {
    Name        = "${var.cluster_identifier}-parameter-group"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

# ------------------------------------------------------------------------------
# Neptune Cluster Parameter Group
# ------------------------------------------------------------------------------
resource "aws_neptune_cluster_parameter_group" "main" {
  name        = "${var.cluster_identifier}-cluster-parameter-group"
  family      = "neptune1.3"
  description = "Cluster parameter group for Neptune database cluster"

  # Cluster-level parameters for EKG performance
  parameter {
    name         = "neptune.query.max_concurrency"
    value        = "32"  # Maximum concurrent queries
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "neptune.query.state_cache.threshold_kb"
    value        = "1024"  # Query state cache threshold in KB
    apply_method = "pending-reboot"
  }

  tags = {
    Name        = "${var.cluster_identifier}-cluster-parameter-group"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

# ------------------------------------------------------------------------------
# Neptune Cluster
# ------------------------------------------------------------------------------
resource "aws_neptune_cluster" "main" {
  cluster_identifier                  = var.cluster_identifier
  engine                             = "neptune"
  neptune_engine_version             = "1.3.0.0"
  backup_retention_period            = var.backup_retention_days
  preferred_backup_window            = "02:00-04:00"  # UTC time window
  preferred_maintenance_window       = "sun:04:30-sun:05:30"
  neptune_parameter_group_name       = aws_neptune_parameter_group.main.name
  neptune_cluster_parameter_group_name = aws_neptune_cluster_parameter_group.main.name
  neptune_subnet_group_name          = aws_neptune_subnet_group.main.name
  vpc_security_group_ids             = [aws_security_group.neptune.id]
  iam_database_authentication_enabled = true

  # Enable deletion protection for production
  deletion_protection = true

  # Enable encryption at rest
  storage_encrypted = true
  kms_key_arn       = aws_kms_key.neptune.arn

  # Create a final snapshot when deleting
  final_snapshot_identifier = "${var.cluster_identifier}-final-snapshot-${formatdate("YYYYMMDDHHmmss", timestamp())}"
  skip_final_snapshot       = false

  tags = {
    Name        = var.cluster_identifier
    Environment = "production"
    Project     = "codeflow-platform"
    Service     = "ekg"
    ManagedBy   = "terraform"
  }

  # Dependency on subnet group and security group
  depends_on = [
    aws_neptune_subnet_group.main,
    aws_security_group.neptune
  ]
}

# ------------------------------------------------------------------------------
# Neptune Cluster Instances
# ------------------------------------------------------------------------------
resource "aws_neptune_cluster_instance" "instances" {
  count                   = var.instance_count
  cluster_identifier      = aws_neptune_cluster.main.id
  instance_class          = var.instance_class
  neptune_parameter_group_name = aws_neptune_parameter_group.main.name

  # Auto-generate instance identifiers
  identifier = "${var.cluster_identifier}-instance-${count.index + 1}"

  tags = {
    Name        = "${var.cluster_identifier}-instance-${count.index + 1}"
    Environment = "production"
    Project     = "codeflow-platform"
    Service     = "ekg"
    ManagedBy   = "terraform"
  }

  # Ensure cluster is created first
  depends_on = [aws_neptune_cluster.main]
}

# ------------------------------------------------------------------------------
# KMS Key for Neptune Encryption
# ------------------------------------------------------------------------------
resource "aws_kms_key" "neptune" {
  description             = "KMS key for Neptune database encryption"
  deletion_window_in_days = 7

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow EKS Nodes to use the key"
        Effect = "Allow"
        Principal = {
          AWS = var.eks_node_iam_role_arn
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:CreateGrant",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow Neptune service to use the key"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:CreateGrant",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "neptune.${data.aws_region.current.name}.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "${var.cluster_identifier}-kms-key"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

# ------------------------------------------------------------------------------
# Security Groups
# ------------------------------------------------------------------------------
resource "aws_security_group" "neptune" {
  name        = "${var.cluster_identifier}-neptune"
  description = "Security group for Neptune database cluster"
  vpc_id      = var.vpc_id

  # Allow inbound connections from EKS nodes
  ingress {
    from_port       = 8182
    to_port         = 8182
    protocol        = "tcp"
    security_groups = [var.eks_node_security_group_id]
    description     = "Allow HTTPS access from EKS nodes"
  }

  # Allow SSH access for administrative purposes (restricted)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]  # Only within VPC
    description = "Allow SSH access from within VPC"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.cluster_identifier}-neptune"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

# ------------------------------------------------------------------------------
# CloudWatch Alarms for Neptune
# ------------------------------------------------------------------------------
resource "aws_cloudwatch_metric_alarm" "neptune_cpu_utilization" {
  alarm_name          = "${var.cluster_identifier}-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/Neptune"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors Neptune CPU utilization"
  alarm_actions       = []  # Add SNS topic ARN for notifications

  dimensions = {
    DBClusterIdentifier = aws_neptune_cluster.main.id
  }

  tags = {
    Name        = "${var.cluster_identifier}-cpu-alarm"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

resource "aws_cloudwatch_metric_alarm" "neptune_memory_utilization" {
  alarm_name          = "${var.cluster_identifier}-memory-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "FreeableMemory"
  namespace           = "AWS/Neptune"
  period              = "300"
  statistic           = "Average"
  threshold           = "1000000000"  # 1GB free memory threshold
  alarm_description   = "This metric monitors Neptune available memory"
  alarm_actions       = []  # Add SNS topic ARN for notifications

  dimensions = {
    DBClusterIdentifier = aws_neptune_cluster.main.id
  }

  tags = {
    Name        = "${var.cluster_identifier}-memory-alarm"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

# ------------------------------------------------------------------------------
# Data Sources
# ------------------------------------------------------------------------------
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
