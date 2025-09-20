"use client"

import type React from "react"
import { useEffect } from "react"

// Matrix Rain Animation Component
const MatrixRain = () => {
  useEffect(() => {
    const canvas = document.getElementById("matrix-canvas") as HTMLCanvasElement
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}"
    const matrixArray = matrix.split("")

    const fontSize = 10
    const columns = canvas.width / fontSize

    const drops: number[] = []
    for (let x = 0; x < columns; x++) {
      drops[x] = 1
    }

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.04)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = "#FFD700" // Golden color
      ctx.font = fontSize + "px monospace"

      for (let i = 0; i < drops.length; i++) {
        const text = matrixArray[Math.floor(Math.random() * matrixArray.length)]
        ctx.fillText(text, i * fontSize, drops[i] * fontSize)

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
    }

    const interval = setInterval(draw, 35)

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)

    return () => {
      clearInterval(interval)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <canvas
      id="matrix-canvas"
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
      style={{ background: "black" }}
    />
  )
}

// Glitch Text Component
const GlitchText = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={`relative ${className}`}>
      <div className="glitch-text" data-text={children}>{children}</div>
    </div>
  )
}

// Rainmakers Logo Component
const RainmakersLogo = () => {
  return (
    <div className="flex justify-center mb-8">
      <div className="rainmakers-logo-container">
        <div className="rainmakers-icon">
          <div className="bar bar-1"></div>
          <div className="bar bar-2"></div>
          <div className="bar bar-3"></div>
          <div className="bar bar-4"></div>
          <div className="bar bar-5"></div>
        </div>
        <div className="rainmakers-text">Rainmakers</div>
      </div>
    </div>
  )
}

