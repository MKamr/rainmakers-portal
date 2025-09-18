import express, { Request, Response } from 'express';
import { FirebaseService } from '../services/firebaseService';
// AuthRequest is now available globally through Express namespace

const router = express.Router();

// Get user profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const user = await FirebaseService.getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      discordId: user.discordId,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isAdmin: user.isAdmin,
      isWhitelisted: user.isWhitelisted,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user profile
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const { username, email } = req.body;
    
    const updates: any = {};
    if (username) updates.username = username;
    if (email) updates.email = email;

    const updatedUser = await FirebaseService.updateUser(req.user!.id, updates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: updatedUser.id,
      discordId: updatedUser.discordId,
      username: updatedUser.username,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      isAdmin: updatedUser.isAdmin,
      isWhitelisted: updatedUser.isWhitelisted,
      updatedAt: updatedUser.updatedAt
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

export default router;