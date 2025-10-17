import express from 'express';
import { body, validationResult } from 'express-validator';
import { FirebaseService } from '../services/firebaseService';
import { OneDriveService } from '../services/oneDriveService';
import { GHLService } from '../services/ghlService';
import { EmailService } from '../services/emailService';
import { Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth';
import { Timestamp } from 'firebase-admin/firestore';
import axios from 'axios';
import multer from 'multer';
import { generatePKCEChallenge } from '../utils/pkce';

const router = express.Router();

// Handle CORS preflight requests for admin file uploads
router.options('/onedrive/upload', (req, res) => {
  console.log('🌐 [CORS] Preflight request for /admin/onedrive/upload');
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// GHL Opportunities Import Routes
router.get('/ghl/opportunities', requireAdmin, async (req: Request, res: Response) => {
  try {
    const opportunities = await GHLService.listOpportunities();
    
    res.json(opportunities);
  } catch (error: any) {
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

    const deal = await FirebaseService.createDeal(dealData);
    
    
    res.json({ 
      success: true, 
      dealId: deal.id,
      message: 'Opportunity imported successfully' 
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to import opportunity' });
  }
});

// Get raw GHL opportunities data for debugging
router.get('/ghl/opportunities/raw', requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log('🔍 [ADMIN] Fetching raw GHL opportunities data...');
    
    const ghlApiKey = await FirebaseService.getConfiguration('ghl_api_key');
    if (!ghlApiKey) {
      return res.status(400).json({ error: 'GHL API key not configured' });
    }
    
    // Get all opportunities from GHL
    const ghlOpportunities = await GHLService.listOpportunities();
    
    console.log(`📊 [ADMIN] Found ${ghlOpportunities.opportunities?.length || 0} opportunities in GHL`);
    
    // Return raw data with metadata
    res.json({
      success: true,
      totalOpportunities: ghlOpportunities.opportunities?.length || 0,
      fetchedAt: new Date().toISOString(),
      opportunities: ghlOpportunities.opportunities || [],
      metadata: {
        apiKeyConfigured: !!ghlApiKey,
        apiKeyPreview: ghlApiKey ? `${ghlApiKey.substring(0, 10)}...` : 'none',
        baseUrl: process.env.GHL_BASE_URL || 'https://rest.gohighlevel.com/v1',
        targetPipelineId: '97i1G88fYPwGw5Hyiv0Y',
        customFieldsIncluded: true
      }
    });
  } catch (error: any) {
    console.error('❌ [ADMIN] Raw GHL opportunities error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch raw GHL opportunities',
      details: error.message,
      stack: error.stack
    });
  }
});

// Get raw portal deals data for debugging
router.get('/deals/raw', requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log('🔍 [ADMIN] Fetching raw portal deals data...');
    
    // Get all deals from our system
    const ourDeals = await FirebaseService.getAllDeals();
    
    console.log(`📊 [ADMIN] Found ${ourDeals.length} deals in our system`);
    
    // Return raw data with metadata
    res.json({
      success: true,
      totalDeals: ourDeals.length,
      fetchedAt: new Date().toISOString(),
      deals: ourDeals,
      metadata: {
        dealsWithGhlId: ourDeals.filter(deal => deal.ghlOpportunityId).length,
        dealsWithGhlContactId: ourDeals.filter(deal => deal.ghlContactId).length,
        dealsBySource: ourDeals.reduce((acc: any, deal: any) => {
          const source = deal.source || 'unknown';
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        }, {})
      }
    });
  } catch (error: any) {
    console.error('❌ [ADMIN] Raw portal deals error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch raw portal deals',
      details: error.message,
      stack: error.stack
    });
  }
});

// Test fetching a specific opportunity with custom fields
router.get('/ghl/opportunity/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('🔍 [ADMIN] Testing opportunity fetch for ID:', id);
    
    const ghlApiKey = await FirebaseService.getConfiguration('ghl_api_key');
    if (!ghlApiKey) {
      return res.status(400).json({ error: 'GHL API key not configured' });
    }
    
    // Fetch the specific opportunity
    const opportunity = await GHLService.getOpportunity(id);
    
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    
    console.log('✅ [ADMIN] Successfully fetched opportunity:', opportunity.id);
    
    res.json({
      success: true,
      opportunity,
      metadata: {
        opportunityId: id,
        apiKeyPreview: ghlApiKey ? `${ghlApiKey.substring(0, 10)}...` : 'none',
        customFieldsCount: opportunity.customFields?.length || 0,
        fetchedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('❌ [ADMIN] Opportunity fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch opportunity',
      details: error.message,
      stack: error.stack
    });
  }
});