export function MatrixLoginPage() {
  useEffect(() => {
    // Check if we have a token from Discord OAuth callback
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get("token")
    const userParam = urlParams.get("user")
    const error = urlParams.get("error")

    if (error) {
      console.error("Discord auth error:", error)
      return
    }

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam))
        localStorage.setItem("token", token)
        localStorage.setItem("user", JSON.stringify(user))
        window.location.href = "/"
      } catch (error) {
        console.error("Failed to parse user data:", error)
      }
    }
  }, [])

  const redirectToDiscord = () => {
    const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${(import.meta as any).env.VITE_DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent("https://rainmakers-portal-backend.vercel.app/auth/discord/callback")}&scope=identify%20email`
    window.location.href = discordAuthUrl
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      <MatrixRain />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="matrix-login-container max-w-md w-full space-y-8">
          {/* Logo */}
          <RainmakersLogo />

          {/* Header */}
          <div className="text-center">
            <GlitchText className="text-4xl font-bold mb-6">NEURAL INTERFACE</GlitchText>
            <div className="matrix-subtitle">
              <p className="text-yellow-400 font-mono text-sm mb-2">&gt; ESTABLISHING SECURE CONNECTION...</p>
              <p className="text-yellow-400 font-mono text-sm">&gt; DISCORD AUTHENTICATION REQUIRED</p>
            </div>
          </div>

          {/* Login Button */}
          <div className="space-y-6">
            <button
              onClick={redirectToDiscord}
              className="matrix-button group relative w-full flex justify-center py-4 px-6 text-lg font-bold rounded-lg transition-all duration-300"
            >
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                JACK IN WITH DISCORD
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="text-center">
            <div className="matrix-footer">
              <p className="text-yellow-400 font-mono text-xs mb-2">&gt; ENCRYPTED CONNECTION ESTABLISHED</p>
              <p className="text-yellow-400 font-mono text-xs">&gt; TERMS.EXE AND PRIVACY.DAT ACCEPTED</p>
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .matrix-login-container {
          background: rgba(0, 0, 0, 0.95);
          border: 2px solid #FFD700;
          border-radius: 15px;
          padding: 3rem;
          box-shadow: 
            0 0 30px rgba(255, 215, 0, 0.6),
            inset 0 0 30px rgba(255, 215, 0, 0.1),
            0 0 60px rgba(255, 215, 0, 0.3);
          backdrop-filter: blur(15px);
          position: relative;
          overflow: hidden;
        }

        .matrix-login-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, transparent 30%, rgba(255, 215, 0, 0.1) 50%, transparent 70%);
          animation: scan-line 3s linear infinite;
          pointer-events: none;
        }

        @keyframes scan-line {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .matrix-subtitle {
          border: 1px solid #FFD700;
          background: rgba(255, 215, 0, 0.1);
          padding: 1rem;
          border-radius: 5px;
          margin: 1rem 0;
        }

        .matrix-button {
          background: linear-gradient(90deg, #0066CC, #0099FF);
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

        .matrix-footer {
          border: 1px solid #FFD700;
          background: rgba(255, 215, 0, 0.05);
          padding: 0.75rem;
          border-radius: 5px;
        }

        /* Rainmakers Logo Styles */
        .rainmakers-logo-container {
          display: flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.8);
          padding: 1rem 2rem;
          border-radius: 10px;
          border: 1px solid #FFD700;
        }

        .rainmakers-icon {
          display: flex;
          align-items: end;
          margin-right: 1rem;
          height: 40px;
        }

        .bar {
          width: 8px;
          background: linear-gradient(to top, #FFD700, #FFA500);
          margin-right: 3px;
          border-radius: 2px;
          animation: bar-glow 2s ease-in-out infinite alternate;
        }

        .bar-1 { height: 20px; animation-delay: 0s; }
        .bar-2 { height: 35px; animation-delay: 0.2s; }
        .bar-3 { height: 25px; animation-delay: 0.4s; }
        .bar-4 { height: 40px; animation-delay: 0.6s; }
        .bar-5 { height: 30px; animation-delay: 0.8s; }

        @keyframes bar-glow {
          from { box-shadow: 0 0 5px #FFD700; }
          to { box-shadow: 0 0 15px #FFD700, 0 0 25px #FFD700; }
        }

        .rainmakers-text {
          font-family: 'Arial', sans-serif;
          font-size: 24px;
          font-weight: bold;
          color: #FFD700;
          text-shadow: 0 0 10px #FFD700;
        }

        /* Glitch Text Styles */
        .glitch-text {
          position: relative;
          color: #FFD700;
          font-weight: bold;
          font-family: 'Courier New', monospace;
          text-shadow: 0 0 10px #FFD700, 0 0 20px #FFD700, 0 0 30px #FFD700;
          animation: glitch 2s infinite;
        }
        
        .glitch-text::before,
        .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        
        .glitch-text::before {
          animation: glitch-1 0.5s infinite;
          color: #FF6B6B;
          z-index: -1;
        }
        
        .glitch-text::after {
          animation: glitch-2 0.5s infinite;
          color: #4ECDC4;
          z-index: -2;
        }
        
        @keyframes glitch {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
        }
        
        @keyframes glitch-1 {
          0%, 100% { transform: translate(0); }
          10% { transform: translate(-2px, -2px); }
          20% { transform: translate(2px, 2px); }
          30% { transform: translate(-2px, 2px); }
          40% { transform: translate(2px, -2px); }
          50% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          70% { transform: translate(-2px, 2px); }
          80% { transform: translate(2px, -2px); }
          90% { transform: translate(-2px, -2px); }
        }
        
        @keyframes glitch-2 {
          0%, 100% { transform: translate(0); }
          10% { transform: translate(2px, 2px); }
          20% { transform: translate(-2px, -2px); }
          30% { transform: translate(2px, -2px); }
          40% { transform: translate(-2px, 2px); }
          50% { transform: translate(2px, 2px); }
          60% { transform: translate(-2px, -2px); }
          70% { transform: translate(2px, -2px); }
          80% { transform: translate(-2px, 2px); }
          90% { transform: translate(2px, 2px); }
        }

        /* Cyberpunk scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #000;
        }

        ::-webkit-scrollbar-thumb {
          background: #FFD700;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #FFA500;
        }
      `}</style>
    </div>
  )
}