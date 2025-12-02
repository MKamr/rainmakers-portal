import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { ThemeProvider } from './contexts/ThemeContext'
import { LoginPage } from './pages/LoginPage'
import { EmailLoginPage } from './pages/EmailLoginPage'
import { SignUpPage } from './pages/SignUpPage'
import { SettingsPage } from './pages/SettingsPage'
import { PaymentCheckout } from './components/PaymentCheckout'
import { PaymentSuccessPage } from './pages/PaymentSuccessPage'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { TermsOfServicePage } from './pages/TermsOfServicePage'
import { CreatePasswordPage } from './pages/CreatePasswordPage'
import { ConnectDiscordPage } from './pages/ConnectDiscordPage'
import { IntroVideoPage } from './pages/IntroVideoPage'
import { TermsModal } from './components/TermsModal'
import { DashboardLayout } from './components/DashboardLayout'
import { HomePage } from './pages/HomePage'
import { DealsPage } from './pages/DealsPage'
import { AdminPage } from './pages/AdminPage'
import { AppointmentsPage } from './pages/AppointmentsPage'
import { AppointmentManagementPage } from './pages/AppointmentManagementPage'
import { LoadingSpinner } from './components/LoadingSpinner'
import { useQueryClient } from 'react-query'

// Wrapper component to show Terms Modal
function TermsModalWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(true);

  const handleAcceptTerms = async () => {
    setShowModal(false);
    // Invalidate user query to refresh user data
    queryClient.invalidateQueries('user');
  };

  if (showModal && user && !user.termsAccepted) {
    return (
      <>
        <TermsModal onAccept={handleAcceptTerms} />
        {children}
      </>
    );
  }

  return <>{children}</>;
}

