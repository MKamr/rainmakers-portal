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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Check if user is logged in - if no token or no user, show login
  const token = localStorage.getItem('token')
  if (!user || !token) {
    return (
      <ThemeProvider>
        <LoginPage />
      </ThemeProvider>
    )
  }

  if (!user.isWhitelisted) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Access Pending</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Your account is pending approval. Please contact an administrator to get access to the Rainmakers Portal.
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                window.location.reload()
              }}
              className="btn btn-primary btn-md"
            >
              Sign Out
            </button>
          </div>
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          {!user.isAdmin && <Route path="/deals" element={<DealsPage />} />}
          {user.isAdmin && <Route path="/admin" element={<AdminPage />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DashboardLayout>
    </ThemeProvider>
  )
}

export default App
