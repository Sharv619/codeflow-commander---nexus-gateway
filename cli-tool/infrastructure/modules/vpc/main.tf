# ------------------------------------------------------------------------------
# VPC Module - Enterprise Networking Infrastructure
# Creates a secure, multi-AZ VPC with public/private subnets for the CodeFlow platform
# ------------------------------------------------------------------------------

# ------------------------------------------------------------------------------
# VPC Creation
# ------------------------------------------------------------------------------
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = var.vpc_name
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

# ------------------------------------------------------------------------------
# Internet Gateway
# ------------------------------------------------------------------------------
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "${var.vpc_name}-igw"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

# ------------------------------------------------------------------------------
# Public Subnets (for Load Balancers, Bastion hosts, etc.)
# ------------------------------------------------------------------------------
resource "aws_subnet" "public" {
  count = length(var.availability_zones)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.vpc_name}-public-${var.availability_zones[count.index]}"
    Type        = "Public"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
    "kubernetes.io/role/elb" = "1"  # AWS Load Balancer Controller tag
  }
}

# ------------------------------------------------------------------------------
# Private Subnets (for EKS nodes, Neptune DB, application services)
# ------------------------------------------------------------------------------
resource "aws_subnet" "private" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + length(var.availability_zones))
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name        = "${var.vpc_name}-private-${var.availability_zones[count.index]}"
    Type        = "Private"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
    "kubernetes.io/role/internal-elb" = "1"  # AWS Load Balancer Controller tag
  }
}

# ------------------------------------------------------------------------------
# Elastic IPs for NAT Gateways
# ------------------------------------------------------------------------------
resource "aws_eip" "nat" {
  count = length(var.availability_zones)

  domain = "vpc"

  tags = {
    Name        = "${var.vpc_name}-nat-${var.availability_zones[count.index]}"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }

  depends_on = [aws_internet_gateway.main]
}

# ------------------------------------------------------------------------------
# NAT Gateways (one per AZ for high availability and fault tolerance)
# ------------------------------------------------------------------------------
resource "aws_nat_gateway" "main" {
  count = length(var.availability_zones)

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name        = "${var.vpc_name}-nat-${var.availability_zones[count.index]}"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }

  depends_on = [aws_internet_gateway.main]
}

# ------------------------------------------------------------------------------
# Public Route Table
# ------------------------------------------------------------------------------
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name        = "${var.vpc_name}-public"
    Type        = "Public"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

# ------------------------------------------------------------------------------
# Public Route Table Associations
# ------------------------------------------------------------------------------
resource "aws_route_table_association" "public" {
  count = length(var.availability_zones)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# ------------------------------------------------------------------------------
# Private Route Tables (one per AZ)
# ------------------------------------------------------------------------------
resource "aws_route_table" "private" {
  count = length(var.availability_zones)

  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name        = "${var.vpc_name}-private-${var.availability_zones[count.index]}"
    Type        = "Private"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

# ------------------------------------------------------------------------------
# Private Route Table Associations
# ------------------------------------------------------------------------------
resource "aws_route_table_association" "private" {
  count = length(var.availability_zones)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# ------------------------------------------------------------------------------
# VPC Endpoints (for secure access to AWS services from private subnets)
# ------------------------------------------------------------------------------
resource "aws_vpc_endpoint" "s3" {
  vpc_id          = aws_vpc.main.id
  service_name    = "com.amazonaws.${data.aws_region.current.name}.s3"
  route_table_ids = aws_route_table.private[*].id

  tags = {
    Name        = "${var.vpc_name}-s3-endpoint"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name        = "${var.vpc_name}-ecr-dkr-endpoint"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name        = "${var.vpc_name}-ecr-api-endpoint"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

resource "aws_vpc_endpoint" "logs" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.logs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name        = "${var.vpc_name}-logs-endpoint"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

# ------------------------------------------------------------------------------
# Security Groups
# ------------------------------------------------------------------------------
resource "aws_security_group" "vpc_endpoints" {
  name        = "${var.vpc_name}-vpc-endpoints"
  description = "Security group for VPC endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.vpc_name}-vpc-endpoints"
    Environment = "production"
    Project     = "codeflow-platform"
    ManagedBy   = "terraform"
  }
}

# ------------------------------------------------------------------------------
# Data Sources
# ------------------------------------------------------------------------------
data "aws_region" "current" {}
