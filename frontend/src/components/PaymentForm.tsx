import React, { useState, useEffect } from 'react';
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
}

export default function PaymentForm({ plan, email, discordId, discordUsername }: PaymentFormProps) {
  const [customerEmail, setCustomerEmail] = useState<string>(email || '');
  const [discordUserValue, setDiscordUserValue] = useState<string>(discordUsername || '');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      if (user.username && !discordUserValue) {
        setDiscordUserValue(user.username);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, [customerEmail, discordUserValue]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsProcessing(true);
    setError(null);

    // Validate email
    if (!customerEmail || !customerEmail.includes('@')) {
      setError('Please enter a valid email address');
      setIsProcessing(false);
      return;
    }

    try {
      const response = await paymentAPI.createPaymentLink(
        plan,
        customerEmail,
        discordId || undefined,
        discordUserValue || discordUsername || undefined
      );

      // Redirect to Stripe Payment Link
      if (response.url) {
        window.location.href = response.url;
      } else {
        setError('Failed to get payment link. Please try again.');
        setIsProcessing(false);
      }
    } catch (err: any) {
      let errorMessage = 'Failed to initialize payment';
      
      if (err.response) {
        errorMessage = err.response.data?.error || err.response.statusText || `Server error (${err.response.status})`;
      } else if (err.request) {
        errorMessage = 'Network error: Unable to connect to payment service. Please check your connection.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      console.error('Payment initialization error:', err);
      setError(errorMessage);
      setIsProcessing(false);
    }
  };

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
              <p className="text-green-400 font-mono text-xs sm:text-sm mt-2">✨ 7-Day Free Trial • Apple Pay Available</p>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email field */}
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
                disabled={isProcessing}
              />
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 text-red-200 text-sm">
                {error}
              </div>
            )}

            <div className="text-xs text-gray-400 text-center mt-4">
              By continuing, you agree to{' '}
              <a 
                href="/terms-of-service" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-yellow-400 hover:text-yellow-300 underline"
              >
                CRE Media III, LLC's Terms of Service & Privacy Policy
              </a>
            </div>

            <button
              type="submit"
              disabled={isProcessing || !customerEmail}
              className="matrix-button-secondary group relative w-full flex justify-center py-3 px-4 sm:py-4 sm:px-6 text-sm sm:text-lg font-bold rounded-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Redirecting to Payment...' : 'Subscribe - $49/month'}
            </button>
          </form>
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

      `}</style>
    </div>
  );
}
