import { useQuery } from 'react-query'
import { dealsAPI } from '../services/api'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { AnalyticsDashboard } from '../components/AnalyticsDashboard'

export function HomePage() {
  const { data: deals, isLoading: dealsLoading } = useQuery('deals', dealsAPI.getDeals)

  if (dealsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="w-full matrix-container">
      {/* Matrix Background Effect */}
      <div className="matrix-bg-overlay"></div>
      
      {/* Analytics Dashboard */}
      <div className="p-3 sm:p-6 matrix-content">
        <AnalyticsDashboard deals={deals || []} />
      </div>
      
    </div>
  )
}
