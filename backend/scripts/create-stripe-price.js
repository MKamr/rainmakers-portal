/**
 * Script to create Stripe Product and Price for Monthly Subscription
 * 
 * Usage:
 *   node scripts/create-stripe-price.js
 * 
 * Make sure STRIPE_SECRET_KEY is set in your environment or .env file
 */

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createMonthlyPrice = async () => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ Error: STRIPE_SECRET_KEY is not set in environment variables');
      console.log('\nPlease set STRIPE_SECRET_KEY in your .env file:');
      console.log('STRIPE_SECRET_KEY=sk_test_...');
      process.exit(1);
    }

    console.log('🔄 Creating Stripe Product and Price for Monthly Subscription...\n');

    // First create the product
    const product = await stripe.products.create({
      name: 'Monthly Subscription',
      description: '$49 per month subscription',
    });

    console.log('✅ Product created successfully!');
    console.log('   Product ID:', product.id);
    console.log('   Product Name:', product.name);
    console.log('   Product Description:', product.description);
    console.log('');

    // Then create the price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 4900, // $49.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
    });

    console.log('✅ Price created successfully!');
    console.log('   Price ID:', price.id);
    console.log('   Amount: $' + (price.unit_amount / 100).toFixed(2));
    console.log('   Currency:', price.currency.toUpperCase());
    console.log('   Interval:', price.recurring.interval);
    console.log('');

    console.log('📋 Add this to your .env file:');
    console.log('─'.repeat(60));
    console.log(`STRIPE_PRICE_ID_MONTHLY=${price.id}`);
    console.log('─'.repeat(60));
    console.log('');

    // If STRIPE_PRICE_ID_MONTHLY is not set, offer to update .env
    if (!process.env.STRIPE_PRICE_ID_MONTHLY) {
      console.log('💡 Tip: You can add this to your .env file now, or run this script again later.');
    } else if (process.env.STRIPE_PRICE_ID_MONTHLY !== price.id) {
      console.log('⚠️  Warning: STRIPE_PRICE_ID_MONTHLY in your .env file is different from the newly created price ID.');
      console.log('   Current value:', process.env.STRIPE_PRICE_ID_MONTHLY);
      console.log('   New value:', price.id);
      console.log('   Please update your .env file with the new Price ID.');
    } else {
      console.log('✅ STRIPE_PRICE_ID_MONTHLY in your .env file matches the newly created price ID!');
    }

    console.log('');
    return price.id;
  } catch (error) {
    console.error('❌ Error creating price:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('\n💡 Make sure your STRIPE_SECRET_KEY is correct and has the right permissions.');
    } else if (error.type === 'StripeInvalidRequestError') {
      console.error('\n💡 Check that your Stripe API key has access to create products and prices.');
    }
    process.exit(1);
  }
};

// Run the script
createMonthlyPrice()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

