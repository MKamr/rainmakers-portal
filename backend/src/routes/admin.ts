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
import { generatePKCEChallenge } from '../utils/pkce';

const router = express.Router();

// GHL Opportunities Import Routes
router.get('/ghl/opportunities', requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log('🔍 [GHL IMPORT] Fetching opportunities...');
    const opportunities = await GHLService.listOpportunities();
    
    console.log('✅ [GHL IMPORT] Opportunities fetched:', opportunities.opportunities?.length || 0);
    res.json(opportunities);
  } catch (error: any) {
    console.error('❌ [GHL IMPORT] Error fetching opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

router.post('/ghl/import-opportunity', requireAdmin, [
  body('opportunityId').notEmpty().withMessage('Opportunity ID is required'),
  body('userId').notEmpty().withMessage('User ID is required'),
  body('opportunity').isObject().withMessage('Opportunity data is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { opportunityId, userId, opportunity } = req.body;
    
    console.log('📥 [GHL IMPORT] Importing opportunity:', opportunityId, 'for user:', userId);
    
    // Verify user exists
    const user = await FirebaseService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create deal in Firebase with all fields
    const dealData = {
      userId: userId,
      dealId: `GHL-${opportunityId}`, // Prefix to identify GHL imports
      
      // Basic deal information
      propertyAddress: opportunity.name || 'Imported from GHL',
      propertyName: opportunity.name || 'Imported from GHL',
      propertyType: opportunity.customFields?.find((f: any) => f.key === 'property_type')?.value || '',
      propertyVintage: opportunity.customFields?.find((f: any) => f.key === 'property_vintage')?.value || '',
      
      // Contact information
      contactName: opportunity.contact?.name || '',
      contactEmail: opportunity.contact?.email || '',
      contactPhone: opportunity.contact?.phone || '',
      
      // Deal details
      dealType: opportunity.customFields?.find((f: any) => f.key === 'deal_type')?.value || 'Acquisition',
      stage: opportunity.stageName || opportunity.stage || 'Qualification',
      status: opportunity.status || 'Open',
      
      // Financial information
      loanRequest: opportunity.customFields?.find((f: any) => f.key === 'loan_request')?.value || 
                   opportunity.monetaryValue ? `$${opportunity.monetaryValue}` : '',
      sponsorLiquidity: opportunity.customFields?.find((f: any) => f.key === 'sponsor_liquidity')?.value || '',
      sponsorNetWorth: opportunity.customFields?.find((f: any) => f.key === 'sponsor_net_worth')?.value || '',
      
      // Additional information
      notes: opportunity.customFields?.find((f: any) => f.key === 'notes')?.value || '',
      additionalInformation: opportunity.customFields?.find((f: any) => f.key === 'additional_information')?.value || '',
      opportunitySource: opportunity.customFields?.find((f: any) => f.key === 'opportunity_source')?.value || 'GHL Import',
      
      // GHL references
      ghlOpportunityId: opportunityId,
      ghlContactId: opportunity.contactId,
      ghlPipelineId: opportunity.pipelineId,
      ghlStageId: opportunity.stageId,
      
      // System fields
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'ghl_import'
    };

    // Log the deal data being created
    console.log('📋 [GHL IMPORT] Deal data to be created:', {
      userId: dealData.userId,
      dealId: dealData.dealId,
      propertyAddress: dealData.propertyAddress,
      contactName: dealData.contactName,
      dealType: dealData.dealType,
      stage: dealData.stage,
      loanRequest: dealData.loanRequest,
      ghlOpportunityId: dealData.ghlOpportunityId
    });

    const deal = await FirebaseService.createDeal(dealData);
    
    console.log('✅ [GHL IMPORT] Deal created successfully:', deal.id);
    
    res.json({ 
      success: true, 
      dealId: deal.id,
      message: 'Opportunity imported successfully' 
    });
  } catch (error: any) {
    console.error('❌ [GHL IMPORT] Error importing opportunity:', error);
    res.status(500).json({ error: 'Failed to import opportunity' });
  }
});

router.get('/ghl/pipelines', requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log('🔍 [GHL PIPELINES] Fetching pipelines...');
    const headers = await GHLService.getHeaders();
    const response = await axios.get(`${GHLService.GHL_BASE_URL}/pipelines/`, { headers });
    
    const pipelines = response.data.pipelines || [];
    console.log('✅ [GHL PIPELINES] Pipelines fetched:', pipelines.length);
    
    res.json({ pipelines });
  } catch (error: any) {
    console.error('❌ [GHL PIPELINES] Error fetching pipelines:', error);
    res.status(500).json({ error: 'Failed to fetch pipelines' });
  }
});

