import React, { useState, useEffect } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { paymentAPI } from '../services/api';

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

interface PaymentFormProps {
  plan: 'monthly';
  email?: string;
  discordId?: string;
  discordUsername?: string;
  hasTrial?: boolean;
  customHeader?: {
    title?: string;
    subtitle?: string;
  };
}

// Inner component that uses Stripe hooks
function PaymentFormInner({ 
  plan, 
  email, 
  discordId, 
  discordUsername,
  customerId,
  hasValidEmail,
  hasTrial
}: PaymentFormProps & { customerId: string; hasValidEmail: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Legal requirement: User MUST check the terms checkbox
    if (!termsAccepted) {
      setError('You must agree to the Terms of Service & Privacy Policy to continue.');
      return;
    }
    
    if (!stripe || !elements || !customerId) {
      setError('Payment system not ready. Please wait...');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const emailToUse = email || '';
      
      // Get the payment element to confirm setup
      const paymentElement = elements.getElement(PaymentElement);
      if (!paymentElement) {
        setError('Payment form not ready');
        setIsProcessing(false);
        return;
      }

      // Confirm setup intent to save payment method
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment setup failed');
        setIsProcessing(false);
        return;
      }

      if (setupIntent?.status !== 'succeeded' || !setupIntent.payment_method) {
        setError('Failed to save payment method');
        setIsProcessing(false);
        return;
      }

      // Create subscription with the saved payment method
      const subscriptionResponse = await paymentAPI.createSubscription(
        setupIntent.payment_method as string,
        customerId,
        emailToUse,
        plan,
        discordId,
        discordUsername,
        hasTrial
      );

      // Handle subscription creation - if clientSecret is returned, confirm payment
      if (subscriptionResponse.clientSecret) {
        const { error: paymentError } = await stripe.confirmCardPayment(
          subscriptionResponse.clientSecret
        );

        if (paymentError) {
          setError(paymentError.message || 'Payment failed');
          setIsProcessing(false);
          return;
        }
      }

      // Redirect to success page with data from Payment Element form
      // Pass customerId and subscriptionId for more reliable user lookup
      const successParams = new URLSearchParams();
      successParams.set('payment', 'success');
      successParams.set('customerId', customerId);
      if (subscriptionResponse.subscriptionId) {
        successParams.set('subscriptionId', subscriptionResponse.subscriptionId);
      }
      if (emailToUse) successParams.set('email', emailToUse);
      if (discordId) successParams.set('discordId', discordId);
      if (discordUsername) successParams.set('username', discordUsername);
      
      window.location.href = `/payment-success?${successParams.toString()}`;
    } catch (err: any) {
      let errorMessage = 'Failed to process payment';
      
      if (err.response) {
        errorMessage = err.response.data?.error || err.response.statusText || `Server error (${err.response.status})`;
      } else if (err.request) {
        errorMessage = 'Network error: Unable to connect to payment service.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
      setIsProcessing(false);
    }
  };

  const planPrice = '$49';
  const planPeriod = 'month';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Stripe Payment Element - always visible with dynamic payment methods */}
      <div className="payment-element-wrapper">
        <PaymentElement 
          options={{
            layout: 'tabs',
            // Dynamic payment methods - Stripe automatically shows eligible payment methods
            // based on Dashboard settings, customer location, and AI models
            // No need to specify wallets or payment methods - Stripe handles this dynamically
            fields: {
              billingDetails: {
                email: hasValidEmail ? 'auto' : 'never',
              },
            },
          }}
        />
      </div>
      
      {!hasValidEmail && (
        <div className="bg-yellow-900/50 border border-yellow-500 rounded-lg p-3 text-yellow-200 text-xs text-center">
          Please enter a valid email address above to complete payment
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Terms of Service Checkbox - Required */}
      <div className="mt-4">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 w-4 h-4 text-yellow-400 bg-gray-800 border-gray-600 rounded focus:ring-yellow-500 focus:ring-2 cursor-pointer"
            required
          />
          <span className="text-xs text-gray-400 group-hover:text-gray-300">
            I have read and agree to{' '}
            <a 
              href="/terms-of-service" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-yellow-400 hover:text-yellow-300 underline"
            >
              CRE Media III, LLC's Terms of Service & Privacy Policy
            </a>
            <span className="text-red-400 ml-1">*</span>
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={isProcessing || !stripe || !elements || !hasValidEmail || !termsAccepted}
        className="matrix-button-secondary group relative w-full flex justify-center py-3 px-4 sm:py-4 sm:px-6 text-sm sm:text-lg font-bold rounded-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed mt-4"
      >
        {isProcessing ? 'Processing...' : `Subscribe - ${planPrice}/${planPeriod}`}
      </button>
    </form>
  );
}

