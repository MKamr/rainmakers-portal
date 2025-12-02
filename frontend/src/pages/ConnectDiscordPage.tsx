import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ConnectDiscordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [status, setStatus] = useState<'connecting' | 'success' | 'error'>('connecting');

  const email = searchParams.get('email') || '';

  useEffect(() => {
    // Check if user already has Discord connected
    if (user?.discordId) {
      // Already connected, proceed to intro video
      const params = new URLSearchParams();
      if (email) params.set('email', email);
      navigate(`/onboarding/intro?${params.toString()}`);
      return;
    }

    // Redirect to Discord OAuth
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID || '1413650646556479490';
    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://rainmakers-portal-backend.vercel.app');
    // Use standard redirect URI (must match Discord app settings exactly)
    const redirectUri = encodeURIComponent(`${backendUrl}/auth/discord/callback`);
    const scope = encodeURIComponent('identify email guilds.join');
    
    // Build state parameter with onboarding flag and user email (if available)
    // This helps the callback find the user more reliably
    const stateData: any = { onboarding: true };
    const userEmail = user?.email || email;
    if (userEmail) {
      stateData.email = userEmail;
    }
    if (user?.id) {
      stateData.userId = user.id;
    }
    const state = encodeURIComponent(JSON.stringify(stateData));
    
    const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&prompt=consent`;
    
    // Redirect to Discord OAuth
    window.location.href = discordAuthUrl;
  }, [user, navigate, email]);

  // Matrix Rain Animation
  useEffect(() => {
    const canvas = document.getElementById("matrix-canvas-discord") as HTMLCanvasElement;
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

      ctx.fillStyle = "#5865F2"; // Discord blurple
      ctx.font = fontSize + "px monospace";

      const logoArea = {
        x: canvas.width / 2 - 200,
        y: canvas.height / 2 - 150,
        width: 400,
        height: 300
      };

      for (let i = 0; i < drops.length; i++) {
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        
        if (x >= logoArea.x && x <= logoArea.x + logoArea.width &&
            y >= logoArea.y && y <= logoArea.y + logoArea.height) {
          drops[i]++;
          continue;
        }

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
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Matrix Rain Background */}
      <canvas
        id="matrix-canvas-discord"
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
        style={{ background: "black" }}
      />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-4 px-4 sm:py-12 sm:px-6 lg:px-8">
        <div className="matrix-login-container max-w-md w-full space-y-6 sm:space-y-8">
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
              <p className="text-yellow-400 font-mono text-xs sm:text-sm mb-2">&gt; CONNECT YOUR DISCORD</p>
              <p className="text-yellow-400 font-mono text-base sm:text-lg font-bold">JOIN THE COMMUNITY</p>
            </div>
          </div>

          {/* Status Message */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
            </div>
            <p className="text-yellow-400 font-mono text-sm">
              Redirecting to Discord...
            </p>
            <p className="text-gray-400 text-xs mt-2">
              You will be redirected back after connecting your account
            </p>
          </div>
        </div>
      </div>

      {/* Styles */}
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

