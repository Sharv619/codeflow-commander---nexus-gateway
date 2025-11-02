# ------------------------------------------------------------------------------
# EKS Module - Kubernetes Cluster Infrastructure
# Creates the EKS cluster for running CodeFlow platform microservices
# ------------------------------------------------------------------------------

# ------------------------------------------------------------------------------
# IAM Roles and Policies for EKS
# ------------------------------------------------------------------------------
data "aws_iam_policy_document" "eks_cluster_assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["eks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "eks_cluster" {
  name               = "${var.cluster_name}-cluster-role"
  assume_role_policy = data.aws_iam_policy_document.eks_cluster_assume_role_policy.json

  tags = {
    Name        = "${var.cluster_name}-cluster-role"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

# Attach the required AWS managed policies to the EKS cluster role
resource "aws_iam_role_policy_attachment" "eks_cluster_AmazonEKSClusterPolicy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_iam_role_policy_attachment" "eks_cluster_AmazonEKSVPCResourceController" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  role       = aws_iam_role.eks_cluster.name
}

# ------------------------------------------------------------------------------
# EKS Cluster
# ------------------------------------------------------------------------------
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  version  = var.cluster_version
  role_arn = aws_iam_role.eks_cluster.arn

  vpc_config {
    security_group_ids = [aws_security_group.eks_cluster.id]
    subnet_ids         = var.private_subnet_ids
  }

  # Enable EKS add-ons
  enabled_cluster_addons = [
    "coredns",
    "kube-proxy",
    "vpc-cni"
  ]

  tags = {
    Name        = var.cluster_name
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_AmazonEKSClusterPolicy,
    aws_iam_role_policy_attachment.eks_cluster_AmazonEKSVPCResourceController,
  ]
}

# ------------------------------------------------------------------------------
# IAM Roles and Policies for EKS Node Groups
# ------------------------------------------------------------------------------
data "aws_iam_policy_document" "eks_node_assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "eks_nodes" {
  name               = "${var.cluster_name}-node-role"
  assume_role_policy = data.aws_iam_policy_document.eks_node_assume_role_policy.json

  tags = {
    Name        = "${var.cluster_name}-node-role"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

# Attach required policies for node groups
resource "aws_iam_role_policy_attachment" "eks_nodes_AmazonEKSWorkerNodePolicy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_nodes_AmazonEKS_CNI_Policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_nodes_AmazonEC2ContainerRegistryReadOnly" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_nodes.name
}

# Additional permissions for Neptune access
resource "aws_iam_role_policy_attachment" "eks_nodes_NeptuneReadOnlyAccess" {
  policy_arn = "arn:aws:iam::aws:policy/NeptuneReadOnlyAccess"
  role       = aws_iam_role.eks_nodes.name
}

# ------------------------------------------------------------------------------
# EKS Managed Node Group
# ------------------------------------------------------------------------------
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.cluster_name}-managed-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = var.private_subnet_ids

  scaling_config {
    desired_size = 3
    max_size     = 10
    min_size     = 1
  }

  instance_types = [var.node_instance_type]

  # Ensure that IAM Role permissions are created before and deleted after EKS Node Group handling.
  # Otherwise, EKS will not be able to properly delete EC2 Instances and Elastic Network Interfaces.
  depends_on = [
    aws_iam_role_policy_attachment.eks_nodes_AmazonEKSWorkerNodePolicy,
    aws_iam_role_policy_attachment.eks_nodes_AmazonEKS_CNI_Policy,
    aws_iam_role_policy_attachment.eks_nodes_AmazonEC2ContainerRegistryReadOnly,
    aws_iam_role_policy_attachment.eks_nodes_NeptuneReadOnlyAccess,
  ]

  tags = {
    Name        = "${var.cluster_name}-managed-nodes"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  }
}

# ------------------------------------------------------------------------------
# Security Groups
# ------------------------------------------------------------------------------
resource "aws_security_group" "eks_cluster" {
  name        = "${var.cluster_name}-cluster"
  description = "Security group for EKS cluster"
  vpc_id      = var.vpc_id

  # Allow inbound traffic from worker nodes
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr_block]
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.cluster_name}-cluster"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

resource "aws_security_group" "eks_nodes" {
  name        = "${var.cluster_name}-nodes"
  description = "Security group for EKS worker nodes"
  vpc_id      = var.vpc_id

  # Allow all traffic between nodes in the cluster
  ingress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"
    self      = true
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.cluster_name}-nodes"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

