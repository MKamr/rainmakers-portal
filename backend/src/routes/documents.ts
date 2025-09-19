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
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
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

    // Verify deal belongs to user
    const deal = await FirebaseService.getDealById(dealId);
    if (!deal || deal.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Return empty array - documents are not stored in Firebase
    res.json([]);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Upload document
router.post('/upload', upload.single('file'), [
  body('dealId').notEmpty().withMessage('Deal ID is required'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { dealId, tags = [] } = req.body;

    // Verify deal belongs to user
    const deal = await FirebaseService.getDealById(dealId);
    if (!deal || deal.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Document upload is disabled - return success message
    res.status(201).json({ 
      message: 'Document upload is currently disabled',
      dealId,
      filename: req.file.originalname
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
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
