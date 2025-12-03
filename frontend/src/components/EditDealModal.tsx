import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from 'react-query'
import { dealsAPI } from '../services/api'
import { Deal } from '../types'
import { DocumentUpload } from './DocumentUpload'
import { X, User, Phone, Mail, MapPin, Calendar, DollarSign, FileText, Edit, Briefcase, Save } from 'lucide-react'
import toast from 'react-hot-toast'

interface EditDealModalProps {
  deal: Deal
  onClose: () => void
  onSuccess: () => void
}

export function EditDealModal({ deal, onClose, onSuccess }: EditDealModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'documents'>('details')

  const { register, handleSubmit, formState: { errors } } = useForm<{
    clientFirstName: string;
    clientLastName: string;
    clientPhone: string;
    clientEmail: string;
    dealType?: string;
    propertyType?: string;
    propertyAddress: string;
    propertyVintage?: string;
    investmentType?: string;
    sponsorNetWorth?: string;
    sponsorLiquidity?: string;
    loanRequest?: string;
    anyAdditionalInformation?: string;
    status?: string;
  }>({
    defaultValues: (() => {
      // Split the contact name properly
      const contactName = deal.contactName?.trim() || '';
      const nameParts = contactName.split(' ').filter(part => part.length > 0);
      
      return {
        clientFirstName: nameParts[0] || '',
        clientLastName: nameParts.slice(1).join(' ') || nameParts[0] || '',
        clientPhone: deal.contactPhone || '',
        clientEmail: deal.contactEmail || '',
        dealType: deal.dealType || '',
        propertyType: deal.propertyType || '',
        propertyAddress: deal.propertyAddress || '',
        propertyVintage: deal.propertyVintage || '',
        investmentType: deal.investmentType || '',
        sponsorNetWorth: deal.sponsorNetWorth || '',
        sponsorLiquidity: deal.sponsorLiquidity || '',
        loanRequest: deal.loanRequest || '',
        anyAdditionalInformation: deal.additionalInformation || '',
        status: deal.status || 'Open',
      };
    })()
  })

  const updateDealMutation = useMutation(
    (data: any) => dealsAPI.updateDeal(deal.id, data),
    {
      onSuccess: () => {
        toast.success('Deal updated successfully')
        onSuccess()
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to update deal')
      }
    }
  )

  const onSubmit = async (data: any) => {
    console.log('🚀 Starting deal update with data:', data)
    console.log('🔍 Investment Type value:', data.investmentType)
    setIsSubmitting(true)
    try {
      await updateDealMutation.mutateAsync({
        clientFirstName: data.clientFirstName,
        clientLastName: data.clientLastName,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail,
        dealType: data.dealType,
        propertyType: data.propertyType,
        propertyAddress: data.propertyAddress,
        propertyVintage: data.propertyVintage,
        investmentType: data.investmentType,
        sponsorNetWorth: data.sponsorNetWorth,
        sponsorLiquidity: data.sponsorLiquidity,
        loanRequest: data.loanRequest,
        anyAdditionalInformation: data.anyAdditionalInformation,
        status: data.status,
      })
      console.log('✅ Deal updated successfully!')
    } catch (error) {
      console.error('❌ Deal update failed:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-2 pt-2 pb-2 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-sm transition-opacity" onClick={onClose} />

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block transform overflow-hidden rounded-xl bg-gray-800 text-left align-bottom shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:align-middle border border-gray-700 w-full max-h-[95vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-4 py-4 sm:px-8 sm:py-6 border-b border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="p-1.5 sm:p-2 bg-blue-500/20 rounded-lg">
                  <Edit className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">✏️ Edit Deal</h3>
                  <p className="text-xs sm:text-sm text-gray-300">Update deal information and details</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={onClose} 
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-all duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-600">
            <nav className="flex space-x-8 px-8">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Edit className="w-4 h-4" />
                  <span>Deal Details</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('documents')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'documents'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Documents</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'details' ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Form Content */}
              <div className="p-8 space-y-8">
                {/* Client Information Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 pb-2 border-b border-gray-600">
                    <User className="h-5 w-5 text-blue-400" />
                    <h4 className="text-lg font-semibold text-white">Client Information</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        First Name <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          {...register('clientFirstName', { required: 'First Name is required' })}
                          className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                          placeholder="Enter first name"
                        />
                        {errors.clientFirstName && (
                          <p className="text-red-400 text-sm mt-1">{errors.clientFirstName.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Last Name <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          {...register('clientLastName', { required: 'Last Name is required' })}
                          className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                          placeholder="Enter last name"
                        />
                        {errors.clientLastName && (
                          <p className="text-red-400 text-sm mt-1">{errors.clientLastName.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Phone Number <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          {...register('clientPhone', { required: 'Phone Number is required' })}
                          className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="Enter phone number"
                        />
                        {errors.clientPhone && (
                          <p className="text-red-400 text-sm mt-1">{errors.clientPhone.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Email Address <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          {...register('clientEmail', { required: 'Email Address is required' })}
                          className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="Enter email address"
                        />
                        {errors.clientEmail && (
                          <p className="text-red-400 text-sm mt-1">{errors.clientEmail.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deal Information Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 pb-2 border-b border-gray-600">
                    <Briefcase className="h-5 w-5 text-blue-400" />
                    <h4 className="text-lg font-semibold text-white">Deal Information</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">Deal Type</label>
                      <select
                        {...register('dealType')}
                        className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                      >
                        <option value="">Select deal type</option>
                        <option value="Purchase">Purchase</option>
                        <option value="Refinance">Refinance</option>
                        <option value="Construction">Construction</option>
                        <option value="Bridge">Bridge</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">Property Type</label>
                      <select
                        {...register('propertyType')}
                        className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                      >
                        <option value="">Select property type</option>
                        <option value="Multifamily">Multifamily</option>
                        <option value="Office">Office</option>
                        <option value="Retail">Retail</option>
                        <option value="Industrial">Industrial</option>
                        <option value="Hospitality">Hospitality</option>
                        <option value="Mixed-Use">Mixed-Use</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Property Address <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          {...register('propertyAddress', { required: 'Property Address is required' })}
                          className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="Enter property address"
                        />
                        {errors.propertyAddress && (
                          <p className="text-red-400 text-sm mt-1">{errors.propertyAddress.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">Property Vintage</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          {...register('propertyVintage')}
                          className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="e.g., 2020"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">Investment Type</label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                          {...register('investmentType')}
                          className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
                        >
                          <option value="">Select Investment Type</option>
                          <option value="Permanent Debt">Permanent Debt</option>
                          <option value="Bridge Debt">Bridge Debt</option>
                          <option value="New Construction Debt">New Construction Debt</option>
                          <option value="Mezzanine Debt">Mezzanine Debt</option>
                          <option value="Preferred Equity">Preferred Equity</option>
                          <option value="Joint Venture Equity">Joint Venture Equity</option>
                          <option value="General Partner Equity">General Partner Equity</option>
                          <option value="Limited Partner Equity">Limited Partner Equity</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">Status</label>
                      <select
                        {...register('status')}
                        className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                      >
                        <option value="Open">Open</option>
                        <option value="Won">Won</option>
                        <option value="Lost">Lost</option>
                        <option value="Abandon">Abandon</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Financial Information Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 pb-2 border-b border-gray-600">
                    <DollarSign className="h-5 w-5 text-blue-400" />
                    <h4 className="text-lg font-semibold text-white">Financial Information</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">Sponsor Net Worth</label>
                      <input
                        {...register('sponsorNetWorth')}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="e.g., $50M"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">Sponsor Liquidity</label>
                      <input
                        {...register('sponsorLiquidity')}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="e.g., $10M"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">Loan Request</label>
                      <input
                        {...register('loanRequest')}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="e.g., $25M"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Information Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 pb-2 border-b border-gray-600">
                    <FileText className="h-5 w-5 text-blue-400" />
                    <h4 className="text-lg font-semibold text-white">Additional Information</h4>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Additional Details</label>
                    <textarea
                      rows={4}
                      {...register('anyAdditionalInformation')}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                      placeholder="Any additional information about the deal, requirements, or special considerations..."
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-700 px-8 py-6 border-t border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    <span className="text-red-400">*</span> Required fields
                  </div>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-3 text-sm font-medium text-gray-300 bg-gray-600 border border-gray-500 rounded-lg hover:bg-gray-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 border border-transparent rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="p-8">
              <DocumentUpload dealId={deal.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}