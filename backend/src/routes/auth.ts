import express from 'express';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { DiscordService } from '../services/discordService';
import { FirebaseService } from '../services/firebaseService';
import { DiscordBotService } from '../services/discordBotService';
import { canAccessPortal } from '../utils/subscriptionChecker';
import { authenticateToken } from '../middleware/auth';
import { hashPassword, verifyPassword } from '../utils/password';

const router = express.Router();

// Discord OAuth callback (GET route for browser redirect)
router.get('/discord/callback', async (req, res) => {
  try {
    const { code, error, state } = req.query;

    if (error) {
      let frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://www.rain.club');
      
      // Clean the URL
      frontendUrl = frontendUrl.trim().replace(/['"]/g, '');
      if (!frontendUrl.startsWith('http')) {
        frontendUrl = `https://${frontendUrl}`;
      }
      
      const finalRedirectUrl = `${frontendUrl}?error=${error}`;
      return res.redirect(finalRedirectUrl);
    }

    if (!code) {
      let frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://www.rain.club');
      
      frontendUrl = frontendUrl.trim().replace(/['"]/g, '');
      if (!frontendUrl.startsWith('http')) {
        frontendUrl = `https://${frontendUrl}`;
      }
      
      const finalRedirectUrl = `${frontendUrl}?error=no_code`;
      return res.redirect(finalRedirectUrl);
    }

    // Parse state parameter to get user email/userId if provided
    let stateData: any = {};
    let userEmailFromState: string | null = null;
    let userIdFromState: string | null = null;
    
    if (state) {
      try {
        stateData = JSON.parse(decodeURIComponent(state as string));
        userEmailFromState = stateData.email || null;
        userIdFromState = stateData.userId || null;
              } catch (e) {
        // State might be in old format (just "onboarding=true")
              }
    }

    // Construct redirect URI from request (must match what frontend sent to Discord)
    // Check if we're on localhost (local development) or production
    const requestHost = req.get('host') || '';
    const isLocalhost = requestHost.includes('localhost') || requestHost.includes('127.0.0.1');
    
    let redirectUri: string;
    if (isLocalhost || process.env.NODE_ENV === 'development') {
      // Local development: always use http://localhost:3001
      redirectUri = 'http://localhost:3001/auth/discord/callback';
    } else {
      // Production: construct from request or use env var
      const protocol = req.protocol || 'https';
      const host = requestHost || process.env.DISCORD_REDIRECT_URI?.replace(/^https?:\/\//, '').replace(/\/auth\/discord\/callback$/, '') || 'rain.club';
      redirectUri = process.env.DISCORD_REDIRECT_URI || `${protocol}://${host}/auth/discord/callback`;
    }
    
        // Exchange code for access token with constructed redirect URI
    const tokenData = await DiscordService.exchangeCodeForToken(code as string, redirectUri);
    const accessToken = tokenData.access_token;
    
    // Log token details for debugging

                // Get user info from Discord
    const discordUser = await DiscordService.getUserInfo(accessToken);
    
    // FIRST: Check Stripe for active subscription to get payment email
    // This is important because payment email might differ from Discord email
    // We need to search by payment email first, not Discord email
    let user: import('../services/firebaseService').User | null = null;
    let paymentEmail: string | null = null;
    
    try {
      const StripeService = require('../services/stripeService').StripeService;
      const stripe = StripeService.getClient();
      
      // Search for customers by Discord ID in metadata (most reliable)
      let customers: Stripe.Customer[] = [];
      
      if (discordUser.id) {
        const allCustomers = await stripe.customers.list({ limit: 100 });
        const matchingCustomers = allCustomers.data.filter(
          (c: Stripe.Customer) => c.metadata?.discordId === discordUser.id
        );
        customers = [...matchingCustomers];
      }
      
      // Also search by Discord email (might match payment email)
      if (discordUser.email && customers.length === 0) {
        const customersByEmail = await stripe.customers.list({
          email: discordUser.email,
          limit: 10
        });
        customers = [...customersByEmail.data];
      }
      
      // Check each customer for active subscriptions
      let activeSubscription: Stripe.Subscription | null = null;
      let subscriptionCustomer: Stripe.Customer | null = null;
      
      for (const customer of customers) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'all',
          limit: 10
        });
        
        const active = subscriptions.data.find(
          (sub: Stripe.Subscription) => 
            sub.status === 'active' || 
            sub.status === 'trialing' ||
            sub.status === 'past_due'
        );
        
        if (active) {
          activeSubscription = active;
          subscriptionCustomer = customer;
          paymentEmail = customer.email || null; // Get payment email from Stripe customer
          break;
        }
      }
      
      // If we found a subscription, search for user by PAYMENT EMAIL first (not Discord email)
      if (activeSubscription && subscriptionCustomer && paymentEmail) {
        try {
          user = await FirebaseService.getUserByEmail(paymentEmail);
          if (user) {

          }
        } catch (error) {
                  }
      }
    } catch (error) {
          }
    
    // If not found by payment email, try finding by userId from state (if user is already logged in)
    if (!user && userIdFromState) {
      try {
        user = await FirebaseService.getUserById(userIdFromState);
        if (user) {
                  }
      } catch (error) {
              }
    }
    
    // If not found, try finding by email from state (if provided)
    if (!user && userEmailFromState) {
      try {
        user = await FirebaseService.getUserByEmail(userEmailFromState);
        if (user) {
                  }
      } catch (error) {
              }
    }
    
    // If not found by payment email or state, try finding by Discord ID or Discord email
    if (!user) {
      user = await DiscordService.findUser(discordUser);
    }

    // If user still doesn't exist, check Stripe more thoroughly for active subscription
    // This handles cases where user paid first with different email than Discord email
    if (!user) {
            try {
        const StripeService = require('../services/stripeService').StripeService;
        const stripe = StripeService.getClient();
        
        // Search for customers by Discord email (might match payment email)
        let customers: Stripe.Customer[] = [];
        
        if (discordUser.email) {
          const customersByEmail = await stripe.customers.list({
            email: discordUser.email,
            limit: 10
          });
          customers = [...customersByEmail.data];
        }
        
        // Also search by Discord ID in metadata (in case it was stored during payment)
        if (discordUser.id) {
          const allCustomers = await stripe.customers.list({ limit: 100 });
          const matchingCustomers = allCustomers.data.filter(
            (c: Stripe.Customer) => c.metadata?.discordId === discordUser.id
          );
          matchingCustomers.forEach((c: Stripe.Customer) => {
            if (!customers.find((existing: Stripe.Customer) => existing.id === c.id)) {
              customers.push(c);
            }
          });
        }
        
        // If no customers found by Discord email/ID, search ALL customers with active subscriptions
        // This handles the case where user paid first with different email
        if (customers.length === 0) {
                    const allCustomers = await stripe.customers.list({ limit: 100 });
          
          // Check each customer for active subscriptions
          for (const customer of allCustomers.data) {
            const subscriptions = await stripe.subscriptions.list({
              customer: customer.id,
              status: 'all',
              limit: 10
            });
            
            const active = subscriptions.data.find(
              (sub: Stripe.Subscription) => 
                sub.status === 'active' || 
                sub.status === 'trialing' ||
                sub.status === 'past_due'
            );
            
            if (active && customer.email) {
              // Check if user exists in Firebase with this customer's email
              try {
                const existingUser = await FirebaseService.getUserByEmail(customer.email);
                if (existingUser && !existingUser.discordId) {
                  // Found user who paid but doesn't have Discord linked yet
                                    customers.push(customer);
                  break; // Found the right customer
                }
              } catch (error) {
                // User doesn't exist with this email, continue searching
              }
            }
          }
        }
        
        // Check each customer for active subscriptions
        let activeSubscription: Stripe.Subscription | null = null;
        let subscriptionCustomer: Stripe.Customer | null = null;
        
        for (const customer of customers) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all',
            limit: 10
          });
          
          const active = subscriptions.data.find(
            (sub: Stripe.Subscription) => 
              sub.status === 'active' || 
              sub.status === 'trialing' ||
              sub.status === 'past_due'
          );
          
          if (active) {
            activeSubscription = active;
            subscriptionCustomer = customer;
            break;
          }
        }
        
        // If active subscription found, create/link user account
        if (activeSubscription && subscriptionCustomer) {
                    // Get payment email from Stripe customer (might be different from Discord email)
          const paymentEmailFromStripe = subscriptionCustomer.email || '';
          
          // Use payment email from earlier check if available, otherwise use from customer
          const finalPaymentEmail = paymentEmail || paymentEmailFromStripe || '';
          
          // ALWAYS check if user exists by payment email (regardless of whether emails match)
          // This handles the case where user paid first with payment email, then logs in with Discord
          let existingUser: import('../services/firebaseService').User | null = null;
          
          if (finalPaymentEmail) {
            try {
              existingUser = await FirebaseService.getUserByEmail(finalPaymentEmail);
              if (existingUser) {
                                                              }
            } catch (error) {
              // User doesn't exist by payment email
                          }
          }
          
          // Create or update user
          if (existingUser) {
            // Link Discord ID to existing user (paid with different email)
            // IMPORTANT: Preserve payment email, store Discord email separately
            const updateData: Partial<import('../services/firebaseService').User> = {
              discordId: discordUser.id,
              username: discordUser.username
            };
            
            // Store Discord email separately if different from payment email
            // NEVER overwrite payment email with Discord email
            if (discordUser.email) {
              if (finalPaymentEmail && finalPaymentEmail !== discordUser.email) {
                // Payment email exists and differs - keep payment email, store Discord email separately
                updateData.discordEmail = discordUser.email;
                                              } else if (!finalPaymentEmail) {
                // No payment email yet, use Discord email as primary
                updateData.email = discordUser.email;
                              } else {
                // Emails match, just update discordEmail to be explicit
                updateData.discordEmail = discordUser.email;
                              }
            }
            
            if (discordUser.avatar) {
              updateData.avatar = discordUser.avatar;
            }
            
            // Keep payment email (don't overwrite with Discord email to maintain payment record consistency)
            // The payment email is already in existingUser.email, so we don't touch it
            
            const updatedUser = await FirebaseService.updateUser(existingUser.id, updateData) || existingUser;
                        user = updatedUser;
            
            // Create subscription record if missing
            if (!updatedUser.subscriptionId) {
              const subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' = 
                activeSubscription.status === 'trialing' ? 'trialing' : 
                activeSubscription.status === 'past_due' ? 'past_due' :
                activeSubscription.status === 'canceled' ? 'canceled' :
                activeSubscription.status === 'unpaid' ? 'unpaid' : 'active';
              
              const subscriptionData = {
                userId: updatedUser.id,
                stripeCustomerId: subscriptionCustomer.id,
                stripeSubscriptionId: activeSubscription.id,
                status: subscriptionStatus,
                currentPeriodStart: FirebaseService.timestampFromDate(new Date(activeSubscription.current_period_start * 1000)),
                currentPeriodEnd: FirebaseService.timestampFromDate(new Date(activeSubscription.current_period_end * 1000)),
                cancelAtPeriodEnd: activeSubscription.cancel_at_period_end || false,
                plan: 'monthly' as const,
                gracePeriodEnd: FirebaseService.timestampFromDate(
                  new Date((activeSubscription.current_period_end + (2 * 24 * 60 * 60)) * 1000)
                ),
                createdAt: FirebaseService.timestampNow(),
                updatedAt: FirebaseService.timestampNow()
              };
              
              const subscriptionRecord = await FirebaseService.createSubscription(subscriptionData);
              await FirebaseService.updateUser(updatedUser.id, { 
                subscriptionId: subscriptionRecord.id,
                isWhitelisted: subscriptionStatus === 'active' || subscriptionStatus === 'trialing'
              });
              
              // Update Stripe metadata
              await stripe.subscriptions.update(activeSubscription.id, {
                metadata: {
                  ...activeSubscription.metadata,
                  userId: updatedUser.id,
                  discordId: discordUser.id,
                  email: updatedUser.email, // Keep payment email
                  username: discordUser.username
                }
              });
            }
            
            // Set user variable and continue with normal login flow below
            user = updatedUser;
          } else {
            // No existing user found by payment email
            // Check if subscription metadata has userId (user might exist but email search failed)
            const userIdFromMetadata = activeSubscription.metadata?.userId || subscriptionCustomer.metadata?.userId;
            if (userIdFromMetadata) {
              try {
                const userFromMetadata = await FirebaseService.getUserById(userIdFromMetadata);
                if (userFromMetadata) {
                                    // Link Discord to this user
                  const updateData: Partial<import('../services/firebaseService').User> = {
                    discordId: discordUser.id,
                    discordEmail: discordUser.email,
                    username: discordUser.username
                  };
                  
                  if (discordUser.avatar) {
                    updateData.avatar = discordUser.avatar;
                  }
                  
                  user = await FirebaseService.updateUser(userFromMetadata.id, updateData) || userFromMetadata;
                  
                  // Update subscription if needed
                  if (!user.subscriptionId || user.subscriptionId !== activeSubscription.id) {
                    // Subscription already exists, just update user reference
                    await FirebaseService.updateUser(user.id, { 
                      subscriptionId: user.subscriptionId || activeSubscription.id,
                      isWhitelisted: true
                    });
                  }
                  
                  // Continue with normal flow below
                }
              } catch (error) {
                              }
            }
            
            // Only create new user if we still don't have one
            if (!user) {
                            // Check if subscription already exists in Firebase (by Stripe subscription ID)
              // This prevents creating duplicate subscriptions
              let existingSubscription = null;
              try {
                existingSubscription = await FirebaseService.getSubscriptionByStripeSubscriptionId(activeSubscription.id);
                
                if (existingSubscription) {
                                    // Get the user who owns this subscription
                  const ownerUserId = existingSubscription.userId;
                  if (ownerUserId) {
                    try {
                      const ownerUser = await FirebaseService.getUserById(ownerUserId);
                      if (ownerUser) {
                                                // Link Discord to existing user
                        // Preserve payment email, store Discord email separately
                        const updateData: Partial<import('../services/firebaseService').User> = {
                          discordId: discordUser.id,
                          username: discordUser.username
                        };
                        
                        // Store Discord email separately if different from payment email
                        if (discordUser.email) {
                          if (ownerUser.email && ownerUser.email !== discordUser.email) {
                            // Payment email exists and differs - keep it, store Discord email separately
                            updateData.discordEmail = discordUser.email;
                                                      } else if (!ownerUser.email) {
                            // No payment email yet, use Discord email as primary
                            updateData.email = discordUser.email;
                          } else {
                            // Emails match, just update discordEmail to be explicit
                            updateData.discordEmail = discordUser.email;
                          }
                        }
                        
                        if (discordUser.avatar) {
                          updateData.avatar = discordUser.avatar;
                        }
                        
                        user = await FirebaseService.updateUser(ownerUser.id, updateData) || ownerUser;
                        
                        // Update Stripe metadata
                        await stripe.subscriptions.update(activeSubscription.id, {
                          metadata: {
                            ...activeSubscription.metadata,
                            userId: user.id,
                            discordId: discordUser.id,
                            email: user.email,
                            username: discordUser.username
                          }
                        });
                      } else {
                                                // Owner user doesn't exist, we'll create a new user below
                      }
                    } catch (error) {
                                            // Owner user doesn't exist or error, we'll create a new user below
                    }
                  } else {
                                        // Subscription exists but has no owner, we'll create a new user below
                  }
                }
              } catch (error) {
                              }
              
              // Before creating new user, check if there's an existing user by payment email
              // This handles the case where user paid first (created user with payment email)
              // and then tries to login with Discord (different email)
              if (!user && finalPaymentEmail) {
                try {
                  const userByPaymentEmail = await FirebaseService.getUserByEmail(finalPaymentEmail);
                  if (userByPaymentEmail) {
                                        // Link Discord to existing user
                    // Preserve payment email, store Discord email separately
                    const updateData: Partial<import('../services/firebaseService').User> = {
                      discordId: discordUser.id,
                      username: discordUser.username
                    };
                    
                    // Store Discord email separately if different from payment email
                    if (discordUser.email) {
                      if (finalPaymentEmail && finalPaymentEmail !== discordUser.email) {
                        // Payment email exists and differs - keep it, store Discord email separately
                        updateData.discordEmail = discordUser.email;
                                              } else if (!finalPaymentEmail) {
                        // No payment email yet, use Discord email as primary
                        updateData.email = discordUser.email;
                      } else {
                        // Emails match, just update discordEmail to be explicit
                        updateData.discordEmail = discordUser.email;
                      }
                    }
                    
                    if (discordUser.avatar) {
                      updateData.avatar = discordUser.avatar;
                    }
                    user = await FirebaseService.updateUser(userByPaymentEmail.id, updateData) || userByPaymentEmail;
                    
                    // Update Stripe metadata
                    await stripe.subscriptions.update(activeSubscription.id, {
                      metadata: {
                        ...activeSubscription.metadata,
                        userId: user.id,
                        discordId: discordUser.id,
                        email: finalPaymentEmail,
                        username: discordUser.username
                      }
                    });
                  }
                } catch (error) {
                                  }
              }
              
              // Only create new user if we still don't have one
              // This handles cases where:
              // 1. Subscription doesn't exist (create user + subscription)
              // 2. Subscription exists but owner user doesn't exist (create user, link to subscription)
              // 3. Subscription exists but we couldn't link to owner (create user, link to subscription)
              if (!user) {
                const newUser = await DiscordService.createUserFromDiscord(discordUser);
                
                // Update email to payment email if different
                if (finalPaymentEmail && finalPaymentEmail !== discordUser.email) {
                  await FirebaseService.updateUser(newUser.id, { email: finalPaymentEmail });
                }
                
                user = newUser;
                
                // Create subscription record
                const subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' = 
                  activeSubscription.status === 'trialing' ? 'trialing' : 
                  activeSubscription.status === 'past_due' ? 'past_due' :
                  activeSubscription.status === 'canceled' ? 'canceled' :
                  activeSubscription.status === 'unpaid' ? 'unpaid' : 'active';
                
                const subscriptionData = {
                  userId: newUser.id,
                  stripeCustomerId: subscriptionCustomer.id,
                  stripeSubscriptionId: activeSubscription.id,
                  status: subscriptionStatus,
                  currentPeriodStart: FirebaseService.timestampFromDate(new Date(activeSubscription.current_period_start * 1000)),
                  currentPeriodEnd: FirebaseService.timestampFromDate(new Date(activeSubscription.current_period_end * 1000)),
                  cancelAtPeriodEnd: activeSubscription.cancel_at_period_end || false,
                  plan: 'monthly' as const,
                  gracePeriodEnd: FirebaseService.timestampFromDate(
                    new Date((activeSubscription.current_period_end + (2 * 24 * 60 * 60)) * 1000)
                  ),
                  createdAt: FirebaseService.timestampNow(),
                  updatedAt: FirebaseService.timestampNow()
                };
                
                // If subscription already exists, link user to it instead of creating new subscription
                if (existingSubscription) {
                                    // Update subscription to point to new user
                  await FirebaseService.updateSubscription(existingSubscription.id, {
                    userId: newUser.id
                  });
                  await FirebaseService.updateUser(newUser.id, { 
                    subscriptionId: existingSubscription.id,
                    isWhitelisted: subscriptionStatus === 'active' || subscriptionStatus === 'trialing'
                  });
                } else {
                  // Create new subscription record
                  const subscriptionRecord = await FirebaseService.createSubscription(subscriptionData);
                  await FirebaseService.updateUser(newUser.id, { 
                    subscriptionId: subscriptionRecord.id,
                    isWhitelisted: subscriptionStatus === 'active' || subscriptionStatus === 'trialing'
                  });
                                  }
                
                // Update Stripe metadata
                await stripe.subscriptions.update(activeSubscription.id, {
                  metadata: {
                    ...activeSubscription.metadata,
                    userId: newUser.id,
                    discordId: discordUser.id,
                    email: finalPaymentEmail || newUser.email,
                    username: discordUser.username
                  }
                });
              } else if (existingSubscription && user) {
                // Subscription exists and we linked to existing user, just update metadata
                await stripe.subscriptions.update(activeSubscription.id, {
                  metadata: {
                    ...activeSubscription.metadata,
                    userId: user.id,
                    discordId: discordUser.id,
                    email: user.email,
                    username: discordUser.username
                  }
                });
              }
            } else {
              // User was found and linked, update Stripe metadata
                            await stripe.subscriptions.update(activeSubscription.id, {
                metadata: {
                  ...activeSubscription.metadata,
                  userId: user.id,
                  discordId: discordUser.id,
                  email: user.email,
                  username: discordUser.username
                }
              });
            }
          }
          
          // After creating/linking user, continue with normal flow below
          // The code below will handle subscription verification and login
          
        } else {
          // No active subscription found - redirect to payment page
          let frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://www.rain.club');
          frontendUrl = frontendUrl.trim().replace(/['"]/g, '');
          if (!frontendUrl.startsWith('http')) {
            frontendUrl = `https://${frontendUrl}`;
          }
          const paymentRedirectUrl = `${frontendUrl}/join?discordId=${encodeURIComponent(discordUser.id)}&email=${encodeURIComponent(discordUser.email)}&username=${encodeURIComponent(discordUser.username)}`;
          return res.redirect(paymentRedirectUrl);
        }
      } catch (error) {
                // If error, still redirect to payment page
        let frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://www.rain.club');
        frontendUrl = frontendUrl.trim().replace(/['"]/g, '');
        if (!frontendUrl.startsWith('http')) {
          frontendUrl = `https://${frontendUrl}`;
        }
        const paymentRedirectUrl = `${frontendUrl}/join?discordId=${encodeURIComponent(discordUser.id)}&email=${encodeURIComponent(discordUser.email)}&username=${encodeURIComponent(discordUser.username)}`;
        return res.redirect(paymentRedirectUrl);
      }
    }

    // At this point, user should exist (either found initially or created/linked from Stripe)
    if (!user) {
            let frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://www.rain.club');
      frontendUrl = frontendUrl.trim().replace(/['"]/g, '');
      if (!frontendUrl.startsWith('http')) {
        frontendUrl = `https://${frontendUrl}`;
      }
      const paymentRedirectUrl = `${frontendUrl}/join?discordId=${encodeURIComponent(discordUser.id)}&email=${encodeURIComponent(discordUser.email)}&username=${encodeURIComponent(discordUser.username)}`;
      return res.redirect(paymentRedirectUrl);
    }

    // TypeScript: At this point, user is guaranteed to be non-null
    // Update user with latest Discord info (username, Discord ID, Discord email)
    // IMPORTANT: Preserve payment email if different from Discord email
    if (user) {
      // Get payment email from Stripe if we have it (from earlier check)
      const currentPaymentEmail = paymentEmail || user.email || '';
      const discordEmail = discordUser.email || '';
      
      const updateData: Partial<import('../services/firebaseService').User> = {
        username: discordUser.username,
        discordId: discordUser.id
      };
      
      // Handle email: preserve payment email, store Discord email separately
      if (discordEmail) {
        if (currentPaymentEmail && currentPaymentEmail !== discordEmail) {
          // Payment email exists and differs from Discord email - keep payment email, store Discord email separately
          // Make sure payment email is preserved (don't overwrite)
          if (user.email !== currentPaymentEmail) {
            // User's email doesn't match payment email, update it
            updateData.email = currentPaymentEmail;
          }
          updateData.discordEmail = discordEmail;
                            } else if (!currentPaymentEmail) {
          // No payment email yet, use Discord email as primary
          updateData.email = discordEmail;
                  } else {
          // Emails match, just update discordEmail to be explicit
          updateData.discordEmail = discordEmail;
                  }
      }
      
      if (discordUser.avatar) {
        updateData.avatar = discordUser.avatar;
      }
      
      // Only update if there are changes
      if (Object.keys(updateData).length > 0) {
        user = await FirebaseService.updateUser(user.id, updateData) || user;
                                              }
    }
    
    // User exists - check subscription status
    let subscription = user.subscriptionId 
      ? await FirebaseService.getSubscriptionById(user.subscriptionId)
      : await FirebaseService.getSubscriptionByUserId(user.id);

    // If no subscription found in Firebase, check Stripe directly (webhook might not have processed yet)
    if (!subscription) {
            try {
        const StripeService = require('../services/stripeService').StripeService;
        const stripe = StripeService.getClient();
        
        // Search for customer by email or Discord ID in metadata
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 10
        });

        // Also search by Discord ID in metadata
        const allCustomers: Stripe.Customer[] = [...customers.data];
        if (discordUser.id) {
          // Get all customers and filter by Discord ID in metadata
          const customersWithDiscord = await stripe.customers.list({ limit: 100 });
          const matchingCustomers = customersWithDiscord.data.filter(
            (c: Stripe.Customer) => c.metadata?.discordId === discordUser.id
          );
          matchingCustomers.forEach((c: Stripe.Customer) => {
            if (!allCustomers.find((existing: Stripe.Customer) => existing.id === c.id)) {
              allCustomers.push(c);
            }
          });
        }

        // Check each customer for active subscriptions
        for (const customer of allCustomers) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all',
            limit: 10
          });

          // Find active or trialing subscriptions
          const activeSubscription = subscriptions.data.find(
            (sub: Stripe.Subscription) => sub.status === 'active' || sub.status === 'trialing'
          );

          if (activeSubscription) {
                        // Map Stripe status to our Subscription status type
            // Only allow: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing'
            let subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' = 'active';
            if (activeSubscription.status === 'trialing') {
              subscriptionStatus = 'trialing';
            } else if (activeSubscription.status === 'canceled') {
              subscriptionStatus = 'canceled';
            } else if (activeSubscription.status === 'past_due') {
              subscriptionStatus = 'past_due';
            } else if (activeSubscription.status === 'unpaid') {
              subscriptionStatus = 'unpaid';
            }
            
            // Create subscription record in Firebase
            const subscriptionData = {
              userId: user.id,
              stripeCustomerId: customer.id,
              stripeSubscriptionId: activeSubscription.id,
              status: subscriptionStatus,
              currentPeriodStart: FirebaseService.timestampFromDate(new Date(activeSubscription.current_period_start * 1000)),
              currentPeriodEnd: FirebaseService.timestampFromDate(new Date(activeSubscription.current_period_end * 1000)),
              cancelAtPeriodEnd: activeSubscription.cancel_at_period_end || false,
              plan: 'monthly' as const,
              gracePeriodEnd: FirebaseService.timestampFromDate(
                new Date((activeSubscription.current_period_end + (2 * 24 * 60 * 60)) * 1000)
              ),
              createdAt: FirebaseService.timestampNow(),
              updatedAt: FirebaseService.timestampNow()
            };

            const subscriptionRecord = await FirebaseService.createSubscription(subscriptionData);
            
            // Update user with subscription ID and whitelist status
            const userUpdates: Partial<import('../services/firebaseService').User> = {
              subscriptionId: subscriptionRecord.id
            };
            // Set isWhitelisted to true when subscription is active or trialing
            if ((subscriptionStatus === 'active' || subscriptionStatus === 'trialing') && !user.isWhitelisted) {
              userUpdates.isWhitelisted = true;

            }
            await FirebaseService.updateUser(user.id, userUpdates);
            
            // Update Stripe metadata if needed
            if (!activeSubscription.metadata?.userId) {
              await stripe.subscriptions.update(activeSubscription.id, {
                metadata: {
                  ...activeSubscription.metadata,
                  userId: user.id,
                  discordId: discordUser.id,
                  email: user.email,
                  username: discordUser.username
                }
              });
            }

            subscription = subscriptionRecord;
                        break; // Found subscription, no need to continue
          }
        }
      } catch (error) {
                // Continue with normal flow even if Stripe check fails
      }
    }

    // Verify user can access portal (active subscription or grace period)
    const canAccess = user.hasManualSubscription || (subscription && canAccessPortal(subscription));
        // If user has active subscription, add them to Discord server and assign role
    // Discord bot operations run asynchronously - don't block login
    if (canAccess) {
            // Fire-and-forget Discord operations (don't block login)
      (async () => {
        try {
          // Set a timeout to prevent hanging (increased to 15 seconds for Discord API operations)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Discord operation timeout')), 15000)
          );
          
          // Step 1: Add user to Discord server (using OAuth token with guilds.join scope, or bot token)
          let userInServer = false;
          let roleAssignedDuringAdd = false;
          try {
            // Debug logging to verify we're using the correct token


                        // Use Promise.race with timeout, but catch timeout errors gracefully
            // Pass role ID to addUserToGuild so role is assigned when user is added (more efficient)
            const roleId = process.env.DISCORD_PAID_MEMBER_ROLE_ID || '';
            let addedToServer = false;
            
            try {
              addedToServer = await Promise.race([
                DiscordService.addUserToGuild(discordUser.id, accessToken, roleId),
                timeoutPromise
              ]) as boolean;
              
              // If role ID was provided, role should have been assigned during user addition
              if (addedToServer && roleId) {
                roleAssignedDuringAdd = true;
                              }
            } catch (error: any) {
              if (error.message === 'Discord operation timeout') {
                                // Check if user was actually added despite timeout
                const isInServer = await DiscordService.isUserInGuild(discordUser.id);
                if (isInServer) {
                                    addedToServer = true;
                  // Check if role was also assigned
                  if (roleId) {
                    try {
                      const hasRole = await DiscordBotService.checkMemberStatus(discordUser.id, roleId);
                      if (hasRole) {
                        roleAssignedDuringAdd = true;
                                              }
                    } catch (e) {
                      // Ignore role check errors
                    }
                  }
                } else {
                                  }
              } else {
                throw error; // Re-throw non-timeout errors
              }
            }
            
            if (addedToServer) {
              // Verify user is actually in server before proceeding
              userInServer = await Promise.race([
                DiscordService.isUserInGuild(discordUser.id),
                new Promise((resolve) => setTimeout(() => resolve(false), 2000)) // 2 second timeout
              ]) as boolean;
              
              if (userInServer) {
                if (roleAssignedDuringAdd) {
                                  } else {
                                  }
              } else {
                                              }
            } else {
                          }
          } catch (error: any) {
                      }
          
          // Step 2: Assign paid role ONLY if user is confirmed to be in server AND role wasn't already assigned
          if (userInServer && !roleAssignedDuringAdd) {
            const hasPaidRole = await Promise.race([
              DiscordBotService.checkMemberStatus(discordUser.id),
              timeoutPromise
            ]) as boolean;
            
            if (!hasPaidRole) {
              try {
                const added = await Promise.race([
                  DiscordBotService.addMemberToServer(discordUser.id),
                  timeoutPromise
                ]) as boolean;
                if (added) {
                                  } else {

                }
              } catch (error: any) {
                              }
            } else {
                          }
          } else {
            // User not in server - check if they already have the role (maybe they joined manually)
            try {
              const hasPaidRole = await Promise.race([
                DiscordBotService.checkMemberStatus(discordUser.id),
                timeoutPromise
              ]) as boolean;
              if (!hasPaidRole) {
                                              }
            } catch (error) {
              // Ignore check errors
            }
          }
        } catch (error: any) {
          // Don't fail login if Discord operations fail or timeout

        }
      })(); // Fire-and-forget
    } else {
      // No active subscription - ensure paid role is removed and redirect to payment
      Promise.race([
        (async () => {
          try {
            const hasPaidRole = await DiscordBotService.checkMemberStatus(discordUser.id);
            if (hasPaidRole) {
              await DiscordBotService.removeMemberFromServer(discordUser.id);
                          }
          } catch (error) {
                      }
        })(),
        new Promise((resolve) => setTimeout(resolve, 3000)) // 3 second timeout
      ]).catch(() => {});

      let frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://www.rain.club');
      frontendUrl = frontendUrl.trim().replace(/['"]/g, '');
      if (!frontendUrl.startsWith('http')) {
        frontendUrl = `https://${frontendUrl}`;
      }
      const paymentRedirectUrl = `${frontendUrl}/join?userId=${user.id}&discordId=${encodeURIComponent(discordUser.id)}`;
      return res.redirect(paymentRedirectUrl);
    }

    // Generate JWT token (only reached if canAccess is true)
        const token = jwt.sign(
      { userId: user.id, discordId: user.discordId },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Check if this is an onboarding flow (from state parameter)
    // Use existing stateData (already parsed above)
    const isOnboarding = stateData && stateData.onboarding === true;
    
    // Redirect to frontend with token
    let frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://www.rain.club');
    
    frontendUrl = frontendUrl.trim().replace(/['"]/g, '');
    if (!frontendUrl.startsWith('http')) {
      frontendUrl = `https://${frontendUrl}`;
    }
    
    // Prepare user object for frontend (include hasDiscord and hasPassword flags)
    const userForFrontend = {
      id: user.id,
      username: user.username,
      email: user.email,
      discordId: user.discordId,
      discordEmail: user.discordEmail,
      avatar: user.avatar,
      isAdmin: user.isAdmin,
      isWhitelisted: user.isWhitelisted,
      hasManualSubscription: user.hasManualSubscription || false,
      hasDiscord: !!user.discordId, // Set hasDiscord based on discordId presence
      hasPassword: !!(user as any).passwordHash, // Set hasPassword based on passwordHash presence
      termsAccepted: user.termsAccepted || false
    };
    
    // If onboarding, redirect to intro video step
    if (isOnboarding) {
      const introUrl = `${frontendUrl}/onboarding/intro?token=${token}&user=${encodeURIComponent(JSON.stringify(userForFrontend))}`;
      return res.redirect(introUrl);
    }
    
    const finalRedirectUrl = `${frontendUrl}?token=${token}&user=${encodeURIComponent(JSON.stringify(userForFrontend))}`;

    return res.redirect(finalRedirectUrl);
  } catch (error: any) {
            // Redirect to frontend with error
    let frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://www.rain.club');
    frontendUrl = frontendUrl.trim().replace(/['"]/g, '');
    if (!frontendUrl.startsWith('http')) {
      frontendUrl = `https://${frontendUrl}`;
    }
    
    const errorRedirectUrl = `${frontendUrl}?error=auth_failed`;
    res.redirect(errorRedirectUrl);
  }
});

// Discord OAuth callback (POST route for API calls)
router.post('/discord', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    // Construct redirect URI from request (must match what frontend sent to Discord)
    // Check if we're on localhost (local development) or production
    const requestHost = req.get('host') || '';
    const isLocalhost = requestHost.includes('localhost') || requestHost.includes('127.0.0.1');
    
    let redirectUri: string;
    if (isLocalhost || process.env.NODE_ENV === 'development') {
      // Local development: always use http://localhost:3001
      redirectUri = 'http://localhost:3001/auth/discord/callback';
    } else {
      // Production: use env var or construct from request
      redirectUri = process.env.DISCORD_REDIRECT_URI || 'https://rain.club/auth/discord/callback';
    }
    
        // Exchange code for access token with constructed redirect URI
    const tokenData = await DiscordService.exchangeCodeForToken(code, redirectUri);
    const accessToken = tokenData.access_token;
    
    // Get user info from Discord
    const discordUser = await DiscordService.getUserInfo(accessToken);
    
    // Check if user exists in Firebase
    const user = await DiscordService.findUser(discordUser);

    // If user doesn't exist, return error (they need to pay first)
    if (!user) {
      return res.status(403).json({ 
        error: 'User not found',
        message: 'Please complete payment first to create your account'
      });
    }

    // User exists - check subscription status
    let subscription = user.subscriptionId 
      ? await FirebaseService.getSubscriptionById(user.subscriptionId)
      : await FirebaseService.getSubscriptionByUserId(user.id);

    // If no subscription found in Firebase, check Stripe directly (webhook might not have processed yet)
    if (!subscription) {
            try {
        const StripeService = require('../services/stripeService').StripeService;
        const stripe = StripeService.getClient();
        
        // Search for customer by email or Discord ID in metadata
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 10
        });

        // Also search by Discord ID in metadata
        const allCustomers: Stripe.Customer[] = [...customers.data];
        if (discordUser.id) {
          // Get all customers and filter by Discord ID in metadata
          const customersWithDiscord = await stripe.customers.list({ limit: 100 });
          const matchingCustomers = customersWithDiscord.data.filter(
            (c: Stripe.Customer) => c.metadata?.discordId === discordUser.id
          );
          matchingCustomers.forEach((c: Stripe.Customer) => {
            if (!allCustomers.find((existing: Stripe.Customer) => existing.id === c.id)) {
              allCustomers.push(c);
            }
          });
        }

        // Check each customer for active subscriptions
        for (const customer of allCustomers) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all',
            limit: 10
          });

          // Find active or trialing subscriptions
          const activeSubscription = subscriptions.data.find(
            (sub: Stripe.Subscription) => sub.status === 'active' || sub.status === 'trialing'
          );

          if (activeSubscription) {
                        // Map Stripe status to our Subscription status type
            // Only allow: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing'
            let subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' = 'active';
            if (activeSubscription.status === 'trialing') {
              subscriptionStatus = 'trialing';
            } else if (activeSubscription.status === 'canceled') {
              subscriptionStatus = 'canceled';
            } else if (activeSubscription.status === 'past_due') {
              subscriptionStatus = 'past_due';
            } else if (activeSubscription.status === 'unpaid') {
              subscriptionStatus = 'unpaid';
            }
            
            // Create subscription record in Firebase
            const subscriptionData = {
              userId: user.id,
              stripeCustomerId: customer.id,
              stripeSubscriptionId: activeSubscription.id,
              status: subscriptionStatus,
              currentPeriodStart: FirebaseService.timestampFromDate(new Date(activeSubscription.current_period_start * 1000)),
              currentPeriodEnd: FirebaseService.timestampFromDate(new Date(activeSubscription.current_period_end * 1000)),
              cancelAtPeriodEnd: activeSubscription.cancel_at_period_end || false,
              plan: 'monthly' as const,
              gracePeriodEnd: FirebaseService.timestampFromDate(
                new Date((activeSubscription.current_period_end + (2 * 24 * 60 * 60)) * 1000)
              ),
              createdAt: FirebaseService.timestampNow(),
              updatedAt: FirebaseService.timestampNow()
            };

            const subscriptionRecord = await FirebaseService.createSubscription(subscriptionData);
            
            // Update user with subscription ID and whitelist status
            const userUpdates: Partial<import('../services/firebaseService').User> = {
              subscriptionId: subscriptionRecord.id
            };
            // Set isWhitelisted to true when subscription is active or trialing
            if ((subscriptionStatus === 'active' || subscriptionStatus === 'trialing') && !user.isWhitelisted) {
              userUpdates.isWhitelisted = true;

            }
            await FirebaseService.updateUser(user.id, userUpdates);
            
            // Update Stripe metadata if needed
            if (!activeSubscription.metadata?.userId) {
              await stripe.subscriptions.update(activeSubscription.id, {
                metadata: {
                  ...activeSubscription.metadata,
                  userId: user.id,
                  discordId: discordUser.id,
                  email: user.email,
                  username: discordUser.username
                }
              });
            }

            subscription = subscriptionRecord;
                        break; // Found subscription, no need to continue
          }
        }
      } catch (error) {
                // Continue with normal flow even if Stripe check fails
      }
    }

    // If user has active subscription, add them to Discord server and assign role
    if (user.hasManualSubscription || (subscription && canAccessPortal(subscription))) {
      // Step 1: Add user to Discord server (using OAuth token with guilds.join scope, or bot token)
      let userInServer = false;
      let roleAssignedDuringAdd = false;
      const roleId = process.env.DISCORD_PAID_MEMBER_ROLE_ID || '';
      
      try {
        // Debug logging to verify we're using the correct token



                        // Pass role ID to addUserToGuild so role is assigned when user is added (more efficient)
        const addedToServer = await DiscordService.addUserToGuild(discordUser.id, accessToken, roleId);
        if (addedToServer) {
          // If role ID was provided, role should have been assigned during user addition
          if (roleId) {
            roleAssignedDuringAdd = true;
                      }
          
          // Verify user is actually in server
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          userInServer = await DiscordService.isUserInGuild(discordUser.id);
          if (userInServer) {
            if (roleAssignedDuringAdd) {
                          } else {
                          }
          } else {
                      }
        }
      } catch (error: any) {
              }
      
      // Step 2: Assign paid role ONLY if user is confirmed to be in server AND role wasn't already assigned
      if (userInServer && !roleAssignedDuringAdd) {
        const hasPaidRole = await DiscordBotService.checkMemberStatus(discordUser.id);
        if (!hasPaidRole) {
          try {
            const added = await DiscordBotService.addMemberToServer(discordUser.id);
            if (added) {
                          } else {

            }
          } catch (error: any) {
                      }
        } else {
                  }
      } else {
                      }
    } else {
      // No active subscription - ensure paid role is removed and block access
      const hasPaidRole = await DiscordBotService.checkMemberStatus(discordUser.id);
      if (hasPaidRole) {
        try {
          await DiscordBotService.removeMemberFromServer(discordUser.id);
                  } catch (error) {
                  }
      }

      return res.status(403).json({ 
        error: 'Not a paid member',
        message: 'You must have an active subscription to access the portal'
      });
    }

    // Verify user can access portal (active subscription, grace period, or manual subscription)
    if (!user.hasManualSubscription && subscription && !canAccessPortal(subscription)) {
      return res.status(403).json({ 
        error: 'Subscription expired',
        message: 'Your subscription has expired. Please renew to continue accessing the portal.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, discordId: user.discordId },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        discordId: user.discordId,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
        isWhitelisted: user.isWhitelisted,
        hasManualSubscription: user.hasManualSubscription || false
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Username/Password Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later.'
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if ((!username && !email) || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    // Find user by email or username (case-insensitive)
    const users = await FirebaseService.getAllUsers();
    const identifier = email || username;
    const user = users.find(u => 
      u.email?.toLowerCase() === identifier.toLowerCase() || 
      u.username?.toLowerCase() === identifier.toLowerCase()
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    // Check if user has a password
    if (!user.passwordHash) {
      return res.status(403).json({ 
        error: 'Password not set',
        message: 'Please create a password to continue. You will be redirected to the password creation page.',
        needsPassword: true
      });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check if user has completed setup (password + Discord)
    const setupComplete = !!(user.passwordHash && user.discordId);
    const needsDiscord = !user.discordId;
    const needsPassword = !user.passwordHash;

    // Check subscription status
    let subscription = null;
    if (user.subscriptionId) {
      subscription = await FirebaseService.getSubscriptionById(user.subscriptionId);
    } else {
      subscription = await FirebaseService.getSubscriptionByUserId(user.id);
    }

    // Verify user can access portal
    // Allow users in onboarding (who have paid but haven't completed setup) to proceed
    const isInOnboarding = !user.passwordHash || !user.discordId || (user.onboardingStep && user.onboardingStep < 5);
    
    if (!user.isAdmin && !user.hasManualSubscription && !isInOnboarding) {
      // Only check subscription if user is not in onboarding
      if (!subscription || !canAccessPortal(subscription)) {
        return res.status(403).json({
          error: 'Subscription required',
          message: 'Your subscription has expired. Please renew to continue accessing the portal.'
        });
      }
    }

    // Generate JWT token (even if Discord is missing - user can complete setup while authenticated)
    const token = jwt.sign(
      { userId: user.id, discordId: user.discordId },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Return token with user data, including setup status flags
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        discordId: user.discordId,
        discordEmail: user.discordEmail,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
        isWhitelisted: user.isWhitelisted,
        termsAccepted: user.termsAccepted || false,
        onboardingCompleted: user.onboardingCompleted || false,
        hasPassword: !!user.passwordHash,
        hasDiscord: !!user.discordId,
        needsPassword: needsPassword,
        needsDiscord: needsDiscord
      }
    });
  } catch (error: any) {
        res.status(500).json({ error: 'Login failed' });
  }
});

// Create Password (for existing users)
router.post('/create-password', authenticateToken, async (req, res) => {
  try {
    const { password, confirmPassword, username } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({ error: 'Password and confirmation are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const user = await FirebaseService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If username is provided, check availability and update
    if (username) {
      if (username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters long' });
      }

      // Check username availability (case-insensitive, excluding current user)
      const users = await FirebaseService.getAllUsers();
      const existingUser = users.find(
        u => u.id !== userId && u.username.toLowerCase() === username.toLowerCase()
      );

      if (existingUser) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Update user
    const updateData: Partial<import('../services/firebaseService').User> = {
      passwordHash,
      updatedAt: FirebaseService.timestampNow()
    };

    if (username && username !== user.username) {
      updateData.username = username;
    }

    // Update onboarding step if password is being created
    if (!user.passwordHash) {
      updateData.onboardingStep = 3; // Move to Discord step
    }

    await FirebaseService.updateUser(userId, updateData);

    res.json({ 
      success: true,
      message: 'Password created successfully'
    });
  } catch (error: any) {
        res.status(500).json({ error: 'Failed to create password' });
  }
});

// Check Username Availability
router.get('/username/check', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }

    // Check if username matches valid pattern (alphanumeric and underscores)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    }

    // Check availability (case-insensitive)
    const users = await FirebaseService.getAllUsers();
    const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase());

    res.json({ available: !exists });
  } catch (error: any) {
        res.status(500).json({ error: 'Failed to check username availability' });
  }
});

// Accept Terms
router.post('/accept-terms', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user data for audit log
    const user = await FirebaseService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Extract IP address (handle proxies)
    const ipAddress = 
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown';

    // Extract user agent
    const userAgent = req.headers['user-agent'] || 'unknown';

    // TOS Version information
    const TOS_VERSION = '1.0';
    const TOS_VERSION_DATE = '2025-11-28';
    
    // Generate SHA-256 hash of the terms (using a canonical representation)
    // In production, you might want to hash the actual terms text from a file
    const termsText = `RAIN.CLUB TERMS OF SERVICE v${TOS_VERSION} Effective Date: ${TOS_VERSION_DATE}`;
    const termsHash = crypto.createHash('sha256').update(termsText).digest('hex');

    // Record terms acceptance with full audit log (LEGALLY REQUIRED)
    await FirebaseService.recordTermsAcceptance(userId, {
      email: user.email,
      username: user.username,
      ipAddress,
      userAgent,
      termsVersion: TOS_VERSION,
      termsVersionDate: TOS_VERSION_DATE,
      termsHash,
      acceptanceMethod: 'clickwrap-checkbox'
    });

    // Update user record
    await FirebaseService.updateUser(userId, {
      termsAccepted: true,
      termsAcceptedAt: FirebaseService.timestampNow(),
      updatedAt: FirebaseService.timestampNow()
    });

    res.json({ 
      success: true, 
      message: 'Terms accepted successfully',
      version: TOS_VERSION,
      acceptedAt: new Date().toISOString()
    });
  } catch (error: any) {
        res.status(500).json({ error: 'Failed to accept terms' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    
    
    const authHeader = req.headers['authorization'];
    
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const user = await FirebaseService.getUserById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const responseData = {
      id: user.id,
      discordId: user.discordId,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isAdmin: user.isAdmin,
      isWhitelisted: user.isWhitelisted,
      hasManualSubscription: user.hasManualSubscription || false,
      termsAccepted: user.termsAccepted || false,
      onboardingCompleted: user.onboardingCompleted || false,
      hasPassword: !!user.passwordHash, // Indicate if user has password (for frontend checks)
      hasDiscord: !!user.discordId // Indicate if user has Discord connected
    };
    
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Direct login after payment (without Discord OAuth)
// This endpoint is called after successful payment to log the user in automatically
router.post('/login-after-payment', async (req, res) => {
  try {
    const { discordId, email, username, customerId, subscriptionId } = req.body;

    // Get data from Payment Element form (customerId, subscriptionId, email, etc.)
    // This is more reliable than searching Stripe when we have direct IDs

    const StripeService = require('../services/stripeService').StripeService;
    const stripe = StripeService.getClient();
    
    let activeSubscription: Stripe.Subscription | null = null;
    let subscriptionCustomer: Stripe.Customer | null = null;

    // If we have subscriptionId from Payment Element, use it directly (most reliable)
    if (subscriptionId) {
      try {
        activeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (activeSubscription && (activeSubscription.status === 'active' || activeSubscription.status === 'trialing' || activeSubscription.status === 'past_due')) {
          // Get customer from subscription
          if (activeSubscription.customer) {
            const customer = typeof activeSubscription.customer === 'string'
              ? await stripe.customers.retrieve(activeSubscription.customer)
              : activeSubscription.customer;
            if (typeof customer !== 'string' && !customer.deleted) {
              subscriptionCustomer = customer;
            }
          }
        }
      } catch (error) {
        // Subscription not found or not ready yet, continue with fallback
      }
    }

    // If we have customerId but no subscription yet, get customer and find subscription
    if (!activeSubscription && customerId) {
      try {
        subscriptionCustomer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        if (typeof subscriptionCustomer !== 'string' && !subscriptionCustomer.deleted) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'all',
            limit: 10
          });

          // Find active or trialing subscriptions
          const active = subscriptions.data.find(
            (sub: Stripe.Subscription) => 
              sub.status === 'active' || 
              sub.status === 'trialing' ||
              sub.status === 'past_due'
          );

          if (active) {
            activeSubscription = active;
          }
        }
      } catch (error) {
        // Customer not found, continue with fallback
      }
    }

    // Fallback: Search for customer by email or Discord ID (for Payment Link compatibility)
    if (!activeSubscription || !subscriptionCustomer) {
      let customers: Stripe.Customer[] = [];
      
      // If email is provided, search by email
      if (email) {
        const customersByEmail = await stripe.customers.list({
          email: email,
          limit: 10
        });
        customers = [...customersByEmail.data];
      }
      
      // Also search by Discord ID in metadata
      if (discordId) {
        const allCustomers = await stripe.customers.list({ limit: 100 });
        const matchingCustomers = allCustomers.data.filter(
          (c: Stripe.Customer) => c.metadata?.discordId === discordId
        );
        matchingCustomers.forEach((c: Stripe.Customer) => {
          if (!customers.find((existing: Stripe.Customer) => existing.id === c.id)) {
            customers.push(c);
          }
        });
      }

      // Check each customer for active subscriptions
      for (const customer of customers) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'all',
          limit: 10
        });

        // Find active or trialing subscriptions
        const active = subscriptions.data.find(
          (sub: Stripe.Subscription) => 
            sub.status === 'active' || 
            sub.status === 'trialing' ||
            sub.status === 'past_due'
        );

        if (active) {
          activeSubscription = active;
          subscriptionCustomer = customer;
          break;
        }
      }
    }

    if (!activeSubscription || !subscriptionCustomer) {
      return res.status(404).json({ 
        error: 'No active subscription',
        message: 'No active subscription found. Please complete payment first.'
      });
    }

    // CRITICAL: Check subscription owner FIRST (before any user creation)
    // This is the most reliable way to prevent duplicates - check if subscription already has an owner
    let user: import('../services/firebaseService').User | null = null;
    try {
      const existingSubscription = await FirebaseService.getSubscriptionByStripeSubscriptionId(activeSubscription.id);
      if (existingSubscription && existingSubscription.userId) {
        try {
          user = await FirebaseService.getUserById(existingSubscription.userId);
          if (user) {

            // Update with Discord ID if missing
            if (discordId && !user.discordId) {
              const updateData: Partial<import('../services/firebaseService').User> = {
                discordId: discordId
              };
              if (email && email !== user.email) {
                updateData.discordEmail = email;
              }
              if (username) updateData.username = username;
              user = await FirebaseService.updateUser(user.id, updateData) || user;
            }
          }
        } catch (error) {
                  }
      }
    } catch (error) {
      // Ignore, continue with normal flow
    }

    // Map Stripe subscription status to our subscription status
    const mapStripeStatusToSubscriptionStatus = (stripeStatus: string): 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' => {
      switch (stripeStatus) {
        case 'active':
        case 'trialing':
          return stripeStatus === 'trialing' ? 'trialing' : 'active';
        case 'canceled':
        case 'incomplete_expired':
          return 'canceled';
        case 'past_due':
          return 'past_due';
        case 'unpaid':
        case 'incomplete':
          return 'unpaid';
        default:
          return 'canceled';
      }
    };

    const subscriptionStatus = mapStripeStatusToSubscriptionStatus(activeSubscription.status);

    // Get or create Firebase user
    // Search by multiple methods to avoid duplicates:
    // 1. Subscription owner (already checked above - most reliable)
    // 2. Check Stripe metadata for userId
    // 3. Search by Discord ID
    // 4. Search by email
    
    // If user not found by subscription owner, continue searching
    if (!user) {
      try {
        // SECOND: Check if userId is in Stripe metadata (reliable but subscription check is first)
        if (!user) {
        const userIdFromMetadata = subscriptionCustomer.metadata?.userId || activeSubscription.metadata?.userId;
        if (userIdFromMetadata) {
          try {
            user = await FirebaseService.getUserById(userIdFromMetadata);
            if (user) {
                          }
          } catch (error) {
                      }
        }
      }

      // If not found by userId, search by Discord ID
      if (!user && discordId) {
        try {
          user = await FirebaseService.getUserByDiscordId(discordId);
          if (user) {
                      }
        } catch (error) {
                  }
      }

      // CRITICAL: Check subscription owner FIRST (most reliable way to prevent duplicates)
      // This prevents race conditions where multiple requests create duplicate users
      if (!user && activeSubscription) {
        try {
          const existingSubscription = await FirebaseService.getSubscriptionByStripeSubscriptionId(activeSubscription.id);
          if (existingSubscription && existingSubscription.userId) {
            const ownerUser = await FirebaseService.getUserById(existingSubscription.userId);
            if (ownerUser) {

              user = ownerUser;
              // Update with Discord ID if missing
              if (discordId && !user.discordId) {
                const updateData: Partial<import('../services/firebaseService').User> = {
                  discordId: discordId
                };
                if (email && email !== user.email) {
                  updateData.discordEmail = email;
                }
                if (username) updateData.username = username;
                user = await FirebaseService.updateUser(user.id, updateData) || user;
              }
            }
          }
        } catch (error) {
                  }
      }

      // If still not found, search by email (payment email from customer)
      // Extract email from customer if not provided in request
      const paymentEmail = email || subscriptionCustomer.email || subscriptionCustomer.metadata?.email || '';
      if (!user && paymentEmail) {
        try {
          user = await FirebaseService.getUserByEmail(paymentEmail);
          if (user) {
                        // If user found by email but doesn't have Discord ID, update it
            if (discordId && !user.discordId) {
                            const updateData: Partial<import('../services/firebaseService').User> = {
                discordId: discordId
              };
              if (email && email !== user.email) {
                updateData.discordEmail = email;
              }
              if (username) updateData.username = username;
              user = await FirebaseService.updateUser(user.id, updateData) || user;
            } else if (discordId && user.discordId && user.discordId !== discordId) {
              // If Discord ID differs, update it (user might have changed Discord account)
                            const updateData: Partial<import('../services/firebaseService').User> = {
                discordId: discordId
              };
              if (email && email !== user.email) updateData.discordEmail = email;
              if (username) updateData.username = username;
              user = await FirebaseService.updateUser(user.id, updateData) || user;
            }
          }
        } catch (error) {
                  }
      }
      } catch (firebaseError: any) {

        // If Firebase isn't configured, we can't create users, but we can still check Stripe
        // and return an error with helpful message
        if (firebaseError.code === 16 || firebaseError.message?.includes('authentication credentials')) {
          return res.status(500).json({ 
            error: 'Firebase not configured',
            message: 'Firebase authentication credentials are missing or invalid. Please check your FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and FIREBASE_PROJECT_ID environment variables, or ensure firebase-service-account.json exists.',
            details: 'This is required to create and manage users. For local development, make sure Firebase credentials are properly set up in your backend/.env file.'
          });
        }
        // Re-throw other Firebase errors
        throw firebaseError;
      }
    }

    // If user doesn't exist, create them (webhook might not have processed yet)
    // Extract email from Stripe customer if not provided in request
    const finalEmail = email || subscriptionCustomer.email || subscriptionCustomer.metadata?.email || '';
    
    // But only if we have at least Discord ID or email to identify the user
    if (!user && (discordId || finalEmail)) {
            try {
        // Double-check one more time in case user was created by concurrent request
        if (discordId) {
          try {
            const existingUser = await FirebaseService.getUserByDiscordId(discordId);
            if (existingUser) {
                            user = existingUser;
            }
          } catch (e) {
            // Ignore
          }
        }
        
        if (!user && finalEmail) {
          try {
            const existingUser = await FirebaseService.getUserByEmail(finalEmail);
            if (existingUser) {
                            user = existingUser;
              
              // Update with Discord ID if missing
              if (discordId && !user.discordId) {
                                const updateData: Partial<import('../services/firebaseService').User> = {
                  discordId: discordId
                };
                if (email && email !== user.email) {
                  updateData.discordEmail = email;
                }
                if (username) updateData.username = username;
                user = await FirebaseService.updateUser(user.id, updateData) || user;
              } else if (discordId && user.discordId && user.discordId !== discordId) {
                // If Discord ID differs, update it
                                const updateData: Partial<import('../services/firebaseService').User> = {
                  discordId: discordId
                };
                if (email && email !== user.email) updateData.discordEmail = email;
                if (username) updateData.username = username;
                user = await FirebaseService.updateUser(user.id, updateData) || user;
              }
            }
          } catch (e) {
            // Ignore
          }
        }
        
        // CRITICAL: Final check before creating user to prevent race conditions
        // Check subscription owner FIRST (most reliable way to prevent duplicates)
        if (!user) {
          try {
            const subCheck = await FirebaseService.getSubscriptionByStripeSubscriptionId(activeSubscription.id);
            if (subCheck && subCheck.userId) {
              const ownerCheck = await FirebaseService.getUserById(subCheck.userId);
              if (ownerCheck) {

                user = ownerCheck;
                // Update with Discord ID if missing
                if (discordId && !user.discordId) {
                  const updateData: Partial<import('../services/firebaseService').User> = {
                    discordId: discordId
                  };
                  if (email && email !== user.email) {
                    updateData.discordEmail = email;
                  }
                  if (username) updateData.username = username;
                  user = await FirebaseService.updateUser(user.id, updateData) || user;
                }
              }
            }
          } catch (e) {
            // Ignore
          }
        }
        
        // If still no user, check by email one more time (prevents duplicates from concurrent requests)
        if (!user && finalEmail) {
          try {
            const finalCheck = await FirebaseService.getUserByEmail(finalEmail);
            if (finalCheck) {

              user = finalCheck;
              // Update with Discord ID if missing
              if (discordId && !user.discordId) {
                const updateData: Partial<import('../services/firebaseService').User> = {
                  discordId: discordId
                };
                if (email && email !== user.email) {
                  updateData.discordEmail = email;
                }
                if (username) updateData.username = username;
                user = await FirebaseService.updateUser(user.id, updateData) || user;
              }
            }
          } catch (e) {
            // Ignore, proceed with creation
          }
        }
        
        // Final check by Discord ID if still no user (prevents duplicates)
        if (!user && discordId) {
          try {
            const finalDiscordCheck = await FirebaseService.getUserByDiscordId(discordId);
            if (finalDiscordCheck) {

              user = finalDiscordCheck;
            }
          } catch (e) {
            // Ignore, proceed with creation
          }
        }
        
        // If still no user after all checks, create one
        if (!user) {
          // Use finalEmail which extracts from Stripe customer if not in request
          // Email is required for user creation
          if (!finalEmail) {
            return res.status(400).json({ 
              error: 'Missing email',
              message: 'Email is required. Unable to find email from Stripe customer. Please contact support.'
            });
          }
          
          // Get Discord email if different (from request or metadata)
          const discordEmailFromRequest = req.body.discordEmail;
          
          const userData: Omit<import('../services/firebaseService').User, 'id' | 'createdAt' | 'updatedAt'> = {
            username: username || subscriptionCustomer.metadata?.username || subscriptionCustomer.name || finalEmail.split('@')[0] || 'User',
            email: finalEmail, // Use email from Stripe customer (required)
            isWhitelisted: false,
            isAdmin: false,
            termsAccepted: false,
            onboardingCompleted: false
          };
          
          // Only include discordId if it exists (Firestore doesn't allow undefined)
          if (discordId) {
            userData.discordId = discordId;
          }
          
          // If Discord email is provided and different from payment email, store it
          if (discordEmailFromRequest && discordEmailFromRequest !== finalEmail) {
            userData.discordEmail = discordEmailFromRequest;
          }

          if (subscriptionCustomer.metadata?.username) {
            userData.username = subscriptionCustomer.metadata.username;
          }
          if (subscriptionCustomer.metadata?.avatar) {
            userData.avatar = subscriptionCustomer.metadata.avatar;
          }
          
          // Only create if we still don't have a user
          if (!user) {
            try {
              user = await FirebaseService.createUser(userData);

            } catch (createError: any) {
              // If creation fails due to duplicate (race condition), try to find the user again
              if (createError.message?.includes('already exists') || createError.code === 6) {

                if (finalEmail) {
                  try {
                    user = await FirebaseService.getUserByEmail(finalEmail);
                    if (user) {
                                          }
                  } catch (e) {
                    // Ignore
                  }
                }
                if (!user && discordId) {
                  try {
                    user = await FirebaseService.getUserByDiscordId(discordId);
                    if (user) {
                                          }
                  } catch (e) {
                    // Ignore
                  }
                }
                // If still no user, throw the original error
                if (!user) {
                  throw createError;
                }
              } else {
                throw createError;
              }
            }
          }
        }
      } catch (createError: any) {
                if (createError.code === 16 || createError.message?.includes('authentication credentials')) {
          return res.status(500).json({ 
            error: 'Firebase not configured',
            message: 'Firebase authentication credentials are missing or invalid. Please check your FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and FIREBASE_PROJECT_ID environment variables, or ensure firebase-service-account.json exists.',
            details: 'This is required to create and manage users. For local development, make sure Firebase credentials are properly set up in your backend/.env file.'
          });
        }
        // If error is "already exists", try to fetch again
        if (createError.message?.includes('already exists') || createError.code === 6) {

          if (email) {
            try {
              user = await FirebaseService.getUserByEmail(email);
              if (user) {
                              }
            } catch (e) {
              // Ignore
            }
          }
          if (!user && discordId) {
            try {
              user = await FirebaseService.getUserByDiscordId(discordId);
              if (user) {
                              }
            } catch (e) {
              // Ignore
            }
          }
        }
        
        // If we still don't have a user after error handling, throw
        if (!user) {
          throw createError;
        }
      }
    }

    // Ensure we have a user at this point
    if (!user) {
      return res.status(500).json({ 
        error: 'User creation failed',
        message: 'Unable to find or create user. Please ensure you have provided either a Discord ID or email address.'
      });
    }

    // Check if subscription exists in Firebase
    // Check by Stripe subscription ID first (most reliable) to prevent duplicates
    let subscription: import('../services/firebaseService').Subscription | null = null;
    
    try {
      // First check by Stripe subscription ID (prevents duplicates)
      subscription = await FirebaseService.getSubscriptionByStripeSubscriptionId(activeSubscription.id);
      if (subscription) {
              }
      
      // If not found, check by user's subscription ID
      if (!subscription && user.subscriptionId) {
        subscription = await FirebaseService.getSubscriptionById(user.subscriptionId);
        if (subscription) {
                  }
      }
      
      // If still not found, check by user ID
      if (!subscription) {
        subscription = await FirebaseService.getSubscriptionByUserId(user.id);
        if (subscription) {
                  }
      }
    } catch (firebaseError: any) {
            if (firebaseError.code === 16 || firebaseError.message?.includes('authentication credentials')) {
        return res.status(500).json({ 
          error: 'Firebase not configured',
          message: 'Firebase authentication credentials are missing or invalid. Please check your FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and FIREBASE_PROJECT_ID environment variables, or ensure firebase-service-account.json exists.',
          details: 'This is required to create and manage subscriptions. For local development, make sure Firebase credentials are properly set up in your backend/.env file.'
        });
      }
      throw firebaseError;
    }

    // Create or update subscription in Firebase if needed
    if (!subscription) {
            try {
        // Double-check one more time in case subscription was created by concurrent request
        const existingSubscription = await FirebaseService.getSubscriptionByStripeSubscriptionId(activeSubscription.id);
        if (existingSubscription) {
                    subscription = existingSubscription;
        }
        
        // If still no subscription, create one
        if (!subscription) {
          const subscriptionData: Omit<import('../services/firebaseService').Subscription, 'id' | 'createdAt' | 'updatedAt'> = {
            userId: user.id,
            stripeSubscriptionId: activeSubscription.id,
            stripeCustomerId: subscriptionCustomer.id,
            status: subscriptionStatus,
            plan: 'monthly' as const,
            currentPeriodStart: FirebaseService.timestampFromDate(new Date(activeSubscription.current_period_start * 1000)),
            currentPeriodEnd: FirebaseService.timestampFromDate(new Date(activeSubscription.current_period_end * 1000)),
            cancelAtPeriodEnd: activeSubscription.cancel_at_period_end || false
          };

          subscription = await FirebaseService.createSubscription(subscriptionData);
                  }
        
        // Update user with subscription ID and whitelist status (only if we have subscription)
        if (subscription) {
          const userUpdates: Partial<import('../services/firebaseService').User> = {
            subscriptionId: subscription.id
          };
          // Set isWhitelisted to true when subscription is active or trialing
          if ((subscriptionStatus === 'active' || subscriptionStatus === 'trialing') && !user.isWhitelisted) {
            userUpdates.isWhitelisted = true;

          }
          await FirebaseService.updateUser(user.id, userUpdates);
          user.subscriptionId = subscription.id;
          if (userUpdates.isWhitelisted) {
            user.isWhitelisted = true;
          }
        }
      } catch (createError: any) {
                // If error is "already exists", try to fetch again
        if (createError.message?.includes('already exists') || createError.code === 6) {

          try {
            subscription = await FirebaseService.getSubscriptionByStripeSubscriptionId(activeSubscription.id);
            if (subscription) {
                            // Update user with subscription ID if we found it
              const userUpdates: Partial<import('../services/firebaseService').User> = {
                subscriptionId: subscription.id
              };
              if ((subscriptionStatus === 'active' || subscriptionStatus === 'trialing') && !user.isWhitelisted) {
                userUpdates.isWhitelisted = true;

              }
              await FirebaseService.updateUser(user.id, userUpdates);
              user.subscriptionId = subscription.id;
              if (userUpdates.isWhitelisted) {
                user.isWhitelisted = true;
              }
            }
          } catch (e) {
            // Ignore
          }
        }
        
        // If we still don't have a subscription after error handling, throw
        if (!subscription) {
          if (createError.code === 16 || createError.message?.includes('authentication credentials')) {
            return res.status(500).json({ 
              error: 'Firebase not configured',
              message: 'Firebase authentication credentials are missing or invalid. Please check your FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and FIREBASE_PROJECT_ID environment variables, or ensure firebase-service-account.json exists.',
              details: 'This is required to create and manage subscriptions. For local development, make sure Firebase credentials are properly set up in your backend/.env file.'
            });
          }
          throw createError;
        }
      }
    } else {
      // Update existing subscription
      try {
        const subscriptionData: Partial<import('../services/firebaseService').Subscription> = {
          status: subscriptionStatus,
          currentPeriodStart: FirebaseService.timestampFromDate(new Date(activeSubscription.current_period_start * 1000)),
          currentPeriodEnd: FirebaseService.timestampFromDate(new Date(activeSubscription.current_period_end * 1000)),
          cancelAtPeriodEnd: activeSubscription.cancel_at_period_end || false
        };
        
        subscription = await FirebaseService.updateSubscription(subscription.id, subscriptionData) || subscription;
        
        // Update user whitelist status if subscription is now active/trialing
        if ((subscriptionStatus === 'active' || subscriptionStatus === 'trialing') && !user.isWhitelisted) {
          await FirebaseService.updateUser(user.id, { isWhitelisted: true });
          user.isWhitelisted = true;

        }
        
              } catch (updateError: any) {
                // Don't fail login if update fails, subscription still exists
        if (updateError.code === 16 || updateError.message?.includes('authentication credentials')) {
                  } else {
          throw updateError;
        }
      }
    }

    // Update Stripe customer metadata with Firebase userId if not set
    if (subscriptionCustomer.metadata?.userId !== user.id) {
      await stripe.customers.update(subscriptionCustomer.id, {
        metadata: {
          ...subscriptionCustomer.metadata,
          userId: user.id,
          discordId: user.discordId || discordId || '',
          email: user.email || email || '',
          username: user.username || username || ''
        }
      });
    }

    // Update Stripe subscription metadata if needed
    if (activeSubscription.metadata?.userId !== user.id) {
      await stripe.subscriptions.update(activeSubscription.id, {
        metadata: {
          ...activeSubscription.metadata,
          userId: user.id,
          discordId: user.discordId || discordId || '',
          email: user.email || email || '',
          username: user.username || username || ''
        }
      });
    }

    // Ensure user has paid role in Discord (if Discord ID available)
    // Try to get Discord ID from user object if not passed in request
    const finalDiscordIdForRole = discordId || user.discordId;
    let needsDiscordOAuth = false; // Flag to indicate user needs to complete Discord OAuth
    let userInServer = false;
    
    if (finalDiscordIdForRole && (subscriptionStatus === 'active' || subscriptionStatus === 'trialing')) {
      try {
                // Step 1: Check if user is already in Discord server
        // Note: In login-after-payment, we don't have OAuth token, so we cannot add them automatically
        // Discord API requires user's OAuth token (with guilds.join scope) to add users
        // User must complete Discord OAuth login to be added
        try {
          // Check if user is already in server (maybe they joined manually or via previous OAuth)
          userInServer = await DiscordService.isUserInGuild(finalDiscordIdForRole);
          if (userInServer) {
                      } else {

                        needsDiscordOAuth = true; // Mark that user needs Discord OAuth
          }
        } catch (error: any) {
                    // If check fails, assume user is not in server and needs OAuth
          needsDiscordOAuth = true;
        }
        
        // Step 2: Assign paid role ONLY if user is confirmed to be in server
        if (userInServer) {
          const hasPaidRole = await DiscordBotService.checkMemberStatus(finalDiscordIdForRole);
          if (!hasPaidRole) {
                        const added = await DiscordBotService.addMemberToServer(finalDiscordIdForRole);
            if (added) {
                          } else {

            }
          } else {
                      }
        } else {
                            }
      } catch (error: any) {
                if (error?.response) {
                            }
        // Don't fail the login if Discord role assignment fails
      }
    } else if (!finalDiscordIdForRole) {
            // If user has no Discord ID, they should complete OAuth to get one
      needsDiscordOAuth = true;
    }

    // Verify user can access portal (active subscription, grace period, or manual subscription)
    if (!user.hasManualSubscription && !canAccessPortal(subscription)) {
      return res.status(403).json({ 
        error: 'Subscription expired',
        message: 'Your subscription has expired. Please renew to continue accessing the portal.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, discordId: user.discordId },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

        res.json({
      token,
      user: {
        id: user.id,
        discordId: user.discordId,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
        isWhitelisted: user.isWhitelisted,
        hasManualSubscription: user.hasManualSubscription || false
      },
      needsDiscordOAuth // Flag indicating if user needs to complete Discord OAuth to join server
    });
  } catch (error: any) {
        res.status(500).json({ 
      error: 'Login failed',
      message: error.message || 'Failed to log in after payment'
    });
  }
});

// Rate limiters for OTP endpoints
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per 15 minutes per IP
  message: 'Too many OTP requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes per IP
  message: 'Too many verification attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Request OTP for email login
router.post('/otp/request', otpRequestLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Check if user exists with this email
    let user;
    try {
      user = await FirebaseService.getUserByEmail(email);
    } catch (error) {
      // User doesn't exist - return generic message for security
      return res.json({ 
        success: true,
        message: 'If an account exists with this email, a code has been sent.'
      });
    }
    
    if (!user) {
      // Return generic message for security (don't reveal if email exists)
      return res.json({ 
        success: true,
        message: 'If an account exists with this email, a code has been sent.'
      });
    }
    
    // Verify user has active subscription
    if (!user.subscriptionId) {
      return res.status(403).json({ 
        error: 'No subscription',
        message: 'Please complete your payment first.'
      });
    }
    
    // Check subscription status
    const subscription = await FirebaseService.getSubscriptionById(user.subscriptionId);
    if (!subscription) {
      return res.status(403).json({ 
        error: 'No subscription',
        message: 'Please complete your payment first.'
      });
    }
    
    const canAccess = canAccessPortal(subscription);
    if (!canAccess) {
      return res.status(403).json({ 
        error: 'Subscription expired',
        message: 'Your subscription has expired. Please renew to continue.'
      });
    }
    
    // Generate and send OTP
    const otpCode = await FirebaseService.generateOTPCode();
    await FirebaseService.saveOTPCode(email, otpCode);
    
    // Send OTP email
    const EmailService = require('../services/emailService').EmailService;
    await EmailService.sendOTPEmail(email, otpCode);
    
    res.json({ 
      success: true,
      message: 'If an account exists with this email, a code has been sent.'
    });
  } catch (error: any) {
        res.status(500).json({ error: 'Failed to send OTP code' });
  }
});

