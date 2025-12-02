# Local Authentication Troubleshooting Guide

## Problem
Discord authentication works in production but fails in local development.

## Solution

The backend now automatically constructs the Discord redirect URI based on the environment. However, you need to ensure your environment variables are set correctly.

### Backend Configuration

1. **Create or update `backend/.env`:**

```env
# Server Configuration
PORT=3001
NODE_ENV=development  # ⚠️ IMPORTANT: Must be set to 'development' for local testing

# Frontend URL - Local Development
FRONTEND_URL=http://localhost:3000

# Discord OAuth Configuration
DISCORD_CLIENT_ID=1413650646556479490
DISCORD_CLIENT_SECRET=your-discord-client-secret

# Discord Redirect URI (optional for local dev - will auto-construct)
# DISCORD_REDIRECT_URI=http://localhost:3001/auth/discord/callback

# Other required variables...
JWT_SECRET=your-jwt-secret
# ... (see backend/env.example for complete list)
```

**Key Points:**
- `NODE_ENV=development` is **required** for local development
- The backend will automatically use `http://localhost:3001/auth/discord/callback` when `NODE_ENV=development`
- `DISCORD_REDIRECT_URI` is optional for local dev (will be auto-constructed)

### Frontend Configuration

2. **Create or update `frontend/.env.local`:**

```env
# API Configuration - Local Development
VITE_API_URL=http://localhost:3001/api

# Discord OAuth Configuration
VITE_DISCORD_CLIENT_ID=1413650646556479490
```

**Key Points:**
- `VITE_API_URL=http://localhost:3001/api` is **required** for local development
- The frontend will construct `http://localhost:3001/auth/discord/callback` from this URL
- Restart the frontend dev server after changing `.env.local`

### Discord Developer Portal Configuration

3. **Add Redirect URI to Discord Developer Portal:**

1. Go to: https://discord.com/developers/applications
2. Select your application (ID: `1413650646556479490`)
3. Go to **OAuth2** → **General**
4. Add this redirect URI:
   - `http://localhost:3001/auth/discord/callback`

**Important:** The redirect URI must match **exactly** (including `http://` vs `https://`).

### Testing

4. **Restart Both Servers:**

After updating environment variables:

```bash
# Backend
cd backend
npm run dev

# Frontend (in a new terminal)
cd frontend
npm run dev
```

5. **Test Discord Login:**

1. Open `http://localhost:3000`
2. Click "Login with Discord"
3. Check browser console and backend logs for any errors

### Debugging

#### Check Backend Logs

When you click "Login with Discord", you should see in the backend logs:

```
Auth: Discord callback received {
  hasCode: true,
  redirectUri: 'http://localhost:3001/auth/discord/callback',
  nodeEnv: 'development',
  requestHost: 'localhost:3001',
  requestProtocol: 'http'
}

DiscordService: Exchanging code for token {
  hasCode: true,
  redirectUri: 'http://localhost:3001/auth/discord/callback',
  clientId: 'set'
}
```

#### Check Frontend Console

In the browser console, you should see the Discord OAuth URL being constructed:

```
https://discord.com/oauth2/authorize?client_id=1413650646556479490&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fauth%2Fdiscord%2Fcallback&scope=identify+email+guilds.join
```

#### Common Errors

**Error: "Invalid authorization code or redirect URI mismatch"**

**Solution:**
1. Verify `NODE_ENV=development` is set in `backend/.env`
2. Verify `VITE_API_URL=http://localhost:3001/api` is set in `frontend/.env.local`
3. Verify `http://localhost:3001/auth/discord/callback` is added to Discord Developer Portal
4. Restart both servers after changing environment variables

**Error: "Access denied" or "Invalid client"**

**Solution:**
1. Verify `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are set correctly in `backend/.env`
2. Verify `VITE_DISCORD_CLIENT_ID` is set correctly in `frontend/.env.local`
3. Verify the client ID matches in both files

**Error: "CORS policy"**

**Solution:**
1. Verify `FRONTEND_URL=http://localhost:3000` is set in `backend/.env`
2. Verify the backend CORS configuration includes `http://localhost:3000`

### Verification Checklist

- [ ] `backend/.env` has `NODE_ENV=development`
- [ ] `backend/.env` has `FRONTEND_URL=http://localhost:3000`
- [ ] `backend/.env` has `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`
- [ ] `frontend/.env.local` has `VITE_API_URL=http://localhost:3001/api`
- [ ] `frontend/.env.local` has `VITE_DISCORD_CLIENT_ID`
- [ ] Discord Developer Portal has `http://localhost:3001/auth/discord/callback` as redirect URI
- [ ] Both backend and frontend servers are restarted after changing environment variables
- [ ] Backend is running on `http://localhost:3001`
- [ ] Frontend is running on `http://localhost:3000`

### How It Works

1. **Frontend**: Constructs Discord OAuth URL with redirect URI `http://localhost:3001/auth/discord/callback`
2. **User**: Authorizes on Discord
3. **Discord**: Redirects to `http://localhost:3001/auth/discord/callback?code=...`
4. **Backend**: Receives callback, constructs redirect URI based on `NODE_ENV=development` → `http://localhost:3001/auth/discord/callback`
5. **Backend**: Exchanges code for token using the same redirect URI
6. **Backend**: Redirects to frontend with token

The key is that the redirect URI must match **exactly** between:
- What the frontend sends to Discord
- What the backend sends to Discord when exchanging the code
- What's registered in Discord Developer Portal

### Production vs Local

**Local Development:**
- Backend: `http://localhost:3001/auth/discord/callback` (auto-constructed when `NODE_ENV=development`)
- Frontend: `http://localhost:3000`
- API: `http://localhost:3001/api`

**Production:**
- Backend: Uses `DISCORD_REDIRECT_URI` env var or constructs from request
- Frontend: `https://www.rain.club`
- API: `https://rain.club/api`

The code automatically detects the environment and uses the correct URLs.

