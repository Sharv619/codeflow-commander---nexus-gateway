# Phase 6: Identity Management API Specification

## Overview

This specification defines the REST API endpoints for the Phase 6 Enterprise Identity Management system. These APIs provide comprehensive identity, authentication, authorization, and policy management capabilities for the Codeflow Commander platform.

## API Versioning & Base URLs

- **Base URL**: `https://api.codeflowcommander.com/v1`
- **Identity Management**: `/iam`
- **Authentication**: `/auth`
- **Authorization**: `/access`
- **Policy Management**: `/policies`

## Authentication Methods

### Supported Protocols
- **OAuth 2.0** (Authorization Code, Client Credentials, Device Code)
- **SAML 2.0** (SP-initiated and IdP-initiated flows)
- **Azure AD** (Native integration with Microsoft Graph API)
- **Okta** (Organization integration with Okta Lifecycle Management)
- **LDAP** (Active Directory and OpenLDAP support)

### API Authentication
All API endpoints require valid authentication tokens unless explicitly marked as public.

```http
Authorization: Bearer {access_token}
X-API-Key: {api_key}  // For service-to-service calls
X-Tenant-ID: {tenant_id}  // For multi-tenant operations
```

## Core Identity Management APIs

### User Management

#### Create Enterprise User
```http
POST /iam/users
Content-Type: application/json

{
  "userId": "string",
  "enterpriseId": "string",
  "identityProvider": "oauth2|sam|azure_ad|okta|ldap",
  "providerUserId": "string",
  "profile": {
    "email": "user@enterprise.com",
    "firstName": "John",
    "lastName": "Doe",
    "department": "Engineering",
    "jobTitle": "Senior Developer"
  },
  "attributes": {
    "employeeId": "EMP001",
    "costCenter": "CC123",
    "managerId": "mgr456"
  },
  "initialRoles": ["developer", "codeflow-user"],
  "complianceSettings": {
    "gdprConsentGranted": true,
    "hipaaAuthorized": false,
    "soxCompliant": true
  }
}
```

**Response (201 Created):**
```json
{
  "userId": "usr_123456789",
  "enterpriseId": "ent_987654321",
  "createdAt": "2025-11-21T03:31:35.000Z",
  "status": "active",
  "initialSetupRequired": true,
  "setupToken": "setup_jwt_token_here"
}
```

#### Get User Profile
```http
GET /iam/users/{userId}
Authorization: Bearer {token}
X-Tenant-ID: {tenant_id}
```

**Response (200 OK):**
```json
{
  "userId": "usr_123456789",
  "enterpriseId": "ent_987654321",
  "identityProvider": "azure_ad",
  "profile": {
    "email": "john.doe@enterprise.com",
    "firstName": "John",
    "lastName": "Doe",
    "department": "Engineering",
    "jobTitle": "Senior Developer"
  },
  "tenants": [
    {
      "tenantId": "tn_001",
      "tenantName": "Production Engineering",
      "role": "developer",
      "joinedAt": "2025-01-15T08:00:00.000Z",
      "lastActivity": "2025-11-21T03:30:00.000Z"
    }
  ],
  "roles": ["enterprise_developer", "codeflow_advanced"],
  "permissions": ["repository:read", "repository:write", "agent:execute"],
  "lastLogin": "2025-11-21T03:25:00.000Z",
  "accountStatus": "active",
  "complianceStatus": {
    "gdprCompliant": true,
    "soxCompliant": true,
    "hipaaCompliant": false
  }
}
```

#### Update User Profile
```http
PUT /iam/users/{userId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "profile": {
    "department": "Platform Engineering",
    "jobTitle": "Principal Engineer"
  },
  "attributes": {
    "costCenter": "CC789"
  }
}
```

#### Delete/Deactivate User
```http
DELETE /iam/users/{userId}
Authorization: Bearer {token}
X-Reason: retirement|termination|transfer
```

### Multi-Tenant Management

#### Add User to Tenant
```http
POST /iam/users/{userId}/tenants
Content-Type: application/json
Authorization: Bearer {token}

{
  "tenantId": "tn_002",
  "role": "lead_developer",
  "permissions": ["repository:admin", "policy:manage"],
  "justification": "Leading the microservices migration project"
}
```

