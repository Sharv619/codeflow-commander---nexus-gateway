// File: src/governance/index.ts
// Governance-specific implementations
// Role-Based Access Control (RBAC) and advanced audit trail management

import { Logger, defaultLogger } from '../utils/logger';
// Assuming PermissionLevel is correctly defined here or in a core types file.
// If it's not, we'll define it based on usage.

// ================ TYPES AND INTERFACES (Moved up for clarity and to fix redeclaration) ================

type GovernanceDomain = 'security' | 'compliance' | 'operational' | 'governance' | 'general';
type PermissionLevel = 'read' | 'write' | 'execute' | 'admin'; // Explicitly define based on usage

interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  createdAt: Date;
  lastUpdated: Date;
}

interface UserPermissions {
  userId: string;
  roles: string[];
  directPermissions: Permission[];
  lastUpdated: Date;
}

interface Permission {
  resource: string;
  resourceType: string;
  permission: PermissionLevel;
}

interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  category: 'security' | 'compliance' | 'operational' | 'governance' | 'privileged_action'; // Added privileged_action
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress?: string;
  userAgent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  success: boolean;
  responseCode?: number;
  violations?: string[];
  complianceCategory?: string;
  details?: Record<string, any>;
}

interface AuditQueryFilters {
  userId?: string;
  category?: string;
  action?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

interface ComplianceReport {
  complianceCategory: string;
  period: { start: Date; end: Date };
  totalEvents: number;
  issues: number;
  violations: number;
  criticalIncidents: number;
  recommendations: string[];
  generatedAt: Date;
}

interface SecurityPosture {
  overallStatus: 'good' | 'warning' | 'danger';
  metrics: {
    criticalIncidents: number;
    highIssues: number;
    failedAuthentications: number;
    periodHours: number;
  };
  alerts: SecurityAlert[];
  lastAssessment: Date;
}

interface SecurityAlert {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedUsers: string[];
}

interface ExportData {
  metadata: {
    exportId: string;
    generatedAt: Date;
    filters: AuditQueryFilters;
    recordCount: number;
    dateRange: { from: Date; to: Date };
  };
  events: Array<AuditEvent & { formatted: Record<string, any> }>;
}

interface GovernancePolicy {
  id: string;
  domain: GovernanceDomain;
  requireApproval: boolean;
  approvalWorkflow?: ApprovalWorkflow; // Made optional for exactOptionalPropertyTypes
  riskScore: number;
}

interface GovernanceContext {
  domain: GovernanceDomain; // Use the defined GovernanceDomain type
  userId: string;
  resourceId: string;
  action: string;
}

interface GovernanceDecision {
  id: string;
  context: GovernanceContext;
  action: string;
  parameters: Record<string, any>;
  policiesEvaluated: PolicyEvaluationResult[];
  requirements: string[];
  approvalRequired: boolean;
  approvalWorkflow?: ApprovalWorkflow; // Made optional
  riskScore: number;
  automatedApproval: boolean;
  decisionDate: Date;
}

interface PolicyEvaluationResult {
  policyId: string;
  requiresApproval: boolean;
  approvalWorkflow?: ApprovalWorkflow; // Made optional
  riskScore: number;
}

interface ApprovalWorkflow {
  id: string;
  name: string;
  quorum: number;
}

interface ActiveDecision {
  decision: GovernanceDecision;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  escalationLevel: number;
  approvals: ApprovalRecord[];
  rejections: ApprovalRecord[];
}

interface ApprovalRecord {
  userId: string;
  approved: boolean;
  comments?: string; // Made optional to match usage
  timestamp: Date;
}


/**
 * Role-Based Access Control System
 * Defines organizational roles and their capabilities
 */
export class RoleBasedAccessControl {
  private logger: Logger;
  private roles: Map<string, RoleDefinition> = new Map();
  private users: Map<string, UserPermissions> = new Map();

  constructor(logger?: Logger) {
    this.logger = logger || defaultLogger;
    this.initializeDefaultRoles();
  }

  /**
   * Check if user has permission for specific action on resource
   */
  hasPermission(userId: string, action: string, resource: string, resourceType: string): boolean {
    const userPerms = this.users.get(userId);

    if (!userPerms) {
      this.logger.warn('Permission denied: User not found', { userId, action, resource, resourceType });
      return false;
    }

    // Check direct user permissions first
    if (userPerms.directPermissions.some(perm =>
      perm.resource === resource && perm.resourceType === resourceType &&
      perm.permission === 'admin'
    )) {
      return true;
    }

    // Check role permissions
    for (const roleId of userPerms.roles) {
      const role = this.roles.get(roleId);
      if (!role) {
        this.logger.warn('Permission denied: Role not found', { userId, roleId });
        continue;
      }

      if (role.permissions.some(perm =>
        perm.resource === resource && perm.resourceType === resourceType &&
        this.actionAllowedByPermission(action, perm.permission)
      )) {
        return true;
      }
    }

    this.logger.warn('Permission denied: No matching role or direct permission', { userId, action, resource, resourceType });
    return false;
  }

