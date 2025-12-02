# Discord Configuration - Complete Setup Guide

## ✅ Two-Step Process

Your app now uses a **two-step process** to add users to Discord:
1. **Add user to Discord server** - Using OAuth (with `guilds.join` scope) + Guild ID
2. **Assign paid member role** - Using custom Discord Bot API service

---

## Required Configuration

You need **4 required environment variables**:

### 1. **DISCORD_GUILD_ID** (REQUIRED - Server ID)
- **Why needed**: Required to add users to your Discord server
- **How to get**: 
  1. Open Discord
  2. Enable Developer Mode: Settings → Advanced → Developer Mode ✅
  3. Right-click your Discord server name → **Copy Server ID**
  4. Example: `123456789012345678`

### 2. **DISCORD_API_KEY** (REQUIRED)
- This is a Bearer token from your custom Discord Bot API service
- Contact the administrator of `https://api.rain.club/discord`
- Or check your service's admin panel/documentation
- See `backend/DISCORD_API_KEY_EXPLAINED.md` for more details

### 3. **DISCORD_PAID_MEMBER_ROLE_ID** (REQUIRED)
- In Discord, enable Developer Mode: Settings → Advanced → Developer Mode
- Go to Server Settings → **Roles**
- Find or create the "Paid Member" role
- Right-click the role → **Copy ID**
- Example: `123456789012345678`

### 4. **DISCORD_API_BASE_URL** (REQUIRED)
- For local development: `http://localhost:8080/discord`
- For production: `https://api.rain.club/discord`

### 5. **DISCORD_BOT_TOKEN** (REQUIRED)
- **Required** to add users to Discord server
- Discord API requires BOT token for adding members (OAuth method may not work reliably)
- Bot must be in your Discord server with proper permissions:
  - ✅ "Create Instant Invite" permission (to add users)
  - ✅ "Manage Roles" permission (to assign roles)
- Get it from: Discord Developer Portal → Your Bot → Token

---

## How It Works

### Step 1: Add User to Discord Server
- Uses **Bot token** to add users to server (REQUIRED)
- Discord API requires BOT token for this endpoint - OAuth token method may not work reliably
- Calls Discord's official API: `PUT /guilds/{guildId}/members/{userId}`
- Requires: `DISCORD_GUILD_ID` + `DISCORD_BOT_TOKEN`
- **Verification**: After adding, verifies user is actually in server before proceeding

### Step 2: Assign Paid Member Role
- Uses **custom Discord Bot API service**
- Calls: `POST /members/roles/add` with `userId` and `roleId`
- Requires: `DISCORD_API_KEY` + `DISCORD_PAID_MEMBER_ROLE_ID`

---

## Setup Steps

### Step 1: Add to `backend/.env`

```env
# Discord OAuth (for user login - you already have these)
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=http://localhost:3001/auth/discord/callback

# Discord Server Configuration (REQUIRED)
DISCORD_GUILD_ID=your_discord_guild_id_here  # ← REQUIRED!

# Discord Bot Token (REQUIRED for adding users to server)
DISCORD_BOT_TOKEN=your_bot_token_here  # ← REQUIRED! Discord API needs this to add users

# Discord Bot API (custom service - REQUIRED for assigning roles)
DISCORD_API_BASE_URL=https://api.rain.club/discord
DISCORD_API_KEY=your_api_key_here
DISCORD_PAID_MEMBER_ROLE_ID=your_role_id_here
```

### Step 2: Get DISCORD_GUILD_ID

1. Open Discord
2. Enable Developer Mode:
   - Settings → Advanced → Developer Mode ✅
3. Get Server ID:
   - Right-click your Discord server name (in server list)
   - Click **Copy Server ID**
   - Paste into `DISCORD_GUILD_ID` in `backend/.env`

### Step 3: Get DISCORD_API_KEY

1. Contact the administrator of your Discord Bot API service
2. Request an API key (Bearer token)
3. The API key typically looks like: `sk_live_abc123xyz...` or `bearer_token_xyz123...`

