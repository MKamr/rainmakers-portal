import { Deal, User } from '../types'
import { DollarSign, MoreHorizontal, ChevronDown, ChevronRight, CheckSquare, Square, Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { adminAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'

interface StageViewProps {
  deals: Deal[]
  onCreateDeal?: () => void
  isLoading?: boolean
  initialStatusFilter?: string
}

interface StageGroup {
  name: string
  color: string
  shortName: string
  deals: Deal[]
  count: number
  stage?: string // Keep original stage name for referenc
}

export function StageView({ deals, onCreateDeal, isLoading = false, initialStatusFilter = 'Open' }: StageViewProps) {
  const { user } = useAuth()
  const [userCache, setUserCache] = useState<Record<string, User>>({})
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter)
  
  // Sync statusFilter with initialStatusFilter prop changes
  useEffect(() => {
    setStatusFilter(initialStatusFilter)
  }, [initialStatusFilter])
  
  // Define all possible stages in order with colors
  const stageConfig = [
    { name: 'Underwriting', color: 'bg-green-500', shortName: 'Underwriting' },
    { name: 'Signed Proposal', color: 'bg-gray-400', shortName: 'Signed Proposal' },
    { name: 'Proposal', color: 'bg-orange-500', shortName: 'Proposal' },
    { name: 'Lender Submission', color: 'bg-pink-500', shortName: 'Lender Submission' },
    { name: 'Needs Analysis', color: 'bg-teal-500', shortName: 'Needs Analysis' },
    { name: 'Qualification', color: 'bg-blue-400', shortName: 'Qualification' }
  ]

  // Default all sections to permanently expanded (open) state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Underwriting': true,
    'Signed Proposal': true,
    'Proposal': true,
    'Lender Submission': true,
    'Needs Analysis': true,
    'Qualification': true
  })
  const [selectedDeals, setSelectedDeals] = useState<Set<string>>(new Set())

  // Filter deals by status
  const filteredDeals = statusFilter ? deals.filter(deal => deal.status === statusFilter) : deals

  // Fetch user information for deals
  useEffect(() => {
    if (!user?.isAdmin || deals.length === 0) return

    const fetchUsers = async () => {
      const uniqueUserIds = [...new Set(deals.map(deal => deal.userId).filter(Boolean))]
      const newUserCache: Record<string, User> = { ...userCache }

      for (const userId of uniqueUserIds) {
        if (!userCache[userId]) {
          try {
            const userData = await adminAPI.getUserById(userId)
            newUserCache[userId] = userData
          } catch (error) {
            console.error(`Failed to fetch user ${userId}:`, error)
            // Set a fallback user object
            newUserCache[userId] = {
              id: userId,
              username: 'Unknown User',
              name: 'Unknown User',
              email: '',
              discordId: '',
              isAdmin: false,
              isWhitelisted: false,
              createdAt: ''
            }
          }
        }
      }

      setUserCache(newUserCache)
    }

    fetchUsers()
  }, [deals, user?.isAdmin, userCache])

  // Helper function to get user display name
  const getUserDisplayName = (userId: string): string => {
    if (!user?.isAdmin) return 'N/A'
    
    const userData = userCache[userId]
    if (!userData) return 'Loading...'
    
    return userData.username || 'Unknown User'
  }

  // Function to normalize stage names
  const normalizeStageName = (stageName: string): string => {
    if (!stageName) return 'No Stage'
    
    // Map various stage name formats to our standard names
    const stageMap: Record<string, string> = {
      'Initial Qualification Stage': 'Qualification',
      'Needs Analysis Stage': 'Needs Analysis',
      'Lender Submission Stage': 'Lender Submission',
      'Proposal Stage': 'Proposal',
      'Signed Proposal Stage': 'Signed Proposal',
      'Underwriting Stage': 'Underwriting',
      'Qualification': 'Qualification',
      'Needs Analysis': 'Needs Analysis',
      'Lender Submission': 'Lender Submission',
      'Proposal': 'Proposal',
      'Signed Proposal': 'Signed Proposal',
      'Underwriting': 'Underwriting'
    }
    
    return stageMap[stageName] || stageName
  }

  // Group deals by stage
  const stageGroups: StageGroup[] = filteredDeals.reduce((groups: StageGroup[], deal) => {
    const normalizedStage = normalizeStageName(deal.stage || 'No Stage')
    const existingGroup = groups.find(group => group.stage === normalizedStage)
    
    if (existingGroup) {
      existingGroup.deals.push(deal)
      existingGroup.count++
    } else {
      // Find the stage config to get name, color, and shortName
      const stageConfigItem = stageConfig.find(config => config.name === normalizedStage)
      groups.push({
        name: stageConfigItem?.name || normalizedStage,
        color: stageConfigItem?.color || 'bg-gray-500',
        shortName: stageConfigItem?.shortName || normalizedStage,
        stage: normalizedStage,
        deals: [deal],
        count: 1
      })
    }
    
    return groups
  }, [])

  // Create a complete list of stages with deals, including empty stages
  const sortedStageGroups: StageGroup[] = stageConfig.map(config => {
    const existingGroup = stageGroups.find(group => group.stage === config.name)
    return {
      ...config,
      deals: existingGroup?.deals || [],
      count: existingGroup?.count || 0,
      stage: config.name
    }
  })

  // Add any stages that exist in deals but not in our predefined list
  const additionalStages = stageGroups.filter(group => !stageConfig.some(config => config.name === group.stage))
  sortedStageGroups.push(...additionalStages.map(group => ({
    name: group.stage || 'Unknown',
    color: 'bg-gray-500',
    shortName: group.stage || 'Unknown',
    deals: group.deals,
    count: group.count,
    stage: group.stage
  })))

  const toggleSection = (stage: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [stage]: !prev[stage]
    }))
  }

  const toggleDealSelection = (dealId: string) => {
    setSelectedDeals(prev => {
      const newSet = new Set(prev)
      if (newSet.has(dealId)) {
        newSet.delete(dealId)
      } else {
        newSet.add(dealId)
      }
      return newSet
    })
  }

  const formatCurrency = (amount: number | undefined) => {
    if (!amount || amount === 0) return '$0'
    if (amount >= 1_000_000_000) {
      return `$${(amount / 1_000_000_000).toFixed(1)}B`
    }
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1)}M`
    }
    if (amount >= 1_000) {
      return `$${Math.round(amount / 1_000)}K`
    }
    return `$${amount.toLocaleString()}`
  }

  const formatSubmittedDate = (value: any): string => {
    if (!value) return 'N/A'
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
    try {
      // Firestore Timestamp (admin SDK) object with toDate()
      if (typeof value === 'object' && value && typeof (value as any).toDate === 'function') {
        return fmt((value as any).toDate())
      }
      // Firestore serialized timestamp shape { seconds, nanoseconds } or with underscores
      if (typeof value === 'object' && value) {
        const seconds = (value as any).seconds ?? (value as any)._seconds
        const nanos = (value as any).nanoseconds ?? (value as any)._nanoseconds
        if (typeof seconds === 'number') {
          const ms = seconds * 1000 + (typeof nanos === 'number' ? Math.floor(nanos / 1e6) : 0)
          return fmt(new Date(ms))
        }
      }
      // Number epoch
      if (typeof value === 'number') {
        const num = value > 1e12 ? value : value * 1000
        return fmt(new Date(num))
      }
      // ISO/String
      const date = new Date(String(value))
      if (!isNaN(date.getTime())) return fmt(date)
      return 'N/A'
    } catch {
      return 'N/A'
    }
  }


  const parseLoanAmountToDollars = (value: string | number | undefined): number => {
    if (value === undefined || value === null) return 0
    if (typeof value === 'number') {
      // If it's a number, return it as-is (assuming it's already in dollars)
      return value
    }
    const raw = String(value).trim()
    if (!raw) return 0
    const lower = raw.toLowerCase().replace(/[$,\s]/g, '')
    const match = lower.match(/^(\d+(?:\.\d+)?)(mm|m|million|k|b|bn|billion)?$/)
    if (match) {
      const num = parseFloat(match[1])
      const unit = match[2]
      if (!unit) return num < 1000 ? num * 1_000_000 : num
      switch (unit) {
        case 'mm':
        case 'm':
        case 'million':
          return num * 1_000_000
        case 'k':
          return num * 1_000
        case 'b':
        case 'bn':
        case 'billion':
          return num * 1_000_000_000
        default:
          return num
      }
    }
    // Extract only the first number from the string to avoid concatenating multiple numbers
    const firstNumberMatch = lower.match(/^(\d+(?:\.\d+)?)/)
    if (!firstNumberMatch) return 0
    
    const numeric = parseFloat(firstNumberMatch[1])
    if (isNaN(numeric)) return 0
    return numeric < 1000 ? numeric * 1_000_000 : numeric
  }

  const formatLoanAmountDisplay = (value: string | number | undefined): string => {
    const dollars = parseLoanAmountToDollars(value)
    if (!dollars) return '$0'
    if (dollars >= 1_000_000_000) return `$${(dollars / 1_000_000_000).toFixed(1)}B`
    if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`
    if (dollars >= 1_000) return `$${Math.round(dollars / 1_000)}K`
    return `$${dollars}`
  }

  const getTotalLoanAmount = (deals: Deal[]) => {
    return deals.reduce((sum, deal) => {
      // Always use parseLoanAmountToDollars for consistency
      const loanAmount = parseLoanAmountToDollars(deal.loanAmount || deal.loanRequest || deal.applicationLoanRequest)
      return sum + loanAmount
    }, 0)
  }

  const getPropertyTypes = (deals: Deal[]) => {
    const types = new Set(deals.map(deal => deal.propertyType).filter(Boolean))
    return Array.from(types)
  }

  // Helper function to format currency values, handling string inputs
  const formatCurrencyFromString = (value: string | number | undefined): string => {
    if (!value) return 'N/A'
    
    // If it's already a number, use it directly
    if (typeof value === 'number') {
      return formatCurrency(value)
    }
    
    // If it's a string, extract the numeric part
    const stringValue = value.toString()
    
    // Extract the first number from the string (before any non-numeric characters)
    const match = stringValue.match(/[\d,]+/)
    if (!match) return 'N/A'
    
    const numericPart = match[0]
    
    // Clean and parse the numeric part
    const cleanedValue = numericPart
      .replace(/[$,\s]/g, '') // Remove $, commas, and spaces
      .replace(/[Kk]/g, '000') // Convert K/k to 000
      .replace(/[Mm]/g, '000000') // Convert M/m to 000000
      .replace(/[Bb]/g, '000000000') // Convert B/b to 000000000
      .trim()
    
    const parsed = parseFloat(cleanedValue)
    return isNaN(parsed) ? 'N/A' : formatCurrency(parsed)
  }

  if (filteredDeals.length === 0) {
    return (
      <div className="bg-gray-900 min-h-screen rounded-lg overflow-hidden">
        <div className="bg-gray-800 p-12">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 text-yellow-400 mb-6">
              <DollarSign className="h-16 w-16" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">🎯 Ready to Build Your Empire?</h3>
            <p className="text-lg text-gray-300 mb-2">Your deal pipeline is waiting to be activated</p>
            <p className="text-sm text-gray-400 mb-8 max-w-md mx-auto">
              Every successful "rainmaker" started with their first deal. 
              Launch your journey by creating your first opportunity and watch your pipeline grow.
            </p>
            <button 
              onClick={onCreateDeal}
              className="inline-flex items-center px-6 py-3 border border-yellow-500 shadow-sm text-sm leading-4 font-medium rounded-md text-yellow-400 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/25"
            >
              <Plus className="h-4 w-4 mr-2" />
              Launch Your First Deal
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 min-h-screen rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">🚀 Deal Pipeline</h1>
            <p className="text-sm text-gray-300 mb-1">Transform opportunities into closed deals</p>
            <p className="text-xs text-gray-400">Monitor progress, identify bottlenecks, and accelerate your real estate investment pipeline</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={onCreateDeal}
              className="inline-flex items-center px-4 py-2 border border-yellow-500 shadow-sm text-sm leading-4 font-medium rounded-md text-yellow-400 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/25"
            >
              <Plus className="h-4 w-4 mr-2" />
              Launch New Deal
            </button>
            <button className="p-2 text-gray-400 hover:text-yellow-400 transition-colors duration-300">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stages */}
      <div className="p-6 space-y-4">
        {sortedStageGroups.map((group) => {
          const isExpanded = expandedSections[group.name]
          const totalLoanAmount = getTotalLoanAmount(group.deals)
          const propertyTypes = getPropertyTypes(group.deals)
          
          return (
            <div key={group.name} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              {/* Stage Header */}
              <div 
                className="px-6 py-4 cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={() => toggleSection(group.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-white" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-white" />
                    )}
                    
                    {/* Stage Color Bar */}
                    <div className={`w-1 h-8 ${group.color} rounded-full`}></div>
                    
                    <div>
                      <h2 className="text-lg font-semibold text-white">{group.shortName}</h2>
                      <p className="text-sm text-gray-300">
                        {group.count === 0 
                          ? '✨ Ready for your next opportunity' 
                          : `🔥 ${group.count} active ${group.count === 1 ? 'deal' : 'deals'} in progress`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-8">
                    {/* Deal Stage Column */}
                    <div className="flex items-center space-x-2">
                      <div className={`w-16 h-4 ${group.color} rounded`}></div>
                    </div>

                    {/* Loan Amount Column */}
                    <div className="text-right">
                      <div className="text-lg font-semibold text-white min-w-[100px]">
                        {isLoading ? (
                          <div className="animate-pulse bg-gray-600 rounded h-6 w-20 mx-auto"></div>
                        ) : (
                          formatCurrency(totalLoanAmount)
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {isLoading ? (
                          <div className="animate-pulse bg-gray-700 rounded h-3 w-8 mx-auto"></div>
                        ) : (
                          'sum'
                        )}
                      </div>
                    </div>

                    {/* Property Type Column */}
                    <div className="flex items-center space-x-2">
                      {propertyTypes.slice(0, 2).map((type, index) => (
                        <span key={index} className="px-2 py-1 text-xs font-medium text-blue-300 bg-blue-900/30 border border-blue-500/50 rounded">
                          {type}
                        </span>
                      ))}
                      {propertyTypes.length > 2 && (
                        <span className="px-2 py-1 text-xs font-medium text-white bg-gray-600 rounded-full">
                          +{propertyTypes.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && group.deals.length > 0 && (
                <div className="bg-gray-800 border-t border-gray-700">
                  <div className="px-6 py-4">
                    {/* Spreadsheet-like Table */}
                    <div className="overflow-x-auto">
                      <div className="min-w-full">
                        {/* Fixed Header Row */}
                        <div className="sticky top-0 z-10 bg-gray-700 border-b-2 border-gray-500">
                          <div className="flex min-w-max">
                            {/* Selection Column */}
                            <div className="w-12 px-2 py-2 flex items-center justify-center border-r border-gray-500 bg-gray-600">
                              <CheckSquare className="h-3 w-3 text-gray-300" />
                            </div>
                            
                            {/* Spreadsheet Headers (Reordered) */}
                            <div className="w-64 px-2 py-2 text-xs font-bold text-white border-r border-gray-500 bg-gray-600">
                              Property Address
                            </div>
                            <div className="w-40 px-2 py-2 text-xs font-bold text-white border-r border-gray-500 bg-gray-600">
                              Deal Stage
                            </div>
                            <div className="w-40 px-2 py-2 text-xs font-bold text-white border-r border-gray-500 bg-gray-600">
                              Submitted Date
                            </div>
                            <div className="w-32 px-2 py-2 text-xs font-bold text-white border-r border-gray-500 bg-gray-600">
                              Created By
                            </div>
                            <div className="w-40 px-2 py-2 text-xs font-bold text-white border-r border-gray-500 bg-gray-600">
                              Loan Amount
                            </div>
                            <div className="w-32 px-2 py-2 text-xs font-bold text-white border-r border-gray-500 bg-gray-600">
                              Property Type
                            </div>
                            <div className="w-32 px-2 py-2 text-xs font-bold text-white border-r border-gray-500 bg-gray-600">
                              Deal Type
                            </div>
                            <div className="w-40 px-2 py-2 text-xs font-bold text-white border-r border-gray-500 bg-gray-600">
                              Investment Type
                            </div>
                            <div className="w-40 px-2 py-2 text-xs font-bold text-white border-r border-gray-500 bg-gray-600">
                              Client Phone
                            </div>
                            <div className="w-48 px-2 py-2 text-xs font-bold text-white border-r border-gray-500 bg-gray-600">
                              Client Email
                            </div>
                            <div className="w-40 px-2 py-2 text-xs font-bold text-white border-r border-gray-500 bg-gray-600">
                              Sponsor Net Worth
                            </div>
                            <div className="w-40 px-2 py-2 text-xs font-bold text-white border-r border-gray-500 bg-gray-600">
                              Sponsor Liquidity
                            </div>
                            <div className="w-64 px-2 py-2 text-xs font-bold text-white bg-gray-600">
                              Additional Information
                            </div>
                          </div>
                        </div>

                        {/* Data Rows */}
                        <div className="space-y-0">
                          {group.deals.map((deal, index) => (
                            <div 
                              key={deal.id} 
                              className={`flex min-w-max hover:bg-gray-600 transition-colors ${
                                index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'
                              }`}
                            >
                              {/* Selection Column */}
                              <div className="w-12 px-2 py-2 flex items-center justify-center border-r border-gray-500">
                                <button
                                  onClick={() => toggleDealSelection(deal.id)}
                                  className="text-gray-400 hover:text-white"
                                >
                                  {selectedDeals.has(deal.id) ? (
                                    <CheckSquare className="h-3 w-3" />
                                  ) : (
                                    <Square className="h-3 w-3" />
                                  )}
                                </button>
                              </div>

                              {/* Spreadsheet Data (Reordered to match headers) */}
                              <div className="w-64 px-2 py-2 text-xs text-white border-r border-gray-500 truncate">
                                {deal.propertyAddress || deal.applicationPropertyAddress || 'N/A'}
                              </div>
                              <div className="w-40 px-2 py-2 text-xs text-white border-r border-gray-500 truncate">
                                {normalizeStageName(deal.stage || group.stage || 'N/A')}
                              </div>
                              <div className="w-40 px-2 py-2 text-xs text-white border-r border-gray-500 truncate">
                                {formatSubmittedDate(deal.createdAt || deal.applicationDate || deal.stageLastUpdated)}
                              </div>
                              <div className="w-32 px-2 py-2 text-xs text-white border-r border-gray-500 truncate">
                                {getUserDisplayName(deal.userId)}
                              </div>
                              <div className="w-40 px-2 py-2 text-xs text-white border-r border-gray-500 truncate">
                                {formatLoanAmountDisplay(deal.loanRequest || deal.applicationLoanRequest)}
                              </div>
                              <div className="w-32 px-2 py-2 text-xs text-white border-r border-gray-500 truncate">
                                {deal.propertyType || deal.applicationPropertyType || 'N/A'}
                              </div>
                              <div className="w-32 px-2 py-2 text-xs text-white border-r border-gray-500 truncate">
                                {deal.dealType || deal.applicationDealType || 'N/A'}
                              </div>
                              <div className="w-40 px-2 py-2 text-xs text-white border-r border-gray-500 truncate">
                                {deal.investmentType || 'N/A'}
                              </div>
                              <div className="w-40 px-2 py-2 text-xs text-white border-r border-gray-500 truncate">
                                {deal.contactPhone || 'N/A'}
                              </div>
                              <div className="w-48 px-2 py-2 text-xs text-white border-r border-gray-500 truncate">
                                {deal.contactEmail || 'N/A'}
                              </div>
                              <div className="w-40 px-2 py-2 text-xs text-white border-r border-gray-500 truncate">
                                {formatCurrencyFromString(deal.sponsorNetWorth || deal.applicationSponsorNetWorth)}
                              </div>
                              <div className="w-40 px-2 py-2 text-xs text-white border-r border-gray-500 truncate">
                                {formatCurrencyFromString(deal.sponsorLiquidity || deal.applicationSponsorLiquidity)}
                              </div>
                              <div className="w-64 px-2 py-2 text-xs text-white truncate">
                                {deal.additionalInformation || deal.applicationAdditionalInformation || 'N/A'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

      </div>
    </div>
  )
}