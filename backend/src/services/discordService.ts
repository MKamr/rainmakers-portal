import axios from 'axios';
import { FirebaseService, User } from './firebaseService';

export interface DiscordUser {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
}

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export class DiscordService {
  private static readonly DISCORD_API_BASE = 'https://discord.com/api/v10';

  static async exchangeCodeForToken(code: string, redirectUri?: string): Promise<DiscordTokenResponse> {
    // Use provided redirectUri or fall back to environment variable
    // The redirectUri should be constructed in the auth route based on the request
    let finalRedirectUri = redirectUri || process.env.DISCORD_REDIRECT_URI || '';
    
    // If no redirectUri provided and no env var, construct from NODE_ENV
    // This is a fallback - the auth route should always provide the redirectUri
    if (!finalRedirectUri) {
      if (process.env.NODE_ENV === 'development') {
        finalRedirectUri = 'http://localhost:3001/auth/discord/callback';
      } else {
        // Production fallback - should be set via env var or provided by auth route
        finalRedirectUri = 'https://rain.club/auth/discord/callback';
      }
    }

    // Get and validate client credentials (trim whitespace and remove quotes)
    const clientId = (process.env.DISCORD_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
    const clientSecret = (process.env.DISCORD_CLIENT_SECRET || '').trim().replace(/^["']|["']$/g, '');

    // Validate credentials
    if (!clientId || !clientSecret) {
      const missing = [];
      if (!clientId) missing.push('DISCORD_CLIENT_ID');
      if (!clientSecret) missing.push('DISCORD_CLIENT_SECRET');
      throw new Error(`Discord OAuth credentials missing: ${missing.join(', ')}. Please check your backend/.env file.`);
    }

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', finalRedirectUri);

    try {
    const response = await axios.post(`${this.DISCORD_API_BASE}/oauth2/token`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

      // Log the raw response to see what Discord actually returns

      // Log the actual access_token value (first 50 chars for security)
      if (response.data?.access_token) {
        const token = response.data.access_token;



                // Check if token starts with base64-encoded client ID
        const clientIdBase64 = Buffer.from(process.env.DISCORD_CLIENT_ID || '').toString('base64');
        if (token.startsWith(clientIdBase64.substring(0, 20))) {
                            }
      } else {

      }

      const tokenData = response.data;
      
      // Debug logging to see what Discord actually returns


      // Validate token response structure
      if (!tokenData.access_token) {

        throw new Error('Discord OAuth response missing access_token');
      }
      
      // Verify guilds.join scope is present
      const scopes = tokenData.scope?.split(' ') || [];

      // Validate token format - Discord OAuth tokens are typically 70+ character random strings
      // They should NOT be JWT tokens (which have dots and are base64 encoded)
      const token = tokenData.access_token;
      const isJWT = token.includes('.') && token.split('.').length === 3;
      const startsWithClientId = token.startsWith('MTQxMzY1MDY0NjU1NjQ3') || token.startsWith('1413650646556479490');
      
      if (token.length < 50) {
                              }
      
      if (isJWT) {

                      }
      
      if (startsWithClientId) {

                // Don't throw - let's see if Discord accepts it despite the format
        // The API call will reveal if it's actually invalid
      }
      
      if (!scopes.includes('guilds.join')) {
                                        // Still return the token, but log the warning
      } else {
              }

      return tokenData;
    } catch (error: any) {
      const errorData = error.response?.data || {};
      const errorMessage = errorData.error || error.message;

      // Provide more helpful error messages
      if (errorMessage === 'invalid_client') {
        const errorMsg = [
          'Discord OAuth authentication failed: Invalid client credentials.',
          '',
          'This error means Discord is rejecting your Client ID or Client Secret.',
          'Most common causes:',
          '  1. Client Secret was reset in Discord Developer Portal',
          '  2. Client Secret in backend/.env does not match Discord Developer Portal',
          '  3. Client ID is incorrect',
          '',
          'How to fix:',
          '  1. Go to: https://discord.com/developers/applications',
          `  2. Select your application (Client ID: ${clientId})`,
          '  3. Go to OAuth2 → General',
          '  4. Check the Client Secret:',
          '     - If you see "Reset Secret" button, the secret has been reset',
          '     - Click "Reset Secret" to generate a new one',
          '     - Copy the new secret immediately (shown only once)',
          '  5. Update backend/.env with the new Client Secret:',
          '     DISCORD_CLIENT_SECRET=new_secret_here',
          '     (Make sure there are NO quotes around the value)',
          '  6. Restart your backend server',
          '',
          `Current Client ID: ${clientId}`,
          `Current Client Secret: ${clientSecret ? `${clientSecret.substring(0, 8)}...` : 'missing'}`
        ].join('\n');
        throw new Error(errorMsg);
      }
      
      if (errorMessage === 'invalid_grant') {
        throw new Error(
          `Invalid authorization code or redirect URI mismatch. ` +
          `Expected redirect URI: ${finalRedirectUri}. ` +
          `Make sure this URI is registered in Discord Developer Portal and matches exactly what the frontend sent.`
        );
      }
      
      throw error;
    }
  }

  static async getUserInfo(accessToken: string): Promise<DiscordUser> {
    try {
    const response = await axios.get(`${this.DISCORD_API_BASE}/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

      // Log token validity check

    return {
      id: response.data.id,
      username: response.data.username,
      email: response.data.email,
      avatar: response.data.avatar ? 
        `https://cdn.discordapp.com/avatars/${response.data.id}/${response.data.avatar}.png` : 
        null
    };
    } catch (error: any) {
            if (error.response) {
                        if (error.response.status === 401) {
                  }
      }
      throw error;
    }
  }

  /**
   * Verify bot can access the guild (checks if bot is in server and has access)
   * @returns true if bot can access guild, false otherwise
   */
  static async verifyBotAccessToGuild(): Promise<boolean> {
    const guildId = process.env.DISCORD_GUILD_ID || '';
    const botToken = process.env.DISCORD_BOT_TOKEN || '';

    if (!guildId || !botToken) {
      return false;
    }

    try {
      // Discord API: GET /guilds/{guild.id} - Get guild info
      // This will return 404 if bot is not in the guild or guild doesn't exist
      const response = await axios.get(
        `${this.DISCORD_API_BASE}/guilds/${guildId}`,
        {
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json'
          },
          validateStatus: (status) => [200, 404].includes(status)
        }
      );

      if (response.status === 200) {

        return true;
      }

      return false;
    } catch (error: any) {
      if (error.response?.status === 404) {
                        return false;
      }
            return false;
    }
  }

  /**
   * Check if a user is already in the Discord server
   * @param discordUserId - The Discord user ID to check
   * @returns true if user is in server, false otherwise
   */
  static async isUserInGuild(discordUserId: string): Promise<boolean> {
    const guildId = process.env.DISCORD_GUILD_ID || '';
    const botToken = process.env.DISCORD_BOT_TOKEN || '';

    if (!guildId) {
      return false;
    }

    // If no bot token, can't check - assume not in server
    if (!botToken) {
      return false;
    }

    try {
      // Discord API: GET /guilds/{guild.id}/members/{user.id}
      const response = await axios.get(
        `${this.DISCORD_API_BASE}/guilds/${guildId}/members/${discordUserId}`,
        {
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json'
          },
          validateStatus: (status) => [200, 404].includes(status) // 404 means user not in server
        }
      );

      if (response.status === 200) {
                return true;
      }

      return false;
    } catch (error: any) {
      if (error.response?.status === 404) {
        if (error.response?.data?.code === 10004) {
          // 10004 = Unknown Guild - bot not in server
                  }
        // User not in server (or guild unknown)
        return false;
      }
            return false;
    }
  }

  /**
   * Add user to Discord server using OAuth token (with guilds.join scope) + Bot token
   * 
   * IMPORTANT: Discord API requires BOT token in Authorization header, even when using OAuth!
   * The `guilds.join` scope allows you to pass the user's OAuth token in the request body,
   * but the Authorization header MUST be a Bot token.
   * 
   * @param discordUserId - The Discord user ID to add
   * @param userAccessToken - The user's OAuth access token (must have guilds.join scope) - passed in body
   * @param roleId - Optional role ID to assign when adding the user (can assign role in same API call)
   * @returns true if user was added or already in server, false otherwise
   */
  static async addUserToGuild(discordUserId: string, userAccessToken: string, roleId?: string): Promise<boolean> {
    const guildId = process.env.DISCORD_GUILD_ID || '';
    const botToken = process.env.DISCORD_BOT_TOKEN || '';

    if (!guildId) {
            return false;
    }

    // First check if user is already in server
    const alreadyInServer = await this.isUserInGuild(discordUserId);
    if (alreadyInServer) {
            return true;
    }

    // Bot token is REQUIRED - Discord API needs it in Authorization header
    if (!botToken) {
                        return false;
    }

    // Verify bot has access to the guild before attempting to add user
    const botHasAccess = await this.verifyBotAccessToGuild();
    if (!botHasAccess) {
                                                return false;
    }
    
    // Verify bot has required permissions by checking bot's member info
    try {
      const botMemberResponse = await axios.get(
        `${this.DISCORD_API_BASE}/guilds/${guildId}/members/@me`,
        {
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json'
          },
          validateStatus: (status) => status === 200
        }
      );
      
      // Get bot's roles and permissions
      const botRoles = botMemberResponse.data.roles || [];

      // Check if bot has required permissions via GET /guilds/{guild.id}
      const guildResponse = await axios.get(
        `${this.DISCORD_API_BASE}/guilds/${guildId}`,
        {
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // The guild response doesn't include bot permissions directly, but we can check if bot is admin
      // For more detailed permission checking, we'd need to fetch role permissions
          } catch (permError: any) {

      // Continue anyway - the actual API call will reveal permission issues
    }

    // If no OAuth token provided, we cannot add the user
    // Discord API requires user's OAuth token (with guilds.join scope) in request body
    // Even though Bot token is required in header, the user's OAuth token is still needed in body
    if (!userAccessToken || userAccessToken.trim() === '') {

                  return false;
    }

    // Verify token has guilds.join scope by checking token info
    try {
      const tokenInfo = await axios.get(`${this.DISCORD_API_BASE}/oauth2/@me`, {
        headers: {
          Authorization: `Bearer ${userAccessToken}`
        }
      });
      
      const scopes = tokenInfo.data.scopes || [];
                  if (!scopes.includes('guilds.join')) {
                                        return false;
      } else {

      }
    } catch (error: any) {
            if (error.response) {
                      }
      // Continue anyway - the API call will reveal if scope is missing
      // This check might fail if the token endpoint is not available, but we'll still try
    }

    try {
      // Discord API: PUT /guilds/{guild.id}/members/{user.id}
      // According to Discord API docs:
      // - Authorization header MUST be Bot token (required for this endpoint)
      // - access_token in body can be user's OAuth token (with guilds.join scope) - this allows adding the user
      // The guilds.join scope gives permission to add users, but Bot token is still required in header



      // Validate token format - Discord OAuth tokens should be long random strings
      // They should NOT start with client ID or be too short
      if (userAccessToken && userAccessToken.length < 50) {

      }
      if (userAccessToken && userAccessToken.startsWith('MTQxMzY1MDY0NjU1NjQ3')) {
                      }
      
      // Build request body - include roles array if roleId is provided
      const requestBody: any = {
        access_token: userAccessToken // OAuth token with guilds.join scope goes in body
      };
      
      // Include roles array if roleId is provided (assigns role when adding user)
      const roleIdToAssign = roleId || process.env.DISCORD_PAID_MEMBER_ROLE_ID || '';
      if (roleIdToAssign) {
        requestBody.roles = [roleIdToAssign];
              }
      
      const response = await axios.put(
        `${this.DISCORD_API_BASE}/guilds/${guildId}/members/${discordUserId}`,
        requestBody,
        {
          headers: {
            Authorization: `Bot ${botToken}`, // REQUIRED: Bot token in header (not OAuth token!)
            'Content-Type': 'application/json'
          },
          validateStatus: (status) => [200, 201, 204].includes(status)
        }
      );

            // Verify user was actually added
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second for Discord to process
      const verified = await this.isUserInGuild(discordUserId);
      if (verified) {
                return true;
      } else {
        // Retry verification after another wait
                await new Promise(resolve => setTimeout(resolve, 1500)); // Wait another 1.5 seconds
        const retryVerified = await this.isUserInGuild(discordUserId);
        if (retryVerified) {

          return true;
        } else {
                    return false;
        }
      }
    } catch (error: any) {
      if (error.response?.status === 204) {
        // 204 No Content means user was added
        await new Promise(resolve => setTimeout(resolve, 1500));
        const verified = await this.isUserInGuild(discordUserId);
        if (verified) {
                    return true;
        }
                return false;
      }

      // Check for invalid OAuth token error (50025) - can occur with any status code
      if (error.response?.data?.code === 50025) {






        return false;
      }

      if (error.response?.status === 404) {
        // 404 Not Found - Guild not found or bot not in server
        if (error.response?.data?.code === 10004) {

                                                                                                            } else {
                                      }
        return false;
      }

      if (error.response?.status === 401 || error.response?.status === 403) {

                        if (error.response?.status === 401) {
                                      } else if (error.response?.status === 403) {

                              // Log the actual error response for more details
          if (error.response?.data) {

            if (error.response.data.code === 50013) {
                          } else if (error.response.data.code === 50001) {

            }
          }
        }
        
        return false;
      }

      if (error.response?.status === 400) {
        // 400 Bad Request usually means user is already in the server or invalid request
        if (error.response?.data?.message?.includes('already') || 
            error.response?.data?.code === 50004) {
                    return true; // User already in server is considered success
        }
                return false;
      }

            if (error.response) {
                      }
      return false;
    }
  }

  /**
   * Fallback method: Add user to Discord server using bot token
   * This is used if OAuth token method fails
   * 
   * IMPORTANT: Discord API requires both:
   * 1. Bot token in Authorization header
   * 2. User's OAuth token with guilds.join scope in body as access_token
   * 
   * Without the user's OAuth token, we cannot add them via API.
   * In this case, we can only log that user needs to join manually or via OAuth flow.
   */
  private static async addUserToGuildWithBot(discordUserId: string, userAccessToken: string): Promise<boolean> {
    const guildId = process.env.DISCORD_GUILD_ID || '';
    const botToken = process.env.DISCORD_BOT_TOKEN || '';

    if (!guildId || !botToken) {
      const missing: string[] = [];
      if (!guildId) missing.push('DISCORD_GUILD_ID');
      if (!botToken) missing.push('DISCORD_BOT_TOKEN');

                  if (!guildId)       if (!botToken)             return false;
    }

    // Without user's OAuth token, we cannot add them via Discord API
    // Discord requires the user's OAuth token (with guilds.join scope) in the request body
    if (!userAccessToken || userAccessToken.trim() === '') {

                  return false;
    }

    try {
            // Discord API: PUT /guilds/{guild.id}/members/{user.id}
      // This endpoint REQUIRES:
      // - Bot token in Authorization header
      // - User's OAuth token (with guilds.join scope) in body as access_token
      const response = await axios.put(
        `${this.DISCORD_API_BASE}/guilds/${guildId}/members/${discordUserId}`,
        {
          access_token: userAccessToken // REQUIRED: User's OAuth token with guilds.join scope
        },
        {
          headers: {
            Authorization: `Bot ${botToken}`, // REQUIRED: Bot token in header
            'Content-Type': 'application/json'
          },
          validateStatus: (status) => [200, 201, 204].includes(status)
        }
      );

            // Wait a moment for Discord to process
      await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds
      
      // Verify user was actually added
      const verified = await this.isUserInGuild(discordUserId);
      if (verified) {
                return true;
      } else {
        // Retry check once more after another short wait
                await new Promise(resolve => setTimeout(resolve, 1500)); // Wait another 1.5 seconds
        const retryVerified = await this.isUserInGuild(discordUserId);
        if (retryVerified) {

          return true;
        } else {
                              return false;
        }
      }
    } catch (error: any) {
      if (error.response?.status === 204) {
        // 204 No Content means user was added
        await new Promise(resolve => setTimeout(resolve, 1500));
        const verified = await this.isUserInGuild(discordUserId);
        if (verified) {
                    return true;
        }
                return false;
      }

      if (error.response?.status === 401 || error.response?.status === 403) {

                                                if (error.response?.data) {
                  }
        return false;
      }

      if (error.response?.status === 400) {
        if (error.response?.data?.message?.includes('already') || 
            error.response?.data?.code === 50004) {
                    return true;
        }
        
        // Check for Invalid Form Body error (50035) - usually means access_token is invalid/missing
        if (error.response?.data?.code === 50035) {

                    if (error.response?.data?.errors?.access_token) {
                      }
          return false;
        }
        
                return false;
      }

            if (error.response) {
                      }
      return false;
    }
  }

  /**
   * @deprecated Use addUserToGuild instead - it uses OAuth token without requiring bot token
   */
  static async ensureGuildMembership(discordUserId: string, userAccessToken: string): Promise<boolean> {
    return this.addUserToGuild(discordUserId, userAccessToken);
  }

  /**
   * Find user by Discord ID or email (does not create user)
   * This prevents duplicate users when:
   * 1. User pays first (may not have Discord ID)
   * 2. User then logs in via Discord OAuth (needs to find existing user)
   */
  static async findUser(discordUser: DiscordUser): Promise<User | null> {
    try {
      // First, search by Discord ID (most reliable)
      let user = await FirebaseService.getUserByDiscordId(discordUser.id);

      if (user) {
                // Update user info - preserve payment email, store Discord email separately
        const updateData: Partial<User> = {
          username: discordUser.username,
          discordId: discordUser.id
        };
        
        // Store Discord email separately if different from payment email
        if (discordUser.email) {
          if (user.email && user.email !== discordUser.email) {
            // Payment email exists and differs from Discord email - keep payment email, store Discord email separately
            updateData.discordEmail = discordUser.email;
                      } else if (!user.email) {
            // No payment email yet, use Discord email as primary
            updateData.email = discordUser.email;
          } else {
            // Emails match, just update discordEmail to be explicit
            updateData.discordEmail = discordUser.email;
          }
        }

        // Only add avatar if it exists
        if (discordUser.avatar) {
          updateData.avatar = discordUser.avatar;
        }

        return await FirebaseService.updateUser(user.id, updateData) || user;
      }
      
      // If not found by Discord ID, search by email (user might have paid first without Discord ID)
      if (!user && discordUser.email) {
        try {
          user = await FirebaseService.getUserByEmail(discordUser.email);
          if (user) {
                        // Update user with Discord ID if missing (link the accounts)
            // Preserve existing email as payment email, store Discord email separately
            const updateData: Partial<User> = {
              discordId: discordUser.id, // Link Discord ID to existing user
              username: discordUser.username,
              discordEmail: discordUser.email // Store Discord email separately
            };
            
            if (discordUser.avatar) {
              updateData.avatar = discordUser.avatar;
            }
            
            // Keep existing email as payment email (don't overwrite)
            // Discord email is already stored in discordEmail field above
            
                                    return await FirebaseService.updateUser(user.id, updateData) || user;
          }
        } catch (error) {
                    // Continue - user not found
        }
      }
      
      return null;
    } catch (error) {
      // User doesn't exist
            return null;
    }
  }

  /**
   * Create user in Firebase from Discord user info
   * Called after successful payment
   * Checks for existing user before creating to avoid duplicates
   */
  static async createUserFromDiscord(discordUser: DiscordUser): Promise<User> {
      // Check if user already exists by Discord ID
      let existingUser = await FirebaseService.getUserByDiscordId(discordUser.id);
      
      // If not found by Discord ID, check by email
      if (!existingUser && discordUser.email) {
        existingUser = await FirebaseService.getUserByEmail(discordUser.email);
      }
      
      // If user exists, update and return
      if (existingUser) {
                const updateData: Partial<User> = {
          username: discordUser.username,
        };
        
        // Update Discord ID if missing
        if (!existingUser.discordId) {
          updateData.discordId = discordUser.id;
        }
        
        // Update email if missing or different
        if (discordUser.email && (!existingUser.email || existingUser.email !== discordUser.email)) {
          updateData.email = discordUser.email;
        }
        
        // Only add avatar if it exists
        if (discordUser.avatar) {
          updateData.avatar = discordUser.avatar;
        }
        
        return await FirebaseService.updateUser(existingUser.id, updateData) || existingUser;
      }

      // Check if user is in auto-access list
      const autoAccessUser = await FirebaseService.getDiscordAutoAccessUserByUsername(discordUser.username);
      const isAutoAccess = !!autoAccessUser;

      // Create user data without undefined values
      const userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
        discordId: discordUser.id,
        username: discordUser.username,
        email: discordUser.email,
        isWhitelisted: isAutoAccess, // Auto-whitelist if in auto-access list
        isAdmin: false,
        termsAccepted: false,
        onboardingCompleted: false
      };

      // Only add avatar if it exists
      if (discordUser.avatar) {
        userData.avatar = discordUser.avatar;
      }

    const user = await FirebaseService.createUser(userData);
        return user;
  }
}