#### Get User's Tenants
```http
GET /iam/users/{userId}/tenants
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "userId": "usr_123456789",
  "tenants": [
    {
      "tenantId": "tn_001",
      "tenantName": "Production Engineering",
      "role": "developer",
      "permissions": ["repository:read", "repository:write"],
      "joinedAt": "2025-01-15T08:00:00.000Z",
      "lastActivity": "2025-11-21T03:30:00.000Z"
    },
    {
      "tenantId": "tn_002",
      "tenantName": "Platform Team",
      "role": "lead_developer",
      "permissions": ["repository:admin", "policy:manage", "user:invite"],
      "joinedAt": "2025-06-01T09:00:00.000Z",
      "lastActivity": "2025-11-20T16:45:00.000Z"
    }
  ]
}
```

#### Remove User from Tenant
```http
DELETE /iam/users/{userId}/tenants/{tenantId}
Authorization: Bearer {token}
X-Reason: project_completion|role_change|access_review
```

## Authentication APIs

### OAuth 2.0 Flow

#### Initiate Authorization
```http
GET /auth/oauth2/authorize?response_type=code&client_id={client_id}&redirect_uri={redirect_uri}&scope={scopes}&state={state}
```

**Parameters:**
- `response_type`: "code" for authorization code flow
- `client_id`: Application client identifier
- `redirect_uri`: Registered redirect URI
- `scope`: Requested permissions (space-separated)
- `state`: Anti-CSRF token

#### Exchange Code for Tokens
```http
POST /auth/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code={code}&redirect_uri={redirect_uri}&client_id={client_id}&client_secret={client_secret}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_token_here",
  "scope": "repository:read repository:write",
  "id_token": "id_token_jwt_here"
}
```

#### Refresh Access Token
```http
POST /auth/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token={refresh_token}&client_id={client_id}&client_secret={client_secret}
```

#### Revoke Token
```http
POST /auth/oauth2/revoke
Content-Type: application/x-www-form-urlencoded

token={access_token}&token_type_hint=access_token&client_id={client_id}&client_secret={client_secret}
```

### SAML 2.0 SSO

#### Get SAML Metadata
```http
GET /auth/saml/metadata
```

Returns SAML 2.0 SP metadata XML for IdP configuration.

#### SAML ACS (Assertion Consumer Service)
```http
POST /auth/saml/acs
Content-Type: application/x-www-form-urlencoded

SAMLResponse={base64_encoded_saml_response}&RelayState={relay_state}
```

**Response (302 Redirect):**
Redirects to configured application URL with authorization code or tokens.

#### SLO (Single Logout)
```http
GET /auth/saml/slo?SAMLRequest={base64_encoded_logout_request}
POST /auth/saml/slo
Content-Type: application/x-www-form-urlencoded

SAMLRequest={base64_encoded_logout_request}&SigAlg={signature_algorithm}&Signature={signature}
```

### Continuous Authentication

#### Verify Session Activity
```http
POST /auth/continuous/verify
Content-Type: application/json
Authorization: Bearer {token}

{
  "sessionId": "sess_123456",
  "activity": {
    "type": "api_call",
    "resource": "repository:write",
    "timestamp": "2025-11-21T03:31:35.000Z",
    "location": {
      "ip": "192.168.1.100",
      "country": "US",
      "city": "San Francisco"
    },
    "device": {
      "fingerprint": "device_hash",
      "userAgent": "Mozilla/5.0...",
      "platform": "desktop"
    }
  }
}
```

**Response (200 OK):**
```json
{
  "verification": "allow",
  "riskLevel": "low",
  "confidence": 0.95,
  "nextVerificationRequired": false,
  "sessionExtended": true,
  "validUntil": "2025-11-21T04:31:35.000Z"
}
```

#### Require Step-Up Authentication
**Response (200 OK) - Step-up required:**
```json
{
  "verification": "stepup_required",
  "riskLevel": "medium",
  "challengeType": "mfa",
  "challengeToken": "mfa_challenge_jwt",
  "sessionExtended": false,
  "timeoutSeconds": 300
}
```

## Authorization APIs

### Access Control Evaluation

#### Evaluate Access Request
```http
POST /access/evaluate
Content-Type: application/json
Authorization: Bearer {token}
X-Tenant-ID: {tenant_id}

{
  "subject": {
    "userId": "usr_123456789",
    "roles": ["developer", "codeflow-user"],
    "attributes": {
      "department": "Engineering",
      "clearance": "confidential"
    }
  },
  "resource": {
    "type": "repository",
    "id": "repo_789",
    "attributes": {
      "classification": "internal",
      "sensitivity": "medium"
    }
  },
  "action": "write",
  "context": {
    "time": "2025-11-21T03:31:35.000Z",
    "location": "office",
    "purpose": "bug_fix"
  }
}
```

