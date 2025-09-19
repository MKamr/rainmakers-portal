import express from 'express';
import { body, validationResult } from 'express-validator';
import { FirebaseService } from '../services/firebaseService';
import { OneDriveService } from '../services/oneDriveService';
import { GHLService } from '../services/ghlService';
import { Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth';
import { Timestamp } from 'firebase-admin/firestore';
import axios from 'axios';
import multer from 'multer';
import { Multer } from 'multer';

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

// Apply admin middleware to all routes
router.use(requireAdmin);

// Get all users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await FirebaseService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user (whitelist/admin status)
router.put('/users/:id', [
  body('isWhitelisted').optional().isBoolean().withMessage('isWhitelisted must be a boolean'),
  body('isAdmin').optional().isBoolean().withMessage('isAdmin must be a boolean'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { isWhitelisted, isAdmin } = req.body;

    // Prevent user from removing their own admin status
    if (id === req.user!.id && isAdmin === false) {
      return res.status(400).json({ error: 'Cannot remove your own admin status' });
    }

    const updates: any = {};
    if (isWhitelisted !== undefined) updates.isWhitelisted = isWhitelisted;
    if (isAdmin !== undefined) updates.isAdmin = isAdmin;

    const updatedUser = await FirebaseService.updateUser(id, updates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Get all deals (admin view) with filters
router.get('/deals', async (req: Request, res: Response) => {
  try {
    const { userId, startDate, endDate, status, propertyType } = req.query;
    let deals = await FirebaseService.getAllDeals();

    // Apply filters
    if (userId) {
      deals = deals.filter((deal: any) => deal.userId === userId);
    }

    if (startDate) {
      const start = new Date(startDate as string);
      deals = deals.filter((deal: any) => {
        const dealDate = deal.createdAt instanceof Date ? deal.createdAt : (deal.createdAt?.toDate?.() || new Date(deal.createdAt));
        return dealDate >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate as string);
      deals = deals.filter((deal: any) => {
        const dealDate = deal.createdAt instanceof Date ? deal.createdAt : (deal.createdAt?.toDate?.() || new Date(deal.createdAt));
        return dealDate <= end;
      });
    }

    if (status) {
      deals = deals.filter((deal: any) => deal.status === status);
    }

    if (propertyType) {
      deals = deals.filter((deal: any) => deal.propertyType === propertyType);
    }

    res.json(deals);
  } catch (error) {
    console.error('Get all deals error:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// Connect OneDrive
router.post('/onedrive/connect', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    // Exchange code for tokens
    const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      client_id: process.env.MICROSOFT_CLIENT_ID || '',
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
      code,
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI || '',
      grant_type: 'authorization_code',
      scope: 'https://graph.microsoft.com/Files.ReadWrite.All offline_access User.Read'
    });

    const { access_token, refresh_token, expires_in } = response.data;

    // Save token to Firebase
    await FirebaseService.saveOneDriveToken({
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Timestamp.fromDate(new Date(Date.now() + expires_in * 1000)),
      scope: 'https://graph.microsoft.com/Files.ReadWrite.All offline_access User.Read'
    });

    // Get user info to confirm connection
    const userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    res.json({
      message: 'OneDrive connected successfully',
      user: {
        email: userResponse.data.mail || userResponse.data.userPrincipalName,
        name: userResponse.data.displayName
      }
    });
  } catch (error) {
    console.error('OneDrive connection error:', error);
    res.status(500).json({ error: 'Failed to connect OneDrive' });
  }
});

// Get OneDrive connection status
router.get('/onedrive/status', async (req: Request, res: Response) => {
  try {
    const token = await FirebaseService.getLatestOneDriveToken();
    
    if (!token) {
      return res.json({ connected: false });
    }

    // Check if token is expired
    const isExpired = new Date() >= (token.expiresAt instanceof Date ? token.expiresAt : token.expiresAt.toDate());
    
    res.json({
      connected: true,
      expired: isExpired,
      expiresAt: token.expiresAt instanceof Date ? token.expiresAt : token.expiresAt.toDate()
    });
  } catch (error) {
    console.error('OneDrive status error:', error);
    res.status(500).json({ error: 'Failed to check OneDrive status' });
  }
});

// Upload document to OneDrive (admin only)
router.post('/onedrive/upload', upload.single('file'), [
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

    // Verify deal exists
    const deal = await FirebaseService.getDealById(dealId);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Upload to OneDrive
    const oneDriveFile = await OneDriveService.uploadFile(
      dealId,
      req.file.originalname,
      req.file.buffer,
      req.file.mimetype
    );

    // Sync to GHL if configured
    try {
      const ghlApiKey = await FirebaseService.getConfiguration('ghl_api_key');
      if (ghlApiKey && deal.contactId) {
        // Upload document to GHL contact
        await GHLService.uploadDocumentToContact(
          deal.contactId,
          req.file.originalname,
          req.file.buffer,
          req.file.mimetype,
          ghlApiKey
        );
        console.log('Document synced to GHL contact:', deal.contactId);
      }
    } catch (error) {
      console.warn('Failed to sync document to GHL:', error);
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
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Get documents for a deal (admin only)
router.get('/onedrive/deal/:dealId', async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;

    // Verify deal exists
    const deal = await FirebaseService.getDealById(dealId);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Get files from OneDrive
    const files = await OneDriveService.getDealFiles(dealId);
    
    res.json(files);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Delete document from OneDrive (admin only)
router.delete('/onedrive/document/:fileId', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    await OneDriveService.deleteFile(fileId);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Test GHL connection
router.get('/ghl/test', async (req: Request, res: Response) => {
  try {
    const ghlApiKey = await FirebaseService.getConfiguration('ghl_api_key');
    
    if (!ghlApiKey) {
      return res.status(400).json({ error: 'GHL API key not configured' });
    }

    // Test API key by fetching pipelines
    const response = await axios.get(`${process.env.GHL_BASE_URL}/pipelines/`, {
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      connected: true,
      pipelines: response.data.pipelines || []
    });
  } catch (error) {
    console.error('GHL test error:', error);
    res.status(500).json({ error: 'Failed to connect to GHL' });
  }
});

// Get GHL pipelines and stages
router.get('/ghl/pipelines', async (req: Request, res: Response) => {
  try {
    const ghlApiKey = await FirebaseService.getConfiguration('ghl_api_key');
    
    if (!ghlApiKey) {
      return res.status(400).json({ error: 'GHL API key not configured' });
    }

    // Fetch all pipelines with stages included
    const pipelinesResponse = await axios.get(`${process.env.GHL_BASE_URL}/pipelines/`, {
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const pipelines = pipelinesResponse.data.pipelines || [];
    
    // The v1 API includes stages, so we don't need to fetch them separately
    const pipelinesWithStages = pipelines.map((pipeline: any) => ({
      ...pipeline,
      stages: pipeline.stages || []
    }));

    res.json({ pipelines: pipelinesWithStages });
  } catch (error) {
    console.error('GHL pipelines error:', error);
    res.status(500).json({ error: 'Failed to fetch GHL pipelines' });
  }
});

// Get GHL calendars
router.get('/ghl/calendars', async (req: Request, res: Response) => {
  try {
    const ghlApiKey = await FirebaseService.getConfiguration('ghl_api_key');
    
    if (!ghlApiKey) {
      return res.status(400).json({ error: 'GHL API key not configured' });
    }

    // Fetch all calendars - try different endpoints
    let calendars = [];
    
    try {
      // Try calendar services endpoint (correct GHL API)
      const calendarsResponse = await axios.get(`${process.env.GHL_BASE_URL}/calendars/services/`, {
        headers: {
          'Authorization': `Bearer ${ghlApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const services = calendarsResponse.data.calendars || calendarsResponse.data.services || [];
      console.log('GHL Calendar services found:', services.length);
      
      // Map calendar services to our format
      calendars = services.map((service: any) => ({
        id: service.id,
        name: service.name || service.title || 'Unnamed Calendar',
        type: 'calendar',
        description: service.description || ''
      }));
      
    } catch (servicesError: any) {
      console.log('Calendar services endpoint failed, trying locations:', servicesError.message);
      
      try {
        // Fallback to locations endpoint
        const locationsResponse = await axios.get(`${process.env.GHL_BASE_URL}/locations/`, {
          headers: {
            'Authorization': `Bearer ${ghlApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        const locations = locationsResponse.data.locations || [];
        console.log('GHL Locations found:', locations.length);
        
        // Extract calendars from locations
        calendars = locations.map((location: any) => ({
          id: location.id,
          name: `${location.name} (Location)`,
          type: 'location',
          locationId: location.id
        }));
        
      } catch (locationsError: any) {
        console.log('Locations endpoint also failed:', locationsError.message);
        // Return empty array if both fail
        calendars = [];
      }
    }
    res.json({ calendars });
  } catch (error) {
    console.error('GHL calendars error:', error);
    res.status(500).json({ error: 'Failed to fetch calendars' });
  }
});

// Get GHL configuration
router.get('/ghl/config', async (req: Request, res: Response) => {
  try {
    const config = {
      apiKey: await FirebaseService.getConfiguration('ghl_api_key'),
      v2Token: await FirebaseService.getConfiguration('ghl_v2_token'),
      pipelineId: await FirebaseService.getConfiguration('ghl_pipeline_id'),
      calendarId: await FirebaseService.getConfiguration('ghl_calendar_id'),
      locationId: await FirebaseService.getConfiguration('ghl_location_id'),
      assignedUserId: await FirebaseService.getConfiguration('ghl_assigned_user_id'),
      underReviewStageId: await FirebaseService.getConfiguration('ghl_under_review_stage_id'),
      inUnderwritingStageId: await FirebaseService.getConfiguration('ghl_in_underwriting_stage_id'),
      loeSentStageId: await FirebaseService.getConfiguration('ghl_loe_sent_stage_id'),
      closedStageId: await FirebaseService.getConfiguration('ghl_closed_stage_id'),
      signedProposalStageId: await FirebaseService.getConfiguration('ghl_signed_proposal_stage_id'),
      noShowStageId: await FirebaseService.getConfiguration('ghl_no_show_stage_id'),
      skipGHL: await FirebaseService.getConfiguration('skip_ghl_sync')
    };

    res.json(config);
  } catch (error) {
    console.error('Get GHL config error:', error);
    res.status(500).json({ error: 'Failed to fetch GHL configuration' });
  }
});

// Toggle GHL sync
router.post('/ghl/toggle-sync', async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    await FirebaseService.setConfiguration('skip_ghl_sync', enabled ? 'false' : 'true', 'Skip GHL sync for debugging');
    res.json({ success: true, skipGHL: !enabled });
  } catch (error) {
    console.error('Toggle GHL sync error:', error);
    res.status(500).json({ error: 'Failed to toggle GHL sync' });
  }
});

// Test GHL contact creation
router.post('/ghl/test-contact', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone } = req.body;
    
    console.log('🧪 [GHL TEST] Testing contact creation with:', { firstName, lastName, email, phone });
    
    const testContact = await GHLService.createContact({
      firstName: firstName || 'Test',
      lastName: lastName || 'Contact',
      email: email || 'test@example.com',
      phone: phone || '1234567890',
      companyName: 'Test Company'
    });
    
    res.json({ success: true, contact: testContact });
  } catch (error) {
    console.error('GHL contact test error:', error);
    res.status(500).json({ 
      error: 'Failed to create test contact',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get GHL pipelines and stages with API key parameter
router.post('/ghl/pipelines', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    console.log('Fetching GHL pipelines with API key:', apiKey.substring(0, 10) + '...');
    console.log('GHL Base URL:', process.env.GHL_BASE_URL);

    // Fetch all pipelines with stages included
    const pipelinesResponse = await axios.get(`${process.env.GHL_BASE_URL}/pipelines/`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Pipelines response status:', pipelinesResponse.status);
    console.log('Pipelines data:', pipelinesResponse.data);

    const pipelines = pipelinesResponse.data.pipelines || [];
    console.log('Found pipelines:', pipelines.length);
    
    // The v1 API includes stages, so we don't need to fetch them separately
    const pipelinesWithStages = pipelines.map((pipeline: any) => {
      console.log(`Pipeline: ${pipeline.name} (${pipeline.id}) - Stages: ${pipeline.stages?.length || 0}`);
      return {
        ...pipeline,
        stages: pipeline.stages || []
      };
    });

    console.log('Final pipelines with stages:', pipelinesWithStages.length);
    res.json({ pipelines: pipelinesWithStages });
  } catch (error) {
    console.error('GHL pipelines error:', error);
    res.status(500).json({ error: 'Failed to fetch GHL pipelines' });
  }
});

// Save GHL configuration
router.post('/ghl/config', [
  body('apiKey').notEmpty().withMessage('API key is required'),
  body('v2Token').optional().isString().withMessage('V2 token must be a string'),
  body('pipelineId').optional().isString().withMessage('Pipeline ID must be a string'),
  body('calendarId').optional().isString().withMessage('Calendar ID must be a string'),
  body('locationId').optional().isString().withMessage('Location ID must be a string'),
  body('assignedUserId').optional().isString().withMessage('Assigned User ID must be a string'),
  body('underReviewStageId').optional().isString().withMessage('Under review stage ID must be a string'),
  body('inUnderwritingStageId').optional().isString().withMessage('In underwriting stage ID must be a string'),
  body('loeSentStageId').optional().isString().withMessage('LOE sent stage ID must be a string'),
  body('closedStageId').optional().isString().withMessage('Closed stage ID must be a string'),
  body('signedProposalStageId').optional().isString().withMessage('Signed proposal stage ID must be a string'),
  body('noShowStageId').optional().isString().withMessage('No show stage ID must be a string'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      apiKey,
      v2Token,
      pipelineId,
      calendarId,
      locationId,
      assignedUserId,
      underReviewStageId,
      inUnderwritingStageId,
      loeSentStageId,
      closedStageId,
      signedProposalStageId,
      noShowStageId
    } = req.body;

    // Save configurations
    await FirebaseService.setConfiguration('ghl_api_key', apiKey, 'GoHighLevel API Key', true);
    
    if (v2Token) {
      await FirebaseService.setConfiguration('ghl_v2_token', v2Token, 'GHL v2 Private Integration Token', true);
    }
    
    if (pipelineId) {
      await FirebaseService.setConfiguration('ghl_pipeline_id', pipelineId, 'GHL Pipeline ID');
    }
    if (calendarId) {
      await FirebaseService.setConfiguration('ghl_calendar_id', calendarId, 'GHL Calendar ID');
    }
    if (locationId) {
      await FirebaseService.setConfiguration('ghl_location_id', locationId, 'GHL Location ID');
    }
    if (assignedUserId) {
      await FirebaseService.setConfiguration('ghl_assigned_user_id', assignedUserId, 'GHL Assigned User ID');
    }
    if (underReviewStageId) {
      await FirebaseService.setConfiguration('ghl_under_review_stage_id', underReviewStageId, 'GHL Under Review Stage ID');
    }
    if (inUnderwritingStageId) {
      await FirebaseService.setConfiguration('ghl_in_underwriting_stage_id', inUnderwritingStageId, 'GHL In Underwriting Stage ID');
    }
    if (loeSentStageId) {
      await FirebaseService.setConfiguration('ghl_loe_sent_stage_id', loeSentStageId, 'GHL LOE Sent Stage ID');
    }
    if (closedStageId) {
      await FirebaseService.setConfiguration('ghl_closed_stage_id', closedStageId, 'GHL Closed Stage ID');
    }
    if (signedProposalStageId) {
      await FirebaseService.setConfiguration('ghl_signed_proposal_stage_id', signedProposalStageId, 'GHL Signed Proposal Stage ID');
    }
    if (noShowStageId) {
      await FirebaseService.setConfiguration('ghl_no_show_stage_id', noShowStageId, 'GHL No Show Stage ID');
    }

    res.json({ message: 'GHL configuration saved successfully' });
  } catch (error) {
    console.error('Save GHL config error:', error);
    res.status(500).json({ error: 'Failed to save GHL configuration' });
  }
});

// Get analytics
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const [users, deals] = await Promise.all([
      FirebaseService.getAllUsers(),
      FirebaseService.getAllDeals()
    ]);
    
    // Documents are not stored in Firebase
    const documents: any[] = [];

    // Calculate user statistics
    const totalUsers = users.length;
    const whitelistedUsers = users.filter((u: any) => u.isWhitelisted).length;
    const adminUsers = users.filter((u: any) => u.isAdmin).length;
    const activeUsers = users.filter((u: any) => {
      if (!u.lastLoginAt) return false;
      const loginDate = u.lastLoginAt instanceof Date ? u.lastLoginAt : (u.lastLoginAt?.toDate?.() || new Date(u.lastLoginAt));
      return loginDate > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }).length;

    // Calculate deal statistics
    const totalDeals = deals.length;
    const dealsByStatus = deals.reduce((acc: any, deal: any) => {
      acc[deal.status] = (acc[deal.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dealsByUser = deals.reduce((acc: any, deal: any) => {
      acc[deal.userId] = (acc[deal.userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalDealValue = deals.reduce((acc: any, deal: any) => acc + (deal.loanAmount || 0), 0);
    const averageDealValue = totalDeals > 0 ? totalDealValue / totalDeals : 0;

    // Calculate recent activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentDeals = deals.filter((deal: any) => {
      const dealDate = deal.createdAt instanceof Date ? deal.createdAt : (deal.createdAt?.toDate?.() || new Date(deal.createdAt));
      return dealDate > thirtyDaysAgo;
    }).length;

    // Calculate monthly trends
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyDeals = deals.filter((deal: any) => {
      const dealDate = deal.createdAt instanceof Date ? deal.createdAt : (deal.createdAt?.toDate?.() || new Date(deal.createdAt));
      return dealDate.getMonth() === currentMonth && dealDate.getFullYear() === currentYear;
    }).length;

    // Top performing users
    const userPerformance = users.map((user: any) => ({
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      dealsCount: dealsByUser[user.id] || 0,
      lastLogin: user.lastLoginAt instanceof Date ? user.lastLoginAt : (user.lastLoginAt?.toDate?.() || new Date(user.lastLoginAt)) || null
    })).sort((a: any, b: any) => b.dealsCount - a.dealsCount);

    const totalDocuments = documents.length;
    const totalDocumentSize = documents.reduce((acc: any, doc: any) => acc + doc.fileSize, 0);

    res.json({
      users: {
        total: totalUsers,
        whitelisted: whitelistedUsers,
        admins: adminUsers,
        active: activeUsers
      },
      deals: {
        total: totalDeals,
        byStatus: dealsByStatus,
        totalValue: totalDealValue,
        averageValue: averageDealValue,
        recent: recentDeals,
        monthly: monthlyDeals
      },
      documents: {
        total: totalDocuments,
        totalSize: totalDocumentSize
      },
      performance: {
        topUsers: userPerformance.slice(0, 10)
      },
      overview: {
        totalActivity: totalDeals,
        recentActivity: recentDeals,
        monthlyActivity: monthlyDeals
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get all documents (admin view)
router.get('/documents', async (req: Request, res: Response) => {
  try {
    // Return empty array - documents are not stored in Firebase
    res.json([]);
  } catch (error) {
    console.error('Get all documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Fetch GHL custom fields
router.post('/ghl/fetch-custom-fields', async (req: Request, res: Response) => {
  try {
    console.log('🔍 [ADMIN] Fetching GHL custom fields...');
    
    // Get contact custom fields
    const contactFieldsResult = await GHLService.getContactCustomFields();
    const contactFields = contactFieldsResult.customFields || [];
    console.log('📞 Contact fields found:', contactFields.length);
    
    // Get opportunity custom fields
    const opportunityFieldsResult = await GHLService.getOpportunityCustomFields();
    const opportunityFields = opportunityFieldsResult.customFields || [];
    console.log('💼 Opportunity fields found:', opportunityFields.length);
    
    // Combine all fields
    const allFields = [...contactFields, ...opportunityFields];
    
    // Create summary
    const summary = {
      totalFields: allFields.length,
      contactFields: contactFields.length,
      opportunityFields: opportunityFields.length
    };
    
    // Save to JSON file
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', '..', 'ghl-custom-fields.json');
    
    const customFieldsData = {
      fetchedAt: new Date().toISOString(),
      summary,
      contactFields,
      opportunityFields,
      allFields
    };
    
    fs.writeFileSync(filePath, JSON.stringify(customFieldsData, null, 2));
    console.log('💾 Custom fields saved to:', filePath);
    
    res.json({
      success: true,
      summary,
      contactFields,
      opportunityFields,
      message: `Successfully fetched ${summary.totalFields} custom fields and saved to ghl-custom-fields.json`
    });
    
  } catch (error) {
    console.error('❌ [ADMIN] Fetch custom fields error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch GHL custom fields',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
