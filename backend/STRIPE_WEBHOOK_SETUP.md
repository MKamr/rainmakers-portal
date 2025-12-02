# Stripe Webhook Setup Guide

This guide explains how to set up Stripe webhooks for both local development and production environments.

## Local Development (Using Stripe CLI)

For local development, use the Stripe CLI to forward webhooks to your local server. This allows you to test webhook handling without deploying your application.

### Step 1: Install Stripe CLI

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows:**
Download the installer from: https://github.com/stripe/stripe-cli/releases/latest

**Linux:**
```bash
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_*_linux_x86_64.tar.gz
tar -xvf stripe_*_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin
```

### Step 2: Login to Stripe

```bash
stripe login
```

This will open a browser window to authenticate with your Stripe account.

### Step 3: Start Webhook Forwarding

Start the Stripe CLI to forward webhooks to your local server:

```bash
stripe listen --forward-to localhost:3001/api/payments/webhook
```

**Important:** Make sure your backend server is running on port 3001 (or adjust the port accordingly).

### Step 4: Copy the Webhook Secret

The Stripe CLI will output something like:

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Copy this webhook secret and add it to your `.env` file:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 5: Restart Your Backend Server

After adding the webhook secret to your `.env` file, restart your backend server to load the new configuration.

### Testing Webhooks Locally

Once the Stripe CLI is running, you can trigger test webhook events:

```bash
# Test checkout session completed
stripe trigger checkout.session.completed

# Test subscription created
stripe trigger customer.subscription.created

# Test subscription updated
stripe trigger customer.subscription.updated

# Test subscription deleted
stripe trigger customer.subscription.deleted

# Test invoice payment failed
stripe trigger invoice.payment_failed
```

## Production Setup

For production, you need to create a webhook endpoint in the Stripe Dashboard.

### Step 1: Create Webhook Endpoint

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Enter your webhook URL:
   ```
   https://your-domain.com/api/payments/webhook
   ```
   Replace `your-domain.com` with your actual domain.

### Step 2: Select Events

Select the following events to listen for:

- `checkout.session.completed` - When a checkout session is completed
- `customer.subscription.created` - When a subscription is created
- `customer.subscription.updated` - When a subscription is updated
- `customer.subscription.deleted` - When a subscription is canceled/deleted
- `invoice.payment_failed` - When an invoice payment fails

### Step 3: Get the Webhook Secret

1. After creating the webhook endpoint, click on it
2. In the "Signing secret" section, click **"Reveal"**
3. Copy the webhook secret (starts with `whsec_...`)
4. Add it to your production environment variables:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret_here
```

### Step 4: Test the Webhook

1. In the Stripe Dashboard, go to your webhook endpoint
2. Click **"Send test webhook"**
3. Select an event type (e.g., `checkout.session.completed`)
4. Click **"Send test webhook"**
5. Check your server logs to verify the webhook was received and processed

## Webhook Endpoint

The webhook endpoint is located at:

```
POST /api/payments/webhook
```

This endpoint handles the following Stripe events:

- **checkout.session.completed**: Processes completed checkout sessions and creates/updates subscriptions
- **customer.subscription.created**: Creates subscription records in Firebase
- **customer.subscription.updated**: Updates subscription records in Firebase
- **customer.subscription.deleted**: Handles subscription cancellations
- **invoice.payment_failed**: Handles failed payment attempts

## Security

The webhook endpoint uses Stripe's webhook signature verification to ensure requests are authentic:

1. Stripe signs each webhook request with a secret key
2. The webhook secret (`STRIPE_WEBHOOK_SECRET`) is used to verify the signature
3. If the signature doesn't match, the request is rejected

**Important:** Never expose your webhook secret in client-side code or commit it to version control.

## Troubleshooting

### Webhook not received locally

1. Make sure Stripe CLI is running: `stripe listen --forward-to localhost:3001/api/payments/webhook`
2. Verify your backend server is running on the correct port
3. Check that `STRIPE_WEBHOOK_SECRET` is set in your `.env` file
4. Verify the webhook endpoint URL matches: `/api/payments/webhook`

### Webhook signature verification failed

1. Make sure `STRIPE_WEBHOOK_SECRET` is correct
2. For local development, use the secret from Stripe CLI output
3. For production, use the signing secret from Stripe Dashboard
4. Ensure you're using the correct secret for test/live mode

### Webhook received but not processed

1. Check your server logs for error messages
2. Verify the event type is one of the supported types
3. Check that your database connection is working
4. Verify Firebase credentials are configured correctly

## Additional Resources

- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Webhook Signature Verification](https://stripe.com/docs/webhooks/signatures)
- [Testing Webhooks Locally](https://stripe.com/docs/stripe-cli/webhooks)

