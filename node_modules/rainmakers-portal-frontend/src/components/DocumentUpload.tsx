import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { documentsAPI } from '../services/api';
import { Upload, File, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface DocumentUploadProps {
  dealId: string;
  onUploadSuccess?: () => void;
}

export function DocumentUpload({ dealId, onUploadSuccess }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch documents for this deal
  const { data: documents, isLoading } = useQuery(
    ['deal-documents', dealId],
    () => documentsAPI.getDealDocuments(dealId),
    {
      enabled: !!dealId,
      onError: (error) => {
        console.error('Failed to fetch documents:', error);
      }
    }
  );

  // Upload mutation
  const uploadMutation = useMutation(
    ({ file, tags }: { file: File; tags: string[] }) =>
      documentsAPI.uploadDocument(dealId, file, tags),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['deal-documents', dealId]);
        toast.success('Document uploaded successfully');
        onUploadSuccess?.();
      },
      onError: (error: any) => {
        console.error('Upload error:', error);
        toast.error(error.response?.data?.error || 'Failed to upload document');
      }
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(documentsAPI.deleteDocument, {
    onSuccess: () => {
      queryClient.invalidateQueries(['deal-documents', dealId]);
      toast.success('Document deleted successfully');
    },
    onError: (error: any) => {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.error || 'Failed to delete document');
    }
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
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
      'application/zip'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('File type not supported. Please upload PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, or ZIP files.');
      return;
    }

    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync({ file, tags: [] });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (documentId: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      await deleteMutation.mutateAsync(documentId);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return '📄';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('zip')) return '📦';
    return '📄';
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
          disabled={isUploading}
        />
        
          <div className="flex flex-col items-center space-y-2">
            <Upload className="w-8 h-8 text-gray-400" />
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Click to upload documents'}
              </button>
              <p className="text-sm text-gray-500 mt-1">
                PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, ZIP (max 10MB)
              </p>
            </div>
          </div>
      </div>

      {/* Documents List */}
      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading documents...</p>
        </div>
      ) : documents && documents.length > 0 ? (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Uploaded Documents</h4>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getFileIcon(doc.mimeType)}</span>
                <div>
                  <p className="font-medium text-gray-900">{doc.originalName}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(doc.fileSize)} • {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {doc.oneDriveUrl && (
                  <a
                    href={doc.oneDriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-blue-600 hover:text-blue-800"
                    title="View in OneDrive"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                )}
                
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleteMutation.isLoading}
                  type="button"
                  className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                  title="Delete document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          <File className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No documents uploaded yet</p>
        </div>
      )}
    </div>
  );
}
