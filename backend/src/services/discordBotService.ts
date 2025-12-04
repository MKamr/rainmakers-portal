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
      return false;
    }

    const roleIdToUse = roleId || this.PAID_MEMBER_ROLE_ID;

    try {
      
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
                if (response.data?.success?.message) {
                  }
        return true;
      }

            if (response.data) {
              }
      return false;
    } catch (error: any) {
      const fullUrl = `${this.DISCORD_API_BASE}/members/${discordId}/roles/${roleIdToUse}`;
                              if (error.response) {
                // 405 Method Not Allowed - endpoint might need different HTTP method
        if (error.response.status === 405) {
                  }
      } else if (error.request) {
                      } else {
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
                return true;
      }

      return false;
    } catch (error: any) {
            if (error.response?.data) {
              }
      throw error;
    }
  }
}







