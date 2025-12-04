import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import { authAPI } from '../services/api';

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

export function PaymentSuccessPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'processing' | 'success' | 'discord-oauth' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasCalled, setHasCalled] = useState(false);

  useEffect(() => {
    // Prevent duplicate calls (React StrictMode or double render)
    if (hasCalled) {
      return;
    }

    const loginAfterPayment = async () => {
      setHasCalled(true);
      // Get payment info from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const discordId = urlParams.get('discordId');
      const username = urlParams.get('username');
      const email = urlParams.get('email');
      
      // Wait 2 seconds for Stripe webhook to process (may not be needed, but safer)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        // Call the direct login endpoint (no Discord OAuth needed!)
        const response = await authAPI.loginAfterPayment(
          discordId || undefined,
          email || undefined,
          username || undefined
        );
        
        if (response.token && response.user) {
          // Save token and user to localStorage FIRST
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          
          // After payment, user needs to create password first (step 2 of onboarding)
          // Redirect to password creation page
          setStatus('success');
          setTimeout(() => {
            const params = new URLSearchParams();
            if (email) params.set('email', email);
            navigate(`/onboarding/password?${params.toString()}`);
          }, 2000);
          return; // Don't continue to portal redirect
          
          // Invalidate and refetch ALL 'user' queries (including the one in useAuth hook)
          // This ensures the useAuth hook picks up the new token
          try {
            // First invalidate to mark queries as stale
            queryClient.invalidateQueries('user');
            
            // Then refetch all 'user' queries to get fresh data
            await queryClient.refetchQueries('user', { active: true });
          } catch (refetchError: any) {
            // Continue anyway since we have the token in localStorage
            // The useAuth hook will pick it up on next render
          }
          
          setStatus('success');
          
          // Use window.location instead of navigate to force a full page reload
          // This ensures the useAuth hook picks up the token from localStorage
          // and the App.tsx will see the user after the query completes
          setTimeout(() => {
            window.location.href = '/';
          }, 500);
        } else {
          throw new Error('Invalid response from login endpoint');
        }
      } catch (error: any) {
        const errorMsg = error.response?.data?.message || error.message || 'Failed to log in after payment';
        setErrorMessage(errorMsg);
        setStatus('error');
        
        // If we have Discord ID, fall back to Discord OAuth as backup
        if (discordId) {
          setTimeout(() => {
            const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID || '1413650646556479490';
            const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://rainmakers-portal-backend.vercel.app');
            const redirectUri = encodeURIComponent(`${backendUrl}/auth/discord/callback`);
              // Use URL-encoded spaces and add prompt=consent to ensure proper authorization
              const scope = encodeURIComponent('identify email guilds.join');
              const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}&prompt=consent`;
            window.location.href = discordAuthUrl;
          }, 3000);
        } else {
          // No Discord ID, redirect to login page
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      }
    };

    loginAfterPayment();
  }, [navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Matrix background */}
      <MatrixRain />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-4 px-4 sm:py-12 sm:px-6 lg:px-8">
        <div className="matrix-login-container max-w-md w-full space-y-6 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rainmakers-logo-large-removebg-preview-p0gcjZeMhKuX7apjSsIKO50dynyjx4.png" 
              alt="Rainmakers Logo" 
              className="rainmakers-logo-img"
            />
          </div>

          {/* Success Message */}
          <div className="matrix-subtitle">
            <p className="text-green-400 font-mono text-lg sm:text-xl mb-2">✓ PAYMENT SUCCESSFUL</p>
            <p className="text-yellow-400 font-mono text-sm">Your subscription is now active!</p>
          </div>

          {status === 'processing' && (
            <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4">
              <p className="text-blue-200 text-sm mb-2">
                Logging you in...
              </p>
              <p className="text-yellow-300 text-xs font-mono">
                &gt; Please wait...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="bg-green-900/30 border border-green-500 rounded-lg p-4">
              <p className="text-green-200 text-sm mb-2">
                ✓ Successfully logged in!
              </p>
              <p className="text-yellow-300 text-xs font-mono">
                &gt; Redirecting to portal...
              </p>
            </div>
          )}

          {status === 'discord-oauth' && (
            <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4">
              <p className="text-blue-200 text-sm mb-2">
                ✓ Payment successful!
              </p>
              <p className="text-yellow-300 text-xs font-mono mb-2">
                &gt; Connecting to Discord server...
              </p>
              <p className="text-blue-300 text-xs">
                You'll be redirected to Discord to join the server and get your role automatically.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
              <p className="text-red-200 text-sm mb-2">
                ⚠ Login failed: {errorMessage}
              </p>
              <p className="text-yellow-300 text-xs font-mono">
                &gt; Falling back to Discord login...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .matrix-login-container {
          background: rgba(0, 0, 0, 0.95);
          border: 2px solid #FFD700;
          border-radius: 15px;
          padding: 2rem;
          box-shadow: 
            0 0 30px rgba(255, 215, 0, 0.6),
            inset 0 0 30px rgba(255, 215, 0, 0.1),
            0 0 60px rgba(255, 215, 0, 0.3);
          backdrop-filter: blur(15px);
          position: relative;
          overflow: hidden;
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

        .rainmakers-logo-img {
          height: 120px;
          width: auto;
        }
      `}</style>
    </div>
  );
}

