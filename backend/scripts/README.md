# Backend Scripts

This directory contains utility scripts for backend setup and maintenance.

## Available Scripts

### create-stripe-price.js

Creates a Stripe product and price for the monthly subscription ($49/month).

**Usage:**
```bash
npm run create-stripe-price
```

Or directly:
```bash
node scripts/create-stripe-price.js
```

**Requirements:**
- `STRIPE_SECRET_KEY` must be set in your `.env` file
- You must have the Stripe package installed (`npm install stripe`)

**What it does:**
1. Creates a Stripe product named "Monthly Subscription" with description "$49 per month subscription"
2. Creates a recurring price for $49/month (4900 cents)
3. Outputs the Price ID that you need to add to your `.env` file as `STRIPE_PRICE_ID_MONTHLY`

**Example output:**
```
🔄 Creating Stripe Product and Price for Monthly Subscription...

✅ Product created successfully!
   Product ID: prod_xxxxx
   Product Name: Monthly Subscription
   Product Description: $49 per month subscription

✅ Price created successfully!
   Price ID: price_xxxxx
   Amount: $49.00
   Currency: USD
   Interval: month

📋 Add this to your .env file:
────────────────────────────────────────────────────────────
STRIPE_PRICE_ID_MONTHLY=price_xxxxx
────────────────────────────────────────────────────────────
```

**Note:** 
- For test mode, use your test API key (`sk_test_...`)
- For production mode, use your live API key (`sk_live_...`)
- Make sure to create separate prices for test and production environments

