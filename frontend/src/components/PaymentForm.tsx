import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';
import { paymentAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

// Matrix Rain Animation Component
const MatrixRain = () => {
  useEffect(() => {
    const canvas = document.getElementById("matrix-canvas") as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}";
    const matrixArray = matrix.split("");

    const fontSize = 10;
    const columns = canvas.width / fontSize;

    const drops: number[] = [];
    for (let x = 0; x < columns; x++) {
      drops[x] = 1;
    }

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#FFD700"; // Golden color
      ctx.font = fontSize + "px monospace";

      for (let i = 0; i < drops.length; i++) {
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        const text = matrixArray[Math.floor(Math.random() * matrixArray.length)];
        ctx.fillText(text, x, y);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 35);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      id="matrix-canvas"
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
      style={{ background: "black" }}
    />
  );
};

// Initialize Stripe
const getStripePublishableKey = () => {
  // Support multiple environment variable naming conventions for backward compatibility
  const liveKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_LIVE;
  const testKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  
  // Use live key if provided and in production mode, otherwise use test key
  if (import.meta.env.MODE === 'production' && liveKey) {
    return liveKey;
  }
  
  // Return test key or fallback to live key if test key not available
  const key = testKey || liveKey || '';
  
  if (!key) {
    console.error('Stripe publishable key is not configured. Please set VITE_STRIPE_PUBLISHABLE_KEY_TEST in your .env file.');
  }
  
  return key;
};

interface PaymentFormProps {
  plan: 'monthly';
  email?: string;
  discordId?: string;
  discordUsername?: string;
}

interface PaymentElementFormProps {
  plan: 'monthly';
  customerEmail: string;
  customerId: string;
  discordId?: string;
  discordUsername?: string;
  clientSecret?: string | null;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
  setError: (value: string | null) => void;
  setMessage: (value: string | null) => void;
}

const PaymentElementForm: React.FC<PaymentElementFormProps> = ({
  plan,
  customerEmail,
  customerId,
  discordId,
  discordUsername,
  clientSecret,
  isProcessing,
  setIsProcessing,
  setError,
  setMessage,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  // Helper function to get email from PaymentElement
  const getEmailFromPaymentElement = async (): Promise<string | null> => {
    // PaymentElement doesn't expose getValue() method
    // Use customerEmail prop instead, which is already available
    return customerEmail || null;
  };


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsProcessing(true);
    setError(null);
    setMessage(null);

    if (!stripe || !elements) {
      setError('Stripe is not loaded');
      setIsProcessing(false);
      return;
    }

    try {
      // Get email from input field or PaymentElement (required)
      const emailFromElement = customerEmail || await getEmailFromPaymentElement();

      // Ensure email is provided (required)
      if (!emailFromElement || !emailFromElement.includes('@')) {
        setError('Email address is required. Please enter your email address above.');
        setIsProcessing(false);
        return;
      }

      // Confirm payment setup
      // Payment Element may auto-confirm, so check if already confirmed
      const { error: stripeError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        // Check if error is because setup intent is already confirmed or used
        if (stripeError.code === 'setup_intent_unexpected_state' || 
            stripeError.code === 'resource_already_exists' ||
            stripeError.message?.includes('already been used') ||
            stripeError.message?.includes('already confirmed') ||
            stripeError.message?.includes('This SetupIntent has already been used')) {
          // Setup intent already confirmed, retrieve it using clientSecret prop
          if (clientSecret) {
            try {
              console.log('Setup intent already confirmed, retrieving...', clientSecret);
              const retrievedSetupIntent = await stripe.retrieveSetupIntent(clientSecret);
              
              if (retrievedSetupIntent.setupIntent && 
                  retrievedSetupIntent.setupIntent.status === 'succeeded' && 
                  retrievedSetupIntent.setupIntent.payment_method) {
                console.log('Retrieved confirmed setup intent:', retrievedSetupIntent.setupIntent.id);
                
                // Get email from input field or PaymentElement (required)
                const emailToUse = customerEmail || await getEmailFromPaymentElement();
                
                if (!emailToUse || !emailToUse.includes('@')) {
                  setError('Email address is required. Please enter your email address above.');
                  setIsProcessing(false);
                  return;
                }

                // Use retrieved setup intent to create subscription
                // Use props directly (parent already handles state values)
                const finalDiscordId = discordId || undefined;
                const finalDiscordUsername = discordUsername || undefined;
                
                const subscriptionResponse = await paymentAPI.createSubscription(
                  retrievedSetupIntent.setupIntent.payment_method as string,
                  customerId,
                  emailToUse,
                  plan,
                  finalDiscordId,
                  finalDiscordUsername
                );
                
                if (!subscriptionResponse) {
                  setError('Failed to create subscription');
                  setIsProcessing(false);
                  return;
                }
                
                // Handle subscription response (same logic as normal flow below)
                if (subscriptionResponse.status === 'active' || subscriptionResponse.status === 'trialing') {
                  setMessage('Subscription activated successfully! Redirecting...');
                  setTimeout(() => {
                    const params = new URLSearchParams();
                    if (finalDiscordId) params.set('discordId', finalDiscordId);
                    if (finalDiscordUsername) params.set('username', finalDiscordUsername);
                    if (customerEmail) params.set('email', customerEmail);
                    navigate(`/payment-success?${params.toString()}`);
                  }, 2000);
                } else if (subscriptionResponse.clientSecret) {
                  const returnParams = new URLSearchParams();
                  if (finalDiscordId) returnParams.set('discordId', finalDiscordId);
                  if (finalDiscordUsername) returnParams.set('username', finalDiscordUsername);
                  if (customerEmail) returnParams.set('email', customerEmail);
                  
                  const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
                    clientSecret: subscriptionResponse.clientSecret,
                    confirmParams: {
                      return_url: `${window.location.origin}/payment-success?${returnParams.toString()}`,
                    },
                    redirect: 'if_required',
                  });
                  if (paymentError) {
                    setError(paymentError.message || 'Payment confirmation failed');
                    setIsProcessing(false);
                  } else if (paymentIntent?.status === 'succeeded') {
                    setMessage('Payment confirmed! Your subscription is now active. Redirecting...');
                    const params = new URLSearchParams();
                    if (finalDiscordId) params.set('discordId', finalDiscordId);
                    if (finalDiscordUsername) params.set('username', finalDiscordUsername);
                    if (customerEmail) params.set('email', customerEmail);
                    navigate(`/payment-success?${params.toString()}`);
                  }
                }
                return;
              }
            } catch (retrieveError: any) {
              console.error('Error retrieving setup intent:', retrieveError);
              // Fall through to show error
            }
          }
          
          // If retrieval fails, show error message
          // Note: elements.submit() doesn't return paymentMethod, so we can't use it as a fallback
          
          // Fallback: show error
          setError('Payment was already processed. Please check your subscription status or try refreshing the page.');
          setIsProcessing(false);
          return;
        }
        
        console.error('Stripe setup error:', stripeError);
        setError(stripeError.message || 'Payment setup failed');
        setIsProcessing(false);
        return;
      }

      // Create subscription with the payment method
      if (setupIntent && setupIntent.status === 'succeeded' && setupIntent.payment_method) {
        // Get email from input field or PaymentElement (required)
        const emailToUse = customerEmail || await getEmailFromPaymentElement();
        
        if (!emailToUse || !emailToUse.includes('@')) {
          setError('Email address is required. Please enter your email address above.');
          setIsProcessing(false);
          return;
        }

        // Use props directly (parent already handles state values)
        const finalDiscordId = discordId || undefined;
        const finalDiscordUsername = discordUsername || undefined;
        
        const subscriptionResponse = await paymentAPI.createSubscription(
          setupIntent.payment_method as string,
          customerId,
          emailToUse,
          plan,
          finalDiscordId,
          finalDiscordUsername
        );

        // subscriptionResponse doesn't have an error property, check status instead
        if (!subscriptionResponse) {
          setError('Failed to create subscription');
          setIsProcessing(false);
          return;
        }
        
        // Handle subscription status
        if (subscriptionResponse.status === 'active' || subscriptionResponse.status === 'trialing') {
          setMessage('Subscription activated successfully! Redirecting...');
          setTimeout(() => {
            // Redirect to payment success page with Discord info if available
            const params = new URLSearchParams();
            if (finalDiscordId) params.set('discordId', finalDiscordId);
            if (finalDiscordUsername) params.set('username', finalDiscordUsername);
            if (customerEmail) params.set('email', customerEmail);
            navigate(`/payment-success?${params.toString()}`);
          }, 2000);
        } else if (subscriptionResponse.clientSecret) {
          // Confirm payment for the first invoice (status is 'incomplete')
          const returnParams = new URLSearchParams();
          if (finalDiscordId) returnParams.set('discordId', finalDiscordId);
          if (finalDiscordUsername) returnParams.set('username', finalDiscordUsername);
          if (customerEmail) returnParams.set('email', customerEmail);
          
          const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
            clientSecret: subscriptionResponse.clientSecret,
            confirmParams: {
              return_url: `${window.location.origin}/payment-success?${returnParams.toString()}`,
            },
            redirect: 'if_required',
          });

          if (paymentError) {
            setError(paymentError.message || 'Payment confirmation failed');
            setIsProcessing(false);
          } else if (paymentIntent) {
            if (paymentIntent.status === 'succeeded') {
              // Payment succeeded, redirect to payment success page
              setMessage('Payment confirmed! Your subscription is now active. Redirecting...');
              const params = new URLSearchParams();
              if (finalDiscordId) params.set('discordId', finalDiscordId);
              if (finalDiscordUsername) params.set('username', finalDiscordUsername);
              if (customerEmail) params.set('email', customerEmail);
              navigate(`/payment-success?${params.toString()}`);
            } else if (paymentIntent.status === 'requires_action') {
              // 3D Secure or other authentication required
              setMessage('Please complete authentication to finish payment...');
            } else {
              setMessage(`Payment status: ${paymentIntent.status}. Processing...`);
            }
          } else {
            setMessage('Payment processing... Please wait.');
          }
        } else {
          // Subscription created but needs payment confirmation
          setMessage('Subscription created! Please complete payment...');
        }
      }
    } catch (err: any) {
      console.error('Error processing payment:', err);
      setError(err.response?.data?.error || err.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="payment-element-wrapper">
        <PaymentElement 
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
            },
            wallets: {
              applePay: 'auto',
              googlePay: 'auto',
            },
            fields: {
              billingDetails: {
                email: 'auto', // Show email field above card number (auto = show when needed)
              },
            },
            business: {
              name: 'Rainmakers',
            },
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="matrix-button-secondary group relative w-full flex justify-center py-3 px-4 sm:py-4 sm:px-6 text-sm sm:text-lg font-bold rounded-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isProcessing ? 'Processing...' : 'Subscribe - $49/month'}
      </button>
    </form>
  );
};

