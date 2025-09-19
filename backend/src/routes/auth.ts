import express from 'express';
import jwt from 'jsonwebtoken';
import { DiscordService } from '../services/discordService';
import { FirebaseService } from '../services/firebaseService';

const router = express.Router();

// Discord OAuth callback (GET route for browser redirect)
router.get('/discord/callback', async (req, res) => {
  try {
    console.log('Discord callback received:', req.query);
    const { code, error } = req.query;

    if (error) {
      console.error('Discord OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'https://rainmakers-portal-frontend-production.up.railway.app'}?error=${error}`);
    }

    if (!code) {
      console.error('No code provided in Discord callback');
      return res.redirect(`${process.env.FRONTEND_URL || 'https://rainmakers-portal-frontend-production.up.railway.app'}?error=no_code`);
    }

    console.log('Exchanging code for token...');
    // Exchange code for access token
    const accessToken = await DiscordService.exchangeCodeForToken(code as string);
    console.log('Access token received');
    
    // Get user info from Discord
    console.log('Getting user info from Discord...');
    const discordUser = await DiscordService.getUserInfo(accessToken);
    console.log('Discord user info:', discordUser);
    
    // Find or create user in Firebase
    console.log('Finding or creating user in Firebase...');
    const user = await DiscordService.findOrCreateUser(discordUser);
    console.log('User found/created:', user);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, discordId: user.discordId },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'https://rainmakers-portal-frontend-production.up.railway.app';
    console.log('Redirecting to frontend with token');
    res.redirect(`${frontendUrl}?token=${token}&user=${encodeURIComponent(JSON.stringify({
      id: user.id,
      discordId: user.discordId,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isAdmin: user.isWhitelisted,
      isWhitelisted: user.isWhitelisted
    }))}`);
  } catch (error) {
    console.error('Discord auth error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'https://rainmakers-portal-frontend-production.up.railway.app';
    res.redirect(`${frontendUrl}?error=auth_failed`);
  }
});

// Discord OAuth callback (POST route for API calls)
router.post('/discord', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    // Exchange code for access token
    const accessToken = await DiscordService.exchangeCodeForToken(code);
    
    // Get user info from Discord
    const discordUser = await DiscordService.getUserInfo(accessToken);
    
    // Find or create user in Firebase
    const user = await DiscordService.findOrCreateUser(discordUser);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, discordId: user.discordId },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        discordId: user.discordId,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
        isWhitelisted: user.isWhitelisted
      }
    });
  } catch (error) {
    console.error('Discord auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await FirebaseService.getUserById(decoded.userId);

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
      isWhitelisted: user.isWhitelisted
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