// Verify OTP and login
router.post('/otp/verify', otpVerifyLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Invalid code format. Code must be 6 digits.' });
    }
    
    // Verify OTP
    const isValid = await FirebaseService.verifyOTPCode(email, code);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid or expired code' });
    }
    
    // Get user
    const user = await FirebaseService.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check subscription
    if (!user.subscriptionId) {
      return res.status(403).json({ 
        error: 'No subscription',
        message: 'Please complete your payment first.'
      });
    }
    
    const subscription = await FirebaseService.getSubscriptionById(user.subscriptionId);
    if (!subscription) {
      return res.status(403).json({ 
        error: 'No subscription',
        message: 'Please complete your payment first.'
      });
    }
    
    const canAccess = canAccessPortal(subscription);
    if (!canAccess) {
      return res.status(403).json({ 
        error: 'Subscription expired',
        message: 'Your subscription has expired. Please renew to continue.'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        discordEmail: user.discordEmail,
        username: user.username,
        discordId: user.discordId,
        isAdmin: user.isAdmin,
        isWhitelisted: user.isWhitelisted,
      },
    });
  } catch (error: any) {
        res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Link Discord account with verification code
router.post('/discord/link', async (req, res) => {
  try {
    const { code, verificationCode } = req.body;
    
    if (!code || !verificationCode) {
      return res.status(400).json({ error: 'Discord code and verification code are required' });
    }
    
    // Validate verification code format (RAIN-XXXX)
    if (!/^RAIN-[A-Z0-9]{4}$/.test(verificationCode)) {
      return res.status(400).json({ error: 'Invalid verification code format' });
    }
    
    // Construct redirect URI
    const requestHost = req.get('host') || '';
    const isLocalhost = requestHost.includes('localhost') || requestHost.includes('127.0.0.1');
    
    let redirectUri: string;
    if (isLocalhost || process.env.NODE_ENV === 'development') {
      redirectUri = 'http://localhost:3001/auth/discord/callback';
    } else {
      redirectUri = process.env.DISCORD_REDIRECT_URI || 'https://rain.club/auth/discord/callback';
    }
    
    // Exchange Discord OAuth code for token
    const tokenData = await DiscordService.exchangeCodeForToken(code, redirectUri);
    const discordUser = await DiscordService.getUserInfo(tokenData.access_token);
    
    // Find user by verification code
    const user = await FirebaseService.getUserByVerificationCode(verificationCode);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired verification code' });
    }
    
    // Update user with Discord info
    const updateData: Partial<import('../services/firebaseService').User> = {
      discordId: discordUser.id,
      discordEmail: discordUser.email,
      username: discordUser.username,
      verificationCode: undefined, // Clear code after use (one-time use)
      verificationCodeExpiresAt: undefined,
    };
    
    if (discordUser.avatar) {
      updateData.avatar = discordUser.avatar;
    }
    
    const updatedUser = await FirebaseService.updateUser(user.id, updateData);
    
    if (!updatedUser) {
      return res.status(500).json({ error: 'Failed to update user' });
    }
    
    // Add user to Discord server
    try {
      await DiscordBotService.addMemberToServer(discordUser.id);
          } catch (error) {
            // Continue even if Discord server add fails
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: updatedUser.id, email: updatedUser.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        discordEmail: updatedUser.discordEmail,
        username: updatedUser.username,
        discordId: updatedUser.discordId,
        isAdmin: updatedUser.isAdmin,
        isWhitelisted: updatedUser.isWhitelisted,
      },
    });
  } catch (error: any) {
        if (error.message?.includes('Invalid OAuth2 access token')) {
      return res.status(401).json({ error: 'Invalid Discord authorization code' });
    }
    res.status(500).json({ error: 'Failed to link Discord account' });
  }
});

