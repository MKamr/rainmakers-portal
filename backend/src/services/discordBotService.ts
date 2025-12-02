import axios from 'axios';

export class DiscordBotService {
  private static readonly DISCORD_API_BASE = process.env.DISCORD_API_BASE_URL || 'http://93.127.143.85:8585/discord';
  private static readonly DISCORD_API_KEY = process.env.DISCORD_API_KEY || '';
  private static readonly PAID_MEMBER_ROLE_ID = process.env.DISCORD_PAID_MEMBER_ROLE_ID || '';

  /**
   * Validate Discord Bot API configuration
   */
  private static validateConfig(): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    
    if (!this.DISCORD_API_KEY) {
      missing.push('DISCORD_API_KEY');
    }
    if (!this.PAID_MEMBER_ROLE_ID) {
      missing.push('DISCORD_PAID_MEMBER_ROLE_ID');
    }
    
    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Check if a Discord member has the paid member role
   */
  static async checkMemberStatus(discordId: string, roleId?: string): Promise<boolean> {
    try {
      const roleIdToCheck = roleId || this.PAID_MEMBER_ROLE_ID;
      
      if (!roleIdToCheck) {
        console.error('DiscordBotService: PAID_MEMBER_ROLE_ID not configured');
        return false;
      }

      const response = await axios.get(
        `${this.DISCORD_API_BASE}/members/${discordId}/roles/${roleIdToCheck}`,
        {
          headers: {
            'Authorization': `Bearer ${this.DISCORD_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data?.success?.hasRole !== undefined) {
        return response.data.success.hasRole;
      }

      return false;
    } catch (error: any) {
      console.error('DiscordBotService: Error checking member status:', error.message);
      if (error.response?.status === 404) {
        // Member not found or doesn't have role
        return false;
      }
      throw error;
    }
  }

  /**
   * Assign paid member role to a Discord user
   * 
   * NOTE: This method ONLY assigns the role. It does NOT add the user to the server.
   * The user must already be in the Discord server before calling this method.
   * Use DiscordService.addUserToGuild() first to add the user to the server.
   * 
   * This method uses the custom Discord Bot API service to assign roles.
   * 
   * Note: This requires DISCORD_API_KEY and DISCORD_PAID_MEMBER_ROLE_ID to be configured.
   */
  static async addMemberToServer(discordId: string, roleId?: string): Promise<boolean> {
    // Validate configuration
    const configCheck = this.validateConfig();
    if (!configCheck.valid) {
      console.error(`DiscordBotService: Missing required configuration: ${configCheck.missing.join(', ')}`);
      console.error(`DiscordBotService: Please add these to backend/.env: ${configCheck.missing.map(k => `${k}=...`).join(', ')}`);
      return false;
    }

    const roleIdToUse = roleId || this.PAID_MEMBER_ROLE_ID;

    try {
      
      console.log(`DiscordBotService: Attempting to add role ${roleIdToUse} to user ${discordId}`);
      console.log(`DiscordBotService: API Base URL: ${this.DISCORD_API_BASE}`);
      console.log(`DiscordBotService: Has API Key: ${!!this.DISCORD_API_KEY}`);
      
      // Use PUT method with URL pattern: /members/{userId}/roles/{roleId}
      const response = await axios.put(
        `${this.DISCORD_API_BASE}/members/${discordId}/roles/${roleIdToUse}`,
        {}, // Empty body for PUT request
        {
          headers: {
            'Authorization': `Bearer ${this.DISCORD_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      if (response.data?.success) {
        console.log(`DiscordBotService: ✅ Successfully added role ${roleIdToUse} to member ${discordId}`);
        if (response.data?.success?.message) {
          console.log(`DiscordBotService: ${response.data.success.message}`);
        }
        return true;
      }

      console.warn(`DiscordBotService: ⚠️ API returned success=false for user ${discordId}`);
      if (response.data) {
        console.warn(`DiscordBotService: Response data:`, response.data);
      }
      return false;
    } catch (error: any) {
      const fullUrl = `${this.DISCORD_API_BASE}/members/${discordId}/roles/${roleIdToUse}`;
      console.error(`DiscordBotService: ❌ Error adding member ${discordId} to server`);
      console.error(`DiscordBotService: Full URL: ${fullUrl}`);
      console.error(`DiscordBotService: Method: PUT`);
      console.error(`DiscordBotService: Role ID: ${roleIdToUse}`);
      
      if (error.response) {
        console.error(`DiscordBotService: HTTP Status: ${error.response.status}`);
        console.error(`DiscordBotService: Error response data:`, JSON.stringify(error.response.data, null, 2));
        console.error(`DiscordBotService: Error response headers:`, error.response.headers);
        
        // 405 Method Not Allowed - endpoint might need different HTTP method
        if (error.response.status === 405) {
          console.error(`DiscordBotService: ⚠️ 405 Method Not Allowed - The endpoint might require a different HTTP method (GET/PUT/PATCH)`);
          console.error(`DiscordBotService: ⚠️ Check your Discord Bot API service documentation for the correct endpoint and method`);
        }
      } else if (error.request) {
        console.error(`DiscordBotService: No response received. Is ${this.DISCORD_API_BASE} accessible?`);
        console.error(`DiscordBotService: Request details:`, error.request);
      } else {
        console.error(`DiscordBotService: Error message:`, error.message);
        console.error(`DiscordBotService: Error stack:`, error.stack);
      }
      // Don't throw - return false instead so webhook doesn't fail
      return false;
    }
  }

  /**
   * Remove paid member role from a Discord user
   */
  static async removeMemberFromServer(discordId: string, roleId?: string): Promise<boolean> {
    try {
      const roleIdToUse = roleId || this.PAID_MEMBER_ROLE_ID;
      
      if (!roleIdToUse) {
        console.error('DiscordBotService: PAID_MEMBER_ROLE_ID not configured');
        return false;
      }

      // Use DELETE method with URL pattern: /members/{userId}/roles/{roleId}
      const response = await axios.delete(
        `${this.DISCORD_API_BASE}/members/${discordId}/roles/${roleIdToUse}`,
        {
          headers: {
            'Authorization': `Bearer ${this.DISCORD_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data?.success) {
        console.log(`DiscordBotService: Successfully removed role from member ${discordId}`);
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('DiscordBotService: Error removing member from server:', error.message);
      if (error.response?.data) {
        console.error('DiscordBotService: Error response:', error.response.data);
      }
      throw error;
    }
  }
}







