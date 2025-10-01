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
      let frontendUrl = process.env.FRONTEND_URL || 'https://www.rain.club';
      
      // Clean the URL
      frontendUrl = frontendUrl.trim().replace(/['"]/g, '');
      if (!frontendUrl.startsWith('http')) {
        frontendUrl = `https://${frontendUrl}`;
      }
      
      const finalRedirectUrl = `${frontendUrl}?error=${error}`;
      return res.redirect(finalRedirectUrl);
    }

    if (!code) {
      let frontendUrl = process.env.FRONTEND_URL || 'https://www.rain.club';
      
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
    let frontendUrl = process.env.FRONTEND_URL || 'https://www.rain.club';
    
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
    
    // Redirect to frontend with error
    let frontendUrl = process.env.FRONTEND_URL || 'https://www.rain.club';
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

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const user = await FirebaseService.getUserById(decoded.userId);

    if (!user) {
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
    
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;