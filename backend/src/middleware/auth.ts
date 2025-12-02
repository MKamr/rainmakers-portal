import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { FirebaseService } from '../services/firebaseService';
import { canAccessPortal } from '../utils/subscriptionChecker';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    discordId?: string; // Make optional
    username: string;
    email: string;
    isAdmin: boolean;
    isWhitelisted: boolean;
    hasManualSubscription?: boolean;
  };
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        discordId?: string; // Make optional
        username: string;
        email: string;
        isAdmin: boolean;
        isWhitelisted: boolean;
        hasManualSubscription?: boolean;
      };
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Verify user still exists
    const user = await FirebaseService.getUserById(decoded.userId);

    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }

    // Admins bypass subscription checks
    if (!user.isAdmin) {
      // Allow users in onboarding to bypass subscription check
      // Users in onboarding (no password or no Discord) are completing setup after payment
      const isInOnboarding = !user.passwordHash || !user.discordId || (user.onboardingStep && user.onboardingStep < 5);
      
      if (isInOnboarding) {
        // User is in onboarding, allow access to complete setup
        // They've already paid, just need to complete account setup
      } else if (user.hasManualSubscription) {
        // User has manual subscription access, allow access
      } else {
        // Check Stripe subscription status for non-admin users
        const subscription = user.subscriptionId 
          ? await FirebaseService.getSubscriptionById(user.subscriptionId)
          : await FirebaseService.getSubscriptionByUserId(user.id);

        if (!canAccessPortal(subscription)) {
          return res.status(403).json({ 
            error: 'Subscription required',
            message: 'Your subscription has expired. Please renew to continue accessing the portal.'
          });
        }
      }
    }

    req.user = {
      id: user.id,
      discordId: user.discordId,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      isWhitelisted: user.isWhitelisted,
      hasManualSubscription: user.hasManualSubscription || false
    };

    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Middleware to check if user has completed setup (password + Discord)
 * Returns specific error indicating what's missing
 */
export const checkSetupComplete = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await FirebaseService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const missingItems = [];
    if (!user.passwordHash) missingItems.push('password');
    if (!user.discordId) missingItems.push('discord');

    if (missingItems.length > 0) {
      return res.status(403).json({
        error: 'Setup incomplete',
        message: 'Please complete your account setup to access this resource.',
        missingItems,
        needsPassword: !user.passwordHash,
        needsDiscord: !user.discordId
      });
    }

    next();
  } catch (error) {
    console.error('Setup check error:', error);
    return res.status(500).json({ error: 'Failed to verify setup completion' });
  }
};
