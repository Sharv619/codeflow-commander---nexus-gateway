# ------------------------------------------------------------------------------
# Neptune Module Outputs
# Exports connection details and configuration for EKG services
# ------------------------------------------------------------------------------

output "cluster_identifier" {
  description = "The Neptune cluster identifier"
  value       = aws_neptune_cluster.main.cluster_identifier
}

output "cluster_endpoint" {
  description = "The Neptune cluster endpoint"
  value       = aws_neptune_cluster.main.endpoint
}

output "cluster_port" {
  description = "The Neptune cluster port"
  value       = aws_neptune_cluster.main.port
}

output "cluster_arn" {
  description = "The Neptune cluster ARN"
  value       = aws_neptune_cluster.main.arn
}

output "cluster_resource_id" {
  description = "The Neptune cluster resource ID"
  value       = aws_neptune_cluster.main.cluster_resource_id
}

output "reader_endpoint" {
  description = "The Neptune cluster reader endpoint"
  value       = aws_neptune_cluster.main.reader_endpoint
}

output "cluster_instances" {
  description = "List of Neptune cluster instance endpoints"
  value       = aws_neptune_cluster_instance.instances[*].endpoint
}

output "security_group_id" {
  description = "Security group ID for Neptune cluster"
  value       = aws_security_group.neptune.id
}

output "subnet_group_name" {
  description = "Name of the Neptune subnet group"
  value       = aws_neptune_subnet_group.main.name
}

output "parameter_group_name" {
  description = "Name of the Neptune parameter group"
  value       = aws_neptune_parameter_group.main.name
}

output "cluster_parameter_group_name" {
  description = "Name of the Neptune cluster parameter group"
  value       = aws_neptune_cluster_parameter_group.main.name
}

output "kms_key_arn" {
  description = "ARN of the KMS key used for Neptune encryption"
  value       = aws_kms_key.neptune.arn
}

output "kms_key_id" {
  description = "ID of the KMS key used for Neptune encryption"
  value       = aws_kms_key.neptune.key_id
}

# ------------------------------------------------------------------------------
# Connection Strings (for different protocols)
# ------------------------------------------------------------------------------
output "gremlin_connection_string" {
  description = "Gremlin connection string for Neptune"
  value       = "wss://${aws_neptune_cluster.main.endpoint}:${aws_neptune_cluster.main.port}/gremlin"
}

output "sparql_connection_string" {
  description = "SPARQL connection string for Neptune"
  value       = "https://${aws_neptune_cluster.main.endpoint}:${aws_neptune_cluster.main.port}/sparql"
}

output "open_cypher_connection_string" {
  description = "openCypher connection string for Neptune"
  value       = "bolt://${aws_neptune_cluster.main.endpoint}:${aws_neptune_cluster.main.port}"
}

# ------------------------------------------------------------------------------
# CloudWatch Alarm ARNs
# ------------------------------------------------------------------------------
output "cpu_alarm_arn" {
  description = "ARN of the CPU utilization CloudWatch alarm"
  value       = aws_cloudwatch_metric_alarm.neptune_cpu_utilization.arn
}

output "memory_alarm_arn" {
  description = "ARN of the memory utilization CloudWatch alarm"
  value       = aws_cloudwatch_metric_alarm.neptune_memory_utilization.arn
}
