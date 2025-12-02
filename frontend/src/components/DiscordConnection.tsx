import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { authAPI } from '../services/api'

interface DiscordStatus {
  connected: boolean
  discordId?: string
  discordEmail?: string
}

export function DiscordConnection() {
  const queryClient = useQueryClient()
  const [verificationCode, setVerificationCode] = useState('')
  const [showVerificationForm, setShowVerificationForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const { data: discordStatus, isLoading } = useQuery<DiscordStatus>(
    'discordStatus',
    authAPI.getDiscordStatus,
    {
      retry: false,
      onError: () => {
        // Ignore errors - user might not be authenticated
      }
    }
  )

  const disconnectMutation = useMutation(
    () => authAPI.disconnectDiscord(),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('discordStatus')
        setSuccess('Discord account disconnected successfully')
        setTimeout(() => setSuccess(null), 3000)
      },
      onError: (err: any) => {
        setError(err.response?.data?.error || 'Failed to disconnect Discord account')
        setTimeout(() => setError(null), 5000)
      }
    }
  )

  const resendCodeMutation = useMutation(
    () => authAPI.resendVerificationCode(),
    {
      onSuccess: () => {
        setSuccess('Verification code has been sent to your email')
        setTimeout(() => setSuccess(null), 3000)
      },
      onError: (err: any) => {
        setError(err.response?.data?.error || 'Failed to resend verification code')
        setTimeout(() => setError(null), 5000)
      }
    }
  )

  const handleConnectDiscord = () => {
    // Redirect to Discord OAuth
    const discordClientId = import.meta.env.VITE_DISCORD_CLIENT_ID
    const redirectUri = window.location.origin + '/auth/discord/callback'
    const scopes = ['identify', 'email', 'guilds.join']
    const state = 'connect' // Indicate this is for connecting, not login
    
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${discordClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}&state=${state}&prompt=consent`
    
    window.location.href = discordAuthUrl
  }

  const handleLinkWithCode = async () => {
    if (!verificationCode) {
      setError('Please enter your verification code')
      return
    }

    // Get Discord OAuth code from URL if available
    const urlParams = new URLSearchParams(window.location.search)
    const discordCode = urlParams.get('code')
    
    if (!discordCode) {
      setError('Discord authorization code not found. Please try connecting again.')
      return
    }

    setError(null)
    setSuccess(null)

    try {
      const response = await authAPI.linkDiscord(discordCode, verificationCode)
      
      // Store token and user
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      setSuccess('Discord account linked successfully!')
      queryClient.invalidateQueries('discordStatus')
      setShowVerificationForm(false)
      setVerificationCode('')
      
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname)
      
      // Reload to update auth state
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to link Discord account')
    }
  }

  // Check if we're returning from Discord OAuth
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')
    
    if (code && state === 'connect' && !discordStatus?.connected) {
      setShowVerificationForm(true)
    }
  }, [discordStatus])

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
        <div className="h-10 bg-gray-700 rounded"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Discord Connection
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Connect your Discord account to join the server and access member benefits.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900/50 border border-green-500 rounded-lg p-3 text-green-200 text-sm">
          {success}
        </div>
      )}

      {discordStatus?.connected ? (
        <div className="space-y-4">
          <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 font-semibold">✓ Discord Connected</p>
                {discordStatus.discordEmail && (
                  <p className="text-sm text-gray-400 mt-1">
                    {discordStatus.discordEmail}
                  </p>
                )}
              </div>
              <button
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {disconnectMutation.isLoading ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {!showVerificationForm ? (
            <>
              <button
                onClick={handleConnectDiscord}
                className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                Connect Discord
              </button>
              
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <p className="mb-2">Don't have your verification code?</p>
                <button
                  onClick={() => resendCodeMutation.mutate()}
                  disabled={resendCodeMutation.isLoading}
                  className="text-blue-500 hover:text-blue-400 underline disabled:opacity-50"
                >
                  {resendCodeMutation.isLoading ? 'Sending...' : 'Resend verification code'}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
                <p className="text-yellow-400 text-sm mb-2">
                  Enter the verification code sent to your payment email to link your Discord account.
                </p>
              </div>
              
              <div>
                <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Verification Code
                </label>
                <input
                  id="verification-code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    setVerificationCode(e.target.value.toUpperCase())
                    setError(null)
                  }}
                  placeholder="RAIN-XXXX"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={9}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Format: RAIN-XXXX (check your email)
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleLinkWithCode}
                  disabled={!verificationCode || verificationCode.length < 9}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Link Account
                </button>
                <button
                  onClick={() => {
                    setShowVerificationForm(false)
                    setVerificationCode('')
                    setError(null)
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