interface TestResult {
  api: string;
  endpoint: string;
  status: string;
  message: string;
  pipelinesFound?: number;
  opportunitiesFound?: number;
  error?: string;
  statusCode?: number;
}

// Test GHL API connection with detailed debugging
router.get('/ghl/test-connection', requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log('🔍 [ADMIN] Testing GHL API connection...');
    
    const ghlApiKey = await FirebaseService.getConfiguration('ghl_api_key');
    const ghlV2Token = await FirebaseService.getConfiguration('ghl_v2_token');
    
    if (!ghlApiKey) {
      return res.status(400).json({ error: 'GHL API key not configured' });
    }
    
    const results = {
      apiKeyConfigured: !!ghlApiKey,
      v2TokenConfigured: !!ghlV2Token,
      apiKeyPreview: ghlApiKey ? `${ghlApiKey.substring(0, 10)}...` : 'none',
      v2TokenPreview: ghlV2Token ? `${ghlV2Token.substring(0, 10)}...` : 'none',
      baseUrl: process.env.GHL_BASE_URL || 'https://rest.gohighlevel.com/v1',
      v2BaseUrl: 'https://services.leadconnectorhq.com',
      tests: [] as TestResult[]
    };
    
    // Test V1 API
    try {
      console.log('🔍 [ADMIN] Testing V1 API...');
      const headers = {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      };
      
      const v1Response = await axios.get(`${results.baseUrl}/pipelines/`, { headers });
      results.tests.push({
        api: 'V1',
        endpoint: `${results.baseUrl}/pipelines/`,
        status: 'success',
        pipelinesFound: v1Response.data.pipelines?.length || 0,
        message: `Found ${v1Response.data.pipelines?.length || 0} pipelines`
      });
    } catch (v1Error: any) {
      results.tests.push({
        api: 'V1',
        endpoint: `${results.baseUrl}/pipelines/`,
        status: 'error',
        error: v1Error.message,
        statusCode: v1Error.response?.status,
        message: `V1 API failed: ${v1Error.response?.status} - ${v1Error.message}`
      });
    }
    
    // Test V2 API
    if (ghlV2Token) {
      try {
        console.log('🔍 [ADMIN] Testing V2 API...');
        const v2Headers = {
          'Authorization': `Bearer ${ghlV2Token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        
        const v2Response = await axios.get(`${results.v2BaseUrl}/opportunities/`, { 
          headers: v2Headers,
          params: { limit: 1 }
        });
        results.tests.push({
          api: 'V2',
          endpoint: `${results.v2BaseUrl}/opportunities/`,
          status: 'success',
          opportunitiesFound: v2Response.data.opportunities?.length || 0,
          message: `Found ${v2Response.data.opportunities?.length || 0} opportunities`
        });
      } catch (v2Error: any) {
        results.tests.push({
          api: 'V2',
          endpoint: `${results.v2BaseUrl}/opportunities/`,
          status: 'error',
          error: v2Error.message,
          statusCode: v2Error.response?.status,
          message: `V2 API failed: ${v2Error.response?.status} - ${v2Error.message}`
        });
      }
    } else {
      results.tests.push({
        api: 'V2',
        endpoint: `${results.v2BaseUrl}/opportunities/`,
        status: 'skipped',
        message: 'V2 token not configured'
      });
    }
    
    console.log('✅ [ADMIN] GHL connection test completed');
    res.json({
      success: true,
      message: 'GHL API connection test completed',
      ...results
    });
  } catch (error: any) {
    console.error('❌ [ADMIN] GHL connection test error:', error);
    res.status(500).json({ 
      error: 'Failed to test GHL connection',
      details: error.message
    });
  }
});

router.get('/ghl/pipelines', requireAdmin, async (req: Request, res: Response) => {
  try {
    const ghlApiKey = await FirebaseService.getConfiguration('ghl_api_key');
    if (!ghlApiKey) {
      return res.status(400).json({ error: 'GHL API key not configured' });
    }
    
    const headers = {
      'Authorization': `Bearer ${ghlApiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    };
    
    const ghlBaseUrl = process.env.GHL_BASE_URL || 'https://rest.gohighlevel.com/v1';
    const response = await axios.get(`${ghlBaseUrl}/pipelines/`, { headers });
    
    const pipelines = response.data.pipelines || [];
    
    res.json({ pipelines });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch pipelines' });
  }
});

router.get('/ghl/pipeline/:pipelineId/opportunities', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { pipelineId } = req.params;
    const { stageId } = req.query;
    
    const opportunities = await GHLService.getOpportunitiesByStage(pipelineId, stageId as string);
    
    res.json({ opportunities });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch pipeline opportunities' });
  }
});

