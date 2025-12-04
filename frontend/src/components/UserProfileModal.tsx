import { createPortal } from 'react-dom'
import { useQuery } from 'react-query'
import { userAPI, adminAPI, paymentAPI } from '../services/api'
import { User } from '../types'
import { X, User as UserIcon, Mail, Phone, Key, Info, Shield, Calendar, CheckCircle, CreditCard } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { safeFormatDate } from '../utils/dateUtils'
import { format } from 'date-fns'

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

  // Fetch subscription status (only for own profile)
  const { data: subscriptionData } = useQuery(
    'subscription',
    paymentAPI.getSubscriptionStatus,
    {
      enabled: !!currentUser && !isAdminView
    }
  )

  if (!userProfile && !isLoading) {
    return null
  }

  const displayUser = userProfile || currentUser
  if (!displayUser) return null

  // Helper function to safely convert Firebase Timestamp to Date
  const toDate = (timestamp: any): Date | null => {
    if (!timestamp) return null
    
    try {
      // Firebase Timestamp object (server-side)
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate()
      }
      
      // Already a Date object
      if (timestamp instanceof Date) {
        return isNaN(timestamp.getTime()) ? null : timestamp
      }
      
      // Timestamp object with seconds/nanoseconds (Firestore format - serialized)
      // Check for both _seconds (Firebase v9+) and seconds (older versions)
      const seconds = timestamp.seconds !== undefined ? timestamp.seconds : timestamp._seconds
      const nanoseconds = timestamp.nanoseconds !== undefined ? timestamp.nanoseconds : timestamp._nanoseconds
      
      if (seconds !== undefined) {
        const date = new Date(seconds * 1000 + (nanoseconds || 0) / 1000000)
        return isNaN(date.getTime()) ? null : date
      }
      
      // If it's a number (Unix timestamp in seconds)
      if (typeof timestamp === 'number') {
        // Check if it's in seconds or milliseconds
        const date = timestamp > 1000000000000 ? new Date(timestamp) : new Date(timestamp * 1000)
        return isNaN(date.getTime()) ? null : date
      }
      
      // String date (ISO format or other)
      if (typeof timestamp === 'string') {
        const date = new Date(timestamp)
        return isNaN(date.getTime()) ? null : date
      }
      
      return null
    } catch (error) {
      console.error('Error converting timestamp to date:', error, timestamp)
      return null
    }
  }

  const subscription = subscriptionData?.subscription
  const gracePeriodEndDate = subscription?.gracePeriodEnd ? toDate(subscription.gracePeriodEnd) : null
  const isInGracePeriod = gracePeriodEndDate && gracePeriodEndDate > new Date()

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

            {/* Subscription Section - Only show for own profile */}
            {!isAdminView && (
              <>
                <div className="flex items-center space-x-2 my-6">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
                  <h3 className="text-lg font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent uppercase tracking-wider">
                    Subscription & Billing
                  </h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
                </div>

                {!subscriptionData?.hasSubscription ? (
                  <div className="group relative p-4 bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-xl border border-orange-500/20">
                    <div className="flex items-center space-x-4">
                      <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30">
                        <CreditCard className="h-5 w-5 text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                          Subscription Status
                        </label>
                        <p className="text-sm font-medium text-gray-500">
                          No active subscription
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Subscription Status */}
                    <div className="group relative p-4 bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-xl border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
                      <div className="flex items-center space-x-4">
                        <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30">
                          <CreditCard className="h-5 w-5 text-orange-400" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                            Status
                          </label>
                          <p className={`text-sm font-semibold ${
                            subscription?.status === 'active' 
                              ? 'text-green-400' 
                              : subscription?.status === 'canceled'
                              ? 'text-red-400'
                              : 'text-yellow-400'
                          }`}>
                            {subscription?.status.toUpperCase() || 'UNKNOWN'}
                            {isInGracePeriod && (
                              <span className="ml-2 text-xs text-yellow-400">
                                (Grace Period)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Plan */}
                    <div className="group relative p-4 bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-xl border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
                      <div className="flex items-center space-x-4">
                        <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30">
                          <Info className="h-5 w-5 text-orange-400" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                            Plan
                          </label>
                          <p className="text-sm font-medium text-white">
                            Monthly
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Current Period Start */}
                    <div className="group relative p-4 bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-xl border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
                      <div className="flex items-center space-x-4">
                        <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30">
                          <Calendar className="h-5 w-5 text-orange-400" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                            Current Period Start
                          </label>
                          <p className="text-sm font-medium text-white">
                            {(() => {
                              if (!subscription?.currentPeriodStart) return 'N/A'
                              const date = toDate(subscription.currentPeriodStart)
                              return date ? format(date, 'MMM dd, yyyy') : 'N/A'
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Current Period End */}
                    <div className="group relative p-4 bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-xl border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
                      <div className="flex items-center space-x-4">
                        <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30">
                          <Calendar className="h-5 w-5 text-orange-400" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                            Current Period End
                          </label>
                          <p className="text-sm font-medium text-white">
                            {(() => {
                              if (!subscription?.currentPeriodEnd) return 'N/A'
                              const date = toDate(subscription.currentPeriodEnd)
                              return date ? format(date, 'MMM dd, yyyy') : 'N/A'
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Grace Period End */}
                    {gracePeriodEndDate && (
                      <div className="group relative p-4 bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-xl border border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10">
                        <div className="flex items-center space-x-4">
                          <div className="p-2.5 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                            <Info className="h-5 w-5 text-yellow-400" />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                              Grace Period Ends
                            </label>
                            <p className="text-sm font-medium text-yellow-400">
                              {format(gracePeriodEndDate, 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cancellation Notice */}
                    {subscription?.cancelAtPeriodEnd && (
                      <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl">
                        <p className="text-sm text-yellow-400">
                          Your subscription will be canceled at the end of the current billing period.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

