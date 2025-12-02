# Stripe Frontend Setup Guide

This guide explains how to configure Stripe on the frontend for the payment system.

## Environment Variables

The frontend requires Stripe publishable keys to be configured in your `.env` file.

### Test Mode (Development)

For local development, use your Stripe test publishable key:

```env
VITE_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**How to get your test publishable key:**
1. Go to [Stripe Dashboard > API Keys (Test Mode)](https://dashboard.stripe.com/test/apikeys)
2. Copy the **Publishable key** (starts with `pk_test_...`)
3. Add it to your `.env` file

### Production Mode

For production, use your Stripe live publishable key:

```env
VITE_STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**How to get your live publishable key:**
1. Go to [Stripe Dashboard > API Keys (Live Mode)](https://dashboard.stripe.com/apikeys)
2. Switch to **Live mode** (toggle in the top right)
3. Copy the **Publishable key** (starts with `pk_live_...`)
4. Add it to your production environment variables

## Setup Steps

### 1. Create `.env` file

If you don't have a `.env` file in the `frontend` directory, create one:

```bash
cd frontend
cp env.example .env
```

### 2. Add Stripe Publishable Key

Open `frontend/.env` and add your Stripe test publishable key:

```env
VITE_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_your_test_publishable_key_here
```

### 3. Restart Development Server

After adding the environment variable, restart your development server:

```bash
npm run dev
```

**Important:** Vite requires a server restart to pick up new environment variables.

## Verification

To verify that Stripe is configured correctly:

1. Start your frontend development server
2. Navigate to the payment page
3. You should see the payment form with Stripe's Payment Element
4. If you see "Stripe is not configured. Please contact support.", check:
   - Your `.env` file exists in the `frontend` directory
   - `VITE_STRIPE_PUBLISHABLE_KEY_TEST` is set correctly
   - You've restarted the development server after adding the variable

## Troubleshooting

### "Stripe is not configured. Please contact support."

**Possible causes:**
1. Environment variable not set in `.env` file
2. Wrong variable name (should be `VITE_STRIPE_PUBLISHABLE_KEY_TEST`)
3. Development server not restarted after adding the variable
4. `.env` file is in the wrong location (should be in `frontend/` directory)

**Solution:**
1. Check that `frontend/.env` exists
2. Verify the variable name is exactly: `VITE_STRIPE_PUBLISHABLE_KEY_TEST`
3. Make sure the value starts with `pk_test_...`
4. Restart your development server
5. Clear your browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Environment Variable Not Loading

**Vite Environment Variable Requirements:**
- Variables must start with `VITE_` to be exposed to the frontend
- Variables are only available at build time, not runtime
- Server must be restarted after changing `.env` file

### Check Current Configuration

You can verify which Stripe key is being used by checking the browser console:
- Open browser DevTools (F12)
- Go to Console tab
- Look for any Stripe-related error messages
- The PaymentForm component will log an error if the key is missing

## Security Notes

⚠️ **Important Security Information:**

- **Publishable keys are safe to expose** in client-side code
- They are designed to be public and are used in your frontend code
- Never commit your `.env` file to version control
- Use test keys for development and live keys only for production
- The secret key (`sk_...`) should **NEVER** be used in the frontend

## Additional Resources

- [Stripe API Keys Documentation](https://stripe.com/docs/keys)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Stripe Payment Element](https://stripe.com/docs/payments/payment-element)