  /**
   * Grant role to user
   */
  grantRole(userId: string, roleId: string): void {
    const userPerms = this.users.get(userId) || {
      userId,
      roles: [],
      directPermissions: [],
      lastUpdated: new Date()
    };

    if (!userPerms.roles.includes(roleId)) {
      userPerms.roles.push(roleId);
      userPerms.lastUpdated = new Date();
      this.users.set(userId, userPerms);
      this.logger.info('Role granted', { userId, roleId });
    } else {
      this.logger.debug('Role already granted to user', { userId, roleId });
    }
  }

  /**
   * Revoke role from user
   */
  revokeRole(userId: string, roleId: string): void {
    const userPerms = this.users.get(userId);
    if (userPerms) {
      userPerms.roles = userPerms.roles.filter(r => r !== roleId);
      userPerms.lastUpdated = new Date();
      this.logger.info('Role revoked', { userId, roleId });
    } else {
      this.logger.warn('Cannot revoke role: User not found', { userId, roleId });
    }
  }

  /**
   * Create custom role
   */
  createRole(roleId: string, name: string, description: string, permissions: Permission[]): void {
    if (this.roles.has(roleId)) {
      this.logger.warn('Role already exists', { roleId });
      return;
    }
    const role: RoleDefinition = {
      id: roleId,
      name,
      description,
      permissions,
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    this.roles.set(roleId, role);
    this.logger.info('Role created', { roleId, name });
  }

  private initializeDefaultRoles(): void {
    // Developer role - basic access for code work
    this.createRole('developer', 'Developer', 'Basic developer access', [
      { resource: '*', resourceType: 'repository', permission: 'write' },
      { resource: '*', resourceType: 'agent', permission: 'read' },
      { resource: '*', resourceType: 'agent', permission: 'execute' } // Use 'agent' not 'agents'
    ]);

    // Engineering Lead role - team management
    this.createRole('engineering_lead', 'Engineering Lead', 'Team leadership with oversight', [
      { resource: '*', resourceType: 'repository', permission: 'admin' },
      { resource: '*', resourceType: 'agent', permission: 'admin' },
      { resource: '*', resourceType: 'governance', permission: 'write' }
    ]);

    // Platform Admin role - full system access
    this.createRole('platform_admin', 'Platform Admin', 'Full system administration', [
      { resource: '*', resourceType: '*', permission: 'admin' }
    ]);
  }

  private actionAllowedByPermission(action: string, permission: PermissionLevel): boolean {
    switch (action) {
      case 'read': return permission === 'read' || permission === 'write' || permission === 'execute' || permission === 'admin';
      case 'write': return permission === 'write' || permission === 'admin';
      case 'execute': return permission === 'execute' || permission === 'admin';
      case 'admin': return permission === 'admin';
      default: return false;
    }
  }
}

/**
 * Audit Trail Management System
 * Comprehensive logging and compliance tracking
 */
export class AuditTrailManager {
  private logger: Logger;
  private auditEvents: AuditEvent[] = [];
  private retentionDays: number = 365;
  private complianceGroups: Map<string, AuditEvent[]> = new Map();

  constructor(logger?: Logger) {
    this.logger = logger || defaultLogger;
  }