export default function PaymentForm({ plan, email, discordId, discordUsername }: PaymentFormProps) {
  const stripePublishableKey = getStripePublishableKey();
  const stripePromise = React.useMemo(() => {
    return stripePublishableKey ? loadStripe(stripePublishableKey) : null;
  }, [stripePublishableKey]);

  const [customerEmail, setCustomerEmail] = useState<string>(email || '');
  const [customerId, setCustomerId] = useState<string>('');
  const [discordUserValue, setDiscordUserValue] = useState<string>(discordUsername || '');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Calculate if payment form is ready
  const isPaymentReady = !!clientSecret && !!customerId;

  // Prefill from local storage if available
  useEffect(() => {
    if (customerEmail) return;
    const savedUser = localStorage.getItem('user');
    if (!savedUser) return;
    try {
      const user = JSON.parse(savedUser);
      if (user.email && !customerEmail) {
        setCustomerEmail(user.email);
      }
      // Discord ID is now only from URL params or props, not from user input or localStorage
      if (user.username && !discordUserValue) {
        setDiscordUserValue(user.username);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, [customerEmail, discordUserValue]);

  // Auto-load payment form immediately on mount (email is optional until payment submission)
  useEffect(() => {
    // Load payment form immediately if not already loaded
    if (!isPaymentReady && !isProcessing) {
      // Use customer email if available, otherwise use a temporary email for setup intent
      // The actual email will be collected from the user and used when creating subscription
      const emailToUse = customerEmail || 'temp@example.com';
      initializePayment(emailToUse);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const initializePayment = async (email?: string) => {
    try {
      // Use provided email or current customerEmail, or use a temporary one
      const emailToUse = email || customerEmail || 'temp@example.com';

      setIsProcessing(true);
      setError(null);
      setMessage(null);

      const response = await paymentAPI.createSetupIntent(
        emailToUse,
        discordId || undefined,
        discordUserValue || discordUsername || undefined
      );

      setClientSecret(response.clientSecret);
      setCustomerId(response.customerId);
    } catch (err: any) {
      console.error('Error initializing payment:', err);
      setError(err.response?.data?.error || 'Failed to initialize payment');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!stripePromise) {
    // Debug information
    const debugInfo = {
      hasTestKey: !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST,
      hasLiveKey: !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_LIVE,
      hasLegacyKey: !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
      mode: import.meta.env.MODE,
      testKeyValue: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST ? 'Set (hidden)' : 'Not set',
    };
    
    console.error('Stripe Configuration Debug Info:', debugInfo);
    console.error('Available env vars:', Object.keys(import.meta.env).filter(k => k.includes('STRIPE')));
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center max-w-2xl px-4">
          <p className="text-red-400 text-xl mb-4">Stripe is not configured. Please contact support.</p>
          <div className="text-yellow-400 text-sm mt-4 space-y-2 text-left bg-gray-900 p-4 rounded">
            <p className="font-bold">Debug Information:</p>
            <p>• VITE_STRIPE_PUBLISHABLE_KEY_TEST: {debugInfo.testKeyValue}</p>
            <p>• Mode: {debugInfo.mode}</p>
            <p>• Check browser console (F12) for more details</p>
            <p className="mt-4 font-bold">Quick Fix:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Open frontend/.env file</li>
              <li>Add: VITE_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...</li>
              <li>Restart your dev server (Ctrl+C then npm run dev)</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const planPrice = '$49';
  const planPeriod = 'month';

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Matrix background */}
      <MatrixRain />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-4 px-4 sm:py-12 sm:px-6 lg:px-8">
        <div className="matrix-login-container max-w-lg w-full space-y-6">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rainmakers-logo-large-removebg-preview-p0gcjZeMhKuX7apjSsIKO50dynyjx4.png" 
              alt="Rainmakers Logo" 
              className="rainmakers-logo-img"
            />
          </div>

          {/* Header */}
          <div className="text-center">
            <div className="matrix-subtitle">
              <p className="text-yellow-400 font-mono text-xs sm:text-sm mb-2">&gt; SUBSCRIPTION PAYMENT</p>
              <p className="text-yellow-400 font-mono text-base sm:text-lg font-bold">
                {planPrice}/{planPeriod}
              </p>
            </div>
          </div>

          {/* Inputs */}
          <div className="space-y-6">
            {/* Email field - required and shown above payment form, styled to match PaymentElement */}
            <div className="email-field-wrapper">
              <label className="email-field-label">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="email-field-input"
                required
              />
            </div>

            {!isPaymentReady && (
              <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3 text-yellow-300 text-sm">
                {isProcessing
                  ? 'Loading payment form...'
                  : 'Loading payment form...'}
              </div>
            )}

            {error && (
              <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 text-red-200 text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-900/50 border border-green-500 rounded-lg p-4 text-green-200 text-sm">
                {message}
              </div>
            )}

            <div className="space-y-3">
              {isPaymentReady && clientSecret && (
                <Elements 
                  key={clientSecret}
                  stripe={stripePromise}
                  options={{
                    appearance: {
                      theme: 'night',
                      variables: {
                        colorPrimary: '#FFD700',
                        colorBackground: '#000000',
                        colorText: '#ffffff',
                        colorDanger: '#ef4444',
                        fontFamily: 'Courier New, monospace',
                        spacingUnit: '4px',
                        borderRadius: '8px',
                      },
                    },
                    loader: 'auto',
                    clientSecret,
                    
                  }}
                >
                  <PaymentElementForm
                    plan={plan}
                    customerEmail={customerEmail}
                    customerId={customerId}
                    discordId={discordId || undefined}
                    discordUsername={discordUserValue || discordUsername || undefined}
                    clientSecret={clientSecret}
                    isProcessing={isProcessing}
                    setIsProcessing={setIsProcessing}
                    setError={setError}
                    setMessage={setMessage}
                  />
                </Elements>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        .matrix-login-container {
          background: rgba(0, 0, 0, 0.95);
          border: 2px solid #FFD700;
          border-radius: 15px;
          padding: 1.5rem;
          box-shadow: 
            0 0 30px rgba(255, 215, 0, 0.6),
            inset 0 0 30px rgba(255, 215, 0, 0.1),
            0 0 60px rgba(255, 215, 0, 0.3);
          backdrop-filter: blur(15px);
          position: relative;
          overflow: hidden;
        }

        @media (min-width: 640px) {
          .matrix-login-container {
            padding: 3rem;
          }
        }

        .matrix-login-container::before {
          
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, transparent 30%, rgba(255, 215, 0, 0.1) 50%, transparent 70%);
          pointer-events: none;
        }

        .matrix-subtitle {
          border: 1px solid #FFD700;
          background: rgba(255, 215, 0, 0.1);
          padding: 1rem;
          border-radius: 5px;
          margin: 1rem 0;
        }

        .matrix-button {
          background: linear-gradient(90deg, #5865F2, #7289DA);
          border: 2px solid #FFD700;
          color: #fff;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
          box-shadow: 
            0 0 20px rgba(255, 215, 0, 0.5),
            inset 0 0 20px rgba(255, 215, 0, 0.1);
          position: relative;
          overflow: hidden;
        }

        .matrix-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.4), transparent);
          transition: left 0.5s;
        }

        .matrix-button:hover::before {
          left: 100%;
        }

        .matrix-button:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 5px 25px rgba(255, 215, 0, 0.7),
            inset 0 0 25px rgba(255, 215, 0, 0.2);
        }

        .matrix-button-secondary {
          background: linear-gradient(90deg, #FFD700, #FFA500);
          border: 2px solid #FFD700;
          color: #000;
          text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
          box-shadow: 
            0 0 20px rgba(255, 215, 0, 0.5),
            inset 0 0 20px rgba(255, 215, 0, 0.1);
          position: relative;
          overflow: hidden;
        }

        .matrix-button-secondary::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          transition: left 0.5s;
        }

        .matrix-button-secondary:hover::before {
          left: 100%;
        }

        .matrix-button-secondary:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 5px 25px rgba(255, 215, 0, 0.7),
            inset 0 0 25px rgba(255, 215, 0, 0.2);
        }

        .matrix-button-secondary:disabled {
          background: #333;
          border-color: #555;
          color: #888;
          cursor: not-allowed;
          box-shadow: none;
        }

        .rainmakers-logo-img {
          height: 120px;
          width: auto;
        }

        .payment-element-wrapper {
          margin: 1.5rem 0;
        }

        /* Stripe Element Styling */
        .payment-element-wrapper .StripeElement {
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid #FFD700;
          border-radius: 8px;
          padding: 12px;
          color: #fff;
        }

        /* Email field styling to match PaymentElement */
        .email-field-wrapper {
          margin-bottom: 1.5rem;
        }

        .email-field-label {
          display: block;
          color: #FFD700;
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .email-field-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid #FFD700;
          border-radius: 8px;
          padding: 12px;
          color: #fff;
          font-family: 'Courier New', monospace;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        .email-field-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .email-field-input:focus {
          outline: none;
          border-color: #FFA500;
          box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
        }

        .email-field-input:hover {
          border-color: #FFA500;
        }

      `}</style>
    </div>
  );
}
