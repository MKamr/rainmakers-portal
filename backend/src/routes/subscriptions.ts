import express from 'express';
import { StripeService } from '../services/stripeService';
import { FirebaseService } from '../services/firebaseService';

const router = express.Router();

// CORS helper function for subscription routes
const checkAllowedOrigin = (origin: string | undefined): string | null => {
  if (!origin) return null;
  
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://rain.club',
    'https://www.rain.club',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://rainmakers-portal-backend-production.up.railway.app',
    'https://rainmakers-portal-backend.vercel.app'
  ];
  
  return allowedOrigins.includes(origin) ? origin : null;
};

// Handle CORS preflight requests for subscription routes
router.options('*', (req, res) => {
  const origin = checkAllowedOrigin(req.headers.origin);
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(204).end();
  } else {
    res.status(403).end();
  }
});

/**
 * Create setup intent for saving payment methods
 * POST /api/subscriptions/create-setup-intent
 */
router.post('/create-setup-intent', async (req, res) => {
  try {
    try {
      StripeService.getClient();
    } catch (initError: any) {
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
            return res.status(503).json({ error: initError.message || 'Payment service is not configured. Please contact support.' });
    }

    const { paymentMethodId, customerId, customerEmail, plan, discordId, discordUsername, hasTrial } = req.body;

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
      metadata,
      hasTrial ? 7 : undefined // 7-day trial if hasTrial is true
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
        res.status(400).json({ error: error.message || 'Failed to create subscription' });
  }
});

export default router;

