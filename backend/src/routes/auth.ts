import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import User from '../models/User';
import { AuthMiddleware, AuthenticatedRequest, authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import database from '../config/database';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  role: z.enum(['admin', 'manager', 'developer']).optional().default('developer'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long').optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

// Register new user
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      res.status(400).json({
        error: 'Registration failed',
        message: 'User with this email already exists',
      });
    }

    // Create new user (password will be hashed by the pre-save hook)
    const newUser = new User({
      email: validatedData.email,
      password: validatedData.password,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      role: validatedData.role,
      isActive: true,
    });

    await newUser.save();

    // Generate tokens
    const accessToken = AuthMiddleware.generateAccessToken(newUser);
    const refreshToken = AuthMiddleware.generateRefreshToken(newUser);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        message: error.errors.map(e => e.message).join(', '),
      });
    }

    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration',
    });
  }
});

// Login user
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
    }

    // Check if account is active
    if (!user.isActive) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Account is deactivated',
      });
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate tokens
    const accessToken = AuthMiddleware.generateAccessToken(user);
    const refreshToken = AuthMiddleware.generateRefreshToken(user);

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        message: error.errors.map(e => e.message).join(', '),
      });
    }

    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login',
    });
  }
});

// Get current user profile
router.get('/profile', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
      });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Profile fetch failed',
      message: 'An error occurred while fetching profile',
    });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to update your profile',
      });
    }

    const validatedData = updateProfileSchema.parse(req.body);

    // Update fields
    if (validatedData.firstName) user.firstName = validatedData.firstName;
    if (validatedData.lastName) user.lastName = validatedData.lastName;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        message: error.errors.map(e => e.message).join(', '),
      });
    }

    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Profile update failed',
      message: 'An error occurred while updating profile',
    });
  }
});

// Change password
router.put('/change-password', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to change your password',
      });
    }

    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    // Verify current password
    const isValidCurrentPassword = await user.comparePassword(currentPassword);
    if (!isValidCurrentPassword) {
      res.status(400).json({
        error: 'Invalid current password',
        message: 'Current password is incorrect',
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        message: error.errors.map(e => e.message).join(', '),
      });
    }

    console.error('Password change error:', error);
    res.status(500).json({
      error: 'Password change failed',
      message: 'An error occurred while changing password',
    });
  }
});

// Admin: Get all users
router.get('/users', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({
      error: 'Users fetch failed',
      message: 'An error occurred while fetching users',
    });
  }
});

// Admin: Get user by ID
router.get('/users/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'User with the specified ID does not exist',
      });
    }

    res.json({ user });
  } catch (error) {
    if (error instanceof Error && error.name === 'CastError') {
      res.status(400).json({
        error: 'Invalid user ID',
        message: 'The provided user ID is not valid',
      });
    }

    console.error('User fetch error:', error);
    res.status(500).json({
      error: 'User fetch failed',
      message: 'An error occurred while fetching user',
    });
  }
});

// Admin: Update user
router.put('/users/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'User with the specified ID does not exist',
      });
    }

    // Allow updating specific fields
    const allowedFields = ['firstName', 'lastName', 'role', 'isActive'];
    const updates: any = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    Object.assign(user, updates);
    await user.save();

    // Return user without password
    const updatedUser = await User.findById(user._id).select('-password');

    res.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'CastError') {
      res.status(400).json({
        error: 'Invalid user ID',
        message: 'The provided user ID is not valid',
      });
    }

    console.error('User update error:', error);
    res.status(500).json({
      error: 'User update failed',
      message: 'An error occurred while updating user',
    });
  }
});

// Admin: Delete user
router.delete('/users/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'User with the specified ID does not exist',
      });
    }

    // Prevent deleting self
    if (req.user && user._id.toString() === req.user._id.toString()) {
      res.status(400).json({
        error: 'Invalid operation',
        message: 'You cannot delete your own account',
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'CastError') {
      res.status(400).json({
        error: 'Invalid user ID',
        message: 'The provided user ID is not valid',
      });
    }

    console.error('User delete error:', error);
    res.status(500).json({
      error: 'User delete failed',
      message: 'An error occurred while deleting user',
    });
  }
});

// Health check endpoint
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    // Check database connection
    const isDbHealthy = await database.healthCheck();

    if (!isDbHealthy) {
      res.status(503).json({
        status: 'unhealthy',
        database: 'disconnected',
      });
    }

    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
    });
  }
});

export default router;
