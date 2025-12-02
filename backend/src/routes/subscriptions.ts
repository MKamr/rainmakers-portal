import express from 'express';
import { StripeService } from '../services/stripeService';
import { FirebaseService } from '../services/firebaseService';

const router = express.Router();

/**
 * Create setup intent for saving payment methods
 * POST /api/subscriptions/create-setup-intent
 */
router.post('/create-setup-intent', async (req, res) => {
  try {
    try {
      StripeService.getClient();
    } catch (initError: any) {
      console.error('Stripe initialization failed:', initError);
      return res.status(503).json({ error: initError.message || 'Payment service is not configured. Please contact support.' });
    }

    const { customerEmail, discordId, discordUsername } = req.body;

    if (!customerEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Create or retrieve customer
    let customer;
    const existingCustomers = await StripeService.getClient().customers.list({
      email: customerEmail,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      // Update customer metadata if Discord info is provided
      if (discordId || discordUsername) {
        const updateMetadata: Record<string, string> = {};
        if (discordId) {
          updateMetadata.discordId = discordId;
        }
        if (discordUsername) {
          updateMetadata.username = discordUsername;
        }
        await StripeService.getClient().customers.update(customer.id, {
          metadata: { ...customer.metadata, ...updateMetadata }
        });
      }
    } else {
      const metadata: Record<string, string> = {};
      if (discordId) {
        metadata.discordId = discordId;
      }
      if (discordUsername) {
        metadata.username = discordUsername;
      }
      customer = await StripeService.createCustomer(customerEmail, undefined, metadata);
    }

    // Create setup intent
    const metadata: Record<string, string> = {};
    if (discordId) {
      metadata.discordId = discordId;
    }
    if (discordUsername) {
      metadata.username = discordUsername;
    }
    if (customerEmail) {
      metadata.email = customerEmail;
    }

    const setupIntent = await StripeService.createSetupIntent(customer.id, metadata);

    res.json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
    });
  } catch (error: any) {
    console.error('Error creating setup intent:', error);
    res.status(400).json({ error: error.message || 'Failed to create setup intent' });
  }
});

/**
 * Create subscription with existing or new payment method
 * POST /api/subscriptions/create-subscription
 */
router.post('/create-subscription', async (req, res) => {
  try {
    try {
      StripeService.getClient();
    } catch (initError: any) {
      console.error('Stripe initialization failed:', initError);
      return res.status(503).json({ error: initError.message || 'Payment service is not configured. Please contact support.' });
    }

    const { paymentMethodId, customerId, customerEmail, plan, discordId, discordUsername } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Payment method ID is required' });
    }

    if (!plan || plan !== 'monthly') {
      return res.status(400).json({ error: 'Invalid plan. Only "monthly" plan is available' });
    }

    // Get price ID for monthly plan
    const priceId = process.env.STRIPE_PRICE_ID_MONTHLY;

    if (!priceId) {
      return res.status(500).json({ error: 'Stripe price ID not configured' });
    }

    let customer;

    if (customerId) {
      // Use existing customer
      customer = await StripeService.getClient().customers.retrieve(customerId) as any;
    } else if (customerEmail) {
      // Create new customer or retrieve existing
      const existingCustomers = await StripeService.getClient().customers.list({
        email: customerEmail,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
        // Update customer metadata if Discord info is provided
        if (discordId || discordUsername) {
          const updateMetadata: Record<string, string> = {};
          if (discordId) {
            updateMetadata.discordId = discordId;
          }
          if (discordUsername) {
            updateMetadata.username = discordUsername;
          }
          await StripeService.getClient().customers.update(customer.id, {
            metadata: { ...customer.metadata, ...updateMetadata }
          });
        }
      } else {
        const metadata: Record<string, string> = {};
        if (discordId) {
          metadata.discordId = discordId;
        }
        if (discordUsername) {
          metadata.username = discordUsername;
        }
        customer = await StripeService.createCustomer(customerEmail, undefined, metadata);
      }
    } else {
      return res.status(400).json({ error: 'Either customerId or customerEmail is required' });
    }

    // Try to get authenticated user (optional)
    let userId: string | null = null;
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (token && process.env.JWT_SECRET) {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        if (decoded?.userId) {
          userId = decoded.userId as string;
        }
      }
    } catch (error) {
      // Not authenticated - that's okay for new users
    }

    // Prepare metadata - include all Discord info for webhook to create user
    const metadata: Record<string, string> = {};
    if (userId) {
      metadata.userId = userId;
    }
    if (discordId) {
      metadata.discordId = discordId;
    }
    if (discordUsername) {
      metadata.username = discordUsername;
    }
    if (customerEmail) {
      metadata.email = customerEmail;
    }

    // Create subscription with payment method
    const subscription = await StripeService.createSubscriptionWithPaymentMethod(
      customer.id,
      priceId,
      paymentMethodId,
      metadata
    );

    // Get payment intent client secret if available
    const paymentIntent = subscription.latest_invoice 
      ? (subscription.latest_invoice as any).payment_intent 
      : null;

    res.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret || null,
      status: subscription.status,
      customerId: customer.id,
    });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    res.status(400).json({ error: error.message || 'Failed to create subscription' });
  }
});

export default router;