  /**
   * Log audit event
   */
  logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): string {
    const auditEvent: AuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`, // Using substring for random part
      timestamp: new Date(),
      ...event
    };

    this.auditEvents.push(auditEvent);

    // Group by compliance categories
    if (auditEvent.complianceCategory) { // Use auditEvent here
      if (!this.complianceGroups.has(auditEvent.complianceCategory)) {
        this.complianceGroups.set(auditEvent.complianceCategory, []);
      }
      this.complianceGroups.get(auditEvent.complianceCategory)!.push(auditEvent);
    }

    // Clean up old events
    this.cleanupOldEvents();

    this.logger.debug('Audit event logged', {
      eventId: auditEvent.id,
      category: auditEvent.category,
      action: auditEvent.action,
      userId: auditEvent.userId
    });

    return auditEvent.id;
  }

  /**
   * Query audit events with filtering
   */
  queryEvents(filters: AuditQueryFilters): AuditEvent[] {
    let results = this.auditEvents;

    if (filters.userId) {
      results = results.filter(e => e.userId === filters.userId);
    }

    if (filters.category) {
      results = results.filter(e => e.category === filters.category);
    }

    if (filters.action) {
      results = results.filter(e => e.action === filters.action);
    }

    if (filters.resourceType) {
      results = results.filter(e => e.resourceType === filters.resourceType);
    }

    if (filters.startDate) {
      results = results.filter(e => e.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      results = results.filter(e => e.timestamp <= filters.endDate!);
    }

    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(category: string, startDate: Date, endDate: Date): ComplianceReport {
    const events = this.complianceGroups.get(category) || [];

    const periodEvents = events.filter(e =>
      e.timestamp >= startDate && e.timestamp <= endDate
    );

    const issues = periodEvents.filter(e => e.severity === 'high' || e.severity === 'critical');
    const violations = periodEvents.filter(e => e.violations && e.violations.length > 0);

    return {
      complianceCategory: category,
      period: { start: startDate, end: endDate },
      totalEvents: periodEvents.length,
      issues: issues.length,
      violations: violations.length,
      criticalIncidents: issues.filter(e => e.severity === 'critical').length,
      recommendations: this.generateRecommendations(category, issues),
      generatedAt: new Date()
    };
  }

  /**
   * Get system security posture
   */
  getSecurityPosture(): SecurityPosture {
    const recentEvents = this.queryEvents({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      category: 'security'
    });

    const criticalIncidents = recentEvents.filter(e => e.severity === 'critical').length;
    const highIssues = recentEvents.filter(e => e.severity === 'high').length;
    const failedAuth = recentEvents.filter(e => e.action === 'failed_login').length;

    let overallStatus: 'good' | 'warning' | 'danger' = 'good';

    if (criticalIncidents > 0 || failedAuth > 10) {
      overallStatus = 'danger';
    } else if (highIssues > 5 || failedAuth > 3) {
      overallStatus = 'warning';
    }

    return {
      overallStatus,
      metrics: {
        criticalIncidents,
        highIssues,
        failedAuthentications: failedAuth,
        periodHours: 24
      },
      alerts: this.generateSecurityAlerts(recentEvents),
      lastAssessment: new Date()
    };
  }

  /**
   * Export audit data for external compliance tools
   */
  exportAuditData(filters: AuditQueryFilters): ExportData {
    const events = this.queryEvents(filters);

    return {
      metadata: {
        exportId: `export_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        generatedAt: new Date(),
        filters,
        recordCount: events.length,
        dateRange: {
          from: filters.startDate || new Date(0),
          to: filters.endDate || new Date()
        }
      },
      events: events.map(e => ({
        ...e,
        // Make sure formatted is of type Record<string, any>
        formatted: this.formatEventForExport(e)
      }))
    };
  }

  private cleanupOldEvents(): void {
    const cutoffDate = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
    this.auditEvents = this.auditEvents.filter(e => e.timestamp > cutoffDate);

    // Clean up compliance groups too
    for (const [key, events] of this.complianceGroups) {
      this.complianceGroups.set(key, events.filter(e => e.timestamp > cutoffDate));
    }
  }

  private generateRecommendations(category: string, issues: AuditEvent[]): string[] {
    const recommendations: string[] = [];

    if (issues.some(i => i.action === 'failed_login')) {
      recommendations.push('Consider implementing multi-factor authentication');
    }

    if (issues.some(i => i.category === 'security' && i.severity === 'critical')) {
      recommendations.push('Immediate security review required');
    }

    if (issues.length > 10) {
      recommendations.push('Implement automated policy enforcement');
    }

    return recommendations;
  }

  private generateSecurityAlerts(recentEvents: AuditEvent[]): SecurityAlert[] {
    const alerts: SecurityAlert[] = [];

    const failedLogins = recentEvents.filter(e => e.action === 'failed_login');
    if (failedLogins.length > 5) {
      alerts.push({
        type: 'multiple_failed_logins',
        severity: 'high',
        message: `${failedLogins.length} failed login attempts in last 24 hours`,
        affectedUsers: [...new Set(failedLogins.map(e => e.userId))]
      });
    }

    // Comparison for 'privileged_action' category needs to be against the defined union type
    const privilegedActions = recentEvents.filter(e => e.category === 'privileged_action');
    if (privilegedActions.length > 20) {
      alerts.push({
        type: 'high_privileged_activity',
        severity: 'medium',
        message: 'Unusually high privileged actions detected',
        affectedUsers: [...new Set(privilegedActions.map(e => e.userId))]
      });
    }

    return alerts;
  }

  private formatEventForExport(event: AuditEvent): Record<string, any> {
    return {
      timestamp: event.timestamp.toISOString(),
      userId: event.userId,
      category: event.category,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      severity: event.severity,
      success: event.success,
      responseCode: event.responseCode,
      violations: event.violations,
      details: event.details
    };
  }
}

/**
 * Governance Decision Engine
 * Real-time policy evaluation and enforcement
 */
export class GovernanceDecisionEngine {
  private logger: Logger;
  private policies: Map<string, GovernancePolicy> = new Map();
  private activeDecisions: Map<string, ActiveDecision> = new Map();

