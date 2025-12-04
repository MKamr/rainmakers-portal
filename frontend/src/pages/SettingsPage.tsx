import { useQuery } from 'react-query'
import { paymentAPI } from '../services/api'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { format } from 'date-fns'

export function SettingsPage() {
  const { data: subscriptionData, isLoading } = useQuery(
    'subscription',
    paymentAPI.getSubscriptionStatus
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Helper function to safely convert Firebase Timestamp to Date
  const toDate = (timestamp: any): Date | null => {
    if (!timestamp) return null
    
    try {
      // Firebase Timestamp object
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate()
      }
      
      // Already a Date object
      if (timestamp instanceof Date) {
        return isNaN(timestamp.getTime()) ? null : timestamp
      }
      
      // Timestamp object with seconds/nanoseconds (Firestore format)
      if (timestamp.seconds !== undefined) {
        const date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000)
        return isNaN(date.getTime()) ? null : date
      }
      
      // String or number
      const date = new Date(timestamp)
      return isNaN(date.getTime()) ? null : date
    } catch (error) {
      return null
    }
  }

  const subscription = subscriptionData?.subscription
  const gracePeriodEndDate = subscription?.gracePeriodEnd ? toDate(subscription.gracePeriodEnd) : null
  const isInGracePeriod = gracePeriodEndDate && gracePeriodEndDate > new Date()

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Settings</h1>

      {/* Subscription Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Subscription</h2>

        {!subscriptionData?.hasSubscription ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">
              You don't have an active subscription.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Subscription Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <p className={`text-lg font-semibold ${
                  subscription?.status === 'active' 
                    ? 'text-green-600 dark:text-green-400' 
                    : subscription?.status === 'canceled'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {subscription?.status.toUpperCase()}
                  {isInGracePeriod && (
                    <span className="ml-2 text-sm text-yellow-600 dark:text-yellow-400">
                      (Grace Period)
                    </span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Plan</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  Monthly
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current Period Start</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {(() => {
                    const date = subscription?.currentPeriodStart ? toDate(subscription.currentPeriodStart) : null
                    return date ? format(date, 'MMM dd, yyyy') : 'N/A'
                  })()}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current Period End</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {(() => {
                    const date = subscription?.currentPeriodEnd ? toDate(subscription.currentPeriodEnd) : null
                    return date ? format(date, 'MMM dd, yyyy') : 'N/A'
                  })()}
                </p>
              </div>

              {gracePeriodEndDate && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Grace Period Ends</p>
                  <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                    {format(gracePeriodEndDate, 'MMM dd, yyyy')}
                  </p>
                </div>
              )}
            </div>


            {subscription?.cancelAtPeriodEnd && (
              <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 rounded-lg">
                <p className="text-yellow-800 dark:text-yellow-200">
                  Your subscription will be canceled at the end of the current billing period.
                </p>
              </div>
            )}
          </div>
        )}
      </div>


    </div>
  )
}

