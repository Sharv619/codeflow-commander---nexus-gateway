import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
import User, { IUser } from '../models/User';

// Load environment variables
config();

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export class AuthMiddleware {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

  /**
   * Generate access token
   */
  public static generateAccessToken(user: IUser): string {
    const payload: JwtPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, this.JWT_SECRET as string, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'codeflow-backend',
      audience: 'codeflow-client',
    });
  }

  /**
   * Generate refresh token
   */
  public static generateRefreshToken(user: IUser): string {
    const payload = {
      userId: user._id.toString(),
      type: 'refresh',
    };

    return jwt.sign(payload, this.JWT_SECRET as any, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
      issuer: 'codeflow-backend',
      audience: 'codeflow-client',
    });
  }

  /**
   * Verify JWT token
   */
  public static verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'codeflow-backend',
        audience: 'codeflow-client',
      }) as JwtPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Authentication middleware - verifies JWT token and attaches user to request
   */
  public static authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (!token) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided. Please include Bearer token in Authorization header.',
        });
        return;
      }

      // Verify the token
      const decoded = this.verifyToken(token);

      // Get user from database
      const user = await User.findById(decoded.userId);
      if (!user) {
        res.status(401).json({
          error: 'Authentication failed',
          message: 'User not found.',
        });
        return;
      }

      if (!user.isActive) {
        res.status(401).json({
          error: 'Authentication failed',
          message: 'Account is deactivated.',
        });
        return;
      }

      // Attach user to request object
      req.user = user;

      // Update last login
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });

      next();
    } catch (error) {
      console.error('Authentication error:', error);

      if (error instanceof Error) {
        if (error.message === 'Token has expired') {
          res.status(401).json({
            error: 'Token expired',
            message: 'Your session has expired. Please login again.',
          });
          return;
        } else if (error.message === 'Invalid token') {
          res.status(401).json({
            error: 'Invalid token',
            message: 'The provided token is invalid.',
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Authentication error',
        message: 'An error occurred during authentication.',
      });
    }
  };

  /**
   * Optional authentication middleware - doesn't fail if no token provided
   */
  public static optionalAuthenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (!token) {
        // No token provided, continue without authentication
        return next();
      }

      // Verify the token
      const decoded = this.verifyToken(token);

      // Get user from database
      const user = await User.findById(decoded.userId);
      if (user && user.isActive) {
        req.user = user;

        // Update last login
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });
      }

      next();
    } catch (error) {
      // For optional auth, we ignore auth errors and continue
      console.warn('Optional authentication failed:', error instanceof Error ? error.message : 'Unknown error');
      next();
    }
  };

  /**
   * Admin-only middleware
   */
  public static requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be authenticated to access this resource.',
      });
      return;
    }

    if (req.user.role !== 'admin') {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Admin access required.',
      });
      return;
    }

    next();
  };

  /**
   * Manager or Admin middleware
   */
  public static requireManagerOrAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be authenticated to access this resource.',
      });
      return;
    }

    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Manager or Admin access required.',
      });
      return;
    }

    next();
  };

  /**
   * Get user from request safely
   */
  public static getUserFromRequest(req: AuthenticatedRequest): IUser | null {
    return req.user || null;
  }

  /**
   * Validate JWT secret is set
   */
  public static validateJwtSecret(): boolean {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'your-super-secret-jwt-key-change-in-production') {
      console.error('❌ JWT_SECRET not properly configured!');
      console.error('Please set JWT_SECRET environment variable to a secure random string.');
      return false;
    }

    if (secret.length < 32) {
      console.warn('⚠️  JWT_SECRET is shorter than recommended (32+ characters)');
    }

    return true;
  }
}

// Export middleware functions for easier import
export const authenticate = AuthMiddleware.authenticate;
export const optionalAuthenticate = AuthMiddleware.optionalAuthenticate;
export const requireAdmin = AuthMiddleware.requireAdmin;
export const requireManagerOrAdmin = AuthMiddleware.requireManagerOrAdmin;