// Resend verification code
const resendCodeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour per IP
  message: 'Too many requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/verification/resend', authenticateToken, resendCodeLimiter, async (req, res) => {
  try {
    const userId = req.user!.id;
    const user = await FirebaseService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.email) {
      return res.status(400).json({ error: 'No email address found for this account' });
    }
    
    // Generate new verification code
    const verificationCode = await FirebaseService.generateVerificationCode();
    const codeExpiresAt = FirebaseService.timestampFromDate(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    );
    
    // Update user with new code
    await FirebaseService.updateUser(userId, {
      verificationCode,
      verificationCodeExpiresAt: codeExpiresAt,
    });
    
    // Send verification code email
    const EmailService = require('../services/emailService').EmailService;
    await EmailService.resendVerificationCodeEmail(user.email, user.username || 'there', verificationCode);
    
    res.json({ 
      success: true,
      message: 'Verification code has been sent to your email'
    });
  } catch (error: any) {
        res.status(500).json({ error: 'Failed to resend verification code' });
  }
});

// Check Discord connection status
router.get('/discord/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const user = await FirebaseService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      connected: !!user.discordId,
      discordId: user.discordId || undefined,
      discordEmail: user.discordEmail || undefined,
    });
  } catch (error: any) {
        res.status(500).json({ error: 'Failed to get Discord status' });
  }
});

// Disconnect Discord (optional)
router.post('/discord/disconnect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const user = await FirebaseService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.discordId) {
      return res.status(400).json({ error: 'Discord account is not connected' });
    }
    
    // Remove Discord ID and Discord email, keep payment email and subscription
    // Use Firestore's deleteField() to properly remove fields
    const { FieldValue } = require('firebase-admin/firestore');
    await FirebaseService.updateUser(userId, {
      discordId: FieldValue.delete(),
      discordEmail: FieldValue.delete(),
    } as any);
    
    res.json({ 
      success: true,
      message: 'Discord account disconnected successfully'
    });
  } catch (error: any) {
        res.status(500).json({ error: 'Failed to disconnect Discord account' });
  }
});

export default router;