  constructor(logger?: Logger) {
    this.logger = logger || defaultLogger;
  }

  /**
   * Evaluate governance decision for action
   */
  async evaluateDecision(
    decisionId: string,
    context: GovernanceContext,
    action: string,
    parameters: Record<string, any>
  ): Promise<GovernanceDecision> {
    this.logger.debug('Evaluating governance decision', { decisionId, action });

    const decision: GovernanceDecision = {
      id: decisionId,
      context,
      action,
      parameters,
      policiesEvaluated: [],
      requirements: [],
      approvalRequired: false,
      riskScore: 0,
      automatedApproval: false,
      decisionDate: new Date()
    };

    // Evaluate relevant policies
    for (const [policyId, policy] of this.policies) {
      if (this.policyApplies(policy, context, action)) {
        const policyDecision = await this.evaluatePolicy(policy, context, action, parameters);
        decision.policiesEvaluated.push(policyDecision);

        if (policyDecision.requiresApproval) {
          decision.approvalRequired = true;
          if (policyDecision.approvalWorkflow) {
            decision.approvalWorkflow = policyDecision.approvalWorkflow;
          }
        }

        decision.riskScore = Math.max(decision.riskScore, policyDecision.riskScore);
      }
    }

    // Determine if action can be automated
    decision.automatedApproval = decision.riskScore < 3 && !decision.approvalRequired;

    // Store active decision for approval workflow
    if (decision.approvalRequired) {
      this.activeDecisions.set(decisionId, {
        decision,
        status: 'pending',
        escalationLevel: 0,
        approvals: [],
        rejections: []
      });
    }

    this.logger.info('Governance decision evaluated', {
      decisionId,
      approvalRequired: decision.approvalRequired,
      riskScore: decision.riskScore,
      automatedApproval: decision.automatedApproval
    });

    return decision;
  }

  /**
   * Submit decision approval
   */
  submitApproval(decisionId: string, userId: string, approved: boolean, comments?: string): void {
    const activeDecision = this.activeDecisions.get(decisionId);

    if (!activeDecision) {
      throw new Error(`Decision ${decisionId} not found`);
    }

    const approval: ApprovalRecord = { // Explicitly type the approval object
      userId,
      approved,
      timestamp: new Date(),
      ...(comments ? { comments } : {})
    };

    if (approved) {
      activeDecision.approvals.push(approval);
    } else {
      activeDecision.rejections.push(approval);
    }

    // Check if decision threshold is met
    // Ensure approvalWorkflow is present before accessing quorum
    if (activeDecision.decision.approvalWorkflow) {
        this.checkDecisionThreshold(activeDecision);
    } else {
        this.logger.warn('Cannot check decision threshold: Approval workflow not defined for decision', { decisionId });
    }
  }

  private policyApplies(policy: GovernancePolicy, context: GovernanceContext, action: string): boolean {
    // Check if policy applies to current context and action
    if (policy.domain !== 'general' && policy.domain !== context.domain) {
      return false;
    }

    // Would implement more sophisticated policy matching logic
    return true;
  }

  private async evaluatePolicy(
    policy: GovernancePolicy,
    context: GovernanceContext,
    action: string,
    parameters: Record<string, any>
  ): Promise<PolicyEvaluationResult> {
    // Simplified policy evaluation - would implement sophisticated logic
    return {
      policyId: policy.id,
      requiresApproval: policy.requireApproval,
      riskScore: policy.riskScore,
      ...(policy.approvalWorkflow ? { approvalWorkflow: policy.approvalWorkflow } : {})
    };
  }

  private checkDecisionThreshold(activeDecision: ActiveDecision): void {
    // Would implement quorum-based decision logic
    // Avoid division by zero if no votes
    if (activeDecision.approvals.length + activeDecision.rejections.length === 0) {
        this.logger.debug('No votes yet, decision threshold not met.', { decisionId: activeDecision.decision.id });
        return;
    }

    const approvalPercentage = activeDecision.approvals.length / (activeDecision.approvals.length + activeDecision.rejections.length);
    const quorumRequired = activeDecision.decision.approvalWorkflow!.quorum; // Assured to be present by caller

    if (approvalPercentage >= 0.8) {
      activeDecision.status = 'approved';
    } else if (approvalPercentage <= 0.2) {
      activeDecision.status = 'rejected';
    } else if (activeDecision.approvals.length + activeDecision.rejections.length >= quorumRequired) { // Check if quorum is met
      activeDecision.status = 'approved'; // Assuming majority wins if quorum met and not rejected
    }
  }
}

export type {
  AuditEvent,
  GovernanceDecision,
  SecurityPosture,
  ComplianceReport,
  PermissionLevel,
  GovernanceDomain,
  ApprovalWorkflow
};
