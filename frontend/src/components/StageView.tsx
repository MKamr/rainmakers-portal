import { Deal } from '../types'
import { DollarSign, MoreHorizontal, ChevronDown, ChevronRight, CheckSquare, Square, Plus } from 'lucide-react'
import { useState } from 'react'

interface StageViewProps {
  deals: Deal[]
  onCreateDeal?: () => void
  isLoading?: boolean
}

interface StageGroup {
  name: string
  color: string
  shortName: string
  deals: Deal[]
  count: number
  stage?: string // Keep original stage name for reference
}

export function StageView({ deals, onCreateDeal, isLoading = false }: StageViewProps) {
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
  const stageGroups: StageGroup[] = deals.reduce((groups: StageGroup[], deal) => {
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
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 10000) {
      return `$${(amount / 1000).toFixed(0)}K`
    }
    return `$${amount.toLocaleString()}`
  }


  const getTotalLoanAmount = (deals: Deal[]) => {
    return deals.reduce((sum, deal) => sum + (deal.loanAmount || 0), 0)
  }

  const getPropertyTypes = (deals: Deal[]) => {
    const types = new Set(deals.map(deal => deal.propertyType).filter(Boolean))
    return Array.from(types)
  }

  if (deals.length === 0) {
    return (
      <div className="bg-gray-900 min-h-screen -mx-4 sm:-mx-6 lg:-mx-8">
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
    <div className="bg-gray-900 min-h-screen -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">🚀 Deal Pipeline</h1>
            <p className="text-sm text-gray-300 mb-1">Transform opportunities into closed deals</p>
            <p className="text-xs text-gray-400">Monitor progress, identify bottlenecks, and accelerate your real estate investment pipeline</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="inline-flex items-center px-4 py-2 border border-yellow-500 shadow-sm text-sm leading-4 font-medium rounded-md text-yellow-400 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/25">
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
                            
                            {/* Spreadsheet Headers */}
                            <div className="w-32 px-2 py-2 text-xs font-bold text-white border-r border-gray-500 bg-gray-600">
                              me
                            </div>
                            <div className="w-40 px-2 py-2 text-xs font-bold text-white border-r border-gray-500 bg-gray-600">
                              Client Phone
                            </div>
                            <div className="w-48 px-2 py-2 text-xs font-bold text-white border-r border-gray-500 bg-gray-600">
                              Client Email
                            </div>
                            <div className="w-32 px-2 py-2 text-xs font-bold text-white border-r border-gray-500 bg-gray-600">
                              Deal Type
                            </div>
                            <div className="w-32 px-2 py-2 text-xs font-bold text-white border-r border-gray-500 bg-gray-600">
                              Property Type
                            </div>
                            <div className="w-40 px-2 py-2 text-xs font-bold text-white border-r border-gray-500 bg-gray-600">
                              Loan Request
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

                              {/* Spreadsheet Data */}
                              <div className="w-32 px-2 py-2 text-xs text-white border-r border-gray-500 truncate">
                                {/* Empty for "me" column */}
                              </div>
                              <div className="w-40 px-2 py-2 text-xs text-white border-r border-gray-500 truncate">
                                {deal.contactPhone || 'N/A'}
                              </div>
                              <div className="w-48 px-2 py-2 text-xs text-white border-r border-gray-500 truncate">
                                {deal.contactEmail || 'N/A'}
                              </div>
                              <div className="w-32 px-2 py-2 text-xs text-white border-r border-gray-500 truncate">
                                {deal.dealType || deal.applicationDealType || 'N/A'}
                              </div>
                              <div className="w-32 px-2 py-2 text-xs text-white border-r border-gray-500 truncate">
                                {deal.propertyType || deal.applicationPropertyType || 'N/A'}
                              </div>
                              <div className="w-40 px-2 py-2 text-xs text-white border-r border-gray-500 truncate">
                                {deal.loanRequest || deal.applicationLoanRequest 
                                  ? formatCurrency(Number(deal.loanRequest || deal.applicationLoanRequest))
                                  : 'N/A'
                                }
                              </div>
                              <div className="w-40 px-2 py-2 text-xs text-white border-r border-gray-500 truncate">
                                {deal.sponsorNetWorth || deal.applicationSponsorNetWorth 
                                  ? formatCurrency(Number(deal.sponsorNetWorth || deal.applicationSponsorNetWorth))
                                  : 'N/A'
                                }
                              </div>
                              <div className="w-40 px-2 py-2 text-xs text-white border-r border-gray-500 truncate">
                                {deal.sponsorLiquidity || deal.applicationSponsorLiquidity 
                                  ? formatCurrency(Number(deal.sponsorLiquidity || deal.applicationSponsorLiquidity))
                                  : 'N/A'
                                }
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

        {/* Add New Group Button */}
        <div className="pt-6 border-t border-gray-700">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-3">🚀 Expand Your Pipeline</p>
            <button className="flex items-center space-x-2 text-gray-400 hover:text-yellow-400 transition-colors duration-300 mx-auto">
            <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">Create Custom Stage</span>
          </button>
            <p className="text-xs text-gray-500 mt-2">Customize your workflow to match your investment strategy</p>
          </div>
        </div>
      </div>
    </div>
  )
}