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

    console.log('DiscordService: Exchanging code for token', {
      hasCode: !!code,
      redirectUri: finalRedirectUri,
      clientId: clientId ? `${clientId.substring(0, 8)}...` : 'missing',
      clientIdLength: clientId.length,
      clientSecretLength: clientSecret.length
    });

    try {
    const response = await axios.post(`${this.DISCORD_API_BASE}/oauth2/token`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

      // Log the raw response to see what Discord actually returns
      console.log('DiscordService: Raw token exchange response status:', response.status);
      console.log('DiscordService: Raw token exchange response keys:', Object.keys(response.data || {}));
      
      // Log the actual access_token value (first 50 chars for security)
      if (response.data?.access_token) {
        const token = response.data.access_token;
        console.log('DiscordService: Raw access_token from Discord:');
        console.log('DiscordService:   - Length:', token.length);
        console.log('DiscordService:   - First 50 chars:', token.substring(0, 50));
        console.log('DiscordService:   - Last 10 chars:', token.substring(token.length - 10));
        console.log('DiscordService:   - Contains dots:', token.includes('.'));
        console.log('DiscordService:   - Token type from response:', response.data.token_type);
        
        // Check if token starts with base64-encoded client ID
        const clientIdBase64 = Buffer.from(process.env.DISCORD_CLIENT_ID || '').toString('base64');
        if (token.startsWith(clientIdBase64.substring(0, 20))) {
          console.error('DiscordService: ⚠️ Token appears to start with base64-encoded client ID!');
          console.error('DiscordService: This is unusual - Discord tokens should be random strings');
        }
      } else {
        console.error('DiscordService: ❌ NO access_token in response!');
        console.error('DiscordService: Full response:', JSON.stringify(response.data, null, 2));
      }
      
      console.log('DiscordService: Full token exchange response (safely logged):', {
        hasAccessToken: !!response.data?.access_token,
        accessTokenLength: response.data?.access_token?.length || 0,
        tokenType: response.data?.token_type,
        expiresIn: response.data?.expires_in,
        scope: response.data?.scope,
        hasRefreshToken: !!response.data?.refresh_token
      });

      const tokenData = response.data;
      
      // Debug logging to see what Discord actually returns
      console.log('DiscordService: FULL token exchange response:', JSON.stringify(response.data, null, 2));
      console.log('DiscordService: access_token value:', response.data?.access_token);
      console.log('DiscordService: access_token type:', typeof response.data?.access_token);
      console.log('DiscordService: access_token length:', response.data?.access_token?.length);
      console.log('DiscordService: All response keys:', Object.keys(response.data || {}));
      
      // Validate token response structure
      if (!tokenData.access_token) {
        console.error('DiscordService: ❌ CRITICAL - No access_token in response!');
        console.error('DiscordService: Response data:', JSON.stringify(tokenData, null, 2));
        throw new Error('Discord OAuth response missing access_token');
      }
      
      // Verify guilds.join scope is present
      const scopes = tokenData.scope?.split(' ') || [];
      console.log('DiscordService: Token exchange successful');
      console.log('DiscordService: Granted scopes from token exchange:', scopes);
      console.log('DiscordService: Token type:', tokenData.token_type);
      console.log('DiscordService: Expires in:', tokenData.expires_in, 'seconds');
      console.log('DiscordService: Access token length:', tokenData.access_token?.length || 0);
      console.log('DiscordService: Access token preview (first 50 chars):', tokenData.access_token ? `${tokenData.access_token.substring(0, 50)}...` : 'missing');
      
      // Validate token format - Discord OAuth tokens are typically 70+ character random strings
      // They should NOT be JWT tokens (which have dots and are base64 encoded)
      const token = tokenData.access_token;
      const isJWT = token.includes('.') && token.split('.').length === 3;
      const startsWithClientId = token.startsWith('MTQxMzY1MDY0NjU1NjQ3') || token.startsWith('1413650646556479490');
      
      if (token.length < 50) {
        console.error('DiscordService: ⚠️ WARNING - Access token seems too short!');
        console.error('DiscordService: Token length:', token.length);
        console.error('DiscordService: Expected length: 70+ characters');
      }
      
      if (isJWT) {
        console.error('DiscordService: ⚠️ WARNING - Token appears to be a JWT (has dots)!');
        console.error('DiscordService: Discord OAuth access tokens are NOT JWTs - they are random strings');
        console.error('DiscordService: This suggests the wrong token is being used');
      }
      
      if (startsWithClientId) {
        console.error('DiscordService: ⚠️ WARNING - Token starts with client ID!');
        console.error('DiscordService: This is unusual - Discord tokens are typically random strings');
        console.error('DiscordService: However, Discord API returned this token, so it might be valid');
        console.error('DiscordService: Token preview:', token.substring(0, 50));
        console.error('DiscordService: Will attempt to use token, but it may be rejected by Discord API');
        // Don't throw - let's see if Discord accepts it despite the format
        // The API call will reveal if it's actually invalid
      }
      
      if (!scopes.includes('guilds.join')) {
        console.error('DiscordService: ⚠️ WARNING - guilds.join scope not granted!');
        console.error('DiscordService: Granted scopes:', scopes);
        console.error('DiscordService: User may need to re-authorize with prompt=consent');
        console.error('DiscordService: This will prevent adding user to Discord server');
        // Still return the token, but log the warning
      } else {
        console.log('DiscordService: ✅ guilds.join scope verified in token exchange');
      }

      return tokenData;
    } catch (error: any) {
      const errorData = error.response?.data || {};
      const errorMessage = errorData.error || error.message;
      
      console.error('DiscordService: Failed to exchange code for token', {
        error: errorMessage,
        errorDescription: errorData.error_description,
        status: error.response?.status,
        redirectUri: finalRedirectUri,
        clientId: clientId ? `${clientId.substring(0, 8)}...` : 'missing',
        clientIdLength: clientId.length,
        clientSecretLength: clientSecret.length
      });
      
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
      console.log('DiscordService.getUserInfo: ✅ Token is valid (able to fetch user info)');

    return {
      id: response.data.id,
      username: response.data.username,
      email: response.data.email,
      avatar: response.data.avatar ? 
        `https://cdn.discordapp.com/avatars/${response.data.id}/${response.data.avatar}.png` : 
        null
    };
    } catch (error: any) {
      console.error('DiscordService.getUserInfo: ❌ Failed to fetch user info with token');
      if (error.response) {
        console.error('DiscordService.getUserInfo: HTTP Status:', error.response.status);
        console.error('DiscordService.getUserInfo: Error data:', error.response.data);
        if (error.response.status === 401) {
          console.error('DiscordService.getUserInfo: Token is invalid or expired');
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
        console.log(`DiscordService: ✅ Bot has access to guild ${guildId} (${response.data.name})`);
        return true;
      }

      return false;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.error(`DiscordService.verifyBotAccessToGuild: ❌ Bot cannot access guild ${guildId}`);
        console.error(`DiscordService: Bot is not in this server or guild ID is incorrect`);
        return false;
      }
      console.error('DiscordService.verifyBotAccessToGuild: Error checking bot access', error.message);
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
        console.log(`DiscordService: User ${discordUserId} is already in guild ${guildId}`);
        return true;
      }

      return false;
    } catch (error: any) {
      if (error.response?.status === 404) {
        if (error.response?.data?.code === 10004) {
          // 10004 = Unknown Guild - bot not in server
          console.warn(`DiscordService.isUserInGuild: Bot cannot access guild ${guildId} - bot may not be in server`);
        }
        // User not in server (or guild unknown)
        return false;
      }
      console.error('DiscordService.isUserInGuild: Error checking guild membership', error.message);
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
      console.warn('DiscordService.addUserToGuild: Missing DISCORD_GUILD_ID configuration');
      return false;
    }

    // First check if user is already in server
    const alreadyInServer = await this.isUserInGuild(discordUserId);
    if (alreadyInServer) {
      console.log(`DiscordService: User ${discordUserId} is already in guild ${guildId}`);
      return true;
    }

    // Bot token is REQUIRED - Discord API needs it in Authorization header
    if (!botToken) {
      console.error('DiscordService.addUserToGuild: ❌ Missing DISCORD_BOT_TOKEN configuration');
      console.error('DiscordService: Discord API requires Bot token in Authorization header to add users to server');
      console.error('DiscordService: Even with OAuth guilds.join scope, Bot token is required');
      return false;
    }

    // Verify bot has access to the guild before attempting to add user
    const botHasAccess = await this.verifyBotAccessToGuild();
    if (!botHasAccess) {
      console.error(`DiscordService.addUserToGuild: ❌ Cannot add user - bot cannot access guild ${guildId}`);
      console.error(`DiscordService: Possible causes:`);
      console.error(`DiscordService:   1. Bot is NOT in the Discord server - invite it first`);
      console.error(`DiscordService:   2. DISCORD_GUILD_ID is incorrect - verify Server ID`);
      console.error(`DiscordService:   3. DISCORD_BOT_TOKEN is for a different bot`);
      console.error(`DiscordService: Fix: Invite bot to server using Discord Developer Portal → OAuth2 → URL Generator`);
      console.error(`DiscordService:   Make sure to select "bot" scope and "Create Instant Invite" permission`);
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
      console.log(`DiscordService: Bot roles in server: ${botRoles.length} role(s)`);
      
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
      console.log(`DiscordService: Bot is in guild and can access guild info`);
    } catch (permError: any) {
      console.warn(`DiscordService: Could not verify bot permissions (non-critical):`, permError.message);
      // Continue anyway - the actual API call will reveal permission issues
    }

    // If no OAuth token provided, we cannot add the user
    // Discord API requires user's OAuth token (with guilds.join scope) in request body
    // Even though Bot token is required in header, the user's OAuth token is still needed in body
    if (!userAccessToken || userAccessToken.trim() === '') {
      console.warn('DiscordService.addUserToGuild: ⚠️ Cannot add user without OAuth token');
      console.warn('DiscordService: Discord API requires user\'s OAuth token (with guilds.join scope) in request body');
      console.warn('DiscordService: User must complete Discord OAuth login to be added to server automatically');
      console.warn('DiscordService: Or user can join server manually via invite link');
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
      console.log('DiscordService.addUserToGuild: Token info check - scopes:', scopes);
      console.log('DiscordService.addUserToGuild: Token info - application:', tokenInfo.data.application);
      
      if (!scopes.includes('guilds.join')) {
        console.error('DiscordService.addUserToGuild: ❌ Token missing guilds.join scope!');
        console.error('DiscordService: Available scopes:', scopes);
        console.error('DiscordService: User must re-authorize with guilds.join scope');
        console.error('DiscordService: Ensure OAuth URL includes prompt=consent and guilds.join scope');
        return false;
      } else {
        console.log('DiscordService.addUserToGuild: ✅ Token has guilds.join scope (verified via /oauth2/@me)');
      }
    } catch (error: any) {
      console.warn('DiscordService: Could not verify token scopes via /oauth2/@me:', error.message);
      if (error.response) {
        console.warn('DiscordService: Token info check HTTP status:', error.response.status);
        console.warn('DiscordService: Token info check error data:', error.response.data);
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
      console.log(`DiscordService: Attempting to add user ${discordUserId} to guild ${guildId}...`);
      console.log(`DiscordService: Using Bot token for authorization + OAuth token (guilds.join scope) in request body`);
      console.log(`DiscordService: Bot token present: ${!!botToken}`);
      console.log(`DiscordService: Bot token preview: ${botToken ? `${botToken.substring(0, 20)}...` : 'missing'}`);
      console.log(`DiscordService: User OAuth token present: ${!!userAccessToken}`);
      console.log(`DiscordService: User OAuth token length: ${userAccessToken?.length || 0}`);
      console.log(`DiscordService: User OAuth token preview (first 50 chars): ${userAccessToken ? `${userAccessToken.substring(0, 50)}...` : 'missing'}`);
      
      // Validate token format - Discord OAuth tokens should be long random strings
      // They should NOT start with client ID or be too short
      if (userAccessToken && userAccessToken.length < 50) {
        console.error(`DiscordService: ⚠️ WARNING - OAuth token seems too short (${userAccessToken.length} chars). Expected ~70+ chars.`);
      }
      if (userAccessToken && userAccessToken.startsWith('MTQxMzY1MDY0NjU1NjQ3')) {
        console.error(`DiscordService: ⚠️ WARNING - OAuth token appears to start with client ID! This is wrong.`);
        console.error(`DiscordService: Token might be corrupted or wrong value is being used.`);
      }
      
      // Build request body - include roles array if roleId is provided
      const requestBody: any = {
        access_token: userAccessToken // OAuth token with guilds.join scope goes in body
      };
      
      // Include roles array if roleId is provided (assigns role when adding user)
      const roleIdToAssign = roleId || process.env.DISCORD_PAID_MEMBER_ROLE_ID || '';
      if (roleIdToAssign) {
        requestBody.roles = [roleIdToAssign];
        console.log(`DiscordService: Will assign role ${roleIdToAssign} when adding user to server`);
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

      console.log(`DiscordService: ✅ Successfully added user ${discordUserId} to guild ${guildId}`);
      
      // Verify user was actually added
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second for Discord to process
      const verified = await this.isUserInGuild(discordUserId);
      if (verified) {
        console.log(`DiscordService: ✅ Verified user ${discordUserId} is now in guild ${guildId}`);
        return true;
      } else {
        // Retry verification after another wait
        console.log(`DiscordService: User not found immediately, waiting and retrying verification...`);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait another 1.5 seconds
        const retryVerified = await this.isUserInGuild(discordUserId);
        if (retryVerified) {
          console.log(`DiscordService: ✅ Verified user ${discordUserId} is now in guild ${guildId} (after retry)`);
          return true;
        } else {
          console.warn(`DiscordService: ⚠️ User ${discordUserId} still not found in guild after adding`);
          return false;
        }
      }
    } catch (error: any) {
      if (error.response?.status === 204) {
        // 204 No Content means user was added
        await new Promise(resolve => setTimeout(resolve, 1500));
        const verified = await this.isUserInGuild(discordUserId);
        if (verified) {
          console.log(`DiscordService: ✅ Verified user ${discordUserId} is now in guild ${guildId}`);
          return true;
        }
        console.warn(`DiscordService: ⚠️ User ${discordUserId} not found in guild after 204 response`);
        return false;
      }

      // Check for invalid OAuth token error (50025) - can occur with any status code
      if (error.response?.data?.code === 50025) {
        console.error(`DiscordService.addUserToGuild: ❌ Invalid OAuth2 access token (code 50025)`);
        console.error(`DiscordService: Full error response:`, JSON.stringify(error.response.data, null, 2));
        console.error(`DiscordService: HTTP Status: ${error.response.status}`);
        console.error(`DiscordService: This means the user's access token is invalid or missing guilds.join scope`);
        console.error(`DiscordService: Possible causes:`);
        console.error(`DiscordService:   1. User didn't authorize with guilds.join scope (most likely)`);
        console.error(`DiscordService:   2. Access token expired (Discord tokens expire after ~1 hour)`);
        console.error(`DiscordService:   3. Wrong token type (using bot token instead of user token)`);
        console.error(`DiscordService:   4. Token is for a different Discord application/client_id`);
        console.error(`DiscordService:   5. Token was revoked or invalidated`);
        console.error(`DiscordService: Fix: Ensure OAuth URL includes prompt=consent and guilds.join scope`);
        console.error(`DiscordService: User must re-authorize with proper scopes`);
        console.error(`DiscordService: Token used (first 30 chars): ${userAccessToken ? userAccessToken.substring(0, 30) : 'missing'}...`);
        return false;
      }

      if (error.response?.status === 404) {
        // 404 Not Found - Guild not found or bot not in server
        if (error.response?.data?.code === 10004) {
          console.error(`DiscordService.addUserToGuild: ❌ Unknown Guild (404 - code 10004)`);
          console.error(`DiscordService: Guild ID used: ${guildId}`);
          console.error(`DiscordService: Possible causes:`);
          console.error(`DiscordService:   1. DISCORD_GUILD_ID is incorrect - verify the Server ID`);
          console.error(`DiscordService:   2. Bot is NOT in this Discord server - invite the bot to the server first`);
          console.error(`DiscordService:   3. Bot token is for a different bot/application`);
          console.error(`DiscordService: How to fix:`);
          console.error(`DiscordService:   1. Verify Server ID: Enable Developer Mode → Right-click server → Copy Server ID`);
          console.error(`DiscordService:   2. Invite bot to server: Go to Discord Developer Portal → OAuth2 → URL Generator`);
          console.error(`DiscordService:   3. Select bot permissions and use the generated invite URL`);
          console.error(`DiscordService:   4. Make sure DISCORD_BOT_TOKEN matches the bot in the server`);
        } else {
          console.error(`DiscordService.addUserToGuild: ❌ 404 Not Found - Guild or endpoint not found`);
          console.error(`DiscordService: Guild ID: ${guildId}`);
          console.error(`DiscordService: Error response:`, error.response.data);
        }
        return false;
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error(`DiscordService.addUserToGuild: ❌ Bot authentication/permission failed (${error.response.status})`);
        console.error(`DiscordService: Guild ID: ${guildId}`);
        console.error(`DiscordService: User ID: ${discordUserId}`);
        
        if (error.response?.status === 401) {
          console.error(`DiscordService: ❌ 401 Unauthorized - Bot token is invalid or expired`);
          console.error(`DiscordService: Fix: Check that DISCORD_BOT_TOKEN is correct in your .env file`);
          console.error(`DiscordService: Get a new token from: https://discord.com/developers/applications → Your App → Bot → Reset Token`);
        } else if (error.response?.status === 403) {
          console.error(`DiscordService: ❌ 403 Forbidden - Bot lacks required permissions`);
          console.error(`DiscordService: Required permissions for adding members:`);
          console.error(`DiscordService:   1. "Create Instant Invite" - REQUIRED`);
          console.error(`DiscordService:   2. Bot must be in the Discord server`);
          console.error(`DiscordService:   3. Bot's role must have appropriate permissions`);
          console.error(`DiscordService: Fix steps:`);
          console.error(`DiscordService:   1. Go to Discord Developer Portal: https://discord.com/developers/applications`);
          console.error(`DiscordService:   2. Select your application → OAuth2 → URL Generator`);
          console.error(`DiscordService:   3. Select "bot" scope and these permissions:`);
          console.error(`DiscordService:      - Create Instant Invite`);
          console.error(`DiscordService:      - Manage Roles (if assigning roles)`);
          console.error(`DiscordService:   4. Copy the generated URL and invite bot to server`);
          console.error(`DiscordService:   5. In Discord server: Server Settings → Roles → Make sure bot role is positioned high enough`);
          
          // Log the actual error response for more details
          if (error.response?.data) {
            console.error(`DiscordService: Discord API error details:`, JSON.stringify(error.response.data, null, 2));
            if (error.response.data.code === 50013) {
              console.error(`DiscordService: Error code 50013 = Missing Permissions`);
            } else if (error.response.data.code === 50001) {
              console.error(`DiscordService: Error code 50001 = Missing Access (bot not in server)`);
            }
          }
        }
        
        return false;
      }

      if (error.response?.status === 400) {
        // 400 Bad Request usually means user is already in the server or invalid request
        if (error.response?.data?.message?.includes('already') || 
            error.response?.data?.code === 50004) {
          console.log(`DiscordService: User ${discordUserId} is already in guild ${guildId}`);
          return true; // User already in server is considered success
        }
        console.error('DiscordService.addUserToGuild: Invalid request to add member', error.response.data);
        return false;
      }

      console.error('DiscordService.addUserToGuild: Failed to add user to guild', error.message);
      if (error.response) {
        console.error(`DiscordService: HTTP Status: ${error.response.status}`);
        console.error(`DiscordService: Error response:`, error.response.data);
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
      
      console.error(`DiscordService.addUserToGuildWithBot: ❌ Missing required configuration: ${missing.join(', ')}`);
      console.error(`DiscordService: Cannot add user ${discordUserId} to Discord server without these environment variables.`);
      console.error(`DiscordService: Please add to backend/.env:`);
      if (!guildId) console.error(`DiscordService:   DISCORD_GUILD_ID=your_server_id_here`);
      if (!botToken) console.error(`DiscordService:   DISCORD_BOT_TOKEN=your_bot_token_here`);
      console.error(`DiscordService: ⚠️ User ${discordUserId} must join the Discord server manually or configure these variables.`);
      return false;
    }

    // Without user's OAuth token, we cannot add them via Discord API
    // Discord requires the user's OAuth token (with guilds.join scope) in the request body
    if (!userAccessToken || userAccessToken.trim() === '') {
      console.warn(`DiscordService.addUserToGuildWithBot: ⚠️ Cannot add user ${discordUserId} without OAuth token`);
      console.warn(`DiscordService: Discord API requires user's OAuth token (with guilds.join scope) in request body`);
      console.warn(`DiscordService: User must complete Discord OAuth login to be added to server automatically`);
      console.warn(`DiscordService: Or user can join server manually via invite link`);
      return false;
    }

    try {
      console.log(`DiscordService: Attempting to add user ${discordUserId} to guild ${guildId} using bot token + OAuth token...`);
      
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

      console.log(`DiscordService: ✅ API call successful - verifying user ${discordUserId} is in guild ${guildId}...`);
      
      // Wait a moment for Discord to process
      await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds
      
      // Verify user was actually added
      const verified = await this.isUserInGuild(discordUserId);
      if (verified) {
        console.log(`DiscordService: ✅ Verified user ${discordUserId} is now in guild ${guildId}`);
        return true;
      } else {
        // Retry check once more after another short wait
        console.log(`DiscordService: User not found immediately, waiting and retrying verification...`);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait another 1.5 seconds
        const retryVerified = await this.isUserInGuild(discordUserId);
        if (retryVerified) {
          console.log(`DiscordService: ✅ Verified user ${discordUserId} is now in guild ${guildId} (after retry)`);
          return true;
        } else {
          console.warn(`DiscordService: ⚠️ User ${discordUserId} still not found in guild ${guildId} after adding`);
          console.warn(`DiscordService: ⚠️ This may indicate the bot doesn't have proper permissions or the user declined the invite`);
          return false;
        }
      }
    } catch (error: any) {
      if (error.response?.status === 204) {
        // 204 No Content means user was added
        await new Promise(resolve => setTimeout(resolve, 1500));
        const verified = await this.isUserInGuild(discordUserId);
        if (verified) {
          console.log(`DiscordService: ✅ Verified user ${discordUserId} is now in guild ${guildId}`);
          return true;
        }
        console.warn(`DiscordService: ⚠️ User ${discordUserId} not found in guild after 204 response`);
        return false;
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error(`DiscordService.addUserToGuildWithBot: ❌ Bot authentication/permission failed (${error.response.status})`);
        console.error(`DiscordService: Status ${error.response.status} - Check bot permissions in Discord server`);
        console.error(`DiscordService: Bot needs these permissions:`);
        console.error(`DiscordService:   ✅ "Create Instant Invite" - Required to add users`);
        console.error(`DiscordService:   ✅ Bot must be in the server`);
        console.error(`DiscordService:   ✅ Bot role must be above roles it assigns`);
        if (error.response?.data) {
          console.error(`DiscordService: Error details:`, error.response.data);
        }
        return false;
      }

      if (error.response?.status === 400) {
        if (error.response?.data?.message?.includes('already') || 
            error.response?.data?.code === 50004) {
          console.log(`DiscordService: User ${discordUserId} is already in guild ${guildId}`);
          return true;
        }
        
        // Check for Invalid Form Body error (50035) - usually means access_token is invalid/missing
        if (error.response?.data?.code === 50035) {
          console.error(`DiscordService.addUserToGuildWithBot: ❌ Invalid request body (code 50035)`);
          console.error(`DiscordService: This usually means the OAuth token is invalid or missing guilds.join scope`);
          if (error.response?.data?.errors?.access_token) {
            console.error(`DiscordService: access_token errors:`, error.response.data.errors.access_token);
          }
          return false;
        }
        
        console.error('DiscordService.addUserToGuildWithBot: Invalid request to add member', error.response.data);
        return false;
      }

      console.error('DiscordService.addUserToGuildWithBot: Failed to add user to guild', error.message);
      if (error.response) {
        console.error(`DiscordService: HTTP Status: ${error.response.status}`);
        console.error(`DiscordService: Error response:`, error.response.data);
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
        console.log(`DiscordService.findUser: Found user by Discord ID: ${discordUser.id}`);
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
            console.log(`DiscordService.findUser: Preserving payment email ${user.email}, storing Discord email ${discordUser.email} separately`);
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
            console.log(`DiscordService.findUser: Found user by email: ${discordUser.email}`);
            
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
            
            console.log(`DiscordService.findUser: Linking Discord ID ${discordUser.id} to existing user ${user.id}`);
            console.log(`DiscordService.findUser: Payment email: ${user.email}, Discord email: ${discordUser.email}`);
            return await FirebaseService.updateUser(user.id, updateData) || user;
          }
        } catch (error) {
          console.warn(`DiscordService.findUser: Error searching by email:`, error);
          // Continue - user not found
        }
      }
      
      return null;
    } catch (error) {
      // User doesn't exist
      console.warn(`DiscordService.findUser: Error finding user:`, error);
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
        console.log(`DiscordService.createUserFromDiscord: User already exists: ${existingUser.id}, updating...`);
        
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
    console.log(`DiscordService.createUserFromDiscord: Created new user: ${user.id}`);

    return user;
  }
}