### Step 4: Get DISCORD_PAID_MEMBER_ROLE_ID

1. In Discord, go to your server
2. Server Settings → **Roles**
3. Find or create the "Paid Member" role
4. Right-click the role → **Copy ID**
5. Paste into `DISCORD_PAID_MEMBER_ROLE_ID` in `backend/.env`

### Step 5: Restart Backend Server

```bash
cd backend
npm run dev
```

---

## Testing

1. **Log in with Discord:**
   - The user will be added to your Discord server automatically
   - The paid member role will be assigned automatically

2. **Check logs for:**
   - ✅ `"DiscordService: ✅ Successfully added user {id} to guild {guildId} using OAuth token"`
   - ✅ `"Auth: ✅ Added user {id} to Discord server"`
   - ✅ `"DiscordBotService: ✅ Successfully added role {roleId} to member {id}"`
   - ✅ `"Auth: ✅ Assigned paid role to user {id}"`

3. **Verify in Discord:**
   - Check if user was added to server
   - Check if user has the "Paid Member" role

---

## Troubleshooting

### ❌ "Missing DISCORD_GUILD_ID configuration"

**Solution:**
- Add `DISCORD_GUILD_ID=your_server_id_here` to `backend/.env`
- Get the Server ID from Discord (see Step 2 above)

### ❌ "Missing required configuration: DISCORD_API_KEY"

**Solution:**
- Add `DISCORD_API_KEY=your_api_key_here` to `backend/.env`
- Get the API key from your Discord Bot API service administrator

### ❌ "OAuth token method failed, trying bot token fallback..."

**What this means:**
- OAuth method didn't work (401/403 error)
- System is falling back to bot token method
- This is normal if you don't have `guilds.join` scope working

**Solution:**
- Make sure `DISCORD_BOT_TOKEN` is set in `backend/.env` for fallback
- Or fix OAuth `guilds.join` scope (check frontend OAuth scope request)

### ❌ "Bot is missing permissions to add members to guild"

**Solution:**
- Add bot to your Discord server
- Give bot these permissions:
  - ✅ `Manage Roles` - Required to assign roles
  - ✅ `Create Instant Invite` - Required to invite users
- Make sure bot role is above the paid member role

### ❌ "No response received" from Discord Bot API

**Possible causes:**
- `DISCORD_API_BASE_URL` is incorrect
- Discord Bot API service is down
- Network/firewall blocking the request

**Solution:**
- Verify `DISCORD_API_BASE_URL` is correct
- Check if the API service is running
- Test the API endpoint manually with curl/Postman

---

## Configuration Summary

✅ **Required:**
- `DISCORD_GUILD_ID` - Server ID (to add users to server)
- `DISCORD_BOT_TOKEN` - Bot token (REQUIRED to add users to server via Discord API)
- `DISCORD_API_KEY` - API key from Discord Bot API service (to assign roles)
- `DISCORD_PAID_MEMBER_ROLE_ID` - Role ID (to assign the paid role)
- `DISCORD_API_BASE_URL` - API service URL

---

## Complete Flow

```
User logs in with Discord OAuth (guilds.join scope)
    ↓
Step 1: Add user to Discord server
    ├─ Try: OAuth token + DISCORD_GUILD_ID
    └─ Fallback: Bot token + DISCORD_GUILD_ID (if OAuth fails)
    ↓
Step 2: Assign paid member role
    └─ Discord Bot API service (DISCORD_API_KEY + DISCORD_PAID_MEMBER_ROLE_ID)
    ↓
✅ User is in server with paid role!
```

---

## Next Steps

1. ✅ Add `DISCORD_GUILD_ID` to `backend/.env`
2. ✅ Ensure `DISCORD_API_KEY` and `DISCORD_PAID_MEMBER_ROLE_ID` are set
3. ✅ (Optional) Add `DISCORD_BOT_TOKEN` for fallback
4. ✅ Restart backend server
5. ✅ Test login flow
6. ✅ Check logs for success messages
