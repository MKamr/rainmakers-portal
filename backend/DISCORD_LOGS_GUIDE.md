# Discord Server & Role Assignment Logs Guide

This guide explains where to find logs for Discord server adding and role assignment operations.

## Where to Check Logs

### 1. **Local Development** (Running `npm run dev`)

If you're running the backend locally, logs appear in the **terminal/console** where you started the server.

**To view logs:**
1. Open the terminal where you ran `cd backend && npm run dev`
2. All Discord-related logs will appear in real-time in this terminal

**Example:**
```bash
# Start the backend
cd backend
npm run dev

# Logs will appear here:
DiscordBotService: Attempting to add role 1234567890 to user 9876543210
DiscordBotService: ✅ Successfully added role 1234567890 to member 9876543210
```

---

### 2. **Production (Railway/Heroku/Vercel/etc.)**

If your backend is deployed, logs are in your hosting platform's dashboard:

#### **Railway:**
1. Go to your Railway project dashboard
2. Click on your backend service
3. Click on the **"Logs"** tab
4. All Discord logs will appear here

#### **Heroku:**
```bash
# View logs via Heroku CLI
heroku logs --tail --app your-app-name

# Or view in Heroku Dashboard
# → Your App → More → View logs
```

#### **Vercel:**
1. Go to Vercel Dashboard
2. Select your project
3. Go to **"Deployments"**
4. Click on a deployment
5. Click **"Functions"** tab
6. View function logs

---

## What to Look For

### ✅ **Success Logs:**
Look for these messages when Discord operations succeed:

```
✅ Successfully added user {discordId} to Discord server with paid role
✅ Successfully added role {roleId} to member {discordId}
✅ Assigned paid role to user {discordId} after payment login
✅ Whitelisting user {userId} (subscription active)
```

### ⚠️ **Warning Logs:**
These indicate issues that don't fail but should be checked:

```
⚠️ No Discord ID available for user {userId}
⚠️ Failed to add user {discordId} to Discord server (returned false)
⚠️ Failed to assign paid role to user {discordId} (returned false). Check Discord Bot API configuration.
```

### ❌ **Error Logs:**
These indicate failures that need attention:

```
❌ Failed to add user {discordId} to Discord server: {error message}
❌ Missing required configuration: DISCORD_API_KEY, DISCORD_PAID_MEMBER_ROLE_ID
❌ Discord Bot API: No response received. Check if {api_url} is accessible.
❌ Discord Bot API HTTP Status: 401
❌ Discord Bot API error response: {error details}
```

---

## Key Log Messages to Search For

### When Payment Succeeds:
1. **Subscription Webhook:**
   ```
   StripeService: Attempting to add user {discordId} to Discord server with paid role...
   StripeService: Subscription status: active, Event type: invoice.payment_succeeded
   DiscordBotService: Attempting to add role {roleId} to user {discordId}
   DiscordBotService: ✅ Successfully added role {roleId} to member {discordId}
   ```

2. **Login After Payment:**
   ```
   Auth: Checking Discord role for user {discordId}...
   Auth: User {discordId} doesn't have paid role, adding now...
   Auth: ✅ Assigned paid role to user {discordId} after payment login
   ```

### When Discord ID is Missing:
```
StripeService: ⚠️ No Discord ID available for user {userId}
StripeService: Subscription metadata: {...}
StripeService: User Discord ID: none
StripeService: Will be added when they authenticate with Discord
```

### When Configuration is Missing:
```
DiscordBotService: Missing required configuration: DISCORD_API_KEY
DiscordBotService: Please add these to backend/.env: DISCORD_API_KEY=..., DISCORD_PAID_MEMBER_ROLE_ID=...
```

### When API Fails:
```
DiscordBotService: ❌ Error adding member {discordId} to server: {error}
DiscordBotService: HTTP Status: 401
DiscordBotService: Error response: {error details}
DiscordBotService: No response received. Is {api_url} accessible?
```

---

## Debugging Steps

### 1. **Check if Discord ID is Available:**
   Look for logs showing Discord ID extraction:
   ```
   StripeService: Discord ID for webhook processing: {
     fromSubscriptionMetadata: '1234567890',
     fromCustomerMetadata: '1234567890',
     fromUser: '1234567890',
     finalDiscordId: '1234567890'
   }
   ```

### 2. **Verify Configuration:**
   Look for these logs at startup or when Discord operations are attempted:
   ```
   DiscordBotService: API Base URL: https://api.rain.club/discord
   DiscordBotService: Has API Key: true
   DiscordBotService: Attempting to add role {roleId} to user {discordId}
   ```

### 3. **Check API Response:**
   Look for the actual API response:
   ```
   DiscordBotService: ✅ Successfully added role {roleId} to member {discordId}
   DiscordBotService: {response.data.success.message}
   ```

---

## Common Issues & Solutions

### Issue: "Missing required configuration"
**Solution:** Check your `backend/.env` file has:
- `DISCORD_API_KEY=your_key_here`
- `DISCORD_PAID_MEMBER_ROLE_ID=your_role_id_here`
- `DISCORD_API_BASE_URL=https://api.rain.club/discord`

### Issue: "No Discord ID available"
**Solution:** 
- Discord ID should be passed during payment (from Discord OAuth)
- Check if Discord ID is in Stripe subscription/customer metadata
- User will be added when they log in with Discord next time

### Issue: "No response received"
**Solution:**
- Check if `DISCORD_API_BASE_URL` is correct and accessible
- Verify the Discord Bot API service is running
- Check network/firewall settings

### Issue: "HTTP Status: 401" or "HTTP Status: 403"
**Solution:**
- Verify `DISCORD_API_KEY` is correct
- Check if the API key has expired or been revoked
- Ensure the API key has proper permissions

---

## Filtering Logs

### In Terminal (Linux/Mac):
```bash
# Show only Discord-related logs
npm run dev | grep -i discord

# Show only errors
npm run dev | grep -i "❌\|error"
```

### In Terminal (Windows PowerShell):
```powershell
# Show only Discord-related logs
npm run dev | Select-String -Pattern "discord" -CaseSensitive:$false

# Show only errors
npm run dev | Select-String -Pattern "❌|error" -CaseSensitive:$false
```

---

## Timeline of Logs During Payment

When a user completes payment, you should see logs in this order:

1. **Payment Webhook Received:**
   ```
   StripeService: Handling subscription webhook: invoice.payment_succeeded
   ```

2. **Discord ID Extraction:**
   ```
   StripeService: Discord ID for webhook processing: {...}
   ```

3. **Discord Role Assignment:**
   ```
   StripeService: Attempting to add user {discordId} to Discord server...
   DiscordBotService: Attempting to add role {roleId} to user {discordId}
   DiscordBotService: ✅ Successfully added role {roleId} to member {discordId}
   StripeService: ✅ Successfully added user {discordId} to Discord server with paid role
   ```

4. **User Whitelisting:**
   ```
   StripeService: ✅ Whitelisting user {userId} (subscription active)
   ```

5. **Login After Payment (if applicable):**
   ```
   Auth: Checking Discord role for user {discordId}...
   Auth: ✅ Assigned paid role to user {discordId} after payment login
   ```

---

## Need Help?

If you're seeing errors in the logs but can't resolve them:
1. Copy the full error message from the logs
2. Check the "Common Issues & Solutions" section above
3. Verify your environment variables are set correctly
4. Check that your Discord Bot API service is running and accessible

