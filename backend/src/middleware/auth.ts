import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { FirebaseService } from '../services/firebaseService';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    discordId: string;
    username: string;
    email: string;
    isAdmin: boolean;
    isWhitelisted: boolean;
  };
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        discordId: string;
        username: string;
        email: string;
        isAdmin: boolean;
        isWhitelisted: boolean;
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
    
    // Verify user still exists and is whitelisted
    const user = await FirebaseService.getUserById(decoded.userId);

    if (!user || !user.isWhitelisted) {
      return res.status(403).json({ error: 'User not authorized' });
    }

    req.user = {
      id: user.id,
      discordId: user.discordId,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      isWhitelisted: user.isWhitelisted
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
