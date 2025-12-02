import Stripe from 'stripe';
import { FirebaseService } from './firebaseService';
import { DiscordBotService } from './discordBotService';
import { DiscordService } from './discordService';
import { Subscription } from './firebaseService';

export class StripeService {
  private static stripe: Stripe;
  private static readonly GRACE_PERIOD_DAYS = 2;

  /**
   * Initialize Stripe client
   */
  static initialize(): void {
    const secretKey = process.env.STRIPE_SECRET_KEY || '';

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    });

    console.log('✅ Stripe initialized');
    console.log(`🔧 Stripe Mode: ${secretKey.startsWith('sk_test_') ? 'TEST' : 'LIVE'}`);
  }

  /**
   * Check if Stripe is initialized
   */
  static isInitialized(): boolean {
    return !!this.stripe;
  }

  /**
   * Get Stripe client instance
   */
  static getClient(): Stripe {
    if (!this.stripe) {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.');
      }
      this.initialize();
    }
    return this.stripe;
  }

  /**
   * Create a Stripe customer
   */
  static async createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<Stripe.Customer> {
    const client = this.getClient();
    
    return await client.customers.create({
      email,
      name,
      metadata: {
        ...metadata,
        createdVia: 'rainmakers-portal'
      }
    });
  }

  /**
   * Create a checkout session for subscription
   */
  static async createCheckoutSession(
    customerId: string,
    priceId: string,
    userId: string,
    successUrl: string,
    cancelUrl: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.Checkout.Session> {
    const client = this.getClient();

    const sessionMetadata: Record<string, string> = {
      userId,
      ...metadata,
    };

    return await client.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic'
        }
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: sessionMetadata,
      subscription_data: {
        metadata: sessionMetadata,
      },
      allow_promotion_codes: true,
    });
  }

  /**
   * Create a setup intent for saving payment methods
   */
  static async createSetupIntent(
    customerId: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.SetupIntent> {
    const client = this.getClient();

    return await client.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'], // Removed 'link' to disable Stripe Link optional section
      metadata: {
        ...metadata,
        createdVia: 'rainmakers-portal'
      }
    });
  }

  /**
   * Create a subscription with a payment method
   */
  static async createSubscriptionWithPaymentMethod(
    customerId: string,
    priceId: string,
    paymentMethodId: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.Subscription> {
    const client = this.getClient();

    // Attach payment method to customer
    await client.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set as default payment method
    await client.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Ensure customer metadata has Discord info if provided in subscription metadata
    if (metadata?.discordId || metadata?.username) {
      try {
        const customer = await client.customers.retrieve(customerId);
        if (typeof customer !== 'string' && !customer.deleted) {
          const customerMetadata: Record<string, string> = { ...customer.metadata };
          if (metadata.discordId && !customerMetadata.discordId) {
            customerMetadata.discordId = metadata.discordId;
          }
          if (metadata.username && !customerMetadata.username) {
            customerMetadata.username = metadata.username;
          }
          if (metadata.email && !customerMetadata.email) {
            customerMetadata.email = metadata.email;
          }
          await client.customers.update(customerId, {
            metadata: customerMetadata
          });
          console.log(`StripeService: Updated customer ${customerId} metadata with Discord info for webhook processing`);
        }
      } catch (error) {
        console.error(`StripeService: Failed to update customer metadata:`, error);
        // Continue anyway - subscription metadata should have it
      }
    }

    // Create subscription
    const subscription = await client.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        ...metadata,
        createdVia: 'rainmakers-portal'
      }
    });
    
    console.log(`StripeService: Created subscription ${subscription.id} with metadata:`, subscription.metadata);
    
    return subscription;
  }

  /**
   * Create a customer portal session
   */
  static async createCustomerPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    const client = this.getClient();

    return await client.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  /**
   * Get subscription by ID
   */
  static async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const client = this.getClient();
    return await client.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<Stripe.Subscription> {
    const client = this.getClient();

    if (cancelAtPeriodEnd) {
      return await client.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      return await client.subscriptions.cancel(subscriptionId);
    }
  }

  /**
   * Create a refund for a payment intent or charge
   */
  static async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: Stripe.RefundCreateParams.Reason,
    metadata?: Record<string, string>
  ): Promise<Stripe.Refund> {
    const client = this.getClient();

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      metadata: {
        ...metadata,
        refundedVia: 'rainmakers-portal-admin'
      }
    };

    if (amount) {
      refundParams.amount = amount;
    }

    if (reason) {
      refundParams.reason = reason;
    }

    return await client.refunds.create(refundParams);
  }

  /**
   * Process subscription webhook event
   */
  static async handleSubscriptionWebhook(
    event: Stripe.Event,
    subscription: Stripe.Subscription
  ): Promise<void> {
    let userId = subscription.metadata?.userId;
    const email = subscription.metadata?.email;
    let discordId = subscription.metadata?.discordId;
    let discordUsername = subscription.metadata?.username || subscription.metadata?.discordUsername || '';
    
    // If no userId, try to find user by Discord ID first (most reliable)
    if (!userId && discordId) {
      try {
        const user = await FirebaseService.getUserByDiscordId(discordId);
        if (user) {
          userId = user.id;
          console.log(`StripeService: Found user by Discord ID ${discordId}, linking subscription to userId ${userId}`);
        }
      } catch (error) {
        console.log(`StripeService: Could not find user by Discord ID ${discordId}`);
      }
    }
    
    // If no userId, try to find user by email
    if (!userId && email) {
      try {
        const user = await FirebaseService.getUserByEmail(email);
        if (user) {
          userId = user.id;
          console.log(`StripeService: Found user by email ${email}, linking subscription to userId ${userId}`);
        }
      } catch (error) {
        console.log(`StripeService: Could not find user by email ${email}`);
      }
    }
    
    // If still no userId but we have Discord ID and subscription is active/trialing or payment succeeded, create user
    // Check if this is a payment success event (subscription might be incomplete but payment confirmed)
    const isPaymentSuccessEvent = event.type === 'invoice.payment_succeeded' || event.type === 'payment_intent.succeeded';
    const shouldCreateUser = subscription.status === 'active' || 
                             subscription.status === 'trialing' || 
                             (isPaymentSuccessEvent && subscription.status === 'incomplete');
    
    if (!userId && shouldCreateUser && discordId) {
      try {
        // Get customer from Stripe to get email and metadata
        let customerEmail = email;
        let customer: Stripe.Customer | null = null;
        
        if (subscription.customer) {
          try {
            const customerData = await this.getClient().customers.retrieve(subscription.customer as string);
            if (typeof customerData !== 'string' && !customerData.deleted) {
              customer = customerData;
              // Get email from customer if not in metadata
              if (!customerEmail && customer.email) {
                customerEmail = customer.email;
              }
              // Get Discord ID from customer metadata as fallback
              if (!discordId && customer.metadata?.discordId) {
                discordId = customer.metadata.discordId;
              }
              // Get Discord username from customer metadata if not in subscription metadata
              if (!discordUsername && customer.metadata?.username) {
                discordUsername = customer.metadata.username;
              }
            }
          } catch (error) {
            console.error(`StripeService: Could not retrieve customer ${subscription.customer}:`, error);
          }
        }
        
        // Only create user if we have Discord ID
        if (discordId) {
          // Check if user already exists by Discord ID or email
          let existingUser: import('../services/firebaseService').User | null = null;
          try {
            existingUser = await FirebaseService.getUserByDiscordId(discordId);
          } catch (e) {
            // User doesn't exist by Discord ID
          }
          
          if (!existingUser && customerEmail) {
            try {
              existingUser = await FirebaseService.getUserByEmail(customerEmail);
            } catch (e) {
              // User doesn't exist by email
            }
          }
          
          if (existingUser) {
            // User exists - update with Discord info and payment email
            console.log(`StripeService: Found existing user ${existingUser.id}, updating with payment info...`);
            const updateData: Partial<import('../services/firebaseService').User> = {
              discordId: discordId,
              username: discordUsername || existingUser.username
            };
            
            // If payment email differs from user email, store it as primary and Discord email separately
            if (customerEmail && customerEmail !== existingUser.email) {
              // Payment email is different - use payment email as primary, store Discord email if different
              updateData.email = customerEmail;
              if (existingUser.email && existingUser.email !== customerEmail) {
                updateData.discordEmail = existingUser.email; // Store old email as Discord email if it was different
              }
            } else if (customerEmail && !existingUser.email) {
              // User has no email, set payment email
              updateData.email = customerEmail;
            }
            
            existingUser = await FirebaseService.updateUser(existingUser.id, updateData) || existingUser;
            userId = existingUser.id;
            console.log(`StripeService: Updated existing user ${userId} with payment and Discord info`);
          } else {
            // Create new user with payment email as primary
            const userData: Omit<import('../services/firebaseService').User, 'id' | 'createdAt' | 'updatedAt'> = {
              discordId: discordId,
              username: discordUsername || 'User',
              email: customerEmail || '', // Use payment email as primary
              isWhitelisted: false,
              isAdmin: false,
              termsAccepted: false,
              onboardingCompleted: false,
              onboardingStep: 2 // Payment complete, next step is password creation
            };
            
            userId = (await FirebaseService.createUser(userData)).id;
            console.log(`StripeService: Created new user ${userId} from Discord ID ${discordId} with payment email ${customerEmail}`);
          }
          
          // If subscription is already active/trialing, whitelist the user immediately
          if (subscription.status === 'active' || subscription.status === 'trialing') {
            await FirebaseService.updateUser(userId, { isWhitelisted: true });
            console.log(`StripeService: ✅ Whitelisting user ${userId} (subscription active)`);
          }
          
          // Update Stripe customer and subscription metadata with userId for future reference
          if (customer) {
            try {
              await this.getClient().customers.update(customer.id, {
                metadata: {
                  ...customer.metadata,
                  userId: userId,
                  discordId: discordId,
                  email: customerEmail || customer.email || '',
                  username: discordUsername || customer.metadata?.username || ''
                }
              });
              await this.getClient().subscriptions.update(subscription.id, {
                metadata: {
                  ...subscription.metadata,
                  userId: userId,
                  discordId: discordId,
                  email: customerEmail || customer.email || '',
                  username: discordUsername || subscription.metadata?.username || ''
                }
              });
              console.log(`StripeService: Updated customer and subscription metadata with userId ${userId}`);
            } catch (error) {
              console.error(`StripeService: Failed to update Stripe metadata:`, error);
            }
          }
        } else {
          console.log(`StripeService: No Discord ID found in subscription or customer metadata. User will be created when they authenticate with Discord.`);
        }
      } catch (error) {
        console.error(`StripeService: Failed to create user from Discord ID ${discordId}:`, error);
        // Still try to add to Discord even if user creation fails
        if (discordId && (subscription.status === 'active' || subscription.status === 'trialing')) {
          try {
            await DiscordBotService.addMemberToServer(discordId);
            console.log(`StripeService: Added user ${discordId} to Discord server (user creation failed)`);
          } catch (discordError) {
            console.error(`StripeService: Failed to add user to Discord server:`, discordError);
          }
        }
        return;
      }
    }
    
    // If still no userId, we can't create subscription record yet
    if (!userId) {
      console.log(`StripeService: No userId found for subscription ${subscription.id}. Will be linked when user authenticates.`);
      // Still try to add to Discord if Discord ID is in metadata
      if (discordId && (subscription.status === 'active' || subscription.status === 'trialing')) {
        try {
          await DiscordBotService.addMemberToServer(discordId);
          console.log(`StripeService: Added user ${discordId} to Discord server (no userId yet)`);
        } catch (error) {
          console.error(`StripeService: Failed to add user to Discord server:`, error);
        }
      }
      return;
    }

    const subscriptionData: Partial<Subscription> = {
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      status: subscription.status as Subscription['status'],
      currentPeriodStart: FirebaseService.timestampFromDate(new Date(subscription.current_period_start * 1000)),
      currentPeriodEnd: FirebaseService.timestampFromDate(new Date(subscription.current_period_end * 1000)),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      updatedAt: FirebaseService.timestampNow(),
    };

    // Determine plan type from price ID (only monthly is available now)
    const priceId = subscription.items.data[0]?.price.id;
    const monthlyPriceId = process.env.STRIPE_PRICE_ID_MONTHLY || '';
    
    if (priceId === monthlyPriceId) {
      subscriptionData.plan = 'monthly';
    } else {
      // Default to monthly for any other price ID (for backward compatibility)
      subscriptionData.plan = 'monthly';
    }

    // Calculate grace period end (2 days after current period end)
    const gracePeriodEnd = new Date(subscription.current_period_end * 1000);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + this.GRACE_PERIOD_DAYS);
    subscriptionData.gracePeriodEnd = FirebaseService.timestampFromDate(gracePeriodEnd);

    // Get user to check Discord ID if not in metadata
    const user = await FirebaseService.getUserById(userId);
    if (!user) {
      console.error(`StripeService: User ${userId} not found`);
      return;
    }

    // Use Discord ID from metadata if available, otherwise use user's Discord ID
    // Try to get Discord ID from customer metadata if still not found
    if (!discordId && subscription.customer) {
      try {
        const customer = await this.getClient().customers.retrieve(subscription.customer as string);
        if (typeof customer !== 'string' && !customer.deleted && customer.metadata?.discordId) {
          discordId = customer.metadata.discordId;
          console.log(`StripeService: Found Discord ID ${discordId} in customer metadata`);
        }
      } catch (error) {
        console.error(`StripeService: Could not retrieve customer to get Discord ID:`, error);
      }
    }
    
    const finalDiscordId = discordId || user.discordId || null;
    
    console.log(`StripeService: Discord ID for webhook processing:`, {
      fromSubscriptionMetadata: subscription.metadata?.discordId || null,
      fromCustomerMetadata: discordId || null,
      fromUser: user.discordId || null,
      finalDiscordId
    });

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'invoice.payment_succeeded':
      case 'payment_intent.succeeded':
        // Subscription is active, trialing, or payment just succeeded
        // For payment_intent.succeeded, subscription might still be 'incomplete' but payment is confirmed
        const isPaymentSucceeded = event.type === 'invoice.payment_succeeded' || event.type === 'payment_intent.succeeded';
        if (subscription.status === 'active' || subscription.status === 'trialing' || (isPaymentSucceeded && subscription.status === 'incomplete')) {
          // Add user to Discord server and assign paid role if Discord ID is available
          if (finalDiscordId) {
            console.log(`StripeService: Attempting to add user ${finalDiscordId} to Discord server with paid role...`);
            console.log(`StripeService: Subscription status: ${subscription.status}, Event type: ${event.type}`);
            
            try {
              // Add user to Discord server (assigns paid role)
              const added = await DiscordBotService.addMemberToServer(finalDiscordId);
              if (added) {
                console.log(`StripeService: ✅ Successfully added user ${finalDiscordId} to Discord server with paid role`);
              } else {
                console.warn(`StripeService: ⚠️ Failed to add user ${finalDiscordId} to Discord server (returned false)`);
                console.warn(`StripeService: Check Discord Bot API configuration: DISCORD_API_KEY and DISCORD_PAID_MEMBER_ROLE_ID`);
              }
            } catch (error: any) {
              console.error(`StripeService: ❌ Failed to add user ${finalDiscordId} to Discord server:`, error?.message || error);
              // Log detailed error for debugging
              if (error?.response) {
                console.error(`StripeService: Discord Bot API HTTP Status: ${error.response.status}`);
                console.error(`StripeService: Discord Bot API error response:`, error.response.data);
              } else if (error?.request) {
                console.error(`StripeService: Discord Bot API: No response received. Check if ${process.env.DISCORD_API_BASE_URL || 'https://api.rain.club/discord'} is accessible.`);
              } else {
                console.error(`StripeService: Discord Bot API error:`, error);
              }
            }
          } else {
            console.warn(`StripeService: ⚠️ No Discord ID available for user ${userId}`);
            console.warn(`StripeService: Subscription metadata:`, JSON.stringify(subscription.metadata || {}));
            console.warn(`StripeService: User Discord ID:`, user.discordId || 'none');
            console.warn(`StripeService: Will be added when they authenticate with Discord`);
          }
        }

        // Update or create subscription in Firebase
        const existingSub = await FirebaseService.getSubscriptionByUserId(userId);
        let subscriptionRecord;
        if (existingSub) {
          await FirebaseService.updateSubscription(existingSub.id, subscriptionData);
          subscriptionRecord = existingSub;
        } else {
          subscriptionRecord = await FirebaseService.createSubscription({
            ...subscriptionData,
            userId,
          } as Omit<Subscription, 'id' | 'createdAt'>);
        }
        
        // Update user with subscription ID and whitelist status
        const userUpdates: Partial<import('../services/firebaseService').User> = {};
        if (user.subscriptionId !== subscriptionRecord.id) {
          userUpdates.subscriptionId = subscriptionRecord.id;
        }
        // Set isWhitelisted to true when subscription is active or trialing
        if ((subscription.status === 'active' || subscription.status === 'trialing') && !user.isWhitelisted) {
          userUpdates.isWhitelisted = true;
          console.log(`StripeService: ✅ Whitelisting user ${userId} (subscription active)`);
        }
        
        // Set onboarding step to 2 (password creation) after payment
        // Only set if user hasn't completed onboarding yet
        if (!user.onboardingCompleted && (!user.onboardingStep || user.onboardingStep < 2)) {
          userUpdates.onboardingStep = 2;
          console.log(`StripeService: Set onboarding step to 2 (password creation) for user ${userId}`);
        }
        
        // Generate verification code and send welcome email for new subscriptions
        // Only generate if user doesn't have a verification code yet (first payment)
        if (!user.verificationCode && (subscription.status === 'active' || subscription.status === 'trialing')) {
          try {
            const verificationCode = await FirebaseService.generateVerificationCode();
            const codeExpiresAt = FirebaseService.timestampFromDate(
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            );
            userUpdates.verificationCode = verificationCode;
            userUpdates.verificationCodeExpiresAt = codeExpiresAt;
            console.log(`StripeService: Generated verification code ${verificationCode} for user ${userId}`);
            
            // Send welcome email with verification code
            // Get email from customer object (most reliable source)
            const EmailService = require('./emailService').EmailService;
            let customerEmail = email; // From subscription metadata
            if (subscription.customer) {
              try {
                const customer = await this.getClient().customers.retrieve(subscription.customer as string);
                if (typeof customer !== 'string' && !customer.deleted && customer.email) {
                  customerEmail = customer.email; // Use customer email (payment email)
                  console.log(`StripeService: Using customer email from Stripe: ${customerEmail}`);
                }
              } catch (e) {
                console.warn(`StripeService: Could not retrieve customer email, using metadata email`);
              }
            }
            // Fallback to user email
            if (!customerEmail) {
              customerEmail = user.email || '';
            }
            const username = discordUsername || user.username || 'there';
            
            if (customerEmail) {
              console.log(`StripeService: Attempting to send welcome email to ${customerEmail}...`);
              console.log(`StripeService: Email sources - metadata: ${email || 'none'}, customer: ${subscription.customer ? 'retrieved' : 'none'}, user: ${user.email || 'none'}`);
              try {
                await EmailService.sendWelcomeEmail(customerEmail, username, verificationCode);
                console.log(`StripeService: ✅ Welcome email sent successfully to ${customerEmail}`);
              } catch (emailError: any) {
                console.error(`StripeService: ❌ Failed to send welcome email to ${customerEmail}:`, emailError?.message || emailError);
                console.error(`StripeService: Email service error details:`, {
                  error: emailError?.message,
                  stack: emailError?.stack,
                  code: emailError?.code
                });
                // Check if email service is initialized
                if (emailError?.message?.includes('not configured') || emailError?.message?.includes('transporter')) {
                  console.error(`StripeService: ⚠️ Email service is not properly configured. Please check EmailConfig in Firebase Admin settings.`);
                  console.error(`StripeService: Required fields: smtpHost, smtpPort, smtpUser, smtpPassword, fromEmail, fromName, enabled=true`);
                }
              }
            } else {
              console.warn(`StripeService: ⚠️ No email available to send welcome email for user ${userId}`);
              console.warn(`StripeService: Email from metadata: ${email || 'none'}, User email: ${user.email || 'none'}, Customer: ${subscription.customer || 'none'}`);
            }
          } catch (error: any) {
            console.error(`StripeService: ❌ Failed to generate verification code or send welcome email:`, error);
            console.error(`StripeService: Error details:`, error?.message || error);
            // Don't fail webhook if email fails, but log the error
          }
        } else if (user.verificationCode) {
          console.log(`StripeService: User ${userId} already has verification code, skipping email send`);
        }
        
        if (Object.keys(userUpdates).length > 0) {
          await FirebaseService.updateUser(userId, userUpdates);
        }
        
        // Update Stripe customer and subscription metadata with userId if not already set
        if (subscription.customer && !subscription.metadata?.userId) {
          try {
            const customer = await this.getClient().customers.retrieve(subscription.customer as string);
            if (typeof customer !== 'string' && !customer.deleted) {
              await this.getClient().customers.update(subscription.customer as string, {
                metadata: {
                  ...customer.metadata,
                  userId: userId
                }
              });
            }
            await this.getClient().subscriptions.update(subscription.id, {
              metadata: {
                ...subscription.metadata,
                userId: userId
              }
            });
            console.log(`StripeService: Updated customer and subscription metadata with userId ${userId}`);
          } catch (error) {
            console.error(`StripeService: Failed to update Stripe metadata:`, error);
          }
        }
        break;

      case 'customer.subscription.deleted':
        // Subscription canceled
        subscriptionData.status = 'canceled';
        subscriptionData.canceledAt = FirebaseService.timestampNow();

        // Update subscription in Firebase
        const sub = await FirebaseService.getSubscriptionByUserId(userId);
        if (sub) {
          await FirebaseService.updateSubscription(sub.id, subscriptionData);
        }

        // Remove user from Discord server if not in grace period
        // Use Discord ID from metadata or user record
        const discordIdForRemoval = finalDiscordId;
        
        if (discordIdForRemoval) {
          // Check grace period based on the subscription data we just set
          if (subscriptionData.currentPeriodEnd) {
            const periodEndDate = subscriptionData.currentPeriodEnd instanceof Date 
              ? subscriptionData.currentPeriodEnd 
              : (subscriptionData.currentPeriodEnd as any).toDate 
                ? (subscriptionData.currentPeriodEnd as any).toDate() 
                : new Date((subscriptionData.currentPeriodEnd as any).seconds * 1000);
            const gracePeriodEnd = new Date(periodEndDate);
            gracePeriodEnd.setDate(gracePeriodEnd.getDate() + this.GRACE_PERIOD_DAYS);
            const now = new Date();
            
            // Only remove if past grace period
            if (now > gracePeriodEnd) {
              try {
                await DiscordBotService.removeMemberFromServer(discordIdForRemoval);
                console.log(`StripeService: Removed user ${discordIdForRemoval} from Discord server`);
              } catch (error) {
                console.error(`StripeService: Failed to remove user from Discord server:`, error);
              }
            }
          } else {
            // If no period end date, remove immediately
            try {
              await DiscordBotService.removeMemberFromServer(discordIdForRemoval);
              console.log(`StripeService: Removed user ${discordIdForRemoval} from Discord server`);
            } catch (error) {
              console.error(`StripeService: Failed to remove user from Discord server:`, error);
            }
          }
        }
        break;

      case 'invoice.payment_failed':
        // Payment failed - subscription might be past_due
        if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
          // Update subscription status but don't remove from Discord yet (grace period)
          const failedSub = await FirebaseService.getSubscriptionByUserId(userId);
          if (failedSub) {
            await FirebaseService.updateSubscription(failedSub.id, {
              status: subscription.status as Subscription['status'],
              updatedAt: FirebaseService.timestampNow(),
            });
          }
        }
        break;
    }
  }

  /**
   * Check if subscription is in grace period
   */
  static isInGracePeriod(periodEnd: any): boolean {
    if (!periodEnd) return false;
    
    const periodEndDate = periodEnd.toDate ? periodEnd.toDate() : new Date(periodEnd);
    const gracePeriodEnd = new Date(periodEndDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + this.GRACE_PERIOD_DAYS);
    
    const now = new Date();
    return now <= gracePeriodEnd && now > periodEndDate;
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): Stripe.Event {
    const client = this.getClient();
    return client.webhooks.constructEvent(payload, signature, secret);
  }
}

