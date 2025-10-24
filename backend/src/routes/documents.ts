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
  
  if (allowedOrigins.includes(origin)) {
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
    const files = await OneDriveService.getFiles();
    res.json({
      message: 'OneDrive files retrieved',
      count: files.length,
      files: files.map(f => ({
        id: f.id,
        name: f.name,
        size: f.size,
        webUrl: f.webUrl
      }))
    });
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

    
    try {
      // Get documents from OneDrive
      const documents = await OneDriveService.getDealFiles(dealId);
      
      // Set userId for each document
      const documentsWithUserId = documents.map(doc => ({
        ...doc,
        userId: req.user!.id
      }));
      
      res.json(documentsWithUserId);
    } catch (oneDriveError: any) {
      // If folder doesn't exist (404), only create it for non-admin users
      if (oneDriveError.message?.includes('Failed to fetch files') || oneDriveError.response?.status === 404) {
        if (req.user!.isAdmin) {
          res.json([]);
        } else {
          try {
            await OneDriveService.createDealFolder(dealId, deal.propertyAddress);
            
            // Retry getting documents
            const documents = await OneDriveService.getDealFiles(dealId);
            
            // Set userId for each document
            const documentsWithUserId = documents.map(doc => ({
              ...doc,
              userId: req.user!.id
            }));
            
            res.json(documentsWithUserId);
          } catch (createError) {
            console.error('❌ [DOCUMENTS] Failed to create deal folder:', createError);
            res.status(500).json({ error: 'Failed to create deal folder', details: createError instanceof Error ? createError.message : 'Unknown error' });
          }
        }
      } else {
        throw oneDriveError;
      }
    }
  } catch (error) {
    console.error('📄 [DOCUMENTS] Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Upload document
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

      // Get user info for the notification
      const user = await FirebaseService.getUserById(req.user!.id);
      const uploadedBy = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown User' : 'Unknown User';
      
      // Send document upload notification
      await EmailService.sendDocumentUploadNotificationEmail(deal, req.file.originalname, uploadedBy);
    } catch (emailError) {
      // Don't fail the document upload if email fails
      console.error('❌ [EMAIL] Failed to send document upload notification:', emailError);
    }

    // Sync to GHL if configured
    try {
      const ghlApiKey = await FirebaseService.getConfiguration('ghl_api_key');
      if (ghlApiKey && deal.contactId) {
        console.log('📄 [UPLOAD] Syncing document to GHL contact:', deal.contactId);
        // Upload document to GHL contact
        await GHLService.uploadDocumentToContact(
          deal.contactId,
          req.file.originalname,
          req.file.buffer,
          req.file.mimetype,
          ghlApiKey
        );
        console.log('✅ [UPLOAD] Document synced to GHL contact:', deal.contactId);
      } else {
        console.log('⚠️ [UPLOAD] GHL not configured or missing contactId, skipping sync...');
        if (!ghlApiKey) console.log('  - Missing GHL API key');
        if (!deal.contactId) console.log('  - Missing deal contactId');
      }
    } catch (error) {
      console.warn('⚠️ [UPLOAD] Failed to sync document to GHL:', error);
      // Don't fail the upload if GHL sync fails
    }

    res.status(201).json({
      message: 'Document uploaded successfully',
      file: {
        id: oneDriveFile.id,
        name: oneDriveFile.name,
        size: oneDriveFile.size,
        webUrl: oneDriveFile.webUrl,
        downloadUrl: oneDriveFile.downloadUrl,
        tags,
        dealId,
        uploadedAt: new Date().toISOString()
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

// Delete document
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    console.log('🗑️ [DELETE] Delete document request:', req.params.id);
    
    const documentId = req.params.id;
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    // Delete from OneDrive
    await OneDriveService.deleteFile(documentId);
    console.log('✅ [DELETE] Document deleted successfully from OneDrive:', documentId);

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