router.get('/ghl/pipeline/:pipelineId/opportunities', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { pipelineId } = req.params;
    const { stageId } = req.query;
    console.log('🔍 [GHL PIPELINE] Fetching opportunities for pipeline:', pipelineId, 'stage:', stageId);
    
    const opportunities = await GHLService.getOpportunitiesByStage(pipelineId, stageId as string);
    
    console.log('✅ [GHL PIPELINE] Opportunities fetched:', opportunities.length);
    res.json({ opportunities });
  } catch (error: any) {
    console.error('❌ [GHL PIPELINE] Error fetching pipeline opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline opportunities' });
  }
});

router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log('👥 [ADMIN] Fetching all users...');
    const users = await FirebaseService.getAllUsers();
    
    // Return only necessary user info for the dropdown
    const userList = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      isWhitelisted: user.isWhitelisted
    }));
    
    console.log('✅ [ADMIN] Users fetched:', userList.length);
    res.json(userList);
  } catch (error: any) {
    console.error('❌ [ADMIN] Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Test environment variables
router.get('/env/test', async (req: Request, res: Response) => {
  try {
    console.log('🔧 [ENV TEST] Testing environment variables...');
    
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      PORT: process.env.PORT,
      JWT_SECRET: !!process.env.JWT_SECRET,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      DISCORD_CLIENT_ID: !!process.env.DISCORD_CLIENT_ID,
      DISCORD_CLIENT_SECRET: !!process.env.DISCORD_CLIENT_SECRET,
      DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI,
      FRONTEND_URL: process.env.FRONTEND_URL,
      GHL_BASE_URL: process.env.GHL_BASE_URL,
      MICROSOFT_CLIENT_ID: !!process.env.MICROSOFT_CLIENT_ID,
      MICROSOFT_CLIENT_SECRET: !!process.env.MICROSOFT_CLIENT_SECRET,
      SESSION_SECRET: !!process.env.SESSION_SECRET
    };
    
    console.log('🔧 [ENV TEST] Environment variables:', envVars);
    
    res.json({
      success: true,
      message: 'Environment variables check',
      environment: envVars
    });
  } catch (error) {
    console.error('🔧 [ENV TEST] Environment test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Environment test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test Firebase connection
router.get('/firebase/test', async (req: Request, res: Response) => {
  try {
    console.log('🔥 [FIREBASE TEST] Testing Firebase connection...');
    
    // Import db here to avoid circular imports
    const { getFirestore } = require('firebase-admin/firestore');
    const db = getFirestore();
    
    // Test basic Firebase operations
    const testDoc = await db.collection('test').doc('connection-test').get();
    console.log('🔥 [FIREBASE TEST] Document exists:', testDoc.exists);
    
    // Test writing to Firebase
    await db.collection('test').doc('connection-test').set({
      timestamp: new Date().toISOString(),
      test: true
    });
    console.log('🔥 [FIREBASE TEST] Write test successful');
    
    // Test reading from Firebase
    const testRead = await db.collection('test').doc('connection-test').get();
    console.log('🔥 [FIREBASE TEST] Read test successful:', testRead.exists);
    
    // Test users collection
    const usersSnapshot = await db.collection('users').limit(1).get();
    console.log('🔥 [FIREBASE TEST] Users collection accessible:', usersSnapshot.docs.length >= 0);
    
    // Test deals collection
    const dealsSnapshot = await db.collection('deals').limit(1).get();
    console.log('🔥 [FIREBASE TEST] Deals collection accessible:', dealsSnapshot.docs.length >= 0);
    
    // Test config collection
    const configSnapshot = await db.collection('config').limit(1).get();
    console.log('🔥 [FIREBASE TEST] Config collection accessible:', configSnapshot.docs.length >= 0);
    
    // Test configurations collection (new structure)
    const configurationsSnapshot = await db.collection('configurations').limit(1).get();
    console.log('🔥 [FIREBASE TEST] Configurations collection accessible:', configurationsSnapshot.docs.length >= 0);
    
    // Test GHL API key in config
    const ghlApiKeyDoc = await db.collection('config').doc('ghl_api_key').get();
    console.log('🔥 [FIREBASE TEST] GHL API key exists in config:', ghlApiKeyDoc.exists);
    
    // Test GHL API key in configurations (new structure)
    const ghlApiKeyConfigDoc = await db.collection('configurations').doc('ghl_api_key').get();
    console.log('🔥 [FIREBASE TEST] GHL API key exists in configurations:', ghlApiKeyConfigDoc.exists);
    
    if (ghlApiKeyConfigDoc.exists) {
      const ghlData = ghlApiKeyConfigDoc.data();
      console.log('🔥 [FIREBASE TEST] GHL API key data:', {
        hasValue: !!ghlData?.value,
        description: ghlData?.description,
        isEncrypted: ghlData?.isEncrypted
      });
    }
    
    res.json({
      success: true,
      message: 'Firebase connection successful',
      collections: {
        users: usersSnapshot.docs.length,
        deals: dealsSnapshot.docs.length,
        config: configSnapshot.docs.length,
        configurations: configurationsSnapshot.docs.length
      },
      ghlApiKeyExists: ghlApiKeyDoc.exists || ghlApiKeyConfigDoc.exists,
      ghlApiKeyInConfigurations: ghlApiKeyConfigDoc.exists
    });
  } catch (error) {
    console.error('🔥 [FIREBASE TEST] Firebase test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Firebase connection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
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
      'application/zip'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, and ZIP files are allowed.'));
    }
  }
});

// OneDrive status endpoint (accessible to all authenticated users)
router.get('/onedrive/status', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Checking OneDrive connection status...');
    
    const token = await FirebaseService.getLatestOneDriveToken();
    console.log('🔑 OneDrive token exists:', !!token);
    
    if (!token) {
      console.log('❌ No OneDrive token found');
      return res.json({ 
        connected: false,
        message: 'OneDrive not connected'
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = token.expiresAt.toDate();
    const isExpired = now >= expiresAt;
    
    console.log('⏰ Token expires at:', expiresAt.toISOString());
    console.log('⏰ Current time:', now.toISOString());
    console.log('⏰ Is expired:', isExpired);

    if (isExpired) {
      console.log('⚠️ OneDrive token is expired');
      return res.json({ 
        connected: false,
        expired: true,
        expiresAt: expiresAt.toISOString(),
        message: 'OneDrive token expired'
      });
    }

    console.log('✅ OneDrive is connected and token is valid');
    return res.json({ 
      connected: true,
      expiresAt: expiresAt.toISOString(),
      message: 'OneDrive connected'
    });
  } catch (error) {
    console.error('❌ OneDrive status check error:', error);
    return res.status(500).json({ 
      connected: false,
      error: 'Failed to check OneDrive status'
    });
  }
});

// OneDrive OAuth callback (public route - must be before admin middleware)
router.get('/onedrive/callback', async (req: Request, res: Response) => {
  try {
    console.log('🔄 [CALLBACK] ===== OneDrive OAuth Callback Started (Web App Flow) =====');
    console.log('🔄 [CALLBACK] Request method:', req.method);
    console.log('🔄 [CALLBACK] Request path:', req.path);
    console.log('🔄 [CALLBACK] Request url:', req.url);
    console.log('🔄 [CALLBACK] Query params:', req.query);
    
    const { code, error, state } = req.query;

    if (error) {
      console.error('❌ [CALLBACK] OneDrive OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/admin?onedrive_error=${encodeURIComponent(error as string)}`);
    }

    if (!code) {
      console.error('❌ [CALLBACK] No authorization code received');
      return res.redirect(`${process.env.FRONTEND_URL}/admin?onedrive_error=no_code`);
    }

    console.log('✅ [CALLBACK] Authorization code received:', code.substring(0, 20) + '...');
    console.log('🔄 [CALLBACK] Exchanging code for tokens (Web App Flow)...');
    
    // Exchange code for tokens using Web app flow (with client secret)
    const formData = new URLSearchParams();
    formData.append('client_id', process.env.MICROSOFT_CLIENT_ID || '');
    formData.append('client_secret', process.env.MICROSOFT_CLIENT_SECRET || '');
    formData.append('code', code as string);
    formData.append('grant_type', 'authorization_code');
    formData.append('redirect_uri', process.env.MICROSOFT_REDIRECT_URI || '');
    formData.append('scope', 'https://graph.microsoft.com/Files.ReadWrite.All offline_access User.Read');

    console.log('🔄 [CALLBACK] Environment check:', {
      MICROSOFT_CLIENT_ID: !!process.env.MICROSOFT_CLIENT_ID,
      MICROSOFT_CLIENT_SECRET: !!process.env.MICROSOFT_CLIENT_SECRET,
      MICROSOFT_REDIRECT_URI: !!process.env.MICROSOFT_REDIRECT_URI
    });

    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET || !process.env.MICROSOFT_REDIRECT_URI) {
      console.error('❌ [CALLBACK] Missing required environment variables');
      return res.redirect(`${process.env.FRONTEND_URL}/admin?onedrive_error=missing_config`);
    }

    try {
      const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token, refresh_token, expires_in } = response.data;
      console.log('✅ [CALLBACK] Tokens received from Microsoft');

      // Save token to Firebase
      await FirebaseService.saveOneDriveToken({
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: Timestamp.fromDate(new Date(Date.now() + expires_in * 1000)),
        scope: 'https://graph.microsoft.com/Files.ReadWrite.All offline_access User.Read'
      });
      console.log('✅ [CALLBACK] Tokens saved to Firebase');

      // Get user info to confirm connection
      const userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });
      console.log('✅ [CALLBACK] User info retrieved:', {
        email: userResponse.data.mail || userResponse.data.userPrincipalName,
        name: userResponse.data.displayName
      });

      // Redirect to frontend with success
      res.redirect(`${process.env.FRONTEND_URL}/admin?onedrive_success=true&user_email=${encodeURIComponent(userResponse.data.mail || userResponse.data.userPrincipalName)}`);
      
    } catch (tokenError: any) {
      console.error('❌ [CALLBACK] Token exchange failed:', tokenError.response?.data || tokenError.message);
      return res.redirect(`${process.env.FRONTEND_URL}/admin?onedrive_error=token_exchange_failed`);
    }
    
    console.log('✅ [CALLBACK] ===== OneDrive OAuth Callback Completed Successfully =====');
  } catch (error) {
    console.error('❌ [CALLBACK] ===== OneDrive OAuth Callback Failed =====');
    console.error('❌ [CALLBACK] Error:', error);
    console.error('❌ [CALLBACK] ===== OneDrive OAuth Callback Failed =====');
    res.redirect(`${process.env.FRONTEND_URL}/admin?onedrive_error=callback_failed`);
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

// Test endpoint to verify admin routes are working
router.get('/test', async (req: Request, res: Response) => {
  console.log('🧪 [ADMIN TEST] Admin route test endpoint hit');
  res.json({ 
    message: 'Admin routes are working', 
    timestamp: new Date().toISOString(),
    route: '/api/admin/test'
  });
});

// Exchange OneDrive authorization code for tokens using PKCE
router.post('/onedrive/exchange', async (req: Request, res: Response) => {
  try {
    console.log('🔄 [EXCHANGE] ===== OneDrive Token Exchange Started =====');
    console.log('🔄 [EXCHANGE] Request method:', req.method);
    console.log('🔄 [EXCHANGE] Request path:', req.path);
    console.log('🔄 [EXCHANGE] Request url:', req.url);
    console.log('🔄 [EXCHANGE] Request headers:', {
      'user-agent': req.headers['user-agent'],
      'origin': req.headers.origin,
      'referer': req.headers.referer,
      'content-type': req.headers['content-type'],
      'authorization': req.headers.authorization ? 'Bearer ***' : 'none'
    });
    console.log('🔄 [EXCHANGE] Request body:', req.body);
    console.log('🔄 [EXCHANGE] Request query:', req.query);
    
    const { code, codeVerifier } = req.body;

    if (!code || !codeVerifier) {
      console.log('❌ [EXCHANGE] Missing code or codeVerifier');
      return res.status(400).json({ error: 'Code and code verifier are required' });
    }

    console.log('✅ [EXCHANGE] Code and codeVerifier received');
    console.log('🔍 [EXCHANGE] Environment check:', {
      MICROSOFT_CLIENT_ID: !!process.env.MICROSOFT_CLIENT_ID,
      MICROSOFT_REDIRECT_URI: !!process.env.MICROSOFT_REDIRECT_URI,
      MICROSOFT_CLIENT_ID_VALUE: process.env.MICROSOFT_CLIENT_ID ? process.env.MICROSOFT_CLIENT_ID.substring(0, 10) + '...' : 'NOT SET',
      MICROSOFT_REDIRECT_URI_VALUE: process.env.MICROSOFT_REDIRECT_URI || 'NOT SET'
    });
    
    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_REDIRECT_URI) {
      console.error('❌ [EXCHANGE] Missing required environment variables');
      return res.status(500).json({ 
        error: 'Missing Microsoft configuration',
        details: 'MICROSOFT_CLIENT_ID or MICROSOFT_REDIRECT_URI not set'
      });
    }
    
    console.log('🔄 [EXCHANGE] Exchanging code for tokens with Microsoft...');
    console.log('🔄 [EXCHANGE] Request details:', {
      client_id: process.env.MICROSOFT_CLIENT_ID.substring(0, 10) + '...',
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
      grant_type: 'authorization_code',
      code: code.substring(0, 20) + '...',
      code_verifier: codeVerifier.substring(0, 20) + '...',
      scope: 'https://graph.microsoft.com/Files.ReadWrite.All offline_access User.Read'
    });

    // Exchange code for tokens using PKCE
    let response;
    try {
      // Microsoft OAuth endpoint expects form data, not JSON
      const formData = new URLSearchParams();
      formData.append('client_id', process.env.MICROSOFT_CLIENT_ID || '');
      formData.append('code', code);
      formData.append('redirect_uri', process.env.MICROSOFT_REDIRECT_URI || '');
      formData.append('grant_type', 'authorization_code');
      formData.append('code_verifier', codeVerifier);
      formData.append('scope', 'https://graph.microsoft.com/Files.ReadWrite.All offline_access User.Read');
      
      console.log('🔄 [EXCHANGE] Sending form data to Microsoft...');
      
      response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      console.log('✅ [EXCHANGE] Microsoft API response received');
    } catch (microsoftError: any) {
      console.error('❌ [EXCHANGE] Microsoft API error:', {
        status: microsoftError.response?.status,
        statusText: microsoftError.response?.statusText,
        data: microsoftError.response?.data,
        message: microsoftError.message
      });
      throw new Error(`Microsoft API error: ${microsoftError.response?.status} - ${microsoftError.response?.data?.error_description || microsoftError.message}`);
    }

    const { access_token, refresh_token, expires_in } = response.data;
    
    console.log('✅ [EXCHANGE] Tokens received from Microsoft');
    console.log('🔄 [EXCHANGE] Saving tokens to Firebase...');

    // Save token to Firebase
    try {
      await FirebaseService.saveOneDriveToken({
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: Timestamp.fromDate(new Date(Date.now() + expires_in * 1000)),
        scope: 'https://graph.microsoft.com/Files.ReadWrite.All offline_access User.Read'
      });
      console.log('✅ [EXCHANGE] Tokens saved to Firebase');
    } catch (firebaseError: any) {
      console.error('❌ [EXCHANGE] Firebase save error:', firebaseError);
      throw new Error(`Firebase save error: ${firebaseError.message}`);
    }
    console.log('🔄 [EXCHANGE] Getting user info from Microsoft Graph...');

    // Get user info to confirm connection
    let userResponse;
    try {
      userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });
      console.log('✅ [EXCHANGE] User info retrieved:', {
        email: userResponse.data.mail || userResponse.data.userPrincipalName,
        name: userResponse.data.displayName
      });
    } catch (graphError: any) {
      console.error('❌ [EXCHANGE] Microsoft Graph API error:', {
        status: graphError.response?.status,
        statusText: graphError.response?.statusText,
        data: graphError.response?.data,
        message: graphError.message
      });
      throw new Error(`Microsoft Graph API error: ${graphError.response?.status} - ${graphError.response?.data?.error?.message || graphError.message}`);
    }

    const result = {
      success: true,
      message: 'OneDrive connected successfully',
      user: {
        email: userResponse.data.mail || userResponse.data.userPrincipalName,
        name: userResponse.data.displayName
      }
    };

    console.log('✅ [EXCHANGE] ===== OneDrive Token Exchange Completed Successfully =====');
    res.json(result);
  } catch (error) {
    console.error('❌ [EXCHANGE] ===== OneDrive Token Exchange Failed =====');
    console.error('❌ [EXCHANGE] Error type:', typeof error);
    console.error('❌ [EXCHANGE] Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('❌ [EXCHANGE] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ [EXCHANGE] Full error object:', error);
    console.error('❌ [EXCHANGE] ===== OneDrive Token Exchange Failed =====');
    
    res.status(500).json({ 
      error: 'Failed to exchange authorization code for tokens',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Save OneDrive tokens (called from frontend after token exchange)
router.post('/onedrive/save-tokens', async (req: Request, res: Response) => {
  try {
    console.log('💾 [SAVE-TOKENS] ===== OneDrive Save Tokens Started =====');
    console.log('💾 [SAVE-TOKENS] Request body:', req.body);
    
    const { accessToken, refreshToken, expiresIn } = req.body;
    
    if (!accessToken || !refreshToken || !expiresIn) {
      console.log('❌ [SAVE-TOKENS] Missing required token data');
      return res.status(400).json({ error: 'Access token, refresh token, and expires in are required' });
    }
    
    console.log('💾 [SAVE-TOKENS] Saving tokens to Firebase...');
    
    // Save token to Firebase
    await FirebaseService.saveOneDriveToken({
      accessToken,
      refreshToken,
      expiresAt: Timestamp.fromDate(new Date(Date.now() + expiresIn * 1000)),
      scope: 'https://graph.microsoft.com/Files.ReadWrite.All offline_access User.Read'
    });
    
    console.log('✅ [SAVE-TOKENS] Tokens saved to Firebase successfully');
    console.log('💾 [SAVE-TOKENS] ===== OneDrive Save Tokens Completed =====');
    
    res.json({
      success: true,
      message: 'OneDrive tokens saved successfully'
    });
  } catch (error) {
    console.error('❌ [SAVE-TOKENS] ===== OneDrive Save Tokens Failed =====');
    console.error('❌ [SAVE-TOKENS] Error:', error);
    console.error('❌ [SAVE-TOKENS] ===== OneDrive Save Tokens Failed =====');
    
    res.status(500).json({ 
      error: 'Failed to save OneDrive tokens',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
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

// Set GHL API key
router.post('/ghl/api-key', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }
    
    await FirebaseService.setConfiguration('ghl_api_key', apiKey, 'GHL API Key for authentication');
    
    res.json({ 
      success: true, 
      message: 'GHL API key configured successfully' 
    });
  } catch (error) {
    console.error('Set GHL API key error:', error);
    res.status(500).json({ 
      error: 'Failed to set GHL API key',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test GHL connection
router.get('/ghl/test', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Testing GHL connection...');
    
    const ghlApiKey = await FirebaseService.getConfiguration('ghl_api_key');
    console.log('🔑 GHL API key exists:', !!ghlApiKey);
    console.log('🔑 GHL API key preview:', ghlApiKey ? `${ghlApiKey.substring(0, 10)}...` : 'none');
    
    if (!ghlApiKey) {
      console.log('❌ GHL API key not configured in Firebase config');
      return res.status(400).json({ 
        connected: false,
        error: 'GHL API key not configured',
        message: 'Please configure GHL API key in admin settings'
      });
    }

    const ghlBaseUrl = process.env.GHL_BASE_URL || 'https://rest.gohighlevel.com/v1';
    console.log('🌐 GHL Base URL:', ghlBaseUrl);

    // Test API key by fetching pipelines
    const response = await axios.get(`${ghlBaseUrl}/pipelines/`, {
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    });

    console.log('✅ GHL connection successful');
    res.json({
      connected: true,
      pipelines: response.data.pipelines || [],
      message: 'GHL connection successful'
    });
  } catch (error) {
    console.error('❌ GHL test error:', error);
    console.error('🔍 Error details:', {
      message: error instanceof Error ? error.message : String(error),
      status: (error as any)?.response?.status,
      data: (error as any)?.response?.data
    });
    
    res.status(500).json({ 
      connected: false,
      error: 'Failed to connect to GHL',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: (error as any)?.response?.data || null
    });
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
    console.log('🔍 Fetching GHL configuration...');
    
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

    console.log('✅ GHL config fetched successfully');
    res.json({
      ...config,
      configured: !!config.apiKey,
      message: config.apiKey ? 'GHL is configured' : 'GHL API key not configured'
    });
  } catch (error) {
    console.error('❌ Get GHL config error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch GHL configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
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
