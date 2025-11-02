# ------------------------------------------------------------------------------
# VPC Module Outputs
# Exports IDs and configuration for use by other modules (EKS, Neptune, etc.)
# ------------------------------------------------------------------------------

output "vpc_id" {
  description = "The ID of the VPC created for the CodeFlow platform"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "availability_zones" {
  description = "List of availability zones used for subnets"
  value       = var.availability_zones
}

output "internet_gateway_id" {
  description = "The ID of the Internet Gateway"
  value       = aws_internet_gateway.main.id
}

output "nat_gateway_ids" {
  description = "List of NAT Gateway IDs (one per AZ)"
  value       = aws_nat_gateway.main[*].id
}

output "vpc_endpoints" {
  description = "Map of VPC endpoint IDs by service name"
  value = {
    s3      = aws_vpc_endpoint.s3.id
    ecr_dkr = aws_vpc_endpoint.ecr_dkr.id
    ecr_api = aws_vpc_endpoint.ecr_api.id
    logs    = aws_vpc_endpoint.logs.id
  }
}

output "vpc_endpoint_security_group_id" {
  description = "Security group ID for VPC endpoints"
  value       = aws_security_group.vpc_endpoints.id
}
