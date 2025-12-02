# Fixing Discord OAuth `invalid_client` Error

## Error
```
DiscordService: Failed to exchange code for token {
  error: { error: 'invalid_client' },
  status: 401,
  redirectUri: 'http://localhost:3001/auth/discord/callback',
  hasClientId: true,
  hasClientSecret: true
}
```

## Problem
The `invalid_client` error (401) means Discord is rejecting your client ID or client secret. This happens when:
1. The client ID doesn't exist or is incorrect
2. The client secret is incorrect or has been reset
3. The credentials don't match the Discord application
4. There are encoding issues (quotes, whitespace) in the `.env` file

## Solution

### Step 1: Verify Discord Developer Portal

1. **Go to Discord Developer Portal:**
   - Visit: https://discord.com/developers/applications
   - Log in with your Discord account

2. **Select Your Application:**
   - Find your application (Client ID: `1413650646556479490`)
   - Click on it to open the application settings

3. **Check Client ID:**
   - Go to **OAuth2** → **General**
   - Copy the **Client ID** (should be `1413650646556479490`)

4. **Check Client Secret:**
   - In the same **OAuth2** → **General** section
   - Look for **Client Secret**
   - If you see **"Reset Secret"** button, the secret has been reset
   - Click **"Reset Secret"** to generate a new one (you'll need to update your `.env` file)
   - Copy the **Client Secret** (starts with something like `w7t72_...`)

### Step 2: Update Backend `.env` File

1. **Open `backend/.env` file:**
   ```bash
   cd backend
   # Edit .env file
   ```

2. **Update Discord Credentials:**
   ```env
   # Discord OAuth Configuration
   DISCORD_CLIENT_ID=1413650646556479490
   DISCORD_CLIENT_SECRET=your_actual_client_secret_here
   ```

3. **Important:**
   - **NO quotes** around the values (remove `"` or `'` if present)
   - **NO trailing spaces** after the values
   - **NO extra characters** or line breaks
   - Copy the client secret exactly as shown in Discord Developer Portal

4. **Example of CORRECT format:**
   ```env
   DISCORD_CLIENT_ID=1413650646556479490
   DISCORD_CLIENT_SECRET=w7t72_e-27LUm8l49hjcha-En9vSzG6N
   ```

5. **Example of INCORRECT format:**
   ```env
   # ❌ Wrong - has quotes
   DISCORD_CLIENT_ID="1413650646556479490"
   DISCORD_CLIENT_SECRET="w7t72_e-27LUm8l49hjcha-En9vSzG6N"
   
   # ❌ Wrong - has trailing spaces
   DISCORD_CLIENT_ID=1413650646556479490 
   DISCORD_CLIENT_SECRET=w7t72_e-27LUm8l49hjcha-En9vSzG6N 
   
   # ❌ Wrong - has extra characters
   DISCORD_CLIENT_ID=1413650646556479490 # comment
   DISCORD_CLIENT_SECRET=w7t72_e-27LUm8l49hjcha-En9vSzG6N
   ```

### Step 3: Verify Redirect URI

1. **In Discord Developer Portal:**
   - Go to **OAuth2** → **General**
   - Scroll down to **Redirects**
   - Make sure these redirect URIs are added:
     - `http://localhost:3001/auth/discord/callback` (for local development)
     - `https://rain.club/auth/discord/callback` (for production, if different)

2. **Add Redirect URI if missing:**
   - Click **"Add Redirect"**
   - Enter: `http://localhost:3001/auth/discord/callback`
   - Click **"Save Changes"**

### Step 4: Restart Backend Server

1. **Stop the backend server:**
   - Press `Ctrl+C` in the terminal where the backend is running

2. **Restart the backend server:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Verify environment variables are loaded:**
   - Check the backend logs for any errors
   - The logs should show the client ID (first 8 characters) when exchanging tokens

### Step 5: Test Again

1. **Try logging in with Discord:**
   - Go to `http://localhost:3000`
   - Click "Login with Discord"
   - Check the backend logs for any errors

2. **Check backend logs:**
   - You should see: `DiscordService: Exchanging code for token`
   - The logs will show the client ID (first 8 characters) and lengths
   - If there's an error, it will provide more details

### Step 6: Common Issues

#### Issue: Client Secret Was Reset

**Solution:**
- If you reset the client secret in Discord Developer Portal, you MUST update `DISCORD_CLIENT_SECRET` in `backend/.env`
- The old client secret will no longer work
- Copy the new client secret exactly as shown

#### Issue: Wrong Application

**Solution:**
- Make sure you're using the correct Discord application
- Verify the Client ID matches: `1413650646556479490`
- Check that you're logged into the correct Discord account in Developer Portal

#### Issue: Environment Variables Not Loading

**Solution:**
1. Make sure `backend/.env` file exists
2. Make sure there are no syntax errors in `.env` file
3. Restart the backend server after changing `.env`
4. Check that you're in the `backend` directory when running the server

#### Issue: Quotes or Whitespace

**Solution:**
- The code now automatically trims whitespace and removes quotes
- But it's better to have clean values in `.env` file
- Remove any quotes (`"` or `'`) around values
- Remove any trailing spaces

### Step 7: Verify Credentials

You can verify your credentials are being read correctly by checking the backend logs:

```
DiscordService: Exchanging code for token {
  hasCode: true,
  redirectUri: 'http://localhost:3001/auth/discord/callback',
  clientId: '14136506...',  // Should show first 8 characters
  clientIdLength: 18,        // Should be 18 for Client ID
  clientSecretLength: 32     // Should be around 32 for Client Secret
}
```

If the lengths are wrong (e.g., 0 or very short), the credentials are not being read correctly.

### Step 8: Get New Client Secret (If Needed)

If you've lost your client secret or it's not working:

1. **Go to Discord Developer Portal:**
   - Visit: https://discord.com/developers/applications
   - Select your application
   - Go to **OAuth2** → **General**

2. **Reset Client Secret:**
   - Click **"Reset Secret"** button
   - Confirm the reset
   - Copy the new client secret immediately (it's only shown once)

3. **Update `.env` file:**
   - Update `DISCORD_CLIENT_SECRET` with the new value
   - Remove any quotes or whitespace
   - Save the file

4. **Restart backend server:**
   - Stop and restart the backend server
   - Test again

## Verification Checklist

- [ ] Discord Developer Portal shows Client ID: `1413650646556479490`
- [ ] Discord Developer Portal shows a valid Client Secret (not "Reset Secret" button)
- [ ] `backend/.env` has `DISCORD_CLIENT_ID=1413650646556479490` (no quotes, no spaces)
- [ ] `backend/.env` has `DISCORD_CLIENT_SECRET=...` (no quotes, no spaces, correct value)
- [ ] Redirect URI `http://localhost:3001/auth/discord/callback` is added in Discord Developer Portal
- [ ] Backend server has been restarted after updating `.env`
- [ ] Backend logs show the client ID (first 8 characters) when exchanging tokens
- [ ] No `invalid_client` error in backend logs

## Still Having Issues?

If you're still getting the `invalid_client` error after following these steps:

1. **Check backend logs:**
   - Look for the error message - it will show more details now
   - Check the client ID length and client secret length
   - Verify the redirect URI being used

2. **Verify in Discord Developer Portal:**
   - Make sure the Client ID and Client Secret match exactly
   - Make sure you're using the correct Discord application
   - Make sure the redirect URI is registered

3. **Test with a fresh client secret:**
   - Reset the client secret in Discord Developer Portal
   - Update `backend/.env` with the new secret
   - Restart the backend server
   - Test again

4. **Check for multiple `.env` files:**
   - Make sure you're editing the correct `.env` file in `backend/.env`
   - Check if there are other `.env` files that might be overriding values

## Additional Resources

- Discord Developer Portal: https://discord.com/developers/applications
- Discord OAuth2 Documentation: https://discord.com/developers/docs/topics/oauth2
- Discord Application Settings: https://discord.com/developers/applications/1413650646556479490/oauth2/general