# ------------------------------------------------------------------------------
# IAM Policy for AWS Load Balancer Controller
# ------------------------------------------------------------------------------
resource "aws_iam_policy" "aws_load_balancer_controller" {
  name = "${var.cluster_name}-aws-load-balancer-controller"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "iam:CreateServiceLinkedRole"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "iam:AWSServiceName" = "elasticloadbalancing.amazonaws.com"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeAccountAttributes",
          "ec2:DescribeAddresses",
          "ec2:DescribeAvailabilityZones",
          "ec2:DescribeInternetGateways",
          "ec2:DescribeVpcs",
          "ec2:DescribeVpcPeeringConnections",
          "ec2:DescribeSubnets",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeInstances",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DescribeTags",
          "ec2:GetCoipPoolUsage",
          "ec2:DescribeCoipPools",
          "ec2:GetSecurityGroupsForVpc",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:AddListenerCertificates",
          "elasticloadbalancing:AddTags",
          "elasticloadbalancing:CreateListener",
          "elasticloadbalancing:CreateLoadBalancer",
          "elasticloadbalancing:CreateRule",
          "elasticloadbalancing:CreateTargetGroup",
          "elasticloadbalancing:DeleteListener",
          "elasticloadbalancing:DeleteLoadBalancer",
          "elasticloadbalancing:DeleteRule",
          "elasticloadbalancing:DeleteTargetGroup",
          "elasticloadbalancing:DeregisterTargets",
          "elasticloadbalancing:DescribeListenerCertificates",
          "elasticloadbalancing:DescribeListeners",
          "elasticloadbalancing:DescribeLoadBalancers",
          "elasticloadbalancing:DescribeLoadBalancerAttributes",
          "elasticloadbalancing:DescribeRules",
          "elasticloadbalancing:DescribeSSLPolicies",
          "elasticloadbalancing:DescribeTags",
          "elasticloadbalancing:DescribeTargetGroups",
          "elasticloadbalancing:DescribeTargetGroupAttributes",
          "elasticloadbalancing:DescribeTargetHealth",
          "elasticloadbalancing:ModifyListener",
          "elasticloadbalancing:ModifyLoadBalancerAttributes",
          "elasticloadbalancing:ModifyRule",
          "elasticloadbalancing:ModifyTargetGroup",
          "elasticloadbalancing:ModifyTargetGroupAttributes",
          "elasticloadbalancing:RegisterTargets",
          "elasticloadbalancing:RemoveListenerCertificates",
          "elasticloadbalancing:RemoveTags",
          "elasticloadbalancing:SetIpAddressType",
          "elasticloadbalancing:SetSecurityGroups",
          "elasticloadbalancing:SetSubnets",
          "elasticloadbalancing:SetWebAcl",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:DescribeUserPoolClient",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "acm:DescribeCertificate",
          "acm:ListCertificates",
          "acm:GetCertificate",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:ListServerCertificates",
          "iam:GetServerCertificate",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "waf-regional:GetWebACLForResource",
          "waf-regional:GetWebACL",
          "waf-regional:AssociateWebACL",
          "waf-regional:DisassociateWebACL",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "waf:GetWebACLForResource",
          "waf:GetWebACL",
          "waf:AssociateWebACL",
          "waf:DisassociateWebACL",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "wafv2:GetWebACL",
          "wafv2:GetWebACLForResource",
          "wafv2:AssociateWebACL",
          "wafv2:DisassociateWebACL",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "shield:DescribeProtection",
          "shield:GetSubscriptionState",
          "shield:DeleteProtection",
          "shield:CreateProtection",
          "shield:DescribeSubscription",
          "shield:ListProtections",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:AuthorizeSecurityGroupIngress",
          "ec2:RevokeSecurityGroupIngress",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateSecurityGroup",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateTags",
        ]
        Resource = [
          "arn:aws:ec2:*:*:security-group/*",
          "arn:aws:ec2:*:*:security-group-rule/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DeleteTags",
        ]
        Resource = [
          "arn:aws:ec2:*:*:security-group/*",
          "arn:aws:ec2:*:*:security-group-rule/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DeleteSecurityGroup",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:CreateOpsItem",
          "ssm:DeleteOpsItem",
          "ssm:GetOpsItem",
          "ssm:UpdateOpsItem",
          "ssm:AddTagsToResource",
          "ssm:RemoveTagsFromResource",
        ]
        Resource = "*"
      },
    ]
  })

  tags = {
    Name        = "${var.cluster_name}-aws-load-balancer-controller"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

# ------------------------------------------------------------------------------
# IAM Policy for External DNS
# ------------------------------------------------------------------------------
resource "aws_iam_policy" "external_dns" {
  name = "${var.cluster_name}-external-dns"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "route53:ChangeResourceRecordSets",
        ]
        Resource = [
          "arn:aws:route53:::hostedzone/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "route53:ListHostedZones",
          "route53:ListResourceRecordSets",
        ]
        Resource = [
          "*"
        ]
      }
    ]
  })

  tags = {
    Name        = "${var.cluster_name}-external-dns"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}
