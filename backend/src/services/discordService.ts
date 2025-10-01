import axios from 'axios';
import { FirebaseService, User } from './firebaseService';

export interface DiscordUser {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
}

export class DiscordService {
  private static readonly DISCORD_API_BASE = 'https://discord.com/api/v10';

  static async exchangeCodeForToken(code: string): Promise<string> {
    const params = new URLSearchParams();
    params.append('client_id', process.env.DISCORD_CLIENT_ID || '');
    params.append('client_secret', process.env.DISCORD_CLIENT_SECRET || '');
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', process.env.DISCORD_REDIRECT_URI || '');

    const response = await axios.post(`${this.DISCORD_API_BASE}/oauth2/token`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.access_token;
  }

  static async getUserInfo(accessToken: string): Promise<DiscordUser> {
    const response = await axios.get(`${this.DISCORD_API_BASE}/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return {
      id: response.data.id,
      username: response.data.username,
      email: response.data.email,
      avatar: response.data.avatar ? 
        `https://cdn.discordapp.com/avatars/${response.data.id}/${response.data.avatar}.png` : 
        null
    };
  }

  static async findOrCreateUser(discordUser: DiscordUser): Promise<User> {
    let user = await FirebaseService.getUserByDiscordId(discordUser.id);

    if (!user) {
      // Check if user is in auto-access list
      const autoAccessUser = await FirebaseService.getDiscordAutoAccessUserByUsername(discordUser.username);
      const isAutoAccess = !!autoAccessUser;

      console.log(`🔍 [DISCORD] User ${discordUser.username} auto-access check:`, isAutoAccess);

      // Create user data without undefined values
      const userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
        discordId: discordUser.id,
        username: discordUser.username,
        email: discordUser.email,
        isWhitelisted: isAutoAccess, // Auto-whitelist if in auto-access list
        isAdmin: false
      };

      // Only add avatar if it exists
      if (discordUser.avatar) {
        userData.avatar = discordUser.avatar;
      }

      user = await FirebaseService.createUser(userData);
      
      if (isAutoAccess) {
        console.log(`✅ [DISCORD] User ${discordUser.username} automatically granted access via auto-access list`);
      }
    } else {
      // Update user info - only update fields that have values
      const updateData: Partial<User> = {
        username: discordUser.username,
        email: discordUser.email
      };

      // Only add avatar if it exists
      if (discordUser.avatar) {
        updateData.avatar = discordUser.avatar;
      }

      user = await FirebaseService.updateUser(user.id, updateData) || user;
    }

    return user;
  }
}