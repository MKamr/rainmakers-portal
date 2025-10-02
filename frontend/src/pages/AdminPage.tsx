import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { adminAPI } from '../services/api'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { DealDetailsModal } from '../components/DealDetailsModal'
import { StageView } from '../components/StageView'
import { Users, FileText, Settings, BarChart3, CheckCircle, XCircle, Download, Copy, Eye, Grid3X3, List, Import, GitCompare, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { safeFormatDate } from '../utils/dateUtils'
import GHLComparison from '../components/GHLComparison'
import DiscordAutoAccess from '../components/DiscordAutoAccess'

// GHL Import Tab Component
function GHLImportTab() {
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [pipelines, setPipelines] = useState<any[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<string>('')
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch pipelines
  const fetchPipelines = async () => {
    try {
      const response = await adminAPI.getGHLPipelines()
      setPipelines(response.pipelines || [])
    } catch (error) {
      console.error('Error fetching pipelines:', error)
      toast.error('Failed to fetch pipelines')
    }
  }

  // Fetch opportunities for selected pipeline
  const fetchOpportunities = async (pipelineId?: string) => {
    if (!pipelineId && !selectedPipeline) {
      toast.error('Please select a pipeline first')
      return
    }
    
    const targetPipelineId = pipelineId || selectedPipeline
    setIsLoading(true)
    try {
      const response = await adminAPI.getGHLPipelineOpportunities(targetPipelineId)
      setOpportunities(response.opportunities || [])
    } catch (error) {
      console.error('Error fetching opportunities:', error)
      toast.error('Failed to fetch opportunities')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getUsers()
      setUsers(response)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to fetch users')
    }
  }

  // Import opportunity
  const importOpportunity = async () => {
    if (!selectedOpportunity || !selectedUserId) {
      toast.error('Please select an opportunity and a user')
      return
    }

    setIsImporting(true)
    try {
      await adminAPI.importGHLOpportunity({
        opportunityId: selectedOpportunity.id,
        userId: selectedUserId,
        opportunity: selectedOpportunity
      })
      
      toast.success('Opportunity imported successfully!')
      setSelectedOpportunity(null)
      setSelectedUserId('')
    } catch (error) {
      console.error('Error importing opportunity:', error)
      toast.error('Failed to import opportunity')
    } finally {
      setIsImporting(false)
    }
  }

  useEffect(() => {
    fetchPipelines()
    fetchUsers()
  }, [])

  // Fetch opportunities when pipeline is selected
  useEffect(() => {
    if (selectedPipeline) {
      fetchOpportunities(selectedPipeline)
    }
  }, [selectedPipeline])

  // Filter opportunities based on search term
  const filteredOpportunities = opportunities.filter(opp => 
    opp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opp.contact?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opp.contact?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opp.pipelineName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 shadow rounded-lg border border-gray-700">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-white mb-4">
            Import GHL Opportunities
          </h3>
          
          {/* Pipeline Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Pipeline
            </label>
            <select
              value={selectedPipeline}
              onChange={(e) => setSelectedPipeline(e.target.value)}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">Select a pipeline...</option>
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name} ({pipeline.stages?.length || 0} stages)
                </option>
              ))}
            </select>
          </div>
          
          {/* Search and Refresh */}
          <div className="flex space-x-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search opportunities by name, contact name, email, or pipeline..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <button
              onClick={() => fetchOpportunities()}
              disabled={isLoading || !selectedPipeline}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {/* Opportunities List */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-300">
              Opportunities ({filteredOpportunities.length})
              {selectedPipeline && (
                <span className="text-sm text-gray-400 ml-2">
                  from {pipelines.find(p => p.id === selectedPipeline)?.name || 'Selected Pipeline'}
                </span>
              )}
            </h4>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : !selectedPipeline ? (
              <div className="text-center py-8 text-gray-400">
                Please select a pipeline to view opportunities
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredOpportunities.map((opportunity) => (
                  <div
                    key={opportunity.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedOpportunity?.id === opportunity.id
                        ? 'border-yellow-500 bg-yellow-900/20'
                        : 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                    }`}
                    onClick={() => setSelectedOpportunity(opportunity)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="font-medium text-white">{opportunity.name}</h5>
                        <p className="text-sm text-gray-400">
                          Contact: {opportunity.contact?.name || 'N/A'} ({opportunity.contact?.email || 'N/A'})
                        </p>
                        <p className="text-sm text-gray-400">
                          Value: ${opportunity.monetaryValue || 0} | Status: {opportunity.status || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-400">
                          Pipeline: {opportunity.pipelineName || 'N/A'}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">
                        {opportunity.createdAt ? new Date(opportunity.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Import Section */}
          {selectedOpportunity && (
            <div className="mt-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
              <h4 className="text-md font-medium text-white mb-4">Import Selected Opportunity</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Selected Opportunity
                  </label>
                  <div className="p-3 bg-gray-600 rounded-md">
                    <p className="text-white font-medium">{selectedOpportunity.name}</p>
                    <p className="text-sm text-gray-400">
                      Contact: {selectedOpportunity.contact?.name} ({selectedOpportunity.contact?.email})
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Assign to User
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="">Select a user...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username} ({user.email}) {user.isAdmin ? '[Admin]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={importOpportunity}
                  disabled={!selectedUserId || isImporting}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? 'Importing...' : 'Import Opportunity'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview')
  
  // Handle OneDrive callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const onedriveSuccess = urlParams.get('onedrive_success')
    const onedriveError = urlParams.get('onedrive_error')
    const userEmail = urlParams.get('user_email')
    
    if (onedriveSuccess === 'true') {
      toast.success(`OneDrive connected successfully! Connected as: ${userEmail || 'Unknown user'}`)
      // Refresh OneDrive status
      refetchOneDriveStatus()
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (onedriveError) {
      toast.error(`OneDrive connection failed: ${onedriveError}`)
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const queryClient = useQueryClient()
  
  // Deal details modal state
  const [selectedDeal, setSelectedDeal] = useState<any>(null)
  const [dealsViewMode, setDealsViewMode] = useState<'list' | 'stages'>('list')
  
  // GHL Configuration states
  const [ghlConfig, setGhlConfig] = useState({
    apiKey: '',
    v2Token: '',
    pipelineId: '',
    calendarId: '',
    locationId: '',
    assignedUserId: '',
    underReviewStageId: '',
    inUnderwritingStageId: '',
    loeSentStageId: '',
    closedStageId: '',
    signedProposalStageId: '',
    noShowStageId: ''
  })

  // Available pipelines and stages from GHL
  const [availablePipelines, setAvailablePipelines] = useState<any[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<any>(null)

  // Filter states
  const [dealFilters, setDealFilters] = useState({
    userId: '',
    startDate: '',
    endDate: '',
    status: '',
    propertyType: ''
  })

  // GHL Webhook URL state
  const [webhookDomain, setWebhookDomain] = useState('')
  const [generatedWebhookUrl, setGeneratedWebhookUrl] = useState('')

  const { data: analytics, isLoading: analyticsLoading } = useQuery('admin-analytics', adminAPI.getAnalytics)
  const { data: users, isLoading: usersLoading } = useQuery('admin-users', adminAPI.getUsers)
  const { data: deals, isLoading: dealsLoading } = useQuery(['admin-deals', dealFilters], () => adminAPI.getAllDeals(dealFilters))
  const { data: oneDriveStatus, refetch: refetchOneDriveStatus } = useQuery('onedrive-status', adminAPI.getOneDriveStatus)
  const { data: ghlStatus } = useQuery('ghl-status', adminAPI.testGHL)

  // Load GHL pipelines when API key is available
  const fetchPipelines = async (apiKey?: string) => {
    const keyToUse = apiKey || ghlConfig.apiKey
    if (!keyToUse.trim()) return
    
    try {
      console.log('Fetching pipelines with API key:', keyToUse.substring(0, 10) + '...')
      const response = await adminAPI.getGHLPipelinesWithKey(keyToUse)
      console.log('Pipelines response:', response)
      setAvailablePipelines(response.pipelines || [])
      toast.success(`Loaded ${response.pipelines?.length || 0} pipelines`)
    } catch (error) {
      console.error('Failed to fetch GHL pipelines:', error)
      toast.error('Failed to fetch GHL pipelines. Please check your API key.')
    }
  }

  // Load existing GHL configuration
  useEffect(() => {
    const loadGHLConfig = async () => {
      try {
        const config = await adminAPI.getGHLConfig()
        console.log('Loaded GHL config:', config)
        
        if (config.apiKey) {
          setGhlConfig(prev => ({
            ...prev,
            apiKey: config.apiKey || '',
            pipelineId: config.pipelineId || '',
            calendarId: config.calendarId || '',
            underReviewStageId: config.underReviewStageId || '',
            inUnderwritingStageId: config.inUnderwritingStageId || '',
            loeSentStageId: config.loeSentStageId || '',
            closedStageId: config.closedStageId || '',
            noShowStageId: config.noShowStageId || ''
          }))
          
          // If we have an API key, fetch pipelines
          if (config.apiKey) {
            fetchPipelines(config.apiKey)
          }
        }
      } catch (error) {
        console.error('Failed to load GHL config:', error)
      }
    }
    
    loadGHLConfig()
  }, [])

  // Auto-select pipeline when pipelines are loaded and we have a configured pipeline ID
  useEffect(() => {
    if (availablePipelines.length > 0 && ghlConfig.pipelineId) {
      const pipeline = availablePipelines.find(p => p.id === ghlConfig.pipelineId)
      if (pipeline) {
        setSelectedPipeline(pipeline)
      }
    }
  }, [availablePipelines, ghlConfig.pipelineId])

  // Fetch pipelines when API key changes
  useEffect(() => {
    if (ghlConfig.apiKey.trim()) {
      fetchPipelines()
    }
  }, [ghlConfig.apiKey])

  const updateUserMutation = useMutation(
    ({ id, data }: { id: string; data: { isWhitelisted?: boolean; isAdmin?: boolean } }) => 
      adminAPI.updateUser(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-users')
        toast.success('User updated successfully')
      },
      onError: () => {
        toast.error('Failed to update user')
      }
    }
  )

  const saveGHLConfigMutation = useMutation(adminAPI.saveGHLConfig, {
    onSuccess: () => {
      queryClient.invalidateQueries('ghl-status')
      toast.success('GHL configuration saved successfully')
    },
    onError: () => {
      toast.error('Failed to save GHL configuration')
    }
  })


  const fetchCustomFieldsMutation = useMutation(adminAPI.fetchGHLCustomFields, {
    onSuccess: (data) => {
      toast.success(`Custom fields fetched successfully! Found ${data.summary.totalFields} total fields.`)
      console.log('Custom fields data:', data)
    },
    onError: (error: any) => {
      console.error('Custom fields fetch failed:', error)
      toast.error(`Failed to fetch custom fields: ${error?.response?.data?.error || (error instanceof Error ? error.message : 'Unknown error')}`)
    }
  })

  // Export functions
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          if (value === null || value === undefined) return ''
          if (typeof value === 'object') return JSON.stringify(value)
          return `"${String(value).replace(/"/g, '""')}"`
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}_${safeFormatDate(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`${filename} exported successfully`)
  }

  const exportDeals = () => exportToCSV(deals || [], 'deals')
  const exportUsers = () => exportToCSV(users || [], 'users')

  // GHL Webhook URL functions
  const generateWebhookUrl = () => {
    if (!webhookDomain.trim()) {
      toast.error('Please enter a domain')
      return
    }
    
    // Clean the domain input
    let cleanDomain = webhookDomain.trim()
    if (!cleanDomain.startsWith('http://') && !cleanDomain.startsWith('https://')) {
      cleanDomain = `https://${cleanDomain}`
    }
    
    // Remove trailing slash
    cleanDomain = cleanDomain.replace(/\/$/, '')
    
    const webhookUrl = `${cleanDomain}/api/webhooks/ghl`
    setGeneratedWebhookUrl(webhookUrl)
    toast.success('Webhook URL generated successfully!')
  }

  const copyWebhookUrl = async () => {
    if (!generatedWebhookUrl) {
      toast.error('No webhook URL to copy')
      return
    }
    
    try {
      await navigator.clipboard.writeText(generatedWebhookUrl)
      toast.success('Webhook URL copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy:', error)
      toast.error('Failed to copy URL to clipboard')
    }
  }

  const handleUpdateUser = async (userId: string, updates: { isWhitelisted?: boolean; isAdmin?: boolean }) => {
    await updateUserMutation.mutateAsync({ id: userId, data: updates })
  }

  const handleGHLConfigChange = (field: string, value: string) => {
    setGhlConfig(prev => ({ ...prev, [field]: value }))
  }

  const handlePipelineSelect = (pipelineId: string) => {
    const pipeline = availablePipelines.find(p => p.id === pipelineId)
    setSelectedPipeline(pipeline)
    setGhlConfig(prev => ({ ...prev, pipelineId }))
    
    // Clear stage selections when pipeline changes
    setGhlConfig(prev => ({
      ...prev,
      underReviewStageId: '',
      inUnderwritingStageId: '',
      loeSentStageId: '',
      closedStageId: '',
      signedProposalStageId: '',
      noShowStageId: ''
    }))
  }

  const handleStageSelect = (stageField: string, stageId: string) => {
    setGhlConfig(prev => ({ ...prev, [stageField]: stageId }))
  }

  const handleSaveGHLConfig = async () => {
    if (!ghlConfig.apiKey.trim()) {
      toast.error('API Key is required')
      return
    }
    
    await saveGHLConfigMutation.mutateAsync(ghlConfig)
  }

  const handleOneDriveConnect = async () => {
    try {
      console.log('🔑 [FRONTEND] Starting OneDrive connection (Web app flow)...');
      
      // Build authorization URL for Web app flow (no PKCE needed)
      const clientId = (import.meta as any).env.VITE_MICROSOFT_CLIENT_ID
      const redirectUri = encodeURIComponent('https://rainmakers-portal-backend.vercel.app/auth/onedrive/callback')
      const scope = encodeURIComponent('https://graph.microsoft.com/Files.ReadWrite.All offline_access User.Read')
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}&state=onedrive_auth`
      
      console.log('🔑 [FRONTEND] Redirecting to Microsoft OAuth (Web app flow)...');
      console.log('🔑 [FRONTEND] Auth URL:', authUrl);
      
      // Redirect to Microsoft OAuth
      window.location.href = authUrl;
    } catch (error) {
      console.error('❌ [FRONTEND] OneDrive connection failed:', error);
      toast.error('Failed to connect OneDrive. Please try again.');
    }
  }


  const handleFetchCustomFields = async () => {
    await fetchCustomFieldsMutation.mutateAsync()
  }

  const handleDealFilterChange = (field: string, value: string) => {
    setDealFilters(prev => ({ ...prev, [field]: value }))
  }

  const clearDealFilters = () => {
    setDealFilters({
      userId: '',
      startDate: '',
      endDate: '',
      status: '',
      propertyType: ''
    })
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'users', name: 'Users', icon: Users },
    { id: 'deals', name: 'Deals', icon: FileText },
    { id: 'ghl-import', name: 'GHL Import', icon: Import },
    { id: 'ghl-compare', name: 'GHL Compare', icon: GitCompare },
    { id: 'discord-auto-access', name: 'Discord Auto-Access', icon: Shield },
    { id: 'settings', name: 'Settings', icon: Settings },
  ]

  const isLoading = analyticsLoading || usersLoading || dealsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6 matrix-admin-container">
      {/* Matrix Background Effect */}
      <div className="matrix-bg-overlay"></div>
      
      {/* Header */}
      <div className="flex justify-between items-start matrix-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white matrix-title">
            <span className="matrix-text-glow">ADMIN DASHBOARD</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 matrix-subtitle">
            &gt; MANAGE USERS, VIEW ANALYTICS, AND CONFIGURE INTEGRATIONS
          </p>
        </div>
        <div className="flex space-x-3 matrix-export-buttons">
          <button
            onClick={exportDeals}
            className="matrix-button matrix-export-btn bg-gray-800 dark:bg-gray-800 text-yellow-400 dark:text-yellow-300 border-2 border-yellow-400 dark:border-yellow-300 px-4 py-2 rounded-md font-semibold hover:bg-gray-700 dark:hover:bg-gray-700 transition-all duration-300 shadow-lg hover:shadow-yellow-400/25"
            disabled={!deals || deals.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            EXPORT DEALS
          </button>
          <button
            onClick={exportUsers}
            className="matrix-button matrix-export-btn bg-gray-800 dark:bg-gray-800 text-yellow-400 dark:text-yellow-300 border-2 border-yellow-400 dark:border-yellow-300 px-4 py-2 rounded-md font-semibold hover:bg-gray-700 dark:hover:bg-gray-700 transition-all duration-300 shadow-lg hover:shadow-yellow-400/25"
            disabled={!users || users.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            EXPORT USERS
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 matrix-tabs">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm matrix-tab ${
                activeTab === tab.id
                  ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <tab.icon className="h-4 w-4 inline mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Enhanced Stats */}
          <div className="grid grid-cols-1 gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-700">
              <div className="p-3 sm:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-300 truncate">Total Users</dt>
                      <dd className="text-base sm:text-lg font-medium text-white">{analytics?.users.total || 0}</dd>
                      <dd className="text-xs sm:text-sm text-gray-400">
                        {analytics?.users.active || 0} active • {analytics?.users.admins || 0} admins
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FileText className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-300 truncate">Total Deals</dt>
                      <dd className="text-lg font-medium text-white">{analytics?.deals.total || 0}</dd>
                      <dd className="text-sm text-gray-400">
                        ${analytics?.deals.totalValue?.toLocaleString() || 0} total value
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BarChart3 className="h-6 w-6 text-orange-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-300 truncate">Activity</dt>
                      <dd className="text-lg font-medium text-white">{analytics?.overview.totalActivity || 0}</dd>
                      <dd className="text-sm text-gray-400">
                        {analytics?.overview.recentActivity || 0} recent
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Overview */}
          <div className="grid grid-cols-1 gap-3 sm:gap-5 lg:grid-cols-2">
            <div className="bg-gray-800 shadow rounded-lg border border-gray-700">
              <div className="px-3 py-4 sm:px-4 sm:py-5 sm:p-6">
                <h3 className="text-base sm:text-lg leading-6 font-medium text-white mb-3 sm:mb-4">
                  Deal Status Breakdown
                </h3>
                <div className="space-y-2">
                  {analytics?.deals.byStatus && Object.entries(analytics.deals.byStatus).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span className="text-sm text-gray-300 capitalize">{status}</span>
                      <span className="text-sm font-medium text-white">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-800 shadow rounded-lg border border-gray-700">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-white mb-4">
                  Top Performing Users
                </h3>
                <div className="space-y-2">
                  {analytics?.performance.topUsers?.slice(0, 5).map((user: any, index: number) => (
                    <div key={user.id} className="flex justify-between items-center">
                      <div>
                        <span className="text-sm font-medium text-white">{user.name}</span>
                        <span className="text-xs text-gray-400 ml-2">({user.dealsCount} deals)</span>
                      </div>
                      <span className="text-sm text-gray-400">#{index + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Integration Status */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="bg-gray-800 shadow rounded-lg border border-gray-700">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-white mb-4">
                  📁 OneDrive Document Storage
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    {oneDriveStatus?.connected ? (
                      <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400 mr-2" />
                    )}
                    <span className={`text-sm font-medium ${
                      oneDriveStatus?.connected ? 'text-green-300' : 'text-red-300'
                    }`}>
                      {oneDriveStatus?.connected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                  
                  {oneDriveStatus?.connected && (
                    <div className="text-xs text-gray-300 space-y-1">
                      <div>✅ All documents stored in admin OneDrive</div>
                      <div>✅ Automatic sync to GHL contacts</div>
                      <div>✅ Admin-only access control</div>
                      {oneDriveStatus.expired && (
                        <div className="text-orange-400">⚠️ Token expired - reconnection needed</div>
                      )}
                    </div>
                  )}
                  
                  {!oneDriveStatus?.connected && (
                    <div className="text-xs text-gray-300 space-y-1">
                      <div>❌ Documents cannot be uploaded</div>
                      <div>❌ No GHL document sync</div>
                      <div>❌ Admin access required</div>
                    </div>
                  )}
                </div>
                
                {!oneDriveStatus?.connected && (
                  <button
                    onClick={handleOneDriveConnect}
                    className="mt-3 px-4 py-2 bg-blue-600 border border-blue-500 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                  >
                    Connect OneDrive
                  </button>
                )}
              </div>
            </div>

            <div className="bg-gray-800 shadow rounded-lg border border-gray-700">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-white mb-4">
                  GoHighLevel Integration
                </h3>
                <div className="flex items-center">
                  {ghlStatus?.connected ? (
                    <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400 mr-2" />
                  )}
                  <span className={`text-sm font-medium ${
                    ghlStatus?.connected ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {ghlStatus?.connected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-700">
          <ul className="divide-y divide-gray-700">
            {users?.map((user) => (
              <li key={user.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {user.avatar ? (
                          <img className="h-10 w-10 rounded-full" src={user.avatar} alt={user.username} />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">{user.username}</div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={user.isWhitelisted}
                            onChange={(e) => handleUpdateUser(user.id, { isWhitelisted: e.target.checked })}
                            className="rounded border-gray-600 bg-gray-700 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-300">Whitelisted</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={user.isAdmin}
                            onChange={(e) => handleUpdateUser(user.id, { isAdmin: e.target.checked })}
                            className="rounded border-gray-600 bg-gray-700 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-300">Admin</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'deals' && (
        <div className="space-y-4">
          {/* View Toggle and Filters Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setDealsViewMode('list')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  dealsViewMode === 'list' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <List className="h-4 w-4 mr-2" />
                List View
              </button>
              <button
                onClick={() => setDealsViewMode('stages')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  dealsViewMode === 'stages' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Stage View
              </button>
            </div>
            <div className="text-sm text-gray-300">
              Showing {deals?.length || 0} deals
            </div>
          </div>

          {/* Deals Filters */}
          <div className="bg-gray-800 shadow rounded-lg p-4 sm:p-6 border border-gray-700">
            <h3 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">Filter Deals</h3>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">User</label>
                <select
                  className="w-full px-2 py-2 sm:px-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={dealFilters.userId}
                  onChange={(e) => handleDealFilterChange('userId', e.target.value)}
                >
                  <option value="">All Users</option>
                  {users?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={dealFilters.status}
                  onChange={(e) => handleDealFilterChange('status', e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                  <option value="Under Review">Under Review</option>
                  <option value="In Underwriting">In Underwriting</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Property Type</label>
                <select
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={dealFilters.propertyType}
                  onChange={(e) => handleDealFilterChange('propertyType', e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Office">Office</option>
                  <option value="Industrial">Industrial</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={dealFilters.startDate}
                  onChange={(e) => handleDealFilterChange('startDate', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={dealFilters.endDate}
                  onChange={(e) => handleDealFilterChange('endDate', e.target.value)}
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-between">
              <button
                onClick={clearDealFilters}
                className="px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Deals Content */}
          {dealsViewMode === 'list' ? (
            /* Deals List View */
            <div className="bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-700">
              <ul className="divide-y divide-gray-700">
                {deals?.map((deal) => (
                  <li key={deal.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-blue-400 truncate">
                              {deal.dealId}
                            </p>
                            <div className="flex space-x-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                deal.status === 'Under Review' ? 'bg-yellow-900 text-yellow-200' :
                                deal.status === 'In Underwriting' ? 'bg-blue-900 text-blue-200' :
                                deal.status === 'LOE Sent' ? 'bg-purple-900 text-purple-200' :
                                deal.status === 'Closed' ? 'bg-green-900 text-green-200' :
                                'bg-gray-700 text-gray-300'
                              }`}>
                                {deal.status}
                              </span>
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-indigo-900 text-indigo-200">
                                {deal.stage || 'Qualification'}
                              </span>
                            </div>
                          </div>
                          <div className="mt-1">
                            <p className="text-lg font-medium text-white truncate">
                              {deal.propertyName}
                            </p>
                            <p className="text-sm text-gray-400 truncate">
                              {deal.propertyAddress}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-sm text-gray-400">
                            <span>
                              {safeFormatDate(deal.createdAt, 'MMM d, yyyy')}
                            </span>
                            <span className="text-xs bg-gray-700 px-2 py-1 rounded-full text-gray-300">
                              Created by: {users?.find(u => u.id === deal.userId)?.name || users?.find(u => u.id === deal.userId)?.email || 'Unknown User'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <button
                            onClick={() => setSelectedDeal(deal)}
                            className="inline-flex items-center px-3 py-2 border border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            /* Stage View */
            <div className="bg-gray-800 shadow rounded-lg border border-gray-700">
              <StageView deals={deals || []} isLoading={dealsLoading} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'ghl-import' && (
        <GHLImportTab />
      )}

      {activeTab === 'ghl-compare' && (
        <GHLComparison />
      )}

      {activeTab === 'discord-auto-access' && (
        <DiscordAutoAccess />
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-gray-800 shadow rounded-lg border border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-white mb-4">
                Integration Settings
              </h3>
              <p className="text-sm text-gray-300 mb-4">
                Configure your integrations with GoHighLevel and Microsoft OneDrive.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    GoHighLevel API Key *
                  </label>
                  <input
                    type="password"
                    className="w-full max-w-md px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your GHL API key"
                    value={ghlConfig.apiKey}
                    onChange={(e) => handleGHLConfigChange('apiKey', e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {ghlConfig.apiKey ? '✅ Configuration loaded from Firebase' : 'Enter your API key to load available pipelines and stages'}
                  </p>
                  <button
                    type="button"
                    className="mt-2 px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                    onClick={() => fetchPipelines()}
                    disabled={!ghlConfig.apiKey.trim()}
                  >
                    Load Pipelines
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    GHL v2 Private Integration Token (Optional)
                  </label>
                  <input
                    type="password"
                    className="w-full max-w-md px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your GHL v2 private integration token"
                    value={ghlConfig.v2Token}
                    onChange={(e) => handleGHLConfigChange('v2Token', e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Required for v2 API endpoints (appointments). Leave empty to use v1 API key as fallback.
                  </p>
                </div>

                {availablePipelines.length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select Pipeline
                    </label>
                    <select
                      className="w-full max-w-md px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={ghlConfig.pipelineId}
                      onChange={(e) => handlePipelineSelect(e.target.value)}
                    >
                      <option value="">Choose a pipeline...</option>
                      {availablePipelines.map((pipeline) => (
                        <option key={pipeline.id} value={pipeline.id}>
                          {pipeline.name} ({pipeline.stages?.length || 0} stages)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : ghlConfig.apiKey.trim() ? (
                  <div className="text-sm text-gray-400">
                    No pipelines found. Click "Load Pipelines" to fetch from GHL.
                  </div>
                ) : null}

                {/* Location ID */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    GHL Location ID
                  </label>
                  <input
                    type="text"
                    className="w-full max-w-md px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your GHL location ID (e.g., 3rBmt1RsDH7fRyHrmAsN)"
                    value={ghlConfig.locationId}
                    onChange={(e) => handleGHLConfigChange('locationId', e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Required for appointment creation. You can find this in your GHL account settings.
                  </p>
                </div>

                {/* Assigned User ID */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    GHL Assigned User ID
                  </label>
                  <input
                    type="text"
                    className="w-full max-w-md px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="DjCMFUCmWHJ1NE3ZP4HL"
                    value={ghlConfig.assignedUserId}
                    onChange={(e) => handleGHLConfigChange('assignedUserId', e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    User ID who will be assigned to appointments. Defaults to DjCMFUCmWHJ1NE3ZP4HL if not set.
                  </p>
                </div>

                {selectedPipeline && (
                  <div className="bg-blue-900/20 border border-blue-700 p-4 rounded-lg mb-4">
                    <h4 className="font-medium text-blue-300 mb-2">Pipeline: {selectedPipeline.name}</h4>
                    <p className="text-sm text-blue-200 mb-3">Map your GHL pipeline stages to deal workflow stages:</p>
                    <div className="text-xs text-blue-300 space-y-1">
                      <div><strong>Pipeline ID:</strong> {selectedPipeline.id}</div>
                      <div><strong>Location ID:</strong> {selectedPipeline.locationId}</div>
                      <div><strong>Available Stages:</strong> {selectedPipeline.stages?.length || 0}</div>
                    </div>
                  </div>
                )}

                {selectedPipeline?.stages && selectedPipeline.stages.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Initial Qualification Stage
                      </label>
                      <select
                        className="w-full max-w-md px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={ghlConfig.underReviewStageId}
                        onChange={(e) => handleStageSelect('underReviewStageId', e.target.value)}
                      >
                        <option value="">Select a stage...</option>
                        {selectedPipeline.stages.map((stage: any) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Needs Analysis Stage
                      </label>
                      <select
                        className="w-full max-w-md px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={ghlConfig.inUnderwritingStageId}
                        onChange={(e) => handleStageSelect('inUnderwritingStageId', e.target.value)}
                      >
                        <option value="">Select a stage...</option>
                        {selectedPipeline.stages.map((stage: any) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lender Submission Stage
                      </label>
                      <select
                        className="input max-w-md"
                        value={ghlConfig.loeSentStageId}
                        onChange={(e) => handleStageSelect('loeSentStageId', e.target.value)}
                      >
                        <option value="">Select a stage...</option>
                        {selectedPipeline.stages.map((stage: any) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Proposal Stage
                      </label>
                      <select
                        className="input max-w-md"
                        value={ghlConfig.closedStageId}
                        onChange={(e) => handleStageSelect('closedStageId', e.target.value)}
                      >
                        <option value="">Select a stage...</option>
                        {selectedPipeline.stages.map((stage: any) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Signed Proposal Stage
                      </label>
                      <select
                        className="input max-w-md"
                        value={ghlConfig.signedProposalStageId || ''}
                        onChange={(e) => handleStageSelect('signedProposalStageId', e.target.value)}
                      >
                        <option value="">Select a stage...</option>
                        {selectedPipeline.stages.map((stage: any) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Underwriting Stage
                      </label>
                      <select
                        className="input max-w-md"
                        value={ghlConfig.noShowStageId}
                        onChange={(e) => handleStageSelect('noShowStageId', e.target.value)}
                      >
                        <option value="">Select a stage...</option>
                        {selectedPipeline.stages.map((stage: any) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <button 
                  className="btn btn-primary btn-md"
                  onClick={handleSaveGHLConfig}
                  disabled={saveGHLConfigMutation.isLoading || !ghlConfig.apiKey.trim()}
                >
                  {saveGHLConfigMutation.isLoading ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>

          {/* GHL Custom Fields Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                GHL Custom Fields Management
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Fetch and analyze all custom fields from your GoHighLevel account to ensure accurate field mapping.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium text-blue-900">Fetch GHL Custom Fields</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This will fetch all contact and opportunity custom fields from GHL and save them to a JSON file for easy mapping reference.
                    </p>
                    <div className="mt-2 text-xs text-blue-600">
                      <div>• Fetches contact-level fields (&#123;&#123; contact.field_name &#125;&#125;)</div>
                      <div>• Fetches opportunity-level fields (&#123;&#123; opportunity.field_name &#125;&#125;)</div>
                      <div>• Saves to backend/ghl-custom-fields.json</div>
                      <div>• Updates field mapping with exact GHL field names</div>
                    </div>
                  </div>
                  <button
                    onClick={handleFetchCustomFields}
                    disabled={fetchCustomFieldsMutation.isLoading || !ghlConfig.apiKey.trim()}
                    className="btn btn-primary btn-sm"
                  >
                    {fetchCustomFieldsMutation.isLoading ? 'Fetching...' : 'Fetch Custom Fields'}
                  </button>
                </div>
              </div>

              {!ghlConfig.apiKey.trim() && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        GHL API Key Required
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>Please configure your GoHighLevel API key above to fetch custom fields.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* GHL Webhook URL Generator Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                🔗 GHL Webhook URL Generator
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Generate the webhook URL for your GoHighLevel account to receive deal updates and notifications.
              </p>
              
              <div className="space-y-6">
                {/* Domain Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Domain
                  </label>
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      className="input flex-1"
                      placeholder="https://yourdomain.com or yourdomain.com"
                      value={webhookDomain}
                      onChange={(e) => setWebhookDomain(e.target.value)}
                    />
                    <button
                      onClick={generateWebhookUrl}
                      disabled={!webhookDomain.trim()}
                      className="btn btn-primary btn-md"
                    >
                      Generate URL
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter your domain (with or without https://). The webhook endpoint will be automatically appended.
                  </p>
                </div>

                {/* Generated URL Display */}
                {generatedWebhookUrl && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-green-900 mb-2">Generated Webhook URL</h4>
                        <div className="bg-white border border-green-200 rounded-md p-3 font-mono text-sm text-gray-800 break-all">
                          {generatedWebhookUrl}
                        </div>
                        <p className="text-sm text-green-700 mt-2">
                          Copy this URL and configure it in your GoHighLevel webhook settings.
                        </p>
                      </div>
                      <button
                        onClick={copyWebhookUrl}
                        className="ml-4 p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-4 w-4" />
                        <span className="text-sm">Copy</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-blue-900 mb-3">📋 Setup Instructions</h4>
                  <div className="text-sm text-blue-800 space-y-2">
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">1.</span>
                      <span>Generate your webhook URL using the form above</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">2.</span>
                      <span>Copy the generated URL to your clipboard</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">3.</span>
                      <span>In GoHighLevel, go to Settings → Integrations → Webhooks</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">4.</span>
                      <span>Add a new webhook and paste the URL</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">5.</span>
                      <span>Select the events you want to receive (Contact Created, Opportunity Updated, etc.)</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">6.</span>
                      <span>Save the webhook configuration</span>
                    </div>
                  </div>
                </div>

                {/* Webhook Events Info */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-yellow-900 mb-3">⚡ Supported Webhook Events</h4>
                  <div className="text-sm text-yellow-800 space-y-1">
                    <div>• <strong>Contact Created:</strong> New contacts will be synced to your deals</div>
                    <div>• <strong>Opportunity Updated:</strong> Deal stages will be updated automatically</div>
                    <div>• <strong>Opportunity Created:</strong> New opportunities will be tracked</div>
                    <div>• <strong>Appointment Scheduled:</strong> Meeting bookings will be logged</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Deal Details Modal */}
      {selectedDeal && (
        <DealDetailsModal
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
        />
      )}
    </div>
  )
}
