# Payment Link Setup Guide

This application uses **Stripe Payment Links** for subscription payments. This guide explains how they work and what you need to configure.

## What are Payment Links?

Payment Links are Stripe-hosted payment pages that are created dynamically via the Stripe API. Unlike static Payment Links created in the Stripe Dashboard, these are generated on-demand when a user wants to subscribe.

## How It Works

1. **User initiates payment**: User fills out the payment form on your frontend
2. **Backend creates Payment Link**: The `/api/payments/create-payment-link` endpoint creates a dynamic Payment Link via Stripe API
3. **User redirects to Stripe**: User is redirected to the Stripe-hosted Payment Link URL
4. **User completes payment**: User enters payment information on Stripe's secure page
5. **Stripe creates Checkout Session**: Behind the scenes, Stripe creates a Checkout Session
6. **Webhook fires**: Stripe sends `checkout.session.completed` webhook event
7. **Backend processes webhook**: Your webhook handler creates/updates the user subscription

## Setup Requirements

### 1. Environment Variables

Make sure these are set in your `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_...  # or sk_live_... for production
STRIPE_PRICE_ID_MONTHLY=price_...  # Your monthly subscription price ID
STRIPE_WEBHOOK_SECRET=whsec_...  # Your webhook signing secret
FRONTEND_URL=https://www.rain.club  # Your frontend URL for redirects
```

### 2. Stripe Price ID

You need to have a Price created in Stripe for your monthly subscription:

1. Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
2. Create or select your subscription product
3. Add a recurring price (monthly, $49)
4. Copy the Price ID (starts with `price_...`)
5. Add it to your `.env` as `STRIPE_PRICE_ID_MONTHLY`

### 3. Webhook Configuration

**IMPORTANT**: You do NOT need to create a Payment Link in the Stripe Dashboard. The Payment Links are created dynamically via API.

However, you DO need to configure the webhook endpoint in Stripe Dashboard:

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Enter your webhook URL:
   ```
   https://rainmakers-portal-backend.vercel.app/api/payments/webhook
   ```
   (Or your production backend URL)

4. Select these events:
   - `checkout.session.completed` ✅ **REQUIRED** (handles Payment Link completions)
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. Copy the webhook signing secret (starts with `whsec_...`)
6. Add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

## API Endpoints

### Create Payment Link

**POST** `/api/payments/create-payment-link`

Request body:
```json
{
  "plan": "monthly",
  "email": "user@example.com",  // Optional for authenticated users
  "discordId": "123456789",      // Optional
  "username": "johndoe"          // Optional
}
```

Response:
```json
{
  "paymentLinkId": "plink_...",
  "url": "https://buy.stripe.com/..."  // Redirect user to this URL
}
```

## Testing Payment Links

### Local Development

1. Start your backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start Stripe CLI webhook forwarding:
   ```bash
   stripe listen --forward-to localhost:3001/api/payments/webhook
   ```

3. Copy the webhook secret from CLI output to your `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

4. Restart your backend server

5. Test the payment flow:
   - Go to your frontend payment page
   - Enter email and click "Subscribe"
   - You'll be redirected to Stripe test Payment Link
   - Use test card: `4242 4242 4242 4242`
   - Complete the payment
   - You should be redirected back to your success page

### Production Testing

1. Use Stripe test mode to verify the flow
2. Check webhook logs in Stripe Dashboard
3. Verify subscription appears in your Firebase database
4. Test with real payment methods in test mode

## How Payment Links Differ from Static Links

| Feature | Static Payment Link (Dashboard) | Dynamic Payment Link (API) |
|---------|--------------------------------|---------------------------|
| Creation | Created in Stripe Dashboard | Created via API call |
| Metadata | Limited customization | Full metadata support |
| Customer info | Manual entry | Pre-filled from your app |
| User experience | Generic Stripe page | Custom redirect URLs |
| Integration | Less flexible | Fully integrated |

## Troubleshooting

### Payment Link creation fails

- Check `STRIPE_SECRET_KEY` is set correctly
- Verify `STRIPE_PRICE_ID_MONTHLY` exists and is correct
- Check backend logs for error details

### Webhook not processing

- Verify webhook endpoint URL is correct in Stripe Dashboard
- Check `STRIPE_WEBHOOK_SECRET` matches the signing secret
- Ensure webhook events are selected (especially `checkout.session.completed`)
- Check backend logs for webhook processing errors

### User not redirected back

- Verify `FRONTEND_URL` environment variable is set
- Check the success URL in Payment Link metadata
- Ensure redirect URL matches your frontend domain

## Benefits of Dynamic Payment Links

✅ **No manual Payment Link creation** - Generated automatically
✅ **Full metadata support** - Pass user info, Discord IDs, etc.
✅ **Better user experience** - Seamless redirects
✅ **Automatic customer creation** - Stripe handles customer records
✅ **Same webhook handling** - Uses existing `checkout.session.completed` webhook

## Additional Resources

- [Stripe Payment Links API](https://stripe.com/docs/api/payment_links)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Payment Links vs Checkout](https://stripe.com/docs/payments/payment-links)

