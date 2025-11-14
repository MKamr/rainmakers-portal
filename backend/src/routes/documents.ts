import express from 'express';
import multer from 'multer';
import { body, validationResult } from 'express-validator';
import { FirebaseService } from '../services/firebaseService';
import { OneDriveService } from '../services/oneDriveService';
import { GHLService } from '../services/ghlService';
import { EmailService } from '../services/emailService';
import { Request, Response } from 'express';

const router = express.Router();

// Add CORS middleware specifically for documents routes
router.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://rain.club',
    'https://www.rain.club',
    'http://localhost:3000',
    'http://localhost:3001'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Handle CORS preflight requests for file uploads
router.options('/upload', (req, res) => {
  console.log('🌐 [CORS] Preflight request for /upload');
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Handle CORS preflight requests for file deletion
router.options('/:id', (req, res) => {
  console.log('🌐 [CORS] Preflight request for DELETE /:id');
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Handle CORS preflight requests for multiple file uploads
router.options('/upload-multiple', (req, res) => {
  console.log('🌐 [CORS] Preflight request for /upload-multiple');
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Handle CORS preflight requests for multiple file deletion
router.options('/delete-multiple', (req, res) => {
  console.log('🌐 [CORS] Preflight request for /delete-multiple');
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Test endpoint to verify CORS is working
router.get('/test-cors', (req, res) => {
  console.log('🌐 [CORS] Test endpoint called');
  console.log('🌐 [CORS] Request origin:', req.headers.origin);
  res.json({ 
    message: 'CORS test successful', 
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to list OneDrive files for debugging
router.get('/test-onedrive', async (req, res) => {
  try {
    console.log('🔍 [TEST] Listing OneDrive files for debugging');
    // Note: getFiles() method doesn't exist in OneDriveService
    // This endpoint is disabled until the method is implemented
    res.json({
      message: 'OneDrive test endpoint - getFiles() method not implemented',
      count: 0,
      files: [] as any[]
    });
    return;
    /* Commented out until getFiles() is implemented
    const files = await OneDriveService.getFiles();
    res.json({
      message: 'OneDrive files retrieved',
      count: files.length,
      files: files.map((f: any) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        webUrl: f.webUrl
      }))
    }); */
  } catch (error: any) {
    console.error('❌ [TEST] OneDrive test error:', error);
    res.status(500).json({ 
      error: 'Failed to list OneDrive files', 
      details: error.message 
    });
  }
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req: Request, file: any, cb: any) => {
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

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, WEBP, ZIP, RAR, 7Z, TAR, GZ, BZ2, TXT, and CSV files are allowed.'));
    }
  }
});

// Get documents for a deal
router.get('/deal/:dealId', async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;

    // Verify deal belongs to user
    const deal = await FirebaseService.getDealById(dealId);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    // Allow access if user owns the deal OR if user is admin
    if (deal.userId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get documents from Firebase filtered by userId
    const documents = await FirebaseService.getDocumentsByDealAndUser(dealId, req.user!.id);
    
    // Map Firebase documents to match frontend Document interface
    const mappedDocuments = documents.map(doc => ({
      id: doc.id,
      filename: doc.filename,
      originalName: doc.originalName,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      tags: doc.tags || [],
      oneDriveId: doc.oneDriveId,
      oneDriveUrl: doc.oneDriveUrl,
      downloadUrl: doc.downloadUrl,
      userId: doc.userId,
      dealId: doc.dealId,
      createdAt: doc.uploadedAt.toDate().toISOString(),
      updatedAt: doc.uploadedAt.toDate().toISOString(),
    }));
    
    res.json(mappedDocuments);
  } catch (error) {
    console.error('📄 [DOCUMENTS] Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Upload multiple documents
router.post('/upload-multiple', upload.array('files', 50), [
  body('dealId').notEmpty().withMessage('Deal ID is required'),
  body('tags').optional().custom((value) => {
    if (value === undefined || value === null) return true;
    if (Array.isArray(value)) return true;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed);
      } catch {
        return false;
      }
    }
    return false;
  }).withMessage('Tags must be an array or valid JSON string'),
], async (req: Request, res: Response) => {
  try {
    console.log('📄 [UPLOAD MULTIPLE] Upload request received');
    console.log('📄 [UPLOAD MULTIPLE] Request origin:', req.headers.origin);
    console.log('📄 [UPLOAD MULTIPLE] User ID:', req.user?.id);
    console.log('📄 [UPLOAD MULTIPLE] Files count:', req.files?.length || 0);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('📄 [UPLOAD MULTIPLE] Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      console.log('📄 [UPLOAD MULTIPLE] No files uploaded');
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { dealId, tags: tagsString } = req.body;
    
    // Parse tags if it's a string
    let tags: string[] = [];
    if (tagsString) {
      try {
        tags = typeof tagsString === 'string' ? JSON.parse(tagsString) : tagsString;
      } catch (error) {
        console.log('📄 [UPLOAD MULTIPLE] Invalid tags format, using empty array:', tagsString);
        tags = [];
      }
    }
    
    console.log('📄 [UPLOAD MULTIPLE] Deal ID:', dealId);
    console.log('📄 [UPLOAD MULTIPLE] Tags:', tags);
    console.log('📄 [UPLOAD MULTIPLE] Files to upload:', files.length);

    // Verify deal belongs to user
    const deal = await FirebaseService.getDealById(dealId);
    if (!deal) {
      console.log('📄 [UPLOAD MULTIPLE] Deal not found:', dealId);
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    // Allow access if user owns the deal OR if user is admin
    if (deal.userId !== req.user!.id && !req.user!.isAdmin) {
      console.log('📄 [UPLOAD MULTIPLE] Deal does not belong to user and user is not admin. Deal userId:', deal.userId, 'Request userId:', req.user!.id, 'Is Admin:', req.user!.isAdmin);
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('📄 [UPLOAD MULTIPLE] Deal found, uploading to OneDrive...');

    // Get user info for uploadedBy field (once before loop)
    const user = await FirebaseService.getUserById(req.user!.id);
    let uploadedBy = 'Unknown User';
    if (user) {
      if (user.username && user.username.trim()) {
        uploadedBy = user.username.trim();
      } else if (user.email) {
        const emailUsername = user.email.split('@')[0];
        uploadedBy = emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1);
      }
    }

    // Upload all files to OneDrive
    const uploadResults = [];
    let uploadedCount = 0;
    let failedCount = 0;

    for (const file of files) {
      try {
        // Upload to OneDrive
        const oneDriveFile = await OneDriveService.uploadFile(
          dealId,
          file.originalname,
          file.buffer,
          file.mimetype
        );

        // Save document metadata to Firebase
        const documentData = await FirebaseService.createDocument({
          filename: oneDriveFile.name,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          userId: req.user!.id,
          oneDriveId: oneDriveFile.id,
          oneDriveUrl: oneDriveFile.webUrl,
          downloadUrl: oneDriveFile.downloadUrl,
          tags: tags,
          dealId: dealId,
          uploadedBy: uploadedBy,
        });

        uploadedCount++;
        uploadResults.push({
          success: true,
          file: {
            id: documentData.id,
            filename: documentData.filename,
            originalName: documentData.originalName,
            fileSize: documentData.fileSize,
            mimeType: documentData.mimeType,
            tags: documentData.tags,
            oneDriveId: documentData.oneDriveId,
            oneDriveUrl: documentData.oneDriveUrl,
            downloadUrl: documentData.downloadUrl,
            userId: documentData.userId,
            dealId: documentData.dealId,
            createdAt: documentData.uploadedAt.toDate().toISOString(),
            updatedAt: documentData.uploadedAt.toDate().toISOString()
          }
        });

        console.log(`✅ [UPLOAD MULTIPLE] File ${uploadedCount}/${files.length} uploaded:`, oneDriveFile.id);
        console.log(`✅ [UPLOAD MULTIPLE] Document metadata saved to Firebase:`, documentData.id);

        // Send email notification for document upload
        try {
          // Ensure email service initialized (handles serverless cold starts)
          try {
            const ready = await EmailService.testEmailConnection();
            if (!ready) {
              const storedConfig = await FirebaseService.getEmailConfig();
              if (storedConfig && storedConfig.enabled) {
                await EmailService.initialize(storedConfig);
              }
            }
          } catch {}
          
          // Send document upload notification
          await EmailService.sendDocumentUploadNotificationEmail(deal, file.originalname, uploadedBy);
        } catch (emailError) {
          // Don't fail the document upload if email fails
          console.error('❌ [EMAIL] Failed to send document upload notification:', emailError);
        }

        // Sync to GHL if configured
        try {
          const ghlApiKey = await FirebaseService.getConfiguration('ghl_api_key');
          if (ghlApiKey && (deal as any).ghlContactId) {
            console.log('📄 [UPLOAD MULTIPLE] Syncing document to GHL contact:', (deal as any).ghlContactId);
            // Upload document to GHL contact
            await GHLService.uploadDocumentToContact(
              (deal as any).ghlContactId,
              file.originalname,
              file.buffer,
              file.mimetype,
              ghlApiKey
            );
            console.log('✅ [UPLOAD MULTIPLE] Document synced to GHL contact:', (deal as any).ghlContactId);
          }
        } catch (error) {
          console.warn('⚠️ [UPLOAD MULTIPLE] Failed to sync document to GHL:', error);
          // Don't fail the upload if GHL sync fails
        }
      } catch (error: any) {
        failedCount++;
        console.error(`❌ [UPLOAD MULTIPLE] Failed to upload file ${file.originalname}:`, error);
        uploadResults.push({
          success: false,
          fileName: file.originalname,
          error: error.message || 'Failed to upload file'
        });
      }
    }

    console.log(`✅ [UPLOAD MULTIPLE] Upload complete. Uploaded: ${uploadedCount}, Failed: ${failedCount}`);

    res.status(201).json({
      message: `Successfully uploaded ${uploadedCount} file(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      uploaded: uploadedCount,
      failed: failedCount,
      results: uploadResults
    });
  } catch (error) {
    console.error('📄 [UPLOAD MULTIPLE] Upload error:', error);
    res.status(500).json({ error: 'Failed to upload documents', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Upload document (single file - kept for backward compatibility)
router.post('/upload', upload.single('file'), [
  body('dealId').notEmpty().withMessage('Deal ID is required'),
  body('tags').optional().custom((value) => {
    if (value === undefined || value === null) return true;
    if (Array.isArray(value)) return true;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed);
      } catch {
        return false;
      }
    }
    return false;
  }).withMessage('Tags must be an array or valid JSON string'),
], async (req: Request, res: Response) => {
  try {
    console.log('📄 [UPLOAD] Upload request received');
    console.log('📄 [UPLOAD] Request origin:', req.headers.origin);
    console.log('📄 [UPLOAD] Request headers:', req.headers);
    console.log('📄 [UPLOAD] User ID:', req.user?.id);
    console.log('📄 [UPLOAD] Request body:', req.body);
    console.log('📄 [UPLOAD] File:', req.file ? { name: req.file.originalname, size: req.file.size, type: req.file.mimetype } : 'No file');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('📄 [UPLOAD] Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      console.log('📄 [UPLOAD] No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { dealId, tags: tagsString } = req.body;
    
    // Parse tags if it's a string
    let tags: string[] = [];
    if (tagsString) {
      try {
        tags = typeof tagsString === 'string' ? JSON.parse(tagsString) : tagsString;
      } catch (error) {
        console.log('📄 [UPLOAD] Invalid tags format, using empty array:', tagsString);
        tags = [];
      }
    }
    
    console.log('📄 [UPLOAD] Deal ID:', dealId);
    console.log('📄 [UPLOAD] Tags:', tags);

    // Verify deal belongs to user
    const deal = await FirebaseService.getDealById(dealId);
    if (!deal) {
      console.log('📄 [UPLOAD] Deal not found:', dealId);
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    // Allow access if user owns the deal OR if user is admin
    if (deal.userId !== req.user!.id && !req.user!.isAdmin) {
      console.log('📄 [UPLOAD] Deal does not belong to user and user is not admin. Deal userId:', deal.userId, 'Request userId:', req.user!.id, 'Is Admin:', req.user!.isAdmin);
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('📄 [UPLOAD] Deal found, uploading to OneDrive...');

    // Upload to OneDrive
    const oneDriveFile = await OneDriveService.uploadFile(
      dealId,
      req.file.originalname,
      req.file.buffer,
      req.file.mimetype
    );

    console.log('📄 [UPLOAD] File uploaded to OneDrive:', oneDriveFile.id);

    // Get user info for uploadedBy field
    const user = await FirebaseService.getUserById(req.user!.id);
    let uploadedBy = 'Unknown User';
    if (user) {
      if (user.username && user.username.trim()) {
        uploadedBy = user.username.trim();
      } else if (user.email) {
        const emailUsername = user.email.split('@')[0];
        uploadedBy = emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1);
      }
    }

    // Save document metadata to Firebase
    const documentData = await FirebaseService.createDocument({
      filename: oneDriveFile.name,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      userId: req.user!.id,
      oneDriveId: oneDriveFile.id,
      oneDriveUrl: oneDriveFile.webUrl,
      downloadUrl: oneDriveFile.downloadUrl,
      tags: tags,
      dealId: dealId,
      uploadedBy: uploadedBy,
    });

    console.log('📄 [UPLOAD] Document metadata saved to Firebase:', documentData.id);

    // Send email notification for document upload
    try {
      // Ensure email service initialized (handles serverless cold starts)
      try {
        const ready = await EmailService.testEmailConnection();
        if (!ready) {
          const storedConfig = await FirebaseService.getEmailConfig();
          if (storedConfig && storedConfig.enabled) {
            await EmailService.initialize(storedConfig);
          }
        }
      } catch {}

      // Send document upload notification (uploadedBy already set above)
      await EmailService.sendDocumentUploadNotificationEmail(deal, req.file.originalname, uploadedBy);
    } catch (emailError) {
      // Don't fail the document upload if email fails
      console.error('❌ [EMAIL] Failed to send document upload notification:', emailError);
    }

    // Sync to GHL if configured
    try {
      const ghlApiKey = await FirebaseService.getConfiguration('ghl_api_key');
      if (ghlApiKey && (deal as any).ghlContactId) {
        console.log('📄 [UPLOAD] Syncing document to GHL contact:', (deal as any).ghlContactId);
        // Upload document to GHL contact
        await GHLService.uploadDocumentToContact(
          (deal as any).ghlContactId,
          req.file.originalname,
          req.file.buffer,
          req.file.mimetype,
          ghlApiKey
        );
        console.log('✅ [UPLOAD] Document synced to GHL contact:', (deal as any).ghlContactId);
      } else {
        console.log('⚠️ [UPLOAD] GHL not configured or missing contactId, skipping sync...');
        if (!ghlApiKey) console.log('  - Missing GHL API key');
        if (!(deal as any).ghlContactId) console.log('  - Missing deal ghlContactId');
      }
    } catch (error) {
      console.warn('⚠️ [UPLOAD] Failed to sync document to GHL:', error);
      // Don't fail the upload if GHL sync fails
    }

    res.status(201).json({
      message: 'Document uploaded successfully',
      file: {
        id: documentData.id,
        filename: documentData.filename,
        originalName: documentData.originalName,
        fileSize: documentData.fileSize,
        mimeType: documentData.mimeType,
        tags: documentData.tags,
        oneDriveId: documentData.oneDriveId,
        oneDriveUrl: documentData.oneDriveUrl,
        downloadUrl: documentData.downloadUrl,
        userId: documentData.userId,
        dealId: documentData.dealId,
        createdAt: documentData.uploadedAt.toDate().toISOString(),
        updatedAt: documentData.uploadedAt.toDate().toISOString()
      }
    });
  } catch (error) {
    console.error('📄 [UPLOAD] Upload error:', error);
    res.status(500).json({ error: 'Failed to upload document', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Update document tags
router.put('/:id', [
  body('tags').isArray().withMessage('Tags must be an array'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Document operations are disabled
    res.status(404).json({ error: 'Document not found' });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete multiple documents
router.post('/delete-multiple', [
  body('documentIds').isArray().notEmpty().withMessage('Document IDs array is required'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { documentIds } = req.body;
    console.log('🗑️ [DELETE MULTIPLE] Delete documents request:', documentIds.length, 'documents');
    
    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'Document IDs array is required and must not be empty' });
    }

    let deletedCount = 0;
    let failedCount = 0;
    const errors_list: string[] = [];

    // Soft delete from Firebase (keep in OneDrive)
    for (const documentId of documentIds) {
      try {
        // Verify document belongs to user before deleting
        const document = await FirebaseService.getDocumentById(documentId);
        if (!document) {
          failedCount++;
          errors_list.push(`${documentId}: Document not found`);
          continue;
        }
        
        if (document.userId !== req.user!.id && !req.user!.isAdmin) {
          failedCount++;
          errors_list.push(`${documentId}: Access denied`);
          continue;
        }

        await FirebaseService.softDeleteDocument(documentId);
        deletedCount++;
        console.log(`✅ [DELETE MULTIPLE] Document soft deleted: ${documentId} (${deletedCount}/${documentIds.length})`);
      } catch (error: any) {
        failedCount++;
        const errorMsg = error.message || 'Failed to delete document';
        errors_list.push(`${documentId}: ${errorMsg}`);
        console.error(`❌ [DELETE MULTIPLE] Failed to delete document ${documentId}:`, error);
      }
    }

    console.log(`✅ [DELETE MULTIPLE] Delete complete. Deleted: ${deletedCount}, Failed: ${failedCount}`);

    if (failedCount === 0) {
      res.json({ 
        message: `Successfully deleted ${deletedCount} document(s)`,
        deleted: deletedCount,
        failed: failedCount
      });
    } else {
      res.status(207).json({ 
        message: `Deleted ${deletedCount} document(s), ${failedCount} failed`,
        deleted: deletedCount,
        failed: failedCount,
        errors: errors_list
      });
    }
  } catch (error: any) {
    console.error('❌ [DELETE MULTIPLE] Delete documents error:', error);
    res.status(500).json({ 
      error: 'Failed to delete documents', 
      details: error.message 
    });
  }
});

// Delete document (single - kept for backward compatibility)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    console.log('🗑️ [DELETE] Delete document request:', req.params.id);
    
    const documentId = req.params.id;
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    // Verify document belongs to user before deleting
    const document = await FirebaseService.getDocumentById(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.userId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Soft delete from Firebase (keep in OneDrive)
    await FirebaseService.softDeleteDocument(documentId);
    console.log('✅ [DELETE] Document soft deleted successfully:', documentId);

    res.json({ message: 'Document deleted successfully' });
  } catch (error: any) {
    console.error('❌ [DELETE] Delete document error:', error);
    res.status(500).json({ 
      error: 'Failed to delete document', 
      details: error.message 
    });
  }
});

// Get all user documents
router.get('/', async (req: Request, res: Response) => {
  try {
    // Return empty array - documents are not stored in Firebase
    res.json([]);
  } catch (error) {
    console.error('Get user documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

export default router;
