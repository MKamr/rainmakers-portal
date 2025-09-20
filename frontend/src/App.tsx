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

  console.log('App render:', { user, isLoading })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Check if user is logged in - if no token or no user, show login
  const token = localStorage.getItem('token')
  console.log('Token check:', { token: !!token, user: !!user })
  
  if (!user || !token) {
    console.log('No user or token, showing login')
    return (
      <ThemeProvider>
        <LoginPage />
      </ThemeProvider>
    )
  }

  console.log('User data:', user)
  console.log('isWhitelisted:', user.isWhitelisted)
  console.log('isAdmin:', user.isAdmin)

  if (!user.isWhitelisted) {
    console.log('User not whitelisted, showing pending modal')
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
                  localStorage.removeItem('token')
                  localStorage.removeItem('user')
                  window.location.reload()
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

  console.log('User is whitelisted, showing dashboard')
  return (
    <ThemeProvider>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/deals" element={<DealsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DashboardLayout>
    </ThemeProvider>
  )
}

export default App