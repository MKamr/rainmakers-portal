import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { ThemeProvider } from './contexts/ThemeContext'
import { LoginPage } from './pages/LoginPage'
import { DashboardLayout } from './components/DashboardLayout'
import { HomePage } from './pages/HomePage'
import { DealsPage } from './pages/DealsPage'
import { AdminPage } from './pages/AdminPage'
import { LoadingSpinner } from './components/LoadingSpinner'

function App() {
  const { user, isLoading } = useAuth()

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
        <LoginPage />
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

  console.log('🎉 App: User is whitelisted, showing dashboard')
  return (
    <ThemeProvider>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<DealsPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/deals" element={<DealsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DashboardLayout>
    </ThemeProvider>
  )
}

export default App