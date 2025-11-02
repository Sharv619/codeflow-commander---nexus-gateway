# ------------------------------------------------------------------------------
# EKS Module Outputs
# Exports cluster configuration for use by other modules and Kubernetes manifests
# ------------------------------------------------------------------------------

output "cluster_id" {
  description = "The name/ID of the EKS cluster"
  value       = aws_eks_cluster.main.name
}

output "cluster_arn" {
  description = "The Amazon Resource Name (ARN) of the cluster"
  value       = aws_eks_cluster.main.arn
}

output "cluster_endpoint" {
  description = "The endpoint for the Kubernetes API server"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_version" {
  description = "The Kubernetes server version for the EKS cluster"
  value       = aws_eks_cluster.main.version
}

output "cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster for the OpenID Connect identity provider"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = aws_security_group.eks_cluster.id
}

output "node_security_group_id" {
  description = "Security group ID for EKS worker nodes"
  value       = aws_security_group.eks_nodes.id
}

output "node_group_id" {
  description = "The ID of the EKS managed node group"
  value       = aws_eks_node_group.main.id
}

output "node_group_arn" {
  description = "ARN of the EKS managed node group"
  value       = aws_eks_node_group.main.arn
}

output "cluster_iam_role_arn" {
  description = "ARN of the IAM role for the EKS cluster"
  value       = aws_iam_role.eks_cluster.arn
}

output "node_iam_role_arn" {
  description = "ARN of the IAM role for EKS worker nodes"
  value       = aws_iam_role.eks_nodes.arn
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
}

output "aws_load_balancer_controller_iam_policy_arn" {
  description = "ARN of the IAM policy for AWS Load Balancer Controller"
  value       = aws_iam_policy.aws_load_balancer_controller.arn
}

output "external_dns_iam_policy_arn" {
  description = "ARN of the IAM policy for External DNS"
  value       = aws_iam_policy.external_dns.arn
}
