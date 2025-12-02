# Discord API Key Explained

## What is `DISCORD_API_KEY`?

The `DISCORD_API_KEY` is a **Bearer token** used to authenticate with a **custom Discord Bot API service** (not the official Discord API). This API service manages Discord roles and server membership for your application.

---

## ⚠️ Important: This is NOT Discord OAuth

There are **two different Discord-related credentials** in your app:

### 1. **Discord OAuth Credentials** (for user login)
- `DISCORD_CLIENT_ID` - Your Discord OAuth application client ID
- `DISCORD_CLIENT_SECRET` - Your Discord OAuth application secret
- **Purpose:** Used for users to log in with Discord
- **Where to get:** Discord Developer Portal → Your OAuth Application

### 2. **Discord Bot API Key** (for role management)
- `DISCORD_API_KEY` - Bearer token for the Discord Bot API service
- `DISCORD_API_BASE_URL` - URL of the Discord Bot API service (default: `https://api.rain.club/discord`)
- `DISCORD_PAID_MEMBER_ROLE_ID` - The Discord role ID to assign to paid members
- **Purpose:** Used to add/remove users from Discord server and assign roles
- **Where to get:** From the Discord Bot API service provider (see below)

---

## How It Works

Your backend uses `DISCORD_API_KEY` to make authenticated requests to a custom Discord Bot API service:

```
Your Backend → Discord Bot API Service → Discord Server
     ↓                ↓                        ↓
Uses API Key    Validates API Key      Adds/Removes Roles
```

### Example API Call:
```javascript
// Your backend makes this request:
POST https://api.rain.club/discord/members/roles/add
Headers:
  Authorization: Bearer YOUR_DISCORD_API_KEY
  Content-Type: application/json
Body:
  {
    "userId": "123456789012345678",
    "roleId": "987654321098765432"
  }
```

---

## Where to Get the Discord API Key

The `DISCORD_API_KEY` comes from **your Discord Bot API service provider**. Based on your code, this appears to be a custom service hosted at `https://api.rain.club/discord`.

### Steps to Get Your API Key:

1. **Contact the Discord Bot API Service Provider**
   - If you're using a service at `https://api.rain.club/discord`, contact the administrator of that service
   - They should provide you with a Bearer token (API key)

2. **If You're Running Your Own Discord Bot API Service**
   - Check the service's documentation for how to generate API keys
   - Look for an admin panel or API key generation endpoint
   - The API key is typically a long random string (e.g., `sk_live_abc123xyz...` or `bearer_token_xyz...`)

3. **If You Have Access to the Service**
   - Check the service's environment variables or configuration
   - Look for API key generation in the service's admin interface
   - Check any documentation for the Discord Role Manager API

---

## How to Set It Up

### 1. Add to `backend/.env`:

```env
# Discord Bot API Configuration
DISCORD_API_BASE_URL=https://api.rain.club/discord
DISCORD_API_KEY=your_actual_api_key_here
DISCORD_PAID_MEMBER_ROLE_ID=your_paid_member_role_id_here
```

### 2. For Local Development:

If you're running the Discord Bot API service locally:

```env
DISCORD_API_BASE_URL=http://localhost:8080/discord
DISCORD_API_KEY=your_local_api_key_here
DISCORD_PAID_MEMBER_ROLE_ID=your_paid_member_role_id_here
```

---

## What the API Key Looks Like

The API key is typically a long string that looks like one of these:

```
# Example formats:
sk_live_abc123xyz789...
bearer_token_xyz123...
api_key_rainmakers_2024...
a1b2c3d4e5f6g7h8i9j0...
```

**Important:** Keep this key secret! Never commit it to version control.

---

## How It's Used in Your Code

The `DISCORD_API_KEY` is used in `backend/src/services/discordBotService.ts`:

```typescript
// Authentication header
headers: {
  'Authorization': `Bearer ${DISCORD_API_KEY}`,
  'Content-Type': 'application/json'
}
```

### Operations Using the API Key:

1. **Add Role to User:**
   ```typescript
   POST /members/roles/add
   Body: { userId: "...", roleId: "..." }
   ```

2. **Remove Role from User:**
   ```typescript
   POST /members/roles/remove
   Body: { userId: "...", roleId: "..." }
   ```

3. **Check if User Has Role:**
   ```typescript
   GET /members/{userId}/roles/{roleId}
   ```

---

## Troubleshooting

### Error: "Missing required configuration: DISCORD_API_KEY"

**Solution:** Add `DISCORD_API_KEY` to your `backend/.env` file.

### Error: "HTTP Status: 401" (Unauthorized)

**Causes:**
- API key is incorrect or expired
- API key doesn't have proper permissions
- API key format is wrong (should be used as Bearer token)

**Solution:**
- Verify the API key is correct
- Contact the Discord Bot API service provider to regenerate the key
- Ensure the key is being sent in the `Authorization: Bearer {key}` header

### Error: "No response received"

**Causes:**
- `DISCORD_API_BASE_URL` is incorrect
- Discord Bot API service is down
- Network/firewall blocking the request

**Solution:**
- Verify `DISCORD_API_BASE_URL` is correct
- Check if the Discord Bot API service is running
- Test the API endpoint manually with curl or Postman

---

## Security Best Practices

1. **Never commit API keys to Git**
   - Add `backend/.env` to `.gitignore`
   - Use environment variables in production

2. **Rotate API keys regularly**
   - Change the key if it's been compromised
   - Use different keys for development and production

3. **Restrict API key permissions**
   - Only grant the minimum permissions needed
   - Use separate keys for different environments

4. **Monitor API key usage**
   - Check logs for unauthorized access attempts
   - Set up alerts for unusual activity

---

## Summary

- **`DISCORD_API_KEY`** = Bearer token for your custom Discord Bot API service
- **NOT** the same as Discord OAuth credentials
- Used to add/remove users from Discord server and assign roles
- Get it from your Discord Bot API service provider
- Keep it secret and never commit to version control

---

## Need Help?

If you don't have the Discord API key:

1. **Check if you have access to the Discord Bot API service**
   - Look for documentation or admin panel
   - Check with your team/administrator

2. **If you're setting up a new Discord Bot API service**
   - You'll need to implement the API endpoints
   - Generate API keys for authentication
   - See the OpenAPI spec in your codebase for the expected API structure

3. **Contact Support**
   - If you're using a third-party service, contact their support
   - If it's your own service, check the service's documentation

