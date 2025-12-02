# Local Development Setup Guide

This guide explains how to configure the application for local development vs production.

## Overview

The application automatically detects the environment and uses appropriate URLs:
- **Development**: Uses `localhost` URLs
- **Production**: Uses production URLs (`rain.club`, `rainmakers-portal-backend.vercel.app`)

## Frontend Configuration

### 1. Create `.env.local` File

Create `frontend/.env.local` with the following:

```env
# API Configuration - Local Development
VITE_API_URL=http://localhost:3001/api

# Discord OAuth Configuration
VITE_DISCORD_CLIENT_ID=1413650646556479490

# Microsoft OAuth Configuration
VITE_MICROSOFT_CLIENT_ID=your-microsoft-client-id

# Firebase Configuration
VITE_FIREBASE_PROJECT_ID=rainmakers-portal
VITE_FIREBASE_API_KEY=AIzaSyBO6_83KDTsLYLesrcCRklHMdqBz3Qc1Xs
VITE_FIREBASE_AUTH_DOMAIN=rainmakers-portal.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=rainmakers-portal.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=672672716720
VITE_FIREBASE_APP_ID=1:672672716720:web:3bf2a0e6fb801632a2a875
VITE_FIREBASE_MEASUREMENT_ID=G-D1KMRGHL59

# Stripe Configuration (Test Mode)
VITE_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_51SQD23D9ZJ3UMZ8opVvMeypD6UIczbgUmFp6NRMpfQAoRxionICLLGeTQdY2zA9vuoEK9qZzjKJt8bfYVe5NEqxK00NgOmmNAr
```

### 2. How It Works

- **Development Mode**: When `import.meta.env.DEV` is `true` (when running `npm run dev`), the app automatically uses `http://localhost:3001/api` if `VITE_API_URL` is not set.
- **Production Mode**: When building for production (`npm run build`), it uses `https://rain.club/api` if `VITE_API_URL` is not set.

### 3. OAuth Redirect URLs

The Discord and OneDrive OAuth redirect URLs are automatically derived from `VITE_API_URL`:
- Local: `http://localhost:3001/auth/discord/callback`
- Production: `https://rainmakers-portal-backend.vercel.app/auth/discord/callback`

## Backend Configuration

### 1. Create `.env` File

Create `backend/.env` with the following:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL - Local Development
FRONTEND_URL=http://localhost:3000

# Discord OAuth Configuration - Local Development
DISCORD_REDIRECT_URI=http://localhost:3001/auth/discord/callback

# Discord Bot API Configuration - Local Development
DISCORD_API_BASE_URL=http://localhost:8080/discord
# DISCORD_API_BASE_URL=https://api.rain.club/discord  # Uncomment for production

# Other environment variables...
# (See backend/env.example for complete list)
```

### 2. How It Works

- **Development Mode**: When `NODE_ENV=development`, the backend defaults to `http://localhost:3000` for `FRONTEND_URL` if not set.
- **Production Mode**: When `NODE_ENV=production`, it defaults to `https://www.rain.club` if `FRONTEND_URL` is not set.

## Discord Developer Portal Setup

### Add Redirect URIs

You need to add both redirect URIs in the Discord Developer Portal:

1. Go to: https://discord.com/developers/applications
2. Select your application (ID: `1413650646556479490`)
3. Go to **OAuth2** → **General**
4. Add these redirect URIs:
   - `http://localhost:3001/auth/discord/callback` (for local development)
   - `https://rainmakers-portal-backend.vercel.app/auth/discord/callback` (for production)

### Required Scopes

The application uses these Discord OAuth scopes:
- `identify` - Get user information
- `email` - Get user email
- `guilds.join` - Add user to Discord server

## Testing Local Setup

### 1. Start Backend

```bash
cd backend
npm install
npm run dev
```

The backend should start on `http://localhost:3001`

### 2. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend should start on `http://localhost:3000`

### 3. Test Discord Login

1. Open `http://localhost:3000`
2. Click "Login with Discord"
3. You should be redirected to Discord OAuth
4. After authorizing, you should be redirected back to `http://localhost:3000` with your token

### 4. Verify API Calls

Open browser DevTools → Network tab:
- API calls should go to `http://localhost:3001/api`
- Discord OAuth redirect should be `http://localhost:3001/auth/discord/callback`

## Production Deployment

### Frontend

For production, create `frontend/.env.production`:

```env
VITE_API_URL=https://rain.club/api
VITE_DISCORD_CLIENT_ID=1413650646556479490
# ... other production variables
```

Or set environment variables in your deployment platform (Vercel, Railway, etc.)

### Backend

For production, set these environment variables:

```env
NODE_ENV=production
FRONTEND_URL=https://www.rain.club
DISCORD_REDIRECT_URI=https://rainmakers-portal-backend.vercel.app/auth/discord/callback
DISCORD_API_BASE_URL=https://api.rain.club/discord
# ... other production variables
```

## Troubleshooting

### Issue: Discord OAuth redirects to production URL

**Solution**: Check that `VITE_API_URL` is set in `frontend/.env.local`:
```env
VITE_API_URL=http://localhost:3001/api
```

### Issue: API calls go to production

**Solution**: 
1. Verify `VITE_API_URL` is set in `frontend/.env.local`
2. Restart the frontend dev server after changing `.env.local`

### Issue: Backend redirects to production frontend

**Solution**: Check that `FRONTEND_URL` is set in `backend/.env`:
```env
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### Issue: Discord OAuth fails with "Invalid redirect URI"

**Solution**: 
1. Add `http://localhost:3001/auth/discord/callback` to Discord Developer Portal
2. Verify `DISCORD_REDIRECT_URI` in `backend/.env` matches exactly

## Environment Variable Priority

The application uses this priority order:

1. **Explicit environment variable** (e.g., `VITE_API_URL` in `.env.local`)
2. **Development/Production default** (e.g., `http://localhost:3001/api` in dev mode)
3. **Hardcoded production fallback** (e.g., `https://rain.club/api`)

This ensures that:
- Local development works out of the box
- Production works without changes
- You can override defaults with environment variables

## Quick Checklist

- [ ] Created `frontend/.env.local` with `VITE_API_URL=http://localhost:3001/api`
- [ ] Created `backend/.env` with `FRONTEND_URL=http://localhost:3000` and `NODE_ENV=development`
- [ ] Added `http://localhost:3001/auth/discord/callback` to Discord Developer Portal
- [ ] Restarted both frontend and backend servers after changing environment variables
- [ ] Verified API calls go to `http://localhost:3001/api` in browser DevTools
- [ ] Tested Discord login flow locally

