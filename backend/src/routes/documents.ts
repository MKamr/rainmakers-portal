import express from 'express';
import multer from 'multer';
import { body, validationResult } from 'express-validator';
import { FirebaseService } from '../services/firebaseService';
import { OneDriveService } from '../services/oneDriveService';
import { GHLService } from '../services/ghlService';
import { Request, Response } from 'express';

const router = express.Router();

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
      'application/x-rar-compressed',
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
    // Document operations are disabled
    res.status(404).json({ error: 'Document not found' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
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
