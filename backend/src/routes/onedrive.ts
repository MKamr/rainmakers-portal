import { Router, Request, Response } from 'express';
import { generatePKCEChallenge } from '../utils/pkce';

const router = Router();

// Test route to verify /api/onedrive mount is working
router.get('/test', async (req: Request, res: Response) => {
  console.log('🧪 [TEST] ===== OneDrive Test Route Hit =====');
  console.log('🧪 [TEST] Request method:', req.method);
  console.log('🧪 [TEST] Request path:', req.path);
  console.log('🧪 [TEST] Request url:', req.url);
  console.log('🧪 [TEST] Request headers:', {
    'user-agent': req.headers['user-agent'],
    'origin': req.headers.origin,
    'referer': req.headers.referer,
    'content-type': req.headers['content-type'],
    'authorization': req.headers.authorization ? 'Bearer ***' : 'none'
  });
  console.log('🧪 [TEST] ===== OneDrive Test Route Completed =====');
  
  res.json({ 
    message: 'OneDrive mount test successful', 
    timestamp: new Date().toISOString(),
    route: '/api/onedrive/test',
    method: 'GET'
  });
});

// Generate PKCE challenge for OneDrive OAuth (public endpoint)
router.post('/pkce', async (req: Request, res: Response) => {
  try {
    console.log('🔑 [PKCE] ===== OneDrive PKCE Request Started =====');
    console.log('🔑 [PKCE] Request method:', req.method);
    console.log('🔑 [PKCE] Request path:', req.path);
    console.log('🔑 [PKCE] Request url:', req.url);
    console.log('🔑 [PKCE] Request headers:', {
      'user-agent': req.headers['user-agent'],
      'origin': req.headers.origin,
      'referer': req.headers.referer,
      'content-type': req.headers['content-type'],
      'authorization': req.headers.authorization ? 'Bearer ***' : 'none'
    });
    console.log('🔑 [PKCE] Request body:', req.body);
    console.log('🔑 [PKCE] Request query:', req.query);
    console.log('🔑 [PKCE] Generating PKCE challenge...');
    
    const pkceChallenge = generatePKCEChallenge();
    
    console.log('✅ [PKCE] Generated challenge successfully!');
    console.log('✅ [PKCE] Code challenge (first 20 chars):', pkceChallenge.codeChallenge.substring(0, 20) + '...');
    console.log('✅ [PKCE] Code verifier (first 20 chars):', pkceChallenge.codeVerifier.substring(0, 20) + '...');
    console.log('✅ [PKCE] Code challenge method:', pkceChallenge.codeChallengeMethod);
    console.log('✅ [PKCE] Full code challenge length:', pkceChallenge.codeChallenge.length);
    console.log('✅ [PKCE] Full code verifier length:', pkceChallenge.codeVerifier.length);
    
    const response = {
      codeChallenge: pkceChallenge.codeChallenge,
      codeVerifier: pkceChallenge.codeVerifier,
      codeChallengeMethod: pkceChallenge.codeChallengeMethod
    };
    
    console.log('✅ [PKCE] Sending response to frontend...');
    console.log('✅ [PKCE] Response status: 200');
    console.log('🔑 [PKCE] ===== OneDrive PKCE Request Completed Successfully =====');
    
    res.json(response);
  } catch (error) {
    console.error('❌ [PKCE] ===== OneDrive PKCE Request Failed =====');
    console.error('❌ [PKCE] Error type:', typeof error);
    console.error('❌ [PKCE] Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('❌ [PKCE] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ [PKCE] Full error object:', error);
    console.error('❌ [PKCE] ===== OneDrive PKCE Request Failed =====');
    
    res.status(500).json({ 
      error: 'Failed to generate PKCE challenge',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Catch-all route to debug any unmatched requests
router.all('*', async (req: Request, res: Response) => {
  console.log('🔍 [CATCH-ALL] ===== Unmatched OneDrive Route =====');
  console.log('🔍 [CATCH-ALL] Request method:', req.method);
  console.log('🔍 [CATCH-ALL] Request path:', req.path);
  console.log('🔍 [CATCH-ALL] Request url:', req.url);
  console.log('🔍 [CATCH-ALL] Request headers:', {
    'user-agent': req.headers['user-agent'],
    'origin': req.headers.origin,
    'referer': req.headers.referer,
    'content-type': req.headers['content-type'],
    'authorization': req.headers.authorization ? 'Bearer ***' : 'none'
  });
  console.log('🔍 [CATCH-ALL] Available routes: GET /test, POST /pkce');
  console.log('🔍 [CATCH-ALL] ===== Unmatched OneDrive Route =====');
  
  res.status(404).json({ 
    error: 'Route not found in OneDrive router',
    method: req.method,
    path: req.path,
    availableRoutes: ['GET /test', 'POST /pkce']
  });
});

export default router;
