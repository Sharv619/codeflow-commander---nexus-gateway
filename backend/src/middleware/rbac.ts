import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';

export type Role = 'admin' | 'manager' | 'developer';

export class RBACMiddleware {
  private static readonly ROLE_HIERARCHY: Record<Role, number> = {
    developer: 1,
    manager: 2,
    admin: 3,
  };

  /**
   * Check if user has required role
   */
  public static hasRole(userRole: Role, requiredRole: Role): boolean {
    return this.ROLE_HIERARCHY[userRole] >= this.ROLE_HIERARCHY[requiredRole];
  }

  /**
   * Check if user has any of the required roles
   */
  public static hasAnyRole(userRole: Role, requiredRoles: Role[]): boolean {
    return requiredRoles.some(role => this.hasRole(userRole, role));
  }

  /**
   * Middleware to require specific role
   */
  public static requireRole = (requiredRole: Role) =>
    (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'You must be authenticated to access this resource.',
        });
        return;
      }

      if (!this.hasRole(req.user.role, requiredRole)) {
        res.status(403).json({
          error: 'Insufficient permissions',
          message: `${requiredRole.charAt(0).toUpperCase() + requiredRole.slice(1)} access required. You have ${req.user.role} access.`,
        });
        return;
      }

      next();
    };

  /**
   * Middleware to require any of the specified roles
   */
  public static requireAnyRole = (requiredRoles: Role[]) =>
    (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'You must be authenticated to access this resource.',
        });
        return;
      }

      if (!this.hasAnyRole(req.user.role, requiredRoles)) {
        res.status(403).json({
          error: 'Insufficient permissions',
          message: `One of the following roles required: ${requiredRoles.join(', ')}. You have ${req.user.role} access.`,
        });
        return;
      }

      next();
    };

  /**
   * Admin-only middleware (convenience wrapper)
   */
  public static requireAdmin = this.requireRole('admin');

  /**
   * Manager or Admin middleware (convenience wrapper)
   */
  public static requireManagerOrAdmin = this.requireAnyRole(['manager', 'admin']);

  /**
   * Manager-only middleware (convenience wrapper)
   */
  public static requireManager = this.requireRole('manager');

  /**
   * Permission-based authorization for specific actions
   */
  public static canPerformAction = (action: string, resource: string) =>
    (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'You must be authenticated to access this resource.',
        });
        return;
      }

      // Define permissions based on role
      const permissions = this.getPermissionsForRole(req.user.role);

      // Check if user has permission for this action on this resource
      const hasPermission = permissions.some(permission =>
        permission.actions.includes(action) && permission.resources.includes(resource)
      );

      if (!hasPermission) {
        res.status(403).json({
          error: 'Insufficient permissions',
          message: `You do not have permission to ${action} ${resource}.`,
        });
        return;
      }

      next();
    };

  /**
   * Get all available permissions for a role
   */
  private static getPermissionsForRole(role: Role): Array<{ actions: string[], resources: string[] }> {
    const basePermissions = [
      {
        actions: ['read', 'list'],
        resources: ['profile', 'projects'],
      },
    ];

    const developerPermissions = [
      ...basePermissions,
      {
        actions: ['create', 'update', 'delete'],
        resources: ['code-reviews', 'comments'],
      },
    ];

    const managerPermissions = [
      ...developerPermissions,
      {
        actions: ['manage'],
        resources: ['team', 'projects'],
      },
      {
        actions: ['read'],
        resources: ['analytics', 'reports'],
      },
    ];

    const adminPermissions = [
      ...managerPermissions,
      {
        actions: ['create', 'update', 'delete', 'manage'],
        resources: ['users', 'system', 'security', 'compliance'],
      },
    ];

    switch (role) {
      case 'admin':
        return adminPermissions;
      case 'manager':
        return managerPermissions;
      case 'developer':
        return developerPermissions;
      default:
        return basePermissions;
    }
  }

  /**
   * Check if user owns the resource (for resource-level permissions)
   */
  public static ownsResource = (resourceIdField: string) =>
    (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
        });
        return;
      }

      const resourceId = req.params[resourceIdField] || req.body[resourceIdField];
      const userId = req.user._id.toString();

      // For now, only allow if resource belongs to user
      // In a real application, you might check ownership in the database
      if (resourceId !== userId && req.user.role !== 'admin') {
        res.status(403).json({
          error: 'Access denied',
          message: 'You can only access your own resources.',
        });
        return;
      }

      next();
    };

  /**
   * Get user's accessible roles (for UI role selection)
   */
  public static getAccessibleRoles(userRole: Role): Role[] {
    // Admins can create users with any role
    if (userRole === 'admin') {
      return ['admin', 'manager', 'developer'];
    }
    // Managers can create developers and other managers
    if (userRole === 'manager') {
      return ['manager', 'developer'];
    }
    // Developers can't create other users
    return [];
  }

  /**
   * Validate role transition (for role updates)
   */
  public static canAssignRole(assigningUserRole: Role, targetRole: Role): boolean {
    const accessibleRoles = this.getAccessibleRoles(assigningUserRole);
    return accessibleRoles.includes(targetRole);
  }

  /**
   * Get role display information
   */
  public static getRoleInfo(role: Role): {
    name: string;
    description: string;
    level: number;
    permissions: string[];
  } {
    const roleInfos = {
      developer: {
        name: 'Developer',
        description: 'Can review code, create comments, and manage personal projects',
        level: 1,
        permissions: ['Code review', 'Project management', 'Commenting'],
      },
      manager: {
        name: 'Manager',
        description: 'Can manage teams and projects, access analytics',
        level: 2,
        permissions: ['Team management', 'Project oversight', 'Analytics access'],
      },
      admin: {
        name: 'Administrator',
        description: 'Full system access including user management and security',
        level: 3,
        permissions: ['User management', 'System configuration', 'Security controls'],
      },
    };

    return roleInfos[role];
  }
}

// Export middleware functions for easier import
export const requireRole = RBACMiddleware.requireRole;
export const requireAnyRole = RBACMiddleware.requireAnyRole;
export const requireAdmin = RBACMiddleware.requireAdmin;
export const requireManager = RBACMiddleware.requireManager;
export const requireManagerOrAdmin = RBACMiddleware.requireManagerOrAdmin;
export const canPerformAction = RBACMiddleware.canPerformAction;
export const ownsResource = RBACMiddleware.ownsResource;