**Response (200 OK):**
```json
{
  "decision": "allow",
  "confidence": 0.98,
  "policiesApplied": ["policy_repo_write", "policy_data_classification"],
  "obligations": [
    {
      "type": "audit",
      "requirement": "log_access_with_purpose"
    }
  ],
  "advice": [
    {
      "type": "informational",
      "message": "This repository requires peer review for changes"
    }
  ],
  "evaluationId": "eval_123456789",
  "timestamp": "2025-11-21T03:31:35.000Z"
}
```

#### Denied Access Response
```json
{
  "decision": "deny",
  "reason": "insufficient_clearance",
  "requiredClearance": "secret",
  "currentClearance": "confidential",
  "evaluationId": "eval_987654321",
  "timestamp": "2025-11-21T03:31:35.000Z"
}
```

#### Batch Access Evaluation
```http
POST /access/evaluate/batch
Content-Type: application/json
Authorization: Bearer {token}

[
  {
    "requestId": "req_1",
    "subject": { "userId": "usr_123" },
    "resource": { "type": "agent", "id": "agent_456" },
    "action": "execute"
  },
  {
    "requestId": "req_2",
    "subject": { "userId": "usr_123" },
    "resource": { "type": "policy", "id": "policy_789" },
    "action": "modify"
  }
]
```

**Response (200 OK):**
```json
{
  "results": [
    {
      "requestId": "req_1",
      "decision": "allow",
      "policiesApplied": ["agent_execution_policy"]
    },
    {
      "requestId": "req_2",
      "decision": "deny",
      "reason": "insufficient_privileges",
      "requiredRole": "policy_admin"
    }
  ],
  "batchId": "batch_123456789",
  "timestamp": "2025-11-21T03:31:35.000Z"
}
```

### Permission Management

#### Get User Permissions
```http
GET /access/users/{userId}/permissions
Authorization: Bearer {token}
X-Tenant-ID: {tenant_id}
```

**Response (200 OK):**
```json
{
  "userId": "usr_123456789",
  "tenantId": "tn_001",
  "effectivePermissions": [
    {
      "resourceType": "repository",
      "permissions": ["read", "write", "create"],
      "conditions": null,
      "expires": null
    },
    {
      "resourceType": "agent",
      "permissions": ["execute", "monitor"],
      "conditions": {
        "max_execution_time": 3600
      },
      "expires": "2026-01-01T00:00:00.000Z"
    }
  ],
  "grantedBy": [
    {
      "role": "developer",
      "permissions": ["repository:read", "repository:write"]
    },
    {
      "policy": "pol_devops_tools",
      "permissions": ["agent:execute"]
    }
  ],
  "lastUpdated": "2025-11-20T15:30:00.000Z"
}
```

#### Get Resource Permissions
```http
GET /access/resources/{resourceType}/{resourceId}/permissions
Authorization: Bearer {token}
X-Tenant-ID: {tenant_id}
```

## Policy Management APIs

### Enterprise Policy Lifecycle

#### Create Policy
```http
POST /policies
Content-Type: application/json
Authorization: Bearer {token}

{
  "policyId": "pol_repo_security",
  "name": "Repository Security Controls",
  "description": "Enforces security standards for repository operations",
  "scope": {
    "tenantId": "tn_001",
    "appliesTo": ["repositories"]
  },
  "conditions": [
    {
      "type": "resource_attribute",
      "attribute": "classification",
      "operator": "equals",
      "value": "sensitive"
    }
  ],
  "effect": "allow",
  "actions": [
    {
      "action": "write",
      "constraints": {
        "require_approval": true,
        "max_changes": 10
      }
    }
  ],
  "metadata": {
    "createdBy": "security_team",
    "complianceFramework": "sox",
    "reviewRequired": true,
    "reviewCycle": "quarterly"
  }
}
```

**Response (201 Created):**
```json
{
  "policyId": "pol_repo_security_v1_001",
  "version": "1.0.0",
  "status": "draft",
  "createdAt": "2025-11-21T03:31:35.000Z",
  "createdBy": "usr_security_admin",
  "requiresApproval": true
}
```

#### Publish Policy
```http
POST /policies/{policyId}/publish
Authorization: Bearer {token}

{
  "effectiveDate": "2025-12-01T00:00:00.000Z",
  "rollbackPlan": "Disable policy and revert to previous version",
  "testingCompleted": true
}
```

#### Update Policy
```http
PUT /policies/{policyId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "actions": [
    {
      "action": "write",
      "constraints": {
        "require_approval": true,
        "max_changes": 5  // Tightened from 10
      }
    }
  ],
  "changeReason": "Enhanced security controls based on recent audit findings"
}
```

