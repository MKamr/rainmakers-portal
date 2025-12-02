import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'

// Matrix Rain Animation Component (same as login page)
const MatrixRain = () => {
  useEffect(() => {
    const canvas = document.getElementById("matrix-canvas-email") as HTMLCanvasElement
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

      ctx.fillStyle = "#FFD700"
      ctx.font = fontSize + "px monospace"

      const logoArea = {
        x: canvas.width / 2 - 200,
        y: canvas.height / 2 - 150,
        width: 400,
        height: 300
      }

      for (let i = 0; i < drops.length; i++) {
        const x = i * fontSize
        const y = drops[i] * fontSize
        
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
    <canvas
      id="matrix-canvas-email"
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
      style={{ background: "black" }}
    />
  )
}

export function EmailLoginPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return // Only allow digits
    
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1) // Only take last character
    setOtp(newOtp)
    setError(null)

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }

    // Auto-submit when all 6 digits are entered
    if (newOtp.every(digit => digit !== '') && index === 5) {
      handleVerifyOtp(newOtp.join(''))
    }
  }

  // Handle backspace
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  // Request OTP
  const handleRequestOtp = async () => {
    if (!email) {
      setError('Please enter your email address')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await authAPI.requestOTP(email)
      setStep('otp')
      setResendCooldown(60) // 60 second cooldown
      
      // Start countdown
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      // Focus first OTP input
      setTimeout(() => {
        document.getElementById('otp-0')?.focus()
      }, 100)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Verify OTP
  const handleVerifyOtp = async (code?: string) => {
    const otpCode = code || otp.join('')
    
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await authAPI.verifyOTP(email, otpCode)
      
      // Store token and user
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      // Redirect to dashboard
      navigate('/')
      window.location.reload() // Reload to update auth state
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid code. Please try again.')
      // Clear OTP inputs on error
      setOtp(['', '', '', '', '', ''])
      document.getElementById('otp-0')?.focus()
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    
    setResendCooldown(60)
    setOtp(['', '', '', '', '', ''])
    setError(null)
    
    try {
      await authAPI.requestOTP(email)
      
      // Start countdown
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
      document.getElementById('otp-0')?.focus()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend code. Please try again.')
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      <MatrixRain />

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
              <p className="text-yellow-400 font-mono text-xs sm:text-sm mb-2">
                &gt; {step === 'email' ? 'EMAIL LOGIN' : 'ENTER VERIFICATION CODE'}
              </p>
              <p className="text-yellow-400 font-mono text-base sm:text-lg font-bold">
                {step === 'email' ? 'LOGIN WITH EMAIL' : 'CHECK YOUR EMAIL'}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Email Step */}
          {step === 'email' && (
            <div className="space-y-4 sm:space-y-6 mt-6 sm:mt-8">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-yellow-400 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRequestOtp()
                    }
                  }}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-3 bg-black border-2 border-yellow-500 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/50"
                  disabled={loading}
                />
              </div>

              <button
                onClick={handleRequestOtp}
                disabled={loading || !email}
                className="matrix-button-secondary group relative w-full flex justify-center py-3 px-4 sm:py-4 sm:px-6 text-sm sm:text-lg font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>

              <div className="text-center">
                <button
                  onClick={() => navigate('/login')}
                  className="text-yellow-400 hover:text-yellow-300 text-sm underline"
                >
                  Login with Discord instead
                </button>
              </div>
            </div>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
            <div className="space-y-4 sm:space-y-6 mt-6 sm:mt-8">
              <div>
                <p className="text-sm text-yellow-400 mb-4 text-center">
                  We sent a 6-digit code to <strong>{email}</strong>
                </p>
                <div className="flex justify-center gap-2 sm:gap-3">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-12 sm:w-14 sm:h-14 text-center text-2xl font-bold bg-black border-2 border-yellow-500 rounded-lg text-yellow-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/50"
                      disabled={loading}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleVerifyOtp()}
                disabled={loading || otp.some(d => !d)}
                className="matrix-button-secondary group relative w-full flex justify-center py-3 px-4 sm:py-4 sm:px-6 text-sm sm:text-lg font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <div className="text-center space-y-2">
                <button
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className="text-yellow-400 hover:text-yellow-300 text-sm underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                </button>
                <div>
                  <button
                    onClick={() => {
                      setStep('email')
                      setOtp(['', '', '', '', '', ''])
                      setError(null)
                    }}
                    className="text-yellow-400 hover:text-yellow-300 text-sm underline"
                  >
                    Use different email
                  </button>
                </div>
              </div>
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
      `}</style>
    </div>
  )
}

