import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';

export function CreatePasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get email from URL params if available
  const email = searchParams.get('email') || '';
  
  // Get email from user data if available (for existing users)
  const { user } = useAuth();
  const displayEmail = email || user?.email || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      // Don't pass username - let backend use existing username or generate from email
      await authAPI.createPassword(password, confirmPassword);
      
      // Invalidate and refetch user data to get updated hasPassword status
      await queryClient.invalidateQueries('user');
      await queryClient.refetchQueries('user');
      
      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if user needs Discord or can proceed to portal
      // If user already has Discord, they might go straight to portal
      // Otherwise, redirect to Discord connection step
      const params = new URLSearchParams();
      if (email) params.set('email', email);
      
      // Force a page reload to ensure App.tsx picks up the updated user state
      window.location.href = `/onboarding/discord?${params.toString()}`;
    } catch (err: any) {
      console.error('Create password error:', err);
      setError(err.response?.data?.error || 'Failed to create password. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Matrix Rain Animation
  useEffect(() => {
    const canvas = document.getElementById("matrix-canvas-password") as HTMLCanvasElement;
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
        id="matrix-canvas-password"
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
              <p className="text-yellow-400 font-mono text-xs sm:text-sm mb-2">&gt; CREATE YOUR ACCOUNT</p>
              <p className="text-yellow-400 font-mono text-base sm:text-lg font-bold">SET UP PASSWORD</p>
            </div>
          </div>

          {/* Email Display */}
          {displayEmail && (
            <div className="bg-black/50 border border-yellow-500 rounded-lg p-4 text-center">
              <p className="text-yellow-400 font-mono text-sm mb-1">Account Email:</p>
              <p className="text-white font-mono text-base font-bold">{displayEmail}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-yellow-400 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-black/80 border border-yellow-500 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Enter password (min 8 characters)"
                required
                minLength={8}
              />
              {password.length > 0 && password.length < 8 && (
                <p className="mt-1 text-xs text-red-400">Password must be at least 8 characters</p>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-yellow-400 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-black/80 border border-yellow-500 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Confirm your password"
                required
                minLength={8}
              />
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !password || password !== confirmPassword}
              className="matrix-button-secondary group relative w-full flex justify-center py-3 px-4 sm:py-4 sm:px-6 text-sm sm:text-lg font-bold rounded-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating Password...' : 'Continue'}
            </button>
          </form>
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