#### Delete Policy
```http
DELETE /policies/{policyId}
Authorization: Bearer {token}
X-Reason: policy_obsolete|consolidated_with_other_policy
```

### Policy Evaluation Testing

#### Test Policy Evaluation
```http
POST /policies/{policyId}/test
Content-Type: application/json
Authorization: Bearer {token}

{
  "subject": {
    "userId": "usr_test_user",
    "roles": ["developer"],
    "attributes": { "department": "Engineering" }
  },
  "resource": {
    "type": "repository",
    "id": "repo_sensitive",
    "attributes": { "classification": "sensitive" }
  },
  "action": "write",
  "context": {
    "time": "2025-11-21T03:31:35.000Z",
    "location": "office"
  }
}
```

**Response (200 OK):**
```json
{
  "policyId": "pol_repo_security",
  "decision": "allow",
  "conditionsMet": [
    {
      "condition": "resource_classification",
      "met": true,
      "details": "Resource classified as sensitive"
    }
  ],
  "obligations": [
    {
      "type": "approval_required",
      "details": "Changes require peer review approval"
    }
  ],
  "testTimestamp": "2025-11-21T03:31:35.000Z"
}
```

#### Batch Policy Testing
```http
POST /policies/test/batch
Content-Type: application/json
Authorization: Bearer {token}

{
  "scenarios": [
    {
      "name": "developer_sensitive_repo",
      "subject": { "roles": ["developer"] },
      "resource": { "attributes": { "classification": "sensitive" } },
      "action": "write"
    },
    {
      "name": "admin_public_repo",
      "subject": { "roles": ["admin"] },
      "resource": { "attributes": { "classification": "public" } },
      "action": "delete"
    }
  ]
}
```

### Policy Analytics

#### Get Policy Effectiveness
```http
GET /policies/{policyId}/analytics?from={start_date}&to={end_date}&metrics=violations,overrides,performance
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "policyId": "pol_repo_security",
  "timeRange": {
    "from": "2025-10-01T00:00:00.000Z",
    "to": "2025-11-21T03:31:35.000Z"
  },
  "metrics": {
    "totalEvaluations": 12543,
    "allowDecisions": 11892,
    "denyDecisions": 651,
    "averageEvaluationTime": 45,
    "policyOverrides": 23,
    "violationsDetected": 89
  },
  "effectiveness": {
    "violationRate": 0.71,
    "overrideRate": 0.18,
    "performanceScore": 0.95,
    "complianceScore": 0.92
  },
  "recommendations": [
    {
      "type": "optimization",
      "message": "Consider adding IP-based conditions for remote access",
      "impact": "medium"
    }
  ]
}
```

## Identity Provider Management APIs

### Configure Identity Provider
```http
POST /iam/providers
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "providerId": "azure_ad_prod",
  "type": "azure_ad",
  "name": "Azure AD Production",
  "configuration": {
    "tenantId": "azure-tenant-id",
    "clientId": "azure-client-id",
    "clientSecret": "azure-client-secret",
    "redirectUris": [
      "https://api.codeflowcommander.com/auth/azure/callback"
    ],
    "scopes": [
      "openid",
      "profile",
      "email",
      "https://graph.microsoft.com/User.Read"
    ]
  },
  "attributeMapping": {
    "userId": "id",
    "email": "mail",
    "firstName": "givenName",
    "lastName": "surname",
    "department": "department",
    "jobTitle": "jobTitle"
  },
  "capabilities": {
    "supportsMFA": true,
    "supportsSSO": true,
    "supportsJIT": true,
    "groupSync": true
  }
}
```

### Test Provider Connection
```http
POST /iam/providers/{providerId}/test
Authorization: Bearer {admin_token}
```

**Response (200 OK):**
```json
{
  "providerId": "azure_ad_prod",
  "status": "connected",
  "capabilities": {
    "mfaSupported": true,
    "ssoSupported": true,
    "userSync": true,
    "groupSync": true
  },
  "testResults": {
    "authentication": "success",
    "userProfile": "success",
    "groupMembership": "success",
    "lastTested": "2025-11-21T03:31:35.000Z"
  },
  "recommendations": []
}
```

## Audit & Monitoring APIs

