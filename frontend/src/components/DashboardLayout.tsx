import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../contexts/ThemeContext'
import { ThemeToggle } from './ThemeToggle'
import { UserProfileModal } from './UserProfileModal'
import { cn } from '../utils/cn'
import {
  Home,
  FileText,
  Users,
  Menu,
  X,
  LogOut,
  User,
  Calendar,
  CreditCard
} from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const { user, logout } = useAuth()
  const { theme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const navigation = [
    { name: 'Deals', href: '/', icon: FileText },
    { name: 'Home', href: '/home', icon: Home },
    { name: 'My Appointments', href: '/appointments', icon: Calendar },
    { name: 'Subscription & Billing', href: '/settings', icon: CreditCard }
  ]

  if (user?.isAdmin) {
    navigation.push(
      { name: 'Appointment Management', href: '/admin/appointments', icon: Calendar }
    )
    navigation.push({ name: 'Admin', href: '/admin', icon: Users })
  }

  const handleLogout = async () => {
    try {
      await logout()
      // The logout function will handle the redirect
    } catch (error) {
      console.error('Logout failed:', error)
      // Even if logout fails, clear local storage and redirect
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black matrix-dashboard">
      {/* Matrix Background Effect */}
      <div className="matrix-bg-overlay"></div>
      
      {/* Mobile sidebar */}
      <div className={cn(
        'fixed inset-0 z-50 lg:hidden',
        sidebarOpen ? 'block' : 'hidden'
      )}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex w-full max-w-xs h-full flex-col bg-white dark:bg-black matrix-mobile-sidebar">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white matrix-close-btn"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex flex-shrink-0 items-center px-4 py-4 matrix-logo-section">
            <img 
              src={theme === 'light' 
                ? "/logo_for_lighttheme.png" 
                : "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rainmakers-logo-large-removebg-preview-p0gcjZeMhKuX7apjSsIKO50dynyjx4.png"
              } 
              alt="Rainmakers Logo" 
              className="h-16 w-auto"
              onError={(e) => {
                console.error('Mobile logo failed to load:', e.currentTarget.src);
                // Fallback to the external logo if local fails
                if (e.currentTarget.src.includes('/logo_for_lighttheme.png')) {
                  e.currentTarget.src = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rainmakers-logo-large-removebg-preview-p0gcjZeMhKuX7apjSsIKO50dynyjx4.png";
                }
              }}
            />
          </div>
          <div className="mt-5 flex-1 overflow-y-auto min-h-0">
            <nav className="space-y-1 px-3 matrix-nav">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <button
                    key={item.name}
                    onClick={(e) => {
                      e.preventDefault()
                      setSidebarOpen(false)
                      navigate(item.href)
                    }}
                    className={cn(
                      'group flex items-center w-full px-3 py-3 text-base font-medium rounded-md matrix-nav-item text-left',
                      isActive
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 matrix-nav-active'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white matrix-nav-inactive'
                    )}
                  >
                    <item.icon className="mr-4 h-6 w-6 flex-shrink-0 matrix-nav-icon" />
                    {item.name}
                  </button>
                )
              })}
            </nav>
          </div>
          
          {/* Mobile User Section */}
          <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-700 p-4 mt-auto matrix-user-section">
            <div className="group block w-full flex-shrink-0">
              <div className="flex items-center">
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div>
                    {user?.avatar ? (
                      <img
                        className="inline-block h-8 w-8 rounded-full matrix-user-avatar"
                        src={user.avatar}
                        alt={user.username}
                      />
                    ) : (
                      <div className="inline-block h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-800 flex items-center justify-center matrix-user-avatar">
                        <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white matrix-username">
                      {user?.username}
                    </p>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 matrix-user-role">
                      {user?.isAdmin ? 'ADMIN' : 'USER'}
                    </p>
                  </div>
                </button>
                <button
                  onClick={handleLogout}
                  className="ml-auto p-1 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 matrix-logout-btn"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:z-10">
        <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-black border-r border-gray-200 dark:border-gray-700 matrix-desktop-sidebar">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4 matrix-logo-section">
              <img 
                src={theme === 'light' 
                  ? "/logo_for_lighttheme.png" 
                  : "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rainmakers-logo-large-removebg-preview-p0gcjZeMhKuX7apjSsIKO50dynyjx4.png"
                } 
                alt="Rainmakers Logo" 
                className="h-20 w-auto"
                onError={(e) => {
                  console.error('Logo failed to load:', e.currentTarget.src);
                  // Fallback to the external logo if local fails
                  if (e.currentTarget.src.includes('/logo_for_lighttheme.png')) {
                    e.currentTarget.src = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rainmakers-logo-large-removebg-preview-p0gcjZeMhKuX7apjSsIKO50dynyjx4.png";
                  }
                }}
              />
            </div>
            <nav className="mt-5 flex-1 space-y-1 px-2 matrix-nav">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <button
                    key={item.name}
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(item.href)
                    }}
                    className={cn(
                      'group flex items-center w-full px-2 py-2 text-sm font-medium rounded-md matrix-nav-item text-left',
                      isActive
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 matrix-nav-active'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white matrix-nav-inactive'
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0 matrix-nav-icon" />
                    {item.name}
                  </button>
                )
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-700 p-4 matrix-user-section">
            <div className="group block w-full flex-shrink-0">
              <div className="flex items-center">
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div>
                    {user?.avatar ? (
                      <img
                        className="inline-block h-9 w-9 rounded-full matrix-user-avatar"
                        src={user.avatar}
                        alt={user.username}
                      />
                    ) : (
                      <div className="inline-block h-9 w-9 rounded-full bg-gray-300 dark:bg-gray-800 flex items-center justify-center matrix-user-avatar">
                        <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white matrix-username">
                      {user?.username}
                    </p>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 matrix-user-role">
                      {user?.isAdmin ? 'ADMIN' : 'USER'}
                    </p>
                  </div>
                </button>
                <button
                  onClick={handleLogout}
                  className="ml-auto p-1 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 matrix-logout-btn"
                  aria-label="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1 matrix-main-content">
        {/* Desktop header */}
        <div className="sticky top-0 z-10 hidden lg:flex h-16 flex-shrink-0 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-700 matrix-header">
          <div className="flex flex-1 justify-between px-4">
            <div className="flex flex-1">
              <div className="flex w-full flex-col md:ml-0">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <div className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
              </div>
            </div>
            <div className="ml-4 flex items-center md:ml-6 matrix-header-actions">
              <ThemeToggle />
            </div>
          </div>
        </div>
        
        {/* Mobile header */}
        <div className="sticky top-0 z-10 lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 matrix-mobile-header">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-yellow-500 matrix-mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        <main className="flex-1 matrix-content">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
      
      {/* User Profile Modal */}
      {showProfileModal && (
        <UserProfileModal
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  )
}
