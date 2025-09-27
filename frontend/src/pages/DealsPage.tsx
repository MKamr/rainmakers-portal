import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { dealsAPI, adminAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { CreateDealModal } from '../components/CreateDealModal'
import { EditDealModal } from '../components/EditDealModal'
import { DealDetailsModal } from '../components/DealDetailsModal'
import { StageView } from '../components/StageView'
import { Plus, Eye, Edit, Trash2, FileText } from 'lucide-react'
import { safeFormatDate } from '../utils/dateUtils'
import toast from 'react-hot-toast'

export function DealsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingDeal, setEditingDeal] = useState<any>(null)
  const [viewingDeal, setViewingDeal] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'list' | 'pipeline'>('list')
  const queryClient = useQueryClient()
  const { user } = useAuth()

  // Use different API based on user role
  const { data: deals, isLoading, error } = useQuery(
    ['deals', user?.isAdmin], 
    () => user?.isAdmin ? adminAPI.getAllDeals({}) : dealsAPI.getDeals,
    {
      onSuccess: (data) => {
        console.log('📋 [DEALS PAGE] Deals loaded successfully:', data);
      },
      onError: (error) => {
        console.error('❌ [DEALS PAGE] Failed to load deals:', error);
      }
    }
  )

  const deleteDealMutation = useMutation(dealsAPI.deleteDeal, {
    onSuccess: () => {
      queryClient.invalidateQueries(['deals', user?.isAdmin])
      toast.success('Deal deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete deal')
    }
  })

  const handleDeleteDeal = async (dealId: string) => {
    if (window.confirm('Are you sure you want to delete this deal?')) {
      await deleteDealMutation.mutateAsync(dealId)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    console.error('❌ [DEALS PAGE] Error state:', error);
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Failed to load deals</h2>
          <p className="text-gray-600 mb-4">Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  console.log('📋 [DEALS PAGE] Render state:', { 
    deals: deals, 
    dealsLength: deals?.length, 
    isLoading, 
    error,
    user: user?.id 
  });

  return (
    <div className="space-y-6 matrix-deals-container">
      {/* Matrix Background Effect */}
      <div className="matrix-bg-overlay"></div>
      
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between matrix-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white matrix-title">
            <span className="matrix-text-glow">DEALS</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 matrix-subtitle">
            {user?.isAdmin 
              ? 'VIEW AND MANAGE ALL REAL ESTATE DEALS ACROSS THE PLATFORM'
              : 'MANAGE YOUR REAL ESTATE DEALS AND TRACK THEIR PROGRESS'
            }
          </p>
        </div>
        {!user?.isAdmin && (
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="group relative inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold text-sm uppercase tracking-wider rounded-lg shadow-2xl hover:shadow-yellow-500/50 transform hover:scale-105 transition-all duration-300 ease-out border-2 border-yellow-400 hover:border-yellow-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <Plus className="h-5 w-5 mr-3 group-hover:rotate-90 transition-transform duration-300" />
              <span className="relative z-10">NEW DEAL</span>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 matrix-nav">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-2 px-1 border-b-2 font-medium text-sm matrix-tab ${
              activeTab === 'list'
                ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Deal List
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`py-2 px-1 border-b-2 font-medium text-sm matrix-tab ${
              activeTab === 'pipeline'
                ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Deal Pipeline
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'list' ? (
        /* Deals Table */
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md matrix-table">
        {deals?.length === 0 ? (
          <div className="text-center py-12 matrix-empty-state">
            <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 matrix-icon" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white matrix-empty-title font-mono tracking-wider">NO DEALS FOUND</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 matrix-empty-subtitle font-mono">
              &gt; INITIALIZE DEAL CREATION PROTOCOL
            </p>
            {!user?.isAdmin && (
              <div className="mt-8">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="group relative inline-flex items-center justify-center px-10 py-5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold text-base uppercase tracking-wider rounded-xl shadow-2xl hover:shadow-yellow-500/60 transform hover:scale-110 transition-all duration-300 ease-out border-2 border-yellow-400 hover:border-yellow-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl opacity-0 group-hover:opacity-25 transition-opacity duration-300"></div>
                  <Plus className="h-6 w-6 mr-4 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="relative z-10">LAUNCH YOUR FIRST DEAL</span>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700 matrix-deals-list">
            {deals?.map((deal) => (
              <li key={deal.id} className="matrix-deal-item">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-yellow-500 dark:text-yellow-400 truncate matrix-deal-id font-mono tracking-wider">
                          {deal.dealId}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex space-x-2">
                          <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full matrix-status bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-yellow-400 dark:border-yellow-300">
                            {deal.status?.toUpperCase() || 'OPEN'}
                          </span>
                          <span 
                            className="inline-flex px-3 py-1 text-xs font-medium rounded-full matrix-stage bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-400 dark:border-yellow-300 relative"
                            title={deal.stageLastUpdated ? `Stage last updated: ${safeFormatDate(deal.stageLastUpdated, 'MMM d, yyyy h:mm a')}` : 'Stage not updated via GHL'}
                          >
                            {(deal.stage || 'QUALIFICATION').toUpperCase()}
                            {deal.stageLastUpdated && (
                              <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full matrix-update-indicator" title="Recently updated from GHL"></span>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1">
                        <p className="text-lg font-medium text-gray-900 dark:text-white truncate matrix-property-name font-mono tracking-wide">
                          {deal.propertyName || 'UNNAMED PROPERTY'}
                        </p>
                        <p className="text-sm text-yellow-600 dark:text-yellow-400 truncate matrix-property-address font-mono">
                          {deal.propertyAddress || 'NO ADDRESS PROVIDED'}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-yellow-500 dark:text-yellow-400 matrix-deal-date font-mono">
                        <span className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <span className="mr-1">&gt;</span>
                            CREATED: {safeFormatDate(deal.createdAt, 'MMM d, yyyy').toUpperCase()}
                          </span>
                          {deal.updatedAt && (
                            <span className="flex items-center">
                              <span className="mr-1">&gt;</span>
                              UPDATED: {safeFormatDate(deal.updatedAt, 'MMM d, yyyy').toUpperCase()}
                            </span>
                          )}
                          {user?.isAdmin && deal.createdBy && (
                            <span className="flex items-center">
                              <span className="mr-1">&gt;</span>
                              BY: {deal.createdBy.toUpperCase()}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex space-x-2 matrix-actions">
                      <button
                        onClick={() => setViewingDeal(deal)}
                        className="p-2 text-yellow-500 dark:text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-300 matrix-action-btn border border-yellow-400 dark:border-yellow-300 rounded-md hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all duration-300"
                        title="VIEW DETAILS"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingDeal(deal)}
                        className="p-2 text-yellow-500 dark:text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-300 matrix-action-btn border border-yellow-400 dark:border-yellow-300 rounded-md hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all duration-300"
                        title="EDIT DEAL"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDeal(deal.id)}
                        className="p-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 matrix-action-btn border border-red-400 dark:border-red-300 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300"
                        title="DELETE DEAL"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        </div>
      ) : (
        /* Deal Pipeline */
        <div className="matrix-content">
          <StageView deals={deals || []} />
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateDealModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            queryClient.invalidateQueries('deals')
          }}
        />
      )}

      {editingDeal && (
        <EditDealModal
          deal={editingDeal}
          onClose={() => setEditingDeal(null)}
          onSuccess={() => {
            setEditingDeal(null)
            queryClient.invalidateQueries('deals')
          }}
        />
      )}

      {viewingDeal && (
        <DealDetailsModal
          deal={viewingDeal}
          onClose={() => setViewingDeal(null)}
        />
      )}
      
    </div>
  )
}
