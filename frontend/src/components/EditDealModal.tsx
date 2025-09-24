import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from 'react-query'
import { dealsAPI } from '../services/api'
import { Deal } from '../types'
import { useAuth } from '../hooks/useAuth'
import { DocumentUpload } from './DocumentUpload'
import { X, User, Phone, Mail, Building, MapPin, Calendar, DollarSign, FileText, Edit, Briefcase, Home, Save } from 'lucide-react'
import toast from 'react-hot-toast'

interface EditDealModalProps {
  deal: Deal
  onClose: () => void
  onSuccess: () => void
}

export function EditDealModal({ deal, onClose, onSuccess }: EditDealModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'documents'>('details')
  const { user } = useAuth()

  const { register, handleSubmit, formState: { errors } } = useForm<{
    clientFirstName: string;
    clientLastName: string;
    clientPhone: string;
    clientEmail: string;
    dealType?: string;
    propertyType?: string;
    propertyAddress: string;
    propertyVintage?: string;
    sponsorNetWorth?: string;
    sponsorLiquidity?: string;
    loanRequest?: string;
    anyAdditionalInformation?: string;
  }>({
    defaultValues: {
      clientFirstName: deal.contactName?.split(' ')[0] || '',
      clientLastName: deal.contactName?.split(' ').slice(1).join(' ') || '',
      clientPhone: deal.contactPhone || '',
      clientEmail: deal.contactEmail || '',
      dealType: deal.dealType || deal.applicationDealType || '',
      propertyType: deal.propertyType || deal.applicationPropertyType || '',
      propertyAddress: deal.propertyAddress || '',
      propertyVintage: deal.propertyVintage || deal.applicationPropertyVintage || '',
      sponsorNetWorth: deal.sponsorNetWorth || deal.applicationSponsorNetWorth || '',
      sponsorLiquidity: deal.sponsorLiquidity || deal.applicationSponsorLiquidity || '',
      loanRequest: deal.loanRequest || deal.applicationLoanRequest || '',
      anyAdditionalInformation: deal.additionalInformation || deal.applicationAdditionalInformation || ''
    }
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
    console.log('Form submitted with data:', data)
    setIsSubmitting(true)
    try {
      await updateDealMutation.mutateAsync({
        discordUsername: user?.username || '', // Map from logged-in user
        clientFirstName: data.clientFirstName,
        clientLastName: data.clientLastName,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail,
        dealType: data.dealType,
        propertyType: data.propertyType,
        propertyAddress: data.propertyAddress,
        propertyVintage: data.propertyVintage,
        sponsorNetWorth: data.sponsorNetWorth,
        sponsorLiquidity: data.sponsorLiquidity,
        loanRequest: data.loanRequest,
        anyAdditionalInformation: data.anyAdditionalInformation,
      })
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-sm transition-opacity" onClick={onClose} />

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block transform overflow-hidden rounded-xl bg-gray-800 text-left align-bottom shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:align-middle border border-gray-700">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-8 py-6 border-b border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Edit className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">✏️ Edit Deal</h3>
                  <p className="text-sm text-gray-300">Update deal information and details</p>
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      First Name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        {...register('clientFirstName', { required: 'First Name is required' })}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter first name"
                      />
                    </div>
                    {errors.clientFirstName && (
                      <p className="text-sm text-red-400 flex items-center mt-1">
                        <span className="mr-1">⚠️</span>
                        {errors.clientFirstName.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Last Name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        {...register('clientLastName', { required: 'Last Name is required' })}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter last name"
                      />
                    </div>
                    {errors.clientLastName && (
                      <p className="text-sm text-red-400 flex items-center mt-1">
                        <span className="mr-1">⚠️</span>
                        {errors.clientLastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        {...register('clientPhone', { required: 'Phone Number is required' })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    {errors.clientPhone && (
                      <p className="text-sm text-red-400 flex items-center mt-1">
                        <span className="mr-1">⚠️</span>
                        {errors.clientPhone.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        {...register('clientEmail', { required: 'Email Address is required' })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="client@example.com"
                      />
                    </div>
                    {errors.clientEmail && (
                      <p className="text-sm text-red-400 flex items-center mt-1">
                        <span className="mr-1">⚠️</span>
                        {errors.clientEmail.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Deal Information Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3 pb-2 border-b border-gray-600">
                  <Briefcase className="h-5 w-5 text-green-400" />
                  <h4 className="text-lg font-semibold text-white">Deal Information</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Deal Type</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <select
                        {...register('dealType')}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
                      >
                        <option value="">Select Deal Type</option>
                        <option value="Acquisition">Acquisition</option>
                        <option value="Refinance">Refinance</option>
                        <option value="New Construction">New Construction</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Property Type</label>
                    <div className="relative">
                      <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <select
                        {...register('propertyType')}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
                      >
                        <option value="">Select Property Type</option>
                        <option value="Multifamily">Multifamily</option>
                        <option value="Office">Office</option>
                        <option value="Retail">Retail</option>
                        <option value="Industrial">Industrial</option>
                        <option value="Hospitality">Hospitality</option>
                        <option value="Self Storage">Self Storage</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
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
                      placeholder="123 Main St, Chicago IL 60606"
                    />
                  </div>
                  {errors.propertyAddress && (
                    <p className="text-sm text-red-400 flex items-center mt-1">
                      <span className="mr-1">⚠️</span>
                      {errors.propertyAddress.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Property Vintage</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      {...register('propertyVintage')}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Year Built (e.g., 2020)"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Information Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3 pb-2 border-b border-gray-600">
                  <DollarSign className="h-5 w-5 text-yellow-400" />
                  <h4 className="text-lg font-semibold text-white">Financial Information</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Sponsor Net Worth</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        {...register('sponsorNetWorth')}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="e.g., $50M"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Sponsor Liquidity</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        {...register('sponsorLiquidity')}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="e.g., $5M"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Loan Request <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      {...register('loanRequest', { required: 'Loan Request is required' })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="e.g., $52M, 10 year term, full term I/O, Non-recourse"
                    />
                  </div>
                  {errors.loanRequest && (
                    <p className="text-sm text-red-400 flex items-center mt-1">
                      <span className="mr-1">⚠️</span>
                      {errors.loanRequest.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3 pb-2 border-b border-gray-600">
                  <FileText className="h-5 w-5 text-purple-400" />
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
    </div>
  )
}