import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { documentsAPI } from '../services/api';
import { Upload, File, Trash2, Eye, CheckSquare, Square, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface DocumentUploadProps {
  dealId: string;
  onUploadSuccess?: () => void;
}

export function DocumentUpload({ dealId, onUploadSuccess }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
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

  // Upload mutation for single file
  const uploadMutation = useMutation(
    ({ file, tags }: { file: File; tags: string[] }) =>
      documentsAPI.uploadDocument(dealId, file, tags),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['deal-documents', dealId]);
      },
      onError: (error: any) => {
        console.error('Upload error:', error);
        toast.error(error.response?.data?.error || 'Failed to upload document');
      }
    }
  );

  // Upload multiple files mutation
  const uploadMultipleMutation = useMutation(
    ({ files, tags }: { files: File[]; tags: string[] }) =>
      documentsAPI.uploadMultipleDocuments(dealId, files, tags),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['deal-documents', dealId]);
        setSelectedFiles([]);
        toast.success('All documents uploaded successfully');
        onUploadSuccess?.();
      },
      onError: (error: any) => {
        console.error('Upload error:', error);
        toast.error(error.response?.data?.error || 'Failed to upload some documents');
      }
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(documentsAPI.deleteDocument, {
    onSuccess: () => {
      queryClient.invalidateQueries(['deal-documents', dealId]);
      setSelectedDocIds(new Set());
      toast.success('Document deleted successfully');
    },
    onError: (error: any) => {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.error || 'Failed to delete document');
    }
  });

  // Delete multiple documents mutation
  const deleteMultipleMutation = useMutation(
    (documentIds: string[]) => documentsAPI.deleteMultipleDocuments(documentIds),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['deal-documents', dealId]);
        setSelectedDocIds(new Set());
        toast.success('Selected documents deleted successfully');
      },
      onError: (error: any) => {
        console.error('Delete error:', error);
        toast.error(error.response?.data?.error || 'Failed to delete some documents');
      }
    }
  );

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
  ];

  const validateFile = (file: File): string | null => {
    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return `${file.name}: File size must be less than 50MB`;
    }

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      return `${file.name}: File type not supported. Please upload PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, WEBP, ZIP, RAR, 7Z, TAR, GZ, BZ2, TXT, or CSV files.`;
    }

    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} file(s) selected`);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadSelectedFiles = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      await uploadMultipleMutation.mutateAsync({ files: selectedFiles, tags: [] });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      await deleteMutation.mutateAsync(documentId);
    }
  };

  const handleToggleDocSelection = (docId: string) => {
    setSelectedDocIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const handleSelectAllDocs = () => {
    if (!documents) return;
    if (selectedDocIds.size === documents.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(documents.map(doc => doc.id)));
    }
  };

  const handleDeleteSelectedDocs = async () => {
    if (selectedDocIds.size === 0) return;
    
    const count = selectedDocIds.size;
    if (window.confirm(`Are you sure you want to delete ${count} selected document(s)?`)) {
      await deleteMultipleMutation.mutateAsync(Array.from(selectedDocIds));
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
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('tar') || mimeType.includes('gzip') || mimeType.includes('bzip2')) return '📦';
    if (mimeType.includes('text') || mimeType.includes('csv')) return '📄';
    return '📄';
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar,.7z,.tar,.gz,.bz2,.txt,.csv"
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
              {isUploading ? 'Uploading...' : 'Click to select multiple documents'}
            </button>
            <div className="text-sm text-gray-500 mt-2 space-y-1">
              <p className="font-medium">Supported file types:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div>
                  <span className="font-medium">Documents:</span> PDF, DOC, DOCX, TXT, CSV
                </div>
                <div>
                  <span className="font-medium">Spreadsheets:</span> XLS, XLSX
                </div>
                <div>
                  <span className="font-medium">Images:</span> JPG, PNG, GIF, WEBP
                </div>
                <div>
                  <span className="font-medium">Archives:</span> ZIP, RAR, 7Z, TAR, GZ, BZ2
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">Maximum file size: 50MB per file</p>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">
              Selected Files ({selectedFiles.length})
            </h4>
            <button
              type="button"
              onClick={handleUploadSelectedFiles}
              disabled={isUploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {isUploading ? 'Uploading...' : `Upload All (${selectedFiles.length})`}
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <span className="text-lg">{getFileIcon(file.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSelectedFile(index)}
                  disabled={isUploading}
                  className="ml-2 p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents List */}
      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading documents...</p>
        </div>
      ) : documents && documents.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h4 className="font-medium text-gray-900">Uploaded Documents</h4>
              {selectedDocIds.size > 0 && (
                <span className="text-sm text-blue-600 font-medium">
                  ({selectedDocIds.size} selected)
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {selectedDocIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelectedDocs}
                  disabled={deleteMultipleMutation.isLoading}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Selected ({selectedDocIds.size})
                </button>
              )}
              <button
                type="button"
                onClick={handleSelectAllDocs}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {selectedDocIds.size === documents.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors ${
                selectedDocIds.has(doc.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center space-x-3 flex-1">
                <button
                  type="button"
                  onClick={() => handleToggleDocSelection(doc.id)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title={selectedDocIds.has(doc.id) ? 'Deselect' : 'Select'}
                >
                  {selectedDocIds.has(doc.id) ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <span className="text-2xl">{getFileIcon(doc.mimeType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{doc.originalName}</p>
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
