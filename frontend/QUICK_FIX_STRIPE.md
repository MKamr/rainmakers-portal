# Quick Fix: "Stripe is not configured" Error

## Problem
You're seeing the error: "Stripe is not configured. Please contact support."

## Solution

### Option 1: Quick Fix (Add to existing .env file)

1. Open `frontend/.env` in your editor
2. Add these lines at the end of the file:

```env
# Stripe Configuration (Test Mode)
VITE_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_51SQD23D9ZJ3UMZ8opVvMeypD6UIczbgUmFp6NRMpfQAoRxionICLLGeTQdY2zA9vuoEK9qZzjKJt8bfYVe5NEqxK00NgOmmNAr
```

3. **IMPORTANT:** Restart your development server:
   - Stop the server (press `Ctrl+C`)
   - Run `npm run dev` again

### Option 2: Use PowerShell Script (Windows)

Run this from the `frontend` directory:

```powershell
.\add-stripe-key.ps1
```

Then restart your dev server.

### Option 3: Manual Copy from env.example

1. Check if `frontend/.env` exists
2. If it doesn't have the Stripe key, copy it from `env.example`:
   ```powershell
   # From frontend directory
   Get-Content env.example | Select-String "STRIPE" | Add-Content .env
   ```
3. Restart your dev server

## Verify It's Working

1. After adding the key and restarting the server
2. Open your browser's Developer Console (F12)
3. Go to the payment page
4. Check the console - you should NOT see any Stripe configuration errors
5. You should see the payment form instead of the error message

## Still Not Working?

### Check 1: Environment Variable Name
Make sure the variable name is exactly:
```
VITE_STRIPE_PUBLISHABLE_KEY_TEST
```
(Note: Must start with `VITE_` for Vite to expose it to the frontend)

### Check 2: Server Restart
**Vite requires a server restart** after changing `.env` file. Simply saving the file is not enough!

### Check 3: File Location
The `.env` file must be in the `frontend/` directory (same level as `package.json`)

### Check 4: Get Your Own Key
If the provided test key doesn't work, get your own:
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy the **Publishable key** (starts with `pk_test_...`)
3. Replace the value in your `.env` file

### Check 5: Browser Cache
Sometimes you need to clear browser cache:
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or clear browser cache completely

## Need Help?

If you're still having issues:
1. Check the browser console for error messages
2. Verify your `.env` file has the correct format (no quotes around the value)
3. Make sure there are no extra spaces or characters
4. Restart your dev server after making changes

