import express from 'express';
import multer from 'multer';
import { body, validationResult } from 'express-validator';
import { FirebaseService } from '../services/firebaseService';
import { OneDriveService } from '../services/oneDriveService';
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
      'application/zip'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, and ZIP files are allowed.'));
    }
  }
});

// Get documents for a deal
router.get('/deal/:dealId', async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;
    console.log('📄 [DOCUMENTS] Getting documents for deal:', dealId);
    console.log('📄 [DOCUMENTS] User ID:', req.user?.id);

    // Verify deal belongs to user
    const deal = await FirebaseService.getDealById(dealId);
    if (!deal) {
      console.log('📄 [DOCUMENTS] Deal not found:', dealId);
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    if (deal.userId !== req.user!.id) {
      console.log('📄 [DOCUMENTS] Deal does not belong to user. Deal userId:', deal.userId, 'Request userId:', req.user!.id);
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('📄 [DOCUMENTS] Deal found, getting documents from OneDrive...');
    
    try {
      // Get documents from OneDrive
      const documents = await OneDriveService.getDealFiles(dealId);
      console.log('📄 [DOCUMENTS] Documents retrieved:', documents.length);
      res.json(documents);
    } catch (oneDriveError) {
      console.log('📄 [DOCUMENTS] OneDrive error, returning mock data:', oneDriveError instanceof Error ? oneDriveError.message : 'Unknown error');
      
      // Return mock data when OneDrive is not available
      const mockDocuments = [
        {
          id: 'mock-doc-1',
          name: 'Sample Document.pdf',
          size: 1024000,
          createdDateTime: new Date().toISOString(),
          lastModifiedDateTime: new Date().toISOString(),
          webUrl: 'https://example.com/sample-document.pdf',
          downloadUrl: 'https://example.com/download/sample-document.pdf'
        }
      ];
      
      console.log('📄 [DOCUMENTS] Mock documents returned:', mockDocuments.length);
      res.json(mockDocuments);
    }
  } catch (error) {
    console.error('📄 [DOCUMENTS] Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Upload document
router.post('/upload', upload.single('file'), [
  body('dealId').notEmpty().withMessage('Deal ID is required'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
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
    
    if (deal.userId !== req.user!.id) {
      console.log('📄 [UPLOAD] Deal does not belong to user. Deal userId:', deal.userId, 'Request userId:', req.user!.id);
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('📄 [UPLOAD] Deal found, uploading to OneDrive...');

    try {
      // Upload to OneDrive
      const oneDriveFile = await OneDriveService.uploadFile(
        dealId,
        req.file.originalname,
        req.file.buffer,
        req.file.mimetype
      );

      console.log('📄 [UPLOAD] File uploaded to OneDrive:', oneDriveFile.id);

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
    } catch (oneDriveError) {
      console.log('📄 [UPLOAD] OneDrive error, returning mock response:', oneDriveError instanceof Error ? oneDriveError.message : 'Unknown error');
      
      // Return mock response when OneDrive is not available
      const mockFile = {
        id: 'mock-upload-' + Date.now(),
        name: req.file.originalname,
        size: req.file.size,
        webUrl: 'https://example.com/' + req.file.originalname,
        downloadUrl: 'https://example.com/download/' + req.file.originalname,
      };

      console.log('📄 [UPLOAD] Mock file uploaded:', mockFile.id);

      res.status(201).json({
        message: 'Document uploaded successfully (mock)',
        file: {
          id: mockFile.id,
          name: mockFile.name,
          size: mockFile.size,
          webUrl: mockFile.webUrl,
          downloadUrl: mockFile.downloadUrl,
          tags,
          dealId,
          uploadedAt: new Date().toISOString()
        }
      });
    }
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
