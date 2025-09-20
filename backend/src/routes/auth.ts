import express from 'express';
import jwt from 'jsonwebtoken';
import { DiscordService } from '../services/discordService';
import { FirebaseService } from '../services/firebaseService';

const router = express.Router();

// Discord OAuth callback (GET route for browser redirect)
router.get('/discord/callback', async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      console.error('Discord OAuth error:', error);
      let frontendUrl = process.env.FRONTEND_URL || 'https://rainmakers-portal-frontend.vercel.app';
      
      // Clean the URL
      frontendUrl = frontendUrl.trim().replace(/['"]/g, '');
      if (!frontendUrl.startsWith('http')) {
        frontendUrl = `https://${frontendUrl}`;
      }
      
      const finalRedirectUrl = `${frontendUrl}?error=${error}`;
      return res.redirect(finalRedirectUrl);
    }

    if (!code) {
      console.error('No code provided in Discord callback');
      let frontendUrl = process.env.FRONTEND_URL || 'https://rainmakers-portal-frontend.vercel.app';
      
      frontendUrl = frontendUrl.trim().replace(/['"]/g, '');
      if (!frontendUrl.startsWith('http')) {
        frontendUrl = `https://${frontendUrl}`;
      }
      
      const finalRedirectUrl = `${frontendUrl}?error=no_code`;
      return res.redirect(finalRedirectUrl);
    }

    // Exchange code for access token
    const accessToken = await DiscordService.exchangeCodeForToken(code as string);
    
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

    // Redirect to frontend with token
    let frontendUrl = process.env.FRONTEND_URL || 'https://rainmakers-portal-frontend.vercel.app';
    
    frontendUrl = frontendUrl.trim().replace(/['"]/g, '');
    if (!frontendUrl.startsWith('http')) {
      frontendUrl = `https://${frontendUrl}`;
    }
    
    const finalRedirectUrl = `${frontendUrl}?token=${token}&user=${encodeURIComponent(JSON.stringify({
      id: user.id,
      discordId: user.discordId,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isAdmin: user.isWhitelisted,
      isWhitelisted: user.isWhitelisted
    }))}`;
    
    res.redirect(finalRedirectUrl);
  } catch (error) {
    console.error('Discord auth error:', error);
    
    // Redirect to frontend with error
    let frontendUrl = process.env.FRONTEND_URL || 'https://rainmakers-portal-frontend.vercel.app';
    frontendUrl = frontendUrl.trim().replace(/['"]/g, '');
    if (!frontendUrl.startsWith('http')) {
      frontendUrl = `https://${frontendUrl}`;
    }
    
    const errorRedirectUrl = `${frontendUrl}?error=auth_failed`;
    res.redirect(errorRedirectUrl);
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
    console.log('=== /auth/me DEBUG ===');
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    
    const authHeader = req.headers['authorization'];
    console.log('Auth header:', authHeader);
    
    const token = authHeader && authHeader.split(' ')[1];
    console.log('Token exists:', !!token);

    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ error: 'Access token required' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not set in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    console.log('Verifying JWT token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    console.log('Decoded token:', decoded);

    console.log('Getting user from Firebase...');
    const user = await FirebaseService.getUserById(decoded.userId);
    console.log('User from Firebase:', user);

    if (!user) {
      console.log('User not found in Firebase');
      return res.status(404).json({ error: 'User not found' });
    }

    const responseData = {
      id: user.id,
      discordId: user.discordId,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isAdmin: user.isAdmin,
      isWhitelisted: user.isWhitelisted
    };
    
    console.log('Sending response:', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Get user error:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;