import { useState } from 'react'
import { useQuery } from 'react-query'
import { documentsAPI } from '../services/api'
import { Deal, Document } from '../types'
import { X, Upload, Download, Trash2, Tag, User, Phone, Mail, Building, MapPin, Calendar, DollarSign, FileText, Briefcase, Home, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { safeFormatDate } from '../utils/dateUtils'

interface DealDetailsModalProps {
  deal: Deal
  onClose: () => void
}

export function DealDetailsModal({ deal, onClose }: DealDetailsModalProps) {
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)

  const { data: documents, isLoading: documentsLoading, refetch } = useQuery<Document[]>(
    ['deal-documents', deal.id],
    () => documentsAPI.getDealDocuments(deal.id),
    {
      enabled: true // Allow all users to view documents
    }
  )

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB')
      return
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/vnd.rar',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip',
      'application/x-bzip2',
      'text/plain',
      'text/csv'
    ]

    if (!allowedTypes.includes(file.type)) {
      console.log('🔍 [DEBUG] File upload rejected:', { 
        fileName: file.name, 
        fileType: file.type, 
        fileSize: file.size,
        allowedTypes: allowedTypes 
      });
      toast.error(`File type not supported. Detected type: ${file.type}. Please upload PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, WEBP, ZIP, RAR, 7Z, TAR, GZ, BZ2, TXT, or CSV files.`)
      return
    }

    // Allow all users to upload documents

    setUploading(true)
    try {
      const response = await documentsAPI.uploadDocument(deal.id, file, [])
      if (response.message) {
        toast.success(response.message)
      } else {
        toast.success('Document uploaded successfully')
      }
      refetch()
      setShowUpload(false)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    // Allow all users to delete documents

    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await documentsAPI.deleteDocument(documentId)
        toast.success('Document deleted successfully')
        refetch()
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to delete document')
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Under Review':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      case 'In Underwriting':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      case 'LOE Sent':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/50'
      case 'Closed':
        return 'bg-green-500/20 text-green-400 border-green-500/50'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Underwriting':
        return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'Signed Proposal':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
      case 'Proposal':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50'
      case 'Lender Submission':
        return 'bg-pink-500/20 text-pink-400 border-pink-500/50'
      case 'Needs Analysis':
        return 'bg-teal-500/20 text-teal-400 border-teal-500/50'
      case 'Qualification':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-sm transition-opacity" onClick={onClose} />

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block transform overflow-hidden rounded-xl bg-gray-800 text-left align-bottom shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-5xl sm:align-middle border border-gray-700">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-8 py-6 border-b border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Eye className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">👁️ Deal Summary</h3>
                  <p className="text-sm text-gray-300">View deal details and information</p>
                </div>
              </div>
                  <button
                    onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-all duration-200"
                  >
                <X className="h-5 w-5" />
                  </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Deal Information */}
              <div className="space-y-8">
                {/* Client Information Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 pb-2 border-b border-gray-600">
                    <User className="h-5 w-5 text-blue-400" />
                    <h4 className="text-lg font-semibold text-white">Client Information</h4>
                </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">First Name</label>
                        <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                          <p className="text-white font-medium">
                            {deal.contactName?.split(' ')[0] || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">Last Name</label>
                        <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                          <p className="text-white font-medium">
                            {deal.contactName?.split(' ').slice(1).join(' ') || 'N/A'}
                          </p>
                        </div>
                      </div>
                      </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">Phone Number</label>
                        <div className="p-3 bg-gray-700 rounded-lg border border-gray-600 flex items-center space-x-3">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <p className="text-white font-medium">
                            {deal.contactPhone || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">Email Address</label>
                        <div className="p-3 bg-gray-700 rounded-lg border border-gray-600 flex items-center space-x-3">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <p className="text-white font-medium">
                            {deal.contactEmail || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                      </div>

                {/* Deal Information Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 pb-2 border-b border-gray-600">
                    <Briefcase className="h-5 w-5 text-green-400" />
                    <h4 className="text-lg font-semibold text-white">Deal Information</h4>
                          </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">Deal Type</label>
                        <div className="p-3 bg-gray-700 rounded-lg border border-gray-600 flex items-center space-x-3">
                          <Building className="h-4 w-4 text-gray-400" />
                          <p className="text-white font-medium">
                            {deal.dealType || deal.applicationDealType || 'N/A'}
                          </p>
                          </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">Property Type</label>
                        <div className="p-3 bg-gray-700 rounded-lg border border-gray-600 flex items-center space-x-3">
                          <Home className="h-4 w-4 text-gray-400" />
                          <p className="text-white font-medium">
                            {deal.propertyType || deal.applicationPropertyType || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-400">Property Address</label>
                      <div className="p-3 bg-gray-700 rounded-lg border border-gray-600 flex items-center space-x-3">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <p className="text-white font-medium">
                          {deal.propertyAddress || deal.applicationPropertyAddress || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">Property Vintage</label>
                        <div className="p-3 bg-gray-700 rounded-lg border border-gray-600 flex items-center space-x-3">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <p className="text-white font-medium">
                            {deal.propertyVintage || deal.applicationPropertyVintage || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">Investment Type</label>
                        <div className="p-3 bg-gray-700 rounded-lg border border-gray-600 flex items-center space-x-3">
                          <Briefcase className="h-4 w-4 text-gray-400" />
                          <p className="text-white font-medium">
                            {deal.investmentType || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Information Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 pb-2 border-b border-gray-600">
                    <DollarSign className="h-5 w-5 text-yellow-400" />
                    <h4 className="text-lg font-semibold text-white">Financial Information</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">Sponsor Net Worth</label>
                        <div className="p-3 bg-gray-700 rounded-lg border border-gray-600 flex items-center space-x-3">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <p className="text-white font-medium">
                            {deal.sponsorNetWorth || deal.applicationSponsorNetWorth || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">Sponsor Liquidity</label>
                        <div className="p-3 bg-gray-700 rounded-lg border border-gray-600 flex items-center space-x-3">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <p className="text-white font-medium">
                            {deal.sponsorLiquidity || deal.applicationSponsorLiquidity || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-400">Loan Request</label>
                      <div className="p-3 bg-gray-700 rounded-lg border border-gray-600 flex items-center space-x-3">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <p className="text-white font-medium">
                          {deal.loanRequest || deal.applicationLoanRequest || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information Section */}
                {(deal.additionalInformation || deal.applicationAdditionalInformation) && (
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3 pb-2 border-b border-gray-600">
                      <FileText className="h-5 w-5 text-purple-400" />
                      <h4 className="text-lg font-semibold text-white">Additional Information</h4>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-400">Additional Details</label>
                      <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                        <p className="text-white font-medium whitespace-pre-wrap">
                          {deal.additionalInformation || deal.applicationAdditionalInformation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Status & Documents */}
              <div className="space-y-8">
                {/* Status Information */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 pb-2 border-b border-gray-600">
                    <Tag className="h-5 w-5 text-orange-400" />
                    <h4 className="text-lg font-semibold text-white">Status & Timeline</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-400">Current Status</label>
                      <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(deal.status)}`}>
                          {deal.status || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-400">Current Stage</label>
                      <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getStageColor(deal.stage || 'Qualification')}`}>
                            {deal.stage || 'Qualification'}
                          </span>
                        </div>
                      </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-400">Created Date</label>
                      <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                        <p className="text-white font-medium">
                          {safeFormatDate(deal.createdAt, 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      </div>

                    {deal.dealId && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">Deal ID</label>
                        <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                          <p className="text-white font-mono text-sm">
                            {deal.dealId}
                          </p>
                        </div>
                        </div>
                      )}
                    </div>
                  </div>

                {/* Documents Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-600">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-purple-400" />
                      <h4 className="text-lg font-semibold text-white">Documents</h4>
                    </div>
                    
                    <button
                      onClick={() => setShowUpload(!showUpload)}
                      className="px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 border border-purple-500 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Upload
                    </button>
                    </div>

                    {showUpload && (
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 bg-gray-700">
                        <input
                          type="file"
                          onChange={handleFileUpload}
                          disabled={uploading}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar,.7z,.tar,.gz,.bz2,.txt,.csv"
                        className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-600 file:text-white hover:file:bg-gray-500"
                        />
                        {uploading && (
                        <p className="mt-2 text-sm text-gray-400">Uploading...</p>
                        )}
                      </div>
                    )}

                    {documentsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-600 border-t-blue-400 mx-auto"></div>
                      <p className="text-sm text-gray-400 mt-2">Loading documents...</p>
                    </div>
                    ) : documents?.length === 0 ? (
                    <div className="text-center py-8 bg-gray-700 rounded-lg border border-gray-600">
                      <FileText className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">No documents uploaded yet</p>
                      <p className="text-xs text-gray-500 mt-1">Upload documents to store them in OneDrive</p>
                      </div>
                    ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {documents?.map((document) => (
                        <div key={document.id} className="flex items-center justify-between p-3 bg-gray-700 border border-gray-600 rounded-lg">
                            <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {document.originalName}
                              </p>
                            <p className="text-xs text-gray-400">
                                {formatFileSize(document.fileSize)} • {safeFormatDate(document.createdAt, 'MMM d, yyyy')}
                              </p>
                              {document.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {document.tags.map((tag) => (
                                    <span
                                      key={tag}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-600 text-gray-300"
                                    >
                                      <Tag className="h-3 w-3 mr-1" />
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          <div className="flex items-center space-x-2 ml-3">
                              {document.oneDriveUrl && (
                                <a
                                  href={document.oneDriveUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-all duration-200"
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              )}
                              <button
                                onClick={() => handleDeleteDocument(document.id)}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-lg transition-all duration-200"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-700 px-8 py-6 border-t border-gray-600">
            <div className="flex items-center justify-end">
            <button
              onClick={onClose}
                className="px-6 py-3 text-sm font-medium text-gray-300 bg-gray-600 border border-gray-500 rounded-lg hover:bg-gray-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
            >
              Close
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}