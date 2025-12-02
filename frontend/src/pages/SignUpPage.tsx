import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export function SignUpPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string>('')
  const [discordId, setDiscordId] = useState<string>('')
  const [discordUsername, setDiscordUsername] = useState<string>('')

  useEffect(() => {
    const errorParam = searchParams.get('error')
    const paymentParam = searchParams.get('payment')
    const emailParam = searchParams.get('email')
    const discordIdParam = searchParams.get('discordId')
    const usernameParam = searchParams.get('username')

    // Get Discord info from URL params
    if (emailParam) {
      setEmail(emailParam)
    }
    if (discordIdParam) {
      setDiscordId(discordIdParam)
    }
    if (usernameParam) {
      setDiscordUsername(usernameParam)
    }

    if (errorParam === 'not_paid_member') {
      setError('You must have an active subscription to access the portal. Please sign up to continue.')
    } else if (errorParam === 'subscription_expired') {
      setError('Your subscription has expired. Please renew to continue accessing the portal.')
    } else if (paymentParam === 'canceled') {
      setError('Payment was canceled. Please try again when you are ready.')
    } else if (paymentParam === 'success') {
      // Payment successful, user should already be logged in via payment success page
      // No need to redirect - payment success page handles login
    } else if (discordIdParam) {
      // User was redirected from Discord OAuth (new or existing user) - show message that they need to pay
      setError(null) // Clear any error
    }
  }, [searchParams, navigate])

  const handleSignUp = () => {
    // Directly redirect to payment page with monthly plan (only plan available)
    const params = new URLSearchParams()
    params.set('plan', 'monthly')
    if (email) params.set('email', email)
    if (discordId) params.set('discordId', discordId)
    if (discordUsername) params.set('username', discordUsername)
    navigate(`/payment?${params.toString()}`)
  }

  // Matrix Rain Animation Component (same as login page)
  useEffect(() => {
    const canvas = document.getElementById("matrix-canvas-signup") as HTMLCanvasElement
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

      // Calculate logo area (center of screen, approximate size)
      const logoArea = {
        x: canvas.width / 2 - 200, // Center minus half logo width
        y: canvas.height / 2 - 150, // Center minus half logo height
        width: 400,
        height: 300
      }

      for (let i = 0; i < drops.length; i++) {
        const x = i * fontSize
        const y = drops[i] * fontSize
        
        // Skip drawing in logo area
        if (x >= logoArea.x && x <= logoArea.x + logoArea.width &&
            y >= logoArea.y && y <= logoArea.y + logoArea.height) {
          drops[i]++
          continue
        }

        const text = matrixArray[Math.floor(Math.random() * matrixArray.length)]
        ctx.fillText(text, x, y)

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
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Matrix Rain Background */}
      <canvas
        id="matrix-canvas-signup"
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
        style={{ background: "black" }}
      />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-4 px-4 sm:py-12 sm:px-6 lg:px-8">
        <div className="matrix-login-container max-w-sm sm:max-w-md w-full space-y-6 sm:space-y-8">
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
              <p className="text-yellow-400 font-mono text-xs sm:text-sm mb-2">&gt; WELCOME TO RAINMAKERS PORTAL</p>
              <p className="text-yellow-400 font-mono text-base sm:text-lg font-bold">MEMBERS ONLY</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Info Message for Discord redirect */}
          {discordId && !error && (
            <div className="bg-yellow-900/50 border border-yellow-500 rounded-lg p-4 text-yellow-200 text-sm">
              <p className="font-bold mb-2">Welcome{discordUsername ? `, ${discordUsername}` : ''}!</p>
              <p>Please complete your payment to {email ? 'create your account and' : ''} access the portal.</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4 sm:space-y-6 mt-6 sm:mt-8">
            <button
              onClick={handleSignUp}
              className="matrix-button-secondary group relative w-full flex justify-center py-3 px-4 sm:py-4 sm:px-6 text-sm sm:text-lg font-bold rounded-lg transition-all duration-300"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                JOIN RAINMAKERS
              </div>
            </button>

            <div className="text-center mt-6">
              <p className="text-white text-sm">
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-[#FFD700] hover:text-[#FFA500] transition-colors duration-300 font-semibold"
                >
                  Log in
                </button>
              </p>
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

        .matrix-login-container .matrix-button {
          background: linear-gradient(90deg, #5865F2, #7289DA) !important;
          border: 2px solid #5865F2 !important;
          color: #fff !important;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.8) !important;
          box-shadow: 
            0 0 20px rgba(88, 101, 242, 0.5),
            inset 0 0 20px rgba(88, 101, 242, 0.1) !important;
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
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s;
        }

        .matrix-button:hover::before {
          left: 100%;
        }

        .matrix-login-container .matrix-button:hover {
          transform: translateY(-2px);
          background: linear-gradient(90deg, #4752C4, #5865F2) !important;
          box-shadow: 
            0 5px 25px rgba(88, 101, 242, 0.7),
            inset 0 0 25px rgba(88, 101, 242, 0.2) !important;
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

        .rainmakers-logo-img {
          height: 120px;
          width: auto;
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