### Access Audit Logs
```http
GET /audit/access?user={userId}&resource={resourceId}&from={start}&to={end}&action={action}
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "logs": [
    {
      "eventId": "audit_123456789",
      "timestamp": "2025-11-21T03:25:00.000Z",
      "userId": "usr_123456789",
      "action": "repository:write",
      "resource": {
        "type": "repository",
        "id": "repo_789",
        "name": "microservices-platform"
      },
      "result": {
        "decision": "allow",
        "policiesApplied": ["pol_repo_write"],
        "reason": "standard_developer_access"
      },
      "context": {
        "ipAddress": "192.168.1.100",
        "userAgent": "VSCode/1.60.0",
        "sessionId": "sess_123456"
      }
    }
  ],
  "pagination": {
    "total": 1250,
    "page": 1,
    "pageSize": 50,
    "hasMore": true
  },
  "exportAvailable": true
}
```

### Export Audit Data
```http
POST /audit/export
Content-Type: application/json
Authorization: Bearer {token}

{
  "format": "json|csv|xml",
  "filters": {
    "from": "2025-01-01T00:00:00.000Z",
    "to": "2025-11-21T03:31:35.000Z",
    "eventTypes": ["access_denied", "policy_violation"],
    "users": ["usr_123456789"]
  },
  "fields": ["timestamp", "userId", "action", "resource", "result"],
  "compression": "gzip",
  "delivery": {
    "method": "download|s3|email",
    "email": "audit@enterprise.com",
    "s3Bucket": "enterprise-audit-logs"
  }
}
```

## Error Handling & Status Codes

### HTTP Status Codes
- `200 OK`: Successful operation
- `201 Created`: Resource created successfully
- `204 No Content`: Operation successful, no content returned
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Authorization failed (insufficient permissions)
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., user already exists)
- `422 Unprocessable Entity`: Validation failed
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: System error
- `503 Service Unavailable`: Service temporarily unavailable

### Error Response Format
```json
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "User does not have required permissions for this operation",
    "details": {
      "requiredPermission": "policy:admin",
      "userPermissions": ["policy:read"],
      "resource": "pol_123"
    },
    "documentation": "https://docs.codeflowcommander.com/errors/INSUFFICIENT_PERMISSIONS",
    "requestId": "req_123456789",
    "timestamp": "2025-11-21T03:31:35.000Z"
  }
}
```

### Rate Limiting
- **Standard Tier**: 1000 requests/hour per user
- **Enterprise Tier**: 10000 requests/hour per user
- **Service Tier**: 100000 requests/hour per service
- Rate limit headers included in responses:
  - `X-RateLimit-Limit`: Maximum requests per hour
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

## Security Considerations

### Transport Security
- All APIs require HTTPS/TLS 1.3
- Perfect Forward Secrecy (PFS) enforced
- Certificate pinning recommended for mobile clients
- HSTS headers included for web clients

### Data Protection
- Personal data encrypted at rest and in transit
- PII automatically identified and protected
- Data minimization enforced by default
- GDPR-compliant data retention policies

### Monitoring & Threat Detection
- Real-time security event monitoring
- Automated threat detection and response
- Comprehensive audit logging for compliance
- Integration with enterprise SIEM systems

## API Client Examples

### JavaScript/TypeScript Client
```typescript
const codeflowAPI = new CodeflowClient({
  baseURL: 'https://api.codeflowcommander.com/v1',
  tenantId: 'tn_001'
});

// Authenticate user
const tokens = await codeflowAPI.auth.login({
  provider: 'azure_ad',
  authorizationCode: 'auth_code_here'
});

// Evaluate access
const accessDecision = await codeflowAPI.access.evaluate({
  resource: { type: 'repository', id: 'repo_123' },
  action: 'write'
});

if (accessDecision.decision === 'allow') {
  // Perform operation
  await performRepositoryWrite();
}
```

### Python Client
```python
from codeflow_client import CodeflowAPI

api = CodeflowAPI(
    base_url="https://api.codeflowcommander.com/v1",
    tenant_id="tn_001"
)

# OAuth token exchange
tokens = api.auth.exchange_code(
    code="authorization_code",
    redirect_uri="https://myapp.com/callback"
)

# Evaluate permissions
decision = api.access.evaluate(
    resource={"type": "agent", "id": "agent_456"},
    action="execute"
)

if decision["decision"] == "allow":
    api.agents.execute(agent_id="agent_456", params={})
```

This comprehensive Identity Management API specification provides the foundation for enterprise-grade identity, authentication, authorization, and policy management in the Codeflow Commander platform. The APIs are designed to support multi-tenant operations, regulatory compliance, and zero-trust security principles while maintaining developer-friendly interfaces and comprehensive audit capabilities.