router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await FirebaseService.getAllUsers();
    
    // Return only necessary user info for the dropdown
    const userList = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      isWhitelisted: user.isWhitelisted
    }));
    
    res.json(userList);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/users/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await FirebaseService.getUserById(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      isWhitelisted: user.isWhitelisted
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Test environment variables
router.get('/env/test', async (req: Request, res: Response) => {
  try {
    
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
    
    
    res.json({
      success: true,
      message: 'Environment variables check',
      environment: envVars
    });
  } catch (error) {
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
    
    // Import db here to avoid circular imports
    const { getFirestore } = require('firebase-admin/firestore');
    const db = getFirestore();
    
    // Test basic Firebase operations
    const testDoc = await db.collection('test').doc('connection-test').get();
    
    // Test writing to Firebase
    await db.collection('test').doc('connection-test').set({
      timestamp: new Date().toISOString(),
      test: true
    });
    
    // Test reading from Firebase
    const testRead = await db.collection('test').doc('connection-test').get();
    
    // Test users collection
    const usersSnapshot = await db.collection('users').limit(1).get();
    
    // Test deals collection
    const dealsSnapshot = await db.collection('deals').limit(1).get();
    
    // Test config collection
    const configSnapshot = await db.collection('config').limit(1).get();
    
    // Test configurations collection (new structure)
    const configurationsSnapshot = await db.collection('configurations').limit(1).get();
    
    // Test GHL API key in config
    const ghlApiKeyDoc = await db.collection('config').doc('ghl_api_key').get();
    
    // Test GHL API key in configurations (new structure)
    const ghlApiKeyConfigDoc = await db.collection('configurations').doc('ghl_api_key').get();
    
    if (ghlApiKeyConfigDoc.exists) {
      const ghlData = ghlApiKeyConfigDoc.data();
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

// OneDrive status endpoint (accessible to all authenticated users)
router.get('/onedrive/status', async (req: Request, res: Response) => {
  try {
    
    const token = await FirebaseService.getLatestOneDriveToken();
    
    if (!token) {
      return res.json({ 
        connected: false,
        message: 'OneDrive not connected'
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = token.expiresAt.toDate();
    const isExpired = now >= expiresAt;
    

    if (isExpired) {
      return res.json({ 
        connected: false,
        expired: true,
        expiresAt: expiresAt.toISOString(),
        message: 'OneDrive token expired'
      });
    }

    return res.json({ 
      connected: true,
      expiresAt: expiresAt.toISOString(),
      message: 'OneDrive connected'
    });
  } catch (error) {
    return res.status(500).json({ 
      connected: false,
      error: 'Failed to check OneDrive status'
    });
  }
});

// OneDrive OAuth callback (public route - must be before admin middleware)
router.get('/onedrive/callback', async (req: Request, res: Response) => {
  try {
    
    const { code, error, state } = req.query;

    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/admin?onedrive_error=${encodeURIComponent(error as string)}`);
    }

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/admin?onedrive_error=no_code`);
    }

    
    // Exchange code for tokens using Web app flow (with client secret)
    const formData = new URLSearchParams();
    formData.append('client_id', process.env.MICROSOFT_CLIENT_ID || '');
    formData.append('client_secret', process.env.MICROSOFT_CLIENT_SECRET || '');
    formData.append('code', code as string);
    formData.append('grant_type', 'authorization_code');
    formData.append('redirect_uri', process.env.MICROSOFT_REDIRECT_URI || '');
    formData.append('scope', 'https://graph.microsoft.com/Files.ReadWrite.All offline_access User.Read');


    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET || !process.env.MICROSOFT_REDIRECT_URI) {
      return res.redirect(`${process.env.FRONTEND_URL}/admin?onedrive_error=missing_config`);
    }

    try {
      const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
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

      // Redirect to frontend with success
      res.redirect(`${process.env.FRONTEND_URL}/admin?onedrive_success=true&user_email=${encodeURIComponent(userResponse.data.mail || userResponse.data.userPrincipalName)}`);
      
    } catch (tokenError: any) {
      return res.redirect(`${process.env.FRONTEND_URL}/admin?onedrive_error=token_exchange_failed`);
    }
    
  } catch (error) {
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

// Discord Auto-Access Management
// Get all Discord auto-access users
router.get('/discord-auto-access', async (req: Request, res: Response) => {
  try {
    console.log('🔍 [DISCORD AUTO-ACCESS] Fetching auto-access users...');
    
    const autoAccessUsers = await FirebaseService.getDiscordAutoAccessUsers();
    
    res.json({
      message: 'Discord auto-access users fetched successfully',
      totalUsers: autoAccessUsers.length,
      users: autoAccessUsers,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ [DISCORD AUTO-ACCESS] Error fetching auto-access users:', error);
    res.status(500).json({
      error: 'Failed to fetch Discord auto-access users',
      message: error.message
    });
  }
});

// Add Discord username to auto-access list
router.post('/discord-auto-access', [
  body('discordUsername').notEmpty().withMessage('Discord username is required'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { discordUsername, notes } = req.body;
    
    console.log('➕ [DISCORD AUTO-ACCESS] Adding Discord username:', discordUsername);
    
    // Check if username already exists
    const existingUser = await FirebaseService.getDiscordAutoAccessUserByUsername(discordUsername);
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Discord username already exists in auto-access list',
        username: discordUsername
      });
    }
    
    // Add to auto-access list
    const autoAccessUser = await FirebaseService.addDiscordAutoAccessUser({
      discordUsername,
      notes: notes || '',
      addedBy: req.user!.id,
      addedByUsername: req.user!.username
    });
    
    console.log('✅ [DISCORD AUTO-ACCESS] Added user:', autoAccessUser.id);
    
    res.status(201).json({
      message: 'Discord username added to auto-access list successfully',
      user: autoAccessUser,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ [DISCORD AUTO-ACCESS] Error adding auto-access user:', error);
    res.status(500).json({
      error: 'Failed to add Discord username to auto-access list',
      message: error.message
    });
  }
});

// Bulk add Discord usernames to auto-access list
router.post('/discord-auto-access/bulk', [
  body('usernames').isArray({ min: 1 }).withMessage('Usernames must be a non-empty array'),
  body('usernames.*').isString().notEmpty().withMessage('Each username must be a non-empty string'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { usernames, notes } = req.body;
    
    const results = {
      successful: [] as any[],
      failed: [] as any[],
      duplicates: [] as string[]
    };

    // Process each username
    for (const username of usernames) {
      try {
        // Check if username already exists
        const existingUser = await FirebaseService.getDiscordAutoAccessUserByUsername(username);
        if (existingUser) {
          results.duplicates.push(username);
          continue;
        }
        
        // Add to auto-access list
        const autoAccessUser = await FirebaseService.addDiscordAutoAccessUser({
          discordUsername: username,
          notes: notes || '',
          addedBy: req.user!.id,
          addedByUsername: req.user!.username
        });
        
        results.successful.push(autoAccessUser);
      } catch (error: any) {
        results.failed.push({
          username,
          error: error.message
        });
      }
    }
    
    res.status(201).json({
      message: 'Bulk add operation completed',
      results,
      summary: {
        total: usernames.length,
        successful: results.successful.length,
        failed: results.failed.length,
        duplicates: results.duplicates.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to bulk add Discord usernames to auto-access list',
      message: error.message
    });
  }
});

// Remove Discord username from auto-access list
router.delete('/discord-auto-access/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ [DISCORD AUTO-ACCESS] Removing auto-access user:', id);
    
    const deleted = await FirebaseService.removeDiscordAutoAccessUser(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Auto-access user not found' });
    }
    
    console.log('✅ [DISCORD AUTO-ACCESS] Removed user:', id);
    
    res.json({
      message: 'Discord username removed from auto-access list successfully',
      id,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ [DISCORD AUTO-ACCESS] Error removing auto-access user:', error);
    res.status(500).json({
      error: 'Failed to remove Discord username from auto-access list',
      message: error.message
    });
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
      if (ghlApiKey && deal.ghlContactId) {
        // Upload document to GHL contact
        await GHLService.uploadDocumentToContact(
          deal.ghlContactId,
          req.file.originalname,
          req.file.buffer,
          req.file.mimetype,
          ghlApiKey
        );
        console.log('Document synced to GHL contact:', deal.ghlContactId);
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
    await FirebaseService.setConfiguration('ghl_api_key', apiKey, 'GoHighLevel API Key');
    
    if (v2Token) {
      await FirebaseService.setConfiguration('ghl_v2_token', v2Token, 'GHL v2 Private Integration Token');
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
      name: user.username || user.email,
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
    
  const customFieldsData = {
      fetchedAt: new Date().toISOString(),
      summary,
      contactFields,
      opportunityFields,
      allFields
    };
  
  // Do not write file in read-only environments; just log the JSON
  console.log('🧾 [ADMIN] GHL custom fields JSON (full output):');
  console.log('[SUMMARY]', JSON.stringify(customFieldsData.summary));
  console.log('[CONTACT_FIELDS_COUNT]', customFieldsData.contactFields.length);
  console.log('[OPPORTUNITY_FIELDS_COUNT]', customFieldsData.opportunityFields.length);
  console.log('[CONTACT_FIELDS_FULL]', JSON.stringify(customFieldsData.contactFields, null, 2));
  console.log('[OPPORTUNITY_FIELDS_FULL]', JSON.stringify(customFieldsData.opportunityFields, null, 2));
  
  res.json({
      success: true,
      summary,
      contactFields,
      opportunityFields,
    message: `Successfully fetched ${summary.totalFields} custom fields. Output logged to server.`
    });
    
  } catch (error) {
    console.error('❌ [ADMIN] Fetch custom fields error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch GHL custom fields',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Email Configuration Routes
router.get('/email/config', requireAdmin, async (req: Request, res: Response) => {
  try {
    const emailConfig = await FirebaseService.getEmailConfig();
    res.json(emailConfig);
  } catch (error) {
    console.error('❌ [ADMIN] Get email config error:', error);
    res.status(500).json({ error: 'Failed to get email configuration' });
  }
});

router.post('/email/config', requireAdmin, [
  body('smtpHost').notEmpty().withMessage('SMTP Host is required'),
  body('smtpPort').isInt({ min: 1, max: 65535 }).withMessage('SMTP Port must be a valid port number'),
  body('smtpUser').notEmpty().withMessage('SMTP User is required'),
  body('smtpPassword').notEmpty().withMessage('SMTP Password is required'),
  body('fromEmail').isEmail().withMessage('From Email must be a valid email'),
  body('fromName').notEmpty().withMessage('From Name is required'),
  body('notificationEmails').isArray().withMessage('Notification emails must be an array'),
  body('notificationEmails.*').isEmail().withMessage('Each notification email must be valid')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const emailConfig = req.body;
    
    // Save configuration to Firebase
    await FirebaseService.saveEmailConfig(emailConfig);
    
    // Initialize email service with new configuration
    await EmailService.initialize(emailConfig);
    
    res.json({ 
      success: true, 
      message: 'Email configuration saved successfully' 
    });
  } catch (error) {
    console.error('❌ [ADMIN] Save email config error:', error);
    res.status(500).json({ error: 'Failed to save email configuration' });
  }
});

router.post('/email/test', requireAdmin, [
  body('testEmail').isEmail().withMessage('Test email must be valid')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { testEmail } = req.body;
    
    // Ensure email service is initialized from stored config
    try {
      const storedConfig = await FirebaseService.getEmailConfig();
      if (!storedConfig || storedConfig.enabled === false) {
        return res.status(400).json({ error: 'Email service not configured' });
      }
      await EmailService.initialize(storedConfig);
    } catch (initError) {
      console.error('❌ [ADMIN] Email init for test failed:', initError);
      return res.status(400).json({ error: 'Failed to initialize email service. Check SMTP settings.' });
    }

    // Test email connection after init
    const connectionTest = await EmailService.testEmailConnection();
    if (!connectionTest) {
      return res.status(400).json({ error: 'Email connection test failed' });
    }
    
    // Send test email
    const emailSent = await EmailService.sendTestEmail(testEmail);
    if (!emailSent) {
      return res.status(500).json({ 
        error: 'Failed to send test email' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Test email sent successfully' 
    });
  } catch (error) {
    console.error('❌ [ADMIN] Test email error:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

export default router;
