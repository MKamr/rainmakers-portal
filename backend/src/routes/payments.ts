import express from 'express';
import { StripeService } from '../services/stripeService';
import { FirebaseService } from '../services/firebaseService';
import { DiscordBotService } from '../services/discordBotService';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { canAccessPortal } from '../utils/subscriptionChecker';
import Stripe from 'stripe';

const router = express.Router();

// CORS helper function for payment routes
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

// Handle CORS preflight requests for payment routes
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

// Stripe will be initialized lazily when first needed
// This prevents errors if STRIPE_SECRET_KEY is not configured during development

/**
 * Create Stripe Payment Link
 * POST /api/payments/create-payment-link
 * 
 * Note: This endpoint can be called without authentication for new users.
 * For existing users, authentication is optional but recommended.
 */
router.post('/create-payment-link', async (req, res) => {
  try {
    if (!StripeService.isInitialized()) {
      return res.status(503).json({ error: 'Payment service is not configured. Please contact support.' });
    }

    const { plan, email, discordId } = req.body; // 'monthly', optional email/discordId for new users
    
    if (!plan || plan !== 'monthly') {
      return res.status(400).json({ error: 'Invalid plan. Only "monthly" plan is available' });
    }

    // Try to get authenticated user (optional - for existing users)
    let userId: string | null = null;
    let user = null;
    
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (token && process.env.JWT_SECRET) {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        if (decoded?.userId) {
          const decodedUserId = decoded.userId as string;
          userId = decodedUserId;
          user = await FirebaseService.getUserById(decodedUserId);
        }
      }
    } catch (error) {
      // Not authenticated - that's okay for new users
          }

    // Get price ID for monthly plan
    const priceId = process.env.STRIPE_PRICE_ID_MONTHLY;

    if (!priceId) {
      return res.status(500).json({ error: 'Stripe price ID not configured' });
    }

    // Handle authenticated users vs new users
    let customerId: string | undefined;
    let customerEmail: string | undefined;
    let customerName: string | undefined;
    let metadata: Record<string, string> = {};

    if (user) {
      // Authenticated user - use their info
      customerEmail = user.email;
      customerName = user.username;
      metadata = {
        userId: user.id,
        ...(user.discordId && { discordId: user.discordId }),
      };

      // Check if user already has a Stripe customer
      if (user.subscriptionId) {
        const existingSub = await FirebaseService.getSubscriptionById(user.subscriptionId);
        if (existingSub?.stripeCustomerId) {
          customerId = existingSub.stripeCustomerId;
        } else {
          const customer = await StripeService.createCustomer(customerEmail, customerName, metadata);
          customerId = customer.id;
        }
      } else {
        const customer = await StripeService.createCustomer(customerEmail, customerName, metadata);
        customerId = customer.id;
      }
    } else {
      // New user - email is optional, Stripe will collect it
      // Only create customer if email is provided (for Discord OAuth cases)
      if (email) {
        customerEmail = email;
        customerName = email.split('@')[0];
        metadata = {
          email,
          ...(discordId && { discordId }),
        };

        // Create new Stripe customer for new user (optional - Stripe Payment Link can create it too)
        if (customerEmail && customerName) {
          const customer = await StripeService.createCustomer(customerEmail, customerName, metadata);
          customerId = customer.id;
        }
      } else {
        // No email provided - Stripe Payment Link will collect it and create customer
        // Just pass Discord info in metadata if available
        metadata = {
          ...(discordId && { discordId }),
        };
      }
    }

    // Create payment link
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.rain.club';
    // Build success URL with Discord info if available
    const successParams = new URLSearchParams();
    successParams.set('payment', 'success');
    if (discordId) successParams.set('discordId', discordId);
    if (email || customerEmail) successParams.set('email', email || customerEmail);
    // Get username from user object or request body
    const username = user?.username || req.body.username || customerName;
    if (username) successParams.set('username', username);
    const successUrl = `${frontendUrl}/payment-success?${successParams.toString()}`;
    const cancelUrl = `${frontendUrl}/join?payment=canceled`;

    // Use userId from metadata if available, otherwise use email as identifier (or null if not provided)
    const sessionUserId = user?.id || email || customerEmail || null;

    // Add email and username to metadata for webhook processing
    // Email may not be available yet - Stripe will provide it in webhook
    const enhancedMetadata = {
      ...metadata,
      ...(email || customerEmail ? { email: email || customerEmail } : {}), // Only include email if available
      ...(username && { username, discordUsername: username }), // Include both for compatibility
    };

    // For authenticated users, use existing customer; for new users, let Payment Link create customer
    const paymentLink = await StripeService.createPaymentLink(
      priceId,
      sessionUserId,
      successUrl,
      cancelUrl,
      enhancedMetadata,
      user ? customerId : undefined // Only pass customerId if user is authenticated
    );

    res.json({
      paymentLinkId: paymentLink.id,
      url: paymentLink.url,
    });
  } catch (error: any) {
        // Provide more specific error messages
    let errorMessage = 'Failed to create checkout session. Please try again.';
    
    if (error.message?.includes('not configured') || error.message?.includes('STRIPE')) {
      errorMessage = 'Payment service is not configured. Please contact support.';
    } else if (error.message?.includes('customer')) {
      errorMessage = 'Error creating customer account. Please try again.';
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Create Stripe Checkout Session (legacy endpoint - kept for backwards compatibility)
 * POST /api/payments/create-checkout-session
 * 
 * @deprecated Use /create-payment-link instead
 */
router.post('/create-checkout-session', async (req, res) => {
  try {
    if (!StripeService.isInitialized()) {
      return res.status(503).json({ error: 'Payment service is not configured. Please contact support.' });
    }

    const { plan, email, discordId } = req.body;
    
    if (!plan || plan !== 'monthly') {
      return res.status(400).json({ error: 'Invalid plan. Only "monthly" plan is available' });
    }

    // Try to get authenticated user (optional - for existing users)
    let userId: string | null = null;
    let user = null;
    
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (token && process.env.JWT_SECRET) {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        if (decoded?.userId) {
          const decodedUserId = decoded.userId as string;
          userId = decodedUserId;
          user = await FirebaseService.getUserById(decodedUserId);
        }
      }
    } catch (error) {
      // Not authenticated - that's okay for new users
    }

    // Get price ID for monthly plan
    const priceId = process.env.STRIPE_PRICE_ID_MONTHLY;

    if (!priceId) {
      return res.status(500).json({ error: 'Stripe price ID not configured' });
    }

    // Handle authenticated users vs new users
    let customerId: string | undefined;
    let customerEmail: string | undefined;
    let customerName: string | undefined;
    let metadata: Record<string, string> = {};

    if (user) {
      // Authenticated user - use their info
      customerEmail = user.email;
      customerName = user.username;
      metadata = {
        userId: user.id,
        ...(user.discordId && { discordId: user.discordId }),
      };

      // Check if user already has a Stripe customer
      if (user.subscriptionId) {
        const existingSub = await FirebaseService.getSubscriptionById(user.subscriptionId);
        if (existingSub?.stripeCustomerId) {
          customerId = existingSub.stripeCustomerId;
        } else {
          const customer = await StripeService.createCustomer(customerEmail, customerName, metadata);
          customerId = customer.id;
        }
      } else {
        const customer = await StripeService.createCustomer(customerEmail, customerName, metadata);
        customerId = customer.id;
      }
    } else {
      // New user - email is optional, Stripe will collect it
      // Only create customer if email is provided (for Discord OAuth cases)
      if (email) {
        customerEmail = email;
        customerName = email.split('@')[0];
        metadata = {
          email,
          ...(discordId && { discordId }),
        };

        // Create new Stripe customer for new user (optional - Stripe Payment Link can create it too)
        if (customerEmail && customerName) {
          const customer = await StripeService.createCustomer(customerEmail, customerName, metadata);
          customerId = customer.id;
        }
      } else {
        // No email provided - Stripe Payment Link will collect it and create customer
        // Just pass Discord info in metadata if available
        metadata = {
          ...(discordId && { discordId }),
        };
      }
    }

    // For legacy checkout session, customerId is required
    // If no customerId was created, we can't use this endpoint - return error
    if (!customerId) {
      return res.status(400).json({ 
        error: 'Email is required for checkout sessions. Please provide your email address or use the payment link endpoint.' 
      });
    }

    // Create checkout session
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.rain.club';
    const successParams = new URLSearchParams();
    successParams.set('payment', 'success');
    if (discordId) successParams.set('discordId', discordId);
    if (email) successParams.set('email', email);
    const username = user?.username || req.body.username;
    if (username) successParams.set('username', username);
    const successUrl = `${frontendUrl}/payment-success?${successParams.toString()}`;
    const cancelUrl = `${frontendUrl}/join?payment=canceled`;

    const sessionUserId = user?.id || email || customerId;

    const session = await StripeService.createCheckoutSession(
      customerId,
      priceId,
      sessionUserId,
      successUrl,
      cancelUrl,
      metadata
    );

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    let errorMessage = 'Failed to create checkout session. Please try again.';
    
    if (error.message?.includes('not configured') || error.message?.includes('STRIPE')) {
      errorMessage = 'Payment service is not configured. Please contact support.';
    } else if (error.message?.includes('customer')) {
      errorMessage = 'Error creating customer account. Please try again.';
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Stripe Webhook Handler
 * POST /api/payments/webhook
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
        return res.status(500).send('Webhook secret not configured');
  }

  let event: Stripe.Event;

  try {
    event = StripeService.verifyWebhookSignature(req.body, sig, webhookSecret);
  } catch (err: any) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = session.subscription as string;
        
        // For Payment Links, get email from customer_details if not in metadata
        if (subscriptionId) {
          const subscription = await StripeService.getSubscription(subscriptionId);
          
          // If subscription metadata doesn't have email, get it from checkout session
          if (!subscription.metadata?.email && session.customer_details?.email) {
            subscription.metadata = subscription.metadata || {};
            subscription.metadata.email = session.customer_details.email;
          }
          
          await StripeService.handleSubscriptionWebhook(event, subscription);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await StripeService.handleSubscriptionWebhook(event, subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        
        if (subscriptionId) {
          const subscription = await StripeService.getSubscription(subscriptionId);
          await StripeService.handleSubscriptionWebhook(event, subscription);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        
        if (subscriptionId) {
          const subscription = await StripeService.getSubscription(subscriptionId);
          await StripeService.handleSubscriptionWebhook(event, subscription);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        // Payment succeeded - check if subscription needs to be activated
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const customerId = paymentIntent.customer as string;
        
        if (customerId) {
          // Get customer's subscriptions
          const subscriptions = await StripeService.getClient().subscriptions.list({
            customer: customerId,
            status: 'all',
            limit: 10
          });

          // Find the subscription that was just paid
          const paidSubscription = subscriptions.data.find(
            sub => sub.latest_invoice && 
            (sub.latest_invoice as Stripe.Invoice).payment_intent === paymentIntent.id
          );

          if (paidSubscription) {
            await StripeService.handleSubscriptionWebhook(event, paidSubscription);
          }
        }
        break;
      }

      default:
            }

    res.json({ received: true });
  } catch (error: any) {
        res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Get User Subscription Status
 * GET /api/payments/subscription
 */
router.get('/subscription', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const subscription = await FirebaseService.getSubscriptionByUserId(userId);

    if (!subscription) {
      return res.json({
        hasSubscription: false,
        canAccess: false,
      });
    }

    // Get latest subscription status from Stripe
    let currentPeriodStart = subscription.currentPeriodStart;
    let currentPeriodEnd = subscription.currentPeriodEnd;
    
    try {
      const stripeSubscription = await StripeService.getSubscription(subscription.stripeSubscriptionId);
      
      // Always use dates from Stripe if available (they're the source of truth)
      if (stripeSubscription.current_period_start) {
        currentPeriodStart = FirebaseService.timestampFromDate(
          new Date(stripeSubscription.current_period_start * 1000)
        );
      } else {
              }
      
      if (stripeSubscription.current_period_end) {
        currentPeriodEnd = FirebaseService.timestampFromDate(
          new Date(stripeSubscription.current_period_end * 1000)
        );
      } else {
              }
      
      // Update local subscription with latest data from Stripe
      const updateData: any = {
        updatedAt: FirebaseService.timestampNow(),
      };
      
      // Update status if changed
      if (stripeSubscription.status !== subscription.status) {
        updateData.status = stripeSubscription.status as any;
        subscription.status = stripeSubscription.status as any;
      }
      
      // Always update period dates if we got them from Stripe (even if they exist locally)
      // This ensures they're always in sync
      if (currentPeriodStart) {
        updateData.currentPeriodStart = currentPeriodStart;
      }
      
      if (currentPeriodEnd) {
        updateData.currentPeriodEnd = currentPeriodEnd;
      }
      
      // Always update to ensure dates are synced
      await FirebaseService.updateSubscription(subscription.id, updateData);
          } catch (error) {
            // Continue with local subscription data
    }

    const canAccess = canAccessPortal(subscription);

    // Log what we're returning for debugging
    res.json({
      hasSubscription: true,
      canAccess,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: subscription.plan,
        currentPeriodStart: currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: subscription.canceledAt,
        gracePeriodEnd: subscription.gracePeriodEnd,
      },
    });
  } catch (error: any) {
        res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

/**
 * Cancel Subscription
 * POST /api/payments/cancel
 */
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { cancelAtPeriodEnd = true } = req.body;

    const subscription = await FirebaseService.getSubscriptionByUserId(userId);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Cancel in Stripe
    await StripeService.cancelSubscription(subscription.stripeSubscriptionId, cancelAtPeriodEnd);

    // Update in Firebase
    await FirebaseService.updateSubscription(subscription.id, {
      cancelAtPeriodEnd: cancelAtPeriodEnd,
      canceledAt: cancelAtPeriodEnd ? undefined : FirebaseService.timestampNow(),
      status: cancelAtPeriodEnd ? subscription.status : 'canceled',
      updatedAt: FirebaseService.timestampNow(),
    });

    // If immediate cancellation, remove from Discord server
    if (!cancelAtPeriodEnd) {
      const user = await FirebaseService.getUserById(userId);
      if (user && user.discordId) {
        try {
          await DiscordBotService.removeMemberFromServer(user.discordId);
        } catch (error) {
                  }
      }
    }

    res.json({
      success: true,
      message: cancelAtPeriodEnd 
        ? 'Subscription will be canceled at the end of the billing period'
        : 'Subscription canceled immediately',
    });
  } catch (error: any) {
        res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * Get Stripe Customer Portal URL
 * GET /api/payments/customer-portal
 */
router.get('/customer-portal', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const subscription = await FirebaseService.getSubscriptionByUserId(userId);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://www.rain.club';
    const returnUrl = `${frontendUrl}/settings`;

    const session = await StripeService.createCustomerPortalSession(
      subscription.stripeCustomerId,
      returnUrl
    );

    res.json({
      url: session.url,
    });
  } catch (error: any) {
        res.status(500).json({ error: 'Failed to create customer portal session' });
  }
});

/**
 * Admin Refund Endpoint
 * POST /api/payments/admin/refund
 */
router.post('/admin/refund', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { paymentIntentId, amount, reason, userId, metadata } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'paymentIntentId is required' });
    }

    // Get user if provided for metadata
    let user = null;
    if (userId) {
      user = await FirebaseService.getUserById(userId);
    }

    // Create refund
    const refund = await StripeService.createRefund(
      paymentIntentId,
      amount,
      reason,
      {
        ...metadata,
        refundedBy: req.user!.id,
        refundedByUsername: req.user!.username,
        userId: user?.id || userId || 'unknown',
      }
    );

    // If user has subscription, cancel it
    if (user?.subscriptionId) {
      const subscription = await FirebaseService.getSubscriptionById(user.subscriptionId);
      if (subscription) {
        // Cancel subscription
        await StripeService.cancelSubscription(subscription.stripeSubscriptionId, false);
        await FirebaseService.updateSubscription(subscription.id, {
          status: 'canceled',
          canceledAt: FirebaseService.timestampNow(),
          cancelAtPeriodEnd: false,
          updatedAt: FirebaseService.timestampNow(),
        });

        // Remove from Discord server
        if (user.discordId) {
          try {
            await DiscordBotService.removeMemberFromServer(user.discordId);
          } catch (error) {
                      }
        }
      }
    }

    res.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        status: refund.status,
        reason: refund.reason,
      },
    });
  } catch (error: any) {
        res.status(500).json({ 
      error: 'Failed to process refund',
      details: error.message 
    });
  }
});

export default router;

