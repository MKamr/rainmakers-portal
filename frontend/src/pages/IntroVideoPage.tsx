import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';

export function IntroVideoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isCompleting, setIsCompleting] = useState(false);
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token');
  const userParam = searchParams.get('user');

  // Handle Discord OAuth callback (token and user in URL)
  useEffect(() => {
    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      } catch (error) {
        // Failed to parse user data
      }
    }
  }, [token, userParam]);

  const handleContinue = async () => {
    setIsCompleting(true);
    
    try {
      // Mark onboarding as complete
      // The backend will handle this when user accesses the portal
      // Redirect to portal - App.tsx will check for terms acceptance
      window.location.href = '/';
    } catch (err) {
      setIsCompleting(false);
    }
  };

  // Matrix Rain Animation
  useEffect(() => {
    const canvas = document.getElementById("matrix-canvas-intro") as HTMLCanvasElement;
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

      ctx.fillStyle = "#FFD700";
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
        id="matrix-canvas-intro"
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
        style={{ background: "black" }}
      />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-4 px-4 sm:py-12 sm:px-6 lg:px-8">
        <div className="matrix-login-container max-w-2xl w-full space-y-6 sm:space-y-8">
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
              <p className="text-yellow-400 font-mono text-xs sm:text-sm mb-2">&gt; WELCOME TO RAINMAKERS</p>
              <p className="text-yellow-400 font-mono text-base sm:text-lg font-bold">GETTING STARTED</p>
            </div>
          </div>

          {/* Video Placeholder */}
          <div className="bg-black/50 border-2 border-yellow-500 rounded-lg p-8 sm:p-12 text-center">
            <div className="mb-6">
              <svg className="mx-auto h-24 w-24 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-yellow-400 mb-4">Introductory Video</h3>
            <p className="text-gray-300 mb-6">
              Welcome to Rainmakers! This video will introduce you to our platform and help you get started.
            </p>
            <p className="text-sm text-gray-400 italic">
              Video player will be added here
            </p>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={isCompleting}
            className="matrix-button-secondary group relative w-full flex justify-center py-3 px-4 sm:py-4 sm:px-6 text-sm sm:text-lg font-bold rounded-lg transition-all duration-300 disabled:opacity-60"
          >
            {isCompleting ? 'Completing Setup...' : 'Continue to Portal'}
          </button>
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

        .matrix-button-secondary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 
            0 5px 25px rgba(255, 215, 0, 0.7),
            inset 0 0 25px rgba(255, 215, 0, 0.2);
        }

        .rainmakers-logo-img {
          height: 120px;
          width: auto;
        }
      `}</style>
    </div>
  );
}