function App() {
  const { user, isLoading } = useAuth()
  const queryClient = useQueryClient()
  const [urlProcessed, setUrlProcessed] = useState(false)

  // Check for token/user in URL params FIRST (before checking localStorage)
  // This handles Discord OAuth callback redirects
  useEffect(() => {
    // Only process once
    if (urlProcessed) return

    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get("token")
    const userParam = urlParams.get("user")
    const error = urlParams.get("error")

    // Only process if we have URL params AND they're not already saved
    const savedToken = localStorage.getItem('token')
    
    console.log('App: Checking URL params for OAuth callback', {
      hasToken: !!token,
      hasUserParam: !!userParam,
      hasError: !!error,
      alreadyHasToken: !!savedToken,
      urlProcessed
    });

    if (error) {
      console.error("App: OAuth error in URL:", error)
      setUrlProcessed(true)
      // Clear URL params and redirect to login with error
      window.history.replaceState({}, '', '/login?error=' + error)
      return
    }

    // Only process if we have token/user params AND they're not already saved
    if (token && userParam && !savedToken) {
      try {
        console.log('App: Processing OAuth token from URL params...')
        const user = JSON.parse(decodeURIComponent(userParam))
        localStorage.setItem("token", token)
        localStorage.setItem("user", JSON.stringify(user))
        console.log('App: ✅ Saved token and user to localStorage')
        
        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname)
        
        // Invalidate and refetch the user query to pick up the new token
        queryClient.invalidateQueries('user')
        setUrlProcessed(true)
      } catch (error) {
        console.error("App: Failed to parse user data from URL:", error)
        setUrlProcessed(true)
        // Clear URL params and redirect to login
        window.history.replaceState({}, '', '/login?error=parse_error')
      }
    } else if (token && userParam && savedToken) {
      // Token already saved, just clear URL params
      console.log('App: Token already saved, clearing URL params')
      window.history.replaceState({}, '', window.location.pathname)
      setUrlProcessed(true)
    } else {
      // No URL params to process
      setUrlProcessed(true)
    }
  }, [urlProcessed, queryClient]) // Run once, then never again

  console.log('🎯 App render:', { 
    user: user ? {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      isWhitelisted: user.isWhitelisted,
      typeOfIsAdmin: typeof user.isAdmin,
      typeOfIsWhitelisted: typeof user.isWhitelisted
    } : null,
    isLoading 
  })

  if (isLoading) {
    console.log('⏳ App: Still loading, showing spinner')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Check if user is logged in - if no token or no user, show login
  const token = localStorage.getItem('token')
  console.log('🔑 App: Token check:', { 
    hasToken: !!token,
    hasUser: !!user,
    userIsWhitelisted: user?.isWhitelisted,
    userIsAdmin: user?.isAdmin
  })
  
  if (!user || !token) {
    console.log('❌ App: No user or token, showing login')
    return (
      <ThemeProvider>
        <Routes>
          <Route path="/join" element={<SignUpPage />} />
          <Route path="/signup" element={<Navigate to="/join" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/email" element={<EmailLoginPage />} />
          <Route path="/payment" element={<PaymentCheckout />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
          <Route path="/onboarding/password" element={<CreatePasswordPage />} />
          <Route path="/onboarding/discord" element={<ConnectDiscordPage />} />
          <Route path="/onboarding/intro" element={<IntroVideoPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="*" element={<Navigate to="/join" replace />} />
        </Routes>
      </ThemeProvider>
    )
  }

  console.log('✅ App: User authenticated, checking whitelist status')
  console.log('📊 App: User analysis:', {
    id: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
    isWhitelisted: user.isWhitelisted,
    typeOfIsAdmin: typeof user.isAdmin,
    typeOfIsWhitelisted: typeof user.isWhitelisted,
    isWhitelistedStrict: user.isWhitelisted === true,
    isAdminStrict: user.isAdmin === true
  })

  if (!user.isWhitelisted) {
    console.log('⚠️ App: User not whitelisted, showing pending modal')
    console.log('🔍 App: Debug info for modal:', {
      isWhitelisted: user.isWhitelisted,
      isAdmin: user.isAdmin,
      isWhitelistedUndefined: user.isWhitelisted === undefined,
      isAdminUndefined: user.isAdmin === undefined
    })
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          {/* Modal Overlay */}
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            {/* Modal Content */}
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 text-center">
              {/* Warning Icon */}
              <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
              
              {/* Title */}
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Pending</h1>
              
              {/* Message */}
              <p className="text-gray-600 mb-6">
                Your account is pending approval. Please contact an administrator to get access to the Rainmakers Portal.
              </p>
              
              {/* Debug Info */}
              <div className="text-xs text-gray-500 mb-4 p-2 bg-gray-100 rounded">
                Debug: isWhitelisted={String(user.isWhitelisted)}, isAdmin={String(user.isAdmin)}
              </div>
              
              {/* Sign Out Button */}
              <button
                onClick={() => {
                  console.log('🚪 App: Sign out clicked')
                  localStorage.removeItem('token')
                  localStorage.removeItem('user')
                  window.location.href = '/'
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </ThemeProvider>
    )
  }

  console.log('🎉 App: User is whitelisted, checking setup completion and terms')

  // Check if user needs to complete setup
  // Handle undefined values - treat undefined as false (needs setup)
  const needsPassword = user.hasPassword !== true;
  const needsDiscord = user.hasDiscord !== true;
  const needsTerms = !user.termsAccepted;

  // Redirect to appropriate onboarding step if setup incomplete
  if (needsPassword) {
    console.log('⚠️ App: User needs password, redirecting to password creation')
    return (
      <ThemeProvider>
        <Routes>
          <Route path="/onboarding/password" element={<CreatePasswordPage />} />
          <Route path="*" element={<Navigate to="/onboarding/password" replace />} />
        </Routes>
      </ThemeProvider>
    )
  }

  if (needsDiscord) {
    console.log('⚠️ App: User needs Discord, redirecting to Discord connection')
    return (
      <ThemeProvider>
        <Routes>
          <Route path="/onboarding/discord" element={<ConnectDiscordPage />} />
          <Route path="*" element={<Navigate to="/onboarding/discord" replace />} />
        </Routes>
      </ThemeProvider>
    )
  }

  // Show Terms Modal if terms not accepted
  if (needsTerms) {
    console.log('⚠️ App: User needs to accept terms, showing Terms Modal')
    return (
      <ThemeProvider>
        <TermsModalWrapper>
          <DashboardLayout>
            <Routes>
              <Route path="/" element={<DealsPage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/appointments" element={<AppointmentsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/appointments" element={<AppointmentManagementPage />} />
              <Route path="/join" element={<SignUpPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms-of-service" element={<TermsOfServicePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </DashboardLayout>
        </TermsModalWrapper>
      </ThemeProvider>
    )
  }

  console.log('🎉 App: User is whitelisted, showing dashboard')
  return (
    <ThemeProvider>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<DealsPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/deals" element={<DealsPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/appointments" element={<AppointmentManagementPage />} />
          <Route path="/join" element={<SignUpPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DashboardLayout>
    </ThemeProvider>
  )
}

export default App