// Main component with Stripe Elements provider
export default function PaymentForm({ plan, email, discordId, discordUsername, hasTrial, customHeader }: PaymentFormProps) {
  const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST || 
                               import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_LIVE;

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string>(email || '');
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from local storage if available
  useEffect(() => {
    if (customerEmail || email) return;
    const savedUser = localStorage.getItem('user');
    if (!savedUser) return;
    try {
      const user = JSON.parse(savedUser);
      if (user.email && !customerEmail) {
        setCustomerEmail(user.email);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, [customerEmail, email]);

  // Initialize setup intent immediately on mount (even without email)
  useEffect(() => {
    const initializePayment = async () => {
      // Use provided email, customer email, or a placeholder email
      const emailToUse = customerEmail || email || 'temp@temp.com';
      
      // Don't re-initialize if we already have a clientSecret and email hasn't changed
      if (clientSecret && emailToUse === (customerEmail || email || 'temp@temp.com')) {
        return;
      }

      setIsInitializing(true);
      setError(null);

      try {
        const response = await paymentAPI.createSetupIntent(
          emailToUse,
          discordId,
          discordUsername
        );
        setClientSecret(response.clientSecret);
        setCustomerId(response.customerId);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to initialize payment');
        setClientSecret(null);
        setCustomerId(null);
      } finally {
        setIsInitializing(false);
      }
    };

    // Initialize immediately on mount
    initializePayment();
  }, []); // Only run on mount

  // Re-initialize when email changes to a real email
  useEffect(() => {
    const emailToUse = customerEmail || email;
    // Only re-initialize if we have a real email (not placeholder) and it's different
    if (!emailToUse || !emailToUse.includes('@') || emailToUse === 'temp@temp.com') {
      return;
    }

    // Don't re-initialize if we already have a clientSecret for this email
    if (clientSecret) {
      return;
    }

    const updatePayment = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        const response = await paymentAPI.createSetupIntent(
          emailToUse,
          discordId,
          discordUsername
        );
        setClientSecret(response.clientSecret);
        setCustomerId(response.customerId);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to initialize payment');
        setClientSecret(null);
        setCustomerId(null);
      } finally {
        setIsInitializing(false);
      }
    };

    // Add a small delay to debounce email changes
    const timeoutId = setTimeout(() => {
      updatePayment();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [customerEmail, email, discordId, discordUsername]);

  // Handle email changes
  const handleEmailChange = (newEmail: string) => {
    // Reset clientSecret and customerId when email changes so it re-initializes
    if (newEmail !== customerEmail) {
      setClientSecret(null);
      setCustomerId(null);
    }
    setCustomerEmail(newEmail);
  };

  if (!stripePublishableKey) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-black">
        <MatrixRain />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="matrix-login-container max-w-lg w-full text-center">
            <p className="text-red-400">Stripe is not configured. Please contact support.</p>
          </div>
        </div>
      </div>
    );
  }

  const stripePromise = loadStripe(stripePublishableKey);

  const planPrice = '$49';
  const planPeriod = 'month';

  const appearance: StripeElementsOptions['appearance'] = {
    theme: 'night',
    variables: {
      colorPrimary: '#FFD700',
      colorBackground: '#000000',
      colorText: '#FFFFFF',
      colorDanger: '#FF4444',
      fontFamily: 'Courier New, monospace',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
    rules: {
      '.Input': {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid #FFD700',
        color: '#FFFFFF',
        fontFamily: 'Courier New, monospace',
      },
      '.Input:focus': {
        borderColor: '#FFA500',
        boxShadow: '0 0 10px rgba(255, 215, 0, 0.3)',
      },
      '.Label': {
        color: '#FFD700',
        fontFamily: 'Courier New, monospace',
      },
      '.Tab': {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        border: '1px solid #FFD700',
        color: '#FFFFFF',
      },
      '.Tab--selected': {
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        borderColor: '#FFA500',
      },
      '.TabLabel': {
        color: '#FFFFFF',
        fontFamily: 'Courier New, monospace',
      },
      '.TabLabel--selected': {
        color: '#FFD700',
      },
    },
  };

  const options: StripeElementsOptions = {
    appearance,
    clientSecret: clientSecret || undefined,
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      <MatrixRain />
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
              <p className="text-yellow-400 font-mono text-xs sm:text-sm mb-2">&gt; {customHeader?.title || 'SUBSCRIPTION PAYMENT'}</p>
              <p className="text-yellow-400 font-mono text-base sm:text-lg font-bold">
                {planPrice}/{planPeriod}
              </p>
              {customHeader?.subtitle && (
                <p className="text-green-400 font-mono text-xs sm:text-sm mt-2">{customHeader.subtitle}</p>
              )}
            </div>
          </div>

          {/* Email and Payment Form Container - always visible together */}
          <div className="space-y-6">
            {/* Email field - always visible */}
            <div className="email-field-wrapper">
              <label className="email-field-label">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="your.email@example.com"
                className="email-field-input"
                required
                disabled={isInitializing}
              />
            </div>

            {/* Payment Element area - always visible */}
            <div className="payment-element-wrapper">
              {clientSecret && customerId ? (
                <Elements stripe={stripePromise} options={options} key={clientSecret}>
                  <PaymentFormInner 
                    plan={plan} 
                    email={customerEmail || email} 
                    discordId={discordId} 
                    discordUsername={discordUsername}
                    customerId={customerId}
                    hasValidEmail={!!((customerEmail && customerEmail.includes('@') && customerEmail !== 'temp@temp.com') || (email && email.includes('@')))}
                    hasTrial={hasTrial}
                  />
                </Elements>
              ) : (
                <div className="payment-placeholder">
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
                    <div className="text-center">
                      <div className="flex justify-center mb-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                      </div>
                      <div className="text-yellow-400 text-sm font-mono">Initializing payment form...</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Show error if initialization failed */}
            {error && !clientSecret && (
              <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 text-red-200 text-sm">
                {error}
              </div>
            )}
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

        /* Email field styling */
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

        /* Payment Element Styling */
        .payment-element-wrapper {
          margin-bottom: 1.5rem;
          min-height: 200px;
        }

        .payment-placeholder {
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
