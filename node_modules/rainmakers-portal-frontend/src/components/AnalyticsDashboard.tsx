import { Deal } from '../types'
import { 
  DollarSign, 
  TrendingUp, 
  Building, 
  Calendar,
  PieChart,
  Activity
} from 'lucide-react'

interface AnalyticsDashboardProps {
  deals: Deal[]
}

export function AnalyticsDashboard({ deals }: AnalyticsDashboardProps) {
  // Helper function to parse loan amount from string
  const parseLoanAmount = (deal: Deal): number => {
    // Try loanAmount first (for backwards compatibility)
    if (deal.loanAmount && typeof deal.loanAmount === 'number') {
      return deal.loanAmount
    }
    
    // Then try loanRequest (current primary field)
    if (deal.loanRequest) {
      // Remove common characters and parse
      const cleanedValue = deal.loanRequest.toString()
        .replace(/[$,\s]/g, '') // Remove $, commas, and spaces
        .replace(/[Kk]/g, '000') // Convert K/k to 000
        .replace(/[Mm]/g, '000000') // Convert M/m to 000000
        .replace(/[Bb]/g, '000000000') // Convert B/b to 000000000
        .trim()
      
      const parsed = parseFloat(cleanedValue)
      return isNaN(parsed) ? 0 : parsed
    }
    
    // Fallback to 0
    return 0
  }

  // Calculate analytics using new field names
  const totalDeals = deals.length
  const totalLoanAmount = deals.reduce((sum, deal) => sum + parseLoanAmount(deal), 0)
  const activeDeals = deals.filter(deal => deal.status !== 'Closed').length
  
  // Stage distribution
  const stageDistribution = deals.reduce((acc, deal) => {
    const stage = deal.stage || 'Qualification'
    acc[stage] = (acc[stage] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Property type distribution - using new field names
  const propertyTypeDistribution = deals.reduce((acc, deal) => {
    const type = deal.propertyType || deal.applicationPropertyType || 'Unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Deal type distribution - using new field names
  const dealTypeDistribution = deals.reduce((acc, deal) => {
    const type = deal.dealType || deal.applicationDealType || 'Unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Average loan amount
  const averageLoanAmount = totalDeals > 0 ? totalLoanAmount / totalDeals : 0

  // Recent deals (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentDeals = deals.filter(deal => {
    if (!deal.createdAt) return false
    const dealDate = new Date(deal.createdAt)
    return dealDate >= thirtyDaysAgo
  })

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    return `$${amount.toLocaleString()}`
  }

  const getStageColor = (stage: string) => {
    const colors = {
      'Qualification': 'bg-yellow-100 text-yellow-800',
      'Needs Analysis': 'bg-blue-100 text-blue-800',
      'Lender Submission': 'bg-indigo-100 text-indigo-800',
      'Proposal': 'bg-purple-100 text-purple-800',
      'Signed Proposal': 'bg-pink-100 text-pink-800',
      'Underwriting': 'bg-orange-100 text-orange-800',
      'Approved': 'bg-emerald-100 text-emerald-800',
      'Closed': 'bg-gray-100 text-gray-800',
      'No Stage': 'bg-gray-100 text-gray-600'
    }
    return colors[stage as keyof typeof colors] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="space-y-4 sm:space-y-6 matrix-analytics-container">
      {/* Matrix Background Effect */}
      <div className="matrix-bg-overlay"></div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 matrix-metrics-grid">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 sm:p-6 matrix-metric-card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-2 sm:p-3 rounded-md bg-blue-100 dark:bg-blue-900 matrix-icon-container">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400 matrix-icon" />
              </div>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 matrix-metric-label">TOTAL LOAN VOLUME</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white matrix-metric-value">{formatCurrency(totalLoanAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 sm:p-6 matrix-metric-card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-2 sm:p-3 rounded-md bg-green-100 dark:bg-green-900 matrix-icon-container">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400 matrix-icon" />
              </div>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 matrix-metric-label">TOTAL DEALS</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white matrix-metric-value">{totalDeals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 sm:p-6 matrix-metric-card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-2 sm:p-3 rounded-md bg-yellow-100 dark:bg-yellow-900 matrix-icon-container">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400 matrix-icon" />
              </div>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 matrix-metric-label">ACTIVE DEALS</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white matrix-metric-value">{activeDeals}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 matrix-analytics-grid">
        {/* Stage Distribution */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 sm:p-6 matrix-analytics-card">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-sm sm:text-lg font-medium text-gray-900 dark:text-white matrix-section-title">DEALS BY STAGE</h3>
            <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500 matrix-section-icon" />
          </div>
          <div className="space-y-3">
            {Object.entries(stageDistribution).map(([stage, count]) => (
              <div key={stage} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStageColor(stage)}`}>
                    {stage}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(count / totalDeals) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Property Type Distribution */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 sm:p-6 matrix-analytics-card">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-sm sm:text-lg font-medium text-gray-900 dark:text-white matrix-section-title">PROPERTY TYPES</h3>
            <Building className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500 matrix-section-icon" />
          </div>
          <div className="space-y-3">
            {Object.entries(propertyTypeDistribution).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300 matrix-data-label">{type}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 dark:bg-gray-800 rounded-full h-2 matrix-progress-bg">
                    <div 
                      className="bg-green-600 h-2 rounded-full matrix-progress-bar" 
                      style={{ width: `${(count / totalDeals) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white matrix-data-value">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deal Type Distribution */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 sm:p-6 matrix-analytics-card">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-sm sm:text-lg font-medium text-gray-900 dark:text-white matrix-section-title">DEAL TYPES</h3>
            <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500 matrix-section-icon" />
          </div>
          <div className="space-y-3">
            {Object.entries(dealTypeDistribution).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300 matrix-data-label">{type}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 dark:bg-gray-800 rounded-full h-2 matrix-progress-bg">
                    <div 
                      className="bg-purple-600 h-2 rounded-full matrix-progress-bar" 
                      style={{ width: `${(count / totalDeals) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white matrix-data-value">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-3 sm:gap-6 matrix-financial-section">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 sm:p-6 matrix-analytics-card">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-sm sm:text-lg font-medium text-gray-900 dark:text-white matrix-section-title">AVERAGE LOAN AMOUNT</h3>
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500 matrix-section-icon" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white matrix-financial-value">{formatCurrency(averageLoanAmount)}</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 sm:p-6 matrix-analytics-card">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-sm sm:text-lg font-medium text-gray-900 dark:text-white matrix-section-title">RECENT ACTIVITY</h3>
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500 matrix-section-icon" />
        </div>
        <div className="space-y-3">
          {recentDeals.slice(0, 5).map((deal) => (
            <div key={deal.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0 matrix-activity-item">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full matrix-activity-indicator"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white matrix-activity-name">
                    {deal.propertyName || deal.opportunityName || 'Unnamed Deal'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 matrix-activity-details">
                    {deal.stage || 'Qualification'} • {formatCurrency(parseLoanAmount(deal))}
                  </p>
                </div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 matrix-activity-date">
                {deal.createdAt ? new Date(deal.createdAt).toLocaleDateString() : ''}
              </span>
            </div>
          ))}
          {recentDeals.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 matrix-empty-state">NO RECENT ACTIVITY</p>
          )}
        </div>
      </div>
      
    </div>
  )
}