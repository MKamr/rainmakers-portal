import { createPortal } from 'react-dom'
import { useQuery } from 'react-query'
import { userAPI, adminAPI } from '../services/api'
import { User } from '../types'
import { X, User as UserIcon, Mail, Phone, Key, Info, Shield, Calendar, CheckCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { safeFormatDate } from '../utils/dateUtils'

interface UserProfileModalProps {
  userId?: string // If provided, show this user's profile (admin viewing another user)
  isAdminView?: boolean // If true, show basic info only (admin viewing another user)
  onClose: () => void
}

export function UserProfileModal({ userId, isAdminView = false, onClose }: UserProfileModalProps) {
  const { user: currentUser } = useAuth()

  // Fetch user profile
  const { data: userProfile, isLoading } = useQuery<User>(
    ['user-profile', userId || currentUser?.id],
    () => {
      if (userId && isAdminView) {
        // Admin viewing another user - use admin API
        return adminAPI.getUserById(userId)
      } else {
        // User viewing their own profile
        return userAPI.getProfile()
      }
    },
    {
      enabled: !!currentUser
    }
  )

  if (!userProfile && !isLoading) {
    return null
  }

  const displayUser = userProfile || currentUser
  if (!displayUser) return null

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Animated Backdrop */}
        <div 
          className="fixed inset-0 bg-gradient-to-br from-black/80 via-gray-900/90 to-black/80 backdrop-blur-sm transition-opacity animate-fadeIn"
          onClick={onClose}
        />
        
        {/* Modal with cool design */}
        <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-orange-500/20 overflow-hidden animate-scaleIn">
          {/* Animated gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-yellow-500/20 to-orange-500/20 opacity-50 blur-xl"></div>
          
          {/* Header with gradient */}
          <div className="relative bg-gradient-to-r from-orange-500/10 via-yellow-500/10 to-orange-500/10 border-b border-orange-500/30 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Profile Picture with glow effect */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full blur-md opacity-50 animate-pulse"></div>
                  {displayUser.avatar ? (
                    <img
                      src={displayUser.avatar}
                      alt={displayUser.username}
                      className="relative h-20 w-20 rounded-full border-2 border-orange-500/50 shadow-lg ring-2 ring-orange-500/30"
                    />
                  ) : (
                    <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center border-2 border-orange-500/50 shadow-lg ring-2 ring-orange-500/30">
                      <UserIcon className="h-10 w-10 text-orange-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
                      @{displayUser.username}
                    </h2>
                    {displayUser.isAdmin && (
                      <Shield className="h-5 w-5 text-orange-400" />
                    )}
                  </div>
                  <div className="flex items-center space-x-1.5 mt-2">
                    <Info className="h-3.5 w-3.5 text-orange-400/70" />
                    <p className="text-xs text-gray-400 font-mono tracking-wider">
                      {displayUser.id}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-orange-500/20 transition-all duration-200 hover:rotate-90"
                aria-label="Close profile modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="relative p-6">
            <div className="flex items-center space-x-2 mb-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent uppercase tracking-wider">
                Account Information
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
            </div>
            
            <div className="space-y-3">
              {/* Discord Username */}
              <div className="group relative p-4 bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-xl border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
                <div className="flex items-center space-x-4">
                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30">
                    <UserIcon className="h-5 w-5 text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                      Discord Username
                    </label>
                    <p className="text-sm font-medium text-white">
                      {displayUser.username}
                    </p>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="group relative p-4 bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-xl border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
                <div className="flex items-center space-x-4">
                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30">
                    <Mail className="h-5 w-5 text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                      Email Address {!isAdminView && (
                        <span className="text-orange-500/80 font-normal">(UNVERIFIED)</span>
                      )}
                    </label>
                    <p className="text-sm font-medium text-white break-all">
                      {displayUser.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Phone Number */}
              <div className="group relative p-4 bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-xl border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
                <div className="flex items-center space-x-4">
                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30">
                    <Phone className="h-5 w-5 text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                      Phone Number
                    </label>
                    <p className="text-sm font-medium text-gray-500">
                      Not Set
                    </p>
                  </div>
                </div>
              </div>

              {/* Password - Only show for own profile */}
              {!isAdminView && (
                <div className="group relative p-4 bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-xl border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
                  <div className="flex items-center space-x-4">
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30">
                      <Key className="h-5 w-5 text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                        Password
                      </label>
                      <p className="text-sm font-medium text-white font-mono tracking-wider">
                        ••••••••••
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin View - Additional Basic Info */}
              {isAdminView && (
                <div className="group relative p-4 bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-xl border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
                  <div className="flex items-center space-x-4">
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30">
                      <Shield className="h-5 w-5 text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                        Status
                      </label>
                      <div className="flex items-center flex-wrap gap-2">
                        {displayUser.isAdmin && (
                          <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-300 rounded-lg border border-blue-500/30">
                            <Shield className="h-3 w-3 mr-1.5" />
                            Admin
                          </span>
                        )}
                        {displayUser.isWhitelisted && (
                          <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-300 rounded-lg border border-green-500/30">
                            <CheckCircle className="h-3 w-3 mr-1.5" />
                            Whitelisted
                          </span>
                        )}
                        {displayUser.hasManualSubscription && (
                          <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 text-yellow-300 rounded-lg border border-yellow-500/30">
                            <CheckCircle className="h-3 w-3 mr-1.5" />
                            Manual Subscription
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Created Date */}
              {displayUser.createdAt && (
                <div className="group relative p-4 bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-xl border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
                  <div className="flex items-center space-x-4">
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30">
                      <Calendar className="h-5 w-5 text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                        Member Since
                      </label>
                      <p className="text-sm font-medium text-white">
                        {safeFormatDate(displayUser.createdAt